export type ThemePreference = "light" | "dark" | "system";
export function parseTheme(value: string | null): ThemePreference {
	return value === "light" || value === "dark" ? value : "system";
}
export function resolveTheme(preference: ThemePreference, systemDark: boolean) {
	return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}
