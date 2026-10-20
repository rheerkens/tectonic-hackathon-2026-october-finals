import { afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { demoUsers } from "@day-one/contracts";
import { type AppDatabase, openDatabase, seedDatabase } from "@day-one/db";
import type { Hono } from "hono";
import { type ApiEnvironment, AppError, type Change, createHttpApp } from "./index";

const cleanups: Array<() => void> = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});
export function createFeatureFixture(
	mount: (app: Hono<ApiEnvironment>, db: AppDatabase) => (() => void) | void,
) {
	const dir = mkdtempSync(join(tmpdir(), "day-one-feature-"));
	let handle = openDatabase({ path: join(dir, "app.sqlite") });
	seedDatabase(handle.db);
	let dispose: (() => void) | void;
	// Records realtime notifications so feature tests can assert who would be told about a write.
	const published: Change[] = [];
	function setup() {
		const app = createHttpApp({ log: () => {} });
		app.use("/api/*", async (c, next) => {
			const user = demoUsers.find((user) => user.id === c.req.header("x-dev-user"));
			if (!user) throw new AppError(401, "Choose a synthetic user to sign in.");
			c.set("user", user);
			c.set("publish", (change) => published.push(change));
			await next();
		});
		dispose = mount(app, handle.db);
		return app;
	}
	let app = setup();
	cleanups.push(() => {
		dispose?.();
		handle.close();
		rmSync(dir, { recursive: true, force: true });
	});
	return {
		get db() {
			return handle.db;
		},
		get app() {
			return app;
		},
		published,
		reopen() {
			dispose?.();
			handle.close();
			handle = openDatabase({ path: join(dir, "app.sqlite") });
			app = setup();
		},
	};
}
export async function request(
	fixture: ReturnType<typeof createFeatureFixture>,
	path: string,
	user = "alex",
	body?: unknown,
) {
	return fixture.app.request(path, {
		method: body === undefined ? "GET" : "POST",
		headers: { "x-dev-user": user, "Content-Type": "application/json" },
		...(body === undefined ? {} : { body: JSON.stringify(body) }),
	});
}
