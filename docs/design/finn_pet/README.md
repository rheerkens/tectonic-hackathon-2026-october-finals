# Finn pet assets

De bestaande actieve Finn pet uit ChatGPT Work, gedownload op 20 oktober 2026.

## Bestanden

1. `spritesheet.png` is het ongewijzigde origineel. Afmetingen 1536 × 2288 pixels, met transparantie.
2. `animations.json` bevat de indeling, frametijden, bronidentificatie en SHA256 van het origineel.
3. `animations/` bevat negen animaties, elk als GIF en lossless WebP.
4. `frames/` bevat de 57 losse animatieframes als PNG, zonder herschaling.
5. `look_directions/` bevat zestien losse kijkrichtingen als PNG.
6. `idle.png` is het eerste rustige frame van de pet, 192 × 208 pixels.
7. `preview.html` toont alle animaties en kijkrichtingen lokaal, zonder internetverbinding.

## Gebruik

De sprite sheet heeft acht kolommen en elf rijen. Iedere cel is 192 × 208 pixels. Rijen nul tot en met acht bevatten de negen animaties. De laatste twee rijen bevatten de kijkrichtingen, met stappen van 22,5 graden vanaf boven, met de klok mee. Voor recht vooruit gebruik je het eerste idle frame.

Gebruik bij voorkeur de originele sprite sheet of de WebP bestanden. De WebP exports zijn lossless en behouden transparantie. De GIF bestanden zijn bedoeld als eenvoudig afspeelbare voorbeelden en hebben een beperkt kleurenpalet.

De frametijden komen uit de geïnstalleerde Work Pets v2 specificatie. De kijkrichtingen zijn losse houdingen, zonder vaste animatietiming.

De bestaande `../finn.png` en de conceptbeelden zijn niet gewijzigd. Deze map voegt assets toe; de desktopapp gebruikt ze nog niet automatisch.
