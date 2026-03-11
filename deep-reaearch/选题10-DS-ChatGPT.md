# 选题10-DS-ChatGPT

- 原始报告标题：Loop Control and Termination Design for Cyclic Multi‑Agent Tutoring Graphs in LangGraph
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:07:43.737Z

Loop Control and Termination Design for Cyclic Multi‑Agent Tutoring Graphs in LangGraph
Problem framing and why cyclic tutoring graphs need explicit loop governance

CIE‑Copilot’s design choice—using a directed cyclic graph to orchestrate Tutor, Retriever, Examiner, and Supervisor—aligns well with how real tutoring works: iterative questioning, revisiting evidence, and re-checking work. In LangGraph, looping workflows are a first-class capability: nodes run, pass state “messages” along edges, and the runtime proceeds in discrete “supersteps,” inspired by Google’s Pregel model. A superstep is effectively one iteration of graph execution, and the runtime conceptually terminates only when all nodes are inactive and no messages are in transit. 
1

That same power creates a failure mode: if your conditional routing logic fails to converge, the graph can cycle indefinitely. LangGraph explicitly surfaces this as a recursion/step exhaustion issue: if the graph reaches a maximum number of steps without hitting a stop condition, it raises a recursion error (commonly due to a cycle), and you can set a runtime recursion_limit to bound supersteps. 
2

A robust tutoring copilot therefore needs two complementary control layers:

Graph runtime safety bounds (LangGraph recursion step cap, proactive “remaining steps” monitoring, human-in-the-loop pauses).
Pedagogical termination policies (max tutoring turns, retrieval retries, verifier retry logic, supervisor anti-oscillation commitments) designed to protect learning quality and compute budget.

LangGraph provides several primitives directly useful for this: an explicit terminal END node, conditional routing via add_conditional_edges, visibility into the current step counter (config["metadata"]["langgraph_step"]), and a managed value RemainingSteps that can enable graceful degradation before hard failure. 
1

Cyclic trap taxonomy for CIE‑Copilot

Productive loops are those that measurably increase learning progress or solution certainty; “loop traps” are cyclic behaviors with low progress per step and rising cost/risk. LangGraph’s own error documentation calls out infinite loops as a common reason a graph hits recursion limits. 
2

Loop trap classification table
Loop trap (CIE‑Copilot)	Typical trigger	Observable symptoms in state/logs	“Progress” signal that is missing	Recommended detection features	Typical safe exit / reroute
Tutor–Retriever loop (repeated retrieval, no relevant content)	Query too vague; corpus mismatch; top‑k similarity low; same docs repeat	Repeated retrieval with low relevance; no new citations; Tutor keeps asking Retriever	No increase in “coverage” of expected answer components; no new evidence	Consecutive retrieval failures; “no new docs” count; similarity below threshold; identical query hashes	Switch to “ask clarifying question,” broaden query, or declare “insufficient sources” with next‑steps
Tutor–Student loop (Socratic probing, student non‑response)	Student silent, “I don’t know,” or minimal replies; UI not pausing for real user input	Tutor emits multiple questions without user turn; long chain of prompts	No new learner contribution; affective cost rises	Consecutive “no user input” turns; inactivity timer; repeated “no understanding” signals	Use LangGraph Interrupt to pause and wait; or end with summary + request needed info
Examiner–Verifier loop (SymPy repeatedly fails)	Expression not parseable; non‑Python syntax; LaTeX ambiguity; repeated invalid strings	Verifier errors repeat; same parse attempt pattern; Examiner keeps retrying	No increase in verifier confidence; no canonical expression produced	Consecutive parse failures; error-type histogram; “same input” hash	Fall back to “reformat request,” use parse_expr transformations, or escalate to approximate/numeric check; otherwise exit with diagnostic
Supervisor oscillation (Tutor ↔ Examiner thrashing)	Routing heuristic unstable; both agents “not satisfied”; conflicting stopping rules	Alternating node sequence; many switches; no new state deltas	No monotonic progress measure; no stable “committed mode”	Windowed pattern detection (e.g., last 6 nodes alternate); switch counter; low delta in state	Apply hysteresis/commitment: lock to one mode for N steps; terminate with best-effort + “what’s missing”

