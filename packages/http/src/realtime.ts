// Browser live-update transport, adapted from Tectonic apps/web/src/lib/realtime.ts.
// It gets a one-time ticket through the shared HTTP client, reconnects with capped jittered backoff,
// detects silent drops with a heartbeat and re-subscribes after every connection.
import {
	type PresenceUser,
	REALTIME_PROTOCOL,
	REALTIME_TICKET_PATH,
	REALTIME_TICKET_PREFIX,
	type RealtimeClientMessage,
	RealtimeClose,
	type RealtimeServerMessage,
	RealtimeServerMessageSchema,
	RealtimeTicketSchema,
} from "@day-one/contracts/realtime";
import { type ApiClient, ApiError } from "./index";

export type RealtimeStatus = "connecting" | "online" | "reconnecting" | "offline";
export type ChangedMessage = Extract<RealtimeServerMessage, { type: "changed" }>;
type SocketLike = {
	readonly readyState: number;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	onopen: ((event: Event) => void) | null;
	onmessage: ((event: MessageEvent) => void) | null;
	onclose: ((event: CloseEvent) => void) | null;
	onerror: ((event: Event) => void) | null;
};
type BrowserEvents = Pick<Window, "addEventListener" | "removeEventListener">;

export type RealtimeHandlers = {
	onStatus?: (status: RealtimeStatus) => void;
	/** The server admitted this subscription; refetch now so nothing written before it is missed. */
	onSubscribed?: (workspaceId: string) => void;
	onChanged?: (message: ChangedMessage) => void;
	onPresence?: (workspaceId: string, users: PresenceUser[]) => void;
	/** Access was refused or removed; drop presence and refresh memberships. */
	onRevoked?: (workspaceId: string) => void;
};

export type RealtimeOptions = RealtimeHandlers & {
	client: ApiClient;
	url: string;
	WebSocket?: new (url: string, protocols: string[]) => SocketLike;
	/** Browser online/offline events; null disables them in tests. */
	events?: BrowserEvents | null;
	baseDelayMs?: number;
	maxDelayMs?: number;
	pingMs?: number;
	pongTimeoutMs?: number;
	random?: () => number;
};

