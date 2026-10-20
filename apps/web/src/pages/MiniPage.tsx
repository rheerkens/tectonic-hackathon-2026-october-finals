import { Button } from "@day-one/ui/button";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brand } from "../components/Brand";
import { FinnQuestionForm } from "../components/FinnQuestionForm";
import { Icon } from "../components/Icon";
import { openMain } from "../state/desktop";
import { useFinn } from "../state/finn";
export function MiniPage() {
	const finn = useFinn();
	const [question, setQuestion] = useState(""),
		[openError, setOpenError] = useState("");
	const busy = finn.status === "thinking" || finn.status === "searching";
	const result = !busy ? finn.result : null;
	useEffect(() => {
		const close = (event: KeyboardEvent) => {
			if (event.key === "Escape") window.desktop?.hideMini();
		};
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, []);
	return (
		<main className="finn-mini">
			<header>
				<Brand />
				<Button variant="ghost" onClick={() => openMain("/")}>
					Open SDtrust
				</Button>
				<Button
					variant="ghost"
					aria-label="Close mini window"
					onClick={() => window.desktop?.hideMini()}
					disabled={!window.desktop}
				>
					<Icon name="x" size={18} />
				</Button>
			</header>
			<span className="example-badge">Demo · fixture data</span>
			<h1>What would you like to know?</h1>
			<FinnQuestionForm
				id="mini-question"
				value={question}
				onChange={setQuestion}
				busy={busy}
				onSubmit={() => {
					setOpenError("");
					void finn.ask(question);
				}}
			/>
			{busy && (
				<p role="status" className="mini-status">
					Finn is looking into your question…
				</p>
			)}
			{finn.message && <p role="status">{finn.message}</p>}
			{result && (
				<section className="mini-result">
					<h2>{result.answer ? "Your result is ready" : "I’m not sure yet"}</h2>
					{result.answer && <p>{result.answer.replace(/\*\*/g, "").replace(/\[S\d+\]/g, "")}</p>}
					<p>
						{Math.round(result.trust.score * 100)}% trust · {result.sources.length} sources
					</p>
					{result.nextStep.kind === "contact_person" && (
						<p>Waiting for {result.nextStep.person}. Contact is simulated.</p>
					)}
					{window.desktop ? (
						window.desktop.openResult && (
							<Button
								variant="primary"
								onClick={() => {
									void window.desktop
										?.openResult?.(result.id)
										.catch(() => setOpenError("Could not open the result. Try again."));
								}}
							>
								Open full result <Icon name="arrow-right" size={18} />
							</Button>
						)
					) : (
						<Link to="/results/$resultId" params={{ resultId: result.id }}>
							Open full result
						</Link>
					)}
					{openError && <p role="alert">{openError}</p>}
				</section>
			)}
			<p className="integration-note">
				Try a question about payroll changes or sick leave. This preview uses shared demo scenarios.
			</p>
		</main>
	);
}
