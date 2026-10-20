import { experts } from "../state/finn-scenarios";

const colors = ["coral", "amber", "blue"];
export function ExpertsPage() {
	return (
		<div className="narrow-page">
			<header className="page-header">
				<h1>Experts</h1>
				<p>Who Finn calls for which knowledge. Demo experts, the same in every workspace.</p>
			</header>
			<section className="card">
				{experts.map((expert, index) => (
					<div key={expert.name} className="list-row">
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
