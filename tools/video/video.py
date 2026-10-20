#!/usr/bin/env python3
"""Story-driven narration, real browser capture, editing, and offline packaging.
run/probe/encoding/validation adapted from Tectonic render-demo.py at 6433fda.
"""
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / '.local/narration-cache'
VOICE_REV = 'bae641d'
VOICE_NAME = 'en_US-ljspeech-medium'
VOICE_URL = f'https://huggingface.co/rhasspy/piper-voices/resolve/{VOICE_REV}/en/en_US/ljspeech/medium/{VOICE_NAME}'
VOICE_SHA = '6f52a751e2349abe7a76735eb09dc1875298c77ea2342ffd2fef79ff81b87f22'

def voice_id(value):
    if not re.fullmatch(r'[A-Za-z0-9]{1,64}', value): raise ValueError('Invalid ElevenLabs voice ID')
    return value

def fetch_host(url, redirects=False):
    if any(ord(char) <= 32 or ord(char) == 127 for char in url): raise ValueError('Invalid download URL')
    parsed = urllib.parse.urlsplit(url)
    host = parsed.hostname
    allowed = host in {'api.elevenlabs.io', 'huggingface.co'}
    if redirects and host:
        allowed = allowed or host.endswith('.hf.co') or host == 'cdn-lfs.huggingface.co'
    if parsed.scheme != 'https' or not allowed or parsed.port not in (None, 443) or parsed.username is not None or parsed.password is not None:
        raise ValueError('Download requires HTTPS on an allowed host')
    return host

class DownloadRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        host = fetch_host(newurl, redirects=True)
        if (fetch_host(req.full_url, redirects=True) == 'api.elevenlabs.io') != (host == 'api.elevenlabs.io'):
            raise ValueError('Download redirect cannot cross service hosts')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(request, limit):
    fetch_host(request.full_url if isinstance(request, urllib.request.Request) else request)
    with urllib.request.build_opener(DownloadRedirect()).open(request, timeout=60) as response:
        data = response.read(limit + 1)
    if len(data) > limit: raise RuntimeError('Download response is too large')
    return data

def inside(path, *folders):
    path = Path(path).resolve()
    if not any(path != folder.resolve() and path.is_relative_to(folder.resolve()) for folder in folders):
        raise ValueError('Path escapes allowed directories')
    return path

def profile_name(value):
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,31}', value): raise ValueError('Invalid profile')
    return value

def scene_id(value):
    # Scene IDs become file names in the output folder: ASCII slugs only, never paths.
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', value): raise ValueError('Use simple scene IDs')
    return value

def capture_scene(scene, output):
    scene_id(scene['id'])
    return {**scene, 'video': str(inside(scene['video'], output)), 'audio': str(inside(scene['audio'], output, CACHE))}

def run(command):
    child_env = {key: value for key, value in os.environ.items() if key not in {"ELEVENLABS_API_KEY", "CLERK_SECRET_KEY", "OPENAI_API_KEY"}}
    subprocess.run([str(item) for item in command], check=True, env=child_env, shell=False)

def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)], shell=False))

def encoding():
    return ['-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '16',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart']

def validate_video(path, audio=True):
    info = probe(path)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    if (video['width'], video['height']) != (1280, 800):
        raise ValueError('Expected 1280 x 800 output')
    if audio and not any(s['codec_type'] == 'audio' for s in info['streams']):
        raise ValueError('Narrated output is missing audio')
    if video['pix_fmt'] != 'yuv420p' or video['r_frame_rate'] != '30/1':
        raise ValueError('Incorrect video encoding')
    run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'null', '-'])
    return float(info['format']['duration'])

def load_env():
    file = ROOT / '.env.local'
    if file.exists():
        for line in file.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"\''))

def python_engine():
    candidate = ROOT / '.local/video-venv/bin/python'
    return str(candidate) if candidate.exists() else sys.executable

def local_model():
    configured = os.environ.get('PIPER_MODEL')
    return Path(configured).expanduser().resolve() if configured else ROOT / '.local/tts' / (VOICE_NAME + '.onnx')

