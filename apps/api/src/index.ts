import { resolve } from "node:path";
import { recoverInterruptedChat } from "@day-one/chat/shared/recovery.server";
import { openDatabase, seedDatabase } from "@day-one/db";
import { createApp } from "./app";
import { readServerConfig } from "./config";
import { mountWebApp } from "./static";

const root = resolve(import.meta.dir, "../../..");
const config = readServerConfig(process.env);
const handle = openDatabase({
	path: resolve(root, config.databasePath),
});
if (config.auth.mode === "dev") seedDatabase(handle.db);
recoverInterruptedChat(handle.db);
const { app, abortActive, realtime } = createApp({
	db: handle.db,
	auth: config.auth,
	development: !config.production,
	// A built app served by this API shares its origin; the dev launcher lists the Vite origins.
	origins: { origins: config.webOrigins, sameOrigin: config.serveStatic },
});
if (config.serveStatic) mountWebApp(app, resolve(root, "apps/web/dist"));
const server = Bun.serve({
	fetch: app.fetch,
	websocket: realtime.websocket,
	hostname: config.hostname,
	port: config.port,
	idleTimeout: 120,
});
process.stdout.write(JSON.stringify({ event: "api_ready", port: server.port }) + "\n");
let stopping = false;
async function shutdown() {
	if (stopping) return;
	stopping = true;
	abortActive();
	// Close sockets and timers before SQLite closes; pending deliveries read memberships.
	realtime.close();
	await server.stop(true);
	handle.close();
	process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
// If the launcher disappears, its API closes itself rather than becoming an orphan.
const parent = Number(process.env.DEV_LAUNCHER_PID);
if (parent) {
	setInterval(() => {
		try {
			process.kill(parent, 0);
		} catch {
			void shutdown();
		}
	}, 1500).unref();
}
