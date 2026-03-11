# 选题21-DS-ChatGPT

- 原始报告标题：Deep Research Report on Spaced Repetition for CIE‑Copilot Error Book
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:15:33.579Z

Deep Research Report on Spaced Repetition for CIE‑Copilot Error Book

Samsen, this report treats your Error Book as a skill-repair and transfer system (not a flashcard app), and treats next_review_at as the single scheduling “truth” that must remain stable even as you upgrade algorithm sophistication over time. The design recommendations below are anchored in learning-science findings on spacing (distributed practice) and retrieval practice (testing effect), which are both robust across large bodies of evidence. 
1

System goals and learning-science constraints

Your context (Cambridge International A‑Level Mathematics 9709 and Physics 9702, short 15–30 minute study sessions, and 3–6 months of concentrated prep) fits a “high frequency, low duration” review loop where the biggest failure modes are (a) forgetting repaired procedures, and (b) failing to transfer a method to a near-isomorphic exam question. 
2

Two empirical effects are especially load-bearing for a maths/physics Error Book:

Spaced practice (distributed practice) improves long-term retention across hundreds of experiments, and the size of the benefit depends on both the spacing gap and the retention interval (how long until the test). This is not a small or niche effect; it is well established in meta-analytic work. 
1

Retrieval practice (testing effect) improves later retention more than additional restudy in many contexts; importantly, it often looks worse immediately after learning but better after delays (days to weeks). That time-delay reversal matters for exam prep. 
3

A third constraint is review load stability. If your system starts “snowballing” (too many triggered reviews), learner adherence collapses. Queueing analyses of Leitner-style systems suggest there can be sharp transitions in outcomes when adding new items faster than review capacity allows—an important warning for prerequisite-trigger mechanisms. 
4

Scheduling algorithms compared

Below is a practical comparison of the five algorithms you listed, using your requested criteria: retention prediction accuracy, cold start, compute cost, and interpretability. Where rigorous head‑to‑head benchmarking is not strongly established in public literature for a given method, I say so explicitly.

Comparison table
Algorithm	Memory model & “state”	What the rating/outcome must represent	Cold-start behavior	Compute & implementation complexity	Parameter interpretability	Evidence on prediction accuracy / operational impact
SM‑2	Heuristic intervals with an easiness factor (EF) updated from graded performance; classic SuperMemo scheduling. 
5
	Grade must reflect recall success & difficulty (not just “I saw it”). If grades are noisy, EF drifts. 
5
	Simple defaults (initial EF/interval). New item behavior is easy to specify. 
5
	O(1) per review; trivial to implement in SQL. 
5
	High: EF and repetition count are human-readable. 
5
	Widely used; public sources describe the algorithm, but modern large‑scale predictive benchmarks vs trainable models are limited in the canonical SM‑2 description. 
5

FSRS‑5	Explicit latent state: Stability (S) and Difficulty (D); computes Retrievability (R) via a forgetting curve; FSRS‑5 uses 19 parameters in published formulas. 
6
	Rating must represent whether the learner could actually retrieve/perform the target knowledge at review time; misuse of “Hard” vs “Again” is known to distort the signal in real deployments. 
7
	Uses default parameters before personalization. Personalization requires enough review history; guidance is to optimize off your own data, not copy others. 
8
	O(1) per review after state exists; the optimizer/training step is heavier (periodic ML fit). Implementing the full optimizer in SQL is usually not worth it. 
8
	Medium: S/D are interpretable; the parameter vector itself is not. 
6
	Integrated in Anki as an alternative to SM‑2, with a goal that true retention tracks desired retention when configured and optimized. 
9

Leitner System	Box-based heuristic schedule (review difficult items more often, easy items less). 
10
	Binary-ish signal (“knew/didn’t know”) is enough; can be extended but not required. 
11
	Excellent: assigning new items to box 1 is natural, no parameter fitting required. 
11
	Extremely easy to implement; can be done with simple queue rules. 
11
	Very high: boxes are transparent. 
11
	Duolingo reports it originally used a Leitner-like approach, but moved to trainable HLR partly because the Leitner-based meters didn’t reflect learning well. 
