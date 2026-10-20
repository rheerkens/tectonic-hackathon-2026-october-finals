import { expect, test } from "bun:test";
import { createFeatureFixture, request } from "@day-one/server/testing";
import { CreateConversationResponseSchema } from "./contract";
import { mountCreateConversation } from "./server";

test("create records the authenticated user and enforces membership", async () => {
	const f = createFeatureFixture(mountCreateConversation);
	const response = await request(f, "/api/workspaces/studio/conversations", "sam", {});
	expect(response.status).toBe(201);
	expect(CreateConversationResponseSchema.parse(await response.json())).toMatchObject({
		userId: "sam",
		workspaceId: "studio",
	});
	expect((await request(f, "/api/workspaces/studio/conversations", "casey", {})).status).toBe(403);
	// Conversations are private: only the creator's own tabs hear about them.
	expect(f.published).toEqual([
		{
			audience: "user",
			userId: "sam",
			workspaceId: "studio",
			actorId: "sam",
			targets: [{ family: "conversations" }],
		},
	]);
});
