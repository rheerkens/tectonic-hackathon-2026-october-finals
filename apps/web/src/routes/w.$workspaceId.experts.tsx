import { createFileRoute } from "@tanstack/react-router";
import { ExpertsPage } from "../pages/KnowledgePages";
export const Route = createFileRoute("/w/$workspaceId/experts")({ component: ExpertsPage });