Why these signals matter pedagogically: Classic tutorial dialogue systems explicitly monitor “coverage” of expected answer components and use that as a stop condition. For example, Why/AutoTutor uses LSA assessments and expectation coverage (curriculum-script expectations) to decide what is missing and when to move on; once the system concludes critical components are covered, it solicits final questions, asks for a recap, and provides a summary before proceeding to the next problem or ending the session. 
3

Termination condition strategy library for iterative tutoring

A strong termination design is not “one hard cap,” but a portfolio of policies that (a) protect learning quality and (b) bound cost. Below is a strategy library mapped to your four traps, plus global budget controls.

Max turns in educational dialogue

There is no single universal “right” turn cap because turn length depends on the pedagogical objective (quick hint vs. deep explanation). However, AutoTutor research gives concrete empirical ranges:

In a typical AutoTutor tutorial dialogue that occurs while answering a single question, it “typically takes 10 to 20 turns” (counting both learner and tutor turns) in the described example setting. 
4
In a later AutoTutor description focused on “one challenging question,” the dialogue “typically lasts 50 to 200 conversational turns.” 
5

Design implication for CIE‑Copilot: Use a two-tier turn budget:

Micro-loop caps (per subtask / per expectation / per retrieval attempt cluster): keep these small (e.g., 2–5 iterations) to avoid local looping traps.
Macro-session caps (per “one challenging question” tutoring episode): allow larger totals (e.g., 20–60 turns) for genuine tutoring depth, optionally up to 100+ only when explicitly requested (e.g., “walk me through everything step-by-step”)—but keep hard budget enforcement.

To justify small micro-loop caps: many ITS hint systems structure help into leveled hints that become progressively more explicit, culminating in a “bottom-out hint.” Bottom-out hints are described as doing “everything shy of entering the answer,” and hints are organized by increasing specificity. 
6
 This gives a principled pattern: after a small number of increasingly direct attempts, either the student progresses or the system transitions to a more explicit intervention (or ends the attempt).

A complementary empirical signal is the ITS literature on wheel-spinning (unproductive persistence). One operationalization defines wheel-spinning learners as practicing the same skill set over ~10 times without mastery signals, emphasizing that persistence is not always productive. 
7
 While that research is practice-item oriented, it supports a key tutoring policy: after ~10 failed “tries” at the same skill/goal, intervene differently (switch modality, provide worked example, or stop).

Token budget and cost guardrails

Most modern LLM platforms price and meter usage in tokens (input and output tokens), which makes token budgeting a direct cost-control mechanism. OpenAI’s pricing references billing “at the model’s input token rate” and token-based charges for certain tool contexts; 
8
 OpenAI’s token-counting guidance also emphasizes that knowing token counts helps estimate whether input is too long and how much an API call costs because “usage is priced by token.” 
9
 Similar token-based pricing is explicitly stated by other providers (e.g., Anthropic per-million input/output token pricing). 
10

Token budget design pattern: enforce both a hard cap and a soft cap.

Hard cap (stop now): if spent_tokens >= B_hard, route to Grace Exit immediately.
Soft cap (degrade): if spent_tokens >= B_soft, restrict to cheaper actions: stop external retrieval, reduce context window, avoid verifier retries, and produce a best-effort explanation + next steps.

LangChain/LangGraph ecosystems give practical tools to estimate tokens: e.g., count_tokens_approximately() approximates token counts in messages, including tool calls. 
11

Content convergence detection

“Convergence” in tutoring is rarely “perfect answer”; it’s often “no more actionable progress is being made.” Why/AutoTutor exemplifies a classic approach: track coverage of expectations and quality of learner contributions and use that to choose the next dialogue move or end a unit. 
3

For CIE‑Copilot, convergence detection should combine:

State delta tests: no new knowledge points added, no new evidence, no improvement in verifier confidence, no change in student model.
Semantic redundancy tests: high similarity between the last Tutor message and prior Tutor messages (indicating repetition).
Goal coverage tests: your internal “expected components” list is exhausted or blocked by missing user input.

