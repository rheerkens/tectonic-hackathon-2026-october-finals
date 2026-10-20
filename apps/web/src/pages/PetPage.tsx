import { useCallback, useEffect, useRef, useState } from "react";
import { type PetAnimation, usePetMood } from "../state/pet";

/** Finn on the desktop. Dragging moves the window; a click opens or closes the mini chat. */
export function PetPage() {
	const mood = usePetMood();
	const [running, setRunning] = useState<PetAnimation | null>(null);
	const drag = useRef({ x: 0, y: 0, distance: 0, active: false, pointerId: -1 });
	const cancelDrag = useCallback(() => {
		drag.current.active = false;
		drag.current.distance = Number.POSITIVE_INFINITY;
		setRunning(null);
	}, []);
	useEffect(() => {
		document.documentElement.classList.add("pet-window");
		window.addEventListener("blur", cancelDrag);
		return () => {
			document.documentElement.classList.remove("pet-window");
			window.removeEventListener("blur", cancelDrag);
		};
	}, [cancelDrag]);
	return (
		<button
			type="button"
			className="pet"
			aria-label="Open mini chat"
			onPointerDown={(event) => {
				if (!event.isPrimary || event.button !== 0) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				drag.current = {
					x: event.screenX,
					y: event.screenY,
					distance: 0,
					active: true,
					pointerId: event.pointerId,
				};
			}}
			onPointerMove={(event) => {
				const current = drag.current;
				if (!current.active || current.pointerId !== event.pointerId) return;
				if (!(event.buttons & 1)) return cancelDrag();
				const dx = event.screenX - current.x,
					dy = event.screenY - current.y;
				current.x = event.screenX;
				current.y = event.screenY;
				current.distance += Math.abs(dx) + Math.abs(dy);
				if (current.distance <= 3) return;
				window.desktop?.movePet(dx, dy);
				if (dx) setRunning(dx < 0 ? "running-left" : "running-right");
			}}
			onPointerUp={() => {
				drag.current.active = false;
				setRunning(null);
			}}
			onPointerCancel={cancelDrag}
			onLostPointerCapture={() => {
				if (drag.current.active) cancelDrag();
			}}
			onClick={(event) => {
				if (event.detail === 0 || drag.current.distance <= 3) window.desktop?.toggleMini();
				drag.current.distance = 0;
			}}
		>
			<picture>
				<source srcSet="/pet/idle.png" media="(prefers-reduced-motion: reduce)" />
				<img src={`/pet/${running ?? mood}.webp`} alt="" draggable={false} />
			</picture>
		</button>
	);
}
