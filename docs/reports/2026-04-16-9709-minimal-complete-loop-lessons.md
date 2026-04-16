# 9709 Minimal Complete Loop Lessons Learned

Date: 2026-04-16
Scope: lessons from taking the `9709` pilot from "real execution but still red" to a true local minimal complete loop

## Why This Document Exists

The `9709` work went through several distinct phases:

1. framework code landed
2. the first real VLM run happened
3. the first real VLM run still produced unusable downstream outputs
4. VLM routing/prompt behavior was corrected
5. downstream hydration was corrected
6. local closure execution was productized
7. fresh local rerun finally turned the focused gate green

This document records the practical lessons from that sequence so the next slice does not have to rediscover them under pressure.

## The Minimal Complete Loop Definition That Finally Worked

For this pilot, "minimal complete loop" only counted if all of the following were true:

1. real question images had already produced real structured VLM evidence
2. that evidence could be bundled in a replayable machine-consumable form
3. paper-backed rows could be hydrated from those bundles
4. the search projection could answer the pinned gate cases
5. the focused gate rerun was green in a real local environment

Anything short of that was still a partial success, not a closure.

In practice, this definition was useful because it prevented two failure modes:

- calling the slice done too early just because the VLM outputs looked better
- calling the slice done too early just because one local SQL probe looked right

It also forced a cleaner question on every iteration:

- "what exact contract is still broken right now?"

That question was more useful than asking vaguely whether the whole system was "working."

## What Initially Went Wrong

### 1. The first real VLM run disproved the wrong hypothesis

The first live run proved something important:

- provider transport was not the problem

All `17/17` calls succeeded, but `17/17` returned empty-shell outputs. That meant the issue was not "the API failed" or "the model cannot see images." The issue was route + prompt + runner interaction.

This was the first major correction in thinking.

### 2. Unknown surface was incorrectly treated as review-only

The initial router behavior sent unknown-surface rows straight into pure `review_lane` triage. That was the wrong abstraction.

Why it failed:

- unknown surface is a routing uncertainty
- it is not evidence that extraction should be skipped

The result was predictable in hindsight:

- the model produced review/triage posture
- the runner consumed `review_summary`
- downstream got almost no usable structure

The key design correction was:

> unknown surface should trigger extraction-first, not extraction-skipping

### 3. We kept discovering that "the blocker moved downstream"

After the VLM hotfix, the next red state was no longer visual extraction. It became:

- paper-backed hydration gaps
- projection fallback gaps
- search text not retrieval-oriented enough

This mattered because the correct response was not "keep tuning VLM." The correct response was to move one layer downstream and fix the next broken contract.

## The Most Important Decision Adjustments

### Decision change 1: treat VLM as eyes, not as the whole pipeline

This became the stable principle for the whole slice:

- VLM is responsible for looking
- AO or deterministic downstream logic is responsible for thinking

That principle sounds obvious, but it became enforceable only after the VLM outputs were kept structured and replayable instead of being allowed to collapse into long-form free text.

### Decision change 2: optimize for replayability, not single-run cleverness

The right output was not "a model answer that sounds intelligent."

The right output was:

- stable JSON
- lane-specific schema
- evidence that can be replayed later
- provenance that can survive runner refactors

That is what made the later downstream fixes possible without redoing the whole VLM run.

### Decision change 3: stop treating local execution as an afterthought

Earlier in the slice, the local execution path was too improvised:

- WSL for some things
- host PowerShell for others
- ad hoc `docker exec ... psql`
- no single command that expressed the full closure

The later productization work corrected that. Once the closure runner existed, the remaining issues became visible as precise execution-surface defects instead of vague "local environment weirdness."

### Decision change 4: mixed execution surfaces are acceptable when they reflect reality

Trying to force every local step through WSL would have been the wrong optimization.

The facts in this session were:

- WSL could not reliably hit local `127.0.0.1:54322`
- host PowerShell could
- Docker-backed `psql` worked reliably from WSL

So the correct decision was not architectural purity. The correct decision was:

- host PowerShell where local Postgres connectivity was needed
- WSL + Docker where container-backed SQL execution was more reliable

That made the runner uglier than a pure single-surface solution, but it made it honest and dependable.

### Decision change 5: closure quality matters more than closure aesthetics

Several points in this effort presented a tempting but wrong trade-off:

- keep the code path aesthetically uniform but operationally brittle
- or accept a narrower, slightly awkward closure path that actually reruns

The correct choice for this pilot was the second one.

That is why the eventual solution includes things like:

- Windows-host PowerShell wrappers
- Docker-backed `psql` invocation from WSL
- PG-compat hardening targeted at the exact tables used by the closure path

None of those choices are particularly elegant in isolation. Together, they created a repeatable honest path, which mattered more.

## The Hardest Practical Difficulties

### 1. The dirty main worktree kept blocking normal Git operations

The repo already had many unrelated untracked files. Those were not part of the `9709` task and should not be cleaned up just to make push easier.

What worked:

- use temporary clean worktrees for pushing

What did not work:

- pretending the dirty workspace should be normalized as part of the hotfix

Lesson:

- when the repo is shared and noisy, isolate push mechanics instead of "cleaning up" somebody else's files

### 2. The local Supabase CLI path was not trustworthy

Even after explicit approval, `supabase db reset` was not the thing that failed first. The CLI wrapper path itself broke inside the `npx`/postinstall flow.

That matters because it changes the debugging posture:

- the problem was not immediately "database reset failed"
- the problem was "the CLI delivery mechanism is unreliable in this shell"

What worked:

- inspect the local migration table directly through Docker
- apply the exact missing `202604*` migrations directly