A practical policy is to create a scalar progress_score (0–1) per step and terminate when rolling average progress over a window drops below ε for K steps.

Grace Exit: ending loops without harming user experience

Graceful termination should (a) explain why the system is stopping, (b) provide the best “partial credit” answer, and (c) offer clear next actions.

AutoTutor’s end-of-problem move is a strong template: after concluding critical components are covered, it invites further questions, asks for a recap, and provides a summary. 
3
 When stopping due to non-progress rather than success, mimic the same structure but adapt the content:

What we tried (e.g., “I attempted retrieval 3 times with different query reformulations…”)
What’s missing (e.g., “No source in the provided corpus mentions concept X; I need either a specific textbook section or your class notes excerpt…”)
A minimal helpful output (a best-effort explanation or a worked partial solution)
Next steps (ask a clarifying question; propose alternative resources; suggest teacher escalation)

Khan Academy adopts a related safety/productivity principle: it explicitly limits the amount of interaction per day because extended sessions can become repetitive or drift away from educational purposes. 
12
 Common Sense Media’s review echoes that Khan Academy observed “degeneration in extended interactions” and limits how often users can interact daily. 
13
 These are effectively “grace exit at the product level” policies, reinforcing that user-facing termination should be framed as “keeping the session productive.”

Strategy library table
Strategy class	Primary purpose	Where enforced	Recommended default (starting point)	Best for which trap	Evidence / rationale
Runtime step cap (recursion_limit)	Prevent infinite graph execution	LangGraph config at invoke/stream	Set per workflow; use smaller caps for tutor micro-loops; larger for full sessions	All	Recursion limit bounds supersteps; exceeded limit raises GraphRecursionError; default recursion limit stated as 1000 (v1.0.6+) 
1

Remaining-steps degradation (RemainingSteps)	Graceful “wrap up” before hard stop	State channel + router logic	When remaining ≤ 2–5: stop expensive actions, summarize	All	LangGraph provides RemainingSteps managed value for graceful degradation 
14

Per-loop retry caps	Stop local thrash	State counters; conditional edges	Retriever: 2–4 tries; Verifier: 2–3 tries; Supervisor switches: 2–3 per segment	Respective traps	Local loop governance prevents global budget fatigue; aligns with leveled-hint concept (few increasingly explicit attempts) 
6

Max tutoring turns (macro)	Keep tutoring bounded while allowing depth	Supervisor level or session manager	20–60 turns typical; allow 50–200 only if explicitly requested & budgeted	Tutor–Student; Supervisor	AutoTutor reports 10–20 typical turns per question in some settings; also 50–200 turns for challenging questions 
4

Convergence / coverage detection	Stop when no new help can be produced	Tutor & Supervisor; shared progress metric	Terminate if “no new coverage” for K steps	Tutor–Retriever; Tutor–Student	Why/AutoTutor tracks expectation coverage and uses it for dialogue management and session transitions 
3

Human-in-the-loop pause (interrupt)	Prevent auto-looping when waiting on user	Tutor node (when needing user input)	Use whenever next action requires student response	Tutor–Student	Interrupts pause execution and wait for external input; state is persisted and execution resumes later 
15

Product-level daily/session interaction caps	Avoid degenerative long chats	Product layer outside graph	Per-day quota & per-session max time/tokens	All	Khan Academy limits interaction because extended sessions can cause repetition or drift 
12
LangGraph implementation patterns
Embedding loop detection into conditional edges

LangGraph conditional edges (add_conditional_edges) route based on the current state and optionally a mapping of router outputs to nodes. 
1
 This is the cleanest “policy enforcement point” because it centralizes decisions and can force END.

LangGraph also provides:

A terminal END node used to mark completion. 
1
A step counter accessible as config["metadata"]["langgraph_step"]. 
1
A managed RemainingSteps channel for proactive handling before recursion exhaustion. 
1
State design: loop_counter and visited_nodes

A practical state schema should include:

visited_nodes: a rolling trace of node names (last N is enough for oscillation detection).
loop_counter: structured counters per loop type (retriever_failures, verifier_failures, supervisor_switches, no_user_response, etc.).
budget: token/cost tracking (spent tokens, remaining tokens).
progress: last progress scores and “coverage” status.
exit_reason + exit_payload: what Grace Exit should say.

