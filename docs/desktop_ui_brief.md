# SDtrust desktopinterface

Status: verkenning. De gebruiker heeft nog geen visuele richting gekozen.

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

## Afstemming met Finn

Voorgestelde optionele Electron interface: `window.finnDesktop` met `showPet()`, `hidePet()`, `getPetState()` en `openDashboard()`.
De Electron sessie beheert de veilige preload en de petimplementatie.
Deze websessie heeft nu geen koppeling nodig. Typehandtekeningen, terugkeerwaarden en verdere navigatie worden pas afgestemd zodra een concrete aanroep nodig is.
Navigatie in de webinterface blijft zelfstandig bruikbaar zonder Electron.

## Validatie

Uitgevoerd: branch en basis gecontroleerd, werkmap aanvankelijk schoon, repositoryinstructies en relevante UI bestanden gelezen, drie conceptbeelden bekeken.
`bun setup` is geblokkeerd: repository vereist Bun 1.4.2; de gevonden lokale Bun is 1.2.22.
Er zijn nog geen productcodewijzigingen, appstart, tests of Electron integratietests uitgevoerd.
Bij implementatie: gerichte tests, `bun run check` en aparte browsercontrole. Browserresultaten bewijzen geen Electron integratie.
Tailscale preview, definitieve tests en commit volgen bij een werkende lokale omgeving en gekozen richting.
