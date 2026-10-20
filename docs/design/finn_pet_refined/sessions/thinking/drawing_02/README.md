# Denkpose, tekenproef 02

Deze kandidaat is op 20 oktober 2026 door de gebruiker goedgekeurd voor overname met de woorden: "Deze mag overgenomen worden". De centrale Finn sessie verzorgt de integratie. Deze sessie heeft geen bronbestanden of applicatiebestanden vervangen.

De ingebouwde imagegen tool tekende twee tussenhoudingen tussen kin en bril, met de oorspronkelijke `frames/running/00.png` en `02.png` als referenties. `imagegen_raw.png` bewaart de onbewerkte uitvoer. `prompt.txt` bewaart de volledige opdracht.

De eerste timingproef in `../compare_01.html` en `../timing_01.json` blijft behouden.

## Gebruikte kandidaat

De twee oorspronkelijke grote sprongen zitten tussen bronframes 01 en 02 en tussen 03 en 04. Bij 05 naar 00 verandert dezelfde rusthouding opnieuw een beetje van tekening. Alleen de timing verlengen lost deze verschillen niet op.

De eerste gegenereerde strip bevatte twee vrij hoge handstanden. Alleen de lagere daarvan wordt gebruikt als `middle.png`. De hogere blijft als experiment bewaard. Een tweede gerichte generatie leverde de vroege beweging vanaf de kin, `low.png`; `low_raw.png` en `low_prompt.txt` bewaren daarvan de herkomst.

De armregio is samengesteld op het vaste oorspronkelijke frame 00. De pose bij de bril gebruikt de arm uit bronframe 02. Buiten die regio blijven de bronpixels gelijk, inclusief benen en schoenen. Dit is montage van echte getekende houdingen, zonder crossfade of vervorming.

De zes fasen zijn rust, lage tussenpose, middelste tussenpose, bril aanraken, middelste tussenpose, lage tussenpose. De lus keert vervolgens naar exact dezelfde rustpose terug. De tijden zijn 3540, 100, 110, 440, 110 en 100 ms, samen 4400 ms. Vier unieke houdingen worden gebruikt; twee daarvan bevatten nieuw tekenwerk.

`../compare_02.html` toont de oorspronkelijke animatie links en deze kandidaat rechts met één klok en één pauzeknop. `candidate.webp` is de zelfstandige bewegende export. `candidate.json` bevat bronhashes, volgorde, tijden en technische controles.

## Visuele beoordeling

De browser liet twee volledige lussen zien, inclusief terugkeer naar de rustpose. Beide spelers laden op 192 bij 208 pixels en pauzeren en hervatten samen. De armverplaatsing is kleiner per stap en het onbedoelde meeveranderen van benen en schoenen is weg. Bij vingers en kin blijft een kleine vormwissel zichtbaar; dit is nog geen volledig vloeiende animatie. De gebruiker heeft de getoonde versie inclusief deze gemelde beperking goedgekeurd. `approval.json` koppelt de toestemming aan de SHA256 van `candidate.webp`.
