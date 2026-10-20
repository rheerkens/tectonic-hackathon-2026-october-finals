import { Link } from "@tanstack/react-router";
import { FinnDock, type FinnHint } from "../components/FinnDock";
import { FinnResultContent } from "../components/FinnResultContent";
import { useFinnResult } from "../state/finn";
import type { FinnResult } from "../state/finn-scenarios";

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
			text: `I'm not sure about this one. Let me call ${result.nextStep.person} to confirm.`,
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
	const result = useFinnResult(resultId);
	return (
		<>
			<div className="result-page">
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
					</>
				) : (
					<section className="unavailable">
						<h1>Result not found</h1>
						<p>This demo result is not available.</p>
						<Link to="/">Back to overview</Link>
					</section>
				)}
			</div>
			<FinnDock hint={result && resultHint(result)} />
		</>
	);
}
