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

De idle keuze is afgerond: de gebruiker koos proef 01 en vraagt geen nieuwe ademcyclus of verdere verfijning. Zie het definitieve besluit onderaan. Uitbreidingen en aanpassingen aan de overige acht staten blijven afzonderlijke voorstellen totdat de gebruiker een keuze maakt.

## Proef 02 en inventaris

De gebruiker vond proef 01 redelijk goed en gaf opdracht voor een subtiele ademproef plus een parallelle inventaris van bestaande en ontbrekende poses. Een aparte agent maakte uitsluitend docs/design/finn_pet_refined/pose_inventory.md op basis van bronbeelden, metadata en de gelezen huidige appkoppeling. De hoofdtaak heeft deze inventaris gecontroleerd. Alle negen animaties en zestien kijkrichtingen staan erin. De duidelijkste mogelijke toevoeging is een klein bevestigend knikje. Aandachtig luisteren en discreet wachten op een collega kunnen eerst bestaande beelden hergebruiken.

docs/design/finn_pet_refined/breathing_02 bevat zes nieuw getekende ademposes uit de ingebouwde Imagegen tool, met de echte idle strip en idle.png als referentie. De nieuwe tekeningen zijn met de bestaande Pet scripts geëxtraheerd en gecontroleerd. Alleen rij 0 van een afzonderlijke kandidaat sheet is vervangen, de andere tien rijen zijn pixelgelijk aan de bron. Geen bronbestand is overschreven.

De ademlus duurt 4400 ms, verdeeld als 900, 700, 600, 600, 700 en 900 ms. Deze losse proef houdt de ogen open. Ze combineert nog geen ademcyclus met de knippering van proef 01. Er zijn kleine tekenvariaties rond hoofd en schoenen. De globale alpha grenzen blijven exact gelijk en de voetenlijn blijft op y 202, maar dat bewijst geen pixelvaste lokale details.

De GIF en lossless WebP exports, zes PNG frames, rijstrip, volledige kandidaat sheet, bronbeeld, gebruikte prompt en validatierapporten zijn opgeslagen. De validators rapporteren geen structurele fouten. De ingebouwde browserinspectie liep tweemaal vast op een timeout; een aparte Edge preview bevestigde daarna het afspelen, de veranderende frameposities en de weergave op lichte en donkere achtergrond. De vergelijking blijft beschikbaar op http://100.89.117.122:8767/finn_pet_refined/breathing_02/preview.html.

docs/design/finn_pet_refined/overview.html bundelt de bewegende vergelijking en de volledige poseinventaris in een visueel overzicht. Dit is nog steeds uitsluitend een assetlevering. Appgedrag, accountinstellingen en bestaande state namen zijn niet gewijzigd. Er zijn geen unit tests of e2e tests geschreven of uitgevoerd.

## Visuele beoordeling na proef 02

De gebruiker vindt proef 02 visueel te statisch. De zes frames en exporttimings zijn technisch correct, maar vormen geen duidelijk leesbare ademcyclus. Proef 02 geldt daarom als visueel onvoldoende en blijft uitsluitend een bewaard experiment. Proef 01 blijft de voorkeur. Geen van deze proeven vervangt automatisch de originele assets in de app.

## Gezamenlijk beoordelen met annotaties

`docs/design/finn_pet_refined/review.html` toont de negen bronanimaties, beide idle proeven, de zestien statische kijkrichtingen en vijf kaarten voor ontbrekende bewegingen of voorstellen. De voorstelkaarten tonen uitdrukkelijk een stilstaande referentie, geen gegenereerde of afgewerkte animatie. Bevestigend knikken, leesbaar ademen en overgangen ontbreken nog; aandachtig kijken en wachten op een collega kunnen eerst bestaande poses gebruiken.

Elke bewegende kaart gebruikt de bestaande PNG frames en vastgelegde frametijden. Afspelen, pauzeren, een tijdstip kiezen, half tempo en een lichte of donkere achtergrond helpen bij beoordeling. Met `Noteer dit frame` wordt het gekozen framenummer en tijdstip in de notitie gezet. Keuzes en vrije tekst blijven in lokale browseropslag. `Kopieer feedback`, de zichtbare feedbacktekst en een download als tekstbestand dienen als expliciete overdracht naar de chat. Opslaan in de pagina verstuurt niets naar een agent en voert geen wijzigingen uit.

