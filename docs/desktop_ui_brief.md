# SDtrust desktopinterface

Status: gekozen dashboardvormgeving geïmplementeerd in de bestaande app, met light, dark en systeemthema. Resultaat en miniwindow gebruiken de gedeelde FINN demoflow.

## Eigenaarschap

Branch: `feature/desktop_ui`. Eigen UI wijzigingen staan in `apps/web`, `packages/ui/src/field.tsx` en dit document. Er wordt niet naar main gemerged of gepusht.
De andere sessie beheert de native vensterlifecycle onder `apps/desktop`. De petrenderer en petstate blijven buiten deze UI opdracht.
De oorspronkelijke werkbasis was main `4f18da8`. De eigen dashboardstap is vastgelegd in `352b9ca`. Integratiecommit `3cdd61c` bevat main tot `cd4925c`; daarna is `08b4395` met de gedeelde hook geïntegreerd. De oude companionimplementatie uit `feature/finn_pet` is niet overgenomen.

## Gekozen ontwerp

De gebruiker koos de screenshot van het lichte overzicht: donkerblauwe zijbalk, zoekveld, aandachtspunten, recente inhoud en een rustige rechterkolom. Het ontwerp bestaat als echte React componenten, niet als een afbeelding over de app.
De huidige main afspraken schrijven Engelse interfacecopy en geen unit of e2e tests voor. De bestaande echte aanmelding, rechten, chat, notities en conceptopslag blijven behouden.

ThemeProvider bewaart alleen de themavoorkeur op het apparaat. Vragen en chatdrafts blijven in de bestaande appgeheugenopslag. De FINN vraag heeft een eigen draftsleutel en overschrijft geen bestaande chatdraft.
Recent notes en Sources gebruiken de bestaande notitiegegevens. Profielgegevens komen uit de bestaande sessie. Voorbeeldmeldingen en expertprofielen zijn herkenbaar als fictief.

## Gedeelde demoflow

De UI consumeert `useFinn` en `getFinnResult` uit `apps/web/src/state/finn.ts`.
De types en voorbeelden komen uit `apps/web/src/state/finn-scenarios.ts`: `FinnResult`, `FinnSource` en de bestaande scenario IDs.
Er is geen tweede contract of eigen agentstate gemaakt.

Dashboardvragen gebruiken de bestaande mockflow. Het resultaat toont antwoord of onzekerheid, trustpercentage, redenen, herkomst, ondersteunde en verworpen bronnen, relevante personen en de volgende stap.
Broncodes in het antwoord linken naar de concrete onderbouwing op dezelfde pagina.
De vervolgvragen gebruiken dezelfde hook. De novembervraag toont wachten op Roy en vermeldt expliciet dat het contact gesimuleerd is.

Alleen `/pet`, `/mini` en de fixturepagina `/results/$resultId` passeren de sessiepoort. De miniwindow en fixturepagina gebruiken geen privéchat, notities of geauthenticeerde API.
De echte werkruimte blijft beschermd. Een onbekend resultaat toont een herstelbare lege toestand.

De optionele, afgesproken native methode is `window.desktop.openResult(resultId): Promise<void>`. De native eigenaar levert de gevalideerde IPC handler.
De miniwindow toont die actie in Electron alleen als de methode aanwezig is. De browser gebruikt een echte routerlink.
De oudere `window.finnDesktop` bridge is niet gebruikt.

## Verificatie

Bun 1.4.2 wordt lokaal uitgevoerd via `npm exec --yes --package=bun@1.4.2`; de globale installatie en lockfile zijn niet gewijzigd.
Typecontrole en Vite build slagen met `AUTH_MODE=dev`.
De gerichte formatteringscontrole van de eigen bestanden slaagt.
De volledige check op de geïntegreerde basis geeft typecheck en build PASS en lint FAIL. De oorspronkelijke baseline telde 202 formatteringsmeldingen. De laatste volledige controle op `08a6477` telt 199 meldingen, waaronder bestaande CRLF buiten de UI slice. Er is geen brede formatteringsronde gedaan.
Er zijn volgens de actuele projectafspraak geen unit of e2e tests geschreven of uitgevoerd.

Handmatige browsercontrole: D1 oktober toont 92 procent en 22 oktober, de novembervervolgvraag toont 15 procent en wachten op Roy, D2 toont de ziekmeldingbronverwijzingen S6 en S7, een onbekende vraag toont een nette melding.
De miniwindow en fixture-resultaten openen zonder login. Bronankers bestaan. De donkere resultaatpagina heeft op 728px geen horizontale overloop.
De bestaande chatdraft blijft behouden bij heen en weer navigeren via het dashboard.

