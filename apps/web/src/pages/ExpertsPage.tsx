import { experts } from "../state/finn-scenarios";

const colors = ["coral", "amber", "blue"];
export function ExpertsPage() {
	return (
		<div className="settings-page">
			<header className="desktop-page-heading">
				<h1>Experts</h1>
				<p>Who knows what in this workspace.</p>
			</header>
			<section className="dashboard-card">
				{experts.map((expert, index) => (
					<div key={expert.name} className="dashboard-row">
						<span className={`row-symbol ${colors[index % colors.length]}`}>
							<strong>{expert.name[0]}</strong>
						</span>
						<span className="row-copy">
							<strong>
								{expert.name} · {expert.role}
							</strong>
							<span>{expert.owns.join(" · ")}</span>
						</span>
					</div>
				))}
			</section>
		</div>
	);
}
