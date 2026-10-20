// Builds docs/pitch/SDtrust-pitch.pptx: the clickable deck with sprite GIFs, Finn's audio and click animations.
// Layout uses the HTML deck's 1600x900 design pixels (120 px per inch). Run: NODE_PATH=node_modules node build2.js
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const JSZip = require("jszip");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const Lu = require("react-icons/lu");
const SKILL =
	"/home/royh/.claude/skills/synced/e1f0fe6a-08dc-4502-8390-615f1d51b6c6_d78ec8fd-0753-45cb-aaa1-17094cc6979a/pptx";
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const REPO = "/home/royh/.t3/worktrees/tectonic-hackathon-2026-october-finals/t3-fc2c5f3d";
const PITCH = path.join(REPO, "docs/pitch");
const OUT = path.join(PITCH, "SDtrust-pitch.pptx");
const GIFS = JSON.parse(fs.readFileSync("/tmp/sdtrust-deck/gifs/manifest.json", "utf8"));

const X = (px) => px / 120; // design px -> inches
const PT = (px) => Math.round(px * 0.6 * 10) / 10; // design px -> points

const HEX = {
	navy: "192D46",
	night: "0F1D31",
	ivory: "F8F6F1",
	white: "FFFFFF",
	coral: "EE6558",
	amber: "F3BA55",
	blue: "6F9BE0",
	green: "0F7A3A",
	live: "3CCF7A",
	muted: "5F6F85",
	border: "E5E1D8",
	light: "C8D2DF",
	greenSoft: "E7F5EC",
	blueSoft: "E9EEF3",
};
const THEME = {
	name: "SDtrust",
	headFontFace: "Arial",
	bodyFontFace: "Arial",
	colors: {
		dk1: HEX.navy,
		lt1: HEX.white,
		dk2: HEX.night,
		lt2: HEX.ivory,
		accent1: HEX.coral,
		accent2: HEX.amber,
		accent3: HEX.blue,
		accent4: HEX.green,
		accent5: "D84935",
		accent6: HEX.muted,
		hlink: HEX.blue,
		folHlink: HEX.muted,
	},
};

async function icon(Comp, color) {
	const svg = ReactDOMServer.renderToStaticMarkup(
		React.createElement(Comp, { color: "#" + color, size: 256 }),
	);
	return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}
const png = async (file, width, extract) => {
	let img = sharp(file);
	if (extract) img = img.extract(extract);
	return "image/png;base64," + (await img.resize({ width }).png().toBuffer()).toString("base64");
};

// Animation plan, filled while building: slideNo -> [{ trigger: "auto" | "click", effects: [...] }]
const ANIM = {};
const MEDIA = {};

