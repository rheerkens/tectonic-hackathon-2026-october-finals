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

/**
 * Compact chat drafts, keyed by conversation ID or "new" for a chat not yet sent. Last writer
 * wins per key: a write takes the highest revision this window has seen for the key plus one,
 * and equal revisions from two windows resolve by writer ID. Every window keeps the greater
 * (rev, by), so crossed updates converge and a stale snapshot never revives older text.
 * Cleared drafts stay as empty entries with their revision.
 */
type Draft = { text: string; rev: number; by: string };
type Session = {
	conversations: FinnConversation[];
	activeId: string | null;
	readIds: string[];
	hiddenIds: string[];
	drafts: Record<string, Draft>;
	/** Result IDs an expert confirmed on a call; Finn answers them from then on. */
	learned: string[];
};
type Message =
	| { kind: "turn"; conversation: Omit<FinnConversation, "turns">; turn: FinnTurn }
	| { kind: "select"; id: string | null }
	| { kind: "read"; ids: string[] }
	| { kind: "hide"; id: string }
	| { kind: "draft"; key: string; draft: Draft }
	| { kind: "learn"; id: string }
	| { kind: "snapshot"; session: Session };
const idle: FinnState = { status: "idle", question: "", stepsShown: 0, result: null, message: "" };
let session: Session = {
	conversations: [],
	activeId: null,
	readIds: [],
	hiddenIds: [],
	drafts: {},
	learned: [],
};
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();
// randomUUID only exists in secure contexts; plain HTTP over Tailscale still needs IDs.
const uuid = () =>
	typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const writer = uuid();
const newer = (a: Draft, b: Draft | undefined) =>
	!b || a.rev > b.rev || (a.rev === b.rev && a.by > b.by);
const running = new Set<string>();
const busy = (turn: FinnState | undefined) =>
	turn?.status === "thinking" || turn?.status === "searching";
const latest = (conversation?: FinnConversation) => conversation?.turns.at(-1);

function notify() {
	for (const listener of listeners) listener();
}
function apply(message: Message) {
	if (message.kind === "select") session = { ...session, activeId: message.id };
	if (message.kind === "hide") {
		session = { ...session, hiddenIds: [...new Set([...session.hiddenIds, message.id])] };
	}
	if (message.kind === "learn") {
		session = { ...session, learned: [...new Set([...session.learned, message.id])] };
	}
	if (message.kind === "read") {
		session = { ...session, readIds: [...new Set([...session.readIds, ...message.ids])] };
	}
	if (message.kind === "draft") {
		if (!newer(message.draft, session.drafts[message.key])) return;
		session = { ...session, drafts: { ...session.drafts, [message.key]: message.draft } };
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
			hiddenIds: [...new Set([...session.hiddenIds, ...(message.session.hiddenIds ?? [])])],
			learned: [...new Set([...session.learned, ...(message.session.learned ?? [])])],
			drafts: Object.fromEntries(
				Object.entries({ ...message.session.drafts, ...session.drafts }).map(([key, draft]) => {
					const theirs = message.session.drafts?.[key];
					return [key, theirs && newer(theirs, draft) ? theirs : draft];
				}),
			),
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

/** Swaps a result for what Finn learned about it on a call, if anything. */
function known(result: FinnResult | undefined) {
	const call = result?.nextStep.kind === "contact_person" ? result.nextStep.call : undefined;
	if (!result || !call || !session.learned.includes(result.id)) return result;
	return finnScenarios[call.confirmedResultId] ?? result;
}
// The demo still matches the existing scenarios; it does not call external tools.
function match(question: string) {
	const text = question.toLowerCase();
	if (/sick/.test(text)) return finnScenarios["d2-sick-leave"];
	if (/november|next month/.test(text)) return known(finnScenarios["d1-payroll-changes-november"]);
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
	conversation ??= { id: uuid(), title: text, createdAt: Date.now(), turns: [] };
	const turn: FinnTurn = {
		...idle,
		id: uuid(),
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
function setDraft(key: string, text: string) {
	const current = session.drafts[key];
	if ((current?.text ?? "") === text) return;
	publish({ kind: "draft", key, draft: { text, rev: (current?.rev ?? 0) + 1, by: writer } });
}
/** Adds a voice transcript to the draft as it is now, after one space. */
function appendDraft(key: string, text: string) {
	const current = (session.drafts[key]?.text ?? "").trimEnd();
	setDraft(key, current ? `${current} ${text}` : text);
}
/**
 * Records the expert's confirmation from a call: Finn learns it, and every conversation waiting
 * on that expert gets the confirmed answer.
 */
function confirmCall(resultId: string) {
	publish({ kind: "learn", id: resultId });
	const confirmed = known(finnScenarios[resultId]);
	if (!confirmed || confirmed.id === resultId) return;
	for (const conversation of session.conversations) {
		for (const turn of conversation.turns) {
			if (turn.status !== "waiting" || turn.result?.id !== resultId) continue;
			publish({
				kind: "turn",
				conversation,
				turn: {
					...turn,
					status: "done",
					result: confirmed,
					stepsShown: confirmed.steps.length,
					revision: turn.revision + 1,
				},
			});
		}
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
	const pending = current.conversations
		.filter((conversation) => !current.hiddenIds.includes(conversation.id))
		.flatMap((conversation) => conversation.turns)
		.filter(busy);
	const activity =
		pending.at(-1) ?? (active && !current.hiddenIds.includes(active.id) ? selected : idle);
	const conversations = current.conversations
		.filter((conversation) => !current.hiddenIds.includes(conversation.id))
		.map((conversation) => ({
			...conversation,
			unread: conversation.turns.some((turn) => !busy(turn) && !current.readIds.includes(turn.id)),
		}));
	return {
		...selected,
		conversations,
		activeConversation: active,
		activeId: current.activeId,
		activity,
		drafts: Object.fromEntries(
			Object.entries(current.drafts).map(([key, draft]) => [key, draft.text]),
		) as Record<string, string>,
		setDraft,
		appendDraft,
		unreadCount: conversations.filter((conversation) => conversation.unread).length,
		selectConversation,
		submitQuestion: startQuestion,
		markRead,
		confirmCall,
		hideConversation: (id: string) => publish({ kind: "hide", id }),
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

/** A result as Finn knows it now: after a confirming call the open page shows the answer. */
export function useFinnResult(id: string): FinnResult | undefined {
	useSyncExternalStore(subscribe, () => session);
	return known(finnScenarios[id]);
}
