import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import ts from "typescript";

// Browser code may import only these npm packages. Add a package here when the web app needs it.
const browserPackages = new Set([
	"@clerk/react",
	"@tanstack/react-query",
	"@tanstack/react-router",
	"react",
	"react-dom",
	"react-markdown",
	"remark-gfm",
	"zod",
]);
// Local browser imports must stay inside these source roots, outside server files.
const browserRoots = [
	"apps/web/src",
	"packages/contracts/src",
	"packages/http/src",
	"packages/ui/src",
	"features",
];
const packageName = (specifier: string) =>
	specifier
		.split("/")
		.slice(0, specifier.startsWith("@") ? 2 : 1)
		.join("/");
const isTest = (file: string) =>
	/\.(test|spec)\.tsx?$/.test(file) || file.endsWith("/test-fixture.ts");
const isServer = (file: string) => /\/(server|[^/]+\.server)\.tsx?$/.test(file);
const slashPath = (file: string) => file.replaceAll("\\", "/");
function sourceFiles(root: string, area: string) {
	// Source areas are fixed repo-relative folders; refuse anything resolving outside the repo.
	const base = resolve(root),
		dir = resolve(base, area);
	if (!dir.startsWith(base + sep)) throw new Error(`Source area escapes the repo: ${area}`);
	if (!existsSync(dir)) return [];
	return Array.from(new Bun.Glob("**/*.{ts,tsx}").scanSync({ cwd: dir }))
		.map(slashPath)
		.filter((file) => !isTest(file))
		.map((file) => slashPath(resolve(dir, file)));
}
export function checkBoundaries({
	root,
	browserEntries,
	uiEntries,
	aiEntries,
	featureEntries,
}: {
	root: string;
	browserEntries?: string[];
	uiEntries?: string[];
	aiEntries?: string[];
	featureEntries?: string[];
}) {
	// Only read files whose real path stays inside the real root, so a symlink cannot escape it.
	root = slashPath(realpathSync(root));
	const realRoot = root;
	const contained = (file: string) => {
		try {
			const real = slashPath(realpathSync(file));
			return real.startsWith(realRoot + "/") ? real : null;
		} catch {
			return null;
		}
	};
	const readContained = (file: string) => {
		const real = contained(file);
		return real ? readFileSync(real, "utf8") : undefined;
	};
	const diagnostics = new Set<string>();
	// Fixtures without a tsconfig use defaults; a present but unreadable config must fail closed.
	const configFile = resolve(root, "tsconfig.json");
	let options: ts.CompilerOptions = { moduleResolution: ts.ModuleResolutionKind.Bundler };
	if (lstatSync(configFile, { throwIfNoEntry: false })) {
		const config = ts.readConfigFile(configFile, readContained);
		const parsed = config.error
			? undefined
			: ts.parseJsonConfigFileContent(config.config, { ...ts.sys, readFile: readContained }, root);
		// TS18003 ("no inputs found") only concerns the file list, not module resolution.
		if (!parsed || parsed.errors.some((error) => error.code !== 18003))
			diagnostics.add(`TypeScript config is unreadable or outside ${root}: ${configFile}`);
		else options = parsed.options;
	}
	const resolution = ts.createModuleResolutionCache(root, (path) => path, options);
	const asts = new Map<string, ts.SourceFile>();
	const local = (file: string, specifier: string) => {
		const result = ts.resolveModuleName(
			specifier,
			file,
			options,
			ts.sys,
			resolution,
		).resolvedModule;
		if (!result) return null;
		const dependency = slashPath(realpathSync(result.resolvedFileName));
		return dependency.startsWith(root + "/") && !dependency.includes("/node_modules/")
			? dependency
			: null;
	};
	function inspectSource(file: string) {
		let ast = asts.get(file);
		if (!ast) {
			const real = contained(file);
			if (!real) {
				diagnostics.add(`Source file is missing or outside ${root}: ${file}`);
				return { imports: [], transport: false, dynamic: false };
			}
			ast = ts.createSourceFile(file, readFileSync(real, "utf8"), ts.ScriptTarget.Latest, true);
			asts.set(file, ast);
		}
		const imports: string[] = [];
		let transport = false,
			dynamic = false;
		function visit(node: ts.Node) {
			if (
				(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
				node.moduleSpecifier &&
				ts.isStringLiteral(node.moduleSpecifier)
			)
				imports.push(node.moduleSpecifier.text);
			if (
				ts.isCallExpression(node) &&
				(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
					(ts.isIdentifier(node.expression) && node.expression.text === "require"))
			) {
				const argument = node.arguments[0];
				if (argument && ts.isStringLiteral(argument)) imports.push(argument.text);
				else dynamic = true;
			}
			if (
				ts.isIdentifier(node) &&
				["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].includes(node.text)
			)
				transport = true;
			if (
				ts.isElementAccessExpression(node) &&
				ts.isStringLiteral(node.argumentExpression) &&
				["fetch", "XMLHttpRequest", "WebSocket", "EventSource"].includes(
					node.argumentExpression.text,
				)
			)
				transport = true;
			ts.forEachChild(node, visit);
		}
		visit(ast);
		return { imports, transport, dynamic };
	}
	const features = featureEntries ?? sourceFiles(root, "features");
	const browser = browserEntries ?? [
		...sourceFiles(root, "apps/web/src"),
		...sourceFiles(root, "packages/contracts/src"),
		...sourceFiles(root, "packages/http/src"),
		...sourceFiles(root, "packages/ui/src"),
		...features.filter((file) => /\/(client|state|contract|keys)\.ts$/.test(file)),
	];
	function walk(entries: string[], mode: "browser" | "ui" | "ai") {
		const seen = new Set<string>();
		function inspect(file: string) {
			if (seen.has(file)) return;
			seen.add(file);
			const source = inspectSource(file);
			if (mode === "ui" && source.transport)
				diagnostics.add(`UI must use feature state; transport found in ${file}`);
			if (mode === "browser" && source.dynamic)
				diagnostics.add(`Browser import must have a literal target: ${file}`);
			for (const specifier of source.imports) {
				const dependency = local(file, specifier);
				let invalid = false;
				if (mode === "browser")
					invalid = dependency
						? isServer(dependency) ||
							!browserRoots.some((area) =>
								dependency.startsWith(slashPath(resolve(root, area)) + "/"),
							)
						: !specifier.endsWith(".css") &&
							(/^[./]/.test(specifier) || !browserPackages.has(packageName(specifier)));
				if (mode === "ai")
					invalid =
						/^@day-one\/(db|server|notes|chat|workspaces)(\/|$)/.test(specifier) ||
						(!!dependency && /\/(apps|features)\//.test(dependency));
				if (mode === "ui")
					invalid =
						specifier === "@day-one/http" ||
						specifier.startsWith("@tanstack/react-query") ||
						/\/client$/.test(specifier) ||
						(!!dependency &&
							((/\/(client|contract)\.ts$/.test(dependency) && source.transport) ||
								dependency.includes("/packages/http/") ||
								dependency.endsWith("/client.ts")));
				if (invalid) diagnostics.add(`Forbidden ${mode} dependency: ${file} → ${specifier}`);
				else if (dependency) {
					// UI may enter feature/application state. The browser walk still checks every dependency below it.
					if (
						mode === "ui" &&
						(dependency.endsWith("/state.ts") || dependency.includes("/apps/web/src/state/"))
					)
						continue;
					inspect(dependency);
				}
			}
		}
		for (const entry of entries) inspect(entry);
	}
	walk(browser, "browser");
	walk(
		uiEntries ?? [
			...sourceFiles(root, "apps/web/src/pages"),
			...sourceFiles(root, "apps/web/src/components"),
			// The root route mounts App, the composition root that owns the query client.
			...sourceFiles(root, "apps/web/src/routes").filter((file) => !file.endsWith("__root.tsx")),
			...sourceFiles(root, "packages/ui/src"),
		],
		"ui",
	);
	walk(aiEntries ?? sourceFiles(root, "packages/ai/src"), "ai");
	for (const file of features)
		for (const specifier of inspectSource(file).imports) {
			const dependency = local(file, specifier);
			if (dependency?.includes("/apps/"))
				diagnostics.add(`Feature must not depend on app composition: ${file} → ${specifier}`);
			const owner = (path: string) =>
				/^features\/([^/]+)\//.exec(slashPath(relative(root, path)))?.[1];
			if (dependency && owner(dependency) && owner(dependency) !== owner(file))
				diagnostics.add(`Feature must not import another feature: ${file} → ${specifier}`);
		}
	return [...diagnostics];
}
if (import.meta.main) {
	const diagnostics = checkBoundaries({ root: resolve(import.meta.dir, "..") });
	for (const message of diagnostics) process.stderr.write(message + "\n");
	if (diagnostics.length) process.exit(1);
	process.stdout.write("Browser/server, UI/state, and AI package boundaries passed.\n");
}
