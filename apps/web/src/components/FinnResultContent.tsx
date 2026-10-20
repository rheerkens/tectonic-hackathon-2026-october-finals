import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { FinnResult, FinnSource } from "../state/finn-scenarios";
import { FinnCall } from "./FinnCall";
import { Icon } from "./Icon";

// Answer card and "Why this source?" table follow the semi-final app (Tectonic-hackathon2026 KennisPage).
type Tone = "good" | "warn" | "muted";

function verdictTone(source: FinnSource): Tone {
	if (source.supports) return "good";
	return source.note.startsWith("Not confirmed") ? "warn" : "muted";
}

function Tick({ tone }: { tone: Tone }) {
	return (
		<span className={`answer-tick answer-tick--${tone}`}>
			<Icon name={tone === "good" ? "check" : tone === "warn" ? "info" : "x"} size={13} />
		</span>
	);
}

const month = (period: string) =>
	new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
		new Date(`${period}-01T12:00:00`),
	);

export function FinnResultContent({ result }: { result: FinnResult }) {
	const evidence = useRef<HTMLDetailsElement>(null);
	const best = result.sources.find((source) => source.supports);
	const score = Math.round(result.trust.score * 100);
	const tone: Tone = !result.answer ? "muted" : result.trust.score >= 0.8 ? "good" : "warn";
	const status = !result.answer
		? "Not substantiated"
		: tone === "good"
			? "Substantiated"
			: "Partly substantiated";
	const answer = result.answer?.replace(/\[(S\d+)\]/g, (label, code: string) =>
		result.sources.some((source) => source.code === code) ? `[${code}](#source-${code})` : label,
	);
	const showSource = (code: string) => {
		if (evidence.current) evidence.current.open = true;
		document
			.getElementById(`source-${code}`)
			?.scrollIntoView({ behavior: "smooth", block: "center" });
	};
	return (
		<div className="answer-stack">
			<section className={`answer-card answer-card--${tone}`} role="status">
				<span className="answer-badge">
					<Tick tone={tone} /> {status} · {score}% trust
				</span>
				{tone === "good" && (
					<div className="result-seal" role="img" aria-label="Confirmed result">
						<span>✓</span>
						Confirmed
					</div>
				)}
				{answer && best ? (
					<>
						<h2>{result.headline}</h2>
						<div className="answer-text">
							<ReactMarkdown skipHtml>{answer}</ReactMarkdown>
						</div>
						<p className="answer-meta">
							<span>
								<Icon name="clock" size={15} /> Valid for {month(result.context.period)}
							</span>
							<span>
								<Icon name="users" size={15} /> Confirmed by {best.author}
							</span>
						</p>
						<blockquote className="answer-quote">“{best.excerpt}”</blockquote>
						<div className="answer-foot">
							<a
								className="answer-source-link"
								href={`#source-${best.code}`}
								onClick={(event) => {
									event.preventDefault();
									showSource(best.code);
								}}
							>
								<Icon name="file-text" size={18} />
								<span>
									<strong>{best.title}</strong>
									<small>
										{best.code} · {best.kind.toUpperCase()} · {best.date}
									</small>
								</span>
							</a>
							<button type="button" className="answer-btn" onClick={() => showSource(best.code)}>
								View source <Icon name="arrow-right" size={16} />
							</button>
						</div>
					</>
				) : (
					<>
						<h2>No substantiated answer</h2>
						<p className="answer-text">
							No source is confirmed for {result.context.client ?? "this client"} in{" "}
							{month(result.context.period)}. See below why.
						</p>
					</>
				)}
			</section>

			{result.nextStep.kind !== "none" && (
				<section id="next-step" className="answer-card answer-card--warn" aria-label="Next step">
					<span className="answer-badge">
						<Tick tone="warn" /> Next step
					</span>
					{result.nextStep.kind === "contact_person" ? (
						<>
							<h3>Waiting for {result.nextStep.person}</h3>
							{result.nextStep.call ? (
								<>
									<p className="answer-text">
										Finn calls {result.nextStep.person}, who owns this knowledge, and records the
										answer in the knowledge base.
									</p>
									<FinnCall result={result} />
								</>
							) : (
								<blockquote className="answer-quote">{result.nextStep.message}</blockquote>
							)}
						</>
					) : (
						<h3>{result.nextStep.question}</h3>
					)}
				</section>
			)}

			<details ref={evidence} className="answer-evidence">
				<summary>
					<span>Why this source?</span>
					<span className="answer-evidence-count">{result.sources.length} sources</span>
					<Icon name="chevron-right" size={16} />
				</summary>
				<table aria-label="Sources and assessment">
					<thead>
						<tr>
							<th>Source</th>
							<th>Assessment</th>
						</tr>
					</thead>
					<tbody>
						{result.sources.map((source) => {
							const verdict = verdictTone(source);
							return (
								<tr key={source.code} id={`source-${source.code}`}>
									<td>
										<span className="answer-src" title={source.excerpt}>
											<Icon name="file-text" size={16} />
											<span className="answer-src-id">{source.code}</span>
											<span>{source.title}</span>
										</span>
									</td>
									<td>
										<span className={`answer-verdict answer-verdict--${verdict}`}>
											<Tick tone={verdict} /> {source.note}
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
				<p className="answer-footnote">
					<Icon name="info" size={15} /> A valid document does not automatically apply.
				</p>
			</details>
		</div>
	);
}
