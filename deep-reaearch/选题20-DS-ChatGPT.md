# 选题20-DS-ChatGPT

- 原始报告标题：CIE-Copilot XAI and Evidence-First UI for Cambridge A-Level Mathematics 9709
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:15:27.511Z

CIE-Copilot XAI and Evidence-First UI for Cambridge A-Level Mathematics 9709
Context and design targets

Samsen, the core UI problem you described is not “how to generate explanations,” but how to present a complete evidence chain (already produced by the backend) in a way that (a) preserves trustworthiness and auditability, (b) does not overload working memory, and (c) reduces negative affect during error feedback—especially in an exam-prep context where students are sensitive to perceived “judgment.” This is consistent with human-centered XAI work arguing that explainability is a UX problem shaped by user needs, task context, and timing, not merely an algorithmic add-on. 
1

Your PRD constraints imply two different “evidence UX” surfaces:

AskAI (RAG-style): evidence is document chunks (chunk_id + summary), and the UI must prevent topic leakage (topic_leakage_flag=false). The design challenge is to show “why you should believe this answer” without creating a false sense of certainty. This is important because citations can inflate perceived credibility even when citations are low quality or irrelevant. 
2
Smart Mark Engine (marking): evidence is student_steps spans (evidence_spans index mapping) plus explicit rubric alignment (rubric_point_id and mark_label). The design challenge is to teach exam-style reasoning, including FT (Follow Through) where later working is “correct relative to an earlier wrong value.” 
3

In other words, you need a UI that supports two kinds of learner questions, which human-centered XAI literature repeatedly emphasizes:

“Where did this come from?” (provenance / evidence)
“What should I do next?” (actionability / repair)
Designing for both is aligned with general human-AI interaction guidance (make capabilities/limits clear; provide efficient correction; convey consequences of user actions). 
4
Research synthesis on XAI in education and learning impacts
What 2020–2025 education XAI research converges on

Recent education-focused reviews characterize XAI-in-education as fragmented but rapidly developing, with recurring challenges spanning HCI, trustworthiness, ethics, technical limits, and policy. One systematic review (PRISMA-based) identified 19 education-relevant studies, noted many competing definitions of XAI, and categorized dozens of challenges into multiple groups including HCI and trustworthiness—an indicator that “how to present and govern explanations” is a primary bottleneck, not an afterthought. 
5

A widely cited open-access paper in Computers and Education: Artificial Intelligence proposes an explicit XAI-ED framing: explanations in education must be designed with stakeholder goals, benefits, presentation approaches, model classes, human-centered interfaces, and pitfalls in mind. That aligns exactly with your scenario (student-facing grading + tutor output, high sensitivity to trust calibration). 
6

When “more explanation” helps learning and when it can backfire

Empirically, “more explanation” is not monotonic. Three findings are especially load-bearing for your product decisions:

Elaborated feedback (explanatory feedback) can improve transfer and learning processes, compared to minimal correctness-only feedback, in controlled studies of digital learning contexts. In multimedia learning with a pedagogical agent, elaborated feedback improved transfer performance (vs KR-only) and also affected motivational variables. 
7

Explanations do not reliably prevent overreliance; sometimes they increase it. Experiments in AI-assisted decision-making show that adding explanations alone often fails to reduce overreliance, and cognitive forcing-style interaction designs can reduce overreliance but may be perceived as less pleasant. This is a design trade-off: learning benefit and correct skepticism vs subjective UX friction. 
8

Explanations help most when they lower the “verification cost” relative to blind acceptance, and/or when stakes are high enough that users invest effort. A cost–benefit framing suggests that explanations reduce overreliance primarily when they are easy to interpret and when the underlying task is effortful enough that verifying is worthwhile. 
9

My design opinion from these findings: in exam-prep, your UI should not assume students will read long explanations linearly. Instead, you should (a) default to short, actionable feedback, (b) provide drill-down evidence and FT mechanics on demand, and (c) selectively add “productive friction” (micro-check prompts) only at points where students historically make repeat errors—because forcing functions can help but should be used sparingly. 
8

Differences across learner types that matter for your UI knobs

Two learner-difference dimensions are practically actionable for CIE-Copilot:

Prior knowledge / ability: controlled evidence from human-AI research indicates that explanation benefits can be stronger for users with less prior knowledge (where explanations increase informativeness and learning outcomes). This supports adaptive default detail: novices get slightly more scaffolding by default; strong students get terser summaries unless they expand. 
10

