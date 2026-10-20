// Builds two self-contained, clickable HTML decks in docs/pitch. Run: node html.js
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const Lu = require("react-icons/lu");

const REPO = "/home/royh/.t3/worktrees/tectonic-hackathon-2026-october-finals/t3-fc2c5f3d";
const OUT = path.join(REPO, "docs/pitch");
const VIDEO_DIR = path.join(REPO, "docs/presentation/video");
const CLIPS = JSON.parse(fs.readFileSync(path.join(__dirname, "clips.json"), "utf8")).map(
	(clip, i) => {
		const file = path.join(VIDEO_DIR, clip.file);
		return { ...clip, n: i + 1, file: fs.existsSync(file) ? file : null };
	},
);

const spriteOr = (p, fallback) =>
	fs.existsSync(p) ? b64(fs.readFileSync(p), "image/webp") : fallback;
const b64 = (buf, mime) => `data:${mime};base64,${buf.toString("base64")}`;
const file = (p, mime) => b64(fs.readFileSync(p), mime);
const webp = async (p, height) =>
	b64(
		await sharp(p).resize({ height }).webp({ quality: 90, alphaQuality: 100 }).toBuffer(),
		"image/webp",
	);
const icon = (Comp, color) =>
	ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color, size: "100%" }));

(async () => {
	const A = {
		font: file(path.join(REPO, "apps/web/public/fonts/Manrope.ttf"), "font/ttf"),
		logo: file(path.join(REPO, "apps/web/public/sdtrust.svg"), "image/svg+xml"),
		finn: file(path.join(REPO, "docs/design/finn.png"), "image/png"),
		finnWave: file(path.join(OUT, "sprites/finn-waving.webp"), "image/webp"),
		finnProud: file(path.join(OUT, "sprites/finn-proud.webp"), "image/webp"),
		lottePuzzled: await webp(path.join(OUT, "lotte-puzzled-cutout.png"), 900),
		lotteRelieved: await webp(path.join(OUT, "lotte-relieved-cutout.png"), 900),
		lottePuzzledSprite: spriteOr(path.join(OUT, "sprites/lotte-puzzled.webp"), null),
		lotteShrugSprite: spriteOr(path.join(OUT, "sprites/lotte-shrug.webp"), null),
		lotteShrugStill: spriteOr(path.join(OUT, "sprites/lotte-shrug-still.webp"), null),
		lotteRelievedSprite: spriteOr(path.join(OUT, "sprites/lotte-relieved.webp"), null),
		clips: CLIPS.map((clip) => (clip.file ? file(clip.file, "video/mp4") : null)),
		finnIdle: file(path.join(REPO, "apps/web/public/pet/idle.webp"), "image/webp"),
		finnHead: b64(
			await sharp(path.join(REPO, "docs/design/finn.png"))
				.extract({ left: 104, top: 22, width: 168, height: 168 })
				.resize(240)
				.png()
				.toBuffer(),
			"image/png",
		),
		call1: file(path.join(OUT, "finn-call-1.mp3"), "audio/mpeg"),
		call2: file(path.join(OUT, "finn-call-2.mp3"), "audio/mpeg"),
	};
	const I = {
		check: icon(Lu.LuCircleCheck, "#0F7A3A"),
		gauge: icon(Lu.LuGauge, "#EE6558"),
		file: icon(Lu.LuFileText, "#192D46"),
		users: icon(Lu.LuUsers, "#FFFFFF"),
		phone: icon(Lu.LuPhone, "#FFFFFF"),
		saved: icon(Lu.LuDatabase, "#0F7A3A"),
		teams: icon(Lu.LuMessagesSquare, "#FFFFFF"),
		mail: icon(Lu.LuMail, "#FFFFFF"),
		crm: icon(Lu.LuDatabase, "#FFFFFF"),
		doc: icon(Lu.LuFileText, "#FFFFFF"),
		play: icon(Lu.LuPlay, "#FFFFFF"),
		shield: icon(Lu.LuShieldCheck, "#192D46"),
		layers: icon(Lu.LuLayers, "#192D46"),
		calendar: icon(Lu.LuCalendarClock, "#192D46"),
		scale: icon(Lu.LuScale, "#192D46"),
	};
	for (const animated of [false, true]) {
		const name = animated ? "SDtrust-pitch-animated.html" : "SDtrust-pitch.html";
		fs.writeFileSync(path.join(OUT, name), page(A, I, animated));
		console.log("wrote", name);
	}
})();

