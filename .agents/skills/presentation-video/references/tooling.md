# Portable presentation tools

All paths below are repository-relative. No workstation-global skill is needed.

Prerequisites: Bun, Node 22+, Python 3.10+, optional Playwright Chromium, FFmpeg, and ffprobe. `bun run video:doctor` reports availability without printing secrets.

Use `bun run video:install` for Chromium. For local Piper, `bun run video:install-local` creates `.local/video-venv` and downloads a hash-verified LJSpeech model from a pinned revision. Piper remains outside app dependencies. On macOS, a missing Piper model falls back to `say`; its voice is system-dependent. Linux local speech requires the prepared Piper model.

Speech modes:

- `--narration auto`: ElevenLabs when `ELEVENLABS_API_KEY` exists, otherwise local.
- `--narration local`: local synthesis even if a cloud key exists.
- `--narration elevenlabs`: requires the key; optional `ELEVENLABS_VOICE_ID` selects a voice.

`PIPER_MODEL` can point at a different approved model with its matching `.onnx.json`. Review engine/model terms before redistributing them. Current optional engine is `piper-tts==1.8.0`; installer records model/config hashes and provenance.

Start `bun dev --profile demo` in a separate terminal, then use `bun run video:sample --narration local` and `bun run video:make --profile demo`. The default make profile is `dev`, matching plain `bun dev`; pass `--url` for an explicitly selected ready environment. Use a fresh profile for a new presentation. Existing data is preserved on reruns.

Supported story actions are `click` with a selector, `fill` with selector/text, `waitText`, `waitSelector`, and `reload`. Capture carries synthetic session state between scene recordings. It trims startup navigation, records readiness offsets, waits for measured narration before acting, and asserts the expected results. The example's pi scene requires a working host login.

Outputs live in ignored `artifacts/video`: narrated `presentation.mp4`, `captions.vtt`, `transcript.txt`, self-contained `index.html`, scene screenshots, source story, capture/timing manifest, and validation JSON. Recipients need neither a cloud account nor a local speech engine.

To revise edit styling without repeating app actions, use `bun run video:make --profile demo --reuse-capture`. The tool verifies that scene actions, narration, voice audio, and timing inputs match the capture; otherwise recapture.
