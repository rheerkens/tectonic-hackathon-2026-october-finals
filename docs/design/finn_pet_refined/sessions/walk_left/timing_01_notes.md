# Lopen naar links, timingproef 01

Status: kandidaat, nog niet door de gebruiker gekozen. Geen integratie.

De vergelijking gebruikt dezelfde acht oorspronkelijke PNG beelden in dezelfde volgorde. Links blijven de brontijden 120, 120, 120, 120, 120, 120, 120, 220 ms staan. Rechts worden dat 130, 140, 130, 130, 130, 140, 130, 130 ms. Beide lussen duren 1060 ms. De twee helften rechts duren elk 530 ms; links zijn dat 480 en 580 ms. De langere steunposes rechts zijn bronframes 02 en 06 bij telling vanaf één.

Beoordeling: de timing verdeelt de passen gelijkmatiger en verkort het lang aangehouden laatste beeld. Het verwachte voordeel is minder inhouden bij het opnieuw beginnen. De getekende omslag tussen gestrekte en gebogen benen, hoofdbeweging en voetafwikkeling blijven zichtbaar. Dit is geen nieuw getekende loopcyclus en lost die beperkingen niet op. De interne timing blijft een voorstel voor gezamenlijke afstemming met lopen naar rechts.

De afspelende vergelijking is in de browser bekeken. Beide spelers doorlopen hun beelden op dezelfde klok. Rond 900 ms staat links op frame 8 en rechts op frame 7, zoals de tijdverdeling voorschrijft. De gezamenlijke pauze hield beide spelers stil en hervatten zette beide weer in beweging. Beide beelden laden op hun oorspronkelijke 192 bij 208 pixels. De browser laadde geen externe beeldbronnen. De weergave is gecontroleerd op 728 en 360 pixels breed, waarbij de twee spelers op mobiel onder elkaar staan.

Herkomst, SHA256 per PNG en timings staan in timing_01.json. build_comparison.py maakt alleen bestanden in deze eigen sessiemap, met comparison.template.html als basis. De acht PNG beelden staan eenmalig ingebed in timing_01_comparison.html. De oorspronkelijke current.html blijft bewaard.
