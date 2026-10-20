import { type ApiClient, inputError } from "@day-one/http";
import { CreateNoteInputSchema, CreateNoteResponseSchema } from "./contract";
export function createNote({
	client,
	workspaceId,
	input,
	signal,
}: {
	client: ApiClient;
	workspaceId: string;
	input: unknown;
	signal?: AbortSignal;
}) {
	const parsed = CreateNoteInputSchema.safeParse(input);
	if (!parsed.success) throw inputError(parsed.error);
	return client.json(
		`/api/workspaces/${encodeURIComponent(workspaceId)}/notes`,
		CreateNoteResponseSchema,
		{ method: "POST", body: JSON.stringify(parsed.data), ...(signal ? { signal } : {}) },
	);
}