12

Ebisu	Bayesian model: Beta prior over recall probability at a reference time; exponential forgetting; updates posterior from quiz outcomes; produces a probabilistic recall estimate. 
13
	Review outcome is modeled as Bernoulli/binomial (“successes out of total”), which can naturally handle repeated attempts in one session or “soft” success. 
13
	Strong if you pick sensible priors; cold start is essentially “your prior assumptions.” 
13
	Moderate: requires Beta-function calculations; still lightweight in most app contexts. In raw SQL, it’s cumbersome unless you push computation to an application service. 
13
	Medium‑high: priors and probabilities are meaningful, but choosing priors is an art. 
13
	The public Ebisu write-up is rigorous mathematically; large-scale operational comparisons are less standardized in public literature than for trainable industrial models. 
13

HRLR (Duolingo)	Predicts a per-item memory half-life using regression features; uses exponential forgetting curve: recall probability depends on time since last practice and half-life. 
12
	Outcome is aggregated as session recall rate in the original formulation; model can use rich features (lexeme tags, learner history). 
12
	Strong: global weights transfer to new items if features exist; you can start predicting immediately without item-specific history (feature-based generalization). 
12
	Training is standard regression; inference is cheap. Needs feature engineering and data pipelines. 
12
	Medium: feature weights are inspectable; overall behavior depends on feature set. 
12
	Duolingo reports >45% error reduction vs baselines for recall prediction, plus measurable operational effects in controlled user experiments (changes in daily retention/engagement). 
12
Key takeaways for CIE‑Copilot

If you want fast, reliable MVP scheduling inside SQL, Leitner or an SM‑2 variant is the simplest path. 
5

If you want modern personalization with a clear target (“keep retention near X”), FSRS‑5 is attractive, but it is only as good as your rating signal quality and your ability to maintain per-item state beyond review_count/last_outcome. 
14

If you can build a robust feature set from your schema (tags, topic paths, mistake types, step patterns), HRLR-style models are a strong long-run fit because they generalize better at cold start than per-item-only heuristics. Duolingo’s published results are one of the clearest industrial demonstrations of that advantage. 
12

Adapting spaced repetition to math and physics error correction

Your central point is correct: for maths/physics, the goal is rarely “remember the answer,” but “reliably execute the method and choose the right method.” This shifts what your rating/outcome must measure.

Redefine what a “review” tests

In vocabulary SRS, “correct” often means recognition or recall of a word translation. In math, a review should test at least one of the following (ideally in separate micro-prompts):

Method selection: Given a problem stem, can the learner pick the correct technique (e.g., substitution vs integration by parts)? Interleaving research in mathematics suggests benefits partly come from strengthening the association between problem types and strategies, not only computation practice. 
15

Procedure execution: Can the learner execute a key substep without the original mistake (e.g., keep sign discipline, apply boundary conditions, track constants)? Retrieval practice supports long-term memory for procedures when learners must actually produce the steps, not just reread them. 
3

Error diagnosis: Can the learner identify why a wrong step is wrong? This is a powerful bridge to generalization because it trains the discrimination of near-miss solutions—an idea that aligns with both tutoring-system design (step-level feedback) and interleaving’s discrimination benefits. 
16

Use a hybrid unit of repetition: item-level + tag-level

Your proposal “organize by error tags rather than single questions” is directionally strong, but it should be hybrid, not pure.

Why tag-level practice can be better than repeating one exact question:

Repeatedly seeing the identical prompt can produce fragile performance that does not transfer; transfer depends on recognizing deep structure, not memorizing a surface form. Research on analogical transfer highlights that surface similarity helps retrieval of a prior example, but structural similarity is what actually supports transferring the solution schema. 
17

Interleaving in math shows benefits consistent with learning to choose the right strategy among alternatives; tag-level decks naturally support this by mixing multiple instantiations of the same mistake pattern across contexts. 
15

Why item-level still matters:

Error diagnosis often requires grounding in the learner’s exact historical wrong step (steps_snapshot). Step-based tutoring research emphasizes context-specific feedback “just when needed,” which is closer to an item-level replay than a generic tag drill. 
16

