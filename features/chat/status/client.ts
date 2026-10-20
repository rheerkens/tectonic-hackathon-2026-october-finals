import type { ApiClient } from "@day-one/http";
import { ChatStatusSchema } from "./contract";
export function getChatStatus({ client, signal }: { client: ApiClient; signal?: AbortSignal }) {
	return client.json("/api/chat/status", ChatStatusSchema, { ...(signal ? { signal } : {}) });
}
