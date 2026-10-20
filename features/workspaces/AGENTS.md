# Workspaces

The list action returns only current-user memberships with their roles. Contracts are browser-safe. Its state hook owns loading and errors; application state chooses the active workspace and composes notes/chat. Keep membership authorization in the shared server package and never trust a client-displayed role for access.
