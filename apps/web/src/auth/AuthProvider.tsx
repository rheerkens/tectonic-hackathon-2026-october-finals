import { AuthModeSchema } from "@day-one/contracts";
import { lazy, type ReactNode, Suspense } from "react";
import { DevAuthProvider } from "./DevAuthProvider";

const ClerkAuthProvider = lazy(() => import("./ClerkAuthProvider"));
export function AuthProvider({ children }: { children: ReactNode }) {
	AuthModeSchema.parse(import.meta.env.VITE_AUTH_MODE);
	return import.meta.env.VITE_AUTH_MODE === "clerk" ? (
		<Suspense fallback={<p className="loading">Loading sign-in…</p>}>
			<ClerkAuthProvider>{children}</ClerkAuthProvider>
		</Suspense>
	) : (
		<DevAuthProvider>{children}</DevAuthProvider>
	);
}
