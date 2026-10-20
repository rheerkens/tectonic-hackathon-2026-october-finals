# Teleurstelling, correctie van de lichaamsverhoudingen

Status: goedgekeurd door de gebruiker voor overname door de centrale Finn sessie.

Expliciete goedkeuring: "In orde zo, mag overgelomen worden". Dit betreft uitsluitend arm_03, met de vaste oorspronkelijke lichaamsbouw. De eerder afgekeurde tekenproef 02 blijft afgekeurd.

Aanleiding: de gebruiker keurde tekenproef 02 af omdat Finn bij de nieuwe frames zichtbaar dikker werd. De vorige proef veranderde de volledige figuur. Proef 03 gebruikt uitsluitend de armstukken uit dat tekenwerk op een vaste basis uit de oorspronkelijke bron.

Basis: origineel failed/00.png. Het kleine stuk romp dat achter de oorspronkelijke vrije arm verborgen zit, komt uit failed/03.png, twee pixels naar rechts geplaatst. Deze aanvulling is in alle bewegende armposes identiek. Alle bewerkingen zijn beperkt tot het armgebied. De oorspronkelijke map, vasthoudende hand, benen en schoenen blijven ongewijzigd. De nieuwe hand bedekt bij de slaap enkele originele gezichtspixels, zoals bij een echte armbeweging.

De vier armstanden uit de eerdere ingebouwde imagegen uitvoer worden als afzonderlijke lagen gebruikt. Er zijn voor deze correctie geen volledige figuren opnieuw gegenereerd. De oorspronkelijke tekenprompts en uitvoer blijven in drawn_02 bewaard. build_frames.py legt de gebruikte uitsneden en maskers reproduceerbaar vast. provenance.json bevat de volledige herkomst.

De bestandscontrole telt nul gewijzigde pixels buiten het vastgelegde armgebied in elk van de vier nieuwe frames. De onderste zichtbare pixel blijft op y 202. De figuur wordt nergens geschaald. Begin en einde gebruiken hetzelfde oorspronkelijke rustbeeld.

Afspelen in de browser: alle acht bronframes en negen kandidaatstappen zijn bereikt. De oorspronkelijke lus duurt 1220 ms. De kandidaat behoudt de tijden van proef 02: 120, 90, 90, 90, 240, 100, 100, 100 en 2470 ms, samen 3400 ms. Pauzeren houdt de posities van beide spelers vast; hervatten werkt. De vergelijking is op 728 en 360 pixels breed bekeken.

Visueel is het opzwellen van hoofd, romp, map en schoenen uit proef 02 verdwenen. De arm beweegt langs de getekende tussenstanden. De gebruiker heeft de getoonde variant, inclusief de eerder genoemde aansluiting en schaduw van de mouw, aanvaard. Er worden geen verdere visuele wijzigingen gedaan voor deze overname.

Geen applicatiebestanden, oorspronkelijke assets of gedeelde documenten gewijzigd. Eerdere proeven blijven bewaard. Geen Git mutaties, unit of e2e tests, installaties of serverprocessen uitgevoerd.
