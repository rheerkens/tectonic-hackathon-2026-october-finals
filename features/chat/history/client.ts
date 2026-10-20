import type { ApiClient } from "@day-one/http";
import { HistoryResponseSchema } from "./contract";
export function getHistory({
	client,
	conversationId,
	signal,
}: {
	client: ApiClient;
	conversationId: string;
	signal?: AbortSignal;
}) {
	return client.json(
		`/api/conversations/${encodeURIComponent(conversationId)}`,
		HistoryResponseSchema,
		{ ...(signal ? { signal } : {}) },
	);
}
