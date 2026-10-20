# Inventaris van Finn houdingen

Bekeken op 20 oktober 2026. Dit document inventariseert bestaande bronassets en de leesbare koppeling in applicatiecode. Het levert geen nieuwe animaties en claimt geen live controle van Electron of de productflow.

## Hoofdbevinding

De bestaande set dekt rust, begroeten, bewegen, nadenken, controleren, een vraag stellen, teleurstelling en een uitbundige afronding. Voor een rustige desktoppet is meer toevoegen niet de eerste noodzaak. De grootste winst zit in rustigere timing en een duidelijke keuze wanneer een bestaande houding verschijnt. Een klein bevestigend knikje is het meest concrete ontbrekende gebaar. Aandachtig luisteren en discreet op een collega wachten kunnen eerst met bestaande poses worden ingevuld.

## Bronnen en telling

Gelezen: AGENTS.md, README.md, docs/design/finn_pet/README.md, docs/design/finn_pet/animations.json, docs/design/finn_pet/validation.json, docs/finn_animation_brief.md en de metadata van proef 01. De volledige spritesheet is visueel bekeken, evenals losse PNG beelden van waiting, running, review, failed, jumping en een kijkrichting.

De bestandsinventaris bevestigt negen animaties met samen 57 PNG frames en zestien statische kijkrichtingen. De 73 gebruikte cellen in het manifest zijn dus 57 animatieframes plus 16 kijkposes. Neutral is het eerste idle frame en telt niet als extra broncel. De sheet heeft acht kolommen en elf rijen, met cellen van 192 bij 208 pixels. De totale maat is 1536 bij 2288 pixels.

De SHA256 van de huidige originele spritesheet is 4c441420de210d57ef4e84ee908081b0073b40af2710f5ed1914771471b25a88 en komt overeen met het bronmanifest. De bestaande bronvalidatie rapporteert geen fouten, waarschuwingen of chromaranden. Die bestaande validatie is gelezen, niet opnieuw uitgevoerd.

## De negen bestaande animaties

Rijen en kolommen tellen vanaf nul. De twee richtingsvarianten staan hieronder als lopen rechts en lopen links. Hun exacte technische namen staan in het bronmanifest bij respectievelijk rij 1 en rij 2.

1. **idle, rij 0.** Zes frames, 1100 ms per lus. Finn staat rechtop met zijn map tegen de romp, de vrije hand bij de heup, voeten op dezelfde plek en een lichte glimlach. De ogen sluiten en openen. De bron bevat kleine getekende verschillen, geen overtuigend doorgaande ademtekening. Functioneel geschikt voor beschikbaar zijn, neutrale aanwezigheid en rustig wachten. Brontijden: 280, 110, 110, 140, 140 en 320 ms. Bewijs: frames/idle/00.png tot en met 05.png.

2. **Lopen rechts, rij 1.** Acht frames, 1060 ms per lus. Zijaanzicht naar rechts, afwisselende grote passen, zwaaiende vrije arm en map zichtbaar aan de nabije zijde. Functioneel geschikt voor het verslepen van het petvenster. Geen logisch signaal voor kennis zoeken of op iemand wachten. Brontijden: zevenmaal 120 en vervolgens 220 ms. Bewijs: de volledige rij 1 van spritesheet.png.

3. **Lopen links, rij 2.** Acht frames, 1060 ms per lus. Zijaanzicht naar links en afwisselende passen. De map zit meer aan de afgewende zijde en is minder zichtbaar. Dit is een eigen bronreeks, niet zomaar dezelfde tekening gespiegeld. Functioneel dezelfde dekking als lopen rechts. Brontijden: zevenmaal 120 en vervolgens 220 ms. Bewijs: de volledige rij 2 van spritesheet.png.