(async () => {
	const img = {
		logo: await png(path.join(REPO, "apps/web/public/sdtrust.svg"), 256),
		finn: await png(path.join(REPO, "docs/design/finn.png"), 768),
		finnHead: await png(path.join(REPO, "docs/design/finn.png"), 240, {
			left: 104,
			top: 22,
			width: 168,
			height: 168,
		}),
		check: await icon(Lu.LuCircleCheck, HEX.green),
		gauge: await icon(Lu.LuGauge, HEX.coral),
		file: await icon(Lu.LuFileText, HEX.navy),
		users: await icon(Lu.LuUsers, HEX.white),
		play: await icon(Lu.LuPlay, HEX.white),
		phone: await icon(Lu.LuPhone, HEX.white),
		saved: await icon(Lu.LuDatabase, HEX.green),
		teams: await icon(Lu.LuMessagesSquare, HEX.white),
		mail: await icon(Lu.LuMail, HEX.white),
		crm: await icon(Lu.LuDatabase, HEX.white),
		doc: await icon(Lu.LuFileText, HEX.white),
		shield: await icon(Lu.LuShieldCheck, HEX.navy),
		layers: await icon(Lu.LuLayers, HEX.navy),
		calendar: await icon(Lu.LuCalendarClock, HEX.navy),
		scale: await icon(Lu.LuScale, HEX.navy),
	};

	const pres = new pptxgen();
	pres.layout = "LAYOUT_WIDE";
	pres.title = "SDtrust pitch";
	pres.author = "Sebastien, Roy, Wanne";
	pres.company = "SDtrust";
	pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
	const C = pres.SchemeColor;

	pres.defineSlideMaster({
		title: "SDtrust Dark",
		background: { color: C.text2 },
		objects: [],
		slideNumber: {
			x: 12.4,
			y: 6.95,
			w: 0.5,
			h: 0.3,
			fontSize: 9,
			color: C.accent6,
			align: "right",
		},
	});
	pres.defineSlideMaster({
		title: "SDtrust Light",
		background: { color: C.background2 },
		objects: [
			{ image: { x: X(72), y: X(828), w: X(38), h: X(38), data: img.logo } },
			{
				text: {
					text: "SDtrust · Tectonic hackathon finals · SD Worx challenge",
					options: {
						x: X(122),
						y: X(828),
						w: 6,
						h: X(38),
						fontSize: 9,
						color: C.accent6,
						margin: 0,
						valign: "middle",
					},
				},
			},
		],
		slideNumber: {
			x: 12.4,
			y: 6.95,
			w: 0.5,
			h: 0.3,
			fontSize: 9,
			color: C.accent6,
			align: "right",
		},
	});

	let slideNo = 0;
	let s;
	const newSlide = (master, section) => {
		slideNo += 1;
		ANIM[slideNo] = [];
		s = pres.addSlide({ masterName: master, sectionTitle: section });
		return s;
	};
	const box = (px) => ({ x: X(px[0]), y: X(px[1]), w: X(px[2]), h: X(px[3]) });
	const text = (name, value, px, opts) =>
		s.addText(value, {
			...box(px),
			isTextBox: true,
			margin: 0,
			objectName: name,
			valign: "top",
			...opts,
		});
	const shape = (name, kind, px, opts) =>
		s.addShape(kind, { ...box(px), objectName: name, line: { type: "none" }, ...opts });
	const image = (name, data, px) => s.addImage({ data, ...box(px), objectName: name });
	const gif = (name, key) => {
		const g = GIFS[key];
		s.addImage({ path: g.path, ...box([g.x, g.y, g.w, g.h]), objectName: name });
	};
	const group = (trigger, effects) => ANIM[slideNo].push({ trigger, effects });
	const shadow = () => ({
		type: "outer",
		color: HEX.navy,
		opacity: 0.12,
		blur: 12,
		offset: 4,
		angle: 90,
	});
	const R = pres.shapes;

	// 1. Lotte and the call
	pres.addSection({ title: "Problem" });
	newSlide("SDtrust Dark", "Problem");
	text("Date", "21 October", [96, 110, 900, 140], {
		fontSize: PT(120),
		bold: true,
		color: C.accent1,
	});
	text(
		"Lead",
		"Lotte is a payroll consultant at SD Worx.\nHer client Atlas calls:",
		[96, 330, 820, 110],
		{ fontSize: PT(36), color: C.background1 },
	);
	shape("Quote", R.ROUNDED_RECTANGLE, [96, 498, 792, 168], {
		fill: { color: C.text1 },
		rectRadius: 0.2,
	});
	text("Quote text", "“Can we still submit a payroll change?”", [138, 498, 720, 168], {
		fontSize: PT(38),
		bold: true,
		italic: true,
		color: C.background1,
		valign: "middle",
	});
	shape("Halo", R.OVAL, [1002, 120, 504, 504], { fill: { color: C.text1 } });
	gif("Lotte puzzled", "lotte-puzzled");
	group("auto", [
		{ name: "Lotte puzzled", fx: "fade", delay: 0, dur: 700 },
		{ name: "Quote", fx: "fade", delay: 900, dur: 500 },
		{ name: "Quote text", fx: "fade", delay: 900, dur: 500 },
	]);
	s.addNotes(
		"It's 21 October. Lotte is a payroll consultant at SD Worx. Her client Atlas calls: can we still submit a payroll change?",
	);

	// 2. Three answers
	newSlide("SDtrust Light", "Problem");
	text("Title", "Three answers. None of them is right", [72, 60, 1400, 80], {
		fontSize: PT(54),
		bold: true,
		color: C.text1,
	});
	[
		["20th", "Procedure Belgium", "General rule", -3],
		["23rd", "Atlas meeting", "A proposal on the board", 2],
		["25th", "Teams chat", "A question, no owner", -2],
	].forEach(([day, where, why, rot], i) => {
		s.addText(
			[
				{ text: day, options: { fontSize: PT(92), bold: true, breakLine: true } },
				{ text: where, options: { fontSize: 13, bold: true, breakLine: true } },
				{ text: why, options: { fontSize: 11 } },
			],
			{
				...box([72 + i * 378, 222, 330, 330]),
				shape: R.RECTANGLE,
				fill: { color: C.accent2 },
				rotate: rot,
				color: C.text1,
				align: "center",
				valign: "middle",
				margin: 6,
				shadow: shadow(),
				objectName: `Sticky ${day}`,
			},
		);
	});
	s.addText(
		[
			{
				text: "22nd",
				options: { fontSize: PT(92), bold: true, color: C.accent6, breakLine: true },
			},
			{
				text: "Roy's agreement",
				options: { fontSize: 13, bold: true, color: C.text1, breakLine: true },
			},
			{ text: "Only in Roy's head", options: { fontSize: 11, color: C.accent6 } },
		],
		{
			...box([1206, 222, 318, 330]),
			shape: R.ROUNDED_RECTANGLE,
			rectRadius: 0.15,
			fill: { color: C.background1 },
			line: { color: HEX.coral, width: 1.5, dashType: "dash" },
			align: "center",
			valign: "middle",
			margin: 6,
			objectName: "Hidden answer",
		},
	);
	text(
		"Body",
		[
			{ text: "Lotte doesn't lack information. ", options: { bold: true } },
			{
				text: "Nothing tells her which version to trust. Today she searches for 20 minutes and pings three colleagues. If she guesses wrong, real people get the wrong salary.",
			},
		],
		[72, 618, 1150, 120],
		{ fontSize: PT(26), color: C.text1 },
	);
	gif("Lotte shrug", "lotte-shrug");
	group("auto", [
		{ name: "Sticky 20th", fx: "flyTop", delay: 150, dur: 600 },
		{ name: "Sticky 23rd", fx: "flyTop", delay: 450, dur: 600 },
		{ name: "Sticky 25th", fx: "flyTop", delay: 750, dur: 600 },
		{ name: "Lotte shrug", fx: "fade", delay: 1200, dur: 700 },
		{ name: "Hidden answer", fx: "fade", delay: 1700, dur: 800 },
	]);
	s.addNotes(
		"The procedure says the 20th. A Teams meeting said the 23rd. Someone in chat says the 25th. None of them is right: the real answer is the 22nd, an exception Roy agreed with Atlas. It was never written down, it only lives in Roy's head. Lotte doesn't lack information, she has too much of it, and nothing tells her which version to trust. If she guesses wrong, real people get the wrong salary.",
	);

	// 3. The solution
	pres.addSection({ title: "Solution" });
	newSlide("SDtrust Dark", "Solution");
	text("Kicker", "THE SOLUTION", [96, 150, 600, 30], {
		fontSize: PT(18),
		bold: true,
		color: C.accent2,
		charSpacing: 3,
	});
	image("Logo", img.logo, [96, 196, 108, 108]);
	text("Brand", "SDtrust", [226, 196, 600, 108], {
		fontSize: PT(76),
		bold: true,
		color: C.background1,
		valign: "middle",
	});
	text("Lead", "Knowledge you can trust,\nwithout anyone writing it down", [96, 350, 760, 110], {
		fontSize: PT(36),
		color: C.background1,
	});
	text(
		"Body",
		"SDtrust reads what your company already writes, decides which version to trust, and shows you why.",
		[96, 498, 700, 80],
		{ fontSize: PT(24), color: HEX.light },
	);
	text("Team", "Sebastien · Roy · Wanne", [96, 700, 700, 30], {
		fontSize: PT(20),
		bold: true,
		color: C.accent2,
	});
	text(
		"Meta",
		"Tectonic hackathon finals · SD Worx challenge · 20 October 2026",
		[96, 742, 800, 30],
		{ fontSize: PT(17), color: C.background2 },
	);
	const sources = [
		[img.teams, "Teams"],
		[img.mail, "Mail"],
		[img.crm, "CRM"],
		[img.doc, "Procedures"],
	];
	const fx3 = [];
	sources.forEach(([ic, label], i) => {
		const y = 216 + i * 108;
		shape(`Source ${label}`, R.ROUNDED_RECTANGLE, [900, y, 230, 72], {
			fill: { color: C.text1 },
			rectRadius: 0.15,
		});
		image(`Source icon ${label}`, ic, [922, y + 21, 30, 30]);
		text(`Source label ${label}`, label, [968, y, 150, 72], {
			fontSize: PT(22),
			bold: true,
			color: C.background1,
			valign: "middle",
		});
		const y1 = y + 36;
		s.addShape(R.LINE, {
			x: X(1130),
			y: X(Math.min(y1, 420)),
			w: X(140),
			h: Math.max(X(Math.abs(420 - y1)), 0.01),
			flipV: y1 > 420,
			line: { color: HEX.muted, width: 1.5, dashType: "dash" },
			objectName: `Flow ${label}`,
		});
		fx3.push(
			{ name: `Source ${label}`, fx: "fade", delay: 150 + i * 150, dur: 400 },
			{ name: `Source icon ${label}`, fx: "fade", delay: 150 + i * 150, dur: 400 },
			{ name: `Source label ${label}`, fx: "fade", delay: 150 + i * 150, dur: 400 },
		);
		fx3.push({ name: `Flow ${label}`, fx: "wipeLeft", delay: 900 + i * 100, dur: 500 });
	});
	s.addText(
		[
			{
				text: "ONE ANSWER",
				options: { fontSize: 9, bold: true, color: C.accent6, charSpacing: 1.5, breakLine: true },
			},
			{
				text: "22 October 2026",
				options: { fontSize: PT(30), bold: true, color: C.text1, breakLine: true },
			},
			{
				text: "Trust 92%",
				options: { fontSize: 11, bold: true, color: C.accent4, breakLine: true },
			},
			{ text: "Source: CRM · Roy", options: { fontSize: 9, color: C.accent6 } },
		],
		{
			...box([1270, 330, 270, 180]),
			shape: R.ROUNDED_RECTANGLE,
			rectRadius: 0.18,
			fill: { color: C.background1 },
			line: { color: HEX.coral, width: 2.5 },
			margin: 14,
			valign: "middle",
			paraSpaceAfter: 4,
			objectName: "Answer",
		},
	);
	fx3.push({ name: "Answer", fx: "flyBottom", delay: 1400, dur: 600 });
	group("auto", fx3);
	s.addNotes(
		"That's the problem SD Worx asked us to solve: turn scattered knowledge into something people can trust, without anyone writing documentation. Our answer is SDtrust. It reads what your company already writes in Teams, mail, the CRM and procedures, decides which version to trust, and shows you why.",
	);

	// 4. Meet Finn
	newSlide("SDtrust Light", "Solution");
	text("Title", "Meet Finn", [72, 60, 1400, 80], { fontSize: PT(54), bold: true, color: C.text1 });
	text("Sub", "Lives on your desktop. Out of the way until you need him.", [72, 162, 620, 60], {
		fontSize: PT(22),
		color: C.accent6,
	});
	gif("Finn idle", "finn-idle");
	const fx4 = [];
	[
		[img.check, "The answer", "22 October 2026"],
		[img.gauge, "How much to trust it", "92% · approved by the account owner"],
		[img.file, "Where it came from", "CRM · client agreement · Roy"],
	].forEach(([ic, label, value], i) => {
		const y = 186 + i * 144;
		shape(`Card ${i}`, R.ROUNDED_RECTANGLE, [720, y, 804, 120], {
			fill: { color: C.background1 },
			line: { color: HEX.border, width: 1 },
			rectRadius: 0.15,
			shadow: shadow(),
		});
		image(`Card icon ${i}`, ic, [756, y + 34, 52, 52]);
		text(
			`Card text ${i}`,
			[
				{ text: label, options: { fontSize: 10, color: C.accent6, breakLine: true } },
				{ text: value, options: { fontSize: PT(26), bold: true, color: C.text1 } },
			],
			[828, y + 20, 670, 84],
			{ valign: "middle" },
		);
		["Card", "Card icon", "Card text"].forEach((n) =>
			fx4.push({ name: `${n} ${i}`, fx: "flyBottom", delay: 200 + i * 250, dur: 500 }),
		);
	});
	shape("Card 3", R.ROUNDED_RECTANGLE, [720, 618, 804, 144], {
		fill: { color: C.accent1 },
		rectRadius: 0.15,
	});
	image("Card icon 3", img.users, [756, 664, 52, 52]);
	text(
		"Card text 3",
		[
			{ text: "Not sure?", options: { fontSize: 10, color: C.background1, breakLine: true } },
			{
				text: "Finn says so, and asks the colleague who knows",
				options: { fontSize: PT(26), bold: true, color: C.background1 },
			},
		],
		[828, 630, 670, 120],
		{ valign: "middle" },
	);
	["Card", "Card icon", "Card text"].forEach((n) =>
		fx4.push({ name: `${n} 3`, fx: "flyBottom", delay: 1000, dur: 500 }),
	);
	group("auto", fx4);
	s.addNotes(
		"And you talk to SDtrust through Finn. Every answer comes with how much you can trust it and where it came from. And when Finn isn't sure, it says so and asks the colleague who knows.",
	);

	// 5. Demo video
	pres.addSection({ title: "Demo" });
	newSlide("SDtrust Dark", "Demo");
	shape("Video placeholder", R.ROUNDED_RECTANGLE, [108, 66, 1384, 779], {
		fill: { color: C.text1 },
		line: { color: HEX.muted, width: 1, dashType: "dash" },
		rectRadius: 0.2,
	});
	shape("Play", R.OVAL, [740, 310, 120, 120], { fill: { color: C.accent1 } });
	image("Play icon", img.play, [776, 346, 52, 52]);
	text("Video label", "Demo video · about 1:20 · no audio", [108, 470, 1384, 50], {
		fontSize: PT(30),
		bold: true,
		color: C.background1,
		align: "center",
	});
	text(
		"Video hint",
		"Replace this box: Insert › Video › This Device, then Playback › Start: Automatically",
		[108, 528, 1384, 40],
		{ fontSize: PT(19), color: C.background2, align: "center" },
	);
	s.addNotes(
		[
			"Narrate live over the silent video. Cues:",
			"0:00 Finn idle: Finn lives on your desktop and stays out of the way.",
			"0:08 Typing the question: Lotte just asks. 'Until when can Atlas submit payroll changes?'",
			"0:20 Source icons orbit Finn: Finn searches what the company already writes. Teams, mail, CRM, procedures.",
			"0:30 Answer, 22 October, trust 92%: 22 October, with high trust, and every source behind it.",
			"0:45 Result page, rejected sources: And it shows what it rejected. The 23rd was a proposal in a meeting. The 25th was a question in chat.",
			"1:05 Follow-up 'And for next month?': Then Lotte asks about November.",
			"1:15 Trust 15%, no answer: Most AI would just say 22 October again. Finn says: I don't know. Nothing approved covers November. So Finn calls the one person who does.",
			"(Video ends around 1:20. Click to the next slide: the call.)",
		].join("\n"),
	);

	// 6. The call
	pres.addSection({ title: "Call" });
	newSlide("SDtrust Dark", "Call");
	text("Title", "Finn calls the one person who knows", [72, 60, 1400, 80], {
		fontSize: PT(54),
		bold: true,
		color: C.background1,
	});
	shape("Call card", R.ROUNDED_RECTANGLE, [72, 170, 640, 345], {
		fill: { color: C.text1 },
		rectRadius: 0.2,
	});
	shape("Dot calling", R.OVAL, [104, 202, 12, 12], { fill: { color: C.accent2 } });
	shape("Dot live", R.OVAL, [104, 202, 12, 12], { fill: { color: HEX.live } });
	text("Call label", "Teams call", [126, 194, 200, 28], {
		fontSize: PT(18),
		bold: true,
		color: C.background2,
		valign: "middle",
	});
	text("Status calling", "Calling Roy…", [440, 194, 240, 28], {
		fontSize: PT(18),
		bold: true,
		color: C.accent2,
		align: "right",
		valign: "middle",
	});
	text("Status live", "Connected", [440, 194, 240, 28], {
		fontSize: PT(18),
		bold: true,
		color: HEX.live,
		align: "right",
		valign: "middle",
	});
	shape("Finn avatar bg", R.OVAL, [173, 238, 112, 112], { fill: { color: "2A3D57" } });
	s.addImage({
		data: img.finnHead,
		...box([173, 238, 112, 112]),
		rounding: true,
		objectName: "Finn avatar",
	});
	text(
		"Finn name",
		[
			{
				text: "Finn",
				options: { fontSize: PT(22), bold: true, color: C.background1, breakLine: true },
			},
			{ text: "SDtrust", options: { fontSize: 9, color: HEX.light } },
		],
		[134, 362, 190, 60],
		{ align: "center" },
	);
	shape("Line", R.LINE, [300, 294, 185, 0], {
		line: { color: HEX.muted, width: 1.5, dashType: "sysDot" },
	});
	shape("Phone calling", R.OVAL, [366, 268, 52, 52], { fill: { color: C.accent2 } });
	shape("Phone live", R.OVAL, [366, 268, 52, 52], { fill: { color: HEX.live } });
	image("Phone icon", img.phone, [379, 281, 26, 26]);
	shape("Roy avatar", R.OVAL, [499, 238, 112, 112], { fill: { color: C.accent1 } });
	text("Roy initial", "R", [499, 238, 112, 112], {
		fontSize: PT(54),
		bold: true,
		color: C.background1,
		align: "center",
		valign: "middle",
	});
	text(
		"Roy name",
		[
			{
				text: "Roy",
				options: { fontSize: PT(22), bold: true, color: C.background1, breakLine: true },
			},
			{ text: "Account owner, Atlas", options: { fontSize: 9, color: HEX.light } },
		],
		[460, 362, 190, 60],
		{ align: "center" },
	);
	s.addText(
		[
			{ text: "Why Roy? ", options: { bold: true, color: C.accent2 } },
			{
				text: "He owns the Atlas agreements and approved the October exception",
				options: { color: C.background2 },
			},
		],
		{
			...box([104, 432, 576, 62]),
			shape: R.ROUNDED_RECTANGLE,
			rectRadius: 0.1,
			fill: { color: C.text2 },
			fontSize: PT(17),
			margin: 8,
			valign: "middle",
			objectName: "Why",
		},
	);

	text("Transcript label", "LIVE TRANSCRIPT", [760, 170, 400, 24], {
		fontSize: PT(16),
		bold: true,
		color: "8FA0B5",
		charSpacing: 1.5,
	});
	const bubble = (name, who, line, px, fill, labelColor) =>
		s.addText(
			[
				{ text: who, options: { fontSize: 9, bold: true, color: labelColor, breakLine: true } },
				{ text: line, options: { fontSize: PT(21), color: C.background1 } },
			],
			{
				...box(px),
				shape: R.ROUNDED_RECTANGLE,
				rectRadius: 0.15,
				fill: { color: fill },
				margin: 10,
				valign: "middle",
				paraSpaceAfter: 2,
				objectName: name,
			},
		);
	bubble(
		"Bubble Finn 1",
		"Finn",
		"Hi Roy, it's Finn. You own the Atlas agreements, so you're the one who knows. Until when can Atlas submit payroll changes in November? I can't find anything approved.",
		[760, 210, 700, 150],
		C.text1,
		C.accent2,
	);
	bubble(
		"Bubble Roy",
		"Roy",
		"Hi Finn! Until the 24th, same deal as October. I just forgot to put it in the CRM.",
		[828, 380, 700, 110],
		C.accent1,
		C.background1,
	);
	bubble(
		"Bubble Finn 2",
		"Finn",
		"Thanks Roy! I've saved it, and I'll let Lotte know.",
		[760, 510, 700, 90],
		C.text1,
		C.accent2,
	);

	shape("Knowledge card", R.ROUNDED_RECTANGLE, [72, 545, 640, 290], {
		fill: { color: C.background1 },
		line: { color: HEX.live, width: 3 },
		rectRadius: 0.2,
	});
	image("Knowledge icon", img.saved, [104, 571, 30, 30]);
	text("Knowledge head", "Added to Finn's knowledge, automatically", [146, 568, 540, 36], {
		fontSize: PT(21),
		bold: true,
		color: C.text1,
		valign: "middle",
	});
	text("Knowledge source", "S35 · Teams call · Roy · 21 October 2026", [104, 610, 580, 24], {
		fontSize: 9,
		color: C.accent6,
	});
	text(
		"Knowledge quote",
		"“Atlas may submit payroll changes until 24 November 2026.”",
		[104, 638, 580, 64],
		{ fontSize: PT(23), bold: true, color: C.text1 },
	);
	s.addText("Confirmed by the owner", {
		...box([104, 710, 210, 30]),
		shape: R.ROUNDED_RECTANGLE,
		rectRadius: 0.12,
		fill: { color: HEX.greenSoft },
		color: C.accent4,
		fontSize: 9,
		bold: true,
		align: "center",
		valign: "middle",
		margin: 0,
		objectName: "Chip owner",
	});
	s.addText("Belgium · Atlas · November 2026", {
		...box([324, 710, 250, 30]),
		shape: R.ROUNDED_RECTANGLE,
		rectRadius: 0.12,
		fill: { color: HEX.blueSoft },
		color: C.text1,
		fontSize: 9,
		bold: true,
		align: "center",
		valign: "middle",
		margin: 0,
		objectName: "Chip scope",
	});
	text(
		"Trust label",
		[
			{ text: "Trust  ", options: { color: C.accent6, fontSize: 10 } },
			{ text: "15%", options: { color: C.accent6, fontSize: 13, strike: "sngStrike" } },
		],
		[104, 760, 110, 50],
		{ valign: "middle" },
	);
	text("Trust value", "94%", [214, 754, 120, 60], {
		fontSize: PT(40),
		bold: true,
		color: C.accent4,
		valign: "middle",
	});
	shape("Meter bg", R.ROUNDED_RECTANGLE, [344, 778, 336, 12], {
		fill: { color: "EEF0F3" },
		rectRadius: 0.05,
	});
	shape("Meter fill", R.ROUNDED_RECTANGLE, [344, 778, 316, 12], {
		fill: { color: C.accent4 },
		rectRadius: 0.05,
	});

	s.addMedia({
		type: "audio",
		path: path.join(PITCH, "finn-call-1.mp3"),
		x: 13.45,
		y: 0.3,
		w: 0.5,
		h: 0.5,
		objectName: "Finn audio 1",
	});
	s.addMedia({
		type: "audio",
		path: path.join(PITCH, "finn-call-2.mp3"),
		x: 13.45,
		y: 1.0,
		w: 0.5,
		h: 0.5,
		objectName: "Finn audio 2",
	});
	MEDIA[slideNo] = { "Finn audio 1": 10368, "Finn audio 2": 3216 };

	group("auto", [
		{ name: "Dot calling", fx: "fadeOut", delay: 2000, dur: 300 },
		{ name: "Status calling", fx: "fadeOut", delay: 2000, dur: 300 },
		{ name: "Phone calling", fx: "fadeOut", delay: 2000, dur: 300 },
		{ name: "Dot live", fx: "fade", delay: 2000, dur: 300 },
		{ name: "Status live", fx: "fade", delay: 2000, dur: 300 },
		{ name: "Phone live", fx: "fade", delay: 2000, dur: 300 },
		{ name: "Bubble Finn 1", fx: "fade", delay: 2100, dur: 500 },
		{ name: "Finn audio 1", fx: "play", delay: 2100 },
	]);
	group("click", [{ name: "Bubble Roy", fx: "flyBottom", delay: 0, dur: 500 }]);
	group("click", [
		{ name: "Bubble Finn 2", fx: "flyBottom", delay: 0, dur: 500 },
		{ name: "Finn audio 2", fx: "play", delay: 0 },
	]);
	group(
		"click",
		[
			"Knowledge card",
			"Knowledge icon",
			"Knowledge head",
			"Knowledge source",
			"Knowledge quote",
			"Chip owner",
			"Chip scope",
			"Trust label",
			"Trust value",
			"Meter bg",
		]
			.map((name) => ({ name, fx: "fade", delay: 0, dur: 500 }))
			.concat([{ name: "Meter fill", fx: "wipeLeft", delay: 500, dur: 1400 }]),
	);
	s.addNotes(
		[
			"THE CALL. Roy stands up holding his phone as if he picks up.",
			"On entering: the call rings for 2 seconds, then Finn speaks (audio plays by itself):",
			"  FINN: Hi Roy, it's Finn. You own the Atlas agreements, so you're the one who knows. Until when can Atlas submit payroll changes in November? I can't find anything approved.",
			"CLICK 1, Roy answers live, loud and clear:",
			"  ROY: Hi Finn! Until the 24th, same deal as October. I just forgot to put it in the CRM.",
			"CLICK 2, Finn answers (audio):",
			"  FINN: Thanks Roy! I've saved it, and I'll let Lotte know.",
			"CLICK 3, the knowledge card appears. PRESENTER: Roy never opened the CRM. Finn saved his answer from the call, so the next person who asks gets it straight away.",
		].join("\n"),
	);

	// 7. Close
	pres.addSection({ title: "Close" });
	newSlide("SDtrust Dark", "Close");
	gif("Lotte relieved", "lotte-relieved");
	gif("Finn waving", "finn-waving");
	text("Close 1", "An answer you can trust.", [684, 180, 880, 80], {
		fontSize: PT(54),
		bold: true,
		color: C.background1,
	});
	text("Close 2", "Or an honest “I don't know”,\nplus the right colleague.", [684, 288, 880, 130], {
		fontSize: PT(42),
		color: C.accent2,
	});
	text("Close 3", "Zero unnecessary effort.", [684, 516, 880, 50], {
		fontSize: PT(28),
		italic: true,
		color: C.background2,
	});
	image("Close logo", img.logo, [684, 654, 72, 72]);
	text("Close brand", "SDtrust", [770, 654, 400, 72], {
		fontSize: PT(34),
		bold: true,
		color: C.background1,
		valign: "middle",
	});
	group("auto", [
		{ name: "Close 1", fx: "fade", delay: 300, dur: 500 },
		{ name: "Close 2", fx: "fade", delay: 900, dur: 500 },
		{ name: "Close 3", fx: "fade", delay: 1500, dur: 500 },
	]);
	s.addNotes(
		"SDtrust: an answer you can trust, or an honest I don't know plus the right colleague. Zero unnecessary effort. Thank you.",
	);

	// 8. Backup
	pres.addSection({ title: "Backup" });
	newSlide("SDtrust Light", "Backup");
	text("Title", "How Finn decides what to trust", [72, 60, 1400, 80], {
		fontSize: PT(54),
		bold: true,
		color: C.text1,
	});
	text("Sub", "Every percentage on screen comes with its reasons", [72, 162, 1200, 40], {
		fontSize: PT(22),
		color: C.accent6,
	});
	[
		[img.shield, "Authority", "Approved by the owner beats a chat message or a meeting proposal"],
		[img.layers, "Scope", "Valid for this country, this client and this period"],
		[img.calendar, "Validity", "Superseded or expired versions lose, even if they look official"],
		[img.scale, "Agreement", "Conflicting sources lower trust. Too low? Finn asks the owner"],
	].forEach(([ic, title, body], i) => {
		const x = 72 + (i % 2) * 738;
		const y = 264 + Math.floor(i / 2) * 258;
		shape(`Factor ${title}`, R.ROUNDED_RECTANGLE, [x, y, 714, 228], {
			fill: { color: C.background1 },
			line: { color: HEX.border, width: 1 },
			rectRadius: 0.15,
			shadow: shadow(),
		});
		shape(`Factor dot ${title}`, R.OVAL, [x + 42, y + 48, 108, 108], {
			fill: { color: C.background2 },
		});
		image(`Factor icon ${title}`, ic, [x + 70, y + 76, 52, 52]);
		text(
			`Factor text ${title}`,
			[
				{ text: title, options: { fontSize: PT(30), bold: true, color: C.text1, breakLine: true } },
				{ text: body, options: { fontSize: PT(21), color: C.accent6 } },
			],
			[x + 186, y + 42, 500, 160],
			{ paraSpaceAfter: 6 },
		);
	});
	s.addNotes("Backup for Q&A, question 'How is the trust score calculated?'. Show only if asked.");

	await pres.writeFile({ fileName: OUT });
	await applyTheme(OUT, THEME);
	await addAnimations(OUT);
	console.log("wrote", OUT);
})();