Because LangGraph state channels support reducers (how state updates merge), you can implement visited_nodes as an append-only list (or bounded deque) and counters as overwrites. LangGraph’s docs show TypedDict and reducers (e.g., list concatenation via Annotated[list, lambda x, y: x + y]) as a standard pattern. 
1

Strong termination with END

Your graph should have one canonical “GraceExit” node that produces user-facing final output and then transitions to END via add_edge("grace_exit", END). LangGraph defines END as a special terminal node referenced when you want to denote no further actions. 
1

Code template: cyclic tutoring graph with loop control
python
复制
from __future__ import annotations

import operator
from dataclasses import dataclass
from typing import Annotated, Literal, Optional, TypedDict

from langchain_core.messages import BaseMessage
from langchain_core.runnables import RunnableConfig

from langgraph.graph import StateGraph, START, END
from langgraph.managed import RemainingSteps
from langgraph.errors import GraphRecursionError

# ---------- State schema ----------

class LoopCounters(TypedDict):
    tutor_retriever_fail: int
    tutor_no_user_turns: int
    examiner_verifier_fail: int
    supervisor_switches: int
    consecutive_no_progress: int

class Budget(TypedDict):
    spent_tokens: int
    hard_token_cap: int
    soft_token_cap: int

class State(TypedDict, total=False):
    # Conversation content
    messages: Annotated[list[BaseMessage], operator.add]

    # Loop governance
    visited_nodes: Annotated[list[str], operator.add]
    loops: LoopCounters

    # Global governance
    remaining_steps: RemainingSteps  # managed by LangGraph
    budget: Budget
    progress_window: Annotated[list[float], operator.add]  # store last K progress scores

    # Supervisor mode tracking
    active_role: Literal["tutor", "examiner"]

    # Diagnostics/exit
    exit_reason: str
    exit_hint: str

# ---------- Utility policies ----------

MAX_RETRIEVER_FAIL = 3
MAX_VERIFIER_FAIL = 3
MAX_NO_USER_TURNS = 2
MAX_SUPERVISOR_SWITCHES = 4
MAX_CONSEC_NO_PROGRESS = 4

def _rolling_avg(xs: list[float]) -> float:
    return sum(xs) / max(len(xs), 1)

def should_force_exit(state: State, config: RunnableConfig) -> Optional[str]:
    """Return a user-facing exit reason string if we should terminate now, else None."""
    loops = state.get("loops", {})
    budget = state.get("budget", {})

    # 1) LangGraph step / remaining-steps based safety
    remaining = state.get("remaining_steps", None)
    if remaining is not None and remaining <= 2:
        return "Approaching execution-step limit; wrapping up to avoid an unproductive loop."

    # 2) Hard token cap
    if budget.get("spent_tokens", 0) >= budget.get("hard_token_cap", 10_000):
        return "Token budget exhausted; stopping to prevent runaway cost."

    # 3) Loop-specific caps
    if loops.get("tutor_retriever_fail", 0) >= MAX_RETRIEVER_FAIL:
        return "Repeated retrieval did not surface relevant material."
    if loops.get("examiner_verifier_fail", 0) >= MAX_VERIFIER_FAIL:
        return "Repeated symbolic verification failed to parse/validate the expression."
    if loops.get("tutor_no_user_turns", 0) >= MAX_NO_USER_TURNS:
        return "No learner response; pausing/ending to avoid repeated prompting."
    if loops.get("supervisor_switches", 0) >= MAX_SUPERVISOR_SWITCHES:
        return "Supervisor oscillation detected (too many role switches)."

    # 4) Convergence / no-progress detection (low average progress)
    pw = state.get("progress_window", [])
    if len(pw) >= MAX_CONSEC_NO_PROGRESS and _rolling_avg(pw[-MAX_CONSEC_NO_PROGRESS:]) < 0.05:
        return "Conversation is not making measurable progress; providing best-effort summary."

    return None

# ---------- Nodes (stubs) ----------

