# 选题29-DS-ChatGPT

- 原始报告标题：Deep Research: RAG Architecture for Bringing CIE-Copilot from 9709 Mathematics to 9702 Physics
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:16:33.212Z

Deep Research: RAG Architecture for Bringing CIE-Copilot from 9709 Mathematics to 9702 Physics

Samsen, this report focuses on how to extend your existing text-first hybrid RAG stack (dense + keyword + ltree filtering + RRF fusion) into physics-heavy, diagram-heavy environments (CIE 9702) while staying consistent with your Phase 1 “non-goals” (no P3/P5 diagram/experiment scoring yet, but the knowledge base must support physics retrieval and tutoring). 
1

Physics diagram indexing strategies for 9702

A physics RAG system fails differently from a math RAG system: in 9702, diagrams are often the primary carrier of meaning, not decoration. The most robust indexing strategy in practice is multi-representation per diagram, not “pick one representation and embed it”. The research literature on diagram understanding also converges on structured representations (graph-like) as a way to make diagrams machine-reasonable, rather than only pixel embeddings. 
2

A unifying design pattern

For every physics figure you ingest (from notes, examiner reports, textbook pages, etc.), store four layers:

Layer A — Natural-language caption (teacher-style).
A short, unambiguous caption that names objects, variables, and relationships (“A block on a rough incline; forces: weight mg downward, normal N perpendicular to plane, friction f along plane opposing motion”). This is cheap, aligns with your existing 1536d text embedding field, and improves lexical + semantic retrieval.

Layer B — Diagram Parse Graph (DPG-style) structure.
A JSON/graph representation that stores entities (objects/symbols), connectors (lines, arrows, junctions), and relations (connects_to, points_to, indicates_direction_of, label_of, etc.). “Diagram Parse Graphs” were introduced specifically to represent diagram constituents + relationships and support diagram QA. 
3

Layer C — Domain-specific semantic normalization.
Physics needs normalization beyond captions: units, sign conventions, “slope-of-graph means …”, circuit topology motifs, etc. (Detailed in later sections.)

Layer D — Optional vision embedding (not a replacement).
A vision embedding is helpful for “find similar figure” retrieval only. It should not be treated as the ground-truth source of relationships for scoring-grade reasoning, because diagram reasoning failures are often not OCR but integration/reasoning. 
4

This four-layer approach is consistent with what chart QA research found: chart question answering improves when models can access the underlying data table alongside visual features (i.e., not pixels only). 
5

Circuit diagrams

CIE 9702 circuit diagrams have two special properties: (1) topology matters strongly; (2) symbol vocabulary is fairly standardized (syllabus even provides a symbol table). 
6

Recommendation: represent circuits as “netlists + motif tags + caption”, not caption-only.

Why netlist? In EDA and circuit automation research, the canonical machine-readable representation of a schematic is a netlist (often SPICE format). Multiple deep-learning systems explicitly target “schematic image → netlist” because downstream workflows operate on netlists rather than images. 
7

Even if you don’t run full “image→netlist” for Phase 1, you can still store netlists for diagrams you author/curate, because netlist text is extremely retrieval-friendly.

Practical storage format for 9702-level circuits

A lightweight SPICE-like netlist (doesn’t need transistor-level fidelity).
A Graph JSON adjacency list (nodes = nets, edges = components).
Motif tags: series_resistors, parallel_resistors, potential_divider, RC_charge, RC_discharge, bridge, ammeter_in_series, voltmeter_in_parallel, etc.

Example (illustrative):

text
复制
# CircuitNetlist (CIE-style, SPICE-like)
V1 n1 0 DC
R1 n1 n2
C1 n2 0
SW1 n1 n1a   # optional


How retrieval uses it

Dense embedding over a canonicalized netlist string (stable order: sort components by type then name; sort nodes).
Keyword index over:
component types (resistor/capacitor/diode)
topology tokens (series/parallel, divider)
measurement intent (measure current, measure potential difference)
ltree filter by syllabus topic (e.g., 9702.as.electricity.dc_circuits.*). Your existing ltree approach is a good fit for this. 
8

