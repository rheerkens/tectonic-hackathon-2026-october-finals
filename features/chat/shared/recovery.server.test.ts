import { expect, test } from "bun:test";
import { notes, turns } from "@day-one/db";
import { ConversationSchema } from "./contract";
import { recoverInterruptedChat } from "./recovery.server";
import { fixture, request } from "./test-fixture";

test("explicit restart recovery changes only pending status and never replays writes", async () => {
	let runs = 0;
	const f = fixture(async () => {
		runs++;
		return { reply: "Must not run during recovery" };
	});
	const conversation = ConversationSchema.parse(
		await (await request(f, "/api/workspaces/studio/conversations", "alex", {})).json(),
	);
	for (const status of ["pending", "completed", "failed", "interrupted"] as const) {
		f.db
			.insert(turns)
			.values({
				id: status,
				conversationId: conversation.id,
				message: "Save",
				status,
				reply: "Persisted reply",
				createdAt: new Date().toISOString(),
				tools: [{ id: "write", name: "add_note", status: "completed", result: "saved" }],
			})
			.run();
	}
	const before = f.db.select().from(turns).orderBy(turns.id).all();
	const notesBefore = f.db.select().from(notes).all();
	f.reopen();
	// Reopening SQLite and mounting handlers are not permission to run recovery.
	expect(f.db.select().from(turns).orderBy(turns.id).all()).toEqual(before);
	recoverInterruptedChat(f.db);
	expect(f.db.select().from(turns).orderBy(turns.id).all()).toEqual(
		before.map((turn) => (turn.status === "pending" ? { ...turn, status: "interrupted" } : turn)),
	);
	const recovered = f.db.select().from(turns).orderBy(turns.id).all();
	recoverInterruptedChat(f.db);
	expect(f.db.select().from(turns).orderBy(turns.id).all()).toEqual(recovered);
	expect(f.db.select().from(notes).all()).toEqual(notesBefore);
	expect(runs).toBe(0);
});
