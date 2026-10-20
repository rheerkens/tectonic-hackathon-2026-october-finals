import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FinnTurn } from "../state/finn";
import { FinnCall } from "./FinnCall";
import { Icon } from "./Icon";

/** Answer text without markdown bold or source markers, for compact previews. */
export const plain = (text: string) => text.replace(/\*\*/g, "").replace(/\s*\[S\d+\]/g, "");

export function FinnAnswer({
	turn,
	inApp,
	onNavigate,
}: {
	turn: FinnTurn;
	inApp: boolean;
	onNavigate?: (() => void) | undefined;
}) {
	const [opening, setOpening] = useState(false);
	const [error, setError] = useState("");
	const result = turn.status === "done" || turn.status === "waiting" ? turn.result : null;
	if (!result) {
		return (
			<div className="mini-result-status" role="status">
				<p>{turn.message || (turn.status === "searching" ? "Checking sources…" : "Thinking…")}</p>
				{turn.message && <p>Try asking about payroll changes or sick leave.</p>}
			</div>
		);
	}
	const sources = result.sources.filter((source) => source.supports);
	const openLabel = (
		<>
			<span>{opening ? "Opening…" : "Open full result"}</span>
			<Icon name="arrow-right" size={14} />
		</>
	);
	return (
		<>
			<p className="mini-result-answer">
				{result.answer
					? plain(result.answer)
					: "I'm not sure yet. I don't have enough confirmed information to answer."}
			</p>
			{result.nextStep.kind === "contact_person" && (
				<>
					<p className="mini-result-waiting">Waiting for {result.nextStep.person}.</p>
					<FinnCall result={result} compact />
				</>
			)}
			<div className="mini-result-meta">
				<span>{Math.round(result.trust.score * 100)}% trust</span>
				{sources.map((source) => (
					<span key={source.code} title={source.title} className="mini-result-source">
						{source.code}
					</span>
				))}
			</div>
			<details className="mini-result-details">
				<summary>
					View details <Icon name="chevron-right" size={16} />
				</summary>
				<div className="mini-result-evidence">
					<ul>
						{result.trust.reasons.slice(0, 2).map((reason) => (
							<li key={reason}>{reason}</li>
						))}
					</ul>
					{sources.map((source) => (
						<p key={source.code}>
							<strong>
								{source.code} · {source.title}
							</strong>
							<br />
							{source.excerpt}
						</p>
					))}
				</div>
				{window.desktop && !inApp ? (
					window.desktop.openResult && (
						<button
							type="button"
							className="mini-result-open"
							disabled={opening}
							onClick={() => {
								setOpening(true);
								setError("");
								void window.desktop
									?.openResult?.(result.id)
									.catch(() => setError("Could not open the result. Try again."))
									.finally(() => setOpening(false));
							}}
						>
							{openLabel}
						</button>
					)
				) : (
					<Link
						className="mini-result-open"
						to="/results/$resultId"
						params={{ resultId: result.id }}
						onClick={onNavigate}
					>
						{openLabel}
					</Link>
				)}
				{error && <p role="alert">{error}</p>}
			</details>
		</>
	);
}
