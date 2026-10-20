import ReactMarkdown from "react-markdown";
import type { FinnResult } from "../state/finn-scenarios";
import { Icon } from "./Icon";
export function FinnResultContent({ result }: { result: FinnResult }) {
	const trust = result.trust.score >= 0.8 ? "High" : result.trust.score >= 0.5 ? "Medium" : "Low";
	const answer = result.answer?.replace(/\[(S\d+)\]/g, (label, code: string) =>
		result.sources.some((source) => source.code === code) ? `[${code}](#source-${code})` : label,
	);
	return (
		<div className="result-layout">
			<div className="result-main">
				<section className="dashboard-card result-answer">
					<h2>{answer ? "What you need to know" : "I’m not sure yet"}</h2>
					{answer ? (
						<div className="chat-markdown">
							<ReactMarkdown skipHtml>{answer}</ReactMarkdown>
						</div>
					) : (
						<p>
							There is no confirmed answer for this context yet. The demo’s next step is shown
							below.
						</p>
					)}
					<p className="result-context">
						{result.context.country} · {result.context.client ?? "All clients"} ·{" "}
						{result.context.period}
					</p>
				</section>
				{result.nextStep.kind !== "none" && (
					<section className="dashboard-card next-step" aria-label="Next step">
						<h2>
							<Icon name="users" />
							Next step
						</h2>
						{result.nextStep.kind === "contact_person" ? (
							<>
								<p>
									<strong>Waiting for {result.nextStep.person}</strong>
								</p>
								<p>{result.nextStep.message}</p>
								<p className="integration-note">
									Simulated contact in this demo. No message has been sent.
								</p>
							</>
						) : (
							<p>{result.nextStep.question}</p>
						)}
					</section>
				)}
				<section className="dashboard-card result-sources" id="sources">
					<h2>
						<Icon name="database" />
						Sources and reasoning
					</h2>
					<p className="muted">
						Supporting and rejected sources are both shown, so you can check the reasoning.
					</p>
					{result.sources.map((source) => (
						<article key={source.code} id={`source-${source.code}`} className="source-evidence">
							<div className="source-evidence-heading">
								<span className="source-code">{source.code}</span>
								<h3>{source.title}</h3>
								<span className={source.supports ? "evidence-status supports" : "evidence-status"}>
									{source.supports ? "Supports answer" : "Not used"}
								</span>
							</div>
							<p className="source-origin">
								{source.kind.toUpperCase()} · {source.author} · {source.date}
							</p>
							<blockquote>{source.excerpt}</blockquote>
							<p className="source-reason">{source.note}</p>
						</article>
					))}
				</section>
			</div>
			<aside className="result-side">
				<section className="dashboard-card trust-panel">
					<h2>Trust in this answer</h2>
					<p className={`trust-value trust-${trust.toLowerCase()}`}>
						<strong>{Math.round(result.trust.score * 100)}%</strong>
						<span>{trust} trust</span>
					</p>
					<ul>
						{result.trust.reasons.map((reason) => (
							<li key={reason}>{reason}</li>
						))}
					</ul>
					<p className="integration-note">Score and reasoning are supplied by the demo fixture.</p>
				</section>
				<section className="dashboard-card" id="people">
					<h2>
						<Icon name="users" />
						People who can help
					</h2>
					{result.people.map((person) => (
						<div key={person.name} className="result-person">
							<strong>{person.name}</strong>
							<span>{person.role}</span>
							<p>{person.why}</p>
						</div>
					))}
				</section>
			</aside>
		</div>
	);
}
