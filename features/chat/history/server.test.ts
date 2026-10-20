import { expect, test } from "bun:test";
import { conversations, turns } from "@day-one/db";
import { createFeatureFixture, request } from "@day-one/server/testing";
import { HistoryResponseSchema } from "./contract";
import { mountHistory } from "./server";

test("history remains private and returns persisted turns in order", async () => {
	const f = createFeatureFixture(mountHistory);
	f.db
		.insert(conversations)
		.values({
			id: "private",
			workspaceId: "studio",
			userId: "alex",
			title: "Private",
			createdAt: new Date().toISOString(),
		})
		.run();
	f.db
		.insert(turns)
		.values({
			id: "turn",
			conversationId: "private",
			message: "Hello",
			reply: "Hi",
			status: "completed",
			tools: [],
			createdAt: new Date().toISOString(),
		})
		.run();
	expect((await request(f, "/api/conversations/private", "sam")).status).toBe(404);
	const result = HistoryResponseSchema.parse(
		await (await request(f, "/api/conversations/private")).json(),
	);
	expect(result.turns[0]?.reply).toBe("Hi");
});
