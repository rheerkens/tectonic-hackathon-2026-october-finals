import type { WorkspaceContext } from "@day-one/http";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { notesKey } from "../shared/keys";
import { listNotes } from "./client";
export const listNotesOptions = (context: WorkspaceContext) =>
	queryOptions({
		queryKey: notesKey(context),
		enabled: !!context.workspaceId,
		queryFn: ({ signal }) => listNotes({ ...context, signal }),
	});
export const useListNotes = (context: WorkspaceContext) => useQuery(listNotesOptions(context));