`build_review.py` maakt de volledige zelfstandige HTML met ongewijzigde PNG beelden en daarnaast `review.embed.html` voor weergave in de chat. Alleen die compacte kijkversie gebruikt naar 96 bij 104 pixels verkleinde WebP beelden. Voor detailbeoordeling is de volledige versie bedoeld. De browseropslag van de chatweergave en de afzonderlijk geopende pagina kan verschillen; vul feedback op één plek in en geef die expliciet door.

De volledige review is bereikbaar op http://100.89.117.122:8768/finn_pet_refined/review.html zolang de eigen statische server actief is. De bestaande server op poort 8767 en de oude werkmap blijven onaangeroerd. Browsercontrole bevestigde geladen beelden, afspelen, pauzeren, framekeuze, notities bewaren na herladen, feedbacktekst en een mobiele indeling zonder horizontale overflow. Er zijn geen unit of e2e tests uitgevoerd. Geen bronasset of applicatiebestand is gewijzigd.

## Definitief besluit: idle afgerond

De gebruiker heeft proef 01 expliciet goedgekeurd voor overname: de bestaande zes oorspronkelijke frames, in dezelfde volgorde, met tijden 1400, 900, 90, 110, 120 en 1780 ms. Totale lusduur: 4400 ms. De rustigere timing is voldoende; een ademanimatie of verdere verfijning is niet nodig. Proef 02 blijft visueel onvoldoende en is niet gekozen.

De afzonderlijke sessie is mcp:f1ac0a33-e6ea-44a4-bfd8-38f4ddc70784. Het gebruikersbesluit staat in docs/design/finn_pet_refined/sessions/idle/status.md. De centrale coördinatie heeft dit overgenomen in docs/design/finn_pet_refined/session_status.json en het idle manifest op approved gezet. De centrale review en het overzicht markeren de gekozen variant als goedgekeurd en afgerond. De oorspronkelijke idle blijft zichtbaar als vergelijkingsbron.

De bestaande exports animations/idle.webp en animations/idle.gif onder finn_pet_refined zijn de goedgekeurde levering. Bij overname zijn alle zes PNG bronkopieën byte voor byte vergeleken; beide exports zijn opnieuw uitgelezen en bevatten exact de zes goedgekeurde tijden, zes frames en de celmaat 192 bij 208. De SHA256 van WebP is 0bd5acd7d4d84111416627b81aff42613d4eed46acf24dc002a23851fd78731a. De bestanden zelf zijn niet opnieuw gegenereerd of gewijzigd. Deze overname betreft de centrale assetkeuze en documentatie; de coördinatiesessie heeft geen applicatiebestanden of oorspronkelijke bronassets vervangen.

## Definitief besluit: lopen naar links afgerond

De gebruiker heeft drawing_02 expliciet goedgekeurd: "Deze mag overgenomen worden en in de bovenliggend chat bevestigd worden dat het in orde is." De keuze betreft twaalf frames met vier nieuwe beenposes, niet de eerdere timingproef. Het oorspronkelijke bovenlijf is behouden. De tijden zijn 65, 65, 70, 70, 130, 130, 65, 65, 70, 70, 130 en 130 ms, samen 1060 ms. De cadans blijft dus gelijk aan het uitgangspunt voor rechts; centrale afstemming mag deze expliciete goedkeuring niet stilzwijgend vervangen.

De centrale keuze staat in session_status.json. Bronbesluit en bewijs staan in sessions/walk_left/status.md en sessions/walk_left/drawing_02/approval.json en manifest.json. De geselecteerde export is sessions/walk_left/drawing_02/running-left.webp, SHA256 4ac79dd419e8153b406b9faf41aa9017fefc12cbcfbfcc2bc78cabde75840d7d. Bij centrale overname opnieuw uitgelezen: twaalf frames, 192 bij 208 pixels, exact de opgegeven tijden, onbeperkte lus en alle alpha en zichtbare pixels gelijk aan de goedgekeurde framevolgorde.

De centrale review toont de gekozen versie naast de andere beslissingen; de oorspronkelijke acht bronframes blijven als vergelijking beschikbaar. De vergelijking van de sessie staat op http://100.89.117.122:8768/finn_pet_refined/sessions/walk_left/drawing_02/comparison.html. Eerdere proeven blijven bewaard. Deze overname wijzigt geen bronassets of appbestanden en voert geen Git mutaties uit.

## Definitieve besluiten: Nadenken, Lopen naar rechts en Controleren

