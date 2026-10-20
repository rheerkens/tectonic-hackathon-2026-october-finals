import { expect, test } from "bun:test";
import { createLifecycle } from "../src/lifecycle";

test("stop during deferred acquisition waits for the lease before cleanup", async () => {
	const acquired = Promise.withResolvers<void>();
	const resources: string[] = [];
	let spawned = false;
	let cleaned: string[] = [];
	const lifecycle = createLifecycle(async () => {
		cleaned = [...resources];
	});
	const startup = (async () => {
		try {
			await acquired.promise;
			resources.push("lease");
			lifecycle.assertStarting();
			spawned = true;
		} catch {
		} finally {
			lifecycle.started();
		}
	})();
	const stopped = lifecycle.stop("signal");
	expect(cleaned).toEqual([]);
	acquired.resolve();
	await Promise.all([startup, stopped]);
	expect(spawned).toBe(false);
	expect(cleaned).toEqual(["lease"]);
});
test("stop after the first child prevents the second and cleans the first", async () => {
	const resources = ["api"];
	let cleaned: string[] = [];
	const lifecycle = createLifecycle(async () => {
		cleaned = [...resources];
	});
	const stopped = lifecycle.stop("signal");
	expect(() => lifecycle.assertStarting()).toThrow("cancelled");
	lifecycle.started();
	await stopped;
	expect(cleaned).toEqual(["api"]);
});
