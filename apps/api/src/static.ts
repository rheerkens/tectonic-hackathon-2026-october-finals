import { extname, resolve } from "node:path";
import type { ApiEnvironment } from "@day-one/server";
import type { Hono } from "hono";
import { serveStatic } from "hono/bun";

/** Serves the built web app. Client routes such as /w/studio/notes load index.html. */
export function mountWebApp(app: Hono<ApiEnvironment>, root: string) {
	app.all("/api/*", (c) =>
		c.json(
			{
				code: "NOT_FOUND",
				message: "This endpoint does not exist.",
				requestId: c.get("requestId"),
			},
			404,
		),
	);
	app.use("/*", serveStatic({ root }));
	const index = resolve(root, "index.html");
	// A missing file such as /assets/old.js stays a 404 instead of returning the app's HTML.
	app.get("*", (c) =>
		extname(c.req.path)
			? c.notFound()
			: new Response(Bun.file(index), { headers: { "Content-Type": "text/html; charset=utf-8" } }),
	);
}
