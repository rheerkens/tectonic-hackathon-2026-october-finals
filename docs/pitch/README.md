# SDtrust pitch

The finals pitch for the SD Worx challenge: Lotte's problem, SDtrust as the solution, Finn, the demo video and Finn calling Roy.

| File | What it is |
|---|---|
| [SDtrust-pitch.pptx](SDtrust-pitch.pptx) | PowerPoint with animations: Lotte and Finn as animated GIFs, Finn's voice on the call slide, click builds. Review it in slideshow mode. |
| [SDtrust-pitch-animated.html](SDtrust-pitch-animated.html) | Browser version with Lotte's sprite animations. One self-contained file, works offline. |
| [SDtrust-pitch.html](SDtrust-pitch.html) | Browser version without character animation. |
| [SDtrust-pitch.pdf](SDtrust-pitch.pdf) | Static backup of the PowerPoint. |

Browser decks: click, arrow keys or space to advance, `F` for fullscreen, `N` for speaker notes. Put `demo.mp4` next to the HTML file, or drop a video on the page, to fill the video slide. In the PowerPoint, insert the video on slide 5.

Speaker notes in every format hold the full script, including Roy's live lines on the call slide.

## Assets

- `lotte-*.png`: Lotte, generated with the Codex CLI image tool in Finn's style. `*-cutout.png` has the background removed.
- `sprites/lotte-*.webp`: Lotte's idle animations (puzzled, shrug, relieved), built from Codex-generated frames with the lower body locked to the base frame so nothing jitters. `*-sheet.jpg` shows the frames.
- `finn-call-*.mp3`: Finn's two call lines (Microsoft neural voice "Brian" via `edge-tts`, pitched up slightly).

## Rebuilding

The scripts in `build/` produced these files. They contain absolute paths from the machine they ran on; adjust them before running.

- `cutout.py` removes the white background from a generated image.
- `sprites.py` turns frame folders into looping animated WebP sprites.
- `gifs.py` renders the sprites as GIFs on each slide's background, for PowerPoint.
- `html.js` builds both HTML decks (`node`, needs `sharp`, `react`, `react-icons`).
- `pptx.js` builds the PowerPoint and writes the click animations and audio into the slide XML (`node`, needs `pptxgenjs`, `jszip`, `sharp`).
