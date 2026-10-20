import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getCodexStatus, readCodexToken } from "../shared/login.server";

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
test("local login adapter validates controlled fixtures and refuses production", async () => {
	const dir = mkdtempSync(join(tmpdir(), "day-one-login-"));
	try {
		const file = join(dir, "auth.json");
		process.env.CODEX_AUTH_FILE = file;
		expect((await getCodexStatus()).available).toBe(false);
		const payload = {
			exp: Math.floor(Date.now() / 1000) + 3600,
			"https://api.openai.com/auth": { chatgpt_account_id: "fixture" },
		};
		const token = `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
		writeFileSync(file, JSON.stringify({ auth_mode: "chatgpt", tokens: { access_token: token } }));
		expect(await readCodexToken()).toBe(token);
		expect((await getCodexStatus()).available).toBe(true);
		expect(await getCodexStatus({ productionLike: true })).toMatchObject({ available: false });
		writeFileSync(file, "invalid");
		expect(await readCodexToken()).toBeUndefined();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
