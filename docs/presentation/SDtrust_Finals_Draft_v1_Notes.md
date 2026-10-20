# SDtrust Finals Draft v1

Eight slides. Planned duration 170 seconds including a 45 second demo, with ten seconds of margin below the guide’s three minute ceiling. Five minutes of jury questions are separate.

The main stage agenda lists a ten minute finalist slot but does not establish a separate speaking allowance. This draft follows the explicit three minute pitch rule on pages 4 and 6. Expand only after organiser confirmation.

English copy follows British spelling. Text, source panels and diagrams are editable. Finn is approved raster artwork. The logo is the official SVG. The demo frame is deliberately a placeholder, not a screenshot.

## Slide outline and first speaking script

### 1. The answer and the right next step · 15 seconds

An HR question should not become a hunt through Teams, emails and client records. Meet Finn, the SDtrust desktop companion for an answer you can check, or a clear next step.

Presenter cues: Open calmly. Introduce the team without adding a separate team slide.

Evidence boundary: Product proposition. The approved Finn artwork and desktop surfaces exist. No live app was operated to create this presentation.

Sources: README.md: product intent and product surfaces; Finals Guide, page 10: fragmented knowledge and calm technology; docs/design/finn.png

### 2. Fragmented knowledge · 20 seconds

In our synthetic Atlas case, a procedure says the twentieth. A client agreement says the twenty second. Teams mentions the twenty third and twenty fifth. Which source actually applies to this client, country and month?

Presenter cues: These are October 2026 fixture dates, not competing real SD Worx policies. Do not call every source an approved rule.

Evidence boundary: Scripted fixture content. No measured claim about how much time employees currently spend searching.

Sources: apps/web/src/state/finn-scenarios.ts: loonmutatieSources, S1, S4, S10, S3; Finals Guide, page 10: knowledge loses context

### 3. Meet Finn · 15 seconds

Finn keeps the interaction small. Ask, see the answer, and open the evidence when needed. If evidence is missing, the experience changes from answering to finding the person who can help.

Presenter cues: The question matcher supports the prepared demo questions. Do not suggest arbitrary question coverage. Owner lookup and contact are fixture data.

Evidence boundary: Prototype source inspected: desktop UI and fixture playback. Full natural language understanding and live search are not demonstrated by this flow.

Sources: apps/web/src/state/finn.ts: match, playFixture, startQuestion; apps/web/src/components/FinnResultContent.tsx: evidence and next step; docs/design/finn_pet_refined/session_status.json: approved waving body_lock_03

### 4. Product demo · 45 seconds

This first prototype uses scripted questions and synthetic records. We ask when Atlas can submit payroll changes. Finn shows the twenty second of October and the approved client agreement. We open the evidence to see why the other dates do not apply. Then we ask: and for next month?

Presenter cues: 0 to 10 seconds: ask “Until when can Atlas submit payroll changes?”
10 to 25 seconds: show 22 October and open View details or Why this source.
25 to 35 seconds: point to S4 and one rejected source.
35 to 45 seconds: ask “And for next month?” and show the evidence gap.
Replace this placeholder with a final verified recording or current screenshot before submission. If the jury device has no working demo, use slides 5 and 6 as the editable fallback. The guide warns that the jury uses its own device. No video or live link is embedded in v1.

Evidence boundary: Scripted fixture flow, not live connector search. The inspected frontend matches questions and replays in memory. The README describes a broader future scripted agent with real tools, but this is not proven by the current frontend flow.

Sources: Finals Guide, page 4: three minutes, five minutes of questions, jury device; apps/web/src/state/finn.ts: match and playFixture; apps/web/src/state/finn-scenarios.ts: d1October and d1November

### 5. Why 22 October applies · 20 seconds

The account owner approved the Atlas agreement for Belgium in October. It overrides the general deadline. The other dates are proposals or recollections. Finn makes that distinction visible, with the source behind the answer.

Presenter cues: Use this slide as the first demo fallback. Avoid reading a confidence percentage as calibrated accuracy. The fixture contains 0.92, but this is a scripted score, not an evaluation result.

