import { afterEach, expect, test } from "bun:test";
import {
	REALTIME_PROTOCOL,
	REALTIME_TICKET_PREFIX,
	RealtimeClose,
	type RealtimeServerMessage,
	RealtimeServerMessageSchema,
	RealtimeTicketSchema,
} from "@day-one/contracts/realtime";
import { memberships } from "@day-one/db";
import type { RealtimeHubOptions } from "@day-one/server/realtime";
import { createFeatureFixture } from "@day-one/server/testing";
import { and, eq } from "drizzle-orm";
import { createApp } from "../src/app";

const ORIGIN = "http://web.test:5173";
const stops: Array<() => Promise<void>> = [];
afterEach(async () => {
	for (const stop of stops.splice(0).reverse()) await stop();
});

function stack(realtime: Omit<RealtimeHubOptions, "db"> = {}) {
	const fixture = createFeatureFixture(() => {});
	const created = createApp({
		db: fixture.db,
		auth: { mode: "dev" },
		log: () => {},
		origins: { origins: [ORIGIN], sameOrigin: false },
		realtime,
		chatStatus: async () => ({ available: false, message: "fixture" }),
	});
	const server = Bun.serve({
		port: 0,
		hostname: "127.0.0.1",
		fetch: created.app.fetch,
		websocket: created.realtime.websocket,
	});
	stops.push(async () => {
		created.abortActive();
		created.realtime.close();
		await server.stop(true);
	});
	const base = `http://127.0.0.1:${server.port}`;
	return {
		...created,
		db: fixture.db,
		base,
		post: (path: string, user: string, body: unknown = {}) =>
			fetch(base + path, {
				method: "POST",
				headers: { "x-dev-user": user, "content-type": "application/json" },
				body: JSON.stringify(body),
			}),
		async ticket(user: string) {
			const response = await fetch(`${base}/api/realtime/ticket`, {
				method: "POST",
				headers: { "x-dev-user": user },
			});
			expect(response.status).toBe(200);
			return RealtimeTicketSchema.parse(await response.json()).ticket;
		},
	};
}
type Stack = ReturnType<typeof stack>;

type Peer = Awaited<ReturnType<typeof connect>>;
// Bun's client accepts headers, which lets tests act as a browser page from a given origin.
function connect(
	s: Stack,
	ticket: string | null,
	{ origin = ORIGIN, protocols }: { origin?: string | null; protocols?: string[] } = {},
) {
	const messages: RealtimeServerMessage[] = [];
	const waiters = new Set<() => void>();
	const ws = new WebSocket(`${s.base.replace("http", "ws")}/api/realtime`, {
		protocols: protocols ?? [
			REALTIME_PROTOCOL,
			...(ticket ? [REALTIME_TICKET_PREFIX + ticket] : []),
		],
		headers: origin ? { Origin: origin } : {},
	} as unknown as string[]);
	const closed = new Promise<{ code: number; opened: boolean }>((resolve) => {
		let opened = false;
		ws.onopen = () => {
			opened = true;
		};
		ws.onclose = (event) => resolve({ code: event.code, opened });
	});
	ws.onmessage = (event) => {
		messages.push(RealtimeServerMessageSchema.parse(JSON.parse(String(event.data))));
		for (const wake of waiters) wake();
	};
	const peer = {
		ws,
		messages,
		closed,
		send: (message: unknown) => ws.send(JSON.stringify(message)),
		/** Resolves with the first message (after `from`) that matches. */
		waitFor<T extends RealtimeServerMessage["type"]>(
			type: T,
			match: (message: Extract<RealtimeServerMessage, { type: T }>) => boolean = () => true,
			from = 0,
		) {
			return new Promise<Extract<RealtimeServerMessage, { type: T }>>((resolve, reject) => {
				const timer = setTimeout(() => {
					waiters.delete(check);
					reject(new Error(`Timed out waiting for ${type}`));
				}, 2000);
				function check() {
					const found = messages
						.slice(from)
						.find(
							(m): m is Extract<RealtimeServerMessage, { type: T }> =>
								m.type === type && match(m as Extract<RealtimeServerMessage, { type: T }>),
						);
					if (!found) return;
					clearTimeout(timer);
					waiters.delete(check);
					resolve(found);
				}
				waiters.add(check);
				check();
			});
		},
		/** Waits for the socket's current queue to drain, so absence assertions are meaningful. */
		async settle() {
			const before = messages.length;
			peer.send({ type: "ping" });
			await peer.waitFor("pong", () => true, before);
		},
	};
	return peer;
}
async function join(s: Stack, user: string, workspaceId = "studio") {
	const peer = connect(s, await s.ticket(user));
	await peer.waitFor("ready");
	peer.send({ type: "subscribe", workspaceId });
	await peer.waitFor("subscribed", (m) => m.workspaceId === workspaceId);
	return peer;
}
const changes = (peer: Peer) => peer.messages.filter((m) => m.type === "changed");
const latestPresence = (peer: Peer) =>
	peer.messages.findLast((m) => m.type === "presence")?.users.map((u) => u.userId);