def select_backend(mode):
    return ('elevenlabs' if os.environ.get('ELEVENLABS_API_KEY') else 'local') if mode == 'auto' else mode

def local_speech(text, output):
    model = local_model()
    if model.exists():
        run([python_engine(), '-m', 'piper', '-m', model, '-f', output, '--', text])
        return 'piper'
    if platform.system() == 'Darwin' and shutil.which('say'):
        raw = output.with_suffix('.aiff')
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', suffix='.txt') as source:
            source.write(text); source.flush()
            run(['say', '-o', raw, '-f', source.name])
        run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-ar', '24000', '-ac', '1', output])
        raw.unlink()
        return 'macos-say'
    raise RuntimeError('Local speech is not prepared. Run bun run video:install-local or configure PIPER_MODEL. On macOS the built-in say command is also supported.')

def elevenlabs_speech(text, output):
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        raise RuntimeError('ElevenLabs mode requires ELEVENLABS_API_KEY. Choose local or auto instead.')
    voice = voice_id(os.environ.get('ELEVENLABS_VOICE_ID') or 'JBFqnCBsd6RMkjVDRZzb')
    data = json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2'}).encode()
    request = urllib.request.Request(
        'https://api.elevenlabs.io/v1/text-to-speech/' + voice,
        data=data, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    # The user's selected cloud mode sends narration and uses account credits.
    audio = fetch(request, 20_000_000)
    raw = output.with_suffix('.mp3'); raw.write_bytes(audio)
    run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-ar', '24000', '-ac', '1', output])
    raw.unlink()


def narration(scene, mode):
    backend = select_backend(mode)
    model = local_model()
    identity = {'text': scene['narration'], 'backend': backend,
                'voice': os.environ.get('ELEVENLABS_VOICE_ID') or 'default',
                'local_model_sha256': hashlib.sha256(model.read_bytes()).hexdigest() if model.exists() else None,
                'engine': 'piper-tts-1.8.0', 'platform': platform.platform(),
                'settings': 'mono-24000-v1'}
    digest = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    CACHE.mkdir(parents=True, exist_ok=True)
    audio = CACHE / (digest + '.wav')
    if not audio.exists():
        if backend == 'local': local_speech(scene['narration'], audio)
        else: elevenlabs_speech(scene['narration'], audio)
    seconds = float(probe(audio)['format']['duration'])
    if seconds <= 0: raise ValueError('Narration is empty')
    return audio, seconds, backend

def install_local():
    venv = ROOT / '.local/video-venv'
    run([sys.executable, '-m', 'venv', venv])
    run([venv / 'bin/python', '-m', 'pip', 'install', 'piper-tts==1.8.0'])
    folder = ROOT / '.local/tts'; folder.mkdir(parents=True, exist_ok=True)
    model = folder / (VOICE_NAME + '.onnx')
    for suffix in ['.onnx', '.onnx.json']:
        target = folder / (VOICE_NAME + suffix)
        if not target.exists():
            target.write_bytes(fetch(VOICE_URL + suffix, 100_000_000 if suffix == '.onnx' else 1_000_000))
    if hashlib.sha256(model.read_bytes()).hexdigest() != VOICE_SHA:
        model.unlink()
        raise ValueError('Piper voice model hash mismatch')
    config = folder / (VOICE_NAME + '.onnx.json')
    provenance = {'engine': 'piper-tts==1.8.0', 'voice_revision': VOICE_REV,
                  'model_sha256': VOICE_SHA, 'config_sha256': hashlib.sha256(config.read_bytes()).hexdigest(),
                  'engine_license': 'GPL-3.0-or-later', 'model_card': VOICE_URL.rsplit('/', 1)[0] + '/MODEL_CARD'}
    (folder / 'provenance.json').write_text(json.dumps(provenance, indent=2))
    print('Prepared optional local narration outside app dependencies. Run bun run video:sample.')

def runtime_url(profile):
    # Reject a symlinked .local, profile or runtime file, matching the launcher's profile policy.
    file = ROOT.resolve() / '.local' / profile_name(profile) / 'runtime.json'
    if file.resolve() != file: raise ValueError('Runtime state must not be a symlink')
    data = json.loads(file.read_text())
    if data['status'] != 'ready': raise RuntimeError('Start the selected profile with bun dev first.')
    return data['urls']['web']

def timestamp(seconds):
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000); minutes, millis = divmod(millis, 60_000); sec, millis = divmod(millis, 1000)
    return f'{hours:02}:{minutes:02}:{sec:02}.{millis:03}'

