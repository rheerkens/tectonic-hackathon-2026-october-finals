# Iets vragen, getekende knippering 02

Status: kandidaat ter beoordeling. Niet goedgekeurd en niet geintegreerd.
De eerdere timingproef 01 en de oorspronkelijke viewer blijven bewaard.

## Gerichte verandering

De oorspronkelijke gesloten ogen pose kantelt ook het hoofd. Timingproef 01
behield dat zichtbare sprongetje en voegde een kort glimlachaccent toe dat
eveneens de getekende gezichtscontour liet wisselen.

Proef 02 gebruikt de oorspronkelijke pose `frames/waiting/00.png` als vaste
basis. Nieuw tekenwerk uit de ingebouwde `image_gen.imagegen` levert een
halfgesloten en een gesloten oogstand. De halfgesloten stand wordt zowel bij
sluiten als openen gebruikt. Het glimlachaccent uit proef 01 vervalt.

Rechts is de volgorde: open 2100 ms, halfgesloten 50 ms, gesloten 80 ms,
halfgesloten 70 ms, open 1900 ms. Totaal 4200 ms, waarvan 200 ms knippering.
Dit zijn drie unieke beelden en vijf afspeelstappen. De laatste en eerste
stap gebruiken exact hetzelfde oorspronkelijke PNG beeld.

Links staan de zes originele beelden in de oorspronkelijke volgorde en met
150, 150, 150, 150, 150, 260 ms, samen 1010 ms.

## Behoud en herkomst

De ruwe generatie staat in `drawn_02/generated_strip.png`. De echte Finn
bronnen en het referentieblad met drie identieke kopieen van frame 00 zijn
gebruikt bij de generatie. De volledige prompt staat in `drawn_02/prompt.txt`.

De ruwe uitvoer veranderde ook haar, kleding en andere details. Daarom zijn
de volledige gegenereerde figuren niet gebruikt. `drawn_02/extract.ps1`
normaliseert de ruwe cellen voor extractie en neemt alleen het nieuw getekende
oogwerk binnen de originele brillenglazen over. Een smalle ruimtelijke
randafwerking sluit de oogvlakken aan. Er is geen crossfade tussen poses.
De derde gegenereerde cel zag er volledig open uit en is niet gebruikt.

De oorspronkelijke RGB pixels buiten de oogvlakken en alle alpha waarden
zijn exact behouden. `drawn_02/pixel_inspection.json` legt vast: 599 en 602
veranderde pixels, uitsluitend binnen x 78 tot 123 en y 42 tot 63, nul alpha
verschillen en nul verschillen buiten het gebied van de brillenglazen.
Haar, brilranden, mond, hoofdcontour, kleding, map, hand en voeten zijn dus
gelijk aan de oorspronkelijke basis. De celmaat blijft 192 bij 208.

`comparison_02.json` bevat de indexen, tijden, bronpaden, hashes en beperkingen.
`build_comparison_02.ps1` bouwt de zelfstandige HTML uit de bewaarde beelden.
De beelddata zijn eenmalig opgenomen, gedeeld door de twee spelers, en de
HTML blijft onder 512000 tekens.

## Beoordeling in de browser

De afspelende vergelijking is bekeken rond 2072, 2139, 2189, 2255, 2322 en
4222 ms. Rechts waren open, halfgesloten, gesloten, halfgesloten, open en
opnieuw open zichtbaar. Daarmee zijn zowel het sluiten en openen als de
lusovergang bekeken. De hoofdcontour, hand en voeten bewegen hierbij niet.
Mijn visuele indruk is dat de knippering hierdoor vloeiender leest dan de
oude gekantelde gesloten ogen pose. Dit is geen gebruikersgoedkeuring.

Pauzeren hield de gedeelde klok stil en hervatten werkte. De vergelijking is
op 728 en 375 pixels breed bekeken. Links en rechts hebben dezelfde
weergavegrootte en achtergrond; mobiel staan ze onder elkaar.

## Grenzen van deze kandidaat

De hand blijft uitgestoken; er is geen nieuw optillen of zakken getekend.
Tussen knipperingen is de houding stil. De algemene overgang vanuit een
andere animatiestatus is niet uitgewerkt. De gebruiker moet nog beoordelen
of de knippering natuurlijk genoeg voelt en deze rustige vragende pose past.

Er zijn geen bronassets, gedeelde documenten, idle bestanden of
applicatiebestanden gewijzigd. Er zijn geen unit of e2e tests uitgevoerd.

http://100.89.117.122:8768/finn_pet_refined/sessions/waiting/comparison_02.html
