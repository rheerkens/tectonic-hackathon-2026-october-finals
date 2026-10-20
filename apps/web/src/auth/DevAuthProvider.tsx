import { demoUsers } from "@day-one/contracts";
import { type ReactNode, useLayoutEffect } from "react";
import { useDraftStore } from "../state/DraftProvider";
import { SessionContext } from "./context";

// Development always runs as Alex; there is no user switching.
const user = demoUsers[0]!;
export function DevAuthProvider({ children }: { children: ReactNode }) {
	const drafts = useDraftStore();
	useLayoutEffect(() => drafts.activate(user.id), [drafts]);
	return (
		<SessionContext.Provider
			value={{
				user,
				mode: "dev",
				drafts,
				expire: () => {},
				headers: async () => ({ "x-dev-user": user.id }),
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}
