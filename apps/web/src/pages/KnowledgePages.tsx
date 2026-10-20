import { Button } from "@day-one/ui/button";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { useDashboard } from "../state/dashboard";
import { useStudioState } from "../state/StudioContext";
export function SourcesPage() {
	const data = useDashboard();
	const { scope } = useStudioState();
	return (
		<div>
			<header className="desktop-page-heading">
				<h1>Sources</h1>
				<p>The workspace notes available to your assistant.</p>
			</header>
			<section className="dashboard-card">
				<h2>
					<Icon name="file-text" />
					Workspace notes
				</h2>
				{data.error ? (
					<p role="alert" className="card-empty">
						{data.error} <Button onClick={data.retry}>Retry</Button>
					</p>
				) : data.loading ? (
					<p className="card-empty">Loading sources…</p>
				) : data.notes.length ? (
					data.notes.map((note) => (
						<article key={note.id} className="source-note">
							<p>{note.text}</p>
							<small>{new Date(note.createdAt).toLocaleDateString("en-GB")}</small>
						</article>
					))
				) : (
					<p className="card-empty">
						No notes yet. Add a note to give your assistant some context.
					</p>
				)}
				<Link
					className="text-link"
					to="/w/$workspaceId/notes"
					params={{ workspaceId: scope.workspaceId }}
				>
					Manage notes <Icon name="arrow-right" size={18} />
				</Link>
			</section>
			<p className="integration-note">
				Teams, email and CRM sources will appear here when their shared feature is connected.
			</p>
		</div>
	);
}
export function ExpertsPage() {
	const [expanded, setExpanded] = useState(false);
	return (
		<div>
			<header className="desktop-page-heading">
				<h1>Experts</h1>
				<p>Find the people behind your organisation’s knowledge.</p>
				<span className="example-badge">Example profile</span>
			</header>
			<section className="dashboard-card expert-card">
				<span className="expert-avatar">NP</span>
				<div>
					<h2>Noor Peeters</h2>
					<p>Process expert · Atlas onboarding</p>
					<Button variant="ghost" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
						{expanded ? "Hide example profile" : "View example profile"}
					</Button>
					{expanded && (
						<p className="integration-note">
							Noor is a fictional person in this design example. Expert matching and contacting a
							colleague are not connected yet.
						</p>
					)}
				</div>
			</section>
		</div>
	);
}
export function ReviewPage() {
	const [confirmed, setConfirmed] = useState(false);
	const { scope } = useStudioState();
	return (
		<div>
			<header className="desktop-page-heading">
				<Link to="/w/$workspaceId" params={{ workspaceId: scope.workspaceId }}>
					Overview
				</Link>
				<h1>Is this still how it works?</h1>
				<p>One change needs a closer look.</p>
				<span className="example-badge">Interactive example · nothing is saved</span>
			</header>
			<section className="dashboard-card review-card">
				<div className="review-columns">
					<div>
						<p className="review-label">Previously confirmed</p>
						<h2>Team HR</h2>
						<p>
							Prepares the documents, sends the welcome email and requests access to the systems.
						</p>
					</div>
					<div>
						<p className="review-label amber">New signal</p>
						<h2>Team Operations</h2>
						<p>
							The same responsibilities move to Team Operations, according to the example team note.
						</p>
					</div>
				</div>
				<details className="source-note">
					<summary>Read the example source</summary>
					<p>
						Atlas team note, 20 October 2026: Team Operations will take over the onboarding
						checklist from Team HR.
					</p>
				</details>
				<div className="review-actions">
					<Button variant="primary" disabled={confirmed} onClick={() => setConfirmed(true)}>
						<Icon name="check" size={18} />
						{confirmed ? "Example confirmed" : "Confirm example"}
					</Button>
					<Link to="/w/$workspaceId/experts" params={{ workspaceId: scope.workspaceId }}>
						Find an expert
					</Link>
				</div>
				{confirmed && (
					<p role="status" className="integration-note">
						You confirmed the example. No organisation data was changed.
					</p>
				)}
			</section>
		</div>
	);
}