export function createRealtimeClient(options: RealtimeOptions) {
	const {
		client,
		url,
		baseDelayMs = 500,
		maxDelayMs = 15_000,
		pingMs = 25_000,
		pongTimeoutMs = 10_000,
		random = Math.random,
	} = options;
	const Socket = options.WebSocket ?? globalThis.WebSocket;
	const events =
		options.events === undefined ? (typeof window === "undefined" ? null : window) : options.events;
	const subscriptions = new Map<string, number>();
	let status: RealtimeStatus = "offline";
	let running = false;
	// Every start/stop/reconnect bumps the generation; callbacks from an older one are ignored.
	let generation = 0;
	let socket: SocketLike | null = null;
	let ready = false;
	let hadSession = false;
	let attempt = 0;
	let ticketRequest: AbortController | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let pingTimer: ReturnType<typeof setInterval> | null = null;
	let pongTimer: ReturnType<typeof setTimeout> | null = null;

	function setStatus(next: RealtimeStatus) {
		if (status === next) return;
		status = next;
		options.onStatus?.(next);
	}
	function send(message: RealtimeClientMessage) {
		if (ready && socket?.readyState === 1) socket.send(JSON.stringify(message));
	}
	function stopHeartbeat() {
		if (pingTimer) clearInterval(pingTimer);
		if (pongTimer) clearTimeout(pongTimer);
		pingTimer = pongTimer = null;
	}
	function discardSocket(code: number, reason: string) {
		const current = socket;
		socket = null;
		ready = false;
		stopHeartbeat();
		if (!current) return;
		current.onopen = current.onmessage = current.onclose = current.onerror = null;
		try {
			current.close(code, reason);
		} catch {}
	}
	/** A planned re-login keeps the current status: the page should not flash "Reconnecting". */
	function scheduleReconnect(immediate = false, planned = false) {
		if (!running) return;
		generation++;
		ticketRequest?.abort();
		ticketRequest = null;
		if (!planned) setStatus(hadSession ? "reconnecting" : "connecting");
		const delay = immediate
			? 0
			: Math.min(maxDelayMs, baseDelayMs * 2 ** Math.min(attempt, 8)) * (0.75 + random() * 0.5);
		attempt++;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			void connect(planned);
		}, delay);
	}
	function handle(raw: unknown) {
		let parsed: ReturnType<typeof RealtimeServerMessageSchema.safeParse>;
		try {
			parsed = RealtimeServerMessageSchema.safeParse(JSON.parse(String(raw)));
		} catch {
			return;
		}
		if (!parsed.success) return;
		const message = parsed.data;
		switch (message.type) {
			case "ready":
				ready = true;
				hadSession = true;
				attempt = 0;
				setStatus("online");
				for (const workspaceId of subscriptions.keys()) send({ type: "subscribe", workspaceId });
				pingTimer = setInterval(() => {
					send({ type: "ping" });
					pongTimer ??= setTimeout(() => {
						discardSocket(RealtimeClose.normal, "heartbeat timeout");
						scheduleReconnect();
					}, pongTimeoutMs);
				}, pingMs);
				return;
			case "pong":
				if (pongTimer) clearTimeout(pongTimer);
				pongTimer = null;
				return;
			case "subscribed":
				if (subscriptions.has(message.workspaceId)) options.onSubscribed?.(message.workspaceId);
				return;
			case "unsubscribed":
				if (message.reason === "revoked") options.onRevoked?.(message.workspaceId);
				return;
			case "changed":
				if (subscriptions.has(message.workspaceId)) options.onChanged?.(message);
				return;
			case "presence":
				if (subscriptions.has(message.workspaceId))
					options.onPresence?.(message.workspaceId, message.users);
				return;
			case "error":
				if (message.code === "forbidden" && message.workspaceId)
					options.onRevoked?.(message.workspaceId);
				return;
		}
	}
	async function connect(planned = false) {
		if (!running) return;
		const current = ++generation;
		if (!planned) setStatus(hadSession ? "reconnecting" : "connecting");
		const request = new AbortController();
		ticketRequest = request;
		let ticket: string;
		try {
			ticket = (
				await client.json(REALTIME_TICKET_PATH, RealtimeTicketSchema, {
					method: "POST",
					signal: request.signal,
				})
			).ticket;
		} catch (error) {
			if (current !== generation) return;
			// The shared client already reported the expired session; reconnect after sign-in.
			if (error instanceof ApiError && error.status === 401) {
				running = false;
				setStatus("offline");
				return;
			}
			return scheduleReconnect();
		}
		if (current !== generation) return;
		ticketRequest = null;
		let next: SocketLike;
		try {
			next = new Socket(url, [REALTIME_PROTOCOL, REALTIME_TICKET_PREFIX + ticket]);
		} catch {
			return scheduleReconnect();
		}
		socket = next;
		next.onmessage = (event) => {
			if (socket === next) handle(event.data);
		};
		next.onclose = (event) => {
			if (socket !== next) return;
			socket = null;
			ready = false;
			stopHeartbeat();
			// The server asks for a fresh ticket when a socket's sign-in lifetime ends.
			const planned = event.code === RealtimeClose.reauthenticate;
			scheduleReconnect(planned, planned);
		};
		next.onerror = () => {};
	}
	const onOffline = () => {
		if (!running) return;
		discardSocket(RealtimeClose.normal, "browser offline");
		scheduleReconnect();
	};
	const onOnline = () => {
		if (!running || socket) return;
		attempt = 0;
		scheduleReconnect(true);
	};

	return {
		get status() {
			return status;
		},
		start() {
			if (running) return;
			running = true;
			events?.addEventListener("offline", onOffline);
			events?.addEventListener("online", onOnline);
			void connect();
		},
		/** Cancels the ticket request, closes the socket and silences every pending callback. */
		stop() {
			running = false;
			generation++;
			ticketRequest?.abort();
			ticketRequest = null;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			reconnectTimer = null;
			events?.removeEventListener("offline", onOffline);
			events?.removeEventListener("online", onOnline);
			discardSocket(RealtimeClose.normal, "client closed");
			hadSession = false;
			attempt = 0;
			setStatus("offline");
		},
		/** Reference counted; returns an idempotent release function. */
		subscribe(workspaceId: string) {
			const count = subscriptions.get(workspaceId) ?? 0;
			subscriptions.set(workspaceId, count + 1);
			if (count === 0) send({ type: "subscribe", workspaceId });
			let released = false;
			return () => {
				if (released) return;
				released = true;
				const remaining = (subscriptions.get(workspaceId) ?? 1) - 1;
				if (remaining > 0) return void subscriptions.set(workspaceId, remaining);
				subscriptions.delete(workspaceId);
				send({ type: "unsubscribe", workspaceId });
			};
		},
	};
}
export type RealtimeClient = ReturnType<typeof createRealtimeClient>;
