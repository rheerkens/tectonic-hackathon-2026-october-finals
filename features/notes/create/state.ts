import type { DraftStore } from "@day-one/contracts";
import {
	ApiError,
	errorMessage,
	inputError,
	isUncertainWrite,
	type WorkspaceContext,
} from "@day-one/http";
import {
	mutationOptions,
	type QueryClient,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { listNotesOptions } from "../list/state";
import { notesKey } from "../shared/keys";
import { createNote } from "./client";
import { type CreateNoteInput, CreateNoteInputSchema } from "./contract";
export const createNoteOptions = (context: WorkspaceContext, queries: QueryClient) =>
	mutationOptions({
		mutationFn: (input: CreateNoteInput & { signal?: AbortSignal }) =>
			createNote({ ...context, input, ...(input.signal ? { signal: input.signal } : {}) }),
		onSuccess: () => queries.invalidateQueries({ queryKey: notesKey(context) }),
	});
export function useCreateNote(context: WorkspaceContext & { drafts: DraftStore }) {
	const queries = useQueryClient(),
		mutation = useMutation(createNoteOptions(context, queries));
	const draft = useSyncExternalStore(context.drafts.subscribe, () =>
		context.drafts.get(context.userId, context.workspaceId, "note"),
	);
	const setDraft = (value: string) =>
		context.drafts.set(context.userId, context.workspaceId, "note", value);
	const [failure, setFailure] = useState<unknown>(null),
		[touched, setTouched] = useState(false),
		[checking, setChecking] = useState(false),
		[needsRefresh, setNeedsRefresh] = useState(false);
	const active = useRef(false);
	// Leaving the page does not cancel a save: aborting cannot undo a commit, it only makes the
	// result uncertain. A late success clears the draft through the user/workspace-keyed store.
	useEffect(() => {
		setFailure(null);
		setTouched(false);
		setChecking(false);
		setNeedsRefresh(false);
	}, [context.userId, context.workspaceId]);
	const valid = CreateNoteInputSchema.safeParse({ text: draft });
	async function reconcile() {
		setChecking(true);
		try {
			await queries.cancelQueries({ queryKey: notesKey(context) });
			await queries.fetchQuery({ ...listNotesOptions(context), staleTime: 0 });
			setNeedsRefresh(false);
		} catch {
			setNeedsRefresh(true);
		} finally {
			setChecking(false);
		}
	}
	// Resolves true only when the server confirmed the note, so the UI can acknowledge it.
	async function save() {
		if (!context.workspaceId || active.current || checking || needsRefresh) return false;
		setTouched(true);
		setFailure(null);
		const input = CreateNoteInputSchema.safeParse({ text: draft });
		if (!input.success) {
			setFailure(inputError(input.error));
			return false;
		}
		active.current = true;
		try {
			await mutation.mutateAsync(input.data);
			setDraft("");
			// A cleared form is a fresh draft, not an invalid one.
			setTouched(false);
			return true;
		} catch (error) {
			setFailure(error);
			if (isUncertainWrite(error)) await reconcile();
			return false;
		} finally {
			active.current = false;
		}
	}
	const validation = touched && !valid.success ? inputError(valid.error) : failure;
	const fieldError =
		validation instanceof ApiError ? (validation.fieldErrors?.text?.join(" ") ?? "") : "";
	return {
		draft,
		setDraft: (value: string) => {
			setDraft(value);
			setTouched(true);
			setFailure(null);
		},
		save,
		busy: mutation.isPending || checking,
		canSave: !mutation.isPending && !checking && !needsRefresh,
		fieldError,
		error:
			failure && !(failure instanceof ApiError && failure.fieldErrors?.text)
				? errorMessage(failure) +
					(isUncertainWrite(failure)
						? " The save may have completed. Check the notes before saving again."
						: "")
				: "",
		needsRefresh,
		reconcile,
		dismissError: () => setFailure(null),
	};
}
