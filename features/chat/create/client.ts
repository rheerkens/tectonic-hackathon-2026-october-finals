import type { ApiClient } from "@day-one/http";
import { CreateConversationResponseSchema } from "./contract";
export function createConversation({
	client,
	workspaceId,
	signal,
}: {
	client: ApiClient;
	workspaceId: string;
	signal?: AbortSignal;
}) {
	return client.json(
		`/api/workspaces/${encodeURIComponent(workspaceId)}/conversations`,
		CreateConversationResponseSchema,
		{ method: "POST", ...(signal ? { signal } : {}) },
	);
}
