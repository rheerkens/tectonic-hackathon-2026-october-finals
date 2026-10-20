# Lopen naar rechts, tussenposes 02

De gebruiker keurde deze kandidaat op 20 oktober 2026 goed: "In orde mag overgenomen worden". Onderstaande visuele inspectie blijft als beoordeling voorafgaand aan die keuze bewaard. Geen bronvervanging of appintegratie.

## Opgenomen

Twee echte nieuwe tekeningen uit de ingebouwde imagegen tool, met oorspronkelijke frames 00, 01, 02 en 03 als referentie. A verdeelt de overgang van uitgestrekte pas naar ingetrokken steunbeen. C verdeelt het uitstrekken na de geheven knie. A en C worden elk tweemaal gebruikt bij de vergelijkbare beweging in beide helften. C staat ook tussen bronframe 07 en 00.

De derde gegenereerde tekening B is niet gebruikt: de voeten staan te hoog voor de beoogde overgang. Het ruwe resultaat en de geëxtraheerde tekening blijven bewaard.

## Timing en herkomst

Volgorde met bronnummers vanaf nul: 00, A, 01, 02, 03, C, 04, A, 05, 06, 07, C.

Tijden in ms: 70, 70, 130, 130, 65, 65, 70, 70, 130, 130, 65, 65. Twee helften van 530 ms, totaal 1060 ms. De oorspronkelijke timingproef is ongewijzigd bewaard. Nieuwe beelden zijn met dezelfde schaalfactor 0,28 uit de strip gehaald en met expliciete hoofdankers in cellen van 192 bij 208 geplaatst. De alpha van de gegenereerde beelden blijft behouden. Geen crossfade, optical flow of framevervorming.

Zie prompt.txt, generated_strip.png, prepare_frames.py, extraction.json en candidate.json voor volledige herkomst, posities en bronhashes. candidate.webp bevat twaalf gecodeerde frames met de opgegeven tijden.

## Visuele inspectie

De vergelijking is daadwerkelijk in de browser afgespeeld, met alle tien unieke beelden geladen en twaalf kandidaatposities. Beide spelers delen één klok. Pauzeren hield de klok stil; hervatten werkte. De twee toegevoegde beenstanden verdelen de grote overgang bij intrekken en bij opnieuw uitstrekken in kleinere stappen. De tussentekening C deelt ook de overgang aan de lusgrens op.

Dit is nog geen volledig vloeiende loopcyclus. De oorspronkelijke overgang 02 naar 03 en 06 naar 07 blijft een duidelijke sprong van ingetrokken benen naar een hoge voorwaartse knie, met verplaatsing van hoofd en romp. Kleine tekenverschillen tussen gegenereerde en oorspronkelijke contouren van gezicht, kleding en schoenen blijven een aandachtspunt bij afspelen. Technische controles zijn geen goedkeuring van de visuele kwaliteit. De gebruiker moet beoordelen of de gerichte invoegingen helpen of nieuwe flikkering zwaarder weegt.

De twee richtingen delen voorlopig de lusduur van 1060 ms. De interne tijdverdeling en nieuwe posities zijn een kandidaat voor gezamenlijke afstemming met links.
