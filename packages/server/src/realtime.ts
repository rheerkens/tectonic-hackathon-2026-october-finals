// Workspace change signals and presence over WebSockets, adapted from Tectonic apps/api/src/realtime.ts.
// Messages carry no feature data. Every delivery rechecks membership in SQLite, so a revoked member is
// evicted instead of being told about later writes.

import type { User } from "@day-one/contracts";
import {
	type ChangeTarget,
	type PresenceUser,
	RealtimeClientMessageSchema,
	RealtimeClose,
	type RealtimeServerMessage,
	type RealtimeTicket,
} from "@day-one/contracts/realtime";
import type { AppDatabase } from "@day-one/db";
import type { ServerWebSocket, WebSocketHandler } from "bun";
import { AppError } from "./errors";
import { requireWorkspaceAccess } from "./permissions";

export type Change =
	| { audience: "workspace"; workspaceId: string; actorId: string; targets: ChangeTarget[] }
	// Private data, such as a user's conversations, reaches only that user's sockets.
	| {
			audience: "user";
			userId: string;
			workspaceId: string;
			actorId: string;
			targets: ChangeTarget[];
	  };
/** Call after the write is committed. Never throws: a failed notification must not fail a saved write. */
export type Publish = (change: Change) => void;

export type SocketData = {
	id: string;
	user: User;
	subscriptions: Set<string>;
	windowStart: number;
	messages: number;
	badMessages: number;
	expiry: ReturnType<typeof setTimeout> | null;
};
type Socket = ServerWebSocket<SocketData>;

export type RealtimeHubOptions = {
	db: AppDatabase;
	now?: () => number;
	ticketTtlMs?: number;
	/** Sockets reauthenticate through a fresh ticket after this long. */
	sessionMs?: number;
	revalidateMs?: number;
	maxTickets?: number;
	maxTicketsPerUser?: number;
	maxSubscriptions?: number;
	messagesPerWindow?: number;
	windowMs?: number;
	maxBadMessages?: number;
	onError?: (error: unknown) => void;
};