Can we skip netlists and rely on VLM captions?
My view: not safely if you want consistent, exam-style reasoning. Circuit understanding errors are often connectivity errors (“this node is connected to that node”), which are brittle under caption-only extraction. Circuit-automation research treats connectivity extraction as a core hard problem, and many systems explicitly separate “component detection” from “connectivity analysis”. 
7

Free Body Diagrams

A Free Body Diagram encodes a set of vectors (forces/moments) with direction, line of action, and sometimes point of application. Educationally, it’s a bridge between a physical situation and Newton’s laws. 
9

Recommendation: represent FBDs as structured vectors + derived equations + caption.

Store:

objects: e.g., block, string, incline, pivot
forces: list of {name, agent, on_object, direction_theta_deg, components, magnitude_symbolic, application_point(optional), notes}
reference_frame: axes definition
derived_equations: auto-generated templates such as
ΣFx = ma, ΣFy = 0, τ = r × F in LaTeX, keyed to the axes in the JSON.

This is essentially “DPG + domain normalization”: DPG gives you nodes/edges, while physics adds meaning like “arrow = force vector” and “resolve into components”.

Ray diagrams and wave diagrams

Optics ray diagrams and wave sketches involve geometry + conventions (principal rays, focal points, phase relationship). These diagrams are well-suited to a DPG-like representation:

nodes: lens/mirror, focal points, ray segments
edges: “ray travels to”, “refracts at”, “passes through focus”, etc. 
10

For waves: store waveform features (amplitude, wavelength, phase shift) as explicit numeric/relational fields plus caption.

Data graphs (v–t, a–t, decay curves, I–V, etc.)

For physics graphs, the key requirement is semantic operators:

slope ↔ derivative relation
area ↔ integral relation
intercept ↔ parameter
log transforms ↔ power/exponential linearization

CIE 9702 Paper 5 explicitly expects students to use graphs to determine gradients, intercepts, and constants, and to handle uncertainty via best-fit vs worst-acceptable lines (this is exactly the kind of “graph semantics” that caption-only often misses). 
6

Recommendation: store a “GraphTable” representation whenever possible.

graph_type: velocity_time, current_voltage, decay_curve, etc.
axes: labels, units, scale, transforms (linear/log)
data_points: extracted or authored points
semantic_rules: e.g., slope(v–t) = acceleration, area(v–t) = displacement
exam_ops: “find gradient”, “find intercept”, “linearize using ln”, etc.

This aligns with chart QA research direction: integrate chart image understanding with an extracted data table for reasoning. 
5

VLM capability evidence and whether it can replace structured modeling

You asked specifically about VLMs (e.g., GPT-4o Vision and Gemini 1.5 Pro Vision) and whether they can replace manual/structured modeling for physics diagrams.

What benchmark data actually says

A strong, directly relevant source is MMMU-Pro, because it stresses vision-only inputs and includes diagram/chart-heavy tasks. In MMMU‑Pro’s vision-only setting, reported accuracies are approximately:

GPT‑4o: ~49.4% (vision setting) with OCR accuracy ~92.3%
Gemini 1.5 Pro: ~43.6% (vision setting) with OCR accuracy ~89.7% 
4

Key interpretive point: OCR is not the bottleneck; reasoning and integration are. MMMU‑Pro explicitly reports that, for GPT‑4o in the vision setting, “reasoning errors” rise substantially and OCR is not the primary limiter. 
4

Separately, the Gemini 1.5 technical report shows that on “core vision multimodal benchmarks” (which include charts and science diagrams), Gemini 1.5 Pro improves over prior Gemini versions and reports (0-shot) results such as:

AI2D (science diagrams): ~80.3%
ChartQA (charts): ~81.3%
MMMU (val): ~58.5% 
11

MathVista (visual math reasoning) reports:

