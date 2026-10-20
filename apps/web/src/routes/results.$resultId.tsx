import { createFileRoute, Navigate } from "@tanstack/react-router";
import { usePreferredWorkspace } from "../state/studio";
// Old links and the desktop shell open `/results/<id>`; show it inside the last-used workspace.
export const Route = createFileRoute("/results/$resultId")({ component: ResultRedirect });
function ResultRedirect() {
	const { resultId } = Route.useParams();
	const { listing, workspace } = usePreferredWorkspace();
	if (workspace)
		return (
			<Navigate
				to="/w/$workspaceId/results/$resultId"
				params={{ workspaceId: workspace.id, resultId }}
				replace
			/>
		);
	return (
		<main className="loading">
			<h1>{listing.isPending ? "Loading workspace…" : "No workspace available"}</h1>
		</main>
	);
}
