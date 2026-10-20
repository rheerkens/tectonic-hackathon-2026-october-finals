import { type AppDatabase, memberships, workspaces } from "@day-one/db";
import type { ApiEnvironment } from "@day-one/server";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
export function mountListWorkspaces(app: Hono<ApiEnvironment>, db: AppDatabase) {
	app.get("/api/workspaces", (c) =>
		c.json(
			db
				.select({ id: workspaces.id, name: workspaces.name, role: memberships.role })
				.from(workspaces)
				.innerJoin(memberships, eq(workspaces.id, memberships.workspaceId))
				.where(eq(memberships.userId, c.get("user").id))
				.all(),
		),
	);
}
