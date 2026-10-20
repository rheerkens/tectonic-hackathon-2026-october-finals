import { useEffect, useId, useRef, useState } from "react";
import { useFinn } from "../state/finn";
import { useAnnounceFinnMood, usePetMood } from "../state/pet";
import { FinnChat } from "./FinnChat";

/** Finn inside SDtrust: fixed bottom right, opening the compact chat above him. */
export function FinnDock() {
	const [open, setOpen] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const id = useId();
	const mood = usePetMood();
	useAnnounceFinnMood(useFinn());
	useEffect(() => {
		if (open) input.current?.focus();
	}, [open]);
	return (
		<div className="finn-dock">
			{open && (
				<section
					id={id}
					className="finn-mini finn-dock-panel"
					aria-label="Chat with Finn"
					onKeyDown={(event) => {
						if (event.key === "Escape") setOpen(false);
					}}
				>
					<FinnChat inApp inputRef={input} onClose={() => setOpen(false)} />
				</section>
			)}
			<button
				type="button"
				className="finn-dock-pet"
				aria-label={open ? "Close chat with Finn" : "Ask Finn"}
				aria-expanded={open}
				aria-controls={id}
				onClick={() => setOpen(!open)}
			>
				<picture>
					<source srcSet="/pet/idle.png" media="(prefers-reduced-motion: reduce)" />
					<img src={`/pet/${mood}.webp`} alt="" width="96" height="104" draggable={false} />
				</picture>
			</button>
		</div>
	);
}
