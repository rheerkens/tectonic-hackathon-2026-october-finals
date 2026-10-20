import { demoUsers } from "@day-one/contracts";
import { Button } from "@day-one/ui/button";
import { SelectField } from "@day-one/ui/field";
import { LoadingState } from "@day-one/ui/states";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Presence } from "../components/Presence";
import { UserMenu } from "../components/UserMenu";
import { useLiveWorkspace } from "../state/realtime";
import { StudioContext } from "../state/StudioContext";
import { useStudio } from "../state/studio";

export function StudioPage(props: { workspaceId: string; view: "notes" | "chat" }) {
	const studio = useStudio(props.workspaceId);
	const { session, user, workspace, workspaces } = studio;
	const navigate = useNavigate();
	const workspaceId = props.workspaceId;
	// Follow the workspace only after membership is confirmed, so a bad URL never opens a room.
	const live = useLiveWorkspace(workspace ? workspaceId : "");
	return (
		<StudioContext.Provider value={studio}>
			<div className="studio">
				<header className="workspace-header">
					<div className="header-inner">
						<Link className="wordmark" to="/">
							day one
							<span className="brand-dot" />
						</Link>
						<SelectField
							id="workspace"
							label="Workspace"
							hideLabel
							value={workspace ? workspaceId : ""}
							disabled={studio.loading}
							onChange={(event) => {
								const id = event.target.value;
								session.drafts.select(user.id, id);
								void navigate({
									to: props.view === "notes" ? "/w/$workspaceId/notes" : "/w/$workspaceId/chat",
									params: { workspaceId: id },
								});
							}}
						>
							{!workspace && <option value="">Choose a workspace</option>}
							{workspaces.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
						</SelectField>
						<UserMenu
							user={user}
							role={workspace?.role ?? "Member"}
							{...(session.mode === "dev"
								? {
										switchUsers: demoUsers,
										onSwitch: (id: string) => {
											void navigate({ to: "/" });
											session.signIn(id);
										},
									}
								: {})}
							onSignOut={() => {
								session.signOut();
								void navigate({ to: "/" });
							}}
						/>
					</div>
				</header>
				<main className="main" id="main-content">
					<div className="workspace-topbar">
						<p className="breadcrumb">
							<span className="workspace-mark" aria-hidden="true">
								{(workspace?.name ?? "W").charAt(0)}
							</span>
							{workspace?.name ?? "Workspace"}
						</p>
						{workspace && (
							<Presence
								users={live.users.filter((other) => other.userId !== user.id)}
								status={live.status}
							/>
						)}
						<nav className="workspace-nav" aria-label="Workspace pages">
							<Link
								to="/w/$workspaceId/notes"
								params={{ workspaceId }}
								activeOptions={{ exact: true }}
							>
								Notes
							</Link>
							<Link
								to="/w/$workspaceId/chat"
								params={{ workspaceId }}
								activeOptions={{ exact: false }}
							>
								Chat
							</Link>
						</nav>
					</div>
					<div className="content">
						{studio.error && (
							<p role="alert" className="error">
								<span>{studio.error}</span>
								<Button variant="ghost" onClick={studio.retry}>
									Retry loading
								</Button>
							</p>
						)}
						{studio.loading ? (
							<LoadingState label="Loading workspace…" />
						) : !workspace ? (
							<section className="unavailable">
								<h1>Workspace unavailable</h1>
								<p className="muted">Choose a workspace you belong to.</p>
								<Link to="/">Choose a workspace</Link>
							</section>
						) : (
							<Outlet />
						)}
					</div>
				</main>
			</div>
		</StudioContext.Provider>
	);
}
