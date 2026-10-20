# Controleren, proef 02 met getekende tussenhoudingen

Status: door de gebruiker goedgekeurd voor overname met "In orde mag overgenomen worden". Overname verloopt via de centrale coördinatiesessie. Timingproef 01 en de oorspronkelijke beelden blijven bewaard.

## Aanleiding en tekenwerk

De gebruiker gaf aan dat schokkerigheid voor de meeste animaties het probleem is. Een langere rusttijd lost de plotselinge armwisseling niet op. Deze proef voegt daarom twee echte armhoudingen toe: een lage hand die net van de heup komt, en een hogere hand op weg naar de map. Dezelfde twee tekeningen worden in omgekeerde volgorde gebruikt op de terugweg. Geen crossfade of vervorming.

De ingebouwde imagegen tool maakte de tekeningen met de echte Finn bronframes als referentie. De eerste uitvoer zette beide handen te hoog. Deze volledige uitvoer is bewaard als raw_pair_rejected.png; alleen de linker cel is bruikbaar als hogere tussenhouding. Een gerichte tweede aanvraag leverde de lage tussenhouding, raw_low.png. Beide volledige prompts zijn bewaard in drawn02/imagegen_prompt.txt en drawn02/low_arm_prompt.txt.

## Voorbereiding en behoud van identiteit

De ruwe uitvoer is volgens de celindeling verkleind naar 192 bij 208 en met een gehele pixelverschuiving uitgelijnd op het oorspronkelijke voetenanker. Alleen de getekende rechterarmregio, x 108 tot 147 en y 89 tot 144, is overgenomen op bronframe 01. Alle overige pixels komen uit die bron. Het hoofd, de bril, het haar en de voeten zijn dus geen opnieuw gegenereerde varianten. De twee extractiescripts leggen deze verwerking vast. De tekeningen zelf komen van imagegen; de scripts tekenen geen arm.

asset_checks.json bevestigt voor beide nieuwe PNG bestanden dat geen pixel buiten die armregio veranderd is en dat de voeten bytegelijk zijn. De hogere arm komt maximaal twee pixels verder naar rechts dan de oorspronkelijke alpha grens; dit is lokale elleboogbeweging, geen verandering van de lichaamschaal. De cel en transparantie blijven behouden. Deze controles bewijzen geen visuele kwaliteit.

## Beweging en timing

Links staan de oorspronkelijke zes beelden in hun oorspronkelijke volgorde en tijden: 150, 150, 150, 150, 150, 280 ms, samen 1030 ms.

Rechts is de volgorde: bron 00, bron 01, lage nieuwe arm, hoge nieuwe arm, bron 02, bron 03, bron 02, hoge nieuwe arm, lage nieuwe arm, bron 01, bron 00. De tijden zijn 320, 100, 90, 90, 100, 650, 100, 90, 90, 100, 1070 ms. Samen 2800 ms, elf afspeelstappen met zes unieke houdingen, waarvan twee nieuw getekend. Het eerste en laatste beeld zijn exact dezelfde bron 00; de overgang over de lusgrens bevat daarom geen posewisseling.

De ogen blijven in deze gerichte armproef open. De oorspronkelijke gesloten ogen en de overgang daarheen zijn bewust niet opgenomen. Dit is geen nieuwe vloeiende knippering. Het kort kijken naar de map en de kleine bronvariatie tussen 02 en 03 blijven aanwezig. Het is inspectie, geen bevestigend knikje of succesgebaar.

## Beoordeling van de afspelende kandidaat

De grote directe sprong van heup naar map is zichtbaar opgebroken. De terugweg volgt nu dezelfde armboog en eindigt in de beginhouding. De overgang bij het contact met de map oogt nog wat hoekig; de fijne vingerhouding en mouwcontour sluiten nog niet overal vloeiend aan. De proef is bruikbaar om de winst van echte tussenhoudingen te beoordelen, maar is niet als volledig vloeiend of definitief aangemerkt.

De browser doorliep alle elf stappen gedurende meerdere lussen. Pauzeren hield de gedeelde klok stil; hervatten liet beide spelers verderlopen. playback_observations.json en playback_strip.webp bewaren die waarneming. De strip is een verkleind overzicht van werkelijk afgespeelde beelden, geen bewijs van exacte frametiming. De volledige PNG beelden staan eenmalig ingebed in de vergelijking. html_preview is bekeken op 728 en 360 pixels; op mobiel staan de spelers onder elkaar. De HTML telt circa 414000 tekens en blijft onder de limiet van 512000. Geen unit of e2e tests uitgevoerd.

Vergelijking: http://100.89.117.122:8768/finn_pet_refined/sessions/review/comparison02.html

Herkomst, hashes, tijden en volgorde: proposal02.json. De eerdere comparison01.html blijft ongewijzigd.