Lesson:

- if the purpose is to bring schema to the current contract, target that purpose directly
- do not let a broken convenience wrapper block the whole closure

### 3. `SUPABASE_PG_COMPAT` was good enough for earlier slices, but not for this one

This was a good example of a subtle trap.

The compatibility layer already existed, so it was easy to assume it was broadly ready. It was not.

The real closure run surfaced two concrete missing pieces:

- `.is(...)` query chaining
- JSONB binding for the exact tables used in the closure path

Lesson:

- "worked for previous scripts" does not mean "worked for the current live path"
- the live path still has to be driven until the next real missing method or type binding appears

### 4. "Green gate" and "good documentation" are separate jobs

Once the technical loop finally closed, there was still a second problem:

- without a written boundary, people could easily overclaim what `9709` had proven

Examples of likely confusion if this is not documented explicitly:

- mistaking "minimal complete loop achieved" for "full 9709 generalization complete"
- mistaking "hotfix branch is green" for "main already contains the whole result"
- mistaking "diagram lane exists" for "diagram lane has already been broadly validated"

Lesson:

- after a pilot turns green, documentation has to narrow the claim before future planning broadens it again

## The Sequence That Actually Worked

The sequence that finally closed the loop was:

1. fix VLM routing/prompt behavior so the evidence surface is real
2. prove the downstream hydration gap separately
3. implement evidence-driven paper-backed hydration
4. productize a full local closure runner
5. run that runner and let it expose the real execution-surface gaps
6. fix those gaps one by one until the runner completes and the gate turns green

This sequence is worth preserving because it kept the investigation layered:

- first visual evidence
- then data hydration
- then local execution
- then runtime compatibility defects

At no point did the successful path require broad refactoring.

What changed repeatedly was not scope size, but diagnostic precision.

The team stopped saying:

- "9709 is still broken"

and started saying more exact things like:

- "VLM transport is fine, but unknown surface is short-circuiting extraction"
- "VLM evidence is now usable, but paper-backed hydration is still too narrow"
- "hydration is fixed, but the real local rerun still exposes PG-compat defects"

That precision is one of the main reasons the slice eventually closed.

## What Was Deliberately Not Done

Several tempting moves were correctly rejected:

### 1. We did not push final logical topic reasoning back into the VLM

That would have made the outputs harder to audit and harder to replay.

### 2. We did not rely on manually filling every manifest surface flag

Manifest hints remained useful, but they were not allowed to become the only working mode.

### 3. We did not broaden the task into a generic all-subject framework before `9709` closed

That would have diluted the effort and made it harder to know whether anything concrete was actually fixed.

### 4. We did not fake a green result while the local closure runner was still failing

This mattered several times:

- when the earlier gate was still red
- when local schema was stale
- when `SUPABASE_PG_COMPAT` was still missing JSONB bindings

The slice only counted as closed once the fresh local runner actually completed end to end.

## Practical Playbook For The Next Slice

If a similar pilot needs to be recovered again, the recommended order is:

1. establish whether the failure is provider, route/prompt, runner, hydration, or gate
2. freeze one real VLM evidence artifact before trying to generalize anything
3. insist on structured replayable evidence bundles
4. productize the local closure command before claiming the slice is near complete
5. run the closure command and let it reveal the next real blocker
6. fix compatibility and environment edges only when the real closure path forces them

## What To Repeat And What To Avoid Next Time

### Repeat

- freeze one real evidence artifact early and keep it reusable
- keep VLM outputs structured enough that downstream logic can remain deterministic
- define success as a rerunnable closure command plus a real gate result
- let the real execution path reveal infra defects instead of trying to predict them abstractly

### Avoid

- tuning prompts for too long after evidence is already clearly non-empty
- broadening scope before one pilot slice has an honest green result
- assuming an existing compatibility layer is sufficient without driving the real path
- treating local-environment friction as "just setup noise" when it directly blocks reruns

## Preflight Checklist For Future AO Work

Before AO takes the next similar slice, it should check:

### Evidence posture

- is there at least one checked-in real VLM evidence artifact worth reusing?
- is lane distribution reasonable, or did everything collapse into review?
- are summary/ocr/formula/diagram surfaces actually non-empty?

### Data posture

- do `paper_question` rows exist?
- do curriculum nodes exist for the frozen pilot topic paths?
- can projection rows surface `year`, `session`, `paper_number`, `summary`, and `search_text`?

### Execution posture

- which steps must run in WSL?
- which steps must run on the Windows host?
- does the local DB already have the required migrations?
- is `SUPABASE_PG_COMPAT` actually sufficient for the tables touched by the target slice?

### Completion posture

- is there a single closure command?
- has that command completed end to end?
- did the real gate turn green?

## Final Lessons

The most important lessons from `9709` were:

1. real evidence can exist while the slice is still red
2. once VLM evidence is real, most remaining failures become contract and execution-surface problems
3. a local closure runner is not optional if the goal is honest completion
4. environment debugging should be driven by the real closure path, not by guesswork
5. the smallest honest green loop is much more valuable than a larger half-working architecture

### Additional closing lesson

The last mile was not won by a single clever idea.

It was won by refusing to lose boundary discipline:

- fix only the next real broken contract
- keep artifacts replayable
- do not overclaim success until the gate actually passes
- do not broaden the story until the pilot is honestly closed

## Bottom Line

The `9709` slice succeeded because the work stopped trying to solve everything at once.

It solved the smallest real chain that mattered:

- see the question
- keep the evidence structured
- hydrate paper-backed rows
- answer the gate

That is the pattern worth reusing.