GPT‑4o: 63.8 (reported as exceeding human average 60.3 there)
Gemini 1.5 Pro: 63.9 
12
My conclusion for your product decision

VLMs are valuable, but they do not substitute structured modeling for exam-grade physics diagram reasoning.

Reason: even “top-tier” VLMs show large residual error on robust multimodal tests, and the dominant failures are integration/reasoning rather than reading the text. That failure mode is exactly what hurts physics diagrams:

confusing which component connects to which node in a circuit,
missing arrow direction in a force diagram,
mixing up which curve corresponds to which variable in a graph,
misapplying “slope vs area” semantics.

So the most pragmatic architecture is:

Use VLMs for:

generating captions (Layer A),
proposing diagram type classification,
extracting candidate entities/labels,
optionally retrieving “visually similar” reference figures.

Do not rely on VLMs as the sole authority for:

circuit connectivity,
slope/area quantitative extraction,
any scoring-grade interpretation where a one-symbol error flips the answer.

This hybrid stance is consistent with both benchmark evidence (reasoning bottleneck) and the broader diagram-understanding literature’s preference for structured parse graphs. 
13

Representing AO3 experiment skills for Paper 5

Even though Phase 1 excludes scoring P3/P5, Paper 5 content still needs to reside in your knowledge base because students will ask “how to plan” and “how to justify” regardless of auto-marking.

The canonical rubric decomposition already exists in the syllabus

In the 2025–2027 9702 syllabus, Paper 5 is:

a timetabled written paper focused on higher-order experimental skills
two questions, each 15 marks
Q1 is a planning question requiring an experimental design and typically a diagram + extended writing
Q2 is analysis/conclusion/evaluation using an equation + experimental data, with uncertainty expectations 
6

The syllabus also gives mark allocations and a breakdown:

Q1 Planning: defining problem, methods of data collection, method of analysis, additional detail including safety
Q2 Analysis & evaluation: data analysis, table of results, graph, conclusion, treatment of uncertainties 
6

This is already an analytic rubric, not a holistic one.

Evidence from an actual recent mark scheme

A 2024 Paper 5 mark scheme shows point-based awarding:

explicit credit for identifying independent/dependent variables,
credit for a “labelled diagram” meeting certain criteria,
credit for a specific analysis plan (e.g., log-linear plot),
a list of acceptable “additional detail” points where “any six” earn marks. 
14

Also, the same mark scheme includes “Science-specific marking principles” such as:

credit depends on correct scientific use of keywords,
contradictory statements are not credited,
units/significant-figures rules apply. 
14
How to store AO3 knowledge so RAG can answer well

For Paper 5 material, I recommend storing two knowledge layers:

Layer 1: “Skills library” chunks (topic-agnostic).
Examples:

controlling variables patterns (how to identify IV/DV/controls),
measurement method templates (voltmeter placement, micrometer usage, light gate timing),
uncertainty propagation patterns (gradient uncertainty from best-fit minus worst-acceptable),
safety reasoning templates (risk → precaution). 
6

Layer 2: “Experiment templates” (semi-structured).
Represent each as JSON with:

goal (what parameter to estimate)
iv, dv, controls
apparatus
procedure_steps
data_table_schema
analysis_plan (graph transform, gradient usage, units)
uncertainty_plan
safety_plan

This is exactly aligned with the syllabus’ expectation statement that candidates must plan, perform, and evaluate experiments, and that safety and analysis planning are part of the assessable skill. 
6

Whether your PRD “M/A/B” framework still applies

Without seeing your internal PRD, I can only map conceptually. But Cambridge’s breakdown is close to the typical triad:

M (Method) ≈ apparatus + method of data collection + control of variables
A (Analysis) ≈ method of analysis + graph/linearization + extracting constants
B (Best practice / Beyond) ≈ safety, feasibility, calibration, repeats, precision, improvements

This mapping is not speculative—Paper 5 allocates marks exactly along these categories, and recent mark schemes award “additional detail” marks often for practical realism and safety. 
6

