import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "../../../apps/web/src/components/ErrorBoundary";

function Broken(): never {
	throw new Error("browser boundary fixture");
}
export function mountCrash() {
	const node = document.createElement("div");
	document.body.replaceChildren(node);
	createRoot(node).render(
		<ErrorBoundary>
			<Broken />
		</ErrorBoundary>,
	);
}
