import { expect, test } from "bun:test";
import { memberships } from "@day-one/db";
import type { Change } from "@day-one/server";
import { createFeatureFixture } from "@day-one/server/testing";
import { and, eq } from "drizzle-orm";
import { createNoteTools } from "./tools.server";

function addNote(f: ReturnType<typeof createFeatureFixture>, published: Change[]) {
	const tool = createNoteTools({
		db: f.db,
		userId: "alex",
		workspaceId: "studio",
		publish: (change) => published.push(change),
	}).find((t) => t.name === "add_note");
	if (!tool) throw new Error("Missing tool");
	return tool;
}

test("tool handler rechecks role after membership revocation", async () => {
	const f = createFeatureFixture(() => {});
	const published: Change[] = [];
	const tool = addNote(f, published);
	f.db
		.delete(memberships)
		.where(and(eq(memberships.userId, "alex"), eq(memberships.workspaceId, "studio")))
		.run();
	await expect(
		tool.execute("id", { text: "denied" }, new AbortController().signal),
	).rejects.toThrow("role");
	expect(published).toEqual([]);
});

test("a tool write notifies the workspace once, like the HTTP route", async () => {
	const f = createFeatureFixture(() => {});
	const published: Change[] = [];
	await addNote(f, published).execute("id", { text: "from chat" }, new AbortController().signal);
	expect(published).toEqual([
		{
			audience: "workspace",
			workspaceId: "studio",
			actorId: "alex",
			targets: [{ family: "notes" }],
		},
	]);
});