Recommended structure:

Store one error_book row per lost-mark event (as you do), but generate two derived review views:

“Case replay” (item-level): show the learner’s own wrong step, ask them to (a) label the mistake (tag classification), and (b) correct the next step.

“Pattern drill” (tag-level): sample across the user’s history of the same tag (e.g., integration_constant_omitted) using short synthetic variants so the learner must apply the fix in multiple contexts.

This hybrid approach is an inference from established findings on retrieval practice, interleaving, and transfer, rather than a single definitive “tag decks always win” result. 
3

Make last_outcome reflect “independent performance,” not “assisted success”

If FSRS‑like or even SM‑2-like scheduling is driven by outcomes, then outcomes must be comparable across reviews. A common failure mode in tutoring systems is treating a heavily hinted success as equivalent to an unassisted success, which contaminates the scheduler’s signal. Practical Anki/FSRS guidance similarly stresses that the answer buttons must be used as intended because the scheduler assumes honest signals. 
18

A workable mapping for your enum:

correct: learner completes the target step chain (or solves the isomorphic variant) with no solution reveal, and only minimal hints (e.g., one conceptual nudge).

partial: learner succeeds with substantial scaffolding (multiple hints, or reveals an intermediate step).

wrong: learner cannot proceed even with hints, or repeats the same tagged mistake.

This creates an outcome definition aligned to “retrieval practice,” not “recognition after seeing the solution.” 
3

How to populate difficulty_rating

You asked: AI auto-rating vs learner self-rating, and how that affects SRS.

What research and large-scale practice suggest:

Subjective judgments can be biased; one benefit sometimes reported with interleaving is improved metacognitive calibration (better ability to predict performance), but calibration is not guaranteed—especially under stress. 
19

FSRS practice in the wild explicitly warns against copying parameters and stresses fitting to one’s own review history and content difficulty distribution, implying that “difficulty” is real and must be learned from outcomes rather than guessed once. 
8

Recommended approach for CIE‑Copilot:

Initialize difficulty_rating from AI using observable features you already have: number of steps, algebraic complexity, topic rarity, mark loss magnitude, and mistake tag severity. (This is a modelling design choice; it is not uniquely determined by literature.) 
12

Then update it automatically from behavior. Concretely: treat difficulty_rating as a slowly changing latent variable learned from review outcomes (e.g., exponential moving average of “wrongness,” or a lightweight knowledge-tracing / logistic model at the tag+topic level). The knowledge tracing literature exists precisely to infer mastery from performance over time. 
20

Use learner self-rating only as an auxiliary feature (“confidence”), not as the ground-truth. This mirrors the HRLR philosophy: features are useful, but the model should be trained on actual performance traces. 
12

Knowledge graph–aware review propagation

Your topic_path ltree plus PREREQUISITE_OF edges enables a powerful capability: when repeated errors appear in a node like 9709.P3.Integration.ByParts, the system can schedule reviews of prerequisite nodes like 9709.P1.Differentiation—but only if you avoid a cascade.

Why prerequisite-triggering is justified

Intelligent tutoring systems commonly represent knowledge in fine-grained skills and update “knowledge state” as a learner works; classic Bayesian Knowledge Tracing (BKT) was introduced to model latent mastery from sequences of correct/incorrect opportunities. That makes it a natural conceptual fit for “error density in a node should change what we practice next.” 
20

Cognitive Tutor work explicitly ties together: (a) step-level monitoring (“model tracing”), and (b) selecting next problems based on estimated learning (“knowledge tracing”). Your graph-trigger is a simpler analogue of that idea. 
16

Avoiding avalanche effects

Two independent reasons to implement strict guards:

Queueing analysis of Leitner-like systems suggests outcomes can shift sharply when the system introduces or schedules more items than the learner can process, motivating explicit rate limits and prioritization. 
4

In database terms, if triggers insert too many prerequisite jobs, you end up with backlogs that reduce perceived control and degrade adherence (a common operational problem even in mature SRS deployments). 
12

Concrete trigger rules that are robust

