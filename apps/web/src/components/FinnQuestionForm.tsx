import { Button } from "@day-one/ui/button";
import { TextField } from "@day-one/ui/field";
import { Icon } from "./Icon";
export function FinnQuestionForm({
	value,
	onChange,
	onSubmit,
	busy,
	error,
	id = "knowledge-question",
}: {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	busy: boolean;
	error?: string;
	id?: string;
}) {
	return (
		<form
			className="dashboard-search"
			aria-busy={busy}
			onSubmit={(e) => {
				e.preventDefault();
				if (value.trim() && !busy) onSubmit();
			}}
		>
			<Icon name="search" size={28} />
			<TextField
				id={id}
				label="Ask a question about your organisation"
				hideLabel
				placeholder="Ask a question about your organisation"
				value={value}
				maxLength={8000}
				onChange={(e) => onChange(e.target.value)}
				error={error ?? ""}
			/>
			<Button type="submit" variant="primary" disabled={busy || !value.trim()}>
				{busy ? "Looking into it…" : "Find an answer"}
				<Icon name="arrow-right" size={18} />
			</Button>
		</form>
	);
}
