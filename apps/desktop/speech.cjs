// Finn's voice input: transcribes one short WAV clip with a local whisper.cpp CLI.
// Audio and transcripts stay on this machine and are never logged. See docs/finn-voice.md.
const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const RATE = 16000;
const MAX_SECONDS = 61;
const MAX_BYTES = 44 + RATE * 2 * MAX_SECONDS;
const TIMEOUT_MS = 90_000;

// ponytail: one transcription at a time; a busy engine rejects instead of queueing.
let job = null;

function engine(root) {
	const exe = process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
	return {
		bin: process.env.FINN_WHISPER_BIN || join(root, ".local/finn-voice/bin", exe),
		model: process.env.FINN_WHISPER_MODEL || join(root, ".local/finn-voice/ggml-base.bin"),
	};
}

// Accepts only the canonical 16 kHz mono 16-bit PCM WAV the renderer produces.
function checkWav(bytes) {
	if (!(bytes instanceof Uint8Array) || bytes.byteLength <= 44 || bytes.byteLength > MAX_BYTES)
		throw new Error("The recording is empty or longer than a minute.");
	const wav = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const ok =
		wav.toString("ascii", 0, 4) === "RIFF" &&
		wav.toString("ascii", 8, 16) === "WAVEfmt " &&
		wav.readUInt32LE(16) === 16 &&
		wav.readUInt16LE(20) === 1 &&
		wav.readUInt16LE(22) === 1 &&
		wav.readUInt32LE(24) === RATE &&
		wav.readUInt16LE(34) === 16 &&
		wav.toString("ascii", 36, 40) === "data" &&
		wav.readUInt32LE(40) === wav.byteLength - 44;
	if (!ok) throw new Error("Finn could not read this recording.");
	return wav;
}

async function transcribe(root, bytes, owner) {
	const wav = checkWav(bytes);
	if (job) throw new Error("Finn is still transcribing. Try again in a moment.");
	const { bin, model } = engine(root);
	if (!existsSync(bin) || !existsSync(model))
		throw new Error("Voice input needs the local Whisper engine. See docs/finn-voice.md.");
	const current = { owner, child: null, cancelled: false };
	job = current;
	let dir;
	try {
		dir = await mkdtemp(join(tmpdir(), "finn-voice-"));
		const input = join(dir, "clip.wav");
		const output = join(dir, "out");
		await writeFile(input, wav);
		if (current.cancelled) throw new Error("Voice input was cancelled.");
		await new Promise((done, fail) => {
			const child = spawn(
				bin,
				["-m", model, "-f", input, "-l", "auto", "-nt", "-otxt", "-of", output],
				{ stdio: "ignore", windowsHide: true },
			);
			current.child = child;
			const timer = setTimeout(() => {
				current.timedOut = true;
				child.kill();
			}, TIMEOUT_MS);
			child.on("error", () => {
				clearTimeout(timer);
				fail(new Error("Could not start the local Whisper engine."));
			});
			child.on("exit", (code) => {
				clearTimeout(timer);
				if (current.cancelled) fail(new Error("Voice input was cancelled."));
				else if (current.timedOut)
					fail(new Error("Transcribing took too long. Try a shorter clip."));
				else if (code !== 0) fail(new Error("The local Whisper engine could not transcribe this."));
				else done();
			});
		});
		const text = await readFile(`${output}.txt`, "utf8").catch(() => {
			throw new Error("The local Whisper engine returned no text.");
		});
		// Drop whisper's non-speech markers such as [BLANK_AUDIO].
		return text
			.replace(/\[[A-Z_ ]+\]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
			.slice(0, 4000);
	} finally {
		if (job === current) job = null;
		if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
	}
}

// Only the window that started the job can stop it.
function cancel(owner) {
	if (!job || job.owner !== owner) return;
	job.cancelled = true;
	job.child?.kill();
}

module.exports = { transcribe, cancel };
