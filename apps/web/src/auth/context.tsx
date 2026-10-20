// Session seam adapted from Tectonic apps/web/src/auth.

import type { DraftStore, User } from "@day-one/contracts";
import { createContext, useContext } from "react";
export type Session = {
	user: User | null;
	drafts: DraftStore;
	expire: () => void;
	mode: "dev" | "clerk";
	headers: () => Promise<Record<string, string>>;
};
export const SessionContext = createContext<Session | null>(null);
export function useSession() {
	const session = useContext(SessionContext);
	if (!session) throw new Error("Session provider is missing.");
	return session;
}
