import { Icon } from "../components/Icon";
import { useStudioState } from "../state/StudioContext";
import { useTheme } from "../state/ThemeProvider";

const choices = [
	{ id: "light", label: "Light", icon: "sun" },
	{ id: "dark", label: "Dark", icon: "moon" },
	{ id: "system", label: "Use device setting", icon: "monitor" },
] as const;
export function SettingsPage() {
	const { preference, setPreference } = useTheme();
	const { user, workspace } = useStudioState();
	return (
		<div className="settings-page">
			<header className="desktop-page-heading">
				<h1>Settings</h1>
				<p>Make SDtrust feel at home on your desktop.</p>
			</header>
			<section className="dashboard-card settings-section">
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
			<section className="dashboard-card settings-section">
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
