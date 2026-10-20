// Ported from Tectonic apps/web/src/components/States.tsx; domain skeletons became one generic loader.
import type { ReactNode } from "react";
import { Button } from "./button";

export function EmptyState({
	title,
	message,
	action,
	className = "",
}: {
	title: string;
	message?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div className={`ui-state ${className}`}>
			<strong className="ui-state-title">{title}</strong>
			{message && <p className="ui-state-message">{message}</p>}
			{action}
		</div>
	);
}

export function ErrorState({
	title = "Something went wrong",
	message,
	onRetry,
	retryLabel = "Try again",
	className = "",
}: {
	title?: string;
	message?: ReactNode;
	onRetry?: () => void;
	retryLabel?: string;
	className?: string;
}) {
	return (
		<div className={`ui-state ui-state-error ${className}`} role="alert">
			<strong className="ui-state-title">{title}</strong>
			{message && <p className="ui-state-message">{message}</p>}
			{onRetry && (
				<Button variant="ghost" onClick={onRetry}>
					{retryLabel}
				</Button>
			)}
		</div>
	);
}

// Skeleton lines stand in for content; the label stays readable and is announced once.
export function LoadingState({
	label,
	lines = 3,
	className = "",
}: {
	label: string;
	lines?: number;
	className?: string;
}) {
	return (
		<div className={`ui-loading ${className}`} role="status" aria-busy="true">
			<span className="ui-loading-label">{label}</span>
			{Array.from({ length: lines }, (_, index) => (
				<span
					key={index}
					className="ui-skeleton"
					style={{ width: `${92 - ((index * 17) % 40)}%` }}
					aria-hidden="true"
				/>
			))}
		</div>
	);
}
