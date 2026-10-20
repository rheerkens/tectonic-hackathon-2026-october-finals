import { demoUsers } from "@day-one/contracts";
import type { AppDatabase } from "./client";
import { memberships, notes, users, workspaces } from "./schema";
export function seedDatabase(db: AppDatabase) {
	db.transaction((tx) => {
		tx.insert(users).values(demoUsers).onConflictDoNothing().run();
		tx.insert(workspaces)
			.values([
				{ id: "studio", name: "Hackathon studio" },
				{ id: "sandbox", name: "Private sandbox" },
			])
			.onConflictDoNothing()
			.run();
		tx.insert(memberships)
			.values([
				{ workspaceId: "studio", userId: "alex", role: "editor" },
				{ workspaceId: "studio", userId: "sam", role: "viewer" },
				{ workspaceId: "studio", userId: "jordan", role: "owner" },
				{ workspaceId: "sandbox", userId: "casey", role: "owner" },
			])
			.onConflictDoNothing()
			.run();
		tx.insert(notes)
			.values({
				id: "welcome",
				workspaceId: "studio",
				text: "A complete journey beats ten unfinished features.",
				createdBy: "jordan",
				createdAt: "2026-01-01T00:00:00.000Z",
			})
			.onConflictDoNothing()
			.run();
	});
}
