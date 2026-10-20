# Finn animatieproef

## Opdracht en afbakening

De gebruiker koos op 20 oktober 2026 voor rustiger idle, subtieler ademen en minder schokjes. Eerste beslispunt is één kleine bewegende proef beoordelen. Alleen docs/design/finn_pet_refined en dit document worden gewijzigd. De originele assets en applicatiecode blijven behouden. Dit is een assetlevering, zonder desktopintegratie of accountwijziging.

## Visuele audit van de bron

De originele sheet, standaardhouding, losse frames en alle negen afspelende WebP animaties zijn bekeken. Een browseropname van de negen bewegingen staat in docs/design/finn_pet_refined/source_playback.mp4. De vier opnamebeelden in source_playback_samples.png tonen verschillende momenten. De opnames zijn van de assetpreview, niet van Electron.

Idle heeft zes frames in 1100 ms. Het opvallendste ritmische gebaar is de knippering. Op die korte lus komt deze voortdurend terug. De geringe verschillen in romp en gezicht geven wat leven, maar zijn geen vloeiend getekende ademcyclus. Het veranderen van timing kan de frequentie verminderen, maar kan geen ontbrekende tussenposes toevoegen.

Het idle anker is al goed: alle zes alpha grenzen zijn x 47 tot 144 en y 5 tot 202, binnen cellen van 192 bij 208. De onderste zichtbare pixel blijft op y 202. Er is geen aanleiding de frames afzonderlijk te schalen of te verschuiven. Bril, haar, rode cardigan, hemd, map met schild en schoenen blijven herkenbaar. Kleine getekende variaties in contour en detail blijven zichtbaar bij framewissels.

Zwaaien herhaalt een uitgesproken handgebaar in 700 ms. Wachten gebruikt een open vragende hand en knippert. Aan het werk brengt de hand bij kin en bril. Controleren kijkt naar de map. Deze betekenis is bruikbaar, maar de lussen van ongeveer één seconde kunnen bij langdurig afspelen druk worden. Eerst de idle proef beoordelen; deze staten worden nog niet herwerkt.

De twee looprichtingen hebben duidelijk afwisselende passen. Verticale variatie hoort daar deels bij. De map is bij het naar links lopen grotendeels aan de afgewende zijde; de zichtbaarheid is daarom niet hetzelfde als bij rechts. Dat moet bij een toekomstige bewerking behouden of bewust beoordeeld worden, niet blind spiegelen.

Springen keert terug naar y 202 en komt op het hoogste punt tot y 184. De getekende sprong is iets kleiner dan de standaard idle houding. Een toekomstige overgang tussen staten verdient daarom een aparte schaalcontrole. De huidige proef verandert springen niet.

De bronvalidatie meldt geen chromaranden, fouten of waarschuwingen. De bekeken bronbeelden tonen geen opvallende losse rand rond idle. Transparante WebP behoudt de zachte alpha randen. GIF heeft een beperkt palet en binaire transparantie en is daarom vooral een kijkvoorbeeld.

## Proef 01

De zes originele idle PNG bestanden zijn byte voor byte gekopieerd, in dezelfde volgorde. Geen hertekening, schaalbewerking, vervorming, verschuiving of gegenereerde tussenframes. Imagegen is voor deze timingproef niet nodig en niet aangeroepen. Voor een nieuwe ademtekening wordt de gelezen Imagegen skill gebruikt met de echte Finn bronnen.

De nieuwe frametijden zijn 1400, 900, 90, 110, 120 en 1780 ms. Samen 4400 ms, met onbeperkt herhalen. Open ogen krijgen meer rust; de knippering blijft kort. Dit vermindert de herhaling met factor vier. Het is een vergelijking van ritme, nog geen oplossing voor getekende schokjes of een nieuwe vloeiende ademhaling.

De bestandsnamen, state idle, zes frames en celmaat blijven compatibel. idle_row.png heeft acht kolommen; de laatste twee zijn transparant. De volledige originele sheet blijft de bron voor alle andere rijen en kijkrichtingen. Een afspeler moet de nieuwe expliciete tijden gebruiken. Een afspeler met vaste oude tijden laat deze proef niet zien.

## Levering en controle

docs/design/finn_pet_refined/preview.html is de interactieve vergelijking met dezelfde klok, pauzeren, tijdlijn, lichte en donkere achtergrond en afzonderlijke weergave van de echte GIF en WebP exports.

animations.json legt bronhash, frameherkomst, timings en beperkingen vast. frames/idle bevat de zes lossless PNG bronnen. animations/idle.gif en animations/idle.webp zijn de bewegende exports. timing_contact.png toont alle frames met hun starttijd. build_trial.py reproduceert de timingproef en voert assetcontroles uit. Het gebruikt de bestaande Pet exportfunctie voor GIF en Pillow voor lossless WebP.

validation.json controleert de werkelijke gecodeerde bestanden, zes frames, exacte frametijden, lusduur, transparantie, bronhashes en PNG kopieën. Voor WebP zijn alle zichtbare RGB waarden en alle alpha waarden exact gelijk aan de bron. De encoder wijzigt verborgen RGB onder volledig transparante pixels; de PNG bestanden behouden de volledige oorspronkelijke bytes. GIF is door palet en alpha beperking niet pixelgelijk.

frame_inspection.json komt uit het bestaande Pet inspect_frames.py en controleert de idle frames. Er zijn geen nieuwe unit tests of e2e tests geschreven of uitgevoerd.

De vergelijking is ook in de browser bekeken op lichte en donkere achtergrond. Beide echte exportformaten laden, de tijdlijn toont andere frames en pauzeren werkt. trial_playback.mp4 bewaart deze controle. Browseropnames hebben een variabele opnamecadans; FFmpeg meldt bij uitlezen naar de null muxer dubbele DTS waarden. Deze opnames zijn visueel bewijs en geen timingreferentie. De exacte tijden zijn rechtstreeks uit GIF en WebP gelezen in validation.json.

De tijdelijke assetserver luistert alleen op het eigen Tailscale adres en serveert docs/design. De vergelijking is bereikbaar op http://100.89.117.122:8767/finn_pet_refined/preview.html zolang die server actief blijft. Beide previews werken ook lokaal vanuit de checkout.

## Volgende keuze

Eerst beoordelen of deze rustigere cadans goed voelt. Daarna kan één echte ademcyclus met vaste voeten en minimale rompbeweging worden getekend. Alternatief is eerst de kleine contourverschillen in idle aanpakken. Uitbreidingen en aanpassingen aan de overige acht staten blijven voorstellen totdat de gebruiker een keuze maakt.
