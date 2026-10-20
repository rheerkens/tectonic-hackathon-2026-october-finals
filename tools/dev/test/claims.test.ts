import { expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { leaseFile, listLeases, reservePorts } from "../src/leases";
import { ClaimBusy, claimFile, newOwner, readOwner } from "../src/lock";

test("exclusive claim rejects duplicate start and owner mismatch cannot release", () => {
	const dir = mkdtempSync(join(tmpdir(), "day-one-lock-")),
		file = join(dir, "claim"),
		owner = newOwner(dir, "dev");
	try {
		const release = claimFile(file, owner);
		expect(() => claimFile(file, newOwner(dir, "dev"))).toThrow("occupied");
		const foreign = newOwner(dir, "dev");
		writeFileSync(file, JSON.stringify(foreign));
		release();
		expect(readOwner(file)?.owner).toBe(foreign.owner);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
test("concurrent independent clones reserve disjoint host port pairs", async () => {
	const registry = mkdtempSync(join(tmpdir(), "day-one-leases-"));
	try {
		const [a, b] = await Promise.all([
			reservePorts({ registry, seed: 1, owner: newOwner("/clone/a", "dev") }),
			reservePorts({ registry, seed: 1, owner: newOwner("/clone/b", "dev") }),
		]);
		expect(new Set([a.ports.web, a.ports.api, b.ports.web, b.ports.api]).size).toBe(4);
		a.release();
		b.release();
		const c = await reservePorts({ registry, seed: 1, owner: newOwner("/clone/c", "dev") });
		expect(c.ports.web).toBe(a.ports.web);
		c.release();
	} finally {
		rmSync(registry, { recursive: true, force: true });
	}
});
test("claims never follow a planted symlink or FIFO", () => {
	const dir = mkdtempSync(join(tmpdir(), "day-one-lock-")),
		target = join(dir, "target"),
		owner = newOwner(dir, "dev");
	try {
		writeFileSync(target, JSON.stringify(owner));
		symlinkSync(target, join(dir, "linked"));
		expect(readOwner(join(dir, "linked"))).toBeNull();
		expect(() => claimFile(join(dir, "linked"), owner)).toThrow(ClaimBusy);
		symlinkSync(join(dir, "missing"), join(dir, "dangling"));
		expect(() => claimFile(join(dir, "dangling"), owner)).toThrow(ClaimBusy);
		expect(existsSync(join(dir, "missing"))).toBe(false);
		expect(Bun.spawnSync(["mkfifo", join(dir, "fifo")]).exitCode).toBe(0);
		expect(readOwner(join(dir, "fifo"))).toBeNull();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
test("lease paths are validated port files inside the registry", () => {
	const registry = mkdtempSync(join(tmpdir(), "day-one-leases-")),
		outside = mkdtempSync(join(tmpdir(), "day-one-outside-"));
	try {
		expect(leaseFile(registry, 8080)).toBe(join(registry, "8080.json"));
		for (const port of [0, -1, 65536, 1.5, Number.NaN])
			expect(() => leaseFile(registry, port)).toThrow();
		writeFileSync(join(registry, "8080.json"), "{}");
		writeFileSync(join(registry, "notes.json"), "{}");
		writeFileSync(join(registry, "0.json"), "{}");
		writeFileSync(join(registry, "70000.json"), "{}");
		writeFileSync(join(outside, "secret"), "{}");
		symlinkSync(join(outside, "secret"), join(registry, "9000.json"));
		mkdirSync(join(registry, "9001.json"));
		expect(listLeases(registry)).toEqual([join(registry, "8080.json")]);
		expect(listLeases(join(registry, "absent"))).toEqual([]);
	} finally {
		rmSync(registry, { recursive: true, force: true });
		rmSync(outside, { recursive: true, force: true });
	}
});
