import { Button } from "@day-one/ui/button";
import { TextField } from "@day-one/ui/field";
import { Link, useNavigate } from "@tanstack/react-router";
import { Icon } from "../components/Icon";
import { useDashboard } from "../state/dashboard";
import { useStudioState } from "../state/StudioContext";
export function DashboardPage() {
	const data = useDashboard();
	const { scope } = useStudioState();
	const navigate = useNavigate();
	const hour = new Date().getHours();
	const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
	return (
		<div className="dashboard">
			<header className="dashboard-heading">
				<div>
					<p className="today">
						{new Intl.DateTimeFormat("en-GB", {
							weekday: "long",
							day: "numeric",
							month: "long",
							year: "numeric",
						}).format(new Date())}
					</p>
					<h1>
						{greeting}, {data.user.name.split(" ")[0]}.
					</h1>
					<p>What would you like to know?</p>
				</div>
				<span className="example-badge">Example updates</span>
			</header>
			<form
				className="dashboard-search"
				onSubmit={(e) => {
					e.preventDefault();
					if (data.prepareQuestion())
						void navigate({
							to: "/w/$workspaceId/chat",
							params: { workspaceId: scope.workspaceId },
						});
				}}
			>
				<Icon name="search" size={28} />
				<TextField
					id="knowledge-question"
					label="Ask a question about your organisation"
					hideLabel
					placeholder="Ask a question about your organisation"
					value={data.question}
					onChange={(e) => data.setQuestion(e.target.value)}
					error={data.fieldError}
				/>
				<Button type="submit" variant="primary">
					Find an answer <Icon name="arrow-right" size={18} />
				</Button>
			</form>
			<p className="search-hint">Your question opens in a new conversation, ready to send.</p>
			<div className="dashboard-grid">
				<div className="dashboard-stack">
					<section className="dashboard-card">
						<h2>
							<span className="coral">
								<Icon name="bell" />
							</span>
							Needs your attention
						</h2>
						<Link
							className="dashboard-row"
							to="/w/$workspaceId/review"
							params={{ workspaceId: scope.workspaceId }}
						>
							<span className="row-symbol coral">
								<Icon name="file-text" />
							</span>
							<span className="row-copy">
								<strong>Atlas onboarding</strong>
								<span>Responsibility has changed</span>
							</span>
							<span className="row-meta">
								<span className="status-badge">To confirm</span>
								<small>Example</small>
							</span>
							<Icon name="chevron-right" size={18} />
						</Link>
						<Link
							className="dashboard-row"
							to="/w/$workspaceId/sources"
							params={{ workspaceId: scope.workspaceId }}
						>
							<span className="row-symbol amber">
								<Icon name="users" />
							</span>
							<span className="row-copy">
								<strong>Payroll changes guide</strong>
								<span>New version available</span>
							</span>
							<Icon name="chevron-right" size={18} />
						</Link>
					</section>
					<section className="dashboard-card">
						<h2>
							<Icon name="clock" />
							Recent notes
						</h2>
						{data.error ? (
							<p role="alert">
								{data.error} <Button onClick={data.retry}>Retry</Button>
							</p>
						) : data.loading ? (
							<p className="card-empty">Notities laden…</p>
						) : data.notes.length ? (
							data.notes.slice(0, 2).map((note) => (
								<Link
									key={note.id}
									className="dashboard-row"
									to="/w/$workspaceId/notes"
									params={{ workspaceId: scope.workspaceId }}
								>
									<span className="row-symbol blue">
										<Icon name="file-text" />
									</span>
									<span className="row-copy">
										<strong>{note.text.split("\n")[0]}</strong>
										<span>Note in this workspace</span>
									</span>
									<small className="note-date">
										{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
											new Date(note.createdAt),
										)}
									</small>
									<Icon name="chevron-right" size={18} />
								</Link>
							))
						) : (
							<div className="card-empty">
								<p>No notes in this workspace yet.</p>
								<Link to="/w/$workspaceId/notes" params={{ workspaceId: scope.workspaceId }}>
									Open notes
								</Link>
							</div>
						)}
					</section>
				</div>
				<aside className="dashboard-card continue-card">
					<span className="row-symbol warm">
						<Icon name="folder" size={26} />
					</span>
					<h2>Pick up where you left off</h2>
					<p>Je gesprekken en notities op één plek.</p>
					<Link to="/w/$workspaceId/chat" params={{ workspaceId: scope.workspaceId }}>
						<Icon name="search" />
						<span>Open conversations</span>
						<Icon name="chevron-right" size={18} />
					</Link>
					<Link to="/w/$workspaceId/notes" params={{ workspaceId: scope.workspaceId }}>
						<Icon name="file-text" />
						<span>Open notes</span>
						<Icon name="chevron-right" size={18} />
					</Link>
				</aside>
			</div>
			<footer className="dashboard-footer">
				<Icon name="info" size={18} />
				Always check the source before making an important decision.
			</footer>
		</div>
	);
}
