# SDtrust desktopinterface

Status: de gebruiker koos het lichte overzicht met donkerblauwe zijbalk en vroeg dit in de Electron app te integreren, inclusief light en dark mode.

## Eigenaarschap

Deze sessie werkt op `feature/desktop_ui`, in de door T3 toegewezen werkmap.
Basis: `main`, commit `4f18da8ce1953f4074130b81e8a2b14628e68038`.
Primaire paden: `apps/web`, `packages/ui` en dit document.
Geen wijzigingen aan rootmanifesten, lockfile, contracten, database, CI of infrastructuur.
Geen publicatie, PR of merge naar main. Alleen afgerond en gecontroleerd werk committen op deze branch.

De andere sessie beheert `apps/desktop` en `docs/finn_pet_brief.md`.
Finn is een afzonderlijk desktopvenster en wordt niet in de webinterface nagebouwd.

## Opdracht en bestaande basis

Organisatiekennis toegankelijk en betrouwbaar houden met zo weinig mogelijk onderbrekingen.
De huidige interface heeft een bovenbalk, werkruimtekeuze en navigatie tussen notities en chat.
De bestaande aanmelding, rechten, conceptteksten, chatstromen, notities en live updates blijven behouden.
Kennisbronnen, expertmatching en bevestiging van gewijzigde kennis hebben nog geen eigen werkende feature in deze basis.
Een ontworpen weergave mag die functies niet als geverifieerde integraties voorstellen.

## Referenties en open keuze

Alle drie de beelden onder `docs/design/desktop_concepts` zijn visueel bekeken.
De inhoud van die beelden is fictieve conceptinhoud.

1. `01.png`: lichte controleweergave met eerdere kennis, nieuw signaal, bron en bevestiging.
2. `02.png`: donkere zoekweergave met antwoord, expert en bronverwijzingen.
3. `03.png`: licht overzicht met donkerblauwe navigatie, zoeken en relevante aandachtspunten.

Voorgesteld, nog niet gekozen: beeld 03 als basis; de controleflow uit 01 en de antwoordopbouw uit 02 in dezelfde lichte stijl.
Alternatieven: volledig donker volgens 02, of controle als centrale ingang volgens 01.
Eerst de visuele keuze en de eerste uitvoerbare schermscope met de gebruiker vastleggen.

## Aanvullende ontwerpexploratie

De gebruiker vroeg vervolgens om meerdere UI/UX voorbeelden in light en dark mode, uitsluitend de app. Er is nog geen toestemming om een van deze ontwerpen als definitieve productrichting te kiezen.

In `apps/web/design-previews/sdtrust/` staan zes met de ingebouwde Imagegen gemaakte conceptbeelden, drie bijpassende paren. `index.html` biedt themakeuze, vergelijken en vergroten. `prompts.json` bewaart de volledige prompts en de gebruikte referentie.

Op uitdrukkelijk verzoek zijn daarnaast twee parallelle T3 ontwerptaken gestart op `claudeAgent / claude-opus-5-5`, met `effort: high` en `fastMode: true`. Hun exclusieve uitvoermappen zijn `apps/web/design-previews/opus-a/` en `apps/web/design-previews/opus-b/`. Het zijn zelfstandige HTML previews met voorbeeldinteracties, geen koppelingen met de app.

Alle voorbeeldgegevens zijn fictief. Bestaande conceptbeelden en productiecode blijven intact.

De beide Opus taken zijn afgerond. A is een vraagstart met bronverwijzingen naast het antwoord en een controle in de tekst. B is een dossier met herkomst en geldigheid per paragraaf. Beide schakelen tussen licht en donker en simuleren bevestiging zonder iets op te slaan of te versturen.

Controle van de voorbeelden: de hoofdthread heeft de zes PNG bestanden geladen, hun echte afmetingen en hashes vastgelegd in `manifest.json`, de vergelijker op 728 en 390px gerenderd en navigatie, themawissel, vergelijken en vergroten in de browser gecontroleerd. De JavaScript syntaxis van alle drie HTML bestanden slaagt via `node --check`. De gedelegeerde Opus taken hebben hun hoofdinteracties en beide thema's in de browser gecontroleerd op 1440 en 728px. Dit zijn controles van zelfstandige voorbeelden, geen applicatie of Electron tests.

De previews zijn bereikbaar op `http://100.89.117.122:53840/opus-a/` en `http://100.89.117.122:53840/opus-b/`. Beide nemen het lokale Manrope font met licentie mee. A beantwoordt elke eigen vraag met hetzelfde Atlas voorbeeld; B werkt alleen het Atlas dossier uit. Kleinere mobiele schermen zijn geen uitgewerkte productdoelstelling van deze desktopverkenning.

## Afstemming met Finn

Voorgestelde optionele Electron interface: `window.finnDesktop` met `showPet()`, `hidePet()`, `getPetState()` en `openDashboard()`.
De Electron sessie beheert de veilige preload en de petimplementatie. Die sessie meldt dat de preload is gebouwd; `getPetState()` levert `{ visible: boolean }`. De gemelde Electron rooktest is niet opnieuw uitgevoerd door deze UI sessie.
Deze websessie heeft nu geen koppeling nodig. Typehandtekeningen, terugkeerwaarden en verdere navigatie worden pas afgestemd zodra een concrete aanroep nodig is.
Navigatie in de webinterface blijft zelfstandig bruikbaar zonder Electron.

## Validatie

## Implementatie vanaf de gekozen screenshot

Het overzicht, de zijbalk en de themakeuze staan in de bestaande React app. Navigatie bewaart de bestaande werkruimtes, autorisatie, chat en notities. Recente notities komen uit de bestaande API. Het zoekveld gebruikt dezelfde in het geheugen bewaarde chatdraft en opent de bestaande chat ter verzending. Meldingen en expertinformatie blijven herkenbare voorbeelden totdat het centrale resultaatcontract beschikbaar is. Er is geen tweede Finn bridge toegevoegd.

Op aanwijzing van de coördinerende sessie is `origin/main` op commit `661b76c` gelezen. Die afspraken vragen Engelse UI en geen unit of e2e tests. Er zijn geen tests uitgevoerd voor deze implementatie. De eerst aangemaakte, nog niet uitgevoerde thematest is verwijderd. `npm exec --yes --package=bun@1.4.2 -- bun setup` slaagt zonder globale runtimewijziging. Browser en runtime typecontrole slagen. De Vite build slaagt met expliciete `AUTH_MODE=dev`. De eigen slice wordt eerst gecommit, daarna wordt actuele main gecontroleerd op deze featurebranch geïntegreerd.

De ontwikkelapp draait op `http://draegus-zenbook.tail102e44.ts.net:55020`. De oude voorbeeldvergelijker op poort 53840 staat los van deze echte app.

Uitgevoerd: branch en basis gecontroleerd, werkmap aanvankelijk schoon, repositoryinstructies en relevante UI bestanden gelezen, drie conceptbeelden bekeken.
`bun setup` is geblokkeerd: repository vereist Bun 1.4.2; de gevonden lokale Bun is 1.2.22.
Er zijn geen productcodewijzigingen of Electron integratietests uitgevoerd door deze sessie. De ontwerppreviews staan los van de bestaande app en zijn met browsercontroles te beoordelen.
Bij implementatie: gerichte tests, `bun run check` en aparte browsercontrole. Browserresultaten bewijzen geen Electron integratie.
De ontwerpvergelijker draait apart van de app op `http://100.89.117.122:53840/sdtrust/`. Dit is een statische previewserver, alleen gebonden aan het Tailscale adres. Applicatietests en een implementatie volgen pas na een gekozen richting.
