import { type AppDatabase, conversations } from "@day-one/db";
import { type ApiEnvironment, requireWorkspaceAccess } from "@day-one/server";
import { and, desc, eq } from "drizzle-orm";
import type { Hono } from "hono";
export function mountListConversations(app: Hono<ApiEnvironment>, db: AppDatabase) {
	app.get("/api/workspaces/:id/conversations", (c) => {
		const workspaceId = c.req.param("id"),
			userId = c.get("user").id;
		requireWorkspaceAccess({ db, workspaceId, userId, required: "viewer" });
		c.set("workspaceId", workspaceId);
		return c.json(
			db
				.select()
				.from(conversations)
				.where(and(eq(conversations.workspaceId, workspaceId), eq(conversations.userId, userId)))
				.orderBy(desc(conversations.createdAt))
				.limit(30)
				.all(),
		);
	});
}
