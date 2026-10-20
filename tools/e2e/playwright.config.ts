import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const file = fileURLToPath(new URL("../../.local/dev/runtime.json", import.meta.url));
const runtime = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
export default defineConfig({
	testDir: "./specs",
	workers: 1,
	timeout: 45000,
	use: {
		baseURL: process.env.WEB_URL || runtime?.urls.web || "http://127.0.0.1:5173",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	reporter: "list",
});