Anxiety and interface stress sensitivity: HCI work on online exam interfaces reports that a substantial fraction of students experience anxiety before/during digital exams, and that interface design can worsen performance for some students. Stress-reducing design features include familiarization/practice with the platform beforehand and simpler, uncluttered visuals; timer visibility can be stress-inducing for some and should be optionally hideable; progress clarity matters. 
11

A third dimension is cognitive motivation (Need for Cognition): forcing-function designs benefited high-NFC participants more, suggesting that “deep explain mode” will be disproportionately used by—and beneficial for—students who already like effortful reasoning. Your Progressive Disclosure should therefore be designed so that low-NFC students still get value from the summary layer, while high-NFC students can self-select into deeper layers. 
8

Evidence UI pattern library for AskAI
Design premise: citations alone can create miscalibrated trust

Two recent findings are hard constraints for any “citation UI”:

Citations can significantly increase trust even when citations are random, and trust can decrease when users check citations. 
2
Even when citations are “correct,” they may be unfaithful (post-rationalized): a model may generate from parametric memory, then attach a plausible citation afterward. Reported rates of post-rationalized citations can be large (e.g., “up to 57%” in one study’s tests), and the paper argues you must distinguish citation correctness from citation faithfulness. 
12

Implication for CIE-Copilot AskAI: do not label a UI element as “Confidence” if it is primarily “evidence coverage.” Also, avoid presenting citations as a pure trust badge; instead present them as verifiability affordances.

Pattern: Inline citation with source drawer

Intent: keep main explanation readable while allowing verification when needed; reduce extraneous cognitive load by not forcing the evidence list into the main reading flow. This aligns with progressive disclosure principles (show minimal first; reveal more when asked). 
13

Wireframe description (right-side AI interaction panel):

Answer text renders normally.
At the end of each claim/sentence, show small superscripts like [1] [2] (only when evidence exists).
Clicking a superscript opens a Sources Drawer (right edge slide-in if space; otherwise bottom sheet) listing:
Chunk title/topic_path (if available)
chunk_id (copyable)
1–3 sentence chunk summary (your evidence[] summary)
“Open excerpt” (expands to show more context)

Interaction detail:

Default: superscripts visible but visually quiet (low salience).
On click: drawer opens and auto-scrolls to cited chunk(s); cited chunk(s) highlight.
“Pin sources”: keep drawer open while student reads.

Cognitive load / trust trade-off:

Pro: minimal interruption; supports verifiability. 
13
Con: because citations can inflate trust “on sight,” you must ensure superscripts look like tools not badges (avoid trophy-like visuals). 
2
Pattern: Knowledge card as contextual provenance

Intent: provide just enough context for a cited chunk so a student can judge relevance quickly without reading full sources—particularly important because students often do not deeply interrogate transparency information and rely on heuristics. 
13

Wireframe description:

Hover/tap on a citation (or on a highlighted phrase) opens a compact Knowledge Card anchored near that element:
“From: Topic > Subtopic”
“Why it’s relevant” (one sentence, derived from chunk summary)
“Show more” opens the full Sources Drawer

Interaction detail:

Card closes on outside click; can be pinned.
For mobile, use a bottom sheet preview.

Cognitive load angle:
This pattern reduces the cost of verification by lowering the time/effort to “recognize” relevance, which is a prerequisite for calibrated trust (and for the “verification cost” framing of overreliance). 
9

Pattern: Grounding bar (rename from “Confidence bar”)

Because “confidence” is ambiguous (model probability? retrieval coverage? UI certainty?), I recommend a semantic rename: Grounding Level rather than Confidence.

Intent: help students understand how much of the answer is supported by retrievable evidence without implying correctness.

Wireframe description:
A thin horizontal bar under the answer header:

Left label: “Grounding”
Bar segments:
“Linked” segment: % of sentences with ≥1 evidence chunk attached
“Unlinked” segment: sentences with no evidence (should be rare if PRD requires evidence)
Tooltip copy: “Grounding shows how much of this answer is supported by cited sources. It is not a correctness guarantee.”

Why this matters: citations can raise trust even if random; attribution can be unfaithful even if “looks correct.” Therefore the UI must explicitly avoid equating citations/coverage with correctness. 
2

Pattern: Sentence-to-evidence tracing with claim-level highlight

Intent: make “evidence chain” perceptually obvious: clicking a sentence highlights the supporting chunk(s) and highlights the matching excerpt within the chunk if available. This is specifically meant to combat the “citation as placebo” effect by making verification cheap and specific. 
2

Wireframe description:

