import { createFileRoute, useMatchRoute } from "@tanstack/react-router";
import { StudioPage } from "../pages/StudioPage";

export const Route = createFileRoute("/w/$workspaceId")({ component: WorkspaceRoute });
function WorkspaceRoute() {
	const { workspaceId } = Route.useParams();
	const match = useMatchRoute();
	return (
		<StudioPage
			key={workspaceId}
			workspaceId={workspaceId}
			view={
				match({ to: "/w/$workspaceId/settings" })
					? "settings"
					: match({ to: "/w/$workspaceId/experts" })
						? "experts"
						: "overview"
			}
		/>
	);
}