Unit and dimensional awareness inside hybrid retrieval

This is the most “physics-specific” retrieval failure mode: the same concept is written as N, newton, or kg·m·s⁻², and your retrieval must unify them.

Ground truth: unit equivalence is formal, not fuzzy

The SI explicitly treats newton (N) as the derived unit of force with base-unit expression kg·m·s⁻². 
15

Both UCUM and QUDT exist specifically to support machine comparison of unit equivalence:

UCUM describes “equivalence classes such that different expressions may have the same meaning” (and full conformance requires detecting equivalence). 
16
QUDT provides unit instances and exact-match links (e.g., base-unit product forms matching named units) and exposes dimension vectors for dimensional analysis. 
17
Why relying on PostgreSQL tsvector alone is risky for unit strings

PostgreSQL full-text search works by:

using a parser to split text into tokens and assign token types,
then dictionaries normalize tokens into lexemes. 
18

Unit strings like kg·m·s⁻² contain punctuation (middle dot) and superscripts; token boundaries can easily fragment them, and “what ends up indexed” may be inconsistent across different typographic variants. Your suspicion that tokenization can “break” unit expressions is justified by how PostgreSQL tokenization is defined (token boundaries are identified by the parser; the parser itself doesn’t preserve semantic equivalence). 
19

A practical schema extension for knowledge_chunks

Add a structured unit field and a secondary FTS field that indexes canonicalized unit aliases.

Conceptually:

sql
复制
-- new columns (conceptual)
units_json      JSONB   -- extracted unit mentions and canonical forms
units_fts       TSVECTOR -- generated from canonical unit tokens

-- optional: dimension vectors for fast matching
dimvec_json     JSONB


Populate units_json at ingest time, e.g.:

json
复制
{
  "mentions": [
    {
      "surface_form": "N",
      "quantity_kind": "Force",
      "ucum": "N",
      "si_base_ucum": "kg.m.s-2",
      "qudt_unit": "http://qudt.org/vocab/unit/N",
      "dimvec": "A0E0L1I0M1H0T-2D0"
    }
  ]
}


The dimension vector example above is explicitly published in QUDT and ties to Force as (L^{1} M^{1} T^{-2}). 
20

Query-time behavior

At query time:

Detect unit-like strings (including LaTeX forms).
Normalize to UCUM-like ASCII:
replace · with .
replace superscripts with s-2, etc.
Expand the query with aliases:
N, newton, kg.m.s-2, kg m s^-2
Include both:
semantic embedding query over text
keyword query over units_fts

This is consistent with UCUM’s explicit requirement to compare unit expressions by semantics rather than by surface form. 
16

Qualitative explanation questions and implications for Smart Mark Engine

Physics has a high volume of explanation and justification prompts (microscopic mechanism, cause-effect, limitations). The 9702 assessment objectives explicitly include “give reasoned explanations for phenomena” under AO2, and AO1 values precise vocabulary (symbols, quantities, units). 
21

Retrieval strategy: qualitative vs quantitative

Quantitative calculation question retrieval

prioritize formula chunks, worked-method chunks, unit-handling chunks
include common algebraic transforms and typical pitfalls (significant figures, unit consistency)

Qualitative explanation question retrieval

prioritize:
definition + microscopic mechanism chunks,
causal chains (A → B → C),
common misconceptions,
experimental evidence/supporting observations,
boundary conditions (“works only if…”, “assumes…”).

This is not stylistic—Cambridge’s marking principles explicitly punish contradictions and reward correct scientific meaning, so retrieval must surface the right conceptual anchors not just any related formula. 
14

Why SymPy-style adjudication cannot extend to qualitative scoring

A symbolic engine can verify algebra, but it cannot verify whether a student correctly explained (for example) microscopic charge-carrier collision reasoning, or whether they contradicted themselves.

