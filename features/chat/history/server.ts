import { type AppDatabase, turns } from "@day-one/db";
import type { ApiEnvironment } from "@day-one/server";
import { asc, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { conversationAccess } from "../shared/access.server";
export function mountHistory(app: Hono<ApiEnvironment>, db: AppDatabase) {
	app.get("/api/conversations/:id", (c) => {
		const conversation = conversationAccess({
			db,
			id: c.req.param("id"),
			userId: c.get("user").id,
		});
		c.set("workspaceId", conversation.workspaceId);
		return c.json({
			conversation,
			turns: db
				.select()
				.from(turns)
				.where(eq(turns.conversationId, conversation.id))
				.orderBy(asc(turns.createdAt))
				.all(),
		});
	});
}