def tutor_node(state: State, config: RunnableConfig) -> State:
    # ... generate Socratic prompt or explanation ...
    # Update: progress_window append + maybe loops updates
    return {
        "visited_nodes": ["tutor"],
        # "messages": [...],
        "progress_window": [0.2],  # example progress score
    }

def retriever_node(state: State, config: RunnableConfig) -> State:
    # ... retrieve docs; if none relevant, increment tutor_retriever_fail ...
    loops = dict(state.get("loops", {}))
    loops["tutor_retriever_fail"] = loops.get("tutor_retriever_fail", 0) + 1
    return {"visited_nodes": ["retriever"], "loops": loops, "progress_window": [0.0]}

def examiner_node(state: State, config: RunnableConfig) -> State:
    # ... propose solution steps ...
    return {"visited_nodes": ["examiner"], "progress_window": [0.15]}

def verifier_node(state: State, config: RunnableConfig) -> State:
    # ... SymPy check; on failure increment examiner_verifier_fail ...
    loops = dict(state.get("loops", {}))
    loops["examiner_verifier_fail"] = loops.get("examiner_verifier_fail", 0) + 1
    return {"visited_nodes": ["verifier"], "loops": loops, "progress_window": [0.0]}

def supervisor_node(state: State, config: RunnableConfig) -> State:
    # ... choose active_role with anti-oscillation hysteresis ...
    role = state.get("active_role", "tutor")
    # Example toggle (replace with real policy):
    next_role = "examiner" if role == "tutor" else "tutor"

    loops = dict(state.get("loops", {}))
    loops["supervisor_switches"] = loops.get("supervisor_switches", 0) + 1

    return {"visited_nodes": ["supervisor"], "active_role": next_role, "loops": loops, "progress_window": [0.05]}

def grace_exit_node(state: State, config: RunnableConfig) -> State:
    # Produce meaningful final message(s) based on exit_reason / diagnostics
    return {"visited_nodes": ["grace_exit"]}

# ---------- Routers / conditional edges ----------

def route_after_any(state: State, config: RunnableConfig) -> Literal["grace_exit", "supervisor"]:
    reason = should_force_exit(state, config)
    if reason:
        return "grace_exit"
    return "supervisor"

def route_supervisor(state: State, config: RunnableConfig) -> Literal["tutor", "examiner"]:
    return state.get("active_role", "tutor")

def route_tutor(state: State, config: RunnableConfig) -> Literal["retriever", "supervisor"]:
    # If tutor needs evidence, go retriever; else back to supervisor
    # (Replace with real need-evidence logic)
    return "retriever"

def route_examiner(state: State, config: RunnableConfig) -> Literal["verifier", "supervisor"]:
    return "verifier"

# ---------- Build the graph ----------

builder = StateGraph(State)

builder.add_node("tutor", tutor_node)
builder.add_node("retriever", retriever_node)
builder.add_node("examiner", examiner_node)
builder.add_node("verifier", verifier_node)
builder.add_node("supervisor", supervisor_node)
builder.add_node("grace_exit", grace_exit_node)

builder.add_edge(START, "supervisor")
builder.add_conditional_edges("supervisor", route_supervisor)

builder.add_conditional_edges("tutor", route_tutor)
builder.add_conditional_edges("examiner", route_examiner)

# After tool/agent nodes, run loop governance (can also be done via Command)
builder.add_conditional_edges("retriever", route_after_any)
builder.add_conditional_edges("verifier", route_after_any)
builder.add_conditional_edges("tutor", route_after_any)      # optional: guard after tutor
builder.add_conditional_edges("examiner", route_after_any)   # optional: guard after examiner

builder.add_edge("grace_exit", END)

graph = builder.compile()

# ---------- Execution (runtime recursion limit + safety) ----------

try:
    out = graph.invoke(
        {"messages": [], "visited_nodes": [], "loops": {}, "budget": {"spent_tokens": 0, "soft_token_cap": 8000, "hard_token_cap": 12000}},
        config={"recursion_limit": 80},  # cap supersteps to prevent runaway loops
    )
except GraphRecursionError:
    # Fallback: external graceful handling if proactive measures were insufficient
    out = {"exit_reason": "GraphRecursionError: step limit exceeded."}