export function createRealtimeHub({
	db,
	now = Date.now,
	ticketTtlMs = 30_000,
	sessionMs = 15 * 60_000,
	revalidateMs = 30_000,
	maxTickets = 10_000,
	maxTicketsPerUser = 20,
	maxSubscriptions = 20,
	messagesPerWindow = 40,
	windowMs = 10_000,
	maxBadMessages = 5,
	onError = () => {},
}: RealtimeHubOptions) {
	const tickets = new Map<string, { user: User; expiresAt: number }>();
	const rooms = new Map<string, Set<Socket>>();
	const sockets = new Set<Socket>();
	let sweep: ReturnType<typeof setInterval> | null = null;
	let nextId = 1;

	// SQLite reads are synchronous, so a check and the send that follows cannot interleave with a revoke.
	function isMember(workspaceId: string, userId: string) {
		try {
			requireWorkspaceAccess({ db, workspaceId, userId, required: "viewer" });
			return true;
		} catch (error) {
			if (error instanceof AppError) return false;
			throw error;
		}
	}

	function send(ws: Socket, message: RealtimeServerMessage) {
		if (ws.readyState !== 1) return;
		// 0 means Bun dropped the frame. Close so the client reconnects and refetches what it missed.
		if (ws.send(JSON.stringify(message)) === 0)
			ws.close(RealtimeClose.slowConsumer, "slow consumer");
	}

	function presenceOf(workspaceId: string): PresenceUser[] {
		const users = new Map<string, PresenceUser>();
		for (const ws of rooms.get(workspaceId) ?? [])
			users.set(ws.data.user.id, { userId: ws.data.user.id, name: ws.data.user.name });
		return [...users.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	// Recipients and listed users are rechecked first, so a revoked member neither receives nor
	// appears in presence even before the next write or sweep.
	function broadcastPresence(workspaceId: string) {
		if (!rooms.has(workspaceId)) return;
		evictRevoked(workspaceId);
		const room = rooms.get(workspaceId);
		if (!room) return;
		const users = presenceOf(workspaceId);
		for (const ws of room) send(ws, { type: "presence", workspaceId, users });
	}

	function leave(ws: Socket, workspaceId: string) {
		const room = rooms.get(workspaceId);
		room?.delete(ws);
		if (room?.size === 0) rooms.delete(workspaceId);
		ws.data.subscriptions.delete(workspaceId);
		if (!rooms.size && sweep) {
			clearInterval(sweep);
			sweep = null;
		}
	}

	/** Removes sockets whose user lost access. Returns whether anyone was evicted. */
	function evictRevoked(workspaceId: string) {
		const room = rooms.get(workspaceId);
		if (!room) return false;
		const access = new Map<string, boolean>();
		let evicted = false;
		for (const ws of [...room]) {
			const userId = ws.data.user.id;
			if (!access.has(userId)) access.set(userId, isMember(workspaceId, userId));
			if (access.get(userId)) continue;
			leave(ws, workspaceId);
			send(ws, { type: "unsubscribed", workspaceId, reason: "revoked" });
			evicted = true;
		}
		return evicted;
	}

	function revalidateAll() {
		try {
			for (const workspaceId of [...rooms.keys()])
				if (evictRevoked(workspaceId)) broadcastPresence(workspaceId);
		} catch (error) {
			onError(error);
		}
	}

	function subscribe(ws: Socket, workspaceId: string) {
		if (ws.data.subscriptions.has(workspaceId))
			return send(ws, { type: "subscribed", workspaceId });
		if (ws.data.subscriptions.size >= maxSubscriptions)
			return send(ws, { type: "error", code: "too_many_subscriptions", workspaceId });
		if (!isMember(workspaceId, ws.data.user.id))
			return send(ws, { type: "error", code: "forbidden", workspaceId });
		let room = rooms.get(workspaceId);
		if (!room) rooms.set(workspaceId, (room = new Set()));
		room.add(ws);
		ws.data.subscriptions.add(workspaceId);
		sweep ??= setInterval(revalidateAll, revalidateMs);
		// Acknowledge after admission: the client refetches now and cannot miss a write in between.
		send(ws, { type: "subscribed", workspaceId });
		broadcastPresence(workspaceId);
	}

	function handle(ws: Socket, raw: string | Buffer) {
		const time = now();
		if (time - ws.data.windowStart >= windowMs) {
			ws.data.windowStart = time;
			ws.data.messages = 0;
		}
		if (++ws.data.messages > messagesPerWindow)
			return ws.close(RealtimeClose.policy, "too many messages");
		let parsed: ReturnType<typeof RealtimeClientMessageSchema.safeParse> | null = null;
		try {
			parsed = RealtimeClientMessageSchema.safeParse(
				JSON.parse(typeof raw === "string" ? raw : raw.toString("utf8")),
			);
		} catch {}
		if (!parsed?.success) {
			if (++ws.data.badMessages >= maxBadMessages)
				return ws.close(RealtimeClose.policy, "too many invalid messages");
			return send(ws, { type: "error", code: "bad_message" });
		}
		const message = parsed.data;
		if (message.type === "ping") return send(ws, { type: "pong" });
		if (message.type === "subscribe") return subscribe(ws, message.workspaceId);
		if (ws.data.subscriptions.has(message.workspaceId)) {
			leave(ws, message.workspaceId);
			broadcastPresence(message.workspaceId);
		}
		send(ws, { type: "unsubscribed", workspaceId: message.workspaceId, reason: "requested" });
	}

	const websocket: WebSocketHandler<SocketData> = {
		maxPayloadLength: 4 * 1024,
		// Clients ping every 25 seconds; Bun also sends protocol pings to detect dead peers.
		idleTimeout: 60,
		sendPings: true,
		backpressureLimit: 64 * 1024,
		closeOnBackpressureLimit: true,
		open(ws) {
			sockets.add(ws);
			ws.data.expiry = setTimeout(
				() => ws.close(RealtimeClose.reauthenticate, "reauthenticate"),
				sessionMs,
			);
			send(ws, {
				type: "ready",
				userId: ws.data.user.id,
				expiresAt: new Date(now() + sessionMs).toISOString(),
			});
		},
		message(ws, raw) {
			try {
				handle(ws, raw);
			} catch (error) {
				onError(error);
				ws.close(RealtimeClose.policy, "message failed");
			}
		},
		close(ws) {
			sockets.delete(ws);
			if (ws.data.expiry) clearTimeout(ws.data.expiry);
			try {
				for (const workspaceId of [...ws.data.subscriptions]) {
					leave(ws, workspaceId);
					broadcastPresence(workspaceId);
				}
			} catch (error) {
				onError(error);
			}
		},
	};

	function purgeTickets(time: number) {
		for (const [ticket, entry] of tickets) if (entry.expiresAt <= time) tickets.delete(ticket);
	}

	return {
		websocket,
		/** Issues a single-use ticket for a user the HTTP middleware already authenticated. */
		issueTicket(user: User): RealtimeTicket {
			const time = now();
			purgeTickets(time);
			let outstanding = 0;
			for (const entry of tickets.values()) if (entry.user.id === user.id) outstanding++;
			if (outstanding >= maxTicketsPerUser || tickets.size >= maxTickets)
				throw new AppError(503, "Live updates are busy. Try again shortly.");
			const ticket = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
			const expiresAt = time + ticketTtlMs;
			tickets.set(ticket, { user, expiresAt });
			return { ticket, expiresAt: new Date(expiresAt).toISOString() };
		},
		/** Consumes a ticket. Lookup and delete run in one synchronous step, so a ticket works once. */
		redeem(ticket: string): User | null {
			const entry = tickets.get(ticket);
			tickets.delete(ticket);
			return entry && entry.expiresAt > now() ? entry.user : null;
		},
		socketData(user: User): SocketData {
			return {
				id: String(nextId++),
				user,
				subscriptions: new Set(),
				windowStart: now(),
				messages: 0,
				badMessages: 0,
				expiry: null,
			};
		},
		publish: ((change) => {
			try {
				if (!rooms.has(change.workspaceId)) return;
				const message: RealtimeServerMessage = {
					type: "changed",
					workspaceId: change.workspaceId,
					actorId: change.actorId,
					targets: change.targets,
				};
				const evicted = evictRevoked(change.workspaceId);
				for (const ws of rooms.get(change.workspaceId) ?? [])
					if (change.audience === "workspace" || ws.data.user.id === change.userId)
						send(ws, message);
				if (evicted) broadcastPresence(change.workspaceId);
			} catch (error) {
				onError(error);
			}
		}) satisfies Publish,
		/** Rechecks every room now; also runs on an interval while any room exists. */
		revalidate: revalidateAll,
		connectionCount: () => sockets.size,
		close() {
			if (sweep) clearInterval(sweep);
			sweep = null;
			for (const ws of [...sockets]) {
				if (ws.data.expiry) clearTimeout(ws.data.expiry);
				ws.close(RealtimeClose.goingAway, "server stopping");
			}
			sockets.clear();
			rooms.clear();
			tickets.clear();
		},
	};
}
export type RealtimeHub = ReturnType<typeof createRealtimeHub>;
