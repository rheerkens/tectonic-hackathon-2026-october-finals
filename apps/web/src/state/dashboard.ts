import { SendChatInputSchema } from "@day-one/chat/send/contract";
import { errorMessage } from "@day-one/http";
import { useListNotes } from "@day-one/notes/list/state";
import { useState, useSyncExternalStore } from "react";
import { useStudioState } from "./StudioContext";
export function useDashboard() {
	const { scope, user } = useStudioState();
	const listing = useListNotes(scope);
	const question = useSyncExternalStore(scope.drafts.subscribe, () =>
		scope.drafts.get(scope.userId, scope.workspaceId, "chat"),
	);
	const [fieldError, setFieldError] = useState("");
	return {
		user,
		notes: listing.data ?? [],
		loading: listing.isPending,
		error: listing.error ? errorMessage(listing.error) : "",
		retry: () => void listing.refetch(),
		question,
		fieldError,
		setQuestion(value: string) {
			scope.drafts.set(scope.userId, scope.workspaceId, "chat", value);
			setFieldError("");
		},
		prepareQuestion() {
			const result = SendChatInputSchema.safeParse({ message: question });
			if (!result.success) {
				setFieldError("Enter a question within the message length limit.");
				return false;
			}
			return true;
		},
	};
}
