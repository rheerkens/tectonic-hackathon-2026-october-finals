import { type AppDatabase, conversations } from "@day-one/db";
import { AppError, requireWorkspaceAccess } from "@day-one/server";
import { and, eq } from "drizzle-orm";
export function conversationAccess({
	db,
	id,
	userId,
}: {
	db: AppDatabase;
	id: string;
	userId: string;
}) {
	const conversation = db
		.select()
		.from(conversations)
		.where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
		.get();
	if (!conversation) throw new AppError(404, "Conversation not found.");
	requireWorkspaceAccess({
		db,
		workspaceId: conversation.workspaceId,
		userId,
		required: "viewer",
	});
	return conversation;
}
