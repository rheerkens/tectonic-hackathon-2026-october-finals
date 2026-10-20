import { expect, test } from "bun:test";
import type { Turn } from "../shared/contract";
import { updateLiveTurn } from "./state";

test("stream state replaces tool progress and uses the persisted final turn", () => {
	const initial: Turn = {
		id: "live",
		conversationId: "conversation",
		message: "Save",
		reply: "",
		status: "pending",
		tools: [],
		createdAt: "2026-01-01T00:00:00.000Z",
	};
	const text = updateLiveTurn(initial, { type: "text", text: "Saving" });
	const running = updateLiveTurn(text, {
		type: "tool",
		tool: { id: "tool", name: "add_note", status: "running" },
	});
	const completed = updateLiveTurn(running, {
		type: "tool",
		tool: { id: "tool", name: "add_note", status: "completed", result: "Saved" },
	});
	expect(completed.tools).toHaveLength(1);
	expect(completed.tools[0]?.status).toBe("completed");
	expect(initial.tools).toEqual([]);
	const persisted: Turn = { ...completed, id: "persisted", reply: "Saved.", status: "completed" };
	expect(updateLiveTurn(completed, { type: "done", turn: persisted })).toEqual(persisted);
});
