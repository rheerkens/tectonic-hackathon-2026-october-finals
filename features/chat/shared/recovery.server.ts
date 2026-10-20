import { type AppDatabase, turns } from "@day-one/db";
import { eq } from "drizzle-orm";

// Run once at API startup, before accepting requests, for this profile's database.
// Preserve persisted replies and tool outcomes. Never replay an interrupted write.
export function recoverInterruptedChat(db: AppDatabase) {
	db.update(turns).set({ status: "interrupted" }).where(eq(turns.status, "pending")).run();
}
