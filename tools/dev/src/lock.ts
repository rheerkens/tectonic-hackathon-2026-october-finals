// Adapted from Tectonic lock.ts: exclusive claim + nonce ownership, no PID-based stop.
import {
	closeSync,
	constants,
	existsSync,
	mkdirSync,
	openSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { noFollow, readRegularFile } from "./paths";

const OwnerSchema = z.object({
	owner: z.string(),
	pid: z.number().int().positive(),
	root: z.string(),
	profile: z.string(),
	startedAt: z.string(),
});
export type Owner = z.infer<typeof OwnerSchema>;
export function readOwner(file: string) {
	try {
		// Claims live in a shared cache directory: never follow a planted symlink or FIFO.
		return OwnerSchema.parse(JSON.parse(readRegularFile(file)));
	} catch {
		return null;
	}
}
export class ClaimBusy extends Error {
	constructor(readonly file: string) {
		const owner = readOwner(file);
		super(
			`Environment claim is occupied: ${file}${owner ? ` (pid ${owner.pid}, ${owner.root})` : ""}. Use bun doctor to inspect; never stop a process by a stale PID.`,
		);
	}
}
export function claimFile(file: string, owner: Owner) {
	mkdirSync(dirname(file), { recursive: true });
	let fd: number;
	try {
		// Same as "wx" (exclusive create, so an existing link is EEXIST), plus no-follow.
		fd = openSync(
			file,
			constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow,
			0o600,
		);
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "EEXIST")
			throw new ClaimBusy(file);
		throw error;
	}
	try {
		writeFileSync(fd, JSON.stringify(owner));
	} catch (error) {
		unlinkSync(file);
		throw error;
	} finally {
		closeSync(fd);
	}
	return () => {
		if (readOwner(file)?.owner === owner.owner) unlinkSync(file);
	};
}
export function isProcessAlive(pid: number) {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return error instanceof Error && "code" in error && error.code === "EPERM";
	}
}
export function newOwner(root: string, profile: string): Owner {
	return {
		owner: crypto.randomUUID(),
		pid: process.pid,
		root,
		profile,
		startedAt: new Date().toISOString(),
	};
}
export function claimExists(file: string) {
	return existsSync(file);
}
