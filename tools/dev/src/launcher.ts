// Adapted lifecycle from Tectonic tools/dev/src/launcher.ts at 6433fda.
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { openDatabase, seedDatabase } from "@day-one/db";
import { readServerConfig } from "../../../apps/api/src/config";
import { readWebConfig } from "../../../apps/web/src/config";
import { reservePorts } from "./leases";
import { createLifecycle } from "./lifecycle";
import { claimFile, newOwner } from "./lock";
import { type ManagedProcess, spawnManaged, stopManaged } from "./procs";
import {
	assertProfileDir,
	type Runtime,
	readRuntime,
	tailscaleHost,
	writeRuntime,
} from "./runtime";
import { hashPath, localDir, resolveWorktree } from "./worktree";
export async function launch({ profile }: { profile: string }) {
	const worktree = await resolveWorktree();
	// Validate before and after creating it, so no logs, claims or database land outside the checkout.
	const local = assertProfileDir(localDir(worktree.root, profile));
	mkdirSync(join(local, "logs"), { recursive: true });
	assertProfileDir(local);
	const owner = newOwner(worktree.root, profile);
	const releaseProfile = claimFile(join(local, "dev.lock"), owner);
	let lease: Awaited<ReturnType<typeof reservePorts>> | undefined;
	const children: ManagedProcess[] = [];
	let runtime: Runtime | undefined;
	let control: ReturnType<typeof Bun.serve> | undefined;
	const lifecycle = createLifecycle(async (_reason, code) => {
		await Promise.all(children.map((child) => stopManaged(child)));
		if (control) await control.stop(true);
		try {
			if (runtime) writeRuntime(local, { ...runtime, status: code === 0 ? "stopped" : "failed" });
		} finally {
			lease?.release();
			releaseProfile();
		}
	});
	const terminate = () => {
		void lifecycle.stop("signal").then(() => process.exit(0));
	};
	process.once("SIGINT", terminate);
	process.once("SIGTERM", terminate);
	try {
		const envFile = join(worktree.root, ".env.local");
		const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
		const env = { ...fileEnv, ...process.env };
		const authMode = readServerConfig(env).auth.mode;
		readWebConfig(env);
		lease = await reservePorts({ owner, seed: hashPath(worktree.root + "#" + profile) });
		lifecycle.assertStarting();
		const hostname = await tailscaleHost();
		lifecycle.assertStarting();
		const urlHost = hostname || "127.0.0.1";
		const ports = lease.ports;
		const databasePath = join(local, "app.sqlite"),
			controlPath = join(tmpdir(), `day-one-${owner.owner.slice(0, 12)}.sock`);
		const db = openDatabase({ path: databasePath });
		if (authMode === "dev") seedDatabase(db.db);
		db.close();
		if (existsSync(controlPath)) unlinkSync(controlPath);
		runtime = {
			...owner,
			status: "starting",
			ports,
			urls: { web: `http://${urlHost}:${ports.web}`, api: `http://${urlHost}:${ports.api}` },
			databasePath,
			controlPath,
		};
		writeRuntime(local, runtime);
		control = Bun.serve({
			unix: controlPath,
			fetch(req) {
				if (req.headers.get("x-owner") !== owner.owner)
					return new Response("Owner mismatch", { status: 403 });
				if (new URL(req.url).pathname === "/stop") {
					setTimeout(terminate, 100);
					return Response.json({ stopping: true });
				}
				return Response.json({ owner: owner.owner, status: runtime?.status });
			},
		});
		const childEnv = {
			...env,
			DEV_LAUNCHER_PID: String(process.pid),
			AUTH_MODE: authMode,
			VITE_AUTH_MODE: authMode,
			DATABASE_PATH: databasePath,
			API_PORT: String(ports.api),
			WEB_PORT: String(ports.web),
			// Exact browser origins for live updates; Vite's proxy keeps the browser's Origin.
			WEB_ORIGINS: [
				...new Set([
					`http://127.0.0.1:${ports.web}`,
					`http://localhost:${ports.web}`,
					`http://${urlHost}:${ports.web}`,
				]),
			].join(","),
			SERVE_STATIC: "0",
		};
		const onLine = (name: string) => (line: string) => {
			appendFileSync(join(local, "logs", name + ".log"), line + "\n");
			process.stdout.write(`[${name}] ${line}\n`);
		};
		const api = spawnManaged({
			name: "api",
			cmd: [process.execPath, "--watch", "--no-clear-screen", "src/index.ts"],
			cwd: join(worktree.root, "apps/api"),
			env: childEnv,
			onLine: onLine("api"),
		});
		children.push(api);
		const vite = resolve(worktree.root, "apps/web/node_modules/vite/bin/vite.js");
		const web = spawnManaged({
			name: "web",
			cmd: [
				process.execPath,
				vite,
				"--host",
				"0.0.0.0",
				"--port",
				String(ports.web),
				"--strictPort",
				"--clearScreen",
				"false",
			],
			cwd: join(worktree.root, "apps/web"),
			env: childEnv,
			onLine: onLine("web"),
		});
		children.push(web);
		for (const child of children)
			void child.exited.then((code) => {
				if (!lifecycle.isStopping())
					void lifecycle.stop(`${child.name} exited`, code || 1).then(() => process.exit(1));
			});
		await Promise.all([
			ready(`http://127.0.0.1:${ports.api}/api/health`, lifecycle.isStopping),
			ready(`http://127.0.0.1:${ports.web}/`, lifecycle.isStopping),
		]);
		lifecycle.assertStarting();
		runtime.status = "ready";
		lifecycle.started();
		writeRuntime(local, runtime);
		process.stdout.write(
			`\nPreview: ${runtime.urls.web}\nProfile: ${profile}\nStop: bun run dev:stop --profile ${profile}\n`,
		);
		if (!hostname)
			process.stdout.write(
				"Tailscale DNS unavailable; connect Tailscale before sharing this preview.\n",
			);
		await new Promise<void>((resolveDone) => {
			void Promise.all(children.map((child) => child.exited)).then(() => resolveDone());
		});
	} catch (error) {
		lifecycle.started();
		await lifecycle.stop("startup failure", 1);
		throw error;
	} finally {
		process.removeListener("SIGINT", terminate);
		process.removeListener("SIGTERM", terminate);
	}
}
async function ready(url: string, stopping: () => boolean) {
	const deadline = Date.now() + 15000;
	while (Date.now() < deadline) {
		if (stopping()) throw new Error("Startup cancelled.");
		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
			if (response.ok) return;
		} catch {}
		await Bun.sleep(100);
	}
	throw new Error(`App did not become ready: ${url}`);
}
export async function stopStack(profile: string) {
	const worktree = await resolveWorktree();
	const runtime = readRuntime(localDir(worktree.root, profile));
	if (!runtime || runtime.status === "stopped") return false;
	if (runtime.root !== worktree.root || runtime.profile !== profile)
		throw new Error("Runtime state belongs to another environment. Inspect bun doctor.");
	// Ask the verified launcher to stop its exact subprocess handles. Never signal saved PIDs.
	const response = await fetch("http://localhost/stop", {
		unix: runtime.controlPath,
		method: "POST",
		headers: { "x-owner": runtime.owner },
		signal: AbortSignal.timeout(2000),
	});
	if (!response.ok) throw new Error("Launcher ownership check failed. Inspect bun doctor.");
	return true;
}
