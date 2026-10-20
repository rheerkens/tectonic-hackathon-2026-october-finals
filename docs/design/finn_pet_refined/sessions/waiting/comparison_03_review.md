# Iets vragen, handgebaar 03

Status: goedgekeurd door de gebruiker met de woorden "In orde zo, mag overgenomen worden". Integratie wordt door de centrale sessie verzorgd.
Gebruikersfeedback: proef 02 is enorm statisch, meer animatie gewenst.
Alle eerdere proeven blijven ongewijzigd bewaard.

## Wat verandert

Drie nieuwe getekende armstanden laten de open hand geleidelijk hoger en
verder naar voren komen. Na een korte aangehouden vraag gaat de beweging in
omgekeerde volgorde terug. De rustige knippering uit proef 02 blijft behouden.
De totale lus duurt 3200 ms, met zes unieke beelden en elf afspeelstappen.

Volgorde en tijden: basis 400 ms, arm 1 90 ms, arm 2 90 ms, arm 3 650 ms,
arm 2 100 ms, arm 1 100 ms, basis 650 ms, halfgesloten ogen 50 ms,
gesloten ogen 80 ms, halfgesloten ogen 70 ms, basis 920 ms.

De laatste en eerste pose zijn hetzelfde oorspronkelijke beeld, zonder
beeldsprong op de lusgrens. Links blijft de oorspronkelijke reeks met
150, 150, 150, 150, 150, 260 ms en een totale lus van 1010 ms.

## Tekenwerk en behoud

Ingebouwde image_gen.imagegen, met de oorspronkelijke Finn pose en de
drievoudige referentiestrook uit proef 02. De exacte prompt en ruwe uitvoer
staan in `drawn_03/prompt.txt` en `drawn_03/generated_strip.png`.

De uitvoer bevat drie afzonderlijk getekende armstanden. Er zijn geen
programmatisch vervormde armen, tussenframes uit een crossfade of
framevermenging gebruikt. `drawn_03/extract.ps1` normaliseert de generaties
op de oorspronkelijke schaal en plaatst alleen het gebied van de vrije arm
op bronframe 00. Een smalle ruimtelijke aansluiting aan de schouder voorkomt
een harde rand. Dat is geen overgang tussen animatieframes.

`drawn_03/pixel_inspection.json` bevestigt dat alle drie beelden 192 bij 208
zijn en buiten het gebied x 118 tot 180, y 78 tot 134 pixelgelijk zijn aan
de bron. Gezicht, map, overige lichaam en voeten zijn behouden. Transparantie
van de bewegende arm volgt het nieuwe getekende silhouet.

De zelfstandige viewer bevat de zes oorspronkelijke PNG beelden slechts
een keer. Voor de nieuwe beelden zijn alleen kleine PNG uitsneden met
gewijzigde arm of ogen ingebed. De browser bouwt de volledige beelden op
zonder schalen, vervormen of mengen tussen poses. De volledige PNG bestanden
zijn eveneens bewaard. De HTML bevat ongeveer 356 duizend tekens en blijft
onder de limiet van 512000 tekens.

## Afspelen en beoordeling

De daadwerkelijk afspelende vergelijking is bekeken bij ongeveer 392, 441,
542, 858, 1275, 1391, 1475 en 3225 ms. Dit dekt rust, optillen, aanhouden,
terugzakken en de volgende lus. De hand maakt zichtbaar meer beweging dan
in proef 02. De drie armstanden blijven discrete stappen, vooral wanneer
vergroot bekeken. Geen claim van volledig vloeiende animatie of
gebruikersgoedkeuring. Hoofd en voeten blijven zichtbaar stabiel.

De gebruiker moet beoordelen of hoeveelheid beweging en gebaar passen.
De volledige lichaamsbeweging en een overgang vanuit een andere status
vallen buiten deze kandidaat. Geen appintegratie, bronvervanging, gedeelde
documentwijzigingen, Git mutaties of unit of e2e tests.

http://100.89.117.122:8768/finn_pet_refined/sessions/waiting/comparison_03.html