In answer text, each sentence is subtly hoverable (no underline by default; show a light highlight on hover).
Click sentence →
sentence background highlights
Sources Drawer opens
relevant chunk cards highlight
within each chunk card, the excerpt region highlights (if you store offsets; if not, highlight the whole summary)

Educational alignment: interactive control/inspectability can raise trust and perceived transparency in learning systems when the impact is visualized. Although this result is about recommendation steering, it generalizes as “visualize the effect of user actions to increase perceived transparency.” 
14

Operational requirement (backend/UI contract): this pattern becomes dramatically stronger if AskAI returns per-sentence evidence ids (even if heuristic). If not available, you can still map “citation click → chunk list,” but you lose claim-level auditability.

Marking timeline and Follow Through visualization for Smart Mark Engine
Non-negotiable semantic mapping: M/A/B/FT meanings must match Cambridge marking

For Cambridge International marking, your UI should reflect the official categories:

M = Method mark (valid method applied; not lost for numerical slips)
A = Accuracy mark (correct result/step; dependent on method)
B = Independent result/statement mark
FT = Follow Through, allowing an A/B mark for correct work following from a previous incorrect result (otherwise A/B only for correct work). 
3

This is important because your FT visualization (“shadow path”) is not a UX flourish; it is a faithful representation of the marking logic students must learn.

Timeline interaction model

Baseline representation: a vertical Timeline in the right panel where each rubric point is a node, ordered by evaluation sequence (not necessarily by student line order—choose one and label it clearly).

Node visual encoding (matches your color semantics, but must not rely on color alone):

awarded → green + check icon
awarded_ft/partial → amber + “FT” chip or link icon
lost → soft red + cross icon
uncertain → grey + question mark icon
This is required for accessibility (color must not be the only signal). 
15

Node card contents (collapsed vs expanded):
Collapsed (default):

mark_label (e.g., M1) + status icon
6–12 word reason summary (e.g., “Correct differentiation method”)
awarded marks (e.g., “+1” or “0”)

Expanded (tap/click):

Full reason (1–3 sentences)
Evidence mapping: “Based on your Step 2 and Step 3” (clickable)
If lost: a “Fix hint” line (single actionable cue)
If awarded_ft: show the “tainted” chip(s): e.g., FT uses x = 5

Why collapsed-first: transparency can become distracting; users often prefer simplified feedback initially, with deeper details on demand. 
13

Streaming and animation parameters

Your “typewriter” and “point-by-point reveal” should be treated as instructional pacing, not just delight. Two constraints from exam-stress literature: simpler visuals reduce stress, and time-related UI elements can be stressors for some users. Therefore: animation must be skippable and should not create a feeling of “waiting for judgment.” 
11

Recommended reveal choreography (practical defaults):

Phase 1 (instant, ≤150ms): show total score + short neutral summary (“You earned 7/10. Two method marks were lost early; later steps were mostly consistent.”)
Phase 2 (paced): reveal timeline nodes sequentially
Node interval: 350–650ms (auto-adjust: longer if node has longer text)
Easing: use “standard” for subtle utility motion; reserve “emphasized” only for major state changes (e.g., FT branch appearing), consistent with Material guidance that emphasized easing is for stylized transitions and standard for utility-focused motion. 
16
Phase 3 (user-driven): stop auto-progress when the first lost node appears and show a “Continue” button. This creates a gentle forcing function: the student chooses to proceed rather than passively receiving a long negative sequence. This is inspired by evidence that forcing/interaction design can reduce unthinking acceptance, but must be lightweight to avoid dislike. 
8

Accessibility: respect reduced-motion preferences; provide “Reveal all instantly.” This is consistent with general human-AI guidance to support efficient dismissal/correction and avoid disrupting users. 
4

evidence_spans visualization: linking rubric decisions to student work

Because backend evidence_spans references student_steps indices, the UI must make student_steps tangible.

Suggested left-panel structure (split-screen constraint honored):

Left side remains “Question” by default.
Add a tab or collapsible section: Your Work that displays the parsed student_steps as numbered blocks (Step 0, Step 1, …).
Each block renders:
recognized math text (LaTeX)
original handwriting snippet (if available) as a small thumbnail
error flags (e.g., “premature_approx”) as small chips

Interaction:

Clicking a timeline node highlights corresponding student steps (background highlight + left border) and scrolls to the first evidence span.
Hovering a highlighted student step shows “Used for: M2, A1” tags.

This creates the “evidence chain” perceptually: rubric point → student step(s) → reason.

