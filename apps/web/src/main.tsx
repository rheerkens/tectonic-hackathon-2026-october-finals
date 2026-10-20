import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { router } from "./router";
import { DraftProvider } from "./state/DraftProvider";
import "./styles.css";
import "@day-one/ui/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing app root.");
createRoot(root).render(
	<StrictMode>
		<ErrorBoundary>
			<DraftProvider>
				<AuthProvider>
					<RouterProvider router={router} />
				</AuthProvider>
			</DraftProvider>
		</ErrorBoundary>
	</StrictMode>,
);