4. **waving, rij 3.** Vier frames, 700 ms per lus. Vanuit de gewone houding gaat de vrije hand naast het hoofd omhoog en weer naar beneden. Map en glimlach blijven aanwezig. Geschikt als korte begroeting of aandacht bij openen, onrustig wanneer langdurig herhaald. Brontijden: 140, 140, 140 en 280 ms. Bewijs: de volledige rij 3 van spritesheet.png.

5. **jumping, rij 4.** Vijf frames, 840 ms per lus. Kleine verticale sprong met beide voeten los, daarna weer landen. De bronpose oogt kleiner dan idle. Geschikt voor een opvallend succesmoment, voor gewone antwoorden mogelijk te uitbundig. Brontijden: 140, 140, 140, 140 en 280 ms. Bewijs: frames/jumping/02.png en rij 4 van spritesheet.png. Het bestaande animatiebrief meldt een onderste zichtbare pixel van y 184 op het hoogste punt en y 202 bij landen.

6. **failed, rij 5.** Acht frames, 1220 ms per lus. Hoofd en blik zakken, mond en wenkbrauwen worden bezorgd, de vrije hand gaat naar de zijkant van het hoofd. Geschikt voor een fout of mislukte handeling. Een antwoord met lage zekerheid is niet automatisch een technische fout en verdient dus niet vanzelf deze pose. Brontijden: zevenmaal 140 en vervolgens 240 ms. Bewijs: frames/failed/03.png en rij 5 van spritesheet.png.

7. **waiting, rij 6.** Zes frames, 1010 ms per lus. Open handpalm naar buiten op borsthoogte, vriendelijke vragende houding en een knippering. Dit leest sterker als aan de gebruiker iets vragen dan als afwachten zonder aandacht te trekken. Geschikt voor verduidelijking of ontbrekende invoer. Brontijden: vijfmaal 150 en vervolgens 260 ms. Bewijs: frames/waiting/00.png en rij 6 van spritesheet.png.

8. **running, rij 7.** Zes frames, 820 ms per lus. Ondanks de naam loopt Finn hier niet. Hij kijkt schuin omhoog, legt de vrije hand bij de kin en brengt die naar bril of slaap. Dit is de bestaande denkpose. Geschikt voor kort zoeken, nadenken of verwerken. Brontijden: vijfmaal 120 en vervolgens 220 ms. Bewijs: frames/running/02.png en rij 7 van spritesheet.png.

9. **review, rij 8.** Zes frames, 1030 ms per lus. Finn kijkt naar de map, brengt een vinger naar het schild op de map en knippert. Geschikt voor bronnen of een resultaat controleren. Dit toont inspectie, geen ondubbelzinnige bevestiging dat iets klaar is. Brontijden: vijfmaal 150 en vervolgens 280 ms. Bewijs: frames/review/02.png en rij 8 van spritesheet.png.

Alle genoemde framepaden zijn relatief aan docs/design/finn_pet. Voor elke animatie bestaan daarnaast GIF en lossless WebP exports onder animations. Voor gebruik met zachte transparantie hebben PNG, atlas of WebP de voorkeur boven GIF.

## De zestien kijkrichtingen en neutral

De kijkrichtingen zijn bestaande statische houdingen zonder ingebouwde duur of overgangsframes. Hoofd en blik volgen de richting, terwijl map en staande houding herkenbaar blijven. De hoek is met de klok mee vanaf boven, niet de rotatie van het hele lichaam.

