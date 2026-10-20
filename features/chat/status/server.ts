import type { ApiEnvironment } from "@day-one/server";
import type { Hono } from "hono";
import type { ChatStatus } from "./contract";
export function mountChatStatus(app: Hono<ApiEnvironment>, status: () => Promise<ChatStatus>) {
	app.get("/api/chat/status", async (c) => c.json(await status()));
}