// ---------- click animations, transitions and audio fixes, written into the slide XML ----------
async function addAnimations(file) {
	const zip = await JSZip.loadAsync(fs.readFileSync(file));
	for (const [no, groups] of Object.entries(ANIM)) {
		const slidePath = `ppt/slides/slide${no}.xml`;
		let xml = dedupeIds(await zip.file(slidePath).async("string"));
		if (!groups.length) {
			zip.file(
				slidePath,
				xml.replace(
					"</p:clrMapOvr>",
					'</p:clrMapOvr><p:transition spd="med"><p:fade/></p:transition>',
				),
			);
			continue;
		}
		const ids = {};
		const used = new Set();
		for (const m of xml.matchAll(/<p:cNvPr id="(\d+)" name="([^"]*)"/g)) used.add(Number(m[1]));
		// Media gets id = rId + 2 from pptxgenjs, which can collide with shapes: give each media pic a fresh id
		let next = Math.max(0, ...used) + 1;
		xml = xml.replace(
			/<p:cNvPr id="(\d+)" name="([^"]*)"><a:hlinkClick r:id="" action="ppaction:\/\/media"\/><\/p:cNvPr>/g,
			(_, id, name) => `<p:cNvPr id="${next++}" name="${name}"/>`,
		);
		// Audio is written as a video link; PowerPoint wants audioFile for an mp3
		xml = xml.replace(/<a:videoFile r:link="(rId\d+)"\/>/g, (whole, rid) =>
			MEDIA[no] ? `<a:audioFile r:link="${rid}"/>` : whole,
		);
		const kinds = {};
		for (const m of xml.matchAll(
			/<p:(sp|pic)>\s*<p:nv(?:Sp|Pic)Pr>\s*<p:cNvPr id="(\d+)" name="([^"]*)"/g,
		)) {
			ids[m[3]] = Number(m[2]);
			kinds[m[3]] = m[1];
		}
		const timing = buildTiming(groups, ids, kinds, MEDIA[no] || {}, no);
		const transition = '<p:transition spd="med"><p:fade/></p:transition>';
		xml = xml.replace("</p:clrMapOvr>", `</p:clrMapOvr>${transition}${timing}`);
		zip.file(slidePath, xml);
		if (MEDIA[no]) {
			const relsPath = `ppt/slides/_rels/slide${no}.xml.rels`;
			let rels = await zip.file(relsPath).async("string");
			// the link used by audioFile must be an audio relationship
			for (const m of xml.matchAll(/<a:audioFile r:link="(rId\d+)"\/>/g)) {
				rels = rels.replace(
					new RegExp(`(<Relationship Id="${m[1]}" Type=")[^"]*(")`),
					"$1http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio$2",
				);
			}
			zip.file(relsPath, rels);
		}
	}
	const types = await zip.file("[Content_Types].xml").async("string");
	zip.file(
		"[Content_Types].xml",
		types.replace('ContentType="audio/mp3"', 'ContentType="audio/mpeg"'),
	);
	fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

