import { demoUsers } from "@day-one/contracts";
import { Button } from "@day-one/ui/button";
import { LoadingState } from "@day-one/ui/states";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Brand } from "../components/Brand";
import { FinnDock } from "../components/FinnDock";
import { Icon } from "../components/Icon";
import { UserMenu } from "../components/UserMenu";
import { StudioContext } from "../state/StudioContext";
import { useStudio } from "../state/studio";

export type DesktopView = "overview" | "settings";
export function StudioPage({ workspaceId, view }: { workspaceId: string; view: DesktopView }) {
	const studio = useStudio(workspaceId);
	const { session, user, workspace } = studio;
	const navigate = useNavigate();
	return (
		<StudioContext.Provider value={studio}>
			<div className="studio desktop-studio">
				<a className="skip-link" href="#main-content">
					Skip to content
				</a>
				<aside className="desktop-sidebar">
					<span className="aurora-blob aurora-blob-a" aria-hidden="true" />
					<span className="aurora-blob aurora-blob-b" aria-hidden="true" />
					<span className="aurora-blob aurora-blob-c" aria-hidden="true" />
					<div className="sidebar-glass">
						<Link className="desktop-brand" to="/w/$workspaceId" params={{ workspaceId }}>
							<Brand />
						</Link>
						<nav className="desktop-nav" aria-label="Main navigation">
							<Link
								to="/w/$workspaceId"
								params={{ workspaceId }}
								className={view === "overview" ? "selected" : ""}
							>
								<span className="nav-icon">
									<Icon name="house" size={18} />
								</span>
								<span>Overview</span>
								<span className="nav-dot" aria-hidden="true" />
							</Link>
						</nav>
						<div className="sidebar-bottom">
							<Link
								className={view === "settings" ? "sidebar-settings selected" : "sidebar-settings"}
								to="/w/$workspaceId/settings"
								params={{ workspaceId }}
							>
								<span className="nav-icon">
									<Icon name="settings" size={18} />
								</span>
								<span>Settings</span>
								<span className="nav-dot" aria-hidden="true" />
							</Link>
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
					</div>
				</aside>
				<main className="desktop-main" id="main-content">
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
				<FinnDock />
			</div>
		</StudioContext.Provider>
	);
}
