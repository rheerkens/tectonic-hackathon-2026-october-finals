import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkBoundaries } from "./boundaries";

const directories: string[] = [];
afterEach(() => {
	for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function fixture(files: Record<string, string>) {
	const root = mkdtempSync(join(tmpdir(), "day-one-boundaries-"));
	directories.push(root);
	for (const [name, text] of Object.entries(files)) {
		const file = join(root, name);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, text);
	}
	return root;
}
test("browser checks follow relative re-exports into server code", () => {
	const root = fixture({
		"features/notes/create/client.ts": 'export * from "./bridge";',
		"features/notes/create/bridge.ts": 'export * from "./server";',
		"features/notes/create/server.ts": 'export const secret = "server";',
	});
	expect(
		checkBoundaries({
			root,
			browserEntries: [join(root, "features/notes/create/client.ts")],
			uiEntries: [],
			aiEntries: [],
			featureEntries: [],
		}).join("\n"),
	).toContain("Forbidden browser dependency");
});
test("UI can enter state but cannot call transport or import an action client", () => {
	const root = fixture({
		"apps/web/src/pages/Page.tsx": 'import "../state/notes";',
		"apps/web/src/state/notes.ts": 'import "../../../../features/notes/create/client";',
		"features/notes/create/client.ts": 'export const save = () => fetch("/api/notes");',
	});
	const page = join(root, "apps/web/src/pages/Page.tsx");
	const options = {
		root,
		browserEntries: [page],
		uiEntries: [page],
		aiEntries: [],
		featureEntries: [],
	};
	expect(checkBoundaries(options)).toEqual([]);
	writeFileSync(page, 'import "../../../../features/notes/create/client";');
	expect(checkBoundaries(options).join("\n")).toContain("Forbidden ui dependency");
	writeFileSync(page, 'const send = globalThis.fetch; send("/api/notes");');
	expect(checkBoundaries(options).join("\n")).toContain("UI must use feature state");
});
test("require cannot bypass browser isolation", () => {
	const root = fixture({ "features/notes/create/client.ts": 'const fs = require("node:fs");' });
	expect(
		checkBoundaries({
			root,
			browserEntries: [join(root, "features/notes/create/client.ts")],
			uiEntries: [],
			aiEntries: [],
			featureEntries: [],
		}).join("\n"),
	).toContain("Forbidden browser dependency");
});
test("browser code may import only allow-listed packages and browser source roots", () => {
	const root = fixture({
		"features/notes/create/state.ts": 'import "zod";\nimport "./styles.css";',
		"packages/email/src/index.ts": "export const send = () => {};",
	});
	const state = join(root, "features/notes/create/state.ts");
	const options = {
		root,
		browserEntries: [state],
		uiEntries: [],
		aiEntries: [],
		featureEntries: [],
	};
	expect(checkBoundaries(options)).toEqual([]);
	for (const specifier of ["hono", "@day-one/email", "../../../packages/email/src/index"]) {
		writeFileSync(state, `import "${specifier}";`);
		expect(checkBoundaries(options).join("\n")).toContain(
			`Forbidden browser dependency: ${state} → ${specifier}`,
		);
	}
});
test("features cannot import another feature's production code", () => {
	const root = fixture({
		"features/chat/send/server.ts": 'import "../../notes/create/server";',
		"features/chat/send/server.test.ts": 'import "../../notes/create/server";',
		"features/notes/create/server.ts": "export const createNote = () => {};",
	});
	const diagnostics = checkBoundaries({ root, browserEntries: [], uiEntries: [], aiEntries: [] });
	expect(diagnostics).toEqual([
		`Feature must not import another feature: ${join(root, "features/chat/send/server.ts")} → ../../notes/create/server`,
	]);
});
test("source files are read only when their real path stays inside the root", () => {
	const root = fixture({ "features/notes/create/state.ts": 'import "./linked";' }),
		outside = fixture({ "secret.ts": 'import "node:fs";' });
	symlinkSync(join(outside, "secret.ts"), join(root, "features/notes/create/linked.ts"));
	const state = join(root, "features/notes/create/state.ts");
	const diagnostics = checkBoundaries({
		root,
		browserEntries: [state, join(root, "features/notes/create/linked.ts")],
		uiEntries: [],
		aiEntries: [],
		featureEntries: [],
	}).join("\n");
	expect(diagnostics).toContain(
		`Source file is missing or outside ${root}: ${join(root, "features/notes/create/linked.ts")}`,
	);
	expect(diagnostics).not.toContain("node:fs");
});
test("a tsconfig outside the root fails closed instead of dropping path aliases", () => {
	const root = fixture({ "features/chat/state.ts": "export {};" }),
		outside = fixture({ "tsconfig.json": "{}" });
	symlinkSync(join(outside, "tsconfig.json"), join(root, "tsconfig.json"));
	expect(
		checkBoundaries({
			root,
			browserEntries: [],
			uiEntries: [],
			aiEntries: [],
			featureEntries: [],
		}),
	).toContain(`TypeScript config is unreadable or outside ${root}: ${join(root, "tsconfig.json")}`);
});
