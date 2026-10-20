import {
	REALTIME_PATH,
	REALTIME_PROTOCOL,
	REALTIME_TICKET_PATH,
	REALTIME_TICKET_PREFIX,
} from "@day-one/contracts/realtime";
import { type ApiEnvironment, AppError } from "@day-one/server";
import type { RealtimeHub, SocketData } from "@day-one/server/realtime";
import type { Server } from "bun";
import type { Hono } from "hono";

export type OriginPolicy = {
	/** Exact browser origins, e.g. the launcher's web URLs. Vite rewrites Host but keeps Origin. */
	origins: string[];
	/** Accept an Origin whose host matches Host, for the API serving the built app itself. */
	sameOrigin: boolean;
};

export function allowedOrigin(request: Request, policy: OriginPolicy) {
	const origin = request.headers.get("origin");
	if (!origin) return false;
	if (policy.origins.includes(origin)) return true;
	if (!policy.sameOrigin) return false;
	try {
		return new URL(origin).host === request.headers.get("host");
	} catch {
		return false;
	}
}

const isBunServer = (env: unknown): env is Server<SocketData> =>
	typeof env === "object" && env !== null && "upgrade" in env;

/** Mount before header authentication: the upgrade authenticates with its one-time ticket instead. */
export function mountRealtimeUpgrade(
	app: Hono<ApiEnvironment>,
	{ hub, policy }: { hub: RealtimeHub; policy: OriginPolicy },
) {
	app.get(REALTIME_PATH, (c) => {
		if (c.req.header("upgrade")?.toLowerCase() !== "websocket" || !isBunServer(c.env))
			throw new AppError(400, "Open live updates with a WebSocket.");
		if (!allowedOrigin(c.req.raw, policy))
			throw new AppError(403, "This page cannot open live updates.");
		const protocols = (c.req.header("sec-websocket-protocol") ?? "")
			.split(",")
			.map((value) => value.trim());
		const ticket = protocols
			.find((value) => value.startsWith(REALTIME_TICKET_PREFIX))
			?.slice(REALTIME_TICKET_PREFIX.length);
		const user = protocols.includes(REALTIME_PROTOCOL) && ticket ? hub.redeem(ticket) : null;
		if (!user) throw new AppError(401, "Live updates need a fresh sign-in ticket.");
		c.set("user", user);
		const upgraded = c.env.upgrade(c.req.raw, {
			data: hub.socketData(user),
			headers: { "Sec-WebSocket-Protocol": REALTIME_PROTOCOL },
		});
		if (!upgraded) throw new AppError(400, "Open live updates with a WebSocket.");
		// Bun ignores this response once the connection has been upgraded.
		return new Response(null);
	});
}

/** Mount after header authentication: only a signed-in user can obtain a ticket. */
export function mountRealtimeTicket(app: Hono<ApiEnvironment>, hub: RealtimeHub) {
	app.post(REALTIME_TICKET_PATH, (c) => c.json(hub.issueTicket(c.get("user"))));
}
