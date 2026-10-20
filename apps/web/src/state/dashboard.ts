import { errorMessage } from "@day-one/http";
import { useListNotes } from "@day-one/notes/list/state";
import { useStudioState } from "./StudioContext";
export function useDashboard() {
	const { scope, user } = useStudioState();
	const listing = useListNotes(scope);
	return {
		user,
		notes: listing.data ?? [],
		loading: listing.isPending,
		error: listing.error ? errorMessage(listing.error) : "",
		retry: () => void listing.refetch(),
	};
}
