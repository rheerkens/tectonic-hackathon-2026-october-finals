import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type Runtime, readRuntime } from "./src/runtime";

const root = resolve(import.meta.dir, "../.."),
	temp = mkdtempSync(join(tmpdir(), "day-one-isolation-"));
const children: Array<{
	root: string;
	proc: ReturnType<typeof Bun.spawn>;
	output: Promise<string>;
}> = [];
async function command(args: string[], cwd: string) {
	const p = Bun.spawn(args, { cwd, stdout: "pipe", stderr: "pipe" });
	const [out, err, code] = await Promise.all([
		new Response(p.stdout).text(),
		new Response(p.stderr).text(),
		p.exited,
	]);
	if (code !== 0) throw new Error(err || out);
	return out;
}
async function waitRuntime(cwd: string) {
	for (let i = 0; i < 200; i++) {
		const info = readRuntime(join(cwd, ".local/dev"));
		if (info?.status === "ready") return info;
		await Bun.sleep(100);
	}
	throw new Error("Isolation stack did not become ready.");
}
const sourceFiles = (
	await command(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], root)
)
	.split("\0")
	.filter(Boolean);
try {
	for (const name of ["a", "b"]) {
		const clone = join(temp, name);
		mkdirSync(clone);
		for (const file of sourceFiles) {
			const target = join(clone, file);
			mkdirSync(dirname(target), { recursive: true });
			cpSync(join(root, file), target);
		}
		await command(["git", "init", "-q", "-b", "main"], clone);
		for (const directory of [
			"",
			"apps/web",
			"apps/api",
			"packages/ai",
			"packages/db",
			"packages/contracts",
			"tools/dev",
		]) {
			const source = join(root, directory, "node_modules");
			if (existsSync(source)) symlinkSync(source, join(clone, directory, "node_modules"), "dir");
		}
		const proc = Bun.spawn([process.execPath, "tools/dev/src/cli.ts", "up"], {
			cwd: clone,
			env: { ...process.env, AUTH_MODE: "dev", DEV_PORT_REGISTRY: join(temp, "leases") },
			stdout: "pipe",
			stderr: "pipe",
		});
		children.push({
			root: clone,
			proc,
			output: Promise.all([
				new Response(proc.stdout).text(),
				new Response(proc.stderr).text(),
			]).then((parts) => parts.join("\n")),
		});
	}
	const [a, b] = await Promise.all(children.map((c) => waitRuntime(c.root)));
	if (!a || !b) throw new Error("Missing stacks");
	if (
		new Set([a.ports.web, a.ports.api, b.ports.web, b.ports.api]).size !== 4 ||
		a.databasePath === b.databasePath
	)
		throw new Error("Environment collision");
	const response = await fetch(`http://127.0.0.1:${a.ports.api}/api/workspaces/studio/notes`, {
		method: "POST",
		headers: { "x-dev-user": "alex", "Content-Type": "application/json" },
		body: JSON.stringify({ text: "Only clone A" }),
	});
	if (response.status !== 201) throw new Error("Could not write clone A note");
	const other = await (
		await fetch(`http://127.0.0.1:${b.ports.api}/api/workspaces/studio/notes`, {
			headers: { "x-dev-user": "alex" },
		})
	).text();
	if (other.includes("Only clone A")) throw new Error("Database state leaked between clones");
	const result = {
		pass: true,
		stacks: [a, b].map((r: Runtime) => ({
			url: r.urls.web,
			ports: r.ports,
			database: r.databasePath,
		})),
		checks: [
			"distinct ports across independent clones",
			"distinct SQLite files",
			"real API write/read isolation",
			"owned shutdown",
		],
	};
	for (const child of children) {
		await command([process.execPath, "tools/dev/src/cli.ts", "stop"], child.root);
		await child.proc.exited;
		const state = readRuntime(join(child.root, ".local/dev"));
		if (state?.status !== "stopped") throw new Error("Owned shutdown did not complete.");
	}
	const report = resolve(root, "artifacts/verification/isolation.json");
	mkdirSync(dirname(report), { recursive: true });
	writeFileSync(report, JSON.stringify(result, null, 2));
	process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} finally {
	for (const child of children) {
		if (child.proc.exitCode === null) {
			child.proc.kill("SIGTERM");
			await child.proc.exited;
		}
		await child.output;
	}
	rmSync(temp, { recursive: true, force: true });
}

export {};
