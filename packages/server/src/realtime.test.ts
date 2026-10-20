import { expect, test } from "bun:test";
import { demoUsers } from "@day-one/contracts";
import { RealtimeTicketSchema } from "@day-one/contracts/realtime";
import { createRealtimeHub } from "./realtime";
import { createFeatureFixture } from "./testing";

const [alex, sam] = demoUsers as [(typeof demoUsers)[number], (typeof demoUsers)[number]];

function hub(
	options: { now?: () => number; maxTicketsPerUser?: number; maxTickets?: number } = {},
) {
	return createRealtimeHub({ db: createFeatureFixture(() => {}).db, ...options });
}

test("tickets are random, well formed, bound to their user and work exactly once", () => {
	const realtime = hub();
	const first = realtime.issueTicket(alex);
	const second = realtime.issueTicket(alex);
	expect(RealtimeTicketSchema.parse(first)).toEqual(first);
	expect(first.ticket).not.toBe(second.ticket);
	expect(realtime.redeem(first.ticket)).toEqual(alex);
	expect(realtime.redeem(first.ticket)).toBeNull();
	expect(realtime.redeem("not-a-ticket")).toBeNull();
	expect(realtime.redeem(second.ticket)?.id).toBe("alex");
});

test("tickets expire on the server clock and expired tickets stop counting", () => {
	let clock = 1_000;
	const realtime = hub({ now: () => clock, maxTicketsPerUser: 2 });
	const ticket = realtime.issueTicket(alex).ticket;
	clock += 30_000;
	expect(realtime.redeem(ticket)).toBeNull();
	realtime.issueTicket(alex);
	realtime.issueTicket(alex);
	expect(() => realtime.issueTicket(alex)).toThrow("busy");
	// One user's pending tickets cannot block another user.
	expect(realtime.issueTicket(sam).ticket).toBeTruthy();
	clock += 30_000;
	expect(realtime.issueTicket(alex).ticket).toBeTruthy();
});

test("the ticket store is bounded across users", () => {
	const realtime = hub({ maxTickets: 2 });
	realtime.issueTicket(alex);
	realtime.issueTicket(sam);
	expect(() => realtime.issueTicket(alex)).toThrow("busy");
	realtime.close();
	expect(realtime.issueTicket(alex).ticket).toBeTruthy();
});

test("publishing to a workspace nobody follows is a no-op and never throws", () => {
	const realtime = hub();
	expect(() =>
		realtime.publish({
			audience: "workspace",
			workspaceId: "studio",
			actorId: "alex",
			targets: [{ family: "notes" }],
		}),
	).not.toThrow();
});