// pptxgenjs gives the slide number placeholder a fixed id that can clash with a shape: renumber repeats
function dedupeIds(xml) {
	const all = [...xml.matchAll(/<p:cNvPr id="(\d+)"/g)].map((m) => Number(m[1]));
	let next = Math.max(...all) + 1;
	const seen = new Set();
	return xml.replace(/<p:cNvPr id="(\d+)"/g, (whole, id) => {
		if (!seen.has(id)) {
			seen.add(id);
			return whole;
		}
		return `<p:cNvPr id="${next++}"`;
	});
}

function buildTiming(groups, ids, kinds, media, slideNo) {
	let n = 2;
	const id = () => ++n;
	const tgt = (spid) => `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`;
	const setVis = (spid, val, delay) =>
		`<p:set><p:cBhvr><p:cTn id="${id()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="${delay}"/></p:stCondLst></p:cTn>${tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="${val}"/></p:to></p:set>`;
	const prop = (spid, attr, from, to, dur) =>
		`<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="${id()}" dur="${dur}" fill="hold"/>${tgt(spid)}<p:attrNameLst><p:attrName>${attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="${from}"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav></p:tavLst></p:anim>`;
	const builds = new Set();
	const effect = (e, nodeType) => {
		const spid = ids[e.name];
		if (!spid) throw new Error(`slide ${slideNo}: no shape named ${e.name}`);
		if (e.fx === "play") {
			return `<p:par><p:cTn id="${id()}" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="${nodeType}"><p:stCondLst><p:cond delay="${e.delay}"/></p:stCondLst><p:childTnLst><p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="${id()}" dur="${media[e.name]}" fill="hold"/>${tgt(spid)}</p:cBhvr></p:cmd></p:childTnLst></p:cTn></p:par>`;
		}
		if (kinds[e.name] === "sp") builds.add(spid);
		const head = (presetID, cls, sub) =>
			`<p:par><p:cTn id="${id()}" presetID="${presetID}" presetClass="${cls}" presetSubtype="${sub}" fill="hold" grpId="0" nodeType="${nodeType}"><p:stCondLst><p:cond delay="${e.delay}"/></p:stCondLst><p:childTnLst>`;
		const tail = "</p:childTnLst></p:cTn></p:par>";
		switch (e.fx) {
			case "fade":
				return (
					head(10, "entr", 0) +
					setVis(spid, "visible", 0) +
					`<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${id()}" dur="${e.dur}"/>${tgt(spid)}</p:cBhvr></p:animEffect>` +
					tail
				);
			case "wipeLeft":
				return (
					head(22, "entr", 8) +
					setVis(spid, "visible", 0) +
					`<p:animEffect transition="in" filter="wipe(left)"><p:cBhvr><p:cTn id="${id()}" dur="${e.dur}"/>${tgt(spid)}</p:cBhvr></p:animEffect>` +
					tail
				);
			case "flyTop":
			case "flyBottom": {
				const from = e.fx === "flyTop" ? "0-#ppt_h/2" : "1+#ppt_h/2";
				return (
					head(2, "entr", e.fx === "flyTop" ? 1 : 4) +
					setVis(spid, "visible", 0) +
					prop(spid, "ppt_x", "#ppt_x", "#ppt_x", e.dur) +
					prop(spid, "ppt_y", from, "#ppt_y", e.dur) +
					tail
				);
			}
			case "fadeOut":
				return (
					head(10, "exit", 0) +
					`<p:animEffect transition="out" filter="fade"><p:cBhvr><p:cTn id="${id()}" dur="${e.dur}"/>${tgt(spid)}</p:cBhvr></p:animEffect>` +
					setVis(spid, "hidden", e.dur - 1) +
					tail
				);
			default:
				throw new Error(e.fx);
		}
	};
	const clickGroups = groups.map((g) => {
		const outer = id();
		const inner = id();
		const start =
			g.trigger === "auto"
				? `<p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>`
				: `<p:cond delay="indefinite"/>`;
		const effects = g.effects
			.map((e, i) =>
				effect(e, i === 0 ? (g.trigger === "auto" ? "afterEffect" : "clickEffect") : "withEffect"),
			)
			.join("");
		return `<p:par><p:cTn id="${outer}" fill="hold"><p:stCondLst>${start}</p:stCondLst><p:childTnLst><p:par><p:cTn id="${inner}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${effects}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
	});
	const audioNodes = Object.keys(media)
		.map(
			(name) =>
				`<p:audio><p:cMediaNode vol="80000"><p:cTn id="${id()}" display="0" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:endCondLst><p:cond evt="onStopAudio" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst></p:cTn>${tgt(ids[name])}</p:cMediaNode></p:audio>`,
		)
		.join("");
	const bld = builds.size
		? `<p:bldLst>${[...builds].map((spid) => `<p:bldP spid="${spid}" grpId="0" animBg="1"/>`).join("")}</p:bldLst>`
		: "";
	return `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${clickGroups.join("")}</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>${audioNodes}</p:childTnLst></p:cTn></p:par></p:tnLst>${bld}</p:timing>`;
}
