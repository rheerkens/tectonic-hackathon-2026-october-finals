# SDtrust Finals · Refined v2

Visual refinement of the reviewed v1 draft. Same eight slides, same 170 second budget (45 second demo), same script, cues, evidence boundaries and sources. v1 files are untouched.

Deliverables:

- `SDtrust_Finals_Refined_v2.pptx`: editable deck, full Manrope Regular and Bold embedded
- `SDtrust_Finals_Refined_v2.pdf`: viewing copy, exported by PowerPoint from the final PPTX
- `SDtrust_Finals_Refined_v2_Notes.md`: English speaker notes (also in each slide's notes)
- `preview/slide_01.png` to `slide_08.png` (1600 × 900) and `preview/contact_sheet.png`
- `validation_v2.json`, `native_validation_v2.json`: verification evidence and SHA256 hashes

## What changed visually

- **No more repeated header and footer.** One quiet top row (logo, wordmark, `02 / 08`), a coral letter-spaced kicker and a 40pt title in a fixed position. The draft footer is gone.
- **Cover:** editorial split. Large 62pt three-line headline with "next step." in coral. Finn stands big on a navy panel with a soft halo and a name caption, as the host.
- **Problem (2):** four 112pt numerals, staggered on purpose so none looks more official than the others. Each has a small source ribbon (S1 · PROCEDURE …). The closing line puts "Knowing what applies" in coral.
- **Meet Finn (3):** the waving Finn on a round stage. The three steps are a connected flow; step 3 (the next step) is coral.
- **Demo (4):** the stage slide is navy. A clean app-frame storyboard, still clearly labelled `DEMO PLACEHOLDER` and "This is not an app screenshot", with a 0:00 / 0:10 / 0:25 / 0:35 beat timeline that follows the presenter cues. No screenshot or video.
- **Answer (5):** clarity against noise. A solid navy answer card ("22 October", source S4) with the reviewing Finn. On the right is a source ledger: 22 in green ("Applies"), 20 and 23 25 struck through ("Overridden", "Not approved").
- **Gap (6):** a dashed empty card with a large "?" for the missing evidence. Finn's open-hand gesture leads to a solid navy "Next step: Roy" card. The simulated contact line is now a full-width amber banner.
- **Sick leave (7):** type scale follows source status: 24 hours is large and navy (approved), 48 medium amber (unconfirmed), 72 small, struck through and grey (expired). The status chips use desktop.css success, amber and surface tokens.
- **Close (8):** a 54pt two-line statement and a connected three-step pilot flow, with a "Future pilot, not yet measured" chip.
- Finn appears only where he does something: host (1), greeting (3), checking evidence (5), pointing to the person (6). He uses the original artwork and approved frames: waving body_lock_03, review approved02 frame 05, waiting drawn_gesture_03 frame 03.
- Palette: navy #192D46 dominant with ivory #F8F6F1, coral #EE6558 as the single accent and amber #F3BA55 on dark slides. Other desktop.css tokens are used sparingly: success, amber, surface-2, accent-soft, border-strong, subtle.

Copy changes are limited to design tightening. Visible text has no hyphens or em dashes. Slide 5's row reads "Teams proposals / A proposed 23rd and a recalled 25th. Neither is an approval." In the slide 4 notes cue, "in v1" now reads "in this deck". Everything else in the notes is verbatim from v1, and `validate_v2.py` asserts this.

## Verification (done)

- PowerPoint reopened the final embedded PPTX **without** loading font files. 8 slides, 133 native text shapes, 0 text overflows by native bounds, 0 shapes outside the slide.
- 8 notes pages, each with SPEAK, PRESENTER CUES, EVIDENCE BOUNDARY and SOURCES. Spoken text, status and sources match v1 exactly.
- Two `.fntdata` parts (full EOT, version 0x20001). The font parts PowerPoint wrote itself during SaveAs are replaced, so there are no orphans. No external relationships. The logo is embedded SVG and Finn is embedded PNG.
- The PDF has 8 pages at 16:9. Its embedded fonts are named 1 and 2 by Office, have PostScript names Manrope-Regular and Manrope-Bold, and their glyph outlines and advance widths match the source TTFs.
- All 8 slides were rendered and inspected visually. Fixes made: headline and numeral box heights, a timeline label wrap, theme shadows on rules, and contrast of the expired 72.
- The parent agent independently checked all 32 v1 files in `.local/presentation/v2/v1_baseline.json`: 0 differences. The four originally reviewed artifact hashes also remain unchanged.

## Not verified

- The jury device, projector and colour rendering.
- Spoken timing: 170 seconds is a budget, not a measured rehearsal.
- The actual app demo: slide 4 remains an editable placeholder and must be replaced by a verified capture, or use slides 5 and 6 as the fallback.
- No app was operated, built or tested. No Git action was taken.
- Finn frames are 192 × 208 px, upscaled on slides 3, 5 and 6. They look acceptable at 1600 × 900 but are softer than the 384 px original on the cover.

## Rebuild (from repo root)

```powershell
python docs/presentation/v2/build_v2.py
powershell -NoProfile -ExecutionPolicy Bypass -File docs/presentation/v2/render_v2.ps1
python docs/presentation/v2/embed_fonts_v2.py
powershell -NoProfile -ExecutionPolicy Bypass -File docs/presentation/v2/verify_v2.ps1
python docs/presentation/v2/validate_v2.py
```

The scripts write only to `docs/presentation/v2` and `.local/presentation/v2`. `render_v2.ps1` loads Manrope for its own session only and removes it in `finally`. Both PowerPoint scripts close only their own presentation, and quit PowerPoint only if it was not already running.