A rule set that is implementable and resistant to cascades:

Define a rolling window statistic per (user_id, topic_path):

topic_recent_wrong = count(error_book reviews with last_outcome='wrong' for that topic in last 14 days)

Trigger condition (your example, made precise):

If topic_recent_wrong >= 3 AND review_count(topic_path) >= 2 (i.e., it’s not just a single first exposure), then create one prerequisite review job.

Depth selection:

Depth cap = 1 by default (direct prerequisites only). Move to depth 2 only if the direct prerequisite itself shows low mastery (see below). This is a design choice aligned with the “rate stability” concern. 
4

Mastery gating:

Maintain p_mastery(user_id, node) with a lightweight BKT-style update or logistic model; only trigger prerequisites where p_mastery < 0.7 (or where the node has not been reviewed in ≥ N days). This mirrors how knowledge tracing is used to decide what is “not yet learned.” 
20

Cooldown and budget:

Cooldown per prerequisite node: once triggered, do not trigger again for 7–14 days.

Daily prerequisite injection budget: e.g., ≤ 2 prerequisite-triggered reviews per day per user (separate from normal due reviews).

These two controls are the practical mechanism to prevent “one error triggers the whole graph.” 
4

What gets scheduled for a prerequisite node?

Do not schedule a generic “review Differentiation” card. Instead schedule a diagnostic micro-set:

1–2 items that test exactly the subskill that supports the downstream method. This mirrors step-based tutoring’s focus: practice the missing step, not the entire unit. 
16

Review task formats and AI scaffolding choices

You asked two linked design questions:

Original error vs isomorphic variant

Full solution vs Socratic (hint-based) guidance

Original error vs isomorphic variant

What the evidence suggests:

Transfer requires recognizing structural similarity between problems; classic work on analogical problem solving shows that noticing and mapping are not automatic, and depend on both surface cues and structural alignment. This supports the idea that generating isomorphic variants can build a transferable schema, not just a memory of one problem statement. 
17

Interleaving studies in mathematics show improved performance when learners practice mixed problem types; the authors argue interleaving helps not only by extra spacing but by strengthening the mapping from problem type to strategy (discrimination learning). This is especially relevant to “choose the method” for 9709/9702 style exam questions. 
15

Recommendation:

Use both, but at different phases of the error lifecycle:

Immediately after the error is detected (same session): use original error replay to repair the exact misconception and close the feedback loop.

In subsequent spaced reviews: bias toward isomorphic variants (new numbers, same structure) so the learner must reconstruct the method, not recall the previous written answer.

A practical mix that matches the research logic is ~30% original replay / ~70% variants after the first day, with occasional original replays when the learner keeps failing the same tag. 
3

Full solutions vs Socratic guidance

This is not “either/or”; it should be faded guidance.

Why not pure discovery for novices:

A well-cited critique argues minimally guided instruction can be inefficient or ineffective for novices because it overloads working memory; structured guidance tends to outperform pure discovery in early learning. 
21

Why not pure solution reveal either:

Productive failure research in mathematics suggests there are benefits when learners attempt to solve problems before instruction, then consolidate with explanation; the mechanism is often described as better preparation to learn from subsequent instruction. 
22

Why “faded” or step-based tutoring is a strong middle ground:

Worked-example research in algebra demonstrates that studying worked examples can substitute for unguided problem solving and improve learning, especially early on; later work synthesizes design principles like prompting self-explanations and using example-problem pairs. 
23

Cognitive Tutor literature describes systems that provide step-level feedback and select tasks based on estimated learning state, connecting directly to what your Tutor Agent + Smart Mark Engine can do. 
16

Operational recommendation for your Tutor Agent:

Adopt a 4-stage scaffold ladder, and define last_outcome relative to the highest stage used:

Attempt (no hints for 20–60 seconds)

Socratic hints (conceptual nudge, then a targeted next-step prompt)

Reveal one step (but not the full solution)

Reveal full solution + require a short “reconstruction” attempt on a variant

Mark correct only if the learner succeeds by stage 1–2; mark partial if stage 3 was needed; mark wrong if stage 4 was reached without independent reconstruction.

