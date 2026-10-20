import type { ComponentProps, ReactNode } from "react";

// hideLabel keeps the accessible label while a toolbar or composer supplies visual context.
type FieldProps = { id: string; label: ReactNode; error?: string; hideLabel?: boolean };
export function TextField({
	id,
	label,
	error,
	hideLabel,
	className = "",
	...props
}: ComponentProps<"input"> & FieldProps) {
	const description = [props["aria-describedby"], error ? `${id}-error` : ""]
		.filter(Boolean)
		.join(" ");
	return (
		<div className="ui-field">
			<label htmlFor={id} className={hideLabel ? "ui-visually-hidden" : undefined}>
				{label}
			</label>
			<input
				{...props}
				id={id}
				className={`ui-input ${className}`}
				aria-invalid={!!error}
				aria-describedby={description || undefined}
			/>
			{error && (
				<p id={`${id}-error`} className="ui-field-error" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
export function TextareaField({
	id,
	label,
	error,
	hideLabel,
	className = "",
	...props
}: ComponentProps<"textarea"> & FieldProps) {
	const description = [props["aria-describedby"], error ? `${id}-error` : ""]
		.filter(Boolean)
		.join(" ");
	return (
		<div className="ui-field">
			<label htmlFor={id} className={hideLabel ? "ui-visually-hidden" : undefined}>
				{label}
			</label>
			<textarea
				{...props}
				id={id}
				className={`ui-input ${className}`}
				aria-invalid={!!error}
				aria-describedby={description || undefined}
			/>
			{error && (
				<p id={`${id}-error`} className="ui-field-error" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}

export function SelectField({
	id,
	label,
	hideLabel,
	className = "",
	children,
	...props
}: ComponentProps<"select"> & Omit<FieldProps, "error">) {
	return (
		<div className="ui-field">
			<label htmlFor={id} className={hideLabel ? "ui-visually-hidden" : undefined}>
				{label}
			</label>
			<select {...props} id={id} className={`ui-input ui-select ${className}`}>
				{children}
			</select>
		</div>
	);
}
