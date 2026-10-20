import { type AppDatabase, notes } from "@day-one/db";
import { type ApiEnvironment, type FeatureContext, requireWorkspaceAccess } from "@day-one/server";
import { desc, eq } from "drizzle-orm";
import type { Hono } from "hono";
export function listNotes(context: FeatureContext) {
	requireWorkspaceAccess({ ...context, required: "viewer" });
	return context.db
		.select()
		.from(notes)
		.where(eq(notes.workspaceId, context.workspaceId))
		.orderBy(desc(notes.createdAt))
		.limit(50)
		.all();
}
export function mountListNotes(app: Hono<ApiEnvironment>, db: AppDatabase) {
	app.get("/api/workspaces/:id/notes", (c) => {
		const result = listNotes({ db, workspaceId: c.req.param("id"), userId: c.get("user").id });
		c.set("workspaceId", c.req.param("id"));
		return c.json(result);
	});
}
