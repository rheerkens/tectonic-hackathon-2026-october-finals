# Database

Keep SQLite on local disk, with one file per worktree/profile. Commit generated migrations; do not regenerate already-applied files or use schema push in CI. Coordinate schema/migration changes in the T3 task brief.

Seed only synthetic data idempotently. Test important persistence/permission outcomes with temporary real SQLite files and the committed migration path.