test("only a signed-in user gets a ticket, and plain HTTP cannot open the socket", async () => {
	const s = stack();
	expect((await fetch(`${s.base}/api/realtime/ticket`, { method: "POST" })).status).toBe(401);
	await s.ticket("alex");
	const plain = await fetch(`${s.base}/api/realtime`, { headers: { Origin: ORIGIN } });
	expect(plain.status).toBe(400);
});

test("the upgrade needs an allowed Origin and an unused, unexpired ticket", async () => {
	let clock = Date.now();
	const s = stack({ now: () => clock });
	const refused = async (peer: Peer) => expect((await peer.closed).opened).toBe(false);
	await refused(connect(s, await s.ticket("alex"), { origin: "http://evil.test" }));
	await refused(connect(s, await s.ticket("alex"), { origin: null }));
	await refused(connect(s, null));
	await refused(
		connect(s, null, { protocols: [REALTIME_PROTOCOL, `${REALTIME_TICKET_PREFIX}forged-ticket`] }),
	);
	// Without the app protocol the ticket is not accepted.
	await refused(
		connect(s, null, { protocols: [`${REALTIME_TICKET_PREFIX}${await s.ticket("alex")}`] }),
	);
	const once = await s.ticket("alex");
	const first = connect(s, once);
	expect((await first.waitFor("ready")).userId).toBe("alex");
	expect(first.ws.protocol).toBe(REALTIME_PROTOCOL);
	await refused(connect(s, once));
	const late = await s.ticket("alex");
	clock += 31_000;
	await refused(connect(s, late));
});

test("a note write reaches every member in the workspace and nobody outside it", async () => {
	const s = stack();
	const alex = await join(s, "alex");
	const sam = await join(s, "sam");
	const casey = await join(s, "casey", "sandbox");
	const outsider = connect(s, await s.ticket("casey"));
	await outsider.waitFor("ready");
	outsider.send({ type: "subscribe", workspaceId: "studio" });
	expect((await outsider.waitFor("error")).code).toBe("forbidden");

	expect((await s.post("/api/workspaces/studio/notes", "alex", { text: "Live" })).status).toBe(201);
	for (const peer of [alex, sam])
		expect(await peer.waitFor("changed")).toEqual({
			type: "changed",
			workspaceId: "studio",
			actorId: "alex",
			targets: [{ family: "notes" }],
		});
	await Promise.all([casey.settle(), outsider.settle()]);
	expect(changes(casey)).toEqual([]);
	expect(changes(outsider)).toEqual([]);
	// A rejected write tells nobody.
	expect((await s.post("/api/workspaces/studio/notes", "sam", { text: "no" })).status).toBe(403);
	await sam.settle();
	expect(changes(sam)).toHaveLength(1);
});

test("private conversation changes reach only their owner's sockets", async () => {
	const s = stack();
	const alex = await join(s, "alex");
	const alexOtherTab = await join(s, "alex");
	const sam = await join(s, "sam");
	expect((await s.post("/api/workspaces/studio/conversations", "alex")).status).toBe(201);
	for (const tab of [alex, alexOtherTab])
		expect((await tab.waitFor("changed")).targets).toEqual([{ family: "conversations" }]);
	await sam.settle();
	expect(changes(sam)).toEqual([]);
});

