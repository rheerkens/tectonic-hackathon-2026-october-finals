import { Button } from "@day-one/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FinnQuestionForm } from "../components/FinnQuestionForm";
import { Icon } from "../components/Icon";
import { useDashboard } from "../state/dashboard";
import { useFinn } from "../state/finn";
import { useStudioState } from "../state/StudioContext";
export function DashboardPage() {
	const data = useDashboard();
	const { scope } = useStudioState();
	const navigate = useNavigate();
	const finn = useFinn();
	const [submitted, setSubmitted] = useState(false);
	const busy = finn.status === "thinking" || finn.status === "searching";
	useEffect(() => {
		if (submitted && !busy && (finn.status === "done" || finn.status === "waiting")) {
			setSubmitted(false);
			if (finn.result)
				void navigate({ to: "/results/$resultId", params: { resultId: finn.result.id } });
		}
	}, [submitted, busy, finn.status, finn.result, navigate]);
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
				<span className="example-badge">Example updates</span>
			</header>
			<FinnQuestionForm
				value={data.question}
				onChange={data.setQuestion}
				error={data.fieldError}
				busy={busy}
				onSubmit={() => {
					if (data.prepareQuestion()) {
						setSubmitted(true);
						void finn.ask(data.question);
					}
				}}
			/>
			<p className="search-hint">
				Demo: ask about payroll changes for Atlas, next month, or sick leave.
			</p>
			{(busy || finn.message) && (
				<p role="status" className="integration-note">
					{busy ? "Finn is looking into your question…" : finn.message}
				</p>
			)}
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
							to="/results/$resultId"
							params={{ resultId: "d1-payroll-changes-november" }}
						>
							<span className="row-symbol coral">
								<Icon name="file-text" />
							</span>
							<span className="row-copy">
								<strong>Atlas payroll for November</strong>
								<span>No confirmed agreement yet</span>
							</span>
							<span className="row-meta">
								<span className="status-badge">Low trust</span>
								<small>Example</small>
							</span>
							<Icon name="chevron-right" size={18} />
						</Link>
						<Link
							className="dashboard-row"
							to="/results/$resultId"
							params={{ resultId: "d2-sick-leave" }}
						>
							<span className="row-symbol amber">
								<Icon name="users" />
							</span>
							<span className="row-copy">
								<strong>Sick leave guidance</strong>
								<span>Review the supporting sources</span>
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
							<p className="card-empty">Loading notes…</p>
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
					<p>Your conversations and notes, in one place.</p>
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