def chapter_card(output, name, title, subtitle, duration=2):
    font = ROOT / 'apps/web/public/fonts/Manrope.ttf'
    name = scene_id(name)
    title_file = inside(output / (name + '-title.txt'), output); title_file.write_text(title)
    subtitle_file = inside(output / (name + '-subtitle.txt'), output); subtitle_file.write_text(subtitle)
    def filter_path(path):
        return str(path).replace('\\', '\\\\').replace(':', '\\:').replace("'", "\\'")
    draw = (f"drawtext=fontfile='{filter_path(font)}':textfile='{filter_path(title_file)}':fontsize=55:fontcolor=0x26352d:x=80:y=300,"
            f"drawtext=fontfile='{filter_path(font)}':textfile='{filter_path(subtitle_file)}':fontsize=23:fontcolor=0x64726a:x=80:y=390,"
            "fade=t=in:st=0:d=0.2")
    result = output / (name + '-card.mp4')
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0xf7f7f2:s=1280x800:r=30',
         '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-vf', draw, '-t', str(duration),
         *encoding(), '-c:a', 'aac', '-b:a', '128k', result])
    return result

def make(args):
    story = json.loads(args.story.read_text())
    scenes = story['scenes']
    if not scenes or len({s['id'] for s in scenes}) != len(scenes): raise ValueError('Scene IDs must be unique')
    for scene in scenes:
        scene_id(scene['id'])
    output = args.output.resolve(); output.mkdir(parents=True, exist_ok=True)
    prepared = []
    for scene in scenes:
        audio, duration, backend = narration(scene, args.narration)
        prepared.append({**scene, 'audio': str(audio), 'audioDuration': duration, 'backend': backend})
    plan = output / 'plan.json'
    plan.write_text(json.dumps({'url': args.url or runtime_url(args.profile), 'output': str(output), 'scenes': prepared}, indent=2))
    if args.reuse_capture:
        previous = json.loads((output / 'capture.json').read_text())['scenes']
        keys = ['id', 'narration', 'caption', 'actions', 'audio', 'audioDuration']
        if len(previous) != len(prepared) or any(any(old.get(key) != new.get(key) for key in keys) for old, new in zip(previous, prepared)):
            raise ValueError('Story/voice changed; capture again without --reuse-capture')
    else:
        run(['node', ROOT / 'tools/e2e/capture.mjs', plan])
    captured = [capture_scene(scene, output) for scene in json.loads((output / 'capture.json').read_text())['scenes']]
    cuts = []; chapters = []; vtt = ['WEBVTT', '']; transcript = []; cursor = 0
    for index, scene in enumerate(captured):
        card = chapter_card(output, scene['id'], scene['chapter'], scene['caption'])
        if index == 0:
            opening = output / 'opening.mp4'
            run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-i', output / (scene['id'] + '-before.png'),
                 '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '2', '-r', '30', *encoding(), '-c:a', 'aac', '-b:a', '128k', opening])
            cuts.append(opening)
        else:
            cuts.append(card)
        chapters.append({'title': scene['chapter'], 'start': cursor})
        cursor += 2
        cut = output / (scene['id'] + '.mp4')
        video_duration = float(probe(scene['video'])['format']['duration']) - scene['readyOffset']
        # Speech starts after initial browser navigation; action waits for its measured duration.
        lead = .3
        run(['ffmpeg', '-v', 'error', '-y', '-ss', str(scene['readyOffset']), '-i', scene['video'], '-i', scene['audio'],
             '-filter_complex', f'[0:v]fps=30,setsar=1,fade=t=in:st=0:d=0.2,fade=t=out:st={max(0, video_duration-.2)}:d=0.2[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,adelay=300|300,apad[a]',
             '-map', '[v]', '-map', '[a]', '-t', str(video_duration), *encoding(), '-c:a', 'aac', '-b:a', '128k', cut])
        validate_video(cut)
        cuts.append(cut)
        vtt.extend([f'{timestamp(cursor+lead)} --> {timestamp(cursor+lead+scene["audioDuration"])}', scene['narration'], ''])
        transcript.append(scene['chapter'] + '\n' + scene['narration'])
        cursor += video_duration
    cuts.append(chapter_card(output, 'closing', 'Ready to build on.', 'A complete working journey. Room for your idea.', 3))
    cursor += 3
    concat = output / 'concat.txt'; concat.write_text(''.join("file '" + str(path).replace("'", "'\\''") + "'\n" for path in cuts))
    final = output / 'presentation.mp4'
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', '-movflags', '+faststart', final])
    duration = validate_video(final)
    (output / 'captions.vtt').write_text('\n'.join(vtt))
    (output / 'transcript.txt').write_text('\n\n'.join(transcript))
    (output / 'story.json').write_text(json.dumps(story, indent=2))
    # Self-contained offline player. No keys, external assets, or speech engines.
    import base64
    video_data = base64.b64encode(final.read_bytes()).decode()
    captions_data = base64.b64encode((output / 'captions.vtt').read_bytes()).decode()
    buttons = ''.join(f'<button onclick="jump({chapter["start"]})">{html.escape(chapter["title"])}</button>' for chapter in chapters)
    player = f'''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(story['title'])}</title><style>body{{font:16px system-ui;margin:30px;background:#f7f7f2;color:#26352d}}video{{width:100%;max-width:1200px}}button{{padding:10px;margin:5px;border:1px solid #cdd6c8;background:#eef1e5;border-radius:6px;cursor:pointer}}</style><h1>{html.escape(story['title'])}</h1><video id="film" controls><source src="data:video/mp4;base64,{video_data}"><track default kind="captions" src="data:text/vtt;base64,{captions_data}" srclang="en" label="English"></video><nav>{buttons}</nav><p><a download="presentation.mp4" href="data:video/mp4;base64,{video_data}">Download MP4</a></p><script>function jump(t){{const v=document.querySelector('video');v.currentTime=t;v.play();}}</script>'''
    (output / 'index.html').write_text(player)
    (output / 'validation.json').write_text(json.dumps({'duration': duration, 'audio': True, 'decode': 'passed', 'chapters': chapters, 'narration': select_backend(args.narration)}, indent=2))
    print(f'Validated narrated presentation: {final}')

