import { useEffect, useState } from "react";

// Browser-only: reads the desktop bridge declared in env.d.ts.
/** Finn's size in percent, set in Settings on the desktop app. Always 100 in a plain browser. */
export function usePetScale() {
	const [scale, setScale] = useState(100);
	useEffect(() => {
		// A change heard while the first read is in flight is newer than that read.
		let heard = false;
		window.desktop
			?.getPetScale?.()
			.then((value) => heard || setScale(value))
			.catch(() => {});
		const stop = window.desktop?.onPetScale?.((value) => {
			heard = true;
			setScale(value);
		});
		return () => {
			heard = true;
			stop?.();
		};
	}, []);
	return scale;
}
