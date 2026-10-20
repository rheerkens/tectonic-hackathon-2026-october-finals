import { Button } from "@day-one/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brand } from "../components/Brand";
import { FinnDock, type FinnHint } from "../components/FinnDock";
import { FinnQuestionForm } from "../components/FinnQuestionForm";
import { FinnResultContent } from "../components/FinnResultContent";
import { Icon } from "../components/Icon";
import { getFinnResult, useFinn } from "../state/finn";
import type { FinnResult } from "../state/finn-scenarios";
import { useTheme } from "../state/ThemeProvider";

// Same 80% line the answer card uses to call an answer confirmed.
function resultHint(result: FinnResult): FinnHint {
	const key = `result-${result.id}`;
	if (result.answer && result.trust.score >= 0.8) {
		const count = result.sources.filter((source) => source.supports).length;
		return {
			key,
			mood: "jumping",
			text: `Confirmed by ${count} ${count === 1 ? "source" : "sources"}. You can rely on this one.`,
		};
	}
	if (result.nextStep.kind === "contact_person")
		return {
			key,
			mood: "review",
			text: `I'm not sure about this one. I've asked ${result.nextStep.person} to confirm.`,
			target: "next-step",
		};
	if (result.nextStep.kind === "clarify")
		return {
			key,
			mood: "review",
			text: "I need one more detail before I can be sure.",
			target: "next-step",
		};
	return { key, mood: "review", text: "Trust is low here. Check the sources before you act." };
}
export function ResultPage({ resultId }: { resultId: string }) {
	const result = getFinnResult(resultId);
	const finn = useFinn(),
		theme = useTheme(),
		navigate = useNavigate();
	const [question, setQuestion] = useState(""),
		[submitted, setSubmitted] = useState(false);
	const busy = finn.status === "thinking" || finn.status === "searching";
	useEffect(() => {
		if (submitted && !busy && (finn.status === "done" || finn.status === "waiting")) {
			setSubmitted(false);
			if (finn.result)
				void navigate({ to: "/results/$resultId", params: { resultId: finn.result.id } });
		}
	}, [submitted, busy, finn.status, finn.result, navigate]);
	return (
		<div className="fixture-result">
			<header className="result-topbar">
				<Link to="/">
					<Brand />
				</Link>
				<Button
					variant="ghost"
					onClick={() =>
						theme.setPreference(
							document.documentElement.dataset.theme === "dark" ? "light" : "dark",
						)
					}
				>
					<Icon name="sun" />
					Switch theme
				</Button>
			</header>
			<main className="result-page">
				{result ? (
					<>
						<header className="desktop-page-heading">
							<Link to="/">Back to overview</Link>
							<h1>{result.question}</h1>
							<p>
								{result.context.country === "BE" ? "Belgium" : "Netherlands"} ·{" "}
								{result.context.client ?? "All clients"} ·{" "}
								{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
									new Date(`${result.context.period}-01T12:00:00`),
								)}
							</p>
						</header>
						<FinnResultContent result={result} />
						<section className="result-followup">
							<h2>Ask a follow up</h2>
							<FinnQuestionForm
								id="followup-question"
								value={question}
								onChange={setQuestion}
								busy={busy}
								onSubmit={() => {
									setSubmitted(true);
									void finn.ask(question);
								}}
							/>
							{finn.message && (
								<p role="status" className="integration-note">
									{finn.message}
								</p>
							)}
						</section>
					</>
				) : (
					<section className="unavailable">
						<h1>Result not found</h1>
						<p>This demo result is not available.</p>
						<Link to="/">Back to overview</Link>
					</section>
				)}
			</main>
			<FinnDock hint={result && resultHint(result)} />
		</div>
	);
}
