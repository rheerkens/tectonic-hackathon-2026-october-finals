# Iets vragen, timingproef 01

Status: kandidaat ter beoordeling, niet goedgekeurd of geintegreerd.

## Herkomst en timing

Alle beelden komen ongewijzigd uit `docs/design/finn_pet/frames/waiting/`.
`comparison_01.json` bewaart de bronpaden en SHA256 hashes. `build_comparison.ps1`
bouwt de zelfstandige `comparison_01.html` opnieuw vanuit deze bronnen.

Links: bronframes 00, 01, 02, 03, 04, 05, met tijden 150, 150, 150, 150, 150,
260 ms. Totale lus 1010 ms.

Rechts: bronframes 00, 04, 00, 02, 00, met tijden 180, 240, 1800, 110, 1870 ms.
Totale lus 4200 ms. Dit zijn vijf afspeelstappen uit drie unieke bronbeelden.
De laatste en eerste stap gebruiken hetzelfde beeld, zodat die rusthouding
bij de lusgrens zonder beeldwisseling doorloopt.

Geen hertekening, interpolatie, verschuiving of schaalbewerking. Transparantie
en celmaat 192 bij 208 blijven die van de originele PNG bestanden. De zes
bronbeelden staan een keer in de HTML en worden door beide spelers gedeeld.

## Visuele beoordeling

De werkelijk afspelende vergelijking is bekeken in de bestaande browser.
Bij ongeveer 75, 325, 1325, 2275 en 2925 ms zijn beelden uit beide spelers
waargenomen. Rechts waren daarbij achtereenvolgens bronframes 00, 04, 00, 02,
00 zichtbaar. Links bleef de oorspronkelijke reeks op haar eigen cadans lopen.

Rechts wisselt de blik minder en blijft de vragende open hand langer rustig.
Het korte glimlachaccent is klein. Bij het gesloten ogen beeld blijft een
zichtbaar verschil in hoofdcontour bestaan. Dit is een rustigere timingproef,
geen nieuw getekend handgebaar. Een echt opkomende of terugzakkende hand is met
deze geselecteerde bronbeelden niet gerealiseerd.

De browsercontrole bevestigde laden, afspelen, gezamenlijk pauzeren, hervatten
en beelden van 192 bij 208. Tijdens pauze bleef de gezamenlijke klok gelijk.
De HTML preview is bekeken op 728 en 375 pixels breed. De mobiele weergave zet
beide spelers onder elkaar. Deze controles zeggen niets over appintegratie
of goedkeuring door de gebruiker. Er zijn geen unit of e2e tests uitgevoerd.

## Bestanden en bereikbaarheid

De zelfstandige HTML bevat alle beelddata en heeft minder dan 512000 tekens.
De bestaande server biedt haar aan via:

http://100.89.117.122:8768/finn_pet_refined/sessions/waiting/comparison_01.html

De oude oorspronkelijke viewer blijft bewaard. Geen gedeeld reviewbestand,
origineel asset, runtimebestand of bestand uit de idle sessie is gewijzigd.
