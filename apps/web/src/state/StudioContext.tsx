import { createContext, useContext } from "react";
import type { useStudio } from "./studio";

export const StudioContext = createContext<ReturnType<typeof useStudio> | null>(null);
export function useStudioState() {
	const state = useContext(StudioContext);
	if (!state) throw new Error("Workspace state is missing.");
	return state;
}
