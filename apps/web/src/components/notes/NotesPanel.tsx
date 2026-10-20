import { demoUsers } from "@day-one/contracts";
import type { Note } from "@day-one/notes/shared/contract";
import { Avatar } from "@day-one/ui/avatar";
import { Button } from "@day-one/ui/button";
import { TextareaField } from "@day-one/ui/field";
import { EmptyState } from "@day-one/ui/states";
import { useState } from "react";
import { Icon } from "../Icon";
export function NotesPanel({
	notes,
	canWrite,
	draft,
	onDraft,
	onSave,
	busy,
	canSave,
	error,
	onDismiss,
	fieldError,
	needsRefresh,
	onRefresh,
}: {
	notes: Note[];
	busy: boolean;
	canSave: boolean;
	error: string;
	fieldError: string;
	needsRefresh: boolean;
	onRefresh: () => Promise<void>;
	onDismiss: () => void;
	canWrite: boolean;
	draft: string;
	onDraft: (value: string) => void;
	onSave: () => Promise<void>;
}) {
	const [visibleCount, setVisibleCount] = useState(10);
	return (
		<section className="notes-panel">
			<div className="notes-heading">
				<div>
					<h1>Workspace notes</h1>
					<p className="muted">Small things worth keeping.</p>
				</div>
				<span className="count">
					{notes.length} {notes.length === 1 ? "note" : "notes"}
				</span>
			</div>

			{error && (
				<p role="alert" className="error">
					<span>{error}</span>
					<Button type="button" variant="ghost" aria-label="Dismiss note error" onClick={onDismiss}>
						<Icon name="x" size={16} />
					</Button>
				</p>
			)}
			{needsRefresh && (
				<Button type="button" variant="secondary" disabled={busy} onClick={() => void onRefresh()}>
					Refresh notes before saving again
				</Button>
			)}
			{canWrite ? (
				<form
					className="note-form"
					onSubmit={(e) => {
						e.preventDefault();
						void onSave();
					}}
				>
					<TextareaField
						id="note"
						label="New note"
						error={fieldError}
						value={draft}
						disabled={busy}
						onChange={(e) => onDraft(e.target.value)}
						placeholder="Something to remember…"
						rows={3}
						maxLength={2000}
					/>
					<div className="form-footer">
						<span className="muted small">{draft.length ? `${draft.length} / 2000` : ""}</span>
						<Button variant="primary" type="submit" disabled={!canSave}>
							Save note
						</Button>
					</div>
				</form>
			) : (
				<p className="read-only small muted">Your role can read these notes.</p>
			)}
			<div className="notes-list" role="region" aria-label="Saved workspace notes">
				{notes.slice(0, visibleCount).map((note) => {
					const name = demoUsers.find((u) => u.id === note.createdBy)?.name ?? "Member";
					return (
						<article className="note" key={note.id}>
							<p>{note.text}</p>
							<footer className="note-meta">
								<Avatar name={name} size={22} />
								<span>{name.split(" ")[0]}</span>
								<span aria-hidden="true">·</span>
								<time dateTime={note.createdAt}>
									{new Date(note.createdAt).toLocaleDateString("en-GB", {
										month: "short",
										day: "numeric",
									})}
								</time>
							</footer>
						</article>
					);
				})}
				{!notes.length && (
					<EmptyState
						title="No notes yet"
						message="Save your first idea and it will appear here."
					/>
				)}
			</div>
			{notes.length > visibleCount && (
				<Button
					variant="ghost"
					className="show-more"
					onClick={() => setVisibleCount((count) => count + 10)}
				>
					Show more notes
				</Button>
			)}
		</section>
	);
}