1. 0 graden, omhoog, rij 9 kolom 0, look_directions/look_000.0.png.
2. 22,5 graden, omhoog met lichte blik naar rechts, rij 9 kolom 1, look_directions/look_022.5.png.
3. 45 graden, rechtsboven, rij 9 kolom 2, look_directions/look_045.0.png.
4. 67,5 graden, naar rechts en iets omhoog, rij 9 kolom 3, look_directions/look_067.5.png.
5. 90 graden, rechts, rij 9 kolom 4, look_directions/look_090.0.png.
6. 112,5 graden, naar rechts en iets omlaag, rij 9 kolom 5, look_directions/look_112.5.png.
7. 135 graden, rechtsonder, rij 9 kolom 6, look_directions/look_135.0.png.
8. 157,5 graden, omlaag met lichte blik naar rechts, rij 9 kolom 7, look_directions/look_157.5.png.
9. 180 graden, omlaag, rij 10 kolom 0, look_directions/look_180.0.png.
10. 202,5 graden, omlaag met lichte blik naar links, rij 10 kolom 1, look_directions/look_202.5.png.
11. 225 graden, linksonder, rij 10 kolom 2, look_directions/look_225.0.png.
12. 247,5 graden, naar links en iets omlaag, rij 10 kolom 3, look_directions/look_247.5.png.
13. 270 graden, links, rij 10 kolom 4, look_directions/look_270.0.png.
14. 292,5 graden, naar links en iets omhoog, rij 10 kolom 5, look_directions/look_292.5.png.
15. 315 graden, linksboven, rij 10 kolom 6, look_directions/look_315.0.png.
16. 337,5 graden, omhoog met lichte blik naar links, rij 10 kolom 7, look_directions/look_337.5.png.

Neutral is rij 0 kolom 0, ook beschikbaar als idle.png en frames/idle/00.png. Dit is een blik recht naar de gebruiker. Neutral is niet hetzelfde als de omhoog gerichte pose van 0 graden.

Voor aandacht naar het mini venster zijn de kijkposes al bruikbaar bronmateriaal. Er is geen nieuwe set van zestien richtingen nodig. Een vloeiende hoofdbeweging tussen richtingen ontbreekt wel. Snel wisselen tussen statische poses kan dus sprongetjes geven; het bestaan van de beelden bewijst geen vloeiende cursorvolging.

## Proef 01 en de nieuwe ademvraag

De bestaande timingproef houdt dezelfde zes idle PNG beelden en dezelfde volgorde. De tijden zijn 1400, 900, 90, 110, 120 en 1780 ms, samen 4400 ms. Dit is één bestaande variant van idle, geen tiende oorspronkelijke animatie en geen nieuwe adempose.

De proef bewaart rij 0, zes gebruikte kolommen, twee lege kolommen en de celmaat van 192 bij 208. De bestaande validation.json van proef 01 rapporteert identieke bronkopieën, zes frames in GIF en WebP, de opgegeven tijden en exact behoud van zichtbaar RGB en alle alpha in WebP. Verborgen RGB onder volledig transparante pixels kan door de WebP encoder veranderen. De PNG bestanden bewaren de oorspronkelijke bytes.

De langere lus laat Finn minder vaak knipperen, maar voegt geen tussenhoudingen toe en verwijdert getekende verschillen niet. De hoofdagent heeft inmiddels met Imagegen een tweede ademproef gemaakt met zes nieuwe, heel kleine ademposes en open ogen. Die proef is nog in inspectie. Dit is een nieuwe variant van idle, geen extra canonieke state en geen geïntegreerde functie. Deze inventaris heeft de nieuwe beelden niet zelf beoordeeld.

## Productdekking en maximaal drie zinvolle hiaten

1. **Kleine bevestiging bij klaar, hoogste prioriteit als er één nieuw gebaar komt.** Jumping dekt succes al af, maar een klein knikje met vaste voeten ontbreekt als expliciete reeks. Review kijkt naar de map en is daardoor geen gelijkwaardige bevestiging. Nieuw bronmateriaal is zinvol als het product een kalme zichtbare afronding nodig heeft. Beperk het tot één korte knik die terugkeert naar neutral. Geen voortdurende viering. De tekst en het resultaat blijven bepalen of een antwoord betrouwbaar is.

2. **Aandachtig luisteren of invoer volgen, eerst bestaande poses gebruiken.** Waiting dekt een vraag aan de gebruiker, neutral en een relevante kijkrichting dekken aandacht naar het mini venster. Er ontbreekt geen statisch basismateriaal voor deze rol. Alleen als de visuele proef aantoont dat de bestaande overgang te abrupt is, is een korte getekende overgang naar een aandachtige hoofdstand zinvol. Een hand aan het oor zou een nieuwe, maar voor getypte invoer onnodig specifieke betekenis toevoegen.