This template directly uses LangGraph mechanisms for: conditional edges, a terminal END, runtime recursion limiting, and proactive “remaining steps” handling. LangGraph documents END as the terminal node 
1
 and explains that recursion_limit bounds the number of “supersteps,” with the current step counter available in config["metadata"]["langgraph_step"] and a managed RemainingSteps utility for graceful degradation. 
1

Handling Tutor–Student loops correctly: use Interrupts, not busy-cycling

If the graph expects the student to respond next, do not keep looping Tutor → Tutor in the same execution. Use LangGraph Interrupts to pause and wait for external input. The LangGraph docs state that interrupts pause execution at specific points, persist state, and wait until execution is resumed. 
15

This is essential for avoiding “phantom turns” where the Tutor appears to ask multiple questions without an intervening user message (a classic Tutor–Student loop trap).

Conversation flowchart with exit paths

route: tutor

route: examiner

need evidence

no evidence needed

stop condition met

continue

need learner input

START

Supervisor

Tutor

Examiner

Retriever

LoopGuard

Verifier / SymPy

GraceExit

END

Interrupt: wait for student

Key LangGraph semantics underpinning this diagram: exponential looping is prevented by (a) routing to END via a terminal edge, 
1
 (b) bounding runtime steps via recursion_limit 
1
 and RemainingSteps graceful degradation 
1
, and (c) pausing instead of looping when waiting for external input via Interrupts. 
15

Academic foundations for loop detection, termination protocols, and resource governance in multi-agent systems
Distributed termination detection as the “mathematical core” of loop governance

The most classic, formal termination problem arises in distributed systems: a computation can appear idle locally while messages are still in flight, so termination is non-trivial. Dijkstra & Scholten’s 1980 paper (“Termination detection for diffusing computations”) is a canonical reference for this problem. 
16
 Mattern’s 1987 survey/analysis compares termination detection methods and their properties. 
17

This maps cleanly to multi-agent tool orchestration:

An “agent node” is active while producing output or initiating tool calls.
Tool calls/responses are “messages in transit.”
A safe global stop requires “no agent active” and “no pending tool calls.”

LangGraph’s own execution model mirrors this logic, explicitly stating that nodes become inactive when they have no incoming messages and that execution terminates when all nodes are inactive and no messages are in transit. 
1
 This is essentially a runtime-level termination detection contract—your job is to ensure your routing logic reaches that terminal condition.

Contract Net Protocol as a resource- and time-bounded coordination pattern

The Contract Net Protocol (Smith, 1980) specifies negotiation-based task distribution: nodes with tasks solicit bids from nodes that may execute them, and allocation is driven by a negotiation process. 
18

For loop control, CNP suggests practical policies you can borrow:

Bidding window / timeout: if no acceptable proposal arrives, re-announce with modified constraints or terminate.
Award + commitment: once a contractor is selected, do not re-open the task without a failure signal.
Decommitment rules: if a contractor cannot perform, it explicitly releases the task.

In CIE‑Copilot terms, apply this to Supervisor oscillation: once Supervisor assigns “solve” to Examiner, don’t yank it back to Tutor unless verifier signals failure or Examiner’s confidence drops below a threshold.

BDI commitments as an anti-oscillation mechanism

In BDI (Belief‑Desire‑Intention) agent architectures, “intention” is tightly tied to commitment. Cohen & Levesque’s classic work frames intention as involving “commitment” to action and discusses the relationship between goals, beliefs, and rational action. 
19

BDI work highlights that deliberation is subject to resource bounds in real-time settings; Rao & Georgeff’s “BDI Agents: From Theory to Practice” emphasizes domains where performance is required under resource-bounded deliberation. 
20

Operationally, commitment strategies often get described as:

Blind/fanatical commitment: persist until believed achieved.
Single-minded: persist until achieved or believed impossible.
Open-minded: allow reconsideration when motivations change.

These are discussed in BDI-related materials and later formal treatments. 
21

Mapping to Supervisor control: implement a “single-minded” Supervisor: once it selects Tutor or Examiner, it stays committed until (a) the subgoal is achieved, or (b) the chosen agent signals it cannot proceed (e.g., repeated SymPy parse failures, repeated retrieval failures), at which point it either switches once or exits.

