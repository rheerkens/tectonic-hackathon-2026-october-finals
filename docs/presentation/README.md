# SDtrust Finals Draft v1

The first editable pitch is `SDtrust_Finals_Draft_v1.pptx`. The companion PDF is a stable viewing copy. `SDtrust_Finals_Draft_v1_Notes.md` contains the outline, first English script, timing, evidence boundaries and source references. The PowerPoint also contains those notes per slide.

Eight slides, 16:9. The planned delivery is 170 seconds including a 45 second demonstration. This leaves ten seconds below the explicit three minute pitch ceiling in the guide. Actual spoken timing still needs rehearsal. Five minutes of questions are separate. The main stage agenda lists a ten minute finalist slot without a separate speaking rule, so the draft conservatively uses the explicit three minute rule.

The visual system uses the actual SDtrust SVG, original Finn and the approved waving frame. Colours come from desktop.css, with Manrope from the existing app assets. Full Regular and Bold font faces are embedded. The original font and its OFL licence are included in assets. All text and source panels are editable PowerPoint objects. The logo is vector media and Finn is raster media.

Slide 4 intentionally contains a labelled demonstration placeholder. No older screenshot is presented as the current app. Replace it with a final verified capture, or use slides 5 and 6 as the fallback walkthrough. No video or live app hyperlink is embedded.

## Content boundaries

The Atlas payroll and sick leave numbers are synthetic fixture content. The current inspected frontend replays hardcoded scenarios in memory. It does not prove the broader SQLite and real tool architecture described as intent in the README. Contact is simulated. Trust scores are authored fixture values, not measured model accuracy. The deck does not claim live connectors, actual colleague messaging, autonomous knowledge maintenance, new voice features or a completed security review.

The final slide is explicitly a proposed pilot. Its measures are hypotheses to validate, not achieved savings. The final Aikido scan evidence must be prepared separately by the application team.

## Verification

The final PPTX was opened by Microsoft PowerPoint after font embedding, without separately loading the font files. All eight slides were exported at 1600 × 900. Native text bounds reported zero overflow. The PDF contains eight pages and uses Manrope. Every slide has source and evidence notes. There are no externally linked media files. See validation.json and final_native_validation.json for results and artifact hashes. Preview images are in preview/.

This is presentation verification only. No app processes were started or stopped. No app builds or tests were run. No Git staging, pull, commit or push was performed. The final jury device, the presenter’s delivery time and demo playback remain unverified.

## Rebuild

The helpers only write inside docs/presentation and .local/presentation. Run from the shared repository root, with no app runtime needed.

```powershell
python docs/presentation/build_deck.py
powershell -NoProfile -ExecutionPolicy Bypass -File docs/presentation/render_deck.ps1
python docs/presentation/embed_fonts.py
powershell -NoProfile -ExecutionPolicy Bypass -File docs/presentation/verify_native.ps1
python docs/presentation/validate_artifacts.py
```

The Python helper packages are isolated under .local/presentation/vendor. Microsoft PowerPoint is required for native export. The scripts close only their own presentation and quit PowerPoint only when no PowerPoint process existed beforehand.

Font packaging follows the [Microsoft font part description](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/1663dabc-5d98-463f-889e-bcd9b77c3d34), the [PresentationML embedded font structure](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.embeddedfont) and the [EOT format, section 3.2](https://www.w3.org/submissions/EOT/). Office uses internal numeric family names in the exported PDF. The verification checks the PostScript names and compares sample glyph outlines and widths with the original Manrope font files.

Content source hashes are in source_manifest.json. They identify the files read for this draft, not a claim that the ongoing app work has stopped changing.
