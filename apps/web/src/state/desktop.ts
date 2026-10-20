/** Shows the main window on `route`, e.g. `/results/<id>`. In a plain browser it opens a tab instead. */
export function openMain(route: string) {
	if (window.desktop) window.desktop.openMain(route);
	else window.open(route, "_blank");
}
