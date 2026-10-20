// Adapted from Tectonic runtime.ts; no credentials or database process metadata.
import {
	closeSync,
	constants,
	existsSync,
	openSync,
	realpathSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { z } from "zod";
import { containedPath, noFollow, readRegularFile } from "./paths";
import { assertProfile } from "./worktree";

const RuntimeSchema = z.object({
	owner: z.string(),
	profile: z.string(),
	root: z.string(),
	status: z.enum(["starting", "ready", "stopped", "failed"]),
	ports: z.object({ web: z.number(), api: z.number() }),
	urls: z.object({ web: z.string(), api: z.string() }),
	databasePath: z.string(),
	controlPath: z.string(),
	pid: z.number(),
});
export type Runtime = z.infer<typeof RuntimeSchema>;
/** Requires a `<root>/.local/<profile>` directory; neither `.local` nor the profile may be a symlink. */
export function assertProfileDir(local: string) {
	if (basename(dirname(local)) !== ".local") throw new Error(`Not a profile directory: ${local}`);
	assertProfile(basename(local));
	const root = dirname(dirname(local));
	for (const dir of [dirname(local), local])
		if (existsSync(dir) && realpathSync(dir) !== join(realpathSync(root), relative(root, dir)))
			throw new Error(`Profile directory must not be a symlink: ${dir}`);
	return local;
}
/** Runtime state is only read or written inside a validated profile directory. */
function runtimeFile(local: string, name = "runtime.json") {
	return containedPath(assertProfileDir(local), name);
}
export function readRuntime(local: string) {
	try {
		return RuntimeSchema.parse(
			JSON.parse(readRegularFile(assertProfileDir(local), "runtime.json")),
		);
	} catch {
		return null;
	}
}
export function writeRuntime(local: string, runtime: Runtime) {
	const file = runtimeFile(local),
		tmp = runtimeFile(local, `runtime.json.${process.pid}.${crypto.randomUUID()}.tmp`),
		// Exclusive create: a planted link or FIFO at the temporary name fails instead of being written.
		fd = openSync(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
	try {
		try {
			writeFileSync(fd, JSON.stringify(runtime, null, 2));
		} finally {
			closeSync(fd);
		}
		renameSync(tmp, file);
	} catch (error) {
		rmSync(tmp, { force: true });
		throw error;
	}
}
export async function tailscaleHost() {
	try {
		const p = Bun.spawn(["tailscale", "status", "--json"], { stdout: "pipe", stderr: "ignore" });
		const data = z
			.object({ Self: z.object({ DNSName: z.string() }) })
			.parse(await new Response(p.stdout).json());
		await p.exited;
		return data.Self.DNSName.replace(/\.$/, "");
	} catch {
		return null;
	}
}
