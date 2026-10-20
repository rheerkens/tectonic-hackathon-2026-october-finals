// Ported from Tectonic apps/web/src/components/Avatar.tsx.
export function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

// Decorative by default because a visible name usually sits beside it; pass label when it stands alone.
export function Avatar({
	name,
	size = 36,
	color,
	label,
	className = "",
}: {
	name: string;
	size?: number;
	color?: string;
	label?: string;
	className?: string;
}) {
	return (
		<span
			className={`ui-avatar ${className}`}
			style={{
				width: size,
				height: size,
				fontSize: Math.max(10, Math.round(size * 0.34)),
				...(color ? { background: color, color: "white" } : {}),
			}}
			{...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
		>
			{initials(name)}
		</span>
	);
}