test("presence lists each member once and follows tabs closing", async () => {
	const s = stack();
	const alex = await join(s, "alex");
	const alexOtherTab = await join(s, "alex");
	const sam = await join(s, "sam");
	await sam.waitFor("presence", (m) => m.users.length === 2);
	expect(latestPresence(sam)).toEqual(["alex", "sam"]);
	alexOtherTab.ws.close();
	await alexOtherTab.closed;
	await sam.settle();
	expect(latestPresence(sam)).toEqual(["alex", "sam"]);
	alex.ws.close();
	await sam.waitFor("presence", (m) => m.users.length === 1);
	expect(latestPresence(sam)).toEqual(["sam"]);
	// Unsubscribing leaves the room without closing the socket.
	const before = sam.messages.length;
	sam.send({ type: "unsubscribe", workspaceId: "studio" });
	expect((await sam.waitFor("unsubscribed", () => true, before)).reason).toBe("requested");
});

test("a revoked member is evicted before the next change and drops out of presence", async () => {
	const s = stack();
	const alex = await join(s, "alex");
	const sam = await join(s, "sam");
	await alex.waitFor("presence", (m) => m.users.length === 2);
	s.db
		.delete(memberships)
		.where(and(eq(memberships.userId, "sam"), eq(memberships.workspaceId, "studio")))
		.run();
	expect((await s.post("/api/workspaces/studio/notes", "alex", { text: "Secret" })).status).toBe(
		201,
	);
	expect((await sam.waitFor("unsubscribed")).reason).toBe("revoked");
	await alex.waitFor("presence", (m) => m.users.length === 1);
	await sam.settle();
	expect(changes(sam)).toEqual([]);
	sam.send({ type: "subscribe", workspaceId: "studio" });
	expect((await sam.waitFor("error")).code).toBe("forbidden");
});

test("a join rechecks presence, so a revoked member neither receives nor appears in it", async () => {
	const s = stack();
	const alex = await join(s, "alex");
	const sam = await join(s, "sam");
	await alex.waitFor("presence", (m) => m.users.length === 2);
	s.db.delete(memberships).where(eq(memberships.userId, "sam")).run();
	const jordan = await join(s, "jordan");
	expect((await sam.waitFor("unsubscribed")).reason).toBe("revoked");
	await jordan.waitFor("presence", (m) => m.users.length === 2);
	expect(latestPresence(jordan)).toEqual(["alex", "jordan"]);
	await sam.settle();
	expect(
		sam.messages.some((m) => m.type === "presence" && m.users.some((u) => u.userId === "jordan")),
	).toBe(false);
});

test("quiet rooms are revalidated without waiting for a write", async () => {
	const s = stack();
	const sam = await join(s, "sam");
	s.db.delete(memberships).where(eq(memberships.userId, "sam")).run();
	s.realtime.revalidate();
	expect((await sam.waitFor("unsubscribed")).reason).toBe("revoked");
});

test("malformed and excessive messages close the socket with a policy error", async () => {
	const s = stack({ messagesPerWindow: 10 });
	const noisy = connect(s, await s.ticket("alex"));
	await noisy.waitFor("ready");
	for (let i = 0; i < 4; i++) noisy.ws.send(i % 2 ? "{" : JSON.stringify({ type: "shout" }));
	await noisy.waitFor("error", (m) => m.code === "bad_message");
	noisy.ws.send("not json");
	expect((await noisy.closed).code).toBe(RealtimeClose.policy);

	const flood = connect(s, await s.ticket("alex"));
	await flood.waitFor("ready");
	for (let i = 0; i < 11; i++) flood.send({ type: "ping" });
	expect((await flood.closed).code).toBe(RealtimeClose.policy);
});

test("sockets must reauthenticate after their session lifetime", async () => {
	const s = stack({ sessionMs: 100 });
	const peer = connect(s, await s.ticket("alex"));
	await peer.waitFor("ready");
	expect((await peer.closed).code).toBe(RealtimeClose.reauthenticate);
});

test("shutting the hub down closes open sockets as going away", async () => {
	const s = stack();
	const peer = await join(s, "alex");
	s.realtime.close();
	expect((await peer.closed).code).toBe(RealtimeClose.goingAway);
	expect(s.realtime.connectionCount()).toBe(0);
});
