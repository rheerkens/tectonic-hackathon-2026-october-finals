# Controleren, timingproef 01

Status: kandidaat ter beoordeling, niet goedgekeurd en niet geïntegreerd.

De oorspronkelijke zes PNG bestanden uit docs/design/finn_pet/frames/review worden zonder beeldbewerking gedeeld door beide spelers. Bronhashes, exacte volgorde en frametijden staan in proposal01.json. De cel blijft 192 bij 208 pixels met oorspronkelijke transparantie, schaal en voetenpositie. Het eerdere current.html blijft bewaard.

Links: volgorde 00, 01, 02, 03, 04, 05. Tijden 150, 150, 150, 150, 150, 280 ms. Totaal 1030 ms.

Rechts: volgorde 00, 01, 02, 03, 01, 04, 05. Tijden 320, 420, 200, 620, 240, 100, 1100 ms. Totaal 3000 ms. Zes unieke bronframes, zeven afspeelstappen. Frame 01 wordt opnieuw gebruikt om de hand terug te brengen voordat Finn knippert. Het aanwijzen duurt nu 820 ms; de laatste houding 1100 ms. De knippering is verkort tot 100 ms.

Visuele beoordeling: de aangehouden wijspositie maakt het inspectiemoment duidelijker zichtbaar dan de korte oorspronkelijke puls. Er zit meer rust tussen herhalingen. De hand blijft echter ineens omhoog en omlaag gaan; hergebruik van frame 01 is geen nieuw getekende tussenpose. De terugkeer naar frame 01 geeft nog een kleine zichtbare verandering in de hoofdstand. Dit is een beoordeelbare ritmevariant, geen volledig vloeiende hertekening en geen bevestiging dat een resultaat juist of klaar is.

Browsercontrole op 20 oktober 2026: beide spelers geladen met PNG beelden van 192 bij 208, alle zes oorspronkelijke en zeven voorgestelde afspeelstappen waargenomen over meerdere lussen. Gedeeld pauzeren hield de klok stil, hervatten liet beide verderlopen. De vergelijking is bekeken op lichte achtergrond in de browser en op donkere achtergrond via html_preview. De mobiele weergave van 360 pixels stapelt de spelers. Geen unit of e2e tests uitgevoerd.

De HTML bevat de zes PNG beelden elk eenmaal, gebruikt één startklok en heeft minder dan 512000 tekens. De bestanden zijn uitsluitend binnen de review sessiemap gemaakt. Bronassets, gedeelde review, idle en applicatiecode zijn niet gewijzigd.

Reproduceren vanuit de projecthoofdmap: python docs/design/finn_pet_refined/sessions/review/build_comparison.py

Vergelijking: http://100.89.117.122:8768/finn_pet_refined/sessions/review/comparison01.html
