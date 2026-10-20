import { expect, test } from "bun:test";
import { createFeatureFixture, request } from "@day-one/server/testing";
import { mountListNotes } from "../list/server";
import { mountCreateNote } from "./server";

function fixture() {
	return createFeatureFixture((app, db) => {
		mountListNotes(app, db);
		mountCreateNote(app, db);
	});
}
test("real API enforces membership, roles, and validates input", async () => {
	const f = fixture();
	expect((await f.app.request("/api/workspaces/studio/notes")).status).toBe(401);
	expect((await request(f, "/api/workspaces/studio/notes", "sam")).status).toBe(200);
	expect(
		(await request(f, "/api/workspaces/studio/notes", "sam", { text: "forbidden" })).status,
	).toBe(403);
	expect((await request(f, "/api/workspaces/studio/notes", "casey")).status).toBe(403);
	expect((await request(f, "/api/workspaces/studio/notes", "alex", { text: "" })).status).toBe(400);
	// Rejected writes tell nobody; the saved note notifies the workspace once.
	expect(f.published).toEqual([]);
	expect(
		(await request(f, "/api/workspaces/studio/notes", "alex", { text: "Ready to present" })).status,
	).toBe(201);
	expect(f.published).toEqual([
		{
			audience: "workspace",
			workspaceId: "studio",
			actorId: "alex",
			targets: [{ family: "notes" }],
		},
	]);
	f.reopen();
	expect(JSON.stringify(await (await request(f, "/api/workspaces/studio/notes")).json())).toContain(
		"Ready to present",
	);
});
