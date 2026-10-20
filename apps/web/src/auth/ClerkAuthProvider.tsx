import { ClerkProvider, SignIn, useAuth, useUser } from "@clerk/react";
import { Button } from "@day-one/ui/button";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useDraftStore } from "../state/DraftProvider";
import { SessionContext } from "./context";

function Session({ children }: { children: ReactNode }) {
	const { user, isLoaded } = useUser(),
		{ getToken, signOut } = useAuth(),
		drafts = useDraftStore();
	const [expired, setExpired] = useState(false);
	const currentUser = useRef(user?.id);
	currentUser.current = user?.id;
	useLayoutEffect(() => {
		if (user) {
			drafts.activate(user.id);
			setExpired(false);
		}
	}, [drafts, user?.id]);
	if (!isLoaded) return <p className="loading">Loading your session…</p>;
	if (!user)
		return (
			<main className="sign-in">
				<section>
					{expired && (
						<p role="alert">
							Sign in again. Your unsent text is kept for this account in this tab.
						</p>
					)}
					<SignIn routing="hash" />
				</section>
			</main>
		);
	if (expired)
		return (
			<main className="sign-in">
				<section role="alert">
					<p>Sign in again. Your unsent text is kept for this account in this tab.</p>
					<Button
						type="button"
						variant="primary"
						onClick={() => void signOut().then(() => setExpired(false))}
					>
						Sign in again
					</Button>
				</section>
			</main>
		);
	return (
		<SessionContext.Provider
			value={{
				mode: "clerk",
				drafts,
				expire: () => {
					if (currentUser.current === user.id) setExpired(true);
				},
				user: {
					id: user.id,
					name: user.fullName || "Signed-in user",
					email: user.primaryEmailAddress?.emailAddress || "",
				},
				headers: async () => {
					const token = await getToken();
					return token ? { authorization: `Bearer ${token}` } : {};
				},
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}
export default function ClerkAuthProvider({ children }: { children: ReactNode }) {
	const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
	if (!key) throw new Error("Configure Clerk to sign in.");
	return (
		<ClerkProvider publishableKey={key}>
			<Session>{children}</Session>
		</ClerkProvider>
	);
}
