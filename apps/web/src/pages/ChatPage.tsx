import { useChat } from "@day-one/chat/state";
import { Button } from "@day-one/ui/button";
import { SelectField } from "@day-one/ui/field";
import { useNavigate } from "@tanstack/react-router";
import { ChatPanel } from "../components/chat/ChatPanel";
import { useAnnouncePetMood } from "../state/pet";
import { useStudioState } from "../state/StudioContext";
export function ChatPage({
	conversationId,
	onConversationCreated,
}: {
	conversationId: string;
	onConversationCreated: (id: string) => void;
}) {
	const { scope } = useStudioState();
	const chat = useChat({ ...scope, conversationId, onConversationCreated });
	useAnnouncePetMood(chat);
	const workspaceId = scope.workspaceId;
	const navigate = useNavigate();
	return (
		<>
			<div className="chat-navigation">
				<SelectField
					id="conversation"
					label="Conversation"
					hideLabel
					value={chat.conversationId}
					disabled={chat.busy}
					onChange={(event) => {
						const conversationId = event.target.value;
						void (conversationId
							? navigate({
									to: "/w/$workspaceId/chat/$conversationId",
									params: { workspaceId, conversationId },
								})
							: navigate({ to: "/w/$workspaceId/chat", params: { workspaceId } }));
					}}
				>
					<option value="">New conversation</option>
					{chat.conversationId &&
						!chat.conversations.some((item) => item.id === chat.conversationId) && (
							<option value={chat.conversationId}>Selected conversation</option>
						)}
					{chat.conversations.map((item) => (
						<option key={item.id} value={item.id}>
							{item.title}
						</option>
					))}
				</SelectField>
				<Button
					variant="ghost"
					aria-label="New conversation"
					disabled={chat.busy}
					onClick={() => void navigate({ to: "/w/$workspaceId/chat", params: { workspaceId } })}
				>
					New conversation
				</Button>
			</div>
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
		</>
	);
}
