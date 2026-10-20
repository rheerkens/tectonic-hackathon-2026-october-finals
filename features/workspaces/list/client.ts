import type { ApiClient } from "@day-one/http";
import { ListWorkspacesResponseSchema } from "./contract";
export function listWorkspaces({ client, signal }: { client: ApiClient; signal?: AbortSignal }) {
	return client.json("/api/workspaces", ListWorkspacesResponseSchema, {
		...(signal ? { signal } : {}),
	});
}
