import { createApiClient, errorMessage } from "@day-one/http";
import { useListWorkspaces } from "@day-one/workspaces/list/state";
import { useMemo } from "react";
import { useSession } from "../auth/context";
export function useWorkspaceDirectory() {
	const session = useSession(),
		user = session.user;
	if (!user) throw new Error("Sign-in required.");
	const client = useMemo(
		() => createApiClient({ headers: session.headers, onUnauthorized: session.expire }),
		[session],
	);
	const context = { client, userId: user.id };
	return { session, user, context, listing: useListWorkspaces(context) };
}
/** The last-used workspace, or the first one the user belongs to. */
export function usePreferredWorkspace() {
	const directory = useWorkspaceDirectory();
	const workspaces = directory.listing.data ?? [];
	const lastUsed = directory.session.drafts.workspace(directory.user.id);
	return {
		listing: directory.listing,
		workspace: workspaces.find((item) => item.id === lastUsed) ?? workspaces[0],
	};
}
// The workspace shell resolves membership only. Feature pages compose their own state from `scope`.
export function useStudio(workspaceId: string) {
	const { session, user, context, listing } = useWorkspaceDirectory();
	const workspaces = listing.data ?? [];
	const workspace = workspaces.find((item) => item.id === workspaceId);
	return {
		session,
		user,
		workspace,
		workspaces,
		// A URL selects context; membership data determines which feature requests may run.
		scope: { ...context, workspaceId: workspace?.id ?? "", drafts: session.drafts },
		loading: listing.isPending,
		error: listing.error ? errorMessage(listing.error) : "",
		retry: () => void listing.refetch(),
	};
}
