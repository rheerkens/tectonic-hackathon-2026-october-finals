import type { ClientContext } from "@day-one/http";
import { useQuery } from "@tanstack/react-query";
import { getChatStatus } from "./client";
export const useChatStatus = (context: ClientContext) =>
	useQuery({
		queryKey: ["chat-status", context.userId],
		queryFn: ({ signal }) => getChatStatus({ ...context, signal }),
	});
