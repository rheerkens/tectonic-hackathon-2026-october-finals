import { expect, test } from "bun:test";
import { readWebConfig } from "./config";

test("web requires an explicit auth mode", () => {
	for (const AUTH_MODE of [undefined, "", "typo"])
		expect(() => readWebConfig({ AUTH_MODE })).toThrow("AUTH_MODE");
	expect(readWebConfig({ AUTH_MODE: "dev" }).mode).toBe("dev");
});

test("Clerk web requires only its publishable key and never exposes the secret", () => {
	expect(() => readWebConfig({ AUTH_MODE: "clerk" })).toThrow("VITE_CLERK_PUBLISHABLE_KEY");
	const env = { AUTH_MODE: "clerk", VITE_CLERK_PUBLISHABLE_KEY: "public" };
	expect(readWebConfig(env).publishableKey).toBe("public");
	expect(readWebConfig({ ...env, CLERK_SECRET_KEY: "private-sentinel" })).toEqual(
		readWebConfig(env),
	);
});

test("optimized local builds allow synthetic users; Railway builds reject them", () => {
	expect(readWebConfig({ AUTH_MODE: "dev", NODE_ENV: "production" }).mode).toBe("dev");
	expect(() => readWebConfig({ AUTH_MODE: "dev", RAILWAY_ENVIRONMENT_ID: "railway" })).toThrow(
		"Production",
	);
});
