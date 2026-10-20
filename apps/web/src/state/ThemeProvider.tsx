import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { parseTheme, resolveTheme, type ThemePreference } from "./theme";

const storageKey = "sdtrust.theme";
const ThemeContext = createContext<{
	preference: ThemePreference;
	setPreference: (value: ThemePreference) => void;
} | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
	const [preference, setPreference] = useState<ThemePreference>(() => {
		try {
			return parseTheme(localStorage.getItem(storageKey));
		} catch {
			return "system";
		}
	});
	useEffect(() => {
		const sync = (event: StorageEvent) => {
			if (event.key === storageKey) setPreference(parseTheme(event.newValue));
		};
		window.addEventListener("storage", sync);
		return () => window.removeEventListener("storage", sync);
	}, []);
	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const apply = () => {
			document.documentElement.dataset.theme = resolveTheme(preference, media.matches);
		};
		apply();
		media.addEventListener("change", apply);
		try {
			localStorage.setItem(storageKey, preference);
		} catch {
			/* Theme still works when storage is unavailable. */
		}
		return () => media.removeEventListener("change", apply);
	}, [preference]);
	return (
		<ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>
	);
}
export function useTheme() {
	const theme = useContext(ThemeContext);
	if (!theme) throw new Error("ThemeProvider required");
	return theme;
}
