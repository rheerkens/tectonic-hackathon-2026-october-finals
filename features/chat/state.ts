import type { DraftStore } from "@day-one/contracts";
import { ApiError, errorMessage, type WorkspaceContext } from "@day-one/http";
import { useEffect, useRef } from "react";
import { useCreateConversation } from "./create/state";
import { useHistory } from "./history/state";
import { useListConversations } from "./list/state";
import { useSendChat } from "./send/state";
import type { ChatStatus } from "./status/contract";
import { useChatStatus } from "./status/state";

export function useChat(
	context: WorkspaceContext & {
		drafts: DraftStore;
		conversationId: string;
		onConversationCreated: (id: string) => void;
	},
) {
	const listing = useListConversations(context),
		status = useChatStatus(context),
		create = useCreateConversation(context);
	const { conversationId } = context;
	const conversations = listing.data ?? [];
	const history = useHistory(context);
	const createdId = useRef<string | null>(null);
	const sending = useSendChat({
		...context,
		ensureConversation: async (signal) => {
			if (conversationId) {
				const selected =
					history.data?.conversation ?? conversations.find((item) => item.id === conversationId);
				if (!selected || selected.workspaceId !== context.workspaceId)
					throw new ApiError(404, {
						code: "NOT_FOUND",
						message: "This conversation is not available in this workspace.",
					});
				return selected;
			}
			const conversation = await create.mutateAsync(signal);
			signal.throwIfAborted();
			createdId.current = conversation.id;
			context.onConversationCreated(conversation.id);
			return conversation;
		},
	});
	const previousId = useRef(conversationId);
	// Unmounting cancels active work through send state; this handles conversation changes.
	useEffect(() => {
		if (previousId.current === conversationId) return;
		previousId.current = conversationId;
		// The new URL acknowledges our own creation. Other navigation cancels the old stream.
		if (createdId.current !== conversationId) {
			sending.stop();
			sending.dismissError();
		}
		createdId.current = null;
	}, [conversationId, sending.stop, sending.dismissError]);
	const wrongWorkspace =
		!!history.data && history.data.conversation.workspaceId !== context.workspaceId;
	const loadError = listing.error ?? history.error ?? status.error;
	const availability: ChatStatus = status.data ?? {
		available: false,
		message: status.error ? errorMessage(status.error) : "Checking chat availability…",
	};
	const live = sending.live?.conversationId === conversationId ? sending.live : null;
	return {
		...sending,
		live,
		conversations,
		conversationId,
		canSend:
			sending.canSend &&
			!!context.workspaceId &&
			(!conversationId || (history.isSuccess && !wrongWorkspace)),
		turns: wrongWorkspace
			? []
			: (history.data?.turns ?? []).filter((turn) => !(live && turn.status === "pending")),
		status: availability,
		retry: () => {
			void listing.refetch();
			void history.refetch();
			void status.refetch();
		},
		error: wrongWorkspace
			? "This conversation is not available in this workspace."
			: sending.error || (loadError ? errorMessage(loadError) : ""),
	};
}