3. **Discreet wachten op een collega, eerst productkoppeling en rustig idle gebruiken.** De open hand van waiting vraagt voelbaar iets van de gebruiker. Voor een uitstaande vraag aan iemand anders is de rustige idle variant logischer, samen met de bestaande tekststatus in het product. Het ontbreken van een aparte collega wachtanimatie is daarom geen direct assetgat. Een langere rustige cadans en correct terugkeren bij een antwoord zijn belangrijker dan een nieuw gebaar. Een eigen pose pas toevoegen als de toestand zonder aanhoudende beweging duidelijker moet worden.

Laag vertrouwen, een fout en een uitstaande vraag zijn drie verschillende productbetekenissen. Er is geen reden ze allemaal met failed of hetzelfde vragende gebaar te tonen. De bestaande denkpose en review bieden voldoende variatie voor korte verwerking en broncontrole, mits het product die staten daadwerkelijk gebruikt.

## Assets tegenover de huidige integratie

De bron README zegt nog dat de desktopapp deze assets niet automatisch gebruikt. De huidige checkout bevat inmiddels negen WebP bestanden en idle.png onder apps/web/public/pet. Voor alle negen WebP bestanden is in deze inventaris met SHA256 vastgesteld dat ze gelijk zijn aan de oorspronkelijke WebP exports. Dat is bestandsbewijs, geen live afspeelcontrole. De langere idle timingproef is dus niet de WebP die daar nu staat.

apps/web/src/state/pet.ts bevat alle negen animatienamen in PetAnimation. De huidige functie petMood kiest running wanneer de chat bezig is, failed bij een fout, waiting wanneer een concepttekst niet leeg is, en anders idle. Bij de overgang van running naar idle wordt jumping aangekondigd. De begroeting begint met waving; waving blijft volgens deze code 1400 ms actief en jumping 1680 ms, waarna idle volgt.

apps/web/src/pages/PetPage.tsx kiest tijdens horizontaal verslepen de passende looprichting. Voor alle overige gevallen laadt het component de WebP van de gekozen mood. Bij de systeemvoorkeur voor verminderde beweging laadt het idle.png. In deze bekeken bestanden is geen selectie van de zestien kijkrichtingen aanwezig. Review staat wel in het type en bestaat als bestand, maar heeft in deze gelezen koppeling geen gewone trigger.

Er is in deze gelezen koppeling geen aparte producttoestand aangetroffen voor luisteren, lage zekerheid, een verduidelijkingsvraag of wachten op de reactie van een collega. Een concepttekst leidt wel tot waiting, maar dat bewijst niet dat de volledige FINN productflow die betekenis al implementeert. De README beschrijft de gewenste productdekking; bovenstaande code beschrijft de geobserveerde koppeling in deze checkout. Er is geen Electron sessie, API scenario of externe accountactie uitgevoerd.

## Compatibiliteit bij vervolgbewerking

Behoud de bestaande negen rijen, hun betekenis, de twee looprichtingen en de zestien kijkposes. Wijzig een technische statenaam niet omdat running in gewone taal anders klinkt dan de getekende denkpose. Houd celmaat, transparantie, voetenanker en schaal gelijk bij een toekomstige idle of knikproef. Controleer overgangen apart, zeker die naar jumping, omdat de getekende grootte daar afwijkt.

Een rustiger timingmanifest werkt alleen bij een speler die die tijden gebruikt, of bij een opnieuw gecodeerde bewegende export. De huidige app laadt WebP bestanden rechtstreeks. Een wijziging uitsluitend in docs of in een los JSON manifest verandert die actieve appbestanden niet. Deze inventaris wijzigt geen van beide.