This makes the stored outcome compatible with any SRS algorithm that assumes outcomes reflect independent retrieval. 
8

Implementing next_review_at scheduling in Supabase Postgres

This section gives a complete, deployable approach. The core principle is: store review events append-only, and compute the next schedule atomically in a database function. Supabase explicitly supports Postgres functions and calling them from clients via RPC. 
24

Data model additions that make scheduling reliable

Your current error_book schema has only review_count, last_outcome, and next_review_at. That is enough for Leitner, but not enough for faithful SM‑2 / FSRS / Ebisu because those require per-item parameters (EF, interval, stability, priors). 
5

Add two tables:

error_review_event: append-only log (enables analytics, model fitting, audits)

error_srs_state: per-error scheduling state (algorithm-specific fields)

Also ensure your topic_path uses the ltree extension (you already do); Postgres documents indexing and querying ltree hierarchies. 
25

SQL schema and indexes
sql
复制
-- Extensions (enable only if not already enabled)
create extension if not exists ltree;

-- Optional: UUID helpers depend on your Postgres version.
-- Supabase has uuid-ossp enabled by default (per docs).
-- create extension if not exists "uuid-ossp";

-- 1) Append-only review events
create table if not exists public.error_review_event (
  review_id uuid primary key default gen_random_uuid(),
  error_id uuid not null references public.error_book(error_id) on delete cascade,
  user_id uuid not null,
  reviewed_at timestamptz not null default now(),
  outcome text not null check (outcome in ('correct','partial','wrong')),
  prompt_type text not null default 'isomorphic'
    check (prompt_type in ('original','isomorphic','tag_drill')),
  hints_used int not null default 0 check (hints_used >= 0),
  seconds_spent int null check (seconds_spent is null or seconds_spent >= 0)
);

