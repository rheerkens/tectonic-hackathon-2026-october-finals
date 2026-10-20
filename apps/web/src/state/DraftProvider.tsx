import type { DraftStore } from "@day-one/contracts";
import { createContext, type ReactNode, useContext, useState } from "react";
import { createDraftStore } from "./drafts";

const DraftContext = createContext<DraftStore | null>(null);
export function DraftProvider({ children }: { children: ReactNode }) {
	const [store] = useState(createDraftStore);
	return <DraftContext.Provider value={store}>{children}</DraftContext.Provider>;
}
export function useDraftStore() {
	const store = useContext(DraftContext);
	if (!store) throw new Error("Draft provider missing.");
	return store;
}
