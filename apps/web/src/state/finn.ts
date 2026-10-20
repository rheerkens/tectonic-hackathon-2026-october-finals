import { useRef, useState, useSyncExternalStore } from "react";
import { type FinnResult, finnScenarios } from "./finn-scenarios";

/** The shared fixture flow. Conversations live only while app windows remain open. */
export type FinnStatus = "idle" | "thinking" | "searching" | "done" | "waiting";
export type FinnState = {
	status: FinnStatus;
	question: string;
	stepsShown: number;
	result: FinnResult | null;
	message: string;
};
export type FinnTurn = FinnState & { id: string; createdAt: number; revision: number };
export type FinnConversation = { id: string; title: string; createdAt: number; turns: FinnTurn[] };

type Session = { conversations: FinnConversation[]; activeId: string | null; readIds: string[] };
type Message =
	| { kind: "turn"; conversation: Omit<FinnConversation, "turns">; turn: FinnTurn }
	| { kind: "select"; id: string | null }
	| { kind: "read"; ids: string[] }
	| { kind: "snapshot"; session: Session };
const idle: FinnState = { status: "idle", question: "", stepsShown: 0, result: null, message: "" };
let session: Session = { conversations: [], activeId: null, readIds: [] };
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();
const running = new Set<string>();
const busy = (turn: FinnState | undefined) =>
	turn?.status === "thinking" || turn?.status === "searching";
const latest = (conversation?: FinnConversation) => conversation?.turns.at(-1);

function notify() {
	for (const listener of listeners) listener();
}
function apply(message: Message) {
	if (message.kind === "select") session = { ...session, activeId: message.id };
	if (message.kind === "read") {
		session = { ...session, readIds: [...new Set([...session.readIds, ...message.ids])] };
	}
	if (message.kind === "turn") {
		const old = session.conversations.find(
			(conversation) => conversation.id === message.conversation.id,
		);
		const previous = old?.turns.find((turn) => turn.id === message.turn.id);
		if (previous && previous.revision >= message.turn.revision) return;
		const conversation: FinnConversation = {
			...message.conversation,
			turns: [
				...(old?.turns.filter((turn) => turn.id !== message.turn.id) ?? []),
				message.turn,
			].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)),
		};
		session = {
			...session,
			conversations: [
				...session.conversations.filter((item) => item.id !== conversation.id),
				conversation,
			].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)),
		};
		if (busy(message.turn)) void playFixture(conversation.id, message.turn.id);
	}
	if (message.kind === "snapshot") {
		for (const conversation of message.session.conversations) {
			for (const turn of conversation.turns) apply({ kind: "turn", conversation, turn });
		}
		session = {
			...session,
			activeId: session.activeId ?? message.session.activeId,
			readIds: [...new Set([...session.readIds, ...message.session.readIds])],
		};
	}
	notify();
}
function publish(message: Message) {
	apply(message);
	channel?.postMessage(message);
}
function subscribe(listener: () => void) {
	listeners.add(listener);
	if (!channel) {
		channel = new BroadcastChannel("day-one:finn");
		channel.onmessage = (event: MessageEvent<Message | "sync">) => {
			if (event.data === "sync") channel?.postMessage({ kind: "snapshot", session });
			else apply(event.data);
		};
		channel.postMessage("sync");
	}
	return () => listeners.delete(listener);
}

// The demo still matches the existing scenarios; it does not call external tools.
function match(question: string) {
	const text = question.toLowerCase();
	if (/sick/.test(text)) return finnScenarios["d2-sick-leave"];
	if (/november|next month/.test(text)) return finnScenarios["d1-payroll-changes-november"];
	if (/payroll|submit/.test(text)) return finnScenarios["d1-payroll-changes"];
}
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
function findTurn(conversationId: string, turnId: string) {
	return session.conversations
		.find((item) => item.id === conversationId)
		?.turns.find((turn) => turn.id === turnId);
}