Follow Through shadow path visualization

Your requirement: if Step 1 has an error causing A1 lost, but later method is correct given the wrong value, award_ft should show a “shadow computation path.”

Principled semantics: FT means “correct follow-through from earlier incorrect result,” and your UI must show (a) where the wrong value originated, (b) which later marks depend on it, and (c) how the system evaluated correctness in the counterfactual world where the wrong value is treated as a given. 
3

Wireframe concept (timeline with branch):

Main timeline remains solid.
At the first lost node that introduced the taint, show a small branch anchor icon.
A dashed secondary track (“Shadow path”) runs parallel beneath subsequent nodes that are awarded_ft.
Each awarded_ft node visually belongs to both:
main track (solid node outline)
shadow track (dashed connector)
When the student clicks an awarded_ft node:
show a compact “FT explanation panel”:
“Your Step 1 produced x = 5 (this value is incorrect).”
“From x = 5, your later differentiation/integration method is correct, so this mark is awarded as FT.”
show tainted object: vars/value from backend (tainted.vars, tainted.value)

Compare mode (optional, progressive disclosure level):

Toggle “Compare to correct path” overlays the canonical correct intermediate value beside the tainted value (e.g., x = 5 vs x = 4).
The UI should label this explicitly as a comparison, not as “you were close,” to avoid emotional ambiguity.

Why this works pedagogically: it turns FT from “mysterious mercy” into a causal model: wrong input → correct method on wrong input → partial credit. That supports metacognitive learning (“which error mattered most?”) while still controlling information load by keeping FT details collapsed until clicked. 
7

Uncertain state handling

“uncertain” is not “lost.” It is epistemic uncertainty (parse_fail, ambiguous handwriting, multiple plausible interpretations). Research on uncertainty visualization suggests that showing uncertainty can improve trust calibration for some users, but the presentation must be usable (size/clarity matters). 
17

Recommended UI treatment:

Grey node + question mark icon
Copy: “I’m not fully confident how to mark this step.”
Surface uncertainty causes from backend in plain language:
parse_fail → “I couldn’t reliably parse this line.”
ambiguous_step → “This could mean two different things.”
Provide next action: “Edit/clarify this step” (student can retype the line), or “Send for review” (if teacher workflow exists).

This reduces the emotional harm of misclassifying ambiguity as incorrectness and preserves trust by being explicit about system limits. 
4

Progressive disclosure architecture and cognitive-load balancing rules
Three-layer information architecture

The best-supported pattern across transparency and learning feedback is to start simplified and allow expansion, because detailed transparency can distract users and undermine the simple heuristics they use to operate systems—yet some users want (and benefit from) deeper transparency on demand. 
13

Summary layer (default):

Total score and banded outcome (“Strong method, early algebra slip”)
Timeline collapsed nodes with one-line reasons
One “Most impactful fix” callout (single actionable point)

Detail layer (expand):

Evidence chain (evidence_spans highlights; AskAI chunk drawer)
FT shadow path and tainted propagation
Flags explanations (premature_approx, sig_fig_policy_triggered) shown as short definitions + “why it matters in marking”

Teaching layer (expand further):

Socratic prompts anchored to the first lost mark:
“What assumption did you make here?”
“If this value were correct, what would the next step be?”
Optional micro-practice: “Try one parallel item (same skill, smaller numbers).”

Why three layers (my opinion): two layers often collapses “verifiability” and “instruction” into one, creating clutter. Three layers lets you preserve a clean exam-like marking report while offering tutor-like coaching intentionally. The progressive disclosure literature supports multi-step reveal and “information as needed.” 
13

Cognitive-load balancing rules you can encode as UI policy

These rules are implementable and grounded in the research above:

Never force evidence reading in the primary flow. Evidence is available, not imposed. (Avoid distraction; support user heuristics; citations can bias trust if treated as badges.) 
13
Default to one actionable sentence per lost mark. Additional detail is expandable. (Elaborated feedback helps, but too much can overwhelm; your UI must “budget” attention.) 
7
Use “productive friction” only at high-leverage points. Example: pause autoplay at first lost step; require a click to proceed. (Forcing functions can reduce unthinking reliance but can reduce subjective liking if overused.) 
8
Visually minimize stressors: uncluttered layout, predictable motion, and optional hiding of stress-inducing elements (e.g., timers), consistent with online exam interface findings. 
11
Accessibility must be semantic, not just aesthetic: do not convey awarded/lost solely by color; maintain contrast for readability. 
15
Teach uncertainty explicitly: uncertainty is a state with causes and actions, not a silent failure. 
17
Separate “grounding” from “correctness.” A grounded answer can be wrong; an ungrounded one can look plausible. UI labels must avoid conflating these. 
2
Evaluation plan for detailed explanations versus concise feedback
Experimental design

