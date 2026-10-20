# Finn voice input

The waveform button in Finn's compact chat records one clip (max 60 s) and puts the transcript in the draft. It never sends. Transcription runs locally with [whisper.cpp](https://github.com/ggml-org/whisper.cpp) through the Electron shell (`apps/desktop/speech.cjs`); no account, cloud key or network call. In a plain browser the button is hidden.

## Setup (Windows x64, unpacked desktop app)

Nothing here is committed; `.local/` is ignored.

1. Download the official release [whisper-bin-x64.zip v1.9.2](https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip) (SHA256 `49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a`). Put `whisper-cli.exe` and its DLLs from `Release/` in `.local/finn-voice/bin/`.
2. Download the multilingual base model [ggml-base.bin](https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.bin) (147951465 bytes, SHA256 `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe`) to `.local/finn-voice/ggml-base.bin`.

Paths are relative to the repo root. Override them with `FINN_WHISPER_BIN` and `FINN_WHISPER_MODEL`. The shell runs `whisper-cli -m <model> -f <clip.wav> -l auto -nt -otxt -of <out>` without a shell, one job at a time, with a 90 s timeout, in a fresh temp folder that is deleted afterwards. Audio and transcripts are not logged.

The packaged portable build does not bundle the engine or model; set the two environment variables to use voice there.

Windows must allow desktop apps to use the microphone (Settings › Privacy & security › Microphone). Electron grants only audio capture, only to the app's own pages.
