/** Shows the main window on `route`, e.g. `/results/<id>`. In a plain browser it opens a tab instead. */
export function openMain(route: string) {
	if (window.desktop) window.desktop.openMain(route);
	else {
		// Only same-origin app paths; blocks `javascript:` and off-site routes.
		const target = new URL(route, window.location.origin);
		if (target.origin === window.location.origin) window.open(target.href, "_blank");
	}
}
