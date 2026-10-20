import type { ComponentProps } from "react";

export function Button({
	variant = "secondary",
	className = "",
	type = "button",
	...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" }) {
	return (
		<button type={type} className={`ui-button ui-button-${variant} ${className}`} {...props} />
	);
}
