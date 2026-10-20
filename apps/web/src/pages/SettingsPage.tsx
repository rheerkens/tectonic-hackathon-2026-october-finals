import { Button } from "@day-one/ui/button";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { usePetScale } from "../state/pet-scale";
import { useStudioState } from "../state/StudioContext";
import { useTheme } from "../state/ThemeProvider";

const choices = [
	{ id: "light", label: "Light", icon: "sun" },
	{ id: "dark", label: "Dark", icon: "moon" },
	{ id: "system", label: "Use device setting", icon: "monitor" },
] as const;
/** Finn's size on the desktop and in SDtrust. Only the desktop app can change it. */
function FinnSize() {
	const saved = usePetScale();
	// The slider shows the user's own value while the shell catches up.
	const [value, setValue] = useState<number | null>(null);
	const [error, setError] = useState("");
	const shown = value ?? saved;
	function resize(next: number) {
		setValue(next);
		setError("");
		window.desktop?.setPetScale?.(next).catch(() => {
			setValue(null);
			setError("Could not resize Finn. Try again.");
		});
	}
	return (
		<section className="card settings-section">
			<h2>Finn's size</h2>
			<p>Make Finn smaller or larger on your desktop and in SDtrust. Remembered on this device.</p>
			<div className="finn-size">
				<label>
					<span>Size</span>
					<input
						type="range"
						min={75}
						max={150}
						step={5}
						value={shown}
						aria-valuetext={`${shown}%`}
						onChange={(event) => resize(Number(event.target.value))}
					/>
					<output aria-hidden="true">{shown}%</output>
				</label>
				<Button disabled={shown === 100} onClick={() => resize(100)}>
					Reset to 100%
				</Button>
			</div>
			{error && (
				<p role="alert" className="muted">
					{error}
				</p>
			)}
		</section>
	);
}

export function SettingsPage() {
	const { preference, setPreference } = useTheme();
	const { user, workspace } = useStudioState();
	return (
		<div className="narrow-page">
			<header className="page-header">
				<h1>Settings</h1>
				<p>Make SDtrust feel at home on your desktop.</p>
			</header>
			<section className="card settings-section">
				<h2>Appearance</h2>
				<p>Choose a theme. Your preference is remembered on this device.</p>
				<fieldset className="theme-choices">
					<legend className="sr-only">Colour theme</legend>
					{choices.map((choice) => (
						<label
							key={choice.id}
							className={preference === choice.id ? "theme-choice chosen" : "theme-choice"}
						>
							<Icon name={choice.icon} size={28} />
							<span>{choice.label}</span>
							<input
								type="radio"
								name="theme"
								value={choice.id}
								checked={preference === choice.id}
								onChange={() => setPreference(choice.id)}
							/>
						</label>
					))}
				</fieldset>
			</section>
			{window.desktop?.setPetScale && <FinnSize />}
			<section className="card settings-section">
				<h2>Your profile</h2>
				<dl className="profile-details">
					<div>
						<dt>Name</dt>
						<dd>{user.name}</dd>
					</div>
					<div>
						<dt>Workspace</dt>
						<dd>{workspace?.name}</dd>
					</div>
					<div>
						<dt>Role</dt>
						<dd>{workspace?.role}</dd>
					</div>
				</dl>
				<p className="muted">Use the account menu to switch account or sign out.</p>
			</section>
		</div>
	);
}
