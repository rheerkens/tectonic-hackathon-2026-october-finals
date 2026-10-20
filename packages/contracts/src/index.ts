import { z } from "zod";

// Adapted from Tectonic packages/shared/src/schemas.ts and demo-users.ts.
export const MemberRoleSchema = z.enum(["viewer", "editor", "owner"]);
export type MemberRole = z.infer<typeof MemberRoleSchema>;
const ranks: Record<MemberRole, number> = { viewer: 0, editor: 1, owner: 2 };
export function roleAtLeast(role: MemberRole | null | undefined, required: MemberRole) {
	return role != null && ranks[role] >= ranks[required];
}
export const demoUsers = [
	{ id: "alex", name: "Alex Morgan", email: "alex@example.test", initials: "AM" },
	{ id: "sam", name: "Sam Chen", email: "sam@example.test", initials: "SC" },
	{ id: "jordan", name: "Jordan Lee", email: "jordan@example.test", initials: "JL" },
	{ id: "casey", name: "Casey Park", email: "casey@example.test", initials: "CP" },
];
export const UserSchema = z.object({ id: z.string(), name: z.string(), email: z.string() });
export type User = z.infer<typeof UserSchema>;

// Persisted tool outcomes are shared by the database and chat contracts.
export const ToolCallSchema = z.discriminatedUnion("status", [
	z.object({ id: z.string(), name: z.string(), status: z.literal("running") }),
	z.object({
		id: z.string(),
		name: z.string(),
		status: z.enum(["completed", "failed"]),
		result: z.string(),
	}),
]);
export type ToolCall = z.infer<typeof ToolCallSchema>;

export { AuthModeSchema, readAuthMode } from "./auth";
export type { DraftStore } from "./drafts";
export type { ErrorBody, ErrorCode, FieldErrors } from "./errors";
export { ErrorBodySchema, ErrorCodeSchema, FieldErrorsSchema, validationFields } from "./errors";
export type { WorkspaceScope } from "./keys";
export { inWorkspace, workspaceKey } from "./keys";
