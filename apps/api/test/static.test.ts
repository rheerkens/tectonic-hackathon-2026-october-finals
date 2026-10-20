import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHttpApp } from "@day-one/server";
import { mountWebApp } from "../src/static";

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test("the built app loads on client routes; missing files and API paths stay 404", async () => {
	const root = mkdtempSync(join(tmpdir(), "day-one-web-"));
	dirs.push(root);
	mkdirSync(join(root, "assets"));
	writeFileSync(join(root, "index.html"), "<div id=root></div>");
	writeFileSync(join(root, "assets", "app.js"), "console.log(1)");
	const app = createHttpApp({ log: () => {} });
	mountWebApp(app, root);
	for (const path of ["/", "/w/studio/notes", "/w/studio/chat/abc"]) {
		const response = await app.request(path);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("id=root");
	}
	expect(await (await app.request("/assets/app.js")).text()).toContain("console.log");
	expect((await app.request("/assets/missing.js")).status).toBe(404);
	const api = await app.request("/api/nope");
	expect(api.status).toBe(404);
	expect((await api.json()).code).toBe("NOT_FOUND");
});