Nadenken is goedgekeurd als thinking_drawing_02, technische state running. Het gekozen bestand is sessions/thinking/drawing_02/candidate.webp, SHA256 6beafe3b04733d6e3a7e043b1da266b0b3bfd42c370f793f35dc608ed7a270b0. Zes frames met tijden 3540, 100, 110, 440, 110 en 100 ms, samen 4400 ms. Vier unieke houdingen: de oorspronkelijke kinpose, low, middle en temple. De terugweg hergebruikt middle en low. Pixels buiten de armregio, inclusief benen en schoenen, zijn behouden. De gemelde kleine vormwissel bij vingers en kin is door de gebruiker gezien en geaccepteerd. Het oude compare_01 blijft bewaard; de keuze is compare_02 en geen timingproef.

Lopen naar rechts is goedgekeurd als inbetweens_02, technische state running-right. Het gekozen bestand is sessions/walk_right/inbetweens_02/candidate.webp, SHA256 9aa7f4637b809d4387622e44c93793fd21ffa2328bfe4526a87104633e346cf9. Twaalf frames met tijden 70, 70, 130, 130, 65, 65, 70, 70, 130, 130, 65 en 65 ms, samen 1060 ms en twee helften van 530 ms. Twee nieuwe poses, A_landing en C_extension, zijn elk tweemaal opgenomen naast de acht oorspronkelijke frames. De afgewezen pose B is uitgesloten. De goedgekeurde linkse variant blijft ongewijzigd; beide richtingen behouden hun eigen goedgekeurde framevolgorde en dezelfde totale cadans.

Controleren is goedgekeurd als drawn02, technische state review. Het gekozen bestand is sessions/review/approved02/review.webp, SHA256 24edd48d17273ed637f7fb874505be8293fc40698c3e075b181ece77f62e1c0f. Elf frames met tijden 320, 100, 90, 90, 100, 650, 100, 90, 90, 100 en 1070 ms, samen 2800 ms. Twee nieuwe armhoudingen worden ook op de terugweg gebruikt. Ogen blijven open en begin en einde zijn identiek. Dit is inspectie, geen succesbevestiging. De gebruiker keurde comparison02 goed, niet timingproef 01.

Alle drie zijn als completed en centraal overgenomen geregistreerd in session_status.json. Goedkeuring en oorspronkelijke bewijsstukken blijven in de eigen sessiemappen. Centrale decodecontrole bevestigt voor alle drie de genoemde hashes, frametijden, oneindige lus, celmaat 192 bij 208 en exacte alpha en zichtbare pixels tegenover de goedgekeurde framevolgorde. De centrale review en het overzicht tonen de geselecteerde versies. Er is geen nieuwe verfijningsronde uitgevoerd en geen bronasset of applicatiebestand vervangen. Runtimeovername is door deze coördinatiesessie niet uitgevoerd.

## Definitief besluit: Springen afgerond

De gebruiker keurde tekenproef 02 expliciet goed: "In orde mag overgenomen worden". De gekozen export is sessions/jumping/approved/jumping.webp, SHA256 7b93e19b1888efa7550af39564ab726c19405f6968e8a5ddc277eeadf39dac25. Negen frames, 192 bij 208, transparant, oneindige lus. Tijden: 120, 60, 60, 60, 120, 60, 60, 60 en 1200 ms, samen 1800 ms. Vier nieuwe tussenposes wisselen af met de vijf oorspronkelijke poses. Centrale decodecontrole bevestigt de hash, frametijden en exacte alpha en zichtbare pixels tegenover de goedgekeurde PNG reeks.

De lichte tekenverschillen rond map en schoenen en het oorspronkelijke schaalverschil tegenover idle blijven in de goedgekeurde versie. De eerdere timingproef is niet gekozen. Goedkeuring en herkomst staan in sessions/jumping/approval.json en approved/manifest.json; de centrale registratie staat op completed. Negen frames passen niet in de oorspronkelijke atlasrij met acht kolommen. De overname verwijst naar de WebP; een eventuele atlasaanpassing vereist afzonderlijke afstemming. Geen nieuwe verfijningsronde, bronvervanging of appintegratie is uitgevoerd.

## Definitieve besluiten: Teleurstelling en Iets vragen

