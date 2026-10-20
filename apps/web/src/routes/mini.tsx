import { LoadingState } from "@day-one/ui/states";
import { createFileRoute } from "@tanstack/react-router";
import { MiniPage } from "../pages/MiniPage";
import { useWorkspaceDirectory } from "../state/studio";

// The desktop mini chat window uses the selected workspace, or the first one.
export const Route = createFileRoute("/mini")({ component: MiniRoute });
function MiniRoute() {
	const { listing, session } = useWorkspaceDirectory();
	const workspaces = listing.data ?? [];
	const workspace =
		workspaces.find((item) => item.id === session.drafts.workspace(session.user?.id ?? "")) ??
		workspaces[0];
	if (workspace) return <MiniPage workspaceId={workspace.id} />;
	return listing.isPending ? (
		<LoadingState label="Loading workspace…" />
	) : (
		<main className="loading">
			<h1>No workspace available</h1>
			{listing.error && <p role="alert">Could not load your workspaces.</p>}
		</main>
	);
}
