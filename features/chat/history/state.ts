import type { ClientContext } from "@day-one/http";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { historyKey } from "../shared/keys";
import { getHistory } from "./client";
export const historyOptions = (context: ClientContext & { conversationId: string }) =>
	queryOptions({
		queryKey: historyKey(context),
		enabled: !!context.conversationId,
		queryFn: ({ signal }) => getHistory({ ...context, signal }),
	});
export const useHistory = (context: ClientContext & { conversationId: string }) =>
	useQuery(historyOptions(context));
