import { createFileRoute } from "@tanstack/react-router";
import { ResultPage } from "../pages/ResultPage";
export const Route = createFileRoute("/results/$resultId")({ component: ResultRoute });
function ResultRoute() {
	const { resultId } = Route.useParams();
	return <ResultPage resultId={resultId} />;
}