function page(A, I, animated) {
	const puzzled = (animated && A.lottePuzzledSprite) || A.lottePuzzled;
	const relieved = (animated && A.lotteRelievedSprite) || A.lotteRelieved;
	const shrug = (animated ? A.lotteShrugSprite : A.lotteShrugStill) || A.lottePuzzled;
	const footer = `<div class="footer"><img src="${A.logo}" alt=""><span>SDtrust · Tectonic hackathon finals · SD Worx challenge</span></div>`;
	const slides = [
		{
			cls: "dark",
			notes:
				"It's 21 October. Lotte is a payroll consultant at SD Worx. Her client Atlas calls: can we still submit a payroll change?",
			html: `
			<h1 class="date" style="left:96px;top:110px">21 October</h1>
			<p class="lead" style="left:96px;top:330px;width:820px">Lotte is a payroll consultant at SD Worx.<br>Her client Atlas calls:</p>
			<div class="quote" style="left:96px;top:498px;width:792px;height:168px">“Can we still submit a payroll change?”</div>
			<div class="halo" style="left:1002px;top:120px;width:504px;height:504px"></div>
			<img class="lotte ${animated ? "fade" : ""}" src="${puzzled}" alt="Lotte, puzzled, on the phone holding sticky notes 20, 23 and 25" style="left:1080px;top:90px;height:732px">
			${
				animated
					? `<div class="rings" style="left:1158px;top:262px"><i></i><i></i><i></i></div>
			<div class="qmarks" style="left:1300px;top:60px"><b>?</b><b>?</b><b>?</b></div>`
					: ""
			}`,
		},
		{
			cls: "light",
			notes:
				"The procedure says the 20th. A Teams meeting said the 23rd. Someone in chat says the 25th. None of them is right: the real answer is the 22nd, an exception Roy agreed with Atlas. It was never written down, it only lives in Roy's head. Lotte doesn't lack information, she has too much of it, and nothing tells her which version to trust. If she guesses wrong, real people get the wrong salary. SD Worx asked us to turn scattered knowledge into something people can trust, without anyone writing documentation.",
			html: `
			<h2 class="title">Three answers. None of them is right</h2>
			${[
				["20th", "Procedure Belgium", "General rule", -3],
				["23rd", "Atlas meeting", "A proposal on the board", 2],
				["25th", "Teams chat", "A question, no owner", -2],
			]
				.map(
					([day, where, why, rot], i) =>
						`<div class="sticky ${animated ? "drop" : ""}" style="left:${72 + i * 378}px;top:222px;--r:${rot}deg;--d:${0.15 + i * 0.3}s"><strong>${day}</strong><b>${where}</b><span>${why}</span></div>`,
				)
				.join("")}
			<div class="hidden-answer ${animated ? "reveal" : ""}" style="left:1206px;top:222px"><strong>22nd</strong><b>Roy's agreement</b><span>Only in Roy's head</span></div>
			<p class="body" style="left:72px;top:618px;width:1150px"><b>Lotte doesn't lack information.</b> Nothing tells her which version to trust. Today she searches for 20 minutes and pings three colleagues. If she guesses wrong, real people get the wrong salary.</p>
			<img class="lotte ${animated ? "fade" : ""}" src="${shrug}" alt="Lotte shrugging: which one is it?" style="left:1300px;top:574px;height:300px;--d:1.2s">
			${footer}`,
		},
		{
			cls: "dark",
			notes:
				"That's the problem SD Worx asked us to solve: turn scattered knowledge into something people can trust, without anyone writing documentation. Our answer is SDtrust. It reads what your company already writes in Teams, mail, the CRM and procedures, decides which version to trust, and shows you why.",
			html: `
			<p class="kicker" style="left:96px;top:150px">The solution</p>
			<div class="brand" style="left:96px;top:196px"><img src="${A.logo}" alt=""><span>SDtrust</span></div>
			<p class="lead" style="left:96px;top:350px;width:760px">Knowledge you can trust,<br>without anyone writing it down</p>
			<p class="body-dark" style="left:96px;top:498px;width:700px">SDtrust reads what your company already writes, decides which version to trust, and shows you why.</p>
			<p class="team" style="left:96px;top:700px">Sebastien · Roy · Wanne</p>
			<p class="meta" style="left:96px;top:746px">Tectonic hackathon finals · SD Worx challenge · 20 October 2026</p>
			${[
				[I.teams, "Teams"],
				[I.mail, "Mail"],
				[I.crm, "CRM"],
				[I.doc, "Procedures"],
			]
				.map(
					([svg, label], i) =>
						`<div class="src ${animated ? "rise" : ""}" style="left:900px;top:${216 + i * 108}px;--d:${0.15 + i * 0.15}s"><i>${svg}</i>${label}</div>`,
				)
				.join("")}
			<svg class="flow ${animated ? "draw" : ""}" style="left:1130px;top:216px" width="140" height="408" viewBox="0 0 140 408" fill="none">
				${[36, 144, 252, 360].map((y) => `<path d="M0 ${y} C 80 ${y}, 60 204, 140 204" stroke="#5F6F85" stroke-width="3" stroke-dasharray="6 7"/>`).join("")}
			</svg>
			<div class="answer ${animated ? "rise" : ""}" style="left:1270px;top:276px;--d:1s">
				<span>One answer</span>
				<b>22 October 2026</b>
				<em>Confirmed by Roy</em>
				<small>Account owner, Atlas</small>
			</div>`,
		},
		...CLIPS.map((clip, i) => ({
			cls: "dark",
			notes: A.clips[i]
				? clip.notes
				: `Video ${clip.n}: Sebastien's clip ${clip.n} is not in docs/presentation/video yet. Rebuild the deck once it is pushed.`,
			html: `
			<div class="video" style="left:108px;top:50px;width:1384px;height:779px">
				<video playsinline preload="auto"${A.clips[i] ? ` data-src="${A.clips[i]}"` : ""}></video>
				<div class="placeholder">
					<div class="play">${I.play}</div>
					<b>Video ${clip.n} · coming from Sebastien</b>
					<span>Drop a video file on this slide to preview it</span>
				</div>
			</div>
			<p class="clip-label" style="left:108px;top:846px">Video ${clip.n} · ${clip.title}</p>`,
		})),
		{
			cls: "dark",
			steps: 4,
			notes: [
				"THE CALL. Roy stands up holding his phone as if he picks up.",
				"On entering: the call rings for 1 second, then Finn speaks (audio plays by itself):",
				"  FINN: Hi Roy, it's Finn. You own the Atlas account, so you're the one who knows. Until when can Atlas submit payroll changes this October? I can't find anything approved.",
				"CLICK 1, Roy answers live, loud and clear:",
				"  ROY: Hi Finn! Until the 22nd. I agreed it with Atlas, but I never put it in the CRM.",
				"CLICK 2, Finn answers (audio):",
				"  FINN: Got it. I'll update the CRM myself, and let Lotte know.",
				"CLICK 3, Roy answers live:",
				"  ROY: Thanks, Finn!",
				"CLICK 4, the CRM card appears. PRESENTER: Roy never opened the CRM. Finn wrote the agreement there himself, so the next person who asks gets the 22nd straight away.",
			].join("\n"),
			html: `
			<h2 class="title">Finn calls the one person who knows</h2>
			<div class="call" style="left:72px;top:170px;width:640px;height:345px">
				<div class="call-head"><span class="live-dot"></span><span>Teams call</span><span class="call-status"></span></div>
				<div class="call-people">
					<div class="person finn-p"><div class="avatar"><img src="${A.finnHead}" alt=""></div><div class="bars"><i></i><i></i><i></i><i></i></div><b>Finn</b><span>SDtrust</span></div>
					<div class="link"><i>${I.phone}</i></div>
					<div class="person roy-p"><div class="avatar roy">R</div><div class="bars"><i></i><i></i><i></i><i></i></div><b>Roy</b><span>Account owner, Atlas</span></div>
				</div>
				<div class="why"><b>Why Roy?</b> He is the Atlas account owner in the CRM</div>
			</div>
			<div class="knowledge" data-step="4" style="left:72px;top:545px;width:640px;height:290px">
				<div class="k-head"><i>${I.saved}</i><b>Saved to the CRM by Finn</b></div>
				<span class="k-src">S35 · Teams call with Roy · 21 October 2026</span>
				<p class="k-quote">“Atlas may submit payroll changes until 22&nbsp;October 2026.”</p>
				<div class="chips"><span>Confirmed by the owner</span><span>Belgium · Atlas · October 2026</span></div>
				<div class="trust"><span>Trust</span><s>15%</s><b class="trust-n">94%</b><div class="meter"><div></div></div></div>
			</div>
			<div class="transcript" style="left:760px;top:170px;width:768px">
				<span class="t-label">Live transcript</span>
				<div class="bubble finn-b b1"><b>Finn</b>Hi Roy, it's Finn. You own the Atlas account, so you're the one who knows. Until when can Atlas submit payroll changes this October? I can't find anything approved.</div>
				<div class="bubble roy-b" data-step="1"><b>Roy</b>Hi Finn! Until the 22nd. I agreed it with Atlas, but I never put it in the CRM.</div>
				<div class="bubble finn-b" data-step="2"><b>Finn</b>Got it. I'll update the CRM myself, and let Lotte know.</div>
				<div class="bubble roy-b" data-step="3"><b>Roy</b>Thanks, Finn!</div>
			</div>
			<audio class="a1" preload="auto" src="${A.call1}"></audio>
			<audio class="a2" preload="auto" src="${A.call2}"></audio>`,
		},
		{
			cls: "dark",
			notes:
				"SDtrust: an answer you can trust, or an honest I don't know plus the right colleague. Zero unnecessary effort.",
			html: `
			<img class="lotte" src="${relieved}" alt="Lotte, relieved, thumbs up" style="left:96px;top:156px;height:576px">
			${animated ? `<div class="sparkles" style="left:296px;top:252px"><i></i><i></i><i></i><i></i></div>` : ""}
			<img class="finn-wave" src="${A.finnWave}" alt="Finn waving" style="left:370px;top:323px;height:418px">
			<h2 class="close1" style="left:684px;top:180px">An answer you can trust.</h2>
			<p class="close2" style="left:684px;top:288px">Or an honest “I don't know”,<br>plus the right colleague.</p>
			<p class="close3" style="left:684px;top:516px">Zero unnecessary effort.</p>
			<div class="brand small" style="left:684px;top:654px"><img src="${A.logo}" alt=""><span>SDtrust</span></div>`,
		},
		{
			cls: "dark",
			notes: [
				"Thank the jury and open for questions.",
				"If asked how trust is scored: four factors. Authority: an approved statement from the owner beats a proposal or a chat message. Scope: valid for this country, client and period. Validity: superseded or expired versions lose. Agreement: conflicting sources lower trust, and when trust is too low Finn asks the owner.",
				"If asked whether this is real: the desktop app, the answer and evidence screens and the trust display are built. Sources and the call are simulated with demo data. Connecting Teams, mail and the CRM is the next step.",
			].join("\n"),
			html: `
			<h1 class="thanks" style="left:96px;top:190px">Thank you</h1>
			<p class="close2" style="left:96px;top:350px">Questions? Finn is listening.</p>
			<p class="team" style="left:96px;top:560px">Sebastien · Roy · Wanne</p>
			<p class="meta" style="left:96px;top:606px">Tectonic hackathon finals · SD Worx challenge · 20 October 2026</p>
			<div class="brand small" style="left:96px;top:680px"><img src="${A.logo}" alt=""><span>SDtrust</span></div>
			<img class="finn-proud" src="${A.finnProud}" alt="Finn, arms crossed, proud" style="left:1080px;top:140px;height:640px">`,
		},
	];

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>SDtrust pitch${animated ? " (animated)" : ""}</title>
<style>
@font-face { font-family: Manrope; src: url(${A.font}) format("truetype"); font-weight: 200 800; }
:root { --navy:#192D46; --night:#0F1D31; --ivory:#F8F6F1; --coral:#EE6558; --amber:#F3BA55; --muted:#5F6F85; --border:#E5E1D8; }
* { box-sizing: border-box; margin: 0; }
html, body { height: 100%; background: #000; overflow: hidden; font-family: Manrope, Arial, sans-serif; }
#viewport { position: fixed; inset: 0; overflow: hidden; }
#stage { position: absolute; left: 50%; top: 50%; width: 1600px; height: 900px; transform-origin: center; }
.slide { position: absolute; inset: 0; overflow: hidden; opacity: 0; visibility: hidden; transition: opacity .45s ease, visibility 0s .45s; }
.slide.active { opacity: 1; visibility: visible; transition: opacity .45s ease; }
.slide > * { position: absolute; }
.dark { background: var(--night); color: #fff; }
.light { background: var(--ivory); color: var(--navy); }
.halo { border-radius: 50%; background: var(--navy); }
.finn { height: auto; }
.brand { display: flex; align-items: center; gap: 22px; font-size: 76px; font-weight: 800; letter-spacing: -1px; }
.brand img { width: 108px; height: 108px; }
.brand.small { font-size: 34px; gap: 14px; }
.brand.small img { width: 72px; height: 72px; }
.lead { font-size: 36px; line-height: 1.3; font-weight: 500; }
.team { font-size: 20px; font-weight: 800; color: var(--amber); }
.meta { font-size: 17px; color: var(--ivory); }
.date { font-size: 120px; font-weight: 800; color: var(--coral); letter-spacing: -2px; line-height: 1; }
.quote { background: var(--navy); border-radius: 24px; display: flex; align-items: center; padding: 0 42px; font-size: 38px; font-weight: 800; font-style: italic; line-height: 1.25; }
.lotte, .finn.sprite { width: auto; }
.kicker { font-size: 18px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: var(--amber); }
.body-dark { font-size: 24px; line-height: 1.45; color: #c8d2df; }
.src { width: 230px; height: 72px; border-radius: 18px; background: var(--navy); display: flex; align-items: center; gap: 16px; padding: 0 22px; font-size: 22px; font-weight: 700; }
.src i { width: 30px; height: 30px; display: block; }
.flow { position: absolute; }
.answer { width: 270px; background: #fff; color: var(--navy); border-radius: 22px; padding: 26px 26px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 0 0 4px #ee655855; }
.answer span { font-size: 15px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }
.answer b { font-size: 30px; font-weight: 800; line-height: 1.15; }
.answer em { font-style: normal; align-self: flex-start; font-size: 16px; font-weight: 800; color: #0F7A3A; background: #e7f5ec; padding: 5px 12px; border-radius: 999px; }
.answer small { font-size: 15px; color: var(--muted); }
.title { left: 72px; top: 60px; font-size: 54px; font-weight: 800; letter-spacing: -1px; }
.sub { font-size: 22px; color: var(--muted); }
.body { font-size: 26px; line-height: 1.45; }
.sticky, .hidden-answer { width: 330px; height: 330px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 6px; }
.sticky { background: var(--amber); transform: rotate(var(--r)); box-shadow: 0 10px 24px -8px #192d4655; }
.sticky strong, .hidden-answer strong { font-size: 92px; font-weight: 800; line-height: 1.1; margin-bottom: 14px; }
.sticky b, .hidden-answer b { font-size: 21px; font-weight: 800; }
.sticky span, .hidden-answer span { font-size: 18px; }
.hidden-answer { width: 318px; background: #fff; border: 2px dashed var(--border); border-radius: 18px; }
.hidden-answer strong { color: var(--muted); }
.hidden-answer span { color: var(--muted); }
.card { width: 804px; height: 120px; background: #fff; border: 1px solid var(--border); border-radius: 18px; box-shadow: 0 10px 24px -14px #192d4644; padding: 22px 30px 0 108px; }
.card i { position: absolute; left: 36px; top: 50%; width: 52px; height: 52px; transform: translateY(-50%); }
.card span { display: block; font-size: 17px; color: var(--muted); }
.card b { display: block; font-size: 26px; font-weight: 800; margin-top: 6px; }
.card.coral { background: var(--coral); border: 0; color: #fff; }
.card.coral span { color: #fff; }
.video { background: var(--navy); border: 2px dashed #5f6f85; border-radius: 24px; overflow: hidden; }
.video video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #000; display: none; }
.video.has-video { border: 0; }
.video.has-video video { display: block; }
.video.has-video .placeholder { display: none; }
.placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.placeholder .play { width: 120px; height: 120px; border-radius: 50%; background: var(--coral); display: grid; place-items: center; margin-bottom: 18px; }
.placeholder .play svg { width: 56px; height: 56px; margin-left: 8px; }
.placeholder b { font-size: 30px; font-weight: 800; }
.placeholder span { font-size: 19px; color: var(--ivory); }
.placeholder code { background: #0f1d31; padding: 2px 8px; border-radius: 6px; }
.thanks { font-size: 120px; font-weight: 800; letter-spacing: -2px; line-height: 1; }
.clip-label { font-size: 16px; font-weight: 700; color: #8fa0b5; letter-spacing: 1px; }
.close1 { font-size: 54px; font-weight: 800; letter-spacing: -1px; }
.close2 { font-size: 42px; line-height: 1.3; color: var(--amber); font-weight: 500; }
.close3 { font-size: 28px; font-style: italic; color: var(--ivory); }
.factor { width: 714px; height: 228px; background: #fff; border: 1px solid var(--border); border-radius: 18px; box-shadow: 0 10px 24px -14px #192d4644; padding: 42px 36px 0 186px; }
.factor i { position: absolute; left: 42px; top: 48px; width: 108px; height: 108px; border-radius: 50%; background: var(--ivory); padding: 28px; }
.factor b { display: block; font-size: 30px; font-weight: 800; }
.factor span { display: block; font-size: 21px; color: var(--muted); margin-top: 12px; line-height: 1.4; }
.footer { left: 72px; top: 828px; display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--muted); }
.footer img { width: 38px; height: 38px; }
.dark .pageno { color: var(--muted); }
.pageno { position: absolute; right: 60px; bottom: 30px; font-size: 14px; color: var(--muted); }

/* call slide */
.call { background: var(--navy); border-radius: 24px; padding: 26px 32px; display: flex; flex-direction: column; justify-content: space-between; }
.call-head { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 700; color: var(--ivory); }
.live-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--amber); animation: blink 1s ease-in-out infinite; }
.call.connected .live-dot { background: #3ccf7a; animation: none; }
.call-status { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--amber); }
.call.connected .call-status { color: #3ccf7a; }
@keyframes blink { 50% { opacity: .25; } }
.call-people { display: flex; align-items: flex-start; justify-content: space-between; padding: 0 30px; }
.person { width: 190px; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; }
.person b { font-size: 22px; margin-top: 4px; }
.person span { font-size: 15px; color: #c8d2df; }
.avatar { width: 112px; height: 112px; border-radius: 50%; overflow: hidden; background: #ffffff18; display: grid; place-items: center; position: relative; }
.avatar img { width: 100%; height: 100%; }
.avatar.roy { background: var(--coral); font-size: 54px; font-weight: 800; color: #fff; overflow: visible; }
.call:not(.connected) .avatar.roy { animation: ringing 1.1s ease-out infinite; }
@keyframes ringing { from { box-shadow: 0 0 0 0 #ee6558aa; } to { box-shadow: 0 0 0 26px #ee655800; } }
.link { flex: 1; height: 112px; display: grid; place-items: center; background: linear-gradient(90deg, transparent 0 46%, #5f6f85 46% 54%, transparent 54%) center/14px 3px repeat-x; }
.link i { width: 52px; height: 52px; border-radius: 50%; background: #3ccf7a; padding: 13px; display: block; }
.call:not(.connected) .link i { background: var(--amber); animation: shake .5s ease-in-out infinite; }
@keyframes shake { 25% { transform: rotate(-14deg); } 75% { transform: rotate(14deg); } }
.bars { display: flex; gap: 4px; height: 22px; align-items: flex-end; margin-top: 8px; opacity: 0; transition: opacity .2s; }
.bars i { width: 5px; height: 6px; border-radius: 3px; background: #3ccf7a; }
.speaking .bars { opacity: 1; }
.speaking .bars i { animation: talk .5s ease-in-out infinite alternate; }
.speaking .bars i:nth-child(2) { animation-delay: .15s; } .speaking .bars i:nth-child(3) { animation-delay: .3s; } .speaking .bars i:nth-child(4) { animation-delay: .08s; }
@keyframes talk { to { height: 22px; } }
.why { font-size: 17px; line-height: 1.4; color: var(--ivory); background: #0f1d31; border-radius: 12px; padding: 12px 16px; }
.why b { color: var(--amber); }
.transcript { display: flex; flex-direction: column; gap: 18px; }
.t-label { font-size: 16px; font-weight: 700; color: #8fa0b5; text-transform: uppercase; letter-spacing: 1.5px; }
.bubble { font-size: 21px; line-height: 1.45; padding: 16px 22px; border-radius: 20px; max-width: 700px; }
.bubble b { display: block; font-size: 15px; letter-spacing: .5px; margin-bottom: 4px; }
.finn-b { background: var(--navy); border-top-left-radius: 6px; }
.finn-b b { color: var(--amber); }
.roy-b { background: var(--coral); align-self: flex-end; border-top-right-radius: 6px; }
.roy-b b { color: #fff; }
.b1 { opacity: 0; transform: translateY(16px); transition: opacity .5s, transform .5s; }
.call-on .b1 { opacity: 1; transform: none; }
[data-step] { opacity: 0; transform: translateY(16px); transition: opacity .5s, transform .5s; }
[data-step].on { opacity: 1; transform: none; }
.knowledge { background: #fff; color: var(--navy); border-radius: 24px; padding: 22px 32px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 0 0 4px #3ccf7a55; }
.k-head { display: flex; align-items: center; gap: 12px; font-size: 21px; }
.k-head i { width: 32px; height: 32px; display: block; }
.k-src { font-size: 15px; color: var(--muted); }
.k-quote { font-size: 23px; font-weight: 800; line-height: 1.3; }
.chips { display: flex; gap: 8px; }
.chips span { font-size: 14px; font-weight: 700; padding: 6px 12px; border-radius: 999px; background: #e7f5ec; color: var(--green, #0F7A3A); }
.chips span + span { background: #e9eef3; color: var(--navy); }
.trust { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
.trust > span { font-size: 16px; color: var(--muted); }
.trust s { font-size: 22px; color: var(--muted); }
.trust b { font-size: 40px; font-weight: 800; color: #0F7A3A; font-variant-numeric: tabular-nums; min-width: 96px; }
.meter { flex: 1; height: 12px; border-radius: 6px; background: #eef0f3; overflow: hidden; }
.meter div { height: 100%; width: 15%; background: #0F7A3A; border-radius: 6px; transition: width 1.4s cubic-bezier(.3,.7,.3,1) .3s; }
.knowledge.on .meter div { width: 94%; }

/* chrome */
#hud { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-radius: 999px; background: #0f1d31cc; color: #fff; font: 600 13px Manrope, sans-serif; opacity: 0; transition: opacity .3s; z-index: 10; }
#hud.show { opacity: 1; }
body.idle, body.idle * { cursor: none; }
#hud button { all: unset; cursor: pointer; padding: 2px 8px; border-radius: 6px; }
#hud button:hover { background: #ffffff22; }
#notes { position: fixed; left: 0; right: 0; bottom: 0; max-height: 38vh; overflow: auto; background: #0f1d31f2; color: #fff; padding: 20px 28px 64px; font: 500 18px/1.5 Manrope, sans-serif; white-space: pre-wrap; display: none; z-index: 9; }
body.notes #notes { display: block; }

${animated ? animationCss() : ""}
</style>
</head>
<body${animated ? ' class="animated"' : ""}>
<div id="viewport"><div id="stage">
${slides
	.map(
		(s, i) =>
			`<section class="slide ${s.cls}" data-steps="${s.steps || 0}" data-notes="${escapeAttr(s.notes)}">${s.html}<div class="pageno">${i + 1}${s.backup ? " · backup" : ""}</div></section>`,
	)
	.join("\n")}
</div></div>
<div id="notes"></div>
<div id="hud"><button id="prev" title="Previous (←)">‹</button><span id="count"></span><button id="next" title="Next (→, space, click)">›</button><button id="nbtn" title="Speaker notes (N)">Notes</button><button id="fbtn" title="Fullscreen (F)">Fullscreen</button></div>
<script>
const slides = [...document.querySelectorAll(".slide")];
const stage = document.getElementById("stage");
const notes = document.getElementById("notes");
const videos = [...document.querySelectorAll(".video video")];
let index = 0;
let step = 0;
let callTimers = [];

function fit() {
	const el = document.documentElement;
	const s = Math.min(el.clientWidth / 1600, el.clientHeight / 900);
	stage.style.transform = "translate(-50%, -50%) scale(" + s + ")";
}
function show(i) {
	index = Math.max(0, Math.min(slides.length - 1, i));
	slides.forEach((s, n) => s.classList.toggle("active", n === index));
	// restart CSS animations on the slide we enter
	const active = slides[index];
	active.querySelectorAll("*").forEach((el) => { el.style.animation = "none"; el.offsetWidth; el.style.animation = ""; });
	document.getElementById("count").textContent = (index + 1) + " / " + slides.length;
	notes.textContent = active.dataset.notes;
	history.replaceState(null, "", "#" + (index + 1));
	videos.forEach((v) => {
		if (active.contains(v) && v.closest(".video").classList.contains("has-video")) { v.currentTime = 0; v.play().catch(() => {}); } else { v.pause(); }
	});
	setStep(0, true);
}
function setStep(n, entering) {
	step = n;
	const active = slides[index];
	active.querySelectorAll("[data-step]").forEach((el) => el.classList.toggle("on", Number(el.dataset.step) <= n));
	callStep(active, n, entering);
}
function next() { Number(slides[index].dataset.steps) > step ? setStep(step + 1) : show(index + 1); }
function prev() { step > 0 ? setStep(step - 1) : show(index - 1); }

// The call: ring, connect, Finn speaks; Roy answers live; Finn confirms; knowledge is saved
function stopCall() {
	callTimers.forEach(clearTimeout); callTimers.forEach(clearInterval); callTimers = [];
	document.querySelectorAll(".slide audio").forEach((a) => { a.pause(); a.currentTime = 0; });
	document.querySelectorAll(".speaking").forEach((el) => el.classList.remove("speaking"));
}
function say(active, audio, who) {
	const person = active.querySelector(who);
	person.classList.add("speaking");
	audio.currentTime = 0;
	audio.onended = () => person.classList.remove("speaking");
	audio.play().catch(() => person.classList.remove("speaking"));
}
function callStep(active, n, entering) {
	const call = active.querySelector(".call");
	if (entering || !call) stopCall();
	if (!call) return;
	const status = call.querySelector(".call-status");
	const [a1, a2] = active.querySelectorAll("audio");
	if (entering) {
		call.classList.remove("connected"); active.classList.remove("call-on");
		status.textContent = "Calling Roy…";
		callTimers.push(setTimeout(() => {
			call.classList.add("connected"); active.classList.add("call-on");
			const start = Date.now();
			const tick = () => { const s = Math.floor((Date.now() - start) / 1000); status.textContent = "Connected · " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
			tick(); callTimers.push(setInterval(tick, 1000));
			say(active, a1, ".finn-p");
		}, 1000));
		return;
	}
	active.querySelectorAll(".speaking").forEach((el) => el.classList.remove("speaking"));
	a1.pause(); a2.pause();
	if (n === 1 || n === 3) active.querySelector(".roy-p").classList.add("speaking");
	if (n === 2) say(active, a2, ".finn-p");
	if (n === 4) {
		const out = active.querySelector(".trust-n");
		let v = 15; out.textContent = "15%";
		const t = setInterval(() => { v = Math.min(94, v + 3); out.textContent = v + "%"; if (v === 94) clearInterval(t); }, 45);
		callTimers.push(t);
	}
}
function fullscreen() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }

addEventListener("resize", fit);
if (window.visualViewport) visualViewport.addEventListener("resize", fit);
addEventListener("orientationchange", () => setTimeout(fit, 200));
addEventListener("keydown", (e) => {
	if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
	else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); prev(); }
	else if (e.key === "Home") show(0);
	else if (e.key === "End") show(slides.length - 1);
	else if (e.key.toLowerCase() === "f") fullscreen();
	else if (e.key.toLowerCase() === "n") document.body.classList.toggle("notes");
});
document.getElementById("viewport").addEventListener("click", (e) => {
	e.clientX < innerWidth * 0.25 ? prev() : next();
});
document.getElementById("prev").onclick = (e) => { e.stopPropagation(); prev(); };
document.getElementById("next").onclick = (e) => { e.stopPropagation(); next(); };
document.getElementById("nbtn").onclick = () => document.body.classList.toggle("notes");
document.getElementById("fbtn").onclick = fullscreen;

// Video: demo.mp4 next to this file, or drag a file onto the page
function useVideo(v, src) { v.src = src; v.onloadeddata = () => { v.closest(".video").classList.add("has-video"); if (slides[index].contains(v)) { v.currentTime = 0; v.play().catch(() => {}); } }; }
videos.forEach((v) => v.dataset.src && useVideo(v, v.dataset.src));
addEventListener("dragover", (e) => e.preventDefault());
addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; const v = slides[index].querySelector(".video video"); if (v && f && f.type.startsWith("video")) useVideo(v, URL.createObjectURL(f)); });

let hideTimer;
addEventListener("mousemove", () => {
	document.getElementById("hud").classList.add("show");
	document.body.classList.remove("idle");
	clearTimeout(hideTimer);
	hideTimer = setTimeout(() => { document.getElementById("hud").classList.remove("show"); document.body.classList.add("idle"); }, 2000);
});
addEventListener("hashchange", () => { const n = (parseInt(location.hash.slice(1), 10) || 1) - 1; if (n !== index) show(n); });

fit();
show((parseInt(location.hash.slice(1), 10) || 1) - 1);
</script>
</body>
</html>`;
}

function animationCss() {
	return `
/* --- Animated version: Lotte and Finn are sprite animations; only effects move --- */
@media (prefers-reduced-motion: no-preference) {
.active .fade { animation: fade .8s ease-out var(--d, .1s) both; }
@keyframes fade { from { opacity: 0; } }
.rings { width: 0; height: 0; }
.rings i { position: absolute; left: -36px; top: -36px; width: 72px; height: 72px; border: 4px solid var(--amber); border-radius: 50%; opacity: 0; }
.active .rings i { animation: ring 1.4s ease-out .6s 3; }
.active .rings i:nth-child(2) { animation-delay: .85s; }
.active .rings i:nth-child(3) { animation-delay: 1.1s; }
@keyframes ring { from { transform: scale(.4); opacity: .9; } to { transform: scale(2.4); opacity: 0; } }
.qmarks b { position: absolute; font-size: 54px; font-weight: 800; color: var(--amber); opacity: 0; }
.qmarks b:nth-child(2) { left: 52px; top: 30px; font-size: 40px; color: var(--coral); }
.qmarks b:nth-child(3) { left: -38px; top: 44px; font-size: 34px; }
.active .qmarks b { animation: q 3.6s ease-in-out 1.6s infinite; }
.active .qmarks b:nth-child(2) { animation-delay: 2.2s; }
.active .qmarks b:nth-child(3) { animation-delay: 2.8s; }
@keyframes q { 0% { transform: translateY(20px) scale(.6); opacity: 0; } 20% { opacity: 1; transform: translateY(0) scale(1); } 70% { opacity: 1; } 100% { transform: translateY(-40px) rotate(12deg); opacity: 0; } }

/* Problem: sticky notes drop, then the real answer is revealed */
.active .sticky.drop { animation: drop .7s cubic-bezier(.3,1.5,.6,1) var(--d) both; }
@keyframes drop { from { transform: translateY(-640px) rotate(calc(var(--r) * -6)); } to { transform: rotate(var(--r)); } }
.active .hidden-answer.reveal { animation: reveal .8s ease-out 1.6s both, pulse 2.4s ease-in-out 2.6s infinite; }
@keyframes reveal { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: none; } }
@keyframes pulse { 50% { border-color: var(--coral); box-shadow: 0 0 0 8px #ee655822; } }

/* Solution and Finn: things rise in, the flow lines draw */
.active .rise { animation: rise .6s ease-out var(--d) both; }
@keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
.active .flow.draw path { stroke-dashoffset: 400; animation: flow 1.6s linear .7s both, flowLoop 1.2s linear 2.3s infinite; }
@keyframes flow { from { opacity: 0; } to { opacity: 1; } }
@keyframes flowLoop { from { stroke-dashoffset: 26; } to { stroke-dashoffset: 0; } }

/* Close: sparkles near the thumbs up */
.sparkles i { position: absolute; width: 18px; height: 18px; background: var(--amber); clip-path: polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%); opacity: 0; }
.sparkles i:nth-child(2) { left: 44px; top: -30px; background: var(--coral); width: 14px; height: 14px; }
.sparkles i:nth-child(3) { left: 78px; top: 14px; width: 22px; height: 22px; }
.sparkles i:nth-child(4) { left: 20px; top: 48px; background: #fff; width: 12px; height: 12px; }
.active .sparkles i { animation: sparkle 2.6s ease-out .8s infinite; }
.active .sparkles i:nth-child(2) { animation-delay: .95s; }
.active .sparkles i:nth-child(3) { animation-delay: 1.1s; }
.active .sparkles i:nth-child(4) { animation-delay: 1.25s; }
@keyframes sparkle { 0% { transform: scale(0) rotate(0); opacity: 0; } 15% { transform: scale(1.2) rotate(45deg); opacity: 1; } 40% { transform: scale(.6) rotate(90deg); opacity: 0; } 100% { opacity: 0; } }
}`;
}

function escapeAttr(s) {
	return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
