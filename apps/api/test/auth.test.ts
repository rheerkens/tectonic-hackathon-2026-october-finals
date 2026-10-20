import { afterEach, expect, test } from "bun:test";
import { openDatabase } from "@day-one/db";
import { authConfig, authenticate } from "../src/auth";

const original = {
	NODE_ENV: process.env.NODE_ENV,
	AUTH_MODE: process.env.AUTH_MODE,
	CODEX_AUTH_FILE: process.env.CODEX_AUTH_FILE,
	CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
};
afterEach(() => {
	for (const [key, value] of Object.entries(original)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});
test("production refuses synthetic auth", () => {
	process.env.NODE_ENV = "production";
	process.env.AUTH_MODE = "dev";
	expect(() => authConfig()).toThrow("Production requires");
	process.env.AUTH_MODE = "clerk";
	process.env.CLERK_SECRET_KEY = "fixture";
	expect(authConfig().mode).toBe("clerk");
});

test("valid Clerk identity does not turn SQLite failure into an authentication error", async () => {
	const handle = openDatabase({ path: ":memory:" });
	handle.close();
	await expect(
		authenticate(
			new Request("http://fixture/api", { headers: { authorization: "Bearer fixture" } }),
			handle.db,
			{ mode: "clerk", secretKey: "fixture" },
			async () => ({ sub: "clerk-user" }),
		),
	).rejects.toThrow(/closed/i);
});