Evidence boundary: Fixture reasoning and UI source display are present in inspected code. Trust scores and applicability decisions are authored fixture values, not independently computed or validated predictions.

Sources: apps/web/src/state/finn-scenarios.ts: d1October, loonmutatieSources; apps/web/src/components/FinnResultContent.tsx: answer sources and Why this source

### 6. The right next step · 15 seconds

For November, Finn does not recycle October’s answer. It shows the missing evidence and identifies Roy, the Atlas owner. Contact is simulated here. A real message and reply loop comes next.

Presenter cues: Use this slide as the second demo fallback. Do not say that Finn has actually sent a Teams message. In the fixture, all October sources are no longer applicable to November, including the general rule.

Evidence boundary: The null answer, owner and proposed message are fixture values. The UI explicitly says simulated contact. No external message has been sent.

Sources: apps/web/src/state/finn-scenarios.ts: d1November, nextStep; apps/web/src/components/FinnResultContent.tsx: Simulated contact in this demo

### 7. Sick leave example · 15 seconds

In our synthetic sick leave case, the approved procedure says twenty four hours. Forty eight is unconfirmed. Seventy two comes from an expired version. The status of the source matters.

Presenter cues: Optional cut if the live demo runs long. These are synthetic fixture policy values, not real Belgian legal requirements. Do not present them as guidance to SD Worx clients.

Evidence boundary: d2 fixture content only. Not an independent policy, legal or payroll validation. The fixture score 0.85 is authored, not calibrated.

Sources: apps/web/src/state/finn-scenarios.ts: d2, S6, S7, S34, S32

### 8. Value and next step · 25 seconds

For SD Worx, everyday expertise becomes easier to use, with uncertainty in view. Next, we would pilot authorised sources and real colleague confirmation in one workflow, measuring time to a supported answer and interruptions to experts. Less searching, with better judgement.

Presenter cues: End here within 170 seconds. Leave ten seconds of safety margin. These are proposed pilot metrics, not measured savings. The safe connection and access controls are future pilot requirements, not a claim of a completed security review. Keep the completed Aikido evidence ready separately for submission and questions.

Evidence boundary: Value hypothesis and roadmap. Real connectors, permission enforcement over enterprise sources, ongoing freshness monitoring, colleague replies and knowledge reuse remain future work. Voice is deliberately excluded. No security scan result is asserted.

Sources: Finals Guide, pages 6, 10, 11 and 12: criteria, challenge and Aikido requirements; README.md: challenge coverage, privacy, stretch goals and source choices

## Before the final handoff

1. Replace slide 4 with a capture of the final app version, or keep slides 5 and 6 as the fallback. Capture the actual supported interaction and keep the synthetic data label.
2. Reconfirm the delivered app behaviour with the application coordinator. This presentation session read code and existing evidence only. It did not operate or build the app.
3. Rehearse on the jury device, including any recording. No recording or live hyperlink is embedded in v1.
4. If source search or contact becomes real, update slide 6 and the spoken boundary only after verification. Do not add voice claims just because voice work exists in another session.
5. Prepare the final Aikido scan screenshots separately. No security result or performance improvement has been measured or claimed in this deck.
6. The generic docs/task-brief.md is an empty template. It supplied no extra timing, acceptance criteria or runtime evidence.
7. Commit and push remain with the coordinating thread. This session has made no Git mutations.

## Suggested jury answers

What works today? The inspected frontend contains the three prepared fixture flows, source explanations, a missing evidence state, and a simulated next step. This session did not rerun the app.

Is the trust score an accuracy metric? No. Scores and reasons are authored fixture content. A production trust method would need evaluation and calibration.

Does Finn contact a colleague? No external message is sent in this prototype. The UI shows the intended handoff using synthetic data.

How will knowledge stay fresh? The prototype demonstrates refusing an answer when a source no longer applies. A pilot would add authorised live sources, freshness checks and confirmation reuse.

What is the security position? The deck uses synthetic records and contains no credentials. Enterprise source permissions and final Aikido findings must be assessed separately. The deck does not certify security.
