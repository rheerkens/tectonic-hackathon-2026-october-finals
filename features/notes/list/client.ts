import type { ApiClient } from "@day-one/http";
import { ListNotesResponseSchema } from "./contract";
export function listNotes({
	client,
	workspaceId,
	signal,
}: {
	client: ApiClient;
	workspaceId: string;
	signal?: AbortSignal;
}) {
	return client.json(
		`/api/workspaces/${encodeURIComponent(workspaceId)}/notes`,
		ListNotesResponseSchema,
		{ ...(signal ? { signal } : {}) },
	);
}
