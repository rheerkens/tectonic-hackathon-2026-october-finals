import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ChatPage } from "../pages/ChatPage";

// The chat layout renders the page, so replacing the new-chat URL with the created conversation
// keeps send state mounted. Child routes only select the conversation.
export const Route = createFileRoute("/w/$workspaceId/chat")({ component: ChatRoute });
function ChatRoute() {
	const { workspaceId } = Route.useParams();
	const { conversationId = "" } = useParams({ strict: false });
	const navigate = useNavigate();
	return (
		<ChatPage
			conversationId={conversationId}
			onConversationCreated={(conversationId) => {
				void navigate({
					to: "/w/$workspaceId/chat/$conversationId",
					params: { workspaceId, conversationId },
					replace: true,
					resetScroll: false,
				});
			}}
		/>
	);
}