A rigorous A/B test for “detailed explanation vs concise feedback” should be a randomized controlled experiment embedded in authentic practice.

Participants: A-Level Mathematics 9709 learners (ideally stratified by baseline performance and self-reported test anxiety). The need to account for anxiety is motivated by evidence that exam interfaces can induce anxiety and affect performance for a meaningful subset of students. 
11

Conditions:

Condition A (Concise): Summary layer only by default; minimal reasons; no auto-open evidence; FT shown as a short label, details hidden.
Condition B (Detailed): Summary layer default + automatic expansion of Detail layer for lost marks (evidence_spans highlighted; FT shadow path auto-shown).
Both conditions must allow user expansion to deeper layers; the manipulation is the default and the pacing, not outright removal.

Task: a fixed set of 9709-style items (balanced across Pure/Stats/Mechanics if relevant to your product scope). Each item is followed by the marking report and the AskAI help capability.

Structure:

Pretest (baseline set)
Intervention session (practice set with feedback UI per condition)
Immediate posttest (near transfer: same skills, different numbers)
Delayed posttest (1–7 days later) to measure retention (optional but strongly recommended)
Key outcome measures

Learning outcomes (primary):

Posttest accuracy improvement vs pretest (overall and by skill tag)
Error correction rate on “isomorphic” follow-up items (did the student fix the specific misconception?)
Elaborated feedback research suggests feedback designs can improve transfer performance, so transfer-focused metrics are appropriate. 
7

Metacognitive outcomes (secondary):

“Reason-for-loss” comprehension quiz: after each item, ask the student to select the main reason they lost marks (multiple choice derived from rubric_point_id categories).
Calibration: ask for a confidence judgment (“How likely is your method correct next time?”) and compare to subsequent performance.
This targets your stated metacognitive value hypothesis and aligns with the broader concern that trust/explanations must be calibrated rather than maximized. 
18

Affective outcomes (secondary but important):

Short state anxiety check after feedback exposure (brief validated short-form if possible; if not, a small consistent Likert battery).
Perceived stress / comfort with the interface (especially relevant given exam UI stress evidence). 
11

Behavioral instrumentation (mechanism metrics):

Detail expansion rate (how often do students open evidence, FT explanations, teaching prompts?)
Dwell time on first lost step (do students stop at the right place?)
Citation checking rate (AskAI): how often citations are clicked, and whether that correlates with satisfaction/trust (important given findings that checking can reduce trust). 
2
Analysis strategy

To detect “who benefits,” you should pre-register (even internally) interaction hypotheses:

H1: Detailed default improves learning gains more for low prior knowledge students; concise default performs similarly or better for high prior knowledge students (avoids redundancy/extraneous load). 
10
H2: High-anxiety students show better affective outcomes (lower stress, higher continued engagement) under concise-by-default with optional expansion, reflecting stress sensitivity to interface complexity. 
11
H3: Detailed default increases evidence interaction but also increases premature abandonment for some users; progressive disclosure mitigates this compared to “always-on transparency,” which can be distracting. 
13

My practical recommendation: even before A/B, implement the telemetry that makes these hypotheses testable (expansion events, first-lost-step dwell, FT panel opens, uncertainty acknowledgments).

Deliverable summary in product terms
Evidence UI Pattern Library (AskAI): Inline Citations + Sources Drawer; Knowledge Cards; Grounding (not Confidence) Bar; Sentence-to-evidence tracing—explicitly designed to avoid “citation-as-badge” miscalibration. 
2
Scoring timeline visualization (Smart Mark Engine): Vertical M/A/B timeline with node cards, span-linked highlights into student_steps, stream reveal with user-controlled pacing, and a faithful FT shadow-path branch showing tainted propagation. 
3
Three-layer progressive disclosure IA: Summary → Detail → Teaching; grounded in evidence that incremental transparency can distract and that users often need simplified first-pass heuristics. 
13
A/B test plan: randomized controlled evaluation with learning + metacognition + affect + behavioral mechanism metrics; stratify by prior knowledge and anxiety. 
11
Cognitive load balancing rules: enforceable UI policies (don’t force evidence, pause at first loss, semantic accessibility, separate grounding from correctness) aligned with human-AI guidelines and transparency research. 
4
