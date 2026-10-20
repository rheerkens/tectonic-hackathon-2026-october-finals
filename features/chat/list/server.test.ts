import { expect, test } from "bun:test";
import { conversations } from "@day-one/db";
import { createFeatureFixture, request } from "@day-one/server/testing";
import { ListConversationsResponseSchema } from "./contract";
import { mountListConversations } from "./server";

test("list includes only the current user's conversations", async () => {
	const f = createFeatureFixture(mountListConversations);
	f.db
		.insert(conversations)
		.values([
			{
				id: "alex-chat",
				workspaceId: "studio",
				userId: "alex",
				title: "Private",
				createdAt: new Date().toISOString(),
			},
			{
				id: "sam-chat",
				workspaceId: "studio",
				userId: "sam",
				title: "Other",
				createdAt: new Date().toISOString(),
			},
		])
		.run();
	const result = ListConversationsResponseSchema.parse(
		await (await request(f, "/api/workspaces/studio/conversations")).json(),
	);
	expect(result.map((c) => c.id)).toEqual(["alex-chat"]);
});
