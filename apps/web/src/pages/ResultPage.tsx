import { Button } from "@day-one/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brand } from "../components/Brand";
import { FinnQuestionForm } from "../components/FinnQuestionForm";
import { FinnResultContent } from "../components/FinnResultContent";
import { Icon } from "../components/Icon";
import { getFinnResult, useFinn } from "../state/finn";
import { useTheme } from "../state/ThemeProvider";
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
				<span className="example-badge">Demo · fixture data</span>
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
		</div>
	);
}
