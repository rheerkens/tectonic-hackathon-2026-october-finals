import { expect, test } from "bun:test";
import { bunMismatch, installerVersion } from "./require-bun";

test("reads the installing Bun from the package manager user agent", () => {
	expect(installerVersion("bun/1.3.0 npm/? node/v24.3.0 linux x64", "9.9.9")).toBe("1.3.0");
	expect(installerVersion(undefined, "1.4.2")).toBe("1.4.2");
	expect(installerVersion("npm/10.0.0 node/v24.3.0", "1.4.2")).toBe("1.4.2");
});

test("only the pinned Bun may install", () => {
	expect(bunMismatch("1.4.2", "1.4.2")).toBeNull();
	expect(bunMismatch("1.4.3", "1.4.2")).toContain("Bun 1.4.2 is required (running 1.4.3)");
	expect(bunMismatch("1.3.0", "1.4.2")).toContain("bun-v1.4.2");
});
