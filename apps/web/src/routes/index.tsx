import { Button } from "@day-one/ui/button";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useWorkspaceDirectory } from "../state/studio";

export const Route = createFileRoute("/")({ component: WorkspaceHome });
function WorkspaceHome() {
	const { listing, session } = useWorkspaceDirectory();
	const workspaces = listing.data ?? [];
	const workspace =
		workspaces.find((item) => item.id === session.drafts.workspace(session.user?.id ?? "")) ??
		workspaces[0];
	if (workspace)
		return <Navigate to="/w/$workspaceId" params={{ workspaceId: workspace.id }} replace />;
	return (
		<main className="loading">
			<h1>{listing.isPending ? "Loading workspaces…" : "No workspace available"}</h1>
			{listing.error && <p role="alert">Could not load your workspaces.</p>}
			<Button onClick={() => void listing.refetch()}>Retry loading</Button>
		</main>
	);
}
