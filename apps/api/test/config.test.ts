import { expect, test } from "bun:test";
import { readServerConfig } from "../src/config";

test("API requires an explicit auth mode", () => {
	for (const AUTH_MODE of [undefined, "", "typo"]) {
		expect(() => readServerConfig({ AUTH_MODE })).toThrow("AUTH_MODE");
	}
	expect(readServerConfig({ AUTH_MODE: "dev" }).auth.mode).toBe("dev");
});
test("production and Railway reject synthetic identities, even without NODE_ENV", () => {
	for (const env of [{ NODE_ENV: "production" }, { RAILWAY_ENVIRONMENT_ID: "railway" }]) {
		expect(() => readServerConfig({ ...env, AUTH_MODE: "dev" })).toThrow("Production");
	}
});
test("Clerk API requires its secret key, without requiring a web key", () => {
	expect(() => readServerConfig({ AUTH_MODE: "clerk" })).toThrow("CLERK_SECRET_KEY");
	const env = {
		AUTH_MODE: "clerk",
		CLERK_SECRET_KEY: "private-sentinel",
	};
	expect(readServerConfig(env).auth.mode).toBe("clerk");
});
test("invalid ports fail before opening a database or binding", () => {
	for (const API_PORT of ["oops", "0", "65536", "1.5"])
		expect(() => readServerConfig({ AUTH_MODE: "dev", API_PORT })).toThrow("API_PORT");
});

test("invalid runtime settings fail clearly", () => {
	expect(() => readServerConfig({ AUTH_MODE: "dev", NODE_ENV: "prod" })).toThrow("NODE_ENV");
	expect(() => readServerConfig({ AUTH_MODE: "dev", SERVE_STATIC: "yes" })).toThrow("SERVE_STATIC");
});
test("live-update origins must be exact http(s) origins", () => {
	expect(
		readServerConfig({
			AUTH_MODE: "dev",
			WEB_ORIGINS: "http://127.0.0.1:5173, http://host.tail.ts.net:5173",
		}).webOrigins,
	).toEqual(["http://127.0.0.1:5173", "http://host.tail.ts.net:5173"]);
	expect(readServerConfig({ AUTH_MODE: "dev" }).webOrigins).toEqual([]);
	for (const WEB_ORIGINS of ["http://a.test/path", "*.ts.net", "ws://a.test", "http://a.test/"])
		expect(() => readServerConfig({ AUTH_MODE: "dev", WEB_ORIGINS })).toThrow("WEB_ORIGINS");
});
