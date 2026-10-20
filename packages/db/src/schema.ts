import type { MemberRole, ToolCall } from "@day-one/contracts";
import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull(),
});
export const workspaces = sqliteTable("workspaces", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
});
export const memberships = sqliteTable(
	"memberships",
	{
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["viewer", "editor", "owner"] })
			.$type<MemberRole>()
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);
export const notes = sqliteTable("notes", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	text: text("text").notNull(),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id),
	createdAt: text("created_at").notNull(),
});
export const conversations = sqliteTable("conversations", {
	id: text("id").primaryKey(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	createdAt: text("created_at").notNull(),
});
export const turns = sqliteTable("turns", {
	id: text("id").primaryKey(),
	conversationId: text("conversation_id")
		.notNull()
		.references(() => conversations.id, { onDelete: "cascade" }),
	message: text("message").notNull(),
	reply: text("reply").notNull().default(""),
	status: text("status", { enum: ["pending", "completed", "failed", "interrupted"] }).notNull(),
	tools: text("tools", { mode: "json" }).$type<ToolCall[]>().notNull().default([]),
	createdAt: text("created_at").notNull(),
});
