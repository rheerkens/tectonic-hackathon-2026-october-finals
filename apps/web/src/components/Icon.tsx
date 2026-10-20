export type IconName =
	| "house"
	| "search"
	| "database"
	| "users"
	| "file-text"
	| "settings"
	| "arrow-right"
	| "bell"
	| "clock"
	| "folder"
	| "chevron-right"
	| "sun"
	| "moon"
	| "monitor"
	| "info"
	| "external-link"
	| "check"
	| "menu"
	| "x";
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<use href={`/icons/lucide.svg#${name}`} />
		</svg>
	);
}
