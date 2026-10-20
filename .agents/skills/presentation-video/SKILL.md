---
name: presentation-video
description: Create and revise narrated, edited presentation videos from this web app using real actions, an editable scene story, local or ElevenLabs speech, captions, and offline playback. Use for app demos and hackathon presentations, not ordinary browser tests.
---

# Presentation video

Read `docs/demo/story.json`, the relevant app code, and [the tool reference](references/tooling.md). Inspect the running app before describing behavior. Keep completed behavior, assumptions, and future plans distinct.

Use a dedicated synthetic app profile. T3 still owns worktrees; this skill only uses repo app environments. Do not reset another environment or capture real credentials. Keep presentation actions and story editable.

Each scene has a stable ID, chapter, caption, exact narration, actions, and expected visible result. Explain the action before performing it. Show the real app, verify its role/data claims, and give the audience a clear opening and closing. A title/end card can introduce a chapter; it is presentation material, not fabricated app functionality.

Generate `bun run video:sample` first. Let the user listen before a full presentation. Respect previously selected voice/backend preferences. `auto` chooses ElevenLabs when a key is configured, otherwise local speech; explicit overrides are supported. Cloud speech sends narration and uses account credits. Keep keys out of artifacts and only regenerate changed clips.

Run `bun run video:make --profile <owned-profile>`. The story controls narration, capture, edits, captions, and chapters. Keep narration ahead of the action and use measured audio durations. Review screenshots and the encoded MP4, including sound; ffprobe/decode checks alone do not establish timing or teaching quality.

Deliver the MP4, captions/transcript, story, screenshots/manifest, validation result, and offline player using Tailscale URLs. State any checks not performed. A changed scene needs another capture and review; do not call old evidence current.
