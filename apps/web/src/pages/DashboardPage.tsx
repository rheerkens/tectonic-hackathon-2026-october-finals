import { Button } from "@day-one/ui/button";
import { Link } from "@tanstack/react-router";
import { Icon, type IconName } from "../components/Icon";
import { useDashboard } from "../state/dashboard";
import { useStudioState } from "../state/StudioContext";

/** Demo results that need a closer look; each opens its FINN result page. */
const attention: {
	resultId: string;
	title: string;
	note: string;
	tone: "coral" | "amber";
	icon: IconName;
	badge?: string;
}[] = [
	{
		resultId: "atlas-meal-vouchers-2027",
		title: "Atlas meal vouchers 2027",
		note: "No confirmed agreement yet",
		tone: "coral",
		icon: "file-text",
		badge: "Low trust",
	},
	{
		resultId: "nl-holiday-pay",
		title: "Holiday pay Netherlands",
		note: "Review the supporting sources",
		tone: "amber",
		icon: "users",
	},
];
export function DashboardPage() {
	const data = useDashboard();
	const { scope } = useStudioState();
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
						{greeting}, <span className="aurora-text">{data.user.name.split(" ")[0]}</span>.
					</h1>
					<p>What would you like to know?</p>
				</div>
			</header>
			<div className="dashboard-stack">
				<section className="card">
					<h2>
						<span className="coral">
							<Icon name="bell" />
						</span>
						Needs your attention
					</h2>
					{attention.map((item) => (
						<Link
							key={item.resultId}
							className="list-row"
							to="/w/$workspaceId/results/$resultId"
							params={{ workspaceId: scope.workspaceId, resultId: item.resultId }}
						>
							<span className={`row-symbol ${item.tone}`}>
								<Icon name={item.icon} />
							</span>
							<span className="row-copy">
								<strong>{item.title}</strong>
								<span>{item.note}</span>
							</span>
							{item.badge && (
								<span className="row-meta">
									<span className="status-badge">{item.badge}</span>
									<small>Example</small>
								</span>
							)}
							<Icon name="chevron-right" size={18} />
						</Link>
					))}
				</section>
				<section className="card">
					<h2>
						<Icon name="clock" />
						Recent notes
					</h2>
					{data.error ? (
						<p role="alert">
							{data.error} <Button onClick={data.retry}>Retry</Button>
						</p>
					) : data.loading ? (
						<p className="card-empty">Loading notes…</p>
					) : data.notes.length ? (
						data.notes.slice(0, 2).map((note) => (
							<Link
								key={note.id}
								className="list-row"
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
			<footer className="dashboard-footer">
				<Icon name="info" size={18} />
				Always check the source before making an important decision.
			</footer>
		</div>
	);
}
