import { useEffect, useRef, useState } from "react";
import { useFinn } from "../state/finn";
import { type PetAnimation, useAnnounceFinnMood, usePetMood } from "../state/pet";
import { FinnChat } from "./FinnChat";

/** What Finn says about the page you are on; shown once per key. */
export type FinnHint = { key: string; mood: PetAnimation; text: string; target?: string };

// Finn arrives once per window and comments once per page, not on every render.
let entered = false;
const seenHints = new Set<string>();
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Finn inside SDtrust: fixed bottom right, opening the same compact chat as the desktop mini. */
export function FinnDock({ hint }: { hint?: FinnHint | undefined }) {
	const [open, setOpen] = useState(false);
	const [composeKey, setComposeKey] = useState(0);
	const openedOnHover = useRef(false);
	const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (hideTimer.current) clearTimeout(hideTimer.current);
		},
		[],
	);
	const [bubble, setBubble] = useState<FinnHint | null>(null);
	const [hintMood, setHintMood] = useState<PetAnimation | null>(null);
	const latestHint = useRef(hint);
	latestHint.current = hint;
	// In the desktop app the real desktop Finn jumps in and hands over on landing ("waiting" until then);
	// in a browser there is no desktop Finn, so he walks in from the right.
	const [phase, setPhase] = useState<
		"waiting" | "entering" | "landing" | "waving" | "leaving" | "gone" | null
	>(entered || still() ? null : window.desktop?.onFinnLanded ? "waiting" : "entering");
	const mood = usePetMood();
	// Like the desktop pet, Finn reflects activity across all compact conversations.
	useAnnounceFinnMood(useFinn().activity);
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
	useEffect(() => window.desktop?.onHeadsUp?.(() => setOpen(true)), []);
	useEffect(
		() => window.desktop?.onFinnLanded?.(() => setPhase((p) => (p === "waiting" ? "landing" : p))),
		[],
	);
	// Closing SDtrust: Finn waves, then the desktop Finn takes over here and jumps back home.
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
		const next = { waiting: "waving", landing: "waving", waving: null, leaving: "gone" } as const;
		if (!phase || !(phase in next)) return;
		// Waiting has a fallback in case the shell never reports a landing.
		const ms = { waiting: 3000, landing: 320, waving: 1400, leaving: 600 }[
			phase as keyof typeof next
		];
		const timer = window.setTimeout(() => {
			if (phase === "leaving") window.desktop?.closeMain?.();
			setPhase(next[phase as keyof typeof next]);
		}, ms);
		return () => window.clearTimeout(timer);
	}, [phase]);
	const shown: PetAnimation =
		phase === "entering" ? "running-left" : phase ? "waving" : (hintMood ?? mood);
	return (
		<div
			className="finn-dock"
			onPointerEnter={() => {
				if (hideTimer.current) clearTimeout(hideTimer.current);
			}}
			onPointerLeave={() => {
				hideTimer.current = setTimeout(() => {
					if (openedOnHover.current) {
						setOpen(false);
						openedOnHover.current = false;
					}
				}, 400);
			}}
			onPointerDownCapture={(event) => {
				if (event.target instanceof Element && !event.target.closest(".finn-dock-pet"))
					openedOnHover.current = false;
			}}
		>
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
				composeKey={composeKey}
				className={open ? "finn-dock-panel is-open" : "finn-dock-panel"}
				onHide={() => setOpen(false)}
				pet={
					<>
						<button
							type="button"
							className={phase ? `finn-dock-pet ${phase}` : "finn-dock-pet"}
							aria-label={open && !openedOnHover.current ? "Close chat with Finn" : "Ask Finn"}
							aria-expanded={open}
							onPointerEnter={(event) => {
								if (event.pointerType !== "mouse" || event.buttons || phase || open) return;
								openedOnHover.current = true;
								setOpen(true);
							}}
							onClick={() => {
								// A click that leaves the chat open goes straight to the new-chat field.
								if (!open || openedOnHover.current) setComposeKey((key) => key + 1);
								if (!open || !openedOnHover.current) setOpen(!open);
								openedOnHover.current = false;
							}}
							onAnimationEnd={(event) => {
								if (event.target !== event.currentTarget) return;
								if (phase === "entering") setPhase("waving");
							}}
						>
							{phase === "landing" && <span className="finn-dock-ripple" aria-hidden="true" />}
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
