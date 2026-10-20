# Finn ademproef 02

Tweede visuele proef, gemaakt op verzoek na beoordeling van de rustige timingproef. Dit is een aparte kandidaat. De eerste proef en alle oorspronkelijke bronnen blijven behouden.

## Beweging

Zes nieuwe tekeningen via de ingebouwde Imagegen tool, met de echte oorspronkelijke idle strip en idle.png als referenties. Een heel kleine ademcyclus met open ogen. De duur per frame is 900, 700, 600, 600, 700 en 900 ms. De volledige lus duurt 4400 ms.

Deze proef onderzoekt de ademhaling op zichzelf. De knippering uit proef 01 is niet in deze zes beelden gecombineerd. Kleine tekenverschillen in hoofd en schoenen zijn nog zichtbaar. Er wordt geen perfecte pixelvaste identiteit of volledig gladde beweging geclaimd.

## Bestanden

1. animations/idle.gif en animations/idle.webp zijn de bewegende exports. WebP behoudt zichtbare kleuren en alle alpha waarden verliesloos ten opzichte van de nieuwe PNG frames. GIF beperkt kleur en alpha.
2. frames/idle bevat zes lossless PNG bestanden. idle_row.png heeft acht cellen van 192 bij 208, waarvan de laatste twee transparant zijn.
3. spritesheet.png is een volledige kandidaat van 1536 bij 2288. Alleen rij 0 is vervangen. Alle andere rijen zijn pixel voor pixel gelijk aan de oorspronkelijke sheet, inclusief de kijkrichtingen.
4. decoded/idle.png bewaart de ruwe Imagegen uitvoer. Deze wordt niet rechtstreeks als sprite sheet gebruikt. De bestaande Pet extractietool scheidt de zes grote personages van kleine losse randpixels en gebruikt één gedeelde schaal.
5. preview.html vergelijkt proef 01 en 02 met dezelfde klok. qa/native_comparison.png toont de bron en alle zes nieuwe frames op een lichte en donkere achtergrond.
6. validation.json controleert de gecodeerde animaties, timings, transparantie en behoud van de overige rijen. frame_inspection.json en atlas_validation.json komen van de bestaande Pet validators.

## Herkomst en gereedschap

De gebruikte referenties waren ../source_idle_strip.png en ../../finn_pet/idle.png. Het beeld kwam van de ingebouwde Imagegen tool, met transparante achtergrond. De lokale originele uitvoer is gekopieerd uit de map met gegenereerde afbeeldingen; decoded/idle.png is de onbewerkte kopie. De gebruikte prompt staat in actual_prompt.txt.

prepare_pet_run.py maakte pet_request.json, imagegen-jobs.json en de prompts en layout guides. Dat is een standaardsjabloon met meer rijen. Alleen de idle opdracht is hier uitgevoerd. De overige geplande opdrachten zijn geen gegenereerde of goedgekeurde animaties.

extract_strip_frames.py is gebruikt met states idle, method components en de standaard chromadrempel. inspect_frames.py is gebruikt met states idle. build_exports.py codeert GIF, lossless WebP, rijstrip en kandidaat sheet en controleert de resultaten. validate_atlas.py heeft de exacte kandidaat PNG als v2 sheet gecontroleerd en geeft geen fouten of waarschuwingen.

## Beoordeling

De bestanden zijn op structuur en afspelen gecontroleerd. De Edge preview toont de beweging en echte exports op lichte en donkere achtergrond. De T3 browserinspectie liep vast; dat is geen fout in de atlasvalidatie. Er is geen Electron integratie uitgevoerd en geen pet in een account vervangen.

Voor een volgende verfijning blijven de kleine tekenvariaties relevant. De constante alpha grenzen bewijzen een vaste globale schaal en voetenlijn, maar bewijzen niet dat elk detail van de schoenen of bril tussen frames identiek is. De gebruiker beoordeelt of deze ademvariant beter voelt dan proef 01.
