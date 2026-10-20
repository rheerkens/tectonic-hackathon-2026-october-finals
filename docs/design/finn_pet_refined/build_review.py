"""Build the standalone Finn review board using existing source frames only."""
import base64
import json
from io import BytesIO
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / "finn_pet"
asset_paths = {}


def data_url(path):
    encoded = "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")
    asset_paths[encoded] = path
    return encoded


manifest = json.loads((SOURCE / "animations.json").read_text(encoding="utf-8"))
labels = [
    ("Rust, oorspronkelijke bron", "Oorspronkelijke timing, bewaard voor vergelijking.", "Idle is afgerond. De gebruiker koos proef 01 met een lus van 4400 ms; geen verdere verfijning nodig."),
    ("Lopen rechts, oorspronkelijke bron", "De acht oorspronkelijke tekeningen, bewaard voor vergelijking.", "Afgerond. De gebruiker koos inbetweens_02 met twaalf frames op 1060 ms."),
    ("Lopen links, oorspronkelijke bron", "De acht oorspronkelijke tekeningen, bewaard voor vergelijking.", "Afgerond. De gebruiker koos drawing_02 met twaalf frames en vier nieuwe beenposes, op 1060 ms."),
    ("Begroeten, oorspronkelijke bron", "De vier oorspronkelijke tekeningen, bewaard voor vergelijking.", "Afgerond. Gekozen is de vaste basis met alleen een wisselend armgebied, acht stappen op 2400 ms."),
    ("Springen, oorspronkelijke bron", "De vijf oorspronkelijke tekeningen, bewaard voor vergelijking.", "Afgerond. De gebruiker koos tekenproef 02 met negen frames op 1800 ms."),
    ("Teleurstelling, oorspronkelijke bron", "De acht oorspronkelijke tekeningen, bewaard voor vergelijking.", "Afgerond. De gebruiker koos uitsluitend arm_03 met vaste lichaamsbouw, negen stappen op 3400 ms."),
    ("Iets vragen, oorspronkelijke bron", "De zes oorspronkelijke tekeningen, bewaard voor vergelijking.", "Afgerond. De gebruiker koos drawn_gesture_03 met elf stappen op 3200 ms."),
    ("Nadenken, oorspronkelijke bron", "De zes oorspronkelijke tekeningen, bewaard voor vergelijking.", "Afgerond. De gebruiker koos thinking_drawing_02 op 4400 ms."),
    ("Controleren, oorspronkelijke bron", "De zes oorspronkelijke tekeningen, bewaard voor vergelijking.", "Afgerond. De gebruiker koos drawn02 met elf frames op 2800 ms."),
]
cards = []
for animation, (title, description, proposal) in zip(manifest["animations"], labels):
    folder = SOURCE / animation["framesDirectory"]
    cards.append(dict(id=animation["name"], title=title, section="current", badge="Huidige bron", description=description, proposal=proposal,
                      durations=animation["durationsMs"], frames=[data_url(folder / f"{i:02}.png") for i in range(animation["frames"])]))

cards.extend([
    dict(id="trial01", title="Idle, gekozen variant", section="trials", badge="Goedgekeurd en afgerond", description="Proef 01: dezelfde zes oorspronkelijke tekeningen, met meer rust tussen knipperingen.", proposal="Overgenomen als centrale keuze. Geen nieuwe ademhaling of verdere verfijning nodig. Appintegratie is hier niet uitgevoerd.", durations=[1400, 900, 90, 110, 120, 1780], frames=cards[0]["frames"]),
    dict(id="trial02", title="Idle, proef 02", section="trials", badge="Visueel onvoldoende", description="Zes nieuwe tekeningen met open ogen. De ademcyclus is onvoldoende leesbaar.", proposal="Bewaard als mislukt experiment. Geen vervanging van proef 01 of de appassets.", durations=[900, 700, 600, 600, 700, 900], frames=[data_url(HERE / "breathing_02" / "frames" / "idle" / f"{i:02}.png") for i in range(6)]),
])
decisions = json.loads((HERE / "session_status.json").read_text(encoding="utf-8"))
if decisions.get("running-left", {}).get("approvedForAdoption"):
    choice = decisions["running-left"]
    selected = json.loads((HERE / choice["manifest"]).read_text(encoding="utf-8"))
    folder = (HERE / choice["manifest"]).parent
    bank = [HERE.parents[2] / item["path"] for item in selected["sourceFrames"]]
    bank += [folder / item["preparedPng"] for item in selected["newPoses"]]
    cards.insert(10, dict(id="walk_left_drawing02", title="Lopen links, gekozen variant", section="trials", badge="Goedgekeurd en afgerond",
                         description="Drawing 02: twaalf frames met vier nieuwe beenposes en het oorspronkelijke bovenlijf.",
                         proposal="Centraal overgenomen. De lus blijft 1060 ms. De eerdere timingproef is niet gekozen; appintegratie is hier niet uitgevoerd.",
                         durations=selected["candidateDurationsMs"], frames=[data_url(bank[index]) for index in selected["candidateOrder"]]))
