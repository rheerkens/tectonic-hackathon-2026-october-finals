import { demoUsers } from "@day-one/contracts";
import { Button } from "@day-one/ui/button";
import { SelectField } from "@day-one/ui/field";
import { LoadingState } from "@day-one/ui/states";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { Presence } from "../components/Presence";
import { UserMenu } from "../components/UserMenu";
import { useLiveWorkspace } from "../state/realtime";
import { StudioContext } from "../state/StudioContext";
import { useStudio } from "../state/studio";
import { useTheme } from "../state/ThemeProvider";

const navigation = [
	{ id: "overview", label: "Overview", to: "/w/$workspaceId", icon: "house" },
	{ id: "chat", label: "Knowledge", to: "/w/$workspaceId/chat", icon: "search" },
	{ id: "sources", label: "Sources", to: "/w/$workspaceId/sources", icon: "database" },
	{ id: "experts", label: "Experts", to: "/w/$workspaceId/experts", icon: "users" },
	{ id: "notes", label: "Notes", to: "/w/$workspaceId/notes", icon: "file-text" },
] as const;
export type DesktopView = (typeof navigation)[number]["id"] | "settings" | "review";
export function StudioPage({ workspaceId, view }: { workspaceId: string; view: DesktopView }) {
	const studio = useStudio(workspaceId);
	const { session, user, workspace, workspaces } = studio;
	const navigate = useNavigate();
	const live = useLiveWorkspace(workspace ? workspaceId : "");
	const theme = useTheme();
	return (
		<StudioContext.Provider value={studio}>
			<div className="studio desktop-studio">
				<a className="skip-link" href="#main-content">
					Skip to content
				</a>
				<aside className="desktop-sidebar">
					<Link className="desktop-brand" to="/w/$workspaceId" params={{ workspaceId }}>
						<Brand />
					</Link>
					<nav className="desktop-nav" aria-label="Main navigation">
						{navigation.map((item) => (
							<Link
								key={item.id}
								to={item.to}
								params={{ workspaceId }}
								className={
									view === item.id || (view === "review" && item.id === "overview")
										? "selected"
										: ""
								}
							>
								<Icon name={item.icon} />
								<span>{item.label}</span>
							</Link>
						))}
					</nav>
					<div className="sidebar-bottom">
						<Link
							className={view === "settings" ? "sidebar-settings selected" : "sidebar-settings"}
							to="/w/$workspaceId/settings"
							params={{ workspaceId }}
						>
							<Icon name="settings" />
							<span>Settings</span>
						</Link>
						<Button
							className="sidebar-theme"
							variant="ghost"
							onClick={() =>
								theme.setPreference(
									document.documentElement.dataset.theme === "dark" ? "light" : "dark",
								)
							}
						>
							<Icon name="sun" />
							<span>Switch theme</span>
						</Button>
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
				</aside>
				<main className="desktop-main" id="main-content">
					<div className="desktop-toolbar">
						<SelectField
							id="workspace"
							label="Workspace"
							hideLabel
							value={workspace ? workspaceId : ""}
							disabled={studio.loading}
							onChange={(event) => {
								const id = event.target.value;
								session.drafts.select(user.id, id);
								void navigate({ to: "/w/$workspaceId", params: { workspaceId: id } });
							}}
						>
							{!workspace && <option value="">Choose a workspace</option>}
							{workspaces.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
						</SelectField>
						{workspace && (
							<Presence
								users={live.users.filter((other) => other.userId !== user.id)}
								status={live.status}
							/>
						)}
					</div>
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
				</main>
			</div>
		</StudioContext.Provider>
	);
}