Teleurstelling is uitsluitend goedgekeurd als arm_03, technische state failed. De gebruiker zei: "In orde zo, mag overgelomen worden". De gekozen export is sessions/failed/arm_03/approved/failed.webp, SHA256 a467a398d234f32e07ed6a5cad540ae6d5ea9e7d037764a9ae5234be4a3f3863. Negen stappen met tijden 120, 90, 90, 90, 240, 100, 100, 100 en 2470 ms, samen 3400 ms. De oorspronkelijke lichaamsbouw blijft behouden; alleen nieuwe armstukken zijn opgenomen. Begin en einde gebruiken hetzelfde originele frame. Drawn_02 blijft afgekeurd wegens het dikker worden van Finn. Geen verdere verfijning gevraagd.

Iets vragen is goedgekeurd als drawn_gesture_03, technische state waiting. De gebruiker zei: "In orde zo, mag overgenomen worden". De gekozen export is sessions/waiting/approved/waiting.webp, SHA256 88c13d30c2c600ca943c6953937147f4ab3cec7235bd4ccafd26f67518d683e2. Zes unieke beelden in elf stappen met tijden 400, 90, 90, 650, 100, 100, 650, 50, 80, 70 en 920 ms, samen 3200 ms. Drie getekende armstanden en de knippering zijn gekozen. Proeven 01 en 02 blijven eerdere experimenten.

Beide zijn centraal als completed geregistreerd. Decodecontrole bevestigt hashes, exacte tijden, celmaat 192 bij 208, oneindige lus en zichtbare RGB en alpha gelijk aan de goedgekeurde PNG volgorde. Centrale review en overzicht tonen beide keuzes. Er zijn nu acht goedgekeurde animaties; Begroeten staat nog open. Geen bronasset of applicatiebestand is vervangen.

## Visuele les uit Begroeten, alleen voor nog openstaand werk

De gebruiker herkent nieuw ingevoegde frames doordat de volledig opnieuw getekende Finn dikker wordt. Dezelfde celmaat en voetregistratie bewijzen geen gelijke lichaamsproporties. Vergelijk ook gezicht, romp, map, benen en silhouet. Begroeten proef 02 is afgekeurd en blijft bewaard. De nieuwe comparison-03.html gebruikt een vaste oorspronkelijke basispose met alleen wijzigingen binnen het bewegende armgebied; acht stappen op 2400 ms. De schouder- en heupaansluiting moeten nog visueel beoordeeld worden. Dit is een gelaagde browserproef, geen goedgekeurde finale spriteexport. Deze les heropent geen goedgekeurde animaties.

## Definitief besluit en export: Begroeten afgerond

De gebruiker heeft daarna de exacte lagencompositie comparison-03.html goedgekeurd: "In orde mag overgenomen worden". De vaste basis is de oorspronkelijke waving/00.png. Alleen het vastgelegde armvenster wisselt, met de bronvolgorde 00, transition-1, 01, 02, transition-2, 03, transition-3, rust. Begin en einde tonen de volledige vaste basis. De eerder afgekeurde inbetween-02/waving.webp met volledig gegenereerde lichamen is niet overgenomen.

De coördinatiesessie heeft dezelfde compositie met de oorspronkelijke SVG maskers en clip path via Chromium naar acht PNG frames gerenderd en lossless als approved/waving03/waving.webp geëxporteerd. Dit is geen nieuwe hertekening. Tijden: 100, 100, 140, 160, 120, 110, 110 en 1560 ms, samen 2400 ms. Celmaat 192 bij 208, transparant, oneindige lus. SHA256: 866885506d43358475b38aa197d340e9bd487f3d9c32696216fb344044bc58e4.

Alle acht afgebeelde stappen uit de oorspronkelijke goedgekeurde HTML zijn in de browser vergeleken met de geëxporteerde PNG frames: nul afwijkende zichtbare pixels of alpha. De WebP is vervolgens gedecodeerd en op exacte tijden en dezelfde alpha en zichtbare pixels gecontroleerd. Begin en einde zijn identiek; het gebied buiten het armvenster blijft gelijk. Herkomst, bronhashes en exportgegevens staan in approved/waving03/manifest.json. De exportvergelijking is approved/waving03/comparison.html.

Alle negen animaties staan nu centraal geregistreerd als completed met een geselecteerde export. De review en het overzicht gebruiken uitsluitend deze goedgekeurde keuzes naast de oorspronkelijke vergelijkingsbronnen. De animaties zijn niet opnieuw geopend. Dit sluit de assetselectie af; appbestanden en oorspronkelijke atlas zijn door de coördinatiesessie nog niet gewijzigd.
