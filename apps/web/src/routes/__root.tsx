import { Button } from "@day-one/ui/button";
import { createRootRoute, Link } from "@tanstack/react-router";
import { App } from "../App";

export const Route = createRootRoute({
	component: App,
	notFoundComponent: () => (
		<main className="screen-message">
			<h1>Page not found</h1>
			<Link to="/">Choose a workspace</Link>
		</main>
	),
	errorComponent: () => (
		<main className="screen-message" role="alert">
			<h1>This page could not continue.</h1>
			<Button type="button" onClick={() => window.location.reload()}>
				Reload
			</Button>
		</main>
	),
});