-- 2) Per-error scheduler state (start with SM-2-compatible fields)
create table if not exists public.error_srs_state (
  error_id uuid primary key references public.error_book(error_id) on delete cascade,
  algorithm text not null default 'sm2' check (algorithm in ('sm2','leitner')),
  ease_factor double precision not null default 2.5,   -- SM-2 EF
  interval_days int not null default 0,                -- days until next review
  repetition int not null default 0,                   -- SM-2 repetition count (n)
  lapse_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- Query performance: due reviews
create index if not exists idx_error_book_due
  on public.error_book(user_id, next_review_at);

-- Topic aggregation
create index if not exists idx_error_book_topic
  on public.error_book(user_id, topic_path);

-- ltree index (GiST common)
create index if not exists idx_error_book_topic_gist
  on public.error_book using gist (topic_path);


Notes on why these choices are standard:

Supabase’s documentation positions database functions as first-class and callable via RPC. 
24

Postgres documents ltree as a trusted extension for hierarchical paths with indexing support. 
25

Atomic scheduling function that updates next_review_at

This function:

Locks the target error_book row

Logs the review event

Updates SM‑2 state

Computes and writes next_review_at

It uses auth.uid() as the caller identity, aligned with Supabase RLS patterns. 
26

sql
复制
create or replace function public.record_error_review(
  p_error_id uuid,
  p_outcome text,
  p_prompt_type text default 'isomorphic',
  p_hints_used int default 0,
  p_seconds_spent int default null,
  p_reviewed_at timestamptz default now()
)
returns public.error_book
language plpgsql
as $$
declare
  v_uid uuid;
  v_book public.error_book;
  v_state public.error_srs_state;

  -- Map your 3 outcomes to an SM-2-ish 0..5 quality score.
  -- Here: wrong=1, partial=3, correct=4 (tunable)
  q int;

  -- Interval and EF variables
  ef double precision;
  n int;
  interval_days int;

  -- Difficulty adjustment (0..1) -> mild multiplier
  diff double precision;
  diff_mult double precision;
begin
  if p_outcome not in ('correct','partial','wrong') then
    raise exception 'Invalid outcome: %', p_outcome;
  end if;

  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the error row (prevents concurrent scheduling races)
  select *
    into v_book
  from public.error_book
  where error_id = p_error_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'Error not found or not owned by user';
  end if;

  -- Ensure state row exists and lock it
  insert into public.error_srs_state(error_id)
  values (p_error_id)
  on conflict (error_id) do nothing;

  select *
    into v_state
  from public.error_srs_state
  where error_id = p_error_id
  for update;

  -- Log the review event (append-only)
  insert into public.error_review_event(
    error_id, user_id, reviewed_at, outcome, prompt_type, hints_used, seconds_spent
  )
  values (
    p_error_id, v_uid, p_reviewed_at, p_outcome, p_prompt_type, p_hints_used, p_seconds_spent
  );

  -- Outcome -> quality score (SM-2 expects higher means better)
  q := case p_outcome
    when 'wrong' then 1
    when 'partial' then 3
    when 'correct' then 4
  end;

  ef := v_state.ease_factor;
  n := v_state.repetition;
  interval_days := v_state.interval_days;

  -- Mild difficulty multiplier from your difficulty_rating (0..1)
  diff := greatest(0.0, least(1.0, coalesce(v_book.difficulty_rating, 0.5)));
  -- Harder -> smaller multiplier, easier -> larger
  diff_mult := 1.15 - 0.30 * diff;  -- range roughly [0.85, 1.15]

  if q < 3 then
    -- Failure: reset repetition; schedule soon
    n := 0;
    interval_days := greatest(1, floor(1 * diff_mult)::int);
    ef := greatest(1.3, ef - 0.20);  -- conservative penalty
  else
    -- Success: update EF (classic SM-2 form)
    ef := ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    ef := greatest(1.3, ef);

    if n = 0 then
      interval_days := greatest(1, floor(1 * diff_mult)::int);
    elsif n = 1 then
      interval_days := greatest(2, floor(6 * diff_mult)::int);
    else
      interval_days := greatest(2, floor(interval_days * ef * diff_mult)::int);
    end if;

    n := n + 1;
  end if;

  update public.error_srs_state
    set ease_factor = ef,
        interval_days = interval_days,
        repetition = n,
        lapse_count = lapse_count + case when q < 3 then 1 else 0 end,
        updated_at = now()
  where error_id = p_error_id;

  update public.error_book
    set review_count = coalesce(review_count, 0) + 1,
        last_outcome = p_outcome::text,
        next_review_at = p_reviewed_at + make_interval(days => interval_days)
  where error_id = p_error_id
  returning * into v_book;

  return v_book;
end;
$$;


Why this structure is robust on Supabase:

Supabase documents creating database functions and calling them via RPC from clients. 
24

Supabase’s RLS guidance explicitly uses (select auth.uid()) patterns and acknowledges auth.uid() as the identity primitive for policies; using auth.uid() inside the function aligns with that ecosystem assumption. 
26

Selecting due reviews efficiently

Your session planner can fetch due items with:

sql
复制
select *
from public.error_book
where user_id = auth.uid()
  and next_review_at <= now()
order by next_review_at asc
limit 30;


If you later add background workers (e.g., to pre-generate synthetic variants), use Postgres’s row-locking clause FOR UPDATE ... SKIP LOCKED as documented, so multiple workers can safely claim jobs without blocking. 
27

Where FSRS‑5 fits in this architecture

This SQL-first SM‑2 variant is your “stable backbone.” You can later swap the error_srs_state columns to FSRS state (S, D) and compute intervals using FSRS formulas, but you will still keep the same transaction shape:

Lock item → log event → update state → write next_review_at.

That atomic shape is valuable regardless of algorithm. 
6

If you do adopt FSRS-style desired retention, note that Anki’s documentation frames FSRS as targeting desired retention and recommends periodic optimization based on your own history, implying you should keep your review event log and fit parameters from it (which error_review_event enables). 
14

Optional: cron-based maintenance jobs

If you want “precompute prerequisite triggers nightly” or “rebalance tomorrow’s workload,” Supabase documents pg_cron / Supabase Cron for recurring jobs inside Postgres. 
28

For example: schedule a daily job that flags overloaded users and caps triggered prerequisite jobs (implementation depends on your job table design). 
28
