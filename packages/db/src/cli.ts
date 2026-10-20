import { resolve } from "node:path";
import { openDatabase } from "./client";
import { seedDatabase } from "./seed";

const command = process.argv[2];
if (command !== "migrate" && command !== "seed") throw new Error("Use migrate or seed.");
const path =
	process.env.DATABASE_PATH || resolve(import.meta.dir, "../../../.local/dev/app.sqlite");
const handle = openDatabase({ path });
try {
	if (command === "seed") seedDatabase(handle.db);
	process.stdout.write(`${command}: ${path}\n`);
} finally {
	handle.close();
}
