import { type AppDatabase, notes } from "@day-one/db";
import { type ApiEnvironment, requireWorkspaceAccess, type WriteContext } from "@day-one/server";
import type { Hono } from "hono";
import { notesFamily } from "../shared/keys";
import { CreateNoteInputSchema } from "./contract";
// HTTP and chat tools share this function, so both notify open browsers exactly once.
export function createNote(context: WriteContext, value: unknown) {
	requireWorkspaceAccess({ ...context, required: "editor" });
	const input = CreateNoteInputSchema.parse(value);
	const note = {
		id: crypto.randomUUID(),
		workspaceId: context.workspaceId,
		text: input.text,
		createdBy: context.userId,
		createdAt: new Date().toISOString(),
	};
	context.db.insert(notes).values(note).run();
	context.publish({
		audience: "workspace",
		workspaceId: context.workspaceId,
		actorId: context.userId,
		targets: [{ family: notesFamily }],
	});
	return note;
}
export function mountCreateNote(app: Hono<ApiEnvironment>, db: AppDatabase) {
	app.post("/api/workspaces/:id/notes", async (c) => {
		const result = createNote(
			{
				db,
				workspaceId: c.req.param("id"),
				userId: c.get("user").id,
				publish: c.get("publish"),
			},
			await c.req.json(),
		);
		c.set("workspaceId", result.workspaceId);
		return c.json(result, 201);
	});
}
