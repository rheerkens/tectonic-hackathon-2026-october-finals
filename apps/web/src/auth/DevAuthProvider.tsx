import { demoUsers } from "@day-one/contracts";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useDraftStore } from "../state/DraftProvider";
import { SessionContext } from "./context";
export function DevAuthProvider({ children }: { children: ReactNode }) {
	const drafts = useDraftStore();
	const [id, setId] = useState(() => localStorage.getItem("day-one:user") || "");
	const [expired, setExpired] = useState(false);
	const [reauthUserId, setReauthUserId] = useState<string | null>(null);
	const currentId = useRef(id);
	currentId.current = id;
	const user = demoUsers.find((user) => user.id === id) || null;
	useLayoutEffect(() => {
		if (user) drafts.activate(user.id);
	}, [drafts, user]);
	function signIn(next: string) {
		currentId.current = next;
		drafts.activate(next);
		localStorage.setItem("day-one:user", next);
		setExpired(false);
		setReauthUserId(null);
		setId(next);
	}
	function signOut() {
		currentId.current = "";
		drafts.clear();
		localStorage.removeItem("day-one:user");
		setExpired(false);
		setReauthUserId(null);
		setId("");
	}
	function expire() {
		if (currentId.current !== id || !id) return;
		currentId.current = "";
		localStorage.removeItem("day-one:user");
		setExpired(true);
		setReauthUserId(id);
		setId("");
	}
	return (
		<SessionContext.Provider
			value={{
				user,
				mode: "dev",
				drafts,
				expired,
				reauthUserId,
				expire,
				headers: async () => (user ? { "x-dev-user": user.id } : {}),
				signIn,
				signOut,
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}
