import { createFileRoute } from "@tanstack/react-router";
import { ExpertsPage } from "../pages/ExpertsPage";
export const Route = createFileRoute("/w/$workspaceId/experts")({ component: ExpertsPage });