De eerste native inspectie is apart bewaard in `.local/desktop-native/dashboard-inspection.json`. De echte Electron 44.5.1 startte via de normale appingang, met uitsluitend de gebruikersdatamap vooraf geïsoleerd. Light en dark, behoud na herladen, echte SQLite notitieopslag, chatdraftnavigatie en de aparte pet en mini routes zijn waargenomen. De petachtergrond was transparant en de sprite geladen.
Die inspectie vond plaats vóór de nieuwe resultaat en mini slice. De oude native instantie is daarna via app.quit afgesloten.

## Gecombineerde native controle

De eigen resultaatimplementatie staat in `08a6477`. Uitsluitend native commit `210ad6b` is daarna overgenomen als `dd04673`, zonder oude companiongeschiedenis. Die commit raakt `apps/desktop/main.cjs`, `apps/desktop/preload.cjs` en de brief van de native eigenaar.

Electron 44.5.1 is gestart via de normale `apps/desktop` ingang met een echte lokale Bun API en een vers, geïsoleerd profiel. De ontwikkelinspectie configureert alleen het profiel en debuggerpoorten. De normale lifecycle en preload voeren de acties uit.

Bewijs staat afzonderlijk in `.local/desktop-combined/inspection.json` en de bijbehorende screenshots. PID 10012 is de oorspronkelijke Electron instantie, PID 50464 de bijbehorende API. De start toont alleen Finn. De mini opent zonder aanmelding. D1 toont 22 oktober, 92 procent trust en bron S4. De novembervraag toont 15 procent en gesimuleerd wachten op Roy. D2 toont de 24 uur regel met werkende bronankers S6 en S7.

De knop in de mini opent via `window.desktop.openResult` het echte hoofdvenster. Een volgende vraag hergebruikt dat venster. Na sluiten opent de mini opnieuw de resultaatpagina zonder aanmelding. Licht en donker synchroniseren tussen de vensters en blijven bij herladen en heropenen behouden. Het menu kan Finn verbergen; sluiten van het hoofdvenster herstelt Finn. De volledige appherstart wordt nog afzonderlijk gecontroleerd. De huidige opslag gebruikt de lokale origin; een nieuwe API poort kan die voorkeur verliezen.

## Sleepregressie

De gemelde groei is in deze Electron instantie gereproduceerd op Windows met schaalfactor 1,25. Tien pointermoves met omkering vergroten de native bounds van 267 bij 283 naar 277 bij 295. De vensterinhoud groeit mee. Zoom blijft 1, het bronbeeld 192 bij 208. Er is geen dragstart of tekstselectie waargenomen. De animatie wisselt normaal tussen links en rechts. Dit bewijs staat in `.local/desktop-combined/drag-before-fix.json`.

De native eigenaar verzorgt een gerichte kandidaat: bij elke verplaatsing expliciet de vaste maat 96 bij 104 meegeven aan `setBounds`. Een tijdelijke runtimeprobe van die kandidaat houdt de contentmaat exact 96 bij 104 tijdens tien pointermoves, vasthouden, loslaten en twintig directe verplaatsingen. De buitenmaat is door Windows afronding 96 of 97 bij 105, zonder cumulatieve groei. Bewijs staat in `drag-candidate.json` en `direct-bounds-candidate.json`. Er is geen CSS of assetcompensatie aangebracht. De definitieve broncommit en herstartcontrole volgen nog.

## Grenzen

De FINN flow is een mock met gedeelde fixtures. Er zijn nog geen echte zoektools, live connectoren of verzonden berichten in deze flow.
Trustscores en redenen komen rechtstreeks uit die fixtures. De UI claimt geen automatische verificatie.
Er zijn geen werkende privacytoggles zonder onderliggende opslag/API toegevoegd.
Verpakking, installatie op een ander apparaat en macOS zijn niet door deze sessie geverifieerd.

## Bestanden en previews

De echte ontwikkelapp: `http://draegus-zenbook.tail102e44.ts.net:55020`.
Eerdere losse ontwerpbeelden en Opus previews staan onder `apps/web/design-previews`; zij zijn geen onderdeel van de productroutes.
De zes gegenereerde beelden hebben prompts en hashes in hun previewmap. De drie oorspronkelijke beelden onder `docs/design/desktop_concepts` zijn intact.
Lucide pictogrammen komen uit de officiële bron met meegeleverde licentie. Het SDtrust merkbeeld is hergebruikt uit de bestaande lokale merkassets.