for state, title, card_id in [("running-right", "Lopen rechts, gekozen variant", "walk_right_inbetweens02"), ("running", "Nadenken, gekozen variant", "thinking_drawing02"), ("review", "Controleren, gekozen variant", "review_drawn02"), ("jumping", "Springen, gekozen variant", "jumping_proposal02"), ("failed", "Teleurstelling, gekozen variant", "failed_arm03"), ("waiting", "Iets vragen, gekozen variant", "waiting_gesture03"), ("waving", "Begroeten, gekozen variant", "waving_bodylock03")]:
    choice = decisions.get(state, {})
    if not choice.get("approvedForAdoption"):
        continue
    selected = json.loads((HERE / choice["manifest"]).read_text(encoding="utf-8"))
    if state == "running":
        bank = [HERE.parent / item["file"] for item in selected["files"]]
        order = selected["candidateTimeline"]["sequence"]
    elif state in ("review", "jumping", "failed", "waving"):
        bank = [(HERE / choice["manifest"]).parent / "frames" / f"{i:02}.png" for i in range(choice["frameCount"])]
        order = range(choice["frameCount"])
    elif state == "waiting":
        bank = [(HERE / choice["manifest"]).parent / item["file"] for item in selected["frames"]]
        order = selected["frameIndices"]
    else:
        bank = [HERE.parents[2] / item["file"] for item in selected["sources"]]
        order = selected["candidateOrder"]
    cards.insert(10, dict(id=card_id, title=title, section="trials", badge="Goedgekeurd en afgerond",
                         description=choice["description"], proposal="Centraal overgenomen. Geen verdere verfijning gevraagd. Appintegratie is hier niet uitgevoerd.",
                         durations=choice["durationsMs"], frames=[data_url(bank[index]) for index in order]))
for key, title, description, proposal in [
    ("nod", "Een klein bevestigend knikje", "Ontbrekende animatie. Een kalme bevestiging voor klaar, begrepen of gelukt.", "Eén korte knik met vaste voeten, daarna terug naar neutral."),
    ("breathing", "Nieuwe ademhaling niet nodig", "De gebruiker heeft besloten dat de rustigere timing van proef 01 volstaat. Idle is afgerond.", "Geen nieuwe ademcyclus tekenen. Proef 02 blijft afgewezen."),
    ("transitions", "Vloeiende overgangen", "Geen afzonderlijke overgangsreeksen tussen idle, denken, vragen en controleren.", "Bepaal welke wissel stoort en welke korte tussenposes nodig zijn."),
    ("attention", "Aandachtig kijken of luisteren", "Voorstel om bestaande neutral en kijkposes te gebruiken. Geen nieuwe reeks vereist om te beginnen.", "Alleen nieuwe tussenposes als de bestaande wissel zichtbaar te abrupt is."),
    ("colleague", "Discreet wachten op een collega", "Voorstel voor gebruik van rustige idle. Een aparte animatie is nog niet nodig aangetoond.", "Rustige aanwezigheid; de open vragende hand blijft voor vragen aan de gebruiker."),
]:
    cards.append(dict(id=key, title=title, section="missing", badge="Niet nodig" if key == "breathing" else "Voorstel" if key in ("attention", "colleague") else "Ontbreekt", description=description, proposal=proposal, durations=[], frames=[cards[0]["frames"][0]]))

directions = [dict(angle=item["angleDegreesClockwiseFromUp"], image=data_url(SOURCE / item["file"])) for item in manifest["lookDirections"]]
def page_data(cards, directions):
    # Share repeated source images between the original and approved players.
    images = list(dict.fromkeys([frame for card in cards for frame in card["frames"]] + [item["image"] for item in directions]))
    indices = {image: index for index, image in enumerate(images)}
    compact_cards = [dict(card, frames=[indices[frame] for frame in card["frames"]]) for card in cards]
    compact_directions = [dict(item, image=indices[item["image"]]) for item in directions]
    return "const imageBank=" + json.dumps(images) + ";const cards=" + json.dumps(compact_cards, ensure_ascii=False) + ";const directions=" + json.dumps(compact_directions) + ";cards.forEach(c=>c.frames=c.frames.map(i=>imageBank[i]));directions.forEach(d=>d.image=imageBank[d.image]);"

template = (HERE / "review.template.html").read_text(encoding="utf-8")
(HERE / "review.html").write_text(template.replace("/* REVIEW_DATA */", page_data(cards, directions)), encoding="utf-8")
embedded = template.replace("<h1>Finn, samen verfijnen</h1>", "")
embedded = embedded.replace('<main>', '<main><p>Compacte kijkversie. <a href="http://100.89.117.122:8768/finn_pet_refined/review.html" target="_blank" rel="noopener">Open de review op oorspronkelijke resolutie</a>. Annotaties blijven apart bewaard op de pagina waar je ze invult.</p>', 1)
embedded = embedded.replace('</style>', '.stage{min-height:128px}.stage img{width:96px;height:104px}</style>', 1)
compact_images = {}
for encoded, path in asset_paths.items():
    # Only the inline viewing copy is reduced; the full review retains exact source PNGs.
    image = Image.open(path).convert('RGBA')
    image.thumbnail((96, 104))
    output = BytesIO()
    image.save(output, format='WEBP', quality=82, method=6)
    compact_images[encoded] = 'data:image/webp;base64,' + base64.b64encode(output.getvalue()).decode('ascii')
for card in cards:
    card["frames"] = [compact_images[frame] for frame in card["frames"]]
for direction in directions:
    direction["image"] = compact_images[direction["image"]]
embedded = embedded.replace("/* REVIEW_DATA */", page_data(cards, directions))
(HERE / "review.embed.html").write_text(embedded, encoding="utf-8")
print(json.dumps({"page": str(HERE / "review.html"), "current": 9, "choicesAndTrials": sum(c["section"] == "trials" for c in cards), "proposals": 5, "directions": len(directions), "bytes": (HERE / "review.html").stat().st_size}))
