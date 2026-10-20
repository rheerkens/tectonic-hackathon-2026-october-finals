import { roleAtLeast } from "@day-one/contracts";
import { errorMessage } from "@day-one/http";
import { useCreateNote } from "@day-one/notes/create/state";
import { useListNotes } from "@day-one/notes/list/state";
import { useStudioState } from "./StudioContext";
export function useNotes() {
	const { scope, workspace } = useStudioState();
	const list = useListNotes(scope),
		creating = useCreateNote(scope);
	return {
		notes: list.data ?? [],
		creating,
		canWrite: !!workspace && roleAtLeast(workspace.role, "editor"),
		error: list.error ? errorMessage(list.error) : "",
		retry: () => void list.refetch(),
	};
}
