import { type WorkspaceScope, workspaceKey } from "@day-one/contracts";
// Realtime change targets name these families so the owner's other tabs refetch the same keys.
export const conversationsFamily = "conversations";
export const historyFamily = "history";
export const conversationsKey = (scope: WorkspaceScope) => workspaceKey(conversationsFamily, scope);
export const historyKey = ({
	userId,
	conversationId,
}: {
	userId: string;
	conversationId: string;
}) => [historyFamily, userId, conversationId] as const;
