import { expect, test } from "bun:test";
import {
	REALTIME_PROTOCOL,
	REALTIME_TICKET_PREFIX,
	RealtimeClose,
	type RealtimeServerMessage,
} from "@day-one/contracts/realtime";
import { createApiClient } from "./index";
import { createRealtimeClient, type RealtimeOptions, type RealtimeStatus } from "./realtime";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean, label: string) {
	for (let i = 0; i < 200; i++) {
		if (check()) return;
		await sleep(2);
	}
	throw new Error(`Timed out: ${label}`);
}

class FakeSocket {
	readyState = 0;
	sent: unknown[] = [];
	closedWith: number | null = null;
	onopen: ((event: Event) => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onclose: ((event: CloseEvent) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	constructor(
		readonly url: string,
		readonly protocols: string[],
	) {}
	send(data: string) {
		this.sent.push(JSON.parse(data));
	}
	close(code = 1000) {
		this.readyState = 3;
		this.closedWith = code;
	}
	ready(userId = "alex") {
		this.readyState = 1;
		this.receive({ type: "ready", userId, expiresAt: new Date().toISOString() });
	}
	receive(message: RealtimeServerMessage | string) {
		this.onmessage?.({
			data: typeof message === "string" ? message : JSON.stringify(message),
		} as MessageEvent);
	}
	drop(code = 1006) {
		this.readyState = 3;
		this.onclose?.({ code } as CloseEvent);
	}
}

function harness(options: Partial<RealtimeOptions> & { ticketStatus?: () => number } = {}) {
	const sockets: FakeSocket[] = [];
	const statuses: RealtimeStatus[] = [];
	const calls = { tickets: 0, subscribed: [] as string[], changed: 0, revoked: [] as string[] };
	let ticketSignal: AbortSignal | undefined;
	let release: (() => void) | null = null;
	const events = new EventTarget();
	const client = createApiClient({
		headers: async () => ({ "x-dev-user": "alex" }),
		fetch: async (_url, init) => {
			calls.tickets++;
			ticketSignal = init?.signal ?? undefined;
			if (options.ticketStatus?.() === -1)
				await new Promise<void>((resolve) => {
					release = resolve;
				});
			const status = options.ticketStatus?.() ?? 200;
			if (status !== 200 && status !== -1)
				return Response.json({ code: "UNAUTHENTICATED", message: "Sign in." }, { status });
			return Response.json({
				ticket: `t${calls.tickets}`.padEnd(40, "x"),
				expiresAt: new Date(Date.now() + 30_000).toISOString(),
			});
		},
	});
	const realtime = createRealtimeClient({
		client,
		url: "ws://app.test/api/realtime",
		WebSocket: class extends FakeSocket {
			constructor(url: string, protocols: string[]) {
				super(url, protocols);
				sockets.push(this);
			}
		},
		events,
		baseDelayMs: 1,
		maxDelayMs: 5,
		random: () => 0.5,
		onStatus: (status) => statuses.push(status),
		onSubscribed: (id) => calls.subscribed.push(id),
		onChanged: () => calls.changed++,
		onRevoked: (id) => calls.revoked.push(id),
		...options,
	});
	return {
		realtime,
		sockets,
		statuses,
		calls,
		events,
		ticketSignal: () => ticketSignal,
		releaseTicket: () => release?.(),
		latest: () => {
			const socket = sockets.at(-1);
			if (!socket) throw new Error("No socket");
			return socket;
		},
	};
}

test("connects with the ticket as a subprotocol and subscribes once ready", async () => {
	const h = harness();
	h.realtime.subscribe("studio");
	h.realtime.start();
	await until(() => h.sockets.length === 1, "socket");
	expect(h.latest().protocols).toEqual([
		REALTIME_PROTOCOL,
		`${REALTIME_TICKET_PREFIX}t1`.padEnd(47, "x"),
	]);
	expect(h.latest().sent).toEqual([]);
	h.latest().ready();
	expect(h.realtime.status).toBe("online");
	expect(h.latest().sent).toEqual([{ type: "subscribe", workspaceId: "studio" }]);
	// Refresh happens on the server's acknowledgement, not on connect.
	expect(h.calls.subscribed).toEqual([]);
	h.latest().receive({ type: "subscribed", workspaceId: "studio" });
	expect(h.calls.subscribed).toEqual(["studio"]);
	expect(h.statuses).toEqual(["connecting", "online"]);
	h.realtime.stop();
});

test("subscriptions are reference counted and release is idempotent", async () => {
	const h = harness();
	h.realtime.start();
	await until(() => h.sockets.length === 1, "socket");
	h.latest().ready();
	const first = h.realtime.subscribe("studio");
	const second = h.realtime.subscribe("studio");
	first();
	first();
	expect(h.latest().sent).toEqual([{ type: "subscribe", workspaceId: "studio" }]);
	second();
	expect(h.latest().sent.at(-1)).toEqual({ type: "unsubscribe", workspaceId: "studio" });
	// Messages for workspaces no longer followed are ignored.
	h.latest().receive({
		type: "changed",
		workspaceId: "studio",
		actorId: "sam",
		targets: [{ family: "notes" }],
	});
	h.latest().receive("not json");
	expect(h.calls.changed).toBe(0);
	h.realtime.stop();
});

test("an unexpected drop reconnects with a fresh ticket and re-subscribes", async () => {
	const h = harness();
	h.realtime.subscribe("studio");
	h.realtime.start();
	await until(() => h.sockets.length === 1, "first socket");
	h.latest().ready();
	h.latest().drop();
	expect(h.realtime.status).toBe("reconnecting");
	await until(() => h.sockets.length === 2, "second socket");
	expect(h.calls.tickets).toBe(2);
	h.latest().ready();
	expect(h.latest().sent).toEqual([{ type: "subscribe", workspaceId: "studio" }]);
	h.latest().receive({ type: "subscribed", workspaceId: "studio" });
	expect(h.calls.subscribed).toEqual(["studio"]);
	expect(h.statuses).toEqual(["connecting", "online", "reconnecting", "online"]);
	h.realtime.stop();
});

test("a missing pong drops the connection and reconnects", async () => {
	const h = harness({ pingMs: 5, pongTimeoutMs: 5 });
	h.realtime.start();
	await until(() => h.sockets.length === 1, "socket");
	h.latest().ready();
	const first = h.latest();
	await until(() => first.closedWith !== null, "heartbeat close");
	expect(first.sent).toContainEqual({ type: "ping" });
	await until(() => h.sockets.length === 2, "reconnect");
	h.realtime.stop();
});

test("an expired session stops reconnecting; other ticket failures retry", async () => {
	let status = 401;
	const h = harness({ ticketStatus: () => status });
	h.realtime.start();
	await until(() => h.realtime.status === "offline" && h.calls.tickets === 1, "offline");
	await sleep(20);
	expect(h.calls.tickets).toBe(1);
	expect(h.sockets).toHaveLength(0);
	status = 503;
	h.realtime.start();
	await until(() => h.calls.tickets >= 3, "retries");
	status = 200;
	await until(() => h.sockets.length === 1, "recovered");
	h.realtime.stop();
});

test("stopping cancels the ticket request and silences late callbacks", async () => {
	let pending = true;
	const h = harness({ ticketStatus: () => (pending ? -1 : 200) });
	h.realtime.start();
	await until(() => h.calls.tickets === 1, "ticket requested");
	h.realtime.stop();
	expect(h.ticketSignal()?.aborted).toBe(true);
	pending = false;
	h.releaseTicket();
	await sleep(10);
	expect(h.sockets).toHaveLength(0);
	expect(h.realtime.status).toBe("offline");

	const live = harness();
	live.realtime.subscribe("studio");
	live.realtime.start();
	await until(() => live.sockets.length === 1, "socket");
	const socket = live.latest();
	socket.ready();
	live.realtime.stop();
	expect(socket.closedWith).toBe(RealtimeClose.normal);
	socket.receive({ type: "subscribed", workspaceId: "studio" });
	socket.drop();
	await sleep(10);
	expect(live.calls.subscribed).toEqual([]);
	expect(live.sockets).toHaveLength(1);
});

test("a reauthentication close reconnects immediately and revocations are reported", async () => {
	const h = harness({ baseDelayMs: 10_000, maxDelayMs: 10_000 });
	h.realtime.subscribe("studio");
	h.realtime.start();
	await until(() => h.sockets.length === 1, "socket");
	h.latest().ready();
	h.latest().receive({ type: "unsubscribed", workspaceId: "studio", reason: "revoked" });
	h.latest().receive({ type: "error", code: "forbidden", workspaceId: "studio" });
	expect(h.calls.revoked).toEqual(["studio", "studio"]);
	h.latest().drop(RealtimeClose.reauthenticate);
	await until(() => h.sockets.length === 2, "immediate reconnect");
	// A planned re-login does not flash "Reconnecting".
	h.latest().ready();
	expect(h.statuses).toEqual(["connecting", "online"]);
	h.realtime.stop();
});

test("browser offline drops the socket and online retries without waiting for backoff", async () => {
	const h = harness({ baseDelayMs: 10_000, maxDelayMs: 10_000 });
	h.realtime.start();
	await until(() => h.sockets.length === 1, "socket");
	h.latest().ready();
	h.events.dispatchEvent(new Event("offline"));
	expect(h.latest().closedWith).toBe(RealtimeClose.normal);
	expect(h.realtime.status).toBe("reconnecting");
	h.events.dispatchEvent(new Event("online"));
	await until(() => h.sockets.length === 2, "online reconnect");
	h.realtime.stop();
	h.events.dispatchEvent(new Event("online"));
	await sleep(10);
	expect(h.sockets).toHaveLength(2);
});
