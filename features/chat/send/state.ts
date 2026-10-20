import { type DraftStore, inWorkspace } from "@day-one/contracts";
import { ApiError, errorMessage, inputError, type WorkspaceContext } from "@day-one/http";
import { type Query, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { History } from "../history/contract";
import type { Conversation, Turn } from "../shared/contract";
import { historyKey } from "../shared/keys";
import { sendChat } from "./client";
import { type ChatEvent, SendChatInputSchema } from "./contract";
export function updateLiveTurn(turn: Turn, event: ChatEvent): Turn {
	switch (event.type) {
		case "text":
			return { ...turn, reply: event.text };
		case "tool":
			return {
				...turn,
				tools: [...turn.tools.filter((tool) => tool.id !== event.tool.id), event.tool],
			};
		case "done":
			return event.turn;
		case "error":
			return turn;
	}
}
export function useSendChat(
	context: WorkspaceContext & {
		drafts: DraftStore;
		ensureConversation: (signal: AbortSignal) => Promise<Conversation>;
	},
) {
	const queries = useQueryClient();
	const draft = useSyncExternalStore(context.drafts.subscribe, () =>
		context.drafts.get(context.userId, context.workspaceId, "chat"),
	);
	const setDraft = (value: string) =>
		context.drafts.set(context.userId, context.workspaceId, "chat", value);
	const [fieldError, setFieldError] = useState("");
	const [needsRefresh, setNeedsRefresh] = useState(false);
	const [error, setError] = useState(""),
		[busy, setBusy] = useState(false),
		[live, setLive] = useState<Turn | null>(null);
	const active = useRef<AbortController | null>(null);
	useEffect(() => {
		setBusy(false);
		setLive(null);
		setError("");
		setFieldError("");
		setNeedsRefresh(false);
		return () => {
			active.current?.abort();
			active.current = null;
		};
	}, [context.userId, context.workspaceId]);
	async function send(message = draft) {
		if (active.current || needsRefresh || !context.workspaceId) return;
		const parsed = SendChatInputSchema.safeParse({ message });
		if (!parsed.success) {
			setFieldError(
				inputError(parsed.error).fieldErrors?.message?.join(" ") ?? "Check your message.",
			);
			return;
		}
		const abort = new AbortController();
		active.current = abort;
		const current = () => active.current === abort;
		setBusy(true);
		setError("");
		setFieldError("");
		setDraft(message);
		let conversation: Conversation | null = null;
		try {
			conversation = await context.ensureConversation(abort.signal);
			abort.signal.throwIfAborted();
			const selected = conversation;
			if (current())
				setLive({
					id: "live",
					conversationId: selected.id,
					message: parsed.data.message,
					reply: "",
					status: "pending",
					tools: [],
					createdAt: new Date().toISOString(),
				});
			await sendChat({
				client: context.client,
				conversationId: selected.id,
				message: parsed.data.message,
				signal: abort.signal,
				onEvent: (event) => {
					if (!current()) return;
					if (event.type === "done") {
						setDraft("");
						queries.setQueryData<History>(
							historyKey({ ...context, conversationId: selected.id }),
							(previous) => ({
								conversation: {
									...selected,
									title:
										selected.title === "New conversation"
											? parsed.data.message.slice(0, 60)
											: selected.title,
								},
								turns: [
									...(previous?.turns ?? []).filter((turn) => turn.id !== event.turn.id),
									event.turn,
								],
							}),
						);
						setLive(null);
					} else setLive((turn) => (turn ? updateLiveTurn(turn, event) : null));
				},
			});
			if (current()) setDraft("");
		} catch (failure) {
			if (current() && failure instanceof ApiError && failure.fieldErrors?.message)
				setFieldError(failure.fieldErrors.message.join(" "));
			if (current())
				setError(
					abort.signal.aborted
						? "Chat stopped. Check saved history before sending again."
						: errorMessage(failure),
				);
		} finally {
			// Refresh persisted state even when a completed tool preceded cancellation or failure.
			// Tools may write any feature's data, so refresh the whole user/workspace scope.
			const history = conversation
				? historyKey({ ...context, conversationId: conversation.id })
				: null;
			const affected = ({ queryKey }: Query) =>
				inWorkspace(queryKey, context) ||
				(!!history && history.every((part, index) => queryKey[index] === part));
			try {
				await queries.invalidateQueries({ predicate: affected });
				if (current())
					setNeedsRefresh(
						queries
							.getQueryCache()
							.findAll({ predicate: affected, type: "active" })
							.some((query) => query.state.status === "error"),
					);
			} finally {
				if (current()) {
					setBusy(false);
					setLive(null);
					active.current = null;
				}
			}
		}
	}
	return {
		draft,
		setDraft: (value: string) => {
			setDraft(value);
			const parsed = SendChatInputSchema.safeParse({ message: value });
			setFieldError(
				parsed.success ? "" : (inputError(parsed.error).fieldErrors?.message?.join(" ") ?? ""),
			);
		},
		fieldError,
		needsRefresh,
		reconcile: async () => {
			await queries
				.refetchQueries({ type: "active" }, { throwOnError: true })
				.then(() => setNeedsRefresh(false))
				.catch(() => setNeedsRefresh(true));
		},
		error,
		busy,
		live,
		send,
		canSend: !needsRefresh,
		stop: () => active.current?.abort(),
		dismissError: () => setError(""),
	};
}
