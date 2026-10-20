// Ported from Tectonic apps/web/src/components/Dialog.tsx. Mount it to open; unmount it to close.
import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "./button";

export function Dialog({
	title,
	onClose,
	children,
	className = "",
}: {
	title: ReactNode;
	onClose: () => void;
	children: ReactNode;
	className?: string;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (!dialog.open) dialog.showModal();
		// Escape closes through the owner so its state stays the source of truth.
		const onCancel = (event: Event) => {
			event.preventDefault();
			onClose();
		};
		dialog.addEventListener("cancel", onCancel);
		return () => dialog.removeEventListener("cancel", onCancel);
	}, [onClose]);
	return (
		<dialog
			ref={ref}
			className={`ui-dialog ${className}`}
			aria-labelledby={titleId}
			onClick={(event) => {
				if (event.target === ref.current) onClose();
			}}
		>
			<div className="ui-dialog-panel">
				<header className="ui-dialog-header">
					<h2 id={titleId}>{title}</h2>
					<Button variant="ghost" className="ui-dialog-close" onClick={onClose} aria-label="Close">
						×
					</Button>
				</header>
				{children}
			</div>
		</dialog>
	);
}
