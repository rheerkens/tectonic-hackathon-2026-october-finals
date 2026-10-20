import { useChat } from "@day-one/chat/state";
import { Button } from "@day-one/ui/button";
import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "../components/chat/ChatPanel";
import { openMain } from "../state/desktop";
import { useAnnouncePetMood } from "../state/pet";
import { useStudio } from "../state/studio";

/** The floating desktop chat. Each time it reappears it starts a new conversation. */
export function MiniPage({ workspaceId }: { workspaceId: string }) {
	const { scope } = useStudio(workspaceId);
	const [conversationId, setConversationId] = useState("");
	const chat = useChat({ ...scope, conversationId, onConversationCreated: setConversationId });
	useAnnouncePetMood(chat);
	const busy = useRef(chat.busy);
	busy.current = chat.busy;
	useEffect(() => {
		// An answer still streaming keeps its conversation when Mini reopens.
		const reopen = () => {
			if (!document.hidden && !busy.current) setConversationId("");
		};
		const close = (event: KeyboardEvent) => {
			if (event.key === "Escape") window.desktop?.hideMini();
		};
		document.addEventListener("visibilitychange", reopen);
		document.addEventListener("keydown", close);
		return () => {
			document.removeEventListener("visibilitychange", reopen);
			document.removeEventListener("keydown", close);
		};
	}, []);
	return (
		<main className="mini">
			<Button variant="ghost" onClick={() => openMain("/")}>
				Open SDtrust
			</Button>
			<ChatPanel
				status={chat.status}
				turns={chat.turns}
				live={chat.live}
				busy={chat.busy}
				error={chat.error}
				fieldError={chat.fieldError}
				needsRefresh={chat.needsRefresh}
				onRefresh={chat.reconcile}
				onRetry={chat.retry}
				draft={chat.draft}
				canSend={chat.canSend}
				onDraft={chat.setDraft}
				onSend={chat.send}
				onStop={chat.stop}
				onDismiss={chat.dismissError}
			/>
		</main>
	);
}
