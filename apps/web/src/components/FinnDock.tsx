import { useEffect, useRef, useState } from "react";
import { useFinn } from "../state/finn";
import { announce, type PetAnimation, useAnnounceFinnMood, usePetMood } from "../state/pet";
import { FinnChat } from "./FinnChat";

/** What Finn says about the page you are on; shown once per key. */
export type FinnHint = { key: string; mood: PetAnimation; text: string; target?: string };

// Finn walks in once per window and comments once per page, not on every render.
let entered = false;
const seenHints = new Set<string>();
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Finn inside SDtrust: fixed bottom right, opening the same compact chat as the desktop mini. */
export function FinnDock({ hint }: { hint?: FinnHint | undefined }) {
	const [open, setOpen] = useState(false);
	const [bubble, setBubble] = useState<FinnHint | null>(null);
	const [hintMood, setHintMood] = useState<PetAnimation | null>(null);
	const latestHint = useRef(hint);
	latestHint.current = hint;
	const [phase, setPhase] = useState<"entering" | "waving" | "leaving" | "exiting" | null>(
		entered || still() ? null : "entering",
	);
	const mood = usePetMood();
	// Like the desktop pet, Finn reflects activity across all compact conversations.
	useAnnounceFinnMood(useFinn(true).activity);
	useEffect(() => {
		entered = true;
	}, []);
	// Wait until Finn has walked in, then comment on the page once.
	const hintKey = hint?.key;
	useEffect(() => {
		const next = latestHint.current;
		if (!hintKey || !next) return setBubble(null);
		if (phase !== null || seenHints.has(hintKey)) return;
		seenHints.add(hintKey);
		setBubble(next);
	}, [hintKey, phase]);
	useEffect(() => {
		if (!bubble) return;
		setHintMood(bubble.mood);
		const moodTimer = window.setTimeout(() => setHintMood(null), 2000);
		const hideTimer = window.setTimeout(() => setBubble(null), 8000);
		return () => {
			window.clearTimeout(moodTimer);
			window.clearTimeout(hideTimer);
		};
	}, [bubble]);
	// Closing SDtrust: Finn waves, runs out to the right, then the shell closes the window.
	useEffect(
		() =>
			window.desktop?.onMainClosing?.(() => {
				setOpen(false);
				if (still()) window.desktop?.closeMain?.();
				else setPhase("leaving");
			}),
		[],
	);
	useEffect(() => {
		if (phase !== "waving" && phase !== "leaving") return;
		const timer = window.setTimeout(
			() => setPhase(phase === "leaving" ? "exiting" : null),
			phase === "leaving" ? 1000 : 1400,
		);
		return () => window.clearTimeout(timer);
	}, [phase]);
	const shown: PetAnimation =
		phase === "entering"
			? "running-left"
			: phase === "exiting"
				? "running-right"
				: phase
					? "waving"
					: (hintMood ?? mood);
	return (
		<div className="finn-dock">
			<div aria-live="polite">
				{bubble && !open && (
					<button
						type="button"
						className="finn-dock-bubble"
						onClick={() => {
							setBubble(null);
							if (bubble.target)
								document
									.getElementById(bubble.target)
									?.scrollIntoView({ behavior: "smooth", block: "center" });
						}}
					>
						{bubble.text}
					</button>
				)}
			</div>
			<FinnChat
				inApp
				open={open}
				className={open ? "finn-dock-panel is-open" : "finn-dock-panel"}
				onHide={() => setOpen(false)}
				pet={
					<>
						<button
							type="button"
							className={
								phase === "entering" || phase === "exiting"
									? `finn-dock-pet ${phase}`
									: "finn-dock-pet"
							}
							aria-label={open ? "Close chat with Finn" : "Ask Finn"}
							aria-expanded={open}
							onClick={() => setOpen(!open)}
							onAnimationEnd={(event) => {
								if (event.target !== event.currentTarget) return;
								if (phase === "entering") setPhase("waving");
								if (phase === "exiting") {
									// The desktop Finn reappears waving once the window is gone.
									announce("waving");
									window.desktop?.closeMain?.();
								}
							}}
						>
							<picture>
								<source srcSet="/pet/idle.png" media="(prefers-reduced-motion: reduce)" />
								<img src={`/pet/${shown}.webp`} alt="" width="96" height="104" draggable={false} />
							</picture>
						</button>
						{!open && !phase && <span className="finn-rest-pill" aria-hidden="true" />}
					</>
				}
			/>
		</div>
	);
}
