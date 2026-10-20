/** Shows the main window on `route`, e.g. `/results/<id>`. In a plain browser it opens a tab instead. */
export function openMain(route: string) {
	const target = appPath(route);
	if (!target) return;
	if (window.desktop) window.desktop.openMain(target);
	else window.open(target, "_blank", "noopener,noreferrer");
}

/** Only same-origin app paths like `/results/1`; rejects `//host`, `/\host` and schemes. */
function appPath(route: string) {
	if (!/^\/(?![/\\])/.test(route)) return null;
	try {
		const url = new URL(route, window.location.origin);
		return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : null;
	} catch {
		return null;
	}
}
