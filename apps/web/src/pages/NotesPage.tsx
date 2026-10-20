import { Button } from "@day-one/ui/button";
import { useToasts } from "@day-one/ui/toast";
import { NotesPanel } from "../components/notes/NotesPanel";
import { useNotes } from "../state/notes";
export function NotesPage() {
	const { notes, canWrite, creating, error, retry } = useNotes();
	const toasts = useToasts();
	return (
		<>
			{error && (
				<p role="alert" className="error">
					<span>{error}</span>
					<Button variant="ghost" onClick={retry}>
						Retry loading
					</Button>
				</p>
			)}
			<NotesPanel
				notes={notes}
				canWrite={canWrite}
				draft={creating.draft}
				onDraft={creating.setDraft}
				onSave={async () => {
					if (await creating.save()) toasts.push({ kind: "success", title: "Note saved" });
				}}
				busy={creating.busy}
				canSave={creating.canSave}
				error={creating.error}
				fieldError={creating.fieldError}
				needsRefresh={creating.needsRefresh}
				onRefresh={creating.reconcile}
				onDismiss={creating.dismissError}
			/>
		</>
	);
}
