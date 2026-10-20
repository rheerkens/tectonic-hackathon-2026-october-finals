import { Link } from "@tanstack/react-router";
import { type RefObject, useState } from "react";
import { useFinn } from "../state/finn";
import { Icon } from "./Icon";

/** Finn's compact chat, shared by the desktop mini window and the dock inside SDtrust. */
export function FinnChat({
	inputRef,
	onClose,
	inApp = false,
}: {
	inputRef?: RefObject<HTMLInputElement | null>;
	onClose?: () => void;
	// Inside SDtrust, results open in place instead of asking the shell for the main window.
	inApp?: boolean;
}) {
	const finn = useFinn();
	const [question, setQuestion] = useState("");
	const [openError, setOpenError] = useState("");
	const [opening, setOpening] = useState(false);
	const busy = finn.status === "thinking" || finn.status === "searching";
	const result = !busy ? finn.result : null;
	const sources = result?.sources.filter((source) => source.supports) ?? [];

	async function openResult() {
		if (!result || !window.desktop?.openResult) return;
		setOpening(true);
		setOpenError("");
		try {
			await window.desktop.openResult(result.id);
		} catch {
			setOpenError("Could not open the result. Try again.");
		} finally {
			setOpening(false);
		}
	}

	const openLabel = (
		<>
			<span>
				<strong>{opening ? "Opening…" : "Open full result"}</strong>
				<small>All sources, reasoning and next step</small>
			</span>
			<Icon name="arrow-right" size={18} />
		</>
	);

	return (
		<>
			{busy && (
				<p role="status" className="mini-result mini-result-status">
					{finn.status === "searching" ? "Checking sources…" : "Thinking…"}
				</p>
			)}
			{finn.message && (
				<div role="status" className="mini-result mini-result-status">
					<p>{finn.message}</p>
					<p>Try asking about payroll changes or sick leave.</p>
				</div>
			)}
			{result && (
				<section className="mini-result" aria-label="Finn's answer">
					<p className="mini-result-answer">
						{result.answer
							? result.answer.replace(/\*\*/g, "").replace(/\s*\[S\d+\]/g, "")
							: "I'm not sure yet. I don't have enough confirmed information to answer."}
					</p>
					{result.nextStep.kind === "contact_person" && (
						<p className="mini-result-waiting">
							Waiting for {result.nextStep.person}. Contact is simulated.
						</p>
					)}
					<div className="mini-result-meta">
						<span>{Math.round(result.trust.score * 100)}% trust</span>
						{sources.map((source) => (
							<span key={source.code} title={source.title} className="mini-result-source">
								{source.code}
							</span>
						))}
					</div>
					<details key={result.id} className="mini-result-details">
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
									onClick={() => void openResult()}
								>
									{openLabel}
								</button>
							)
						) : (
							<Link
								className="mini-result-open"
								to="/results/$resultId"
								params={{ resultId: result.id }}
								onClick={onClose}
							>
								{openLabel}
							</Link>
						)}
						{openError && <p role="alert">{openError}</p>}
					</details>
				</section>
			)}
			<form
				className="finn-mini-composer"
				aria-busy={busy}
				onSubmit={(event) => {
					event.preventDefault();
					if (!question.trim() || busy) return;
					setOpenError("");
					void finn.ask(question.trim());
					setQuestion("");
				}}
			>
				{onClose && (
					<button
						type="button"
						className="finn-mini-close"
						aria-label="Close mini chat"
						onClick={onClose}
					>
						<Icon name="x" size={16} />
					</button>
				)}
				<input
					ref={inputRef}
					id={inApp ? "dock-question" : "mini-question"}
					aria-label={result ? "Ask Finn a follow-up" : "Ask Finn a question"}
					placeholder={result ? "Ask a follow-up…" : "Ask Finn anything…"}
					value={question}
					onChange={(event) => setQuestion(event.target.value)}
					autoComplete="off"
				/>
				<button
					type="submit"
					className="finn-mini-send"
					aria-label="Send question"
					disabled={busy || !question.trim()}
				>
					<Icon name="arrow-right" size={18} />
				</button>
			</form>
			<span className="finn-mini-disclaimer">Demo · fixture data</span>
		</>
	);
}
