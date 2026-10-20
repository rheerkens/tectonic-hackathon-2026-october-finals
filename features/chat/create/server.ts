import { type AppDatabase, conversations } from "@day-one/db";
import { type ApiEnvironment, requireWorkspaceAccess } from "@day-one/server";
import type { Hono } from "hono";
import { conversationsFamily } from "../shared/keys";
export function mountCreateConversation(app: Hono<ApiEnvironment>, db: AppDatabase) {
	app.post("/api/workspaces/:id/conversations", (c) => {
		const workspaceId = c.req.param("id"),
			userId = c.get("user").id;
		requireWorkspaceAccess({ db, workspaceId, userId, required: "viewer" });
		c.set("workspaceId", workspaceId);
		const conversation = {
			id: crypto.randomUUID(),
			workspaceId,
			userId,
			title: "New conversation",
			createdAt: new Date().toISOString(),
		};
		db.insert(conversations).values(conversation).run();
		c.get("publish")({
			audience: "user",
			userId,
			workspaceId,
			actorId: userId,
			targets: [{ family: conversationsFamily }],
		});
		return c.json(conversation, 201);
	});
}
