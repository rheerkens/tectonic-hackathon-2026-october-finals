# SDtrust Finals Dashboard v3

This version brings the current dashboard's visual language into the reviewed eight slide presentation. The English narrative, fixture evidence boundaries, 170 second budget and deliberate demo placeholder remain unchanged from v2.

Main file: `SDtrust_Finals_Dashboard_v3.pptx`. Also included: the corresponding PDF, English speaker notes, eight PNG slide previews, a contact sheet and `preview.html`.

## Design sources and changes from v2

The source review used the actual current files `apps/web/src/pages/DashboardPage.tsx`, `apps/web/src/pages/StudioPage.tsx`, `apps/web/src/desktop.css` and `apps/web/src/styles.css`.

1. The dashboard's ivory background and coral, amber and blue radial washes become restrained native gradient shapes with soft edges.
2. `sidebar-glass` and `dashboard-card` inspire rounded translucent panels, fine light borders and soft shadows. The slide header, source comparisons, answer panel and pilot steps share those details.
3. The dashboard's `aurora-text` becomes editable gradient lettering on the cover. It uses coral, amber and blue, matching the application colour sequence.
4. `row-symbol` and the selected navigation icon inspire small coloured gradient tiles. Their symbols are native PowerPoint lines, so they stay editable.
5. The dashboard's grouped rows inspire the source ledger and the question, evidence and next step panels. Slide text stays larger than application text for projector readability.

The visual effects are PowerPoint shapes, gradient fills and native effects, not a flattened image of each slide. All text remains editable. The existing approved Finn images and the exact SDtrust SVG are retained. Manrope Regular and Bold are embedded.

## Evidence boundary

This is a translation of source styling. It is not a capture or a validation of the current running dashboard. Two attempts to open the collaborative preview were aborted. No further live app action was performed. The earlier stored pet image was inspected, but no older dashboard or app capture is used in the deck.

Slide 4 remains an explicitly labelled editable demo placeholder. Synthetic policies, simulated colleague contact and future pilot capabilities remain labelled. No claim is added about working connector search, real colleague contact, new voice features, security certification or measured business value.

## Validation

The final PPTX was reopened in Microsoft PowerPoint without separately loading fonts. It has eight slides, eight notes pages, zero measured text overflow and no shapes outside the slide. The PDF has eight pages. The font data in the PDF matches the original Manrope outlines and widths. No external media relationships are present. Every slide was visually inspected after the final export.

`validation_v3.json` contains final artifact hashes and font checks. `native_validation_v3.json` contains native opening and layout checks. `review_and_sources.json` records the style source hashes, source mapping and unchanged previous versions.

All 63 files in the prework v1 and v2 baseline were checked after completion and remain byte identical. No application files were edited. No app builds, app tests or Git mutations were performed. Changes are confined to `docs/presentation/v3/` and `.local/presentation/v3/`.

The jury device, projector rendering, actual app demonstration and spoken timing remain unverified. The 170 seconds is a rehearsal budget. Some approved Finn frames are small source images and softer when enlarged.

## Rebuild

The helper scripts are scoped to v3. Run them in this sequence from the repository root. They use the existing authoring packages under `.local/presentation/vendor` and Microsoft PowerPoint.

```powershell
python docs/presentation/v3/build_v3.py
powershell -NoProfile -ExecutionPolicy Bypass -File docs/presentation/v3/render_v3.ps1
python docs/presentation/v3/embed_fonts_v3.py
powershell -NoProfile -ExecutionPolicy Bypass -File docs/presentation/v3/verify_v3.ps1
python docs/presentation/v3/validate_v3.py
```
