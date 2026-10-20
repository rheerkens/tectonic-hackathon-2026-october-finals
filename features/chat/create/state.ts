import type { WorkspaceContext } from "@day-one/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "../shared/contract";
import { conversationsKey } from "../shared/keys";
import { createConversation } from "./client";
export function useCreateConversation(context: WorkspaceContext) {
	const queries = useQueryClient();
	return useMutation({
		mutationFn: (signal: AbortSignal) => createConversation({ ...context, signal }),
		onSuccess: (conversation) =>
			queries.setQueryData<Conversation[]>(conversationsKey(context), (list) => [
				conversation,
				...(list ?? []),
			]),
	});
}
