import { createFileRoute } from "@tanstack/react-router";
import { ReviewPage } from "../pages/ReviewPage";
export const Route = createFileRoute("/w/$workspaceId/review")({ component: ReviewPage });
