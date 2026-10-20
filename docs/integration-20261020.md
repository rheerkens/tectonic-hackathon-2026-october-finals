# Main integration, 20 October 2026

Combined remote main `fc373eb` with local app checkpoint `7a760a8` and presentation checkpoint `cf15002`. The remote history is retained, including Experts, the custom desktop title bar and Finn's transition between the desktop and SDtrust.

The local app checkpoint adds the shared compact Finn chat, drafts across windows, local speech transcription and the saved 75% to 150% size setting. The speech engine and model remain local prerequisites documented in `docs/finn-voice.md`; they are not shipped in this commit. Speech produces an editable draft and does not send it automatically.

The merge preserves both sets of desktop bridge methods. Native jumps use the canonical selected size and the actual compact dock position. The landing calculation waits briefly for the new renderer to receive the saved size. Returning home clamps Finn to the current display. Cancelling an interrupted jump invalidates its old callbacks and clears the forced pose, including when the main window closes twice quickly.

Presentation versions 1, 2 and 3 are under `docs/presentation`. All 92 committed files match the reviewed working files byte for byte. Git attributes preserve the presentation bundles and their recorded hashes. Version 3 is the dashboard inspired deck. Slide 4 still intentionally needs the final app capture. The presentation output and generated Impeccable caches are excluded from application formatting; application lint remains enabled.

Validation used Bun 1.4.2 and `AUTH_MODE=dev`. The complete `bun run check` passed: lint, both typechecks and the production build. Native JavaScript syntax and Git whitespace checks passed. No unit or end to end tests were added or run.

Manual native inspection used Electron on Windows at 125% display scaling, with a separate local profile. At 75%, 100% and 150%, jumps retained their size without cumulative growth. Native pixel rounding reports 72 by 79 at 75%; the canonical size is 72 by 78. Increasing from 75% at the bottom right edge to 150% returned Finn fully within the work area. Closing twice during an incoming jump returned a visible Finn with the forced jump pose cleared. Evidence is local under `.local/integration/merge-native-20261020-final`.

The inspection launcher can initially create a native hidden main window despite the visible document; reopening was needed in one run. This existing launcher limitation is not presented as resolved. Physical microphone quality, Dutch transcription quality, other operating systems and a packaged executable were not validated here. Answers still use the existing demonstration fixtures. The approved animation proposals remain design assets, not replacements for the current runtime assets.