Practical case studies: how real educational agents end conversations
AutoTutor and Why/AutoTutor

AutoTutor is a long-running research ITS that uses mixed-initiative dialogue in which the system helps the learner construct better answers via feedback, prompts, hints, and summaries. 
5

Termination and progression in Why/AutoTutor is tightly tied to coverage of critical components. The system uses LSA to assess student contributions and track what parts of the ideal answer are missing; when it concludes critical components are covered, it asks whether the student has further questions, requests a recap, provides a summary, and then moves to the next problem or ends the session. 
3

This is directly applicable to CIE‑Copilot’s “content convergence detection”: you need an explicit representation of “what remains to teach/verify,” not just “keep asking.”

AutoTutor’s reported dialogue lengths also illustrate why termination has to be flexible: one reported context suggests 10–20 turns per question, 
4
 while another reports 50–200 turns for a challenging question. 
5
 This supports having both micro-caps (prevent thrash) and macro-caps (allow depth).

Khanmigo

Khanmigo is positioned as a tutor that guides learners to discover answers rather than simply giving them, emphasizing a tutoring style that maintains engagement and critical thinking. 
22

For termination/resource management, Khan Academy explicitly states it limits the amount of interaction per day, because extended sessions can lead to repetitive responses or conversations drifting away from educational purposes; these limits help ensure productive learning sessions. 
12
 Common Sense Media’s product review echoes this rationale, noting observed degeneration in extended interactions and daily limits on interaction. 
13

This is a high-level product analog of what CIE‑Copilot needs at the graph level: when iteration stops being productive, terminate or pause with a user-centered explanation.

Resource budget model for cyclic multi-agent tutoring

A resource budget model should allocate and track:

Compute steps (LangGraph supersteps)
Tokens (LLM input/output; retriever context; tool calls that invoke models)
Latency (wall time)
External tool calls (retrieval, SymPy, web search, etc.)
Budget variables and equations

Let each graph execution be a sequence of agent/tool invocations indexed by ( i ).

( t^{in}_i ): input tokens for call (i)
( t^{out}_i ): output tokens for call (i)
( p^{in} ), ( p^{out} ): per-token prices (per 1M tokens or per token)
( C ): total cost
( B_{hard} ): hard token cap
( B_{soft} ): soft token cap threshold for degradation

Total tokens:

[ T = \sum_i (t^{in}_i + t^{out}_i) ]

Token-priced cost (generic):

[ C = \sum_i \Big( t^{in}_i \cdot p^{in} + t^{out}_i \cdot p^{out} \Big) ]

This model matches how providers describe billing using input/output tokens (OpenAI token-based pricing guidance and per-token billing; 
8
 and Anthropic per-token pricing examples 
10
).

Budget allocation (practical, tutoring-specific)

A simple allocation that works well for cyclic tutoring agents:

Global hard bounds
recursion_limit: caps supersteps (LangGraph’s unit of iteration). 
1
hard_token_cap: caps total tokens across LLM calls.
Per-loop caps
Retrieval retries per query intent (2–4)
SymPy parse/verify retries (2–3)
Supervisor switches per segment (2–4)
Soft-degradation policy
When RemainingSteps low or token budget near soft cap, disable expensive branches (retrieval, multi-pass verification) and exit with best-effort summary. LangGraph’s RemainingSteps is designed exactly for this kind of graceful degradation before hitting recursion limits.

This implies a concrete anti-loop policy:

Attempt sympify only on well-formed canonical strings.
On SympifyError, switch to parse_expr with appropriate transformations (e.g., implicit multiplication).
If still failing after N attempts, stop and request a reformatted expression (or provide an alternative checking route, e.g., numeric substitution checks).

This reduces “retry the same failing parser” loops by changing the method, not repeating it.

Deliverables checklist (as requested):
The report includes a loop trap classification table, a termination condition strategy library, a LangGraph loop-control code template using conditional_edges, visited_nodes, loop_counter, and END, a conversation flowchart with exit paths, and a resource budget model grounded in token-priced API realities and tutoring-system termination literature. 
23
