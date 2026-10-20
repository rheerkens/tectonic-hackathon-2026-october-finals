"""Build the asset inventory and comparison page from the source manifest."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
source = json.loads((ROOT.parent/'finn_pet/animations.json').read_text())
labels = [
    ('Rust', 'Staan met de map, rustig knipperen', 'Beschikbaar of discreet wachten'),
    ('Lopen rechts', 'Zijwaartse passen naar rechts', 'Verplaatsen of verslepen'),
    ('Lopen links', 'Zijwaartse passen naar links', 'Verplaatsen of verslepen'),
    ('Begroeten', 'Vrije hand omhoog en terug', 'Korte begroeting'),
    ('Springen', 'Omhoog en landen', 'Uitbundig succes, spaarzaam gebruiken'),
    ('Teleurstelling', 'Bezorgde blik, hand naar het hoofd', 'Mislukte actie'),
    ('Vragend wachten', 'Open handpalm naar de gebruiker', 'Verduidelijking of invoer vragen'),
    ('Nadenken', 'Hand bij kin en bril, blik schuin omhoog', 'Zoeken en verwerken'),
    ('Controleren', 'Kijken en wijzen naar de map', 'Bron of resultaat nakijken'),
]
rows=[]
for a,(label,pose,use) in zip(source['animations'],labels):
    frame=f"../finn_pet/{a['framesDirectory']}/00.png"
    rows.append(f'<tr><td><img class="thumb" src="{frame}" alt="{label}"></td><td><b>{label}</b><small>{a["name"]}</small></td><td>{pose}<small>{use}</small></td><td>{a["frames"]}<small>{a["loopDurationMs"]} ms</small></td></tr>')
directions=''.join(f'<figure><img src="../finn_pet/{p["file"]}" alt="Kijkrichting {p["angleDegreesClockwiseFromUp"]} graden"><figcaption>{p["angleDegreesClockwiseFromUp"]:g}°</figcaption></figure>' for p in source['lookDirections'])
gallery=''.join(f'<figure><img src="../finn_pet/{a["webp"]}" alt="{label}"><figcaption>{label}</figcaption></figure>' for a,(label,*_) in zip(source['animations'],labels))
html='''<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Finn, poses en ademproef</title>
<style>
*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui;color:var(--foreground,#243246)}main{max-width:880px;margin:auto}h2{font-size:19px;margin:22px 0 10px}h3{font-size:16px;margin:0 0 8px}p{margin:10px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pair article{padding:16px;border:1px solid var(--border,#c9d1d8);border-radius:12px;text-align:center}.stage{background:#eae7df;border-radius:8px}.stage img{width:192px;height:208px;object-fit:contain;display:block;margin:auto}small{display:block;font-size:12px;color:var(--muted-foreground,#53657a)}table{width:100%;border-collapse:collapse;text-align:left;font-size:13px}td,th{padding:7px;border-bottom:1px solid var(--border,#d5dce3);vertical-align:middle}.thumb{width:44px;height:48px;object-fit:contain}td:first-child{width:52px}td:last-child{width:72px}details{margin:14px 0}summary{cursor:pointer;font-weight:600}.directions,.gallery{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}.directions img{width:100%;max-width:80px}.gallery{grid-template-columns:repeat(3,1fr)}.gallery img{width:100%;max-width:192px}figure{margin:6px 0;text-align:center}figcaption{font-size:12px}.choices{display:grid;gap:8px}.choices article{padding:14px 16px;border-radius:10px;background:var(--secondary,#edf0f3)}a{color:inherit}@media(max-width:480px){.pair article{padding:8px}.stage img{width:144px;height:156px}td,th{padding:5px}.directions{grid-template-columns:repeat(4,1fr)}.gallery{grid-template-columns:repeat(2,1fr)}}
</style><main>
<div class="pair"><article><h3>Idle: goedgekeurd en afgerond</h3><div class="stage"><img src="animations/idle.webp" alt="Goedgekeurde rustigere knippering"></div><p>4,4 seconden</p><small>Gekozen proef 01, geen verdere verfijning nodig</small></article><article><h3>Ademproef 02</h3><div class="stage"><img src="breathing_02/animations/idle.webp" alt="Zes nieuwe subtiele ademposes"></div><p>4,4 seconden</p><small>Visueel onvoldoende, niet gekozen</small></article></div>
<p><small>Idle is afgerond. De gebruiker koos proef 01 met dezelfde zes oorspronkelijke frames en 4400 ms per lus. Een nieuwe ademhaling is niet nodig. Proef 02 blijft als afgewezen experiment bewaard. De keuze is centraal overgenomen; appintegratie is hier niet uitgevoerd.</small></p>
<h2>Lopen links: goedgekeurd en afgerond</h2><div class="stage"><img src="sessions/walk_left/drawing_02/running-left.webp" alt="Goedgekeurde twaalf frames voor lopen naar links"></div><p>Drawing 02, twaalf frames met vier nieuwe beenposes. Het oorspronkelijke bovenlijf blijft behouden. De lus duurt 1060 ms. De eerdere timingproef is niet gekozen. <a href="sessions/walk_left/drawing_02/comparison.html">Vergelijk origineel en gekozen versie</a>.</p>
<h2>Wat we al hebben</h2><p>Negen animaties met 57 frames, plus zestien statische kijkrichtingen. De neutrale houding is het eerste idle frame en telt niet dubbel.</p>
<table><thead><tr><th></th><th>Animatie</th><th>Gebaar en toepassing</th><th>Frames</th></tr></thead><tbody>'''+''.join(rows)+'''</tbody></table>
<details><summary>Bekijk de negen originele bewegingen</summary><div class="gallery">'''+gallery+'''</div></details>
<details><summary>De zestien bestaande kijkrichtingen</summary><p><small>Met de klok mee vanaf boven. Losse houdingen, nog geen vloeiende overgangsanimatie.</small></p><div class="directions">'''+directions+'''</div></details>
<h2>Wat eventueel nog ontbreekt</h2><div class="choices"><article><b>1. Een klein bevestigend knikje</b><small>De duidelijkste nieuwe toevoeging. Een rustige afronding als een antwoord klaar is. Springen bestaat, maar is nadrukkelijker.</small></article><article><b>2. Een zachte overgang naar aandachtig kijken</b><small>De kijkhoudingen bestaan al. Eerst hergebruiken; alleen een korte overgang tekenen als het wisselen te abrupt blijkt.</small></article><article><b>3. Discreet wachten op een collega</b><small>Geen nieuwe pose nodig om te beginnen. Rustig idle past beter dan de vragende open hand, die iets van de gebruiker lijkt te verlangen.</small></article></div>
<p><small>Niet elke bestaande pose wordt al door de app aangeroepen. De inventaris maakt onderscheid tussen aanwezige bestanden, gelezen appkoppelingen en voorstellen. Er is geen nieuwe appkoppeling toegevoegd.</small></p>
</main></html>'''
decisions = json.loads((ROOT/'session_status.json').read_text(encoding='utf-8'))
extra = []
for state in ['running-right', 'running', 'review', 'jumping', 'failed', 'waiting', 'waving']:
    choice = decisions.get(state, {})
    if choice.get('approvedForAdoption'):
        extra.append(f'<h2>{choice["title"]}: goedgekeurd en afgerond</h2><div class="stage"><img src="{choice["webp"]}" alt="{choice["title"]}, gekozen variant"></div><p>{choice["description"]} Gekozen versie: {choice["selectedVariant"]}. {choice["frameCount"]} frames, {choice["loopDurationMs"]} ms per lus.</p>')
html = html.replace('<h2>Wat we al hebben</h2>', ''.join(extra) + '<h2>Wat we al hebben</h2>', 1)
(ROOT/'overview.html').write_text(html,encoding='utf-8')
print('Built overview.html with nine states and sixteen directions')
