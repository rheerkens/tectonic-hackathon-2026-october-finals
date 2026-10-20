import { createFileRoute } from "@tanstack/react-router";
import { NotesPage } from "../pages/NotesPage";
export const Route = createFileRoute("/w/$workspaceId/notes")({ component: NotesPage });
