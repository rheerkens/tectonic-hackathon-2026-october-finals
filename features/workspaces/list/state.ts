import type { ClientContext } from "@day-one/http";
import { useQuery } from "@tanstack/react-query";
import { listWorkspaces } from "./client";
export const useListWorkspaces = (context: ClientContext) =>
	useQuery({
		queryKey: ["workspaces", context.userId],
		queryFn: ({ signal }) => listWorkspaces({ ...context, signal }),
	});
