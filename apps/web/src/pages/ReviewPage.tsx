import { Button } from "@day-one/ui/button";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { useStudioState } from "../state/StudioContext";
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
