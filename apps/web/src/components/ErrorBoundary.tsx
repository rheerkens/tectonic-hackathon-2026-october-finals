import { Button } from "@day-one/ui/button";
import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		if (this.state.failed)
			return (
				<main className="loading" role="alert">
					<h1>This page could not continue.</h1>
					<p className="muted">Reload to recover. Unsent text will be lost.</p>
					<Button type="button" variant="primary" onClick={() => window.location.reload()}>
						Reload
					</Button>
				</main>
			);
		return this.props.children;
	}
}
