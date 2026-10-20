# Begroeten afgerond

De gebruiker heeft voorstel 03 expliciet goedgekeurd voor overname: "In orde mag overgenomen worden".

## Gekozen resultaat

De visueel goedgekeurde vergelijking is `comparison-03.html`. Zij bevat acht stappen met tijden 100, 100, 140, 160, 120, 110, 110 en 1560 ms, samen 2400 ms.

Het is een gelaagde animatieproef. De vaste basis is `docs/design/finn_pet/frames/waving/00.png`. Gezicht, romp, map en benen komen uit die bronpose. Alleen het begrensde armgebied wisselt. De precieze begrenzing, herkomst en afspeelwijze staan in `body-lock-03/metadata.json` en de zelfstandige HTML.

De volgorde binnen het armgebied is bron 00, nieuwe overgang 1, bron 01, bron 02, nieuwe overgang 2, bron 03, nieuwe overgang 3, rust. In de eerste en laatste stap wordt de volledige vaste basis getoond. De nieuwe overgangen staan in `inbetween-02/transition-1.png` tot en met `transition-3.png`; gebruik uitsluitend hun armgebied zoals in de goedgekeurde HTML.

## Overdracht aan de centrale sessie

De uitwerking en beoordeling van Begroeten zijn afgerond. De centrale Finn sessie `mcp:ae25e13e-5056-49d4-a4dc-07be5d68363b` verzorgt verdere export en integratie.

Voor runtimegebruik moet de goedgekeurde lagencompositie exact naar volledige frames worden gerenderd, of gelijkwaardig als lagen worden afgespeeld. Neem de vaste basis en het armgebied over; gebruik geen opnieuw gegenereerde volledige figuren. Verifieer de geëxporteerde animatie visueel tegen `comparison-03.html` vóór vervanging van runtimeassets.

`inbetween-02/waving.webp` is de eerdere, door de gebruiker afgekeurde versie met veranderende lichaamsproporties. Die mag niet worden geïntegreerd. Proef 01 was alleen een timingvoorstel en is evenmin de gekozen variant. Beide blijven als experiment bewaard.

Deze sessie heeft geen bronassets, runtime, begroetingstrigger, gedeelde documenten of Git historie gewijzigd. Goedkeuring voor overname is geen claim dat de appintegratie al is uitgevoerd.
