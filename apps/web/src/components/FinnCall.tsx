import { useEffect, useRef, useState } from "react";
import { useFinn } from "../state/finn";
import type { FinnResult } from "../state/finn-scenarios";

/**
 * Finn's scripted call to the expert. Finn's line plays as audio so the room hears it; the expert
 * answers live from the script shown on screen. Ending the call records the confirmation.
 */
type Phase = "idle" | "ringing" | "finn" | "roy" | "thanks";

function Phone() {
	return (
		<svg
			width="17"
			height="17"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
		</svg>
	);
}

export function FinnCall({ result, compact = false }: { result: FinnResult; compact?: boolean }) {
	const { confirmCall } = useFinn(true);
	const audio = useRef<HTMLAudioElement | null>(null);
	const root = useRef<HTMLDivElement>(null);
	const [phase, setPhase] = useState<Phase>("idle");
	useEffect(() => () => audio.current?.pause(), []);
	// Keep the current line and the end-call button in view, also in the small chat window.
	useEffect(() => {
		if (phase !== "idle") root.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}, [phase]);
	const step = result.nextStep.kind === "contact_person" ? result.nextStep : null;
	if (!step?.call) return null;
	const { call, person } = step;

	// A blocked or missing clip skips ahead, so the call never stalls on stage.
	function play(src: string, next: () => void) {
		audio.current?.pause();
		const clip = new Audio(src);
		audio.current = clip;
		clip.onended = next;
		clip.play().catch(next);
	}
	function start() {
		setPhase("ringing");
		play(call.ring, () => {
			setPhase("finn");
			play(call.audio, () => setPhase("roy"));
		});
	}
	function end() {
		setPhase("thanks");
		play(call.thanksAudio, () => confirmCall(result.id));
	}

	const lines = [
		{ who: "Finn", text: step.message, from: "finn" },
		{ who: person, text: call.reply, from: "roy" },
		{ who: "Finn", text: call.thanks, from: "thanks" },
	] as const;
	const order: Phase[] = ["idle", "ringing", "finn", "roy", "thanks"];
	const shown = lines.filter((line) => order.indexOf(line.from) <= order.indexOf(phase));

	return (
		<div ref={root} className={compact ? "finn-call is-compact" : "finn-call"} data-phase={phase}>
			{phase === "idle" ? (
				<button type="button" className="answer-btn finn-call-start" onClick={start}>
					<Phone /> Call {person}
				</button>
			) : (
				<p className="finn-call-status" role="status">
					<span className="finn-call-dot" aria-hidden="true" />
					{phase === "ringing"
						? `Calling ${person}…`
						: phase === "roy"
							? `${person} is answering`
							: phase === "thanks"
								? "Recording the confirmation…"
								: "Finn is speaking"}
				</p>
			)}
			{shown.length > 0 && (
				<div className="finn-call-transcript" aria-live="polite">
					{(compact ? shown.slice(-1) : shown).map((line) => (
						<p
							key={line.from}
							className={`finn-call-line${line.from === "roy" ? " is-expert" : ""}${line.from === phase ? " is-speaking" : ""}`}
						>
							<strong>{line.who}</strong>
							{line.text}
						</p>
					))}
				</div>
			)}
			{phase === "roy" && (
				<button type="button" className="answer-btn finn-call-end" onClick={end}>
					<Phone /> {person} confirmed · end call
				</button>
			)}
		</div>
	);
}
