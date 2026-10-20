import { expect, test } from "bun:test";
import { notes } from "@day-one/db";
import { createFeatureFixture, request } from "@day-one/server/testing";
import { ListNotesResponseSchema } from "./contract";
import { mountListNotes } from "./server";

test("list is scoped to authorized workspace and capped at 50", async () => {
	const f = createFeatureFixture(mountListNotes);
	f.db
		.insert(notes)
		.values(
			Array.from({ length: 55 }, (_, i) => ({
				id: `bulk-${i}`,
				workspaceId: "studio",
				createdBy: "alex",
				text: `note ${i}`,
				createdAt: new Date(Date.now() + (i + 1) * 1000).toISOString(),
			})),
		)
		.run();
	const result = ListNotesResponseSchema.parse(
		await (await request(f, "/api/workspaces/studio/notes", "sam")).json(),
	);
	expect(result).toHaveLength(50);
	expect(result[0]?.text).toBe("note 54");
	expect((await request(f, "/api/workspaces/studio/notes", "casey")).status).toBe(403);
});
