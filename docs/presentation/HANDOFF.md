# Presentation handoff

The first editable draft is ready for content review. Main file: SDtrust_Finals_Draft_v1.pptx. Also included: PDF, English speaking notes, eight PNG slide previews and preview.html.

The eight slides have been visually inspected after native export. Microsoft PowerPoint reopened the final embedded font version. Native bounds show zero text overflow. The PDF font data matches the original Manrope glyph outlines and widths. validation.json records the package checks and SHA256 hashes.

The pitch budget is 170 seconds, including 45 seconds for the demo. The actual delivery still needs rehearsal. The guide’s explicit ceiling is three minutes, with five minutes for questions.

The one intentional visual placeholder is on slide 4. Replace it with the final verified app capture. Slides 5 and 6 already give an editable fallback for the Atlas walkthrough. There are no screenshots of old runtimes presented as current. No video is embedded.

Only adjust the scripted demo boundary after the application coordinator verifies different behaviour. The current pitch says that the records are synthetic and that colleague contact is simulated. Real connector search, colleague replies and new voice functions are not presented as complete.

All new persistent source files are inside docs/presentation. Isolated authoring dependencies and intermediate files are inside .local/presentation. The presentation session did not stage, pull, commit or push, and did not operate, build, start or stop the app. Other sessions’ app changes remain theirs.

Commit and push coordination is handed to the central project thread. Include only the presentation folder from this session, and review the shared working tree before staging. The isolated temporary folder is not part of the intended commit.