Empirical studies and surveys of LLM-based grading repeatedly observe that LLMs can provide usable grading/feedback, but reliability depends heavily on rubrics, calibration, and handling uncertainty. 
22

Architecture change recommendation for Smart Mark Engine

If you later decide to score qualitative physics responses, the minimal viable architecture shift is:

Rubric decomposition into atomic “mark points” (analytic rubric).
This matches Cambridge practice (Paper 5 is already analytic, and mark schemes list discrete credit points). 
14

RAG supplies evidence for each mark point.
The model should be forced to justify each awarded mark point by pointing to retrieved references (definition, mechanism statement, etc.), to reduce hallucinated marking rationales. This is aligned with rubric-based evaluation approaches where each criterion is checked independently. 
23

LLM-as-judge is rubric-conditioned + confidence-aware.
Recent work on rubric-conditioned grading highlights the need for uncertainty estimation (“trust curves” / filtering low-confidence predictions to improve reliability on the remaining subset). 
24

Contradiction detection as a first-class rule.
Cambridge’s science marking principles explicitly state that contradictory statements in the same response should not be credited. So your grader should include a contradiction check step (LLM + NLI model, or a dedicated LLM pass constrained to contradiction detection). 
14

My position: if you want real exam-level trustworthiness, you will likely end up with a hybrid of (a) rubric + (b) evidence retrieval + (c) LLM semantic mapping + (d) calibrated confidence and human review thresholds, rather than a single-pass “grade with an LLM”. The current research trajectory supports this direction. 
24

Cross-subject prerequisite knowledge graph design

Physics in 9702 depends on math skills (graphing, logs, trig, calculus ideas in kinematics reasoning). CIE itself frames physics as requiring mathematical skills, including dimensional consistency checks. 
6

Data model goals

You want to support queries like:

9709.P1.Calculus PREREQUISITE_OF 9702.AS.Kinematics.Equations

To do this reliably, you need:

globally unique node IDs across subjects,
typed edges with semantics,
storage that supports both hierarchy traversal (ltree) and graph traversal (edges).
Proposed schema pattern

Keep your current topic_path (ltree) for hierarchical filtering, but add a graph layer:

curriculum_nodes

node_id (UUID)
syllabus_code (string, canonical)
subject (9702 / 9709)
level (AS / A2)
component (P1/P2/P3/P4/P5 optional)
topic_path (ltree)
title, learning_outcome_text

curriculum_edges

(from_node_id, relation_type, to_node_id)
edge attributes: strength, rationale, version, evidence_refs

The ltree extension is explicitly designed for hierarchical label paths and fast “subtree” searching, so it remains ideal for syllabus navigation and retrieval filters. 
8

Relationship types that matter for Physics↔Math

At minimum:

PREREQUISITE_OF (hard dependency)
USES_SKILL (soft dependency; e.g., “log-linearization” used in experimental analysis)
REPRESENTED_BY (concept → canonical representations, e.g., “force” → “N”, “kg·m·s⁻²”)
EVALUATED_BY (node → exam component/rubric)

This mirrors what education interoperability standards treat as first-class: the CASE standard explicitly supports competency frameworks and associations across frameworks, and can transmit rubrics/criteria structures—very close to what you’re implementing internally. 
25

How this improves RAG quality

At query time:

Classify the query into candidate curriculum_nodes (via keyword + embedding).
Expand the retrieval scope:
include prerequisites from 9709 when answering 9702 questions,
but down-weight them unless the query is explicitly “math method”.
Retrieve knowledge_chunks filtered by those nodes’ topic_path.

Because you already fuse multiple retrievers with RRF, this graph expansion fits naturally: it produces additional candidate sets that RRF can combine without score normalization issues (RRF is explicitly designed to merge ranked lists from different systems reliably). 
26

Finally, if you ever want external interoperability (or at least future-proofing), mapping your internal graph to LRMI-style “educational alignment” metadata is feasible: LRMI is explicitly defined for describing educational resources and alignment, built on schema.org vocabulary. 
27