def main():
    load_env()
    parser = argparse.ArgumentParser(); parser.add_argument('command', choices=['doctor', 'install-local', 'sample', 'make'])
    parser.add_argument('--narration', choices=['auto', 'local', 'elevenlabs'], default=os.environ.get('NARRATION_MODE') or 'auto')
    parser.add_argument('--story', type=Path, default=ROOT / 'docs/demo/story.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'artifacts/video')
    parser.add_argument('--profile', default='dev'); parser.add_argument('--url')
    parser.add_argument('--reuse-capture', action='store_true', help='Re-edit an unchanged captured story/voice without repeating app actions')
    args = parser.parse_args()
    if args.command == 'doctor':
        print(json.dumps({'ffmpeg': bool(shutil.which('ffmpeg')), 'ffprobe': bool(shutil.which('ffprobe')), 'node': bool(shutil.which('node')), 'backend': select_backend(args.narration), 'piper_model': local_model().exists(), 'macos_say': platform.system() == 'Darwin' and bool(shutil.which('say')), 'python': python_engine()}, indent=2))
    elif args.command == 'install-local': install_local()
    elif args.command == 'sample':
        story = json.loads(args.story.read_text()); audio, duration, backend = narration(story['scenes'][0], args.narration)
        args.output.mkdir(parents=True, exist_ok=True); shutil.copyfile(audio, args.output / 'voice-sample.wav')
        print(f'Voice sample: {args.output / "voice-sample.wav"}, {duration:.1f}s, {backend}')
    else: make(args)

if __name__ == '__main__':
    try: main()
    except Exception as error:
        print(f'Video failed: {error}', file=sys.stderr); sys.exit(1)
