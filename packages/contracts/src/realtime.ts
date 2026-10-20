import { z } from "zod";

// Realtime messages only say which cached data changed; browsers refetch it through the HTTP API.
export const REALTIME_PATH = "/api/realtime";
export const REALTIME_TICKET_PATH = "/api/realtime/ticket";
export const REALTIME_PROTOCOL = "day-one.realtime.v1";
// The one-time ticket travels as a second subprotocol so it never appears in a URL or request log.
export const REALTIME_TICKET_PREFIX = "ticket.";
export const RealtimeClose = {
	normal: 1000,
	goingAway: 1001,
	policy: 1008,
	reauthenticate: 4000,
	slowConsumer: 4001,
} as const;

const Id = z.string().min(1).max(200);
export const RealtimeTicketSchema = z.object({
	ticket: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
	expiresAt: z.iso.datetime(),
});
export type RealtimeTicket = z.infer<typeof RealtimeTicketSchema>;

/** A query key family, e.g. "notes" invalidates [family, userId, workspaceId] or [family, userId, id]. */
export const ChangeTargetSchema = z.object({
	family: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
	id: Id.optional(),
});
export type ChangeTarget = z.infer<typeof ChangeTargetSchema>;

export const RealtimeClientMessageSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("subscribe"), workspaceId: Id }),
	z.object({ type: z.literal("unsubscribe"), workspaceId: Id }),
	z.object({ type: z.literal("ping") }),
]);
export type RealtimeClientMessage = z.infer<typeof RealtimeClientMessageSchema>;

export const PresenceUserSchema = z.object({ userId: Id, name: z.string().max(200) });
export type PresenceUser = z.infer<typeof PresenceUserSchema>;

export const RealtimeServerMessageSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("ready"), userId: Id, expiresAt: z.iso.datetime() }),
	z.object({ type: z.literal("subscribed"), workspaceId: Id }),
	z.object({
		type: z.literal("unsubscribed"),
		workspaceId: Id,
		reason: z.enum(["requested", "revoked"]),
	}),
	z.object({
		type: z.literal("changed"),
		workspaceId: Id,
		actorId: Id,
		targets: ChangeTargetSchema.array().min(1).max(10),
	}),
	z.object({ type: z.literal("presence"), workspaceId: Id, users: PresenceUserSchema.array() }),
	z.object({ type: z.literal("pong") }),
	z.object({
		type: z.literal("error"),
		code: z.enum(["bad_message", "forbidden", "too_many_subscriptions"]),
		workspaceId: Id.optional(),
	}),
]);
export type RealtimeServerMessage = z.infer<typeof RealtimeServerMessageSchema>;
