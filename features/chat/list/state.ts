import type { WorkspaceContext } from "@day-one/http";
import { useQuery } from "@tanstack/react-query";
import { conversationsKey } from "../shared/keys";
import { listConversations } from "./client";
export const useListConversations = (context: WorkspaceContext) =>
	useQuery({
		queryKey: conversationsKey(context),
		enabled: !!context.workspaceId,
		queryFn: ({ signal }) => listConversations({ ...context, signal }),
	});
