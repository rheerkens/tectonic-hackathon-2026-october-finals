import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { containedPath } from "../src/paths";
import { assertProfileDir, type Runtime, readRuntime, writeRuntime } from "../src/runtime";

test("contained paths stay strictly inside their base", () => {
	expect(containedPath("/base", "a", "b.json")).toBe("/base/a/b.json");
	expect(containedPath("/base", "..name")).toBe("/base/..name");
	for (const segment of ["..", "../x", "a/../../x", "/etc/passwd", "", "."])
		expect(() => containedPath("/base", segment)).toThrow("escapes");
});
test("runtime state is read and written only inside a profile directory", () => {
	const root = mkdtempSync(join(tmpdir(), "day-one-runtime-")),
		local = join(root, ".local", "dev");
	const runtime: Runtime = {
		owner: "o",
		profile: "dev",
		root,
		status: "ready",
		ports: { web: 1, api: 2 },
		urls: { web: "http://w", api: "http://a" },
		databasePath: join(local, "db.sqlite"),
		controlPath: join(local, "control"),
		pid: 1,
	};
	try {
		mkdirSync(local, { recursive: true });
		writeRuntime(local, runtime);
		expect(readRuntime(local)).toEqual(runtime);
		for (const dir of [
			root,
			join(root, "other", "dev"),
			join(root, ".local", "../x"),
			join(root, ".local", "Bad"),
		]) {
			expect(() => readRuntime(dir)).toThrow();
			expect(() => writeRuntime(dir, runtime)).toThrow();
		}
		const e2e = join(root, ".local", "e2e");
		mkdirSync(e2e);
		writeFileSync(join(root, "elsewhere.json"), JSON.stringify(runtime));
		symlinkSync(join(root, "elsewhere.json"), join(e2e, "runtime.json"));
		expect(readRuntime(e2e)).toBeNull();
		const outside = join(root, "outside");
		mkdirSync(outside);
		writeFileSync(join(outside, "runtime.json"), JSON.stringify(runtime));
		symlinkSync(outside, join(root, ".local", "linked"));
		expect(() => readRuntime(join(root, ".local", "linked"))).toThrow("symlink");
		expect(() => writeRuntime(join(root, ".local", "linked"), runtime)).toThrow("symlink");
		expect(readdirSync(local)).toEqual(["runtime.json"]);
		const linkedRoot = join(root, "linked-root");
		mkdirSync(join(outside, "dev"));
		mkdirSync(linkedRoot);
		symlinkSync(outside, join(linkedRoot, ".local"));
		expect(() => assertProfileDir(join(linkedRoot, ".local", "dev"))).toThrow("symlink");
		expect(() => readRuntime(join(linkedRoot, ".local", "dev"))).toThrow("symlink");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
