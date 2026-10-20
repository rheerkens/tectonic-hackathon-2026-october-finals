import type { ApiClient } from "@day-one/http";
import { ListConversationsResponseSchema } from "./contract";
export function listConversations({
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
		ListConversationsResponseSchema,
		{ ...(signal ? { signal } : {}) },
	);
}
