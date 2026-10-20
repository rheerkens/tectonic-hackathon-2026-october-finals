import { createFileRoute } from "@tanstack/react-router";
import { SourcesPage } from "../pages/KnowledgePages";
export const Route = createFileRoute("/w/$workspaceId/sources")({ component: SourcesPage });
