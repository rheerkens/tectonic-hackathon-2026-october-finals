import { useEffect } from "react";
import { FinnChat } from "../components/FinnChat";

/** The desktop mini window: Finn's compact chat around a transparent slot over the pet window. */
export function MiniPage() {
	useEffect(() => {
		document.documentElement.classList.add("finn-mini-window");
		return () => document.documentElement.classList.remove("finn-mini-window");
	}, []);
	return (
		<main>
			<FinnChat
				// In a plain browser there is no pet window underneath, so show Finn here.
				pet={!window.desktop && <img src="/pet/idle.png" alt="" />}
				onHide={() => window.desktop?.hideMini()}
			/>
		</main>
	);
}