async function playFixture(conversationId: string, turnId: string) {
	if (running.has(turnId)) return;
	running.add(turnId);
	try {
		const initial = findTurn(conversationId, turnId);
		if (!initial || !busy(initial)) return;
		const result = match(initial.question);
		const frames: FinnState[] = result
			? [
					...result.steps.map((_, index) => ({
						...idle,
						question: initial.question,
						status: "searching" as const,
						result,
						stepsShown: index + 1,
					})),
					{
						...idle,
						question: initial.question,
						result,
						stepsShown: result.steps.length,
						status: result.nextStep.kind === "contact_person" ? "waiting" : "done",
					},
				]
			: [
					{
						...idle,
						question: initial.question,
						status: "done",
						message: "I can only answer the demo questions right now.",
					},
				];
		for (const [index, frame] of frames.entries()) {
			const revision = index + 1;
			if ((findTurn(conversationId, turnId)?.revision ?? Infinity) >= revision) continue;
			await wait(index === 0 ? 700 : 900);
			const conversation = session.conversations.find((item) => item.id === conversationId);
			const current = findTurn(conversationId, turnId);
			if (!conversation || !current || current.revision >= revision) continue;
			// Idempotent fixture frames let a surviving window continue after another navigates away.
			publish({ kind: "turn", conversation, turn: { ...current, ...frame, revision } });
		}
	} finally {
		running.delete(turnId);
	}
}
function startQuestion(question: string, conversationId: string | null) {
	const text = question.trim();
	let conversation = session.conversations.find((item) => item.id === conversationId);
	if (!text || busy(latest(conversation))) return null;
	conversation ??= { id: crypto.randomUUID(), title: text, createdAt: Date.now(), turns: [] };
	const turn: FinnTurn = {
		...idle,
		id: crypto.randomUUID(),
		createdAt: Date.now(),
		revision: 0,
		question: text,
		status: "thinking",
	};
	publish({ kind: "turn", conversation, turn });
	publish({ kind: "select", id: conversation.id });
	return { conversationId: conversation.id, turnId: turn.id };
}
function selectConversation(id: string | null) {
	if (id === null || session.conversations.some((conversation) => conversation.id === id)) {
		publish({ kind: "select", id });
	}
}
function markRead(id: string) {
	const conversation = session.conversations.find((item) => item.id === id);
	const ids =
		conversation?.turns
			.filter((turn) => !busy(turn) && !session.readIds.includes(turn.id))
			.map((turn) => turn.id) ?? [];
	if (ids.length) publish({ kind: "read", ids });
}

/** Existing consumers follow their own submitted turn even if the mini selects a different chat. */
export function useFinn(followSelection = false) {
	const current = useSyncExternalStore(subscribe, () => session);
	const boundConversation = useRef<string | null>(current.activeId);
	const [request, setRequest] = useState<{ conversationId: string; turnId: string } | null>(null);
	if (boundConversation.current === null && current.activeId !== null)
		boundConversation.current = current.activeId;
	const active = current.conversations.find((item) => item.id === current.activeId);
	const followed =
		!followSelection && request ? findTurn(request.conversationId, request.turnId) : undefined;
	const selected = followed ?? latest(active) ?? idle;
	const pending = current.conversations.flatMap((conversation) => conversation.turns).filter(busy);
	const activity = pending.at(-1) ?? selected;
	const conversations = current.conversations.map((conversation) => ({
		...conversation,
		unread: conversation.turns.some((turn) => !busy(turn) && !current.readIds.includes(turn.id)),
	}));
	return {
		...selected,
		conversations,
		activeConversation: active,
		activeId: current.activeId,
		activity,
		unreadCount: conversations.filter((conversation) => conversation.unread).length,
		selectConversation,
		submitQuestion: startQuestion,
		markRead,
		newChat: () => selectConversation(null),
		reset: () => selectConversation(null),
		ask: async (question: string) => {
			const next = startQuestion(
				question,
				followSelection ? session.activeId : (boundConversation.current ?? session.activeId),
			);
			if (next && !followSelection) {
				boundConversation.current = next.conversationId;
				setRequest(next);
			}
			if (next) {
				await new Promise<void>((resolve) => {
					const settled = () => {
						if (busy(findTurn(next.conversationId, next.turnId))) return;
						listeners.delete(settled);
						resolve();
					};
					listeners.add(settled);
					settled();
				});
			}
		},
	};
}

export function getFinnResult(id: string): FinnResult | undefined {
	return finnScenarios[id];
}
