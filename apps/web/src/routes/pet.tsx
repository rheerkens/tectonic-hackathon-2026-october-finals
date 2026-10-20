import { createFileRoute } from "@tanstack/react-router";
import { PetPage } from "../pages/PetPage";

// The desktop pet window. It needs no session: it only mirrors chat moods from other windows.
export const Route = createFileRoute("/pet")({ component: PetPage });
