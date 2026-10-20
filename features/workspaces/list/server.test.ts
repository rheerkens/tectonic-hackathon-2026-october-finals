import { expect, test } from "bun:test";
import { createFeatureFixture, request } from "@day-one/server/testing";
import { ListWorkspacesResponseSchema } from "./contract";
import { mountListWorkspaces } from "./server";

test("workspace list exposes only memberships for the current user", async () => {
	const f = createFeatureFixture(mountListWorkspaces);
	const result = ListWorkspacesResponseSchema.parse(
		await (await request(f, "/api/workspaces", "casey")).json(),
	);
	expect(result.map((w) => w.id)).toEqual(["sandbox"]);
});
