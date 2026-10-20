import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";
export function openDatabase({ path }: { path: string }) {
	if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
	const sqlite = new Database(path, { create: true, strict: true });
	try {
		sqlite.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
		const db = drizzle(sqlite, { schema });
		migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
		return { db, sqlite, close: () => sqlite.close() };
	} catch (error) {
		sqlite.close();
		throw error;
	}
}
export type AppDatabase = ReturnType<typeof openDatabase>["db"];
