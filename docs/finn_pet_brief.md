# FINN vensterbeheer en resultaat openen

Eigenaar: Finn desktoppet. Branch: `feature/finn_pet`.
Basis van deze slice: `08b4395`, opgehaald van origin/main.
Toegestane wijzigingen: `apps/desktop/**` en deze brief.

## Aansluiting op main

De React routes `/pet` en `/mini`, bestaande WebP bestanden en BroadcastChannel
blijven leidend. Deze slice voegt geen renderer, animaties of stemming toe.
De oude twee petcommits staan op herstelbranch
`recovery/finn_pet-before-lifecycle-20261020`, op commit `f31675d`.
De al aanwezige lokale `apps/web/src/routeTree.gen.ts` is bij het omzetten van de
branch byte voor byte behouden. Deze wijziging wordt niet meegecommit.

## Gedrag

Een normale start toont alleen Finn. De mini bestaat verborgen; het hoofdvenster
wordt pas op aanvraag gemaakt. Rechtsklikken op Finn opent het FINN menu, met
Open mini chat, Open main window, Show Finn en Quit.

Verbergen van Finn opent eerst het hoofdvenster, zodat de app bereikbaar blijft.
Sluiten van het hoofdvenster beëindigt de pet en mini niet. Als Finn op dat moment
verborgen is, verschijnt hij opnieuw. Een nieuwe start zet de verborgen status
bewust terug naar zichtbaar. Positie wordt nog steeds opgeslagen; een volledig
verborgen herstart is geen ondersteunde voorkeur voor deze demo.

Quit markeert de app als afsluitend voordat vensters sluiten. Het herstelpad
maakt dan geen vensters opnieuw. Het eigen API proces wordt eenmaal gestopt.

## Interface voor de UI eigenaar

```ts
window.desktop?.openResult(resultId: string): Promise<void>
```

De preload gebruikt `ipcRenderer.invoke`. De hoofdprocess handler controleert
het bekende venster, zijn hoofdframe en de URL op de eigen lokale API origin.
Voor pet en mini moet de route respectievelijk `/pet` en `/mini` zijn. De ID
begint met een letter of cijfer, bevat daarna alleen letters, cijfers,
underscore of koppelteken en is maximaal 128 tekens. De enige geconstrueerde
doelroute is `/results/${encodeURIComponent(resultId)}` op de eigen API origin.

Het hoofdvenster wordt hergebruikt of opnieuw gemaakt, hersteld als het
geminimaliseerd is, getoond en gefocust. Herhaalde navigaties worden in volgorde
afgehandeld. De belofte bevestigt dat de lokale pagina is geladen, niet dat de
UI het resultaat inhoudelijk gevonden heeft. De UI eigenaar beheert de optionele
declaratie in `env.d.ts` en de resultaatroute.

## Validatie

Geen unit of e2e tests toegevoegd, gewijzigd of uitgevoerd. Met Bun 1.4.2
slagen typecontrole, Vite build, JavaScript syntaxcontrole en gerichte Biome op
de twee gewijzigde desktopbestanden. De volledige check blijft rood door
bestaande formatteringsverschillen buiten deze slice. De eerste typecheck
gebruikte via PATH nog Bun 1.2.22 voor een subprocess; met Bun 1.4.2 op PATH
slagen zowel het browserprogramma als het runtimeprogramma.

Na vrijgave door de UI eigenaar en bevestiging dat PID 28604 verdwenen was,
is Electron 44.5.1 op Windows geïnspecteerd met de echte lokale API en een
apart profiel onder `.local/lifecycle-native/profile`. Hierbij is gezien:

1. Alleen `/pet` zichtbaar bij start; `/mini` bestaat verborgen en er is geen
   hoofdvenster.
2. `openResult("d1-payroll-changes")` resolveert en opent uitsluitend de lokale
   resultaatroute. De volgende aanvraag hergebruikt hetzelfde venster. Een
   geminimaliseerd venster wordt hersteld, zichtbaar en gefocust.
3. Lege ID, traversal, volledige URL, slash, 129 tekens, null en een getal
   worden afgewezen zonder de bestaande resultaatroute te veranderen.
4. Een onbekend venster op dezelfde origin wordt afgewezen. Ook de bekende
   pet op `about:blank` wordt afgewezen; daarna is `/pet` teruggeladen. De
   afzonderlijke controle van hoofdframe identiteit is in de code nagekeken.
5. Show Finn uit laat een zichtbaar hoofdvenster achter. Sluiten daarvan
   maakt Finn weer zichtbaar; de bestaande mini blijft bestaan.
6. Quit vanuit deze verborgen toestand maakt geen nieuwe vensters. Er is
   precies één API kill gezien en zowel de eigen Electron als API PID verdwenen.
7. Herstart met opgeslagen `showPet:false` toont Finn en zet de menuoptie terug
   op aan. Ook deze inspectie is daarna via Quit afgesloten.

De resultaatroute van de UI eigenaar is niet in deze branch geïntegreerd. Dit
bewijst de native navigatie en levenscyclus, niet de inhoud van de gecombineerde
resultaatpagina. Eerder bewijs van de oude atlasbranch is niet hergebruikt.
macOS, packaged executable en fysiek muisgedrag zijn hier niet geïnspecteerd.

De bytehash van de behouden lokale routefile bleef
`68c5f448a2ff9c6ed4c49969bdc9576dd9f2b90e2936ec089f0c5162f27cb716`.

Niet in scope: positionering verbeteren, extra startup hardening, moodcontract,
animatieverfijning, UI en contractwijzigingen, tray of publicatie naar main.
