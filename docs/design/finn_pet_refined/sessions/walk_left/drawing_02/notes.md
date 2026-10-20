# Lopen naar links, tekenproef 02

Status: door de gebruiker goedgekeurd voor overname op 20 oktober 2026. Uitwerking en beoordeling in deze sessie zijn afgerond. Integratie gebeurt centraal. Timingproef 01 blijft apart bewaard. De visuele opmerkingen hieronder beschrijven de eerder gedeelde beoordeling; de gebruiker heeft deze kandidaat vervolgens expliciet aanvaard. Zie approval.json en ../status.md.

Vier unieke beenposes zijn getekend met de ingebouwde imagegen tool, met de echte Finn bronframes als referentie. De nieuwe poses staan tussen bronframes 00 en 01, 01 en 02, 04 en 05, 05 en 06. Dat zijn landing en doorhalen voor beide passen. De kandidaat bevat twaalf frames, de bron acht.

De hele figuren uit imagegen veranderden ook het bovenlijf en waren daardoor niet geschikt om rechtstreeks in te voegen. Alleen de getekende benen onder rij 130 zijn gebruikt. Hoofd, bril, haar, handen, kleding en map boven die rij zijn per nieuwe pose exact uit het voorafgaande bronframe behouden. De benen zijn mechanisch aan de breedte bij de taille en de grondlijn y 202 aangepast. De exacte horizontale en verticale schaalfactoren van die afzonderlijke beenuitsneden staan in manifest.json. Er is geen vervaging tussen poses gebruikt. Dit is dus nieuw tekenwerk plus plaatsing van de beenuitsneden, geen volledig opnieuw getekende Finn.

Volgorde: bron 00, nieuwe landing A, bron 01, nieuw doorhalen A, bron 02, bron 03, bron 04, nieuwe landing B, bron 05, nieuw doorhalen B, bron 06, bron 07. Tijden in ms: 65, 65, 70, 70, 130, 130, 65, 65, 70, 70, 130, 130. Elke halve cyclus blijft 530 ms; de volledige lus blijft 1060 ms. De extra poses delen de bestaande tijdvakken uit timingproef 01. Bron 07 naar 00 heeft geen nieuwe tekening; alleen het langdurige vasthouden uit de bron is verkort. Afstemming met lopen naar rechts blijft nodig vóór eventuele overname.

Visuele beoordeling: de landing en het doorhalen zijn nu in kleinere stappen verdeeld. De wissels van bron 02 naar 03 en van 06 naar 07 blijven abrupter en hebben nog geen tussenpose. De passing pose van de tweede pas oogt compacter dan die van de eerste. De aansluiting van de beenuitsneden en de schoenvormen verdienen nog beoordeling in beweging. De oorspronkelijke kleine bovenlijfverschuivingen tussen de bronframes zijn behouden. Deze proef is nog geen bewijs van een volledig vloeiende loopcyclus.

De afspelende vergelijking is in de browser gecontroleerd op de gedeelde klok, beide lusduren, twaalf kandidaatframes, behoud van 192 bij 208 pixels, gezamenlijk pauzeren en hervatten. Er zijn tijdens de daadwerkelijke playback opeenvolgende weergaven bekeken, waaronder de overgang door het einde van de lus. Er zijn geen externe beeldverzoeken. De mobiele weergave plaatst de spelers onder elkaar. Lossless WebP voor de ingebedde beelden is op volledige RGBA gelijkheid met de bijbehorende PNG gecontroleerd. De oorspronkelijke PNG bestanden blijven ongewijzigd.

## Bewaarde generatiebronnen

De eerste vierposesheet generated_sheet.png is afgewezen vanwege te weinig verschillende houdingen en stijlverschil; prompt.txt bewaart de instructie. De vier gerichte generaties zijn focused_landing.png, passing_a.png, landing_b.png en passing_b.png. Hun prompts staan respectievelijk in prompt_focused.txt, prompt_passing_a.txt, prompt_landing_b.txt en prompt_passing_b.txt. Alle ruwe uitvoer, bewerkte beeninvoegingen, SHA256 hashes en plaatsingsparameters zijn bewaard. prepared_contact.png toont elke gebruikte tussenpose naast haar twee bronhoudingen.

De zelfstandige bewegende vergelijking is comparison.html. Alleen bestanden binnen deze eigen sessiemap zijn geschreven.
