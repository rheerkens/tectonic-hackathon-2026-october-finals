import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/w/$workspaceId/")({ component: WorkspaceIndex });
function WorkspaceIndex() {
	const { workspaceId } = Route.useParams();
	return <Navigate to="/w/$workspaceId/notes" params={{ workspaceId }} replace />;
}
