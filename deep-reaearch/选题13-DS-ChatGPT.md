# 选题13-DS-ChatGPT

- 原始报告标题：CIE-Copilot Privacy & SaaS Compliance Deep Research Report
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:08:24.209Z

CIE-Copilot Privacy & SaaS Compliance Deep Research Report
Executive framing for risk and compliance architecture

CIE‑Copilot processes children’s / minor students’ learning data (ages ~16–19) across multiple jurisdictions, plus full conversational content (LangGraph checkpoints and prompt/response logs) for debugging and “conversation recovery.” In privacy‑law terms, this combination typically elevates the system into a high‑risk profile because it involves (a) children’s data, and (b) innovative technology (AI) used to analyze or assess individuals’ learning behavior (profiling-like effects). The UK regulator (ICO) explicitly flags processing involving innovative technologies (including AI) as a common DPIA trigger and expects DPIAs for processing likely to result in high risk. 
1

In addition, your current design includes: (1) long retention of full conversation state (“checkpoints”), (2) educational weakness data (error book + misconceptions), (3) cross-border vendor processing (OpenAI/Anthropic APIs), and (4) a foreseeable B2B school dashboard which adds role-based access and aggregation constraints. These elements map directly to core legal obligations in each market (purpose limitation / reasonable purposes, security, retention minimization, and data subject rights), and they also drive architectural requirements such as strict multi-tenant isolation, auditability, and deletion-by-design. 
2

Regulatory applicability and obligation matrix
Applicability and special rules for minors

For the UK market, the relevant framework is the UK GDPR + Data Protection Act 2018 (DPA 2018). The DPA 2018 explicitly modifies GDPR Article 8 child-consent rules so that references to “16 years” become “13 years” for information society services, with a carve‑out for preventive/counselling services. 
3
 The ICO also states that, in its children’s guidance, “child” means anyone under 18 for UK GDPR purposes. 
4

For Singapore, the PDPC’s 2024 Advisory Guidelines define “child” as below 18, and set a consent approach where 13–17 may give valid consent when policies/terms are readily understandable, while below 13 requires parent/guardian consent. 
5
 These guidelines are particularly relevant because they explicitly include EdTech in scope. 
5

For Hong Kong and Malaysia, the statutes do not create a single “digital consent age” equivalent to UK/Singapore’s ISS rules in the same way; instead, operational expectations come from the general principles and regulator guidance. In Hong Kong, PCPD guidance for children emphasizes minimizing collection, encouraging parental involvement (especially for younger children), and making deletion/account removal easy and understandable. 
6
 In Malaysia, the PDPA defines “relevant person” so that where a data subject is below 18, the parent/guardian (or person with parental responsibility) can act in that role (e.g., for access/correction requests). 
7

For Mainland China expansion, the PIPL applies extraterritorially when processing is to provide products/services to individuals in China or analyze/assess their activities. 
8
 Under PIPL, personal information of minors under 14 is classified as sensitive personal information and requires separate consent, plus guardian consent and specialized handling rules. 
8

Obligation matrix

The table below summarizes the most “load‑bearing” obligations that directly affect your product design and operations.

Obligation area	UK GDPR + DPA 2018	Singapore PDPA (2012 + amendments in force)	Hong Kong PDPO	Malaysia PDPA 2010	China PIPL
Children / minor rules (16–18)	Child is under 18 in ICO guidance. 
4
 For ISS relying on consent: DPA 2018 sets 13 as threshold (16→13). 
3
 Children’s Code (Age‑Appropriate Design Code) applies to ISS likely accessed by children and contains 15 standards. 
9
	PDPC children guidelines: 13–17 may consent if understandable; <13 parent/guardian consent; child-friendly notices. 
5
	No single statutory “digital consent age” in PDPO; regulator guidance urges age‑appropriate collection, restrictive defaults, parental involvement, and easy deletion. 
6
	Act defines parent/guardian as “relevant person” where data subject is <18 (notably for rights handling). 
7
	<14 is “sensitive PI”; must obtain guardian consent and set specialized rules. 
8

Core processing principles	Children merit particular protection; Children’s Code expects “best interests” and age-appropriate design for services likely accessed by children. 
9
	PDPC defines 11 obligations including purpose limitation, protection, retention limitation, transfer limitation, breach notification, etc. 
10
	PDPO’s DPPs: lawful/fair collection; not excessive; retention not longer than necessary; use limited to original purpose unless consent; security; openness; access/correction. 
2
	Seven principles including General (consent), Notice & Choice, Disclosure, Security, Retention, Data Integrity, Access. 
7
	PIPL requires legality/propriety/necessity; data minimization (“smallest scope”); transparency; shortest necessary retention. 
8

Processor / vendor controls	UK GDPR requires controller‑processor contracts and accountability; ICO contract guidance highlights required content and subprocessor controls. 
11
	PDPA has accountability and protection obligations; cross-border transfers must ensure comparable protection. 
10
	Data processors not directly regulated; data users must ensure processors meet applicable security/retention requirements via contract/other means. 
2
	If a data processor processes for a data user, the data user must ensure the processor provides sufficient security guarantees and complies. 
7
	Entrustment requires agreements specifying purpose, duration, methods, categories, protection measures, and supervision; entrusted party must return/delete upon termination. 
8

International / cross-border transfer	UK regime requires appropriate transfer safeguards and transfer risk assessment for restricted transfers (ICO TRA guidance). 
12
	Transfer Limitation Obligation: must ensure comparable protection for overseas transfers; PDPC guidance explains the obligation. 
13
	PDPO section 33 transfer restriction is not yet effective; PCPD publishes guidance to prepare for it. 
14
	Section 129 restricts transfers outside Malaysia; permits transfers to places on a whitelist / adequacy-like basis and allows certain exceptions (incl. consent). 
7
	Cross-border provision requires specific mechanisms (security assessment, certification, standard contract, etc.) and separate consent + notice of foreign recipient; certain processors must localize at thresholds. 
8

Breach notification	Must notify ICO within 72 hours where feasible for notifiable breaches; inform individuals without undue delay if high risk. 
15
	PDPA includes Data Breach Notification Obligation; PDPC provides breach management guidance. 
10
	No single blanket statutory breach notification duty, but PCPD guidance recommends notifying PCPD and affected data subjects as soon as practicable, especially when real risk of harm. 
16
	The Department / Commissioner has published DBN guidance/circulars (details should be confirmed against the latest amended Act and official commencement). 
17
	PIPL requires incident response planning and impact assessments for sensitive/automated/cross-border scenarios; regulators have oversight. 
8

DPIA / impact assessment	DPIA required for processing likely to be high risk; ICO calls out innovative tech including AI. 
1
	DPIA is not a statutory PDPA obligation, but PDPC encourages DPIAs for children-focused digital services (children guidelines). 
5
	PCPD provides PIA-related guidance in its publication ecosystem; not equivalent to GDPR DPIA mandate, but used as best practice. 
18
	PDPA is principle-based; impact assessments are best practice but not framed as GDPR-style DPIA in the base Act text. 
7
	PIPL requires “personal information protection impact assessment” for sensitive PI, automated decision-making, providing abroad, etc., and requires keeping reports/records at least 3 years. 
8

Erasure / deletion rights	Right to erasure request exists; controllers generally must respond within one month. 
19
	Retention limitation: cease retention/dispose when no longer needed; portability obligation is planned but not yet effective per PDPC’s overview. 
10
	DPP2 retention limitation; Section 26 requires erasing data no longer required (subject to exceptions). 
2
	Retention principle: not kept longer than necessary; duty to destroy/permanently delete when no longer required. 
7
	PIPL requires deletion when purpose achieved/expired, services cease, consent withdrawn, or unlawful processing; if deletion technically hard, must stop processing except storage + security. 
8

Practical “16–18” takeaway: For your primary demographic (16–18), parental consent is generally not mandatory in the UK (ISS consent threshold is 13) and in Singapore (PDPC considers 13–17 can consent if policies are understandable), but you still need child-appropriate transparency and protective defaults (UK Children’s Code; PDPC children guidance). 
3
 In Mainland China, the strict guardian consent trigger is under 14; your 16–18 cohort is outside that specific threshold, though the system still processes minors’ data and must comply with general PIPL principles and rights. 
8

Four-level data classification system and complete field mapping
Four-level scheme designed for education AI

The system below is tuned for a tutoring platform where (a) students are minors, and (b) educational performance signals can be sensitive when linked to identity.

Level	Definition	Storage location rules	Encryption rules	Default retention	Default access model
Level one	Public or truly anonymized telemetry (no re-identification path)	Analytics store or separate DB schema; must not be joinable to user_id	Standard at-rest + TLS in transit	Long-lived OK if truly anonymized	Product/BI readers; no student/teacher row-level exposure needed
Level two	Operational metadata with low sensitivity (still internal-only)	Primary Postgres allowed	At-rest + TLS; column encryption optional	Short-to-medium (e.g., 90–180d)	Engineering/ops on least privilege; audited access
Level three	Identifiable student personal data (education profile signals), but not full free-text conversation	Primary Postgres with strict RLS	At-rest + TLS; consider field-level encryption for certain columns	Service-delivery window (e.g., account lifetime + short grace)	Student-self access; tightly controlled support access
Level four	Highly sensitive: full conversation content, detailed learning weaknesses, uploads, and any data used for automated inference decisions	Separate schema/table set; optional separate database; avoid “shared logs” systems	At-rest + TLS plus field-level encryption (app-managed keys) recommended	Minimize; prefer 7–30d for raw text unless explicit opt-in	Student-self plus “break-glass” support; no teacher access to raw content

This scheme is aligned with retention-minimization expectations across your markets: PDPO DPP2 says data should not be kept longer than necessary and Section 26 requires erasure when no longer required; Malaysia PDPA retention principle requires not keeping longer than necessary and destroying/permanently deleting when no longer required; PIPL requires the shortest necessary retention period. 
2

Field-level mapping for your specific tables and logs
Data object / field	Proposed level	Why	Special handling notes
student_state.current_topic_path	Level three	Education progress tied to user_id is personal data; can reveal strengths/weaknesses	Safe for teacher aggregates only (counts)
student_state.mastery (float per node)	Level three	Performance signal; becomes sensitive when linked to identity	Consider “minimum necessary granularity” for teacher views
student_state.misconceptions (tags array)	Level four (or high Level three)	“Weakness labels” can be stigmatizing and are central to profile/assessment	Treat as sensitive education record; aggregate only for teachers
student_state.mode (TUTOR/EXAMINER)	Level two–three	Lower sensitivity alone; becomes personal when linked to identity	Keep with student_state under RLS anyway
checkpoints.state_blob (full LangGraph state incl. full dialogue history)	Level four	Full conversational content + reasoning traces; highest disclosure risk	Strongly recommend short retention and/or summarization compaction; otherwise DPIA risk driver 
1

error_book (problem ref/upload, root-cause tags, notes, next review time)	Level four	Detailed education records/weaknesses + user-created free text	Teacher aggregation must not reveal individual rows
Conversation logs (all prompts + responses for debugging/QA)	Level four	Raw text can include identity, sensitive personal info, or third-party info	Consider redaction + strict TTL and access logging
BYOC upload raw text (ephemeral only)	Level four while in processing	Even if not persisted, it is processed; content may include sensitive/third-party info	Ensure staging storage has TTL + encryption; prevent accidental logging
Anonymous usage stats	Level one (if truly anonymized)	No re-identification path	Ensure no “small cell” leakage in reports (k-anonymity style thresholds)

Singapore’s PDPC guidance requires child-appropriate communication and consent mechanics (especially for 13–17 vs <13) and encourages DPIAs for products likely to be accessed by children. 
5
 That makes Level four controls (minimized retention + audited access + strong encryption) particularly important for checkpoints and prompt/response logs.

Supabase RLS strategy for strict isolation, teacher aggregation, and AI worker least privilege
Non-negotiables in Supabase security posture

Supabase’s documentation emphasizes that RLS is the primary way to secure data in exposed schemas, and a client using the service role key will always bypass RLS—which is dangerous for any workload that should remain least-privilege. 
20

You should therefore treat the “AI worker” and any analytics/job services as separate security principals with explicit, auditable permissions, and avoid using the service role key for ordinary data access. 
21

Base schema assumptions

To implement teacher aggregation without exposing student rows, you need an explicit “authorization spine”:

user_profiles(user_id uuid primary key, role text, school_id uuid, …)
student_state(user_id uuid, school_id uuid, …)
error_book(id uuid, user_id uuid, school_id uuid, …)
checkpoints(id uuid, user_id uuid, school_id uuid, state_blob jsonb/text, …)
misconception_aggregates(school_id uuid, topic_path text, misconception_tag text, count int, updated_at timestamptz, …)
This table is computed offline (batch job) or via a security-definer function so teachers never read raw student rows.

This pattern matches Hong Kong PDPO’s stance that processors are not directly regulated and the “data user” must ensure protection via contractual/other means; similarly Malaysia’s Security Principle explicitly considers secure transfer and personnel access controls. 
2

RLS policy SQL examples

The SQL below focuses on the core requirements you asked for. (Placeholders like public. may vary by your schema.)

Student self-only tables: student_state, checkpoints, error_book
sql
复制
-- 1) Enable RLS
alter table public.student_state enable row level security;
alter table public.checkpoints  enable row level security;
alter table public.error_book    enable row level security;

-- 2) STUDENT: read own rows
create policy student_read_own_state
on public.student_state
for select
to authenticated
using (auth.uid() = user_id);

create policy student_read_own_checkpoints
on public.checkpoints
for select
to authenticated
using (auth.uid() = user_id);

create policy student_read_own_error_book
on public.error_book
for select
to authenticated
using (auth.uid() = user_id);

-- 3) STUDENT: write/update own rows
create policy student_upsert_own_state
on public.student_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy student_update_own_state
on public.student_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy student_insert_own_error_book
on public.error_book
for insert
to authenticated
with check (auth.uid() = user_id);

create policy student_update_own_error_book
on public.error_book
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy student_delete_own_error_book
on public.error_book
for delete
to authenticated
using (auth.uid() = user_id);

create policy student_delete_own_checkpoints
on public.checkpoints
for delete
to authenticated
using (auth.uid() = user_id);


These policies directly implement “personal data isolation” and are consistent with the basic principle in multiple regimes that personal data access must be controlled and secure (e.g., PDPO DPP4 security). 
2

Teacher view: aggregated-only access
sql
复制
alter table public.misconception_aggregates enable row level security;

create policy teacher_read_own_school_aggregates
on public.misconception_aggregates
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles p
    where p.user_id = auth.uid()
      and p.role = 'teacher'
      and p.school_id = misconception_aggregates.school_id
  )
);


Key idea: teachers only query misconception_aggregates, never checkpoints or raw error_book. This supports your business goal (“teacher sees class misconceptions”) while preventing disclosure of raw dialogue/state, which is particularly sensitive for minors. The approach also aligns with the PCPD’s guidance that default settings and disclosure should be restrictive for children, and child-facing deletion should be easy. 
6

AI worker: “job-scoped” access under least privilege

Because a Supabase service role key bypasses RLS 
21
, the most defensible pattern is to make the worker consume job-scoped snapshots rather than read broad student tables.

A practical structure:

ai_jobs(id uuid, user_id uuid, school_id uuid, prompt_snapshot jsonb, status text, created_at, expires_at, …)
A short-lived worker JWT includes job_id (custom claim) and an application role (e.g., app_role=ai_worker).
sql
复制
alter table public.ai_jobs enable row level security;

-- Worker can SELECT only the one job referenced in its JWT.
create policy ai_worker_read_one_job
on public.ai_jobs
for select
to authenticated
using (
  (auth.jwt() ->> 'app_role') = 'ai_worker'
  and (auth.jwt() ->> 'job_id')::uuid = id
);

-- Worker can UPDATE only that same job row (e.g., write result/status).
create policy ai_worker_update_one_job
on public.ai_jobs
for update
to authenticated
using (
  (auth.jwt() ->> 'app_role') = 'ai_worker'
  and (auth.jwt() ->> 'job_id')::uuid = id
)
with check (
  (auth.jwt() ->> 'app_role') = 'ai_worker'
  and (auth.jwt() ->> 'job_id')::uuid = id
);


This design ensures the worker only sees the minimal data needed to produce an answer and avoids broad read access to historical conversation state—important given children’s heightened protection expectations in the UK Children’s Code. 
9

Third-party LLM API processing: DPA needs, retention controls, and vendor selection
OpenAI API platform

Do you need a DPA? Under UK GDPR-style controller/processor governance, you generally need an Article 28–type processor agreement for vendors processing personal data on your behalf; ICO stresses controller‑processor contracts as part of accountability. 
11
 OpenAI publishes a Data Processing Addendum stating that OpenAI acts as a Data Processor processing “Customer Data” on the customer’s behalf. 
22

Retention and Zero Data Retention (ZDR): OpenAI’s platform documentation provides endpoint-level detail. For common stateless endpoints like /v1/chat/completions and /v1/responses, the table indicates no training use and 30-day abuse monitoring retention, and explains that ZDR-eligible endpoints will not store data when ZDR is enabled; it also notes that when ZDR is enabled, the store parameter is treated as false. 
23

Critical risk for your current design: Some OpenAI capabilities (notably “stateful” objects for Assistants/Threads/Vector Stores/Conversations) can be retained until deleted, and objects “not deleted … are retained indefinitely.” 
23
 This interacts badly with your own plan to store long-lived LangGraph checkpoints; if you also use vendor-side stateful storage, deletion compliance becomes much harder.

Implication for CIE‑Copilot: If you stay on OpenAI’s API platform, prefer stateless calls (/v1/responses or /v1/chat/completions) with storage disabled, and avoid endpoints where retention is “until deleted” unless your deletion workflows are mature. 
23

Azure OpenAI (Azure Direct Models in Microsoft Foundry)

Microsoft provides unusually explicit statements about data isolation and training use. The official documentation states customer prompts/outputs:

are not available to other customers,
are not available to OpenAI,
are not used to train foundation models without permission, and
stored data is encrypted at rest (AES‑256) with an option for customer managed keys for many features. 
24

It also clarifies that prompts/responses are processed within the customer-specified geography (unless using Global/DataZone deployments) and that data stored at rest stays in the customer-designated geography within the tenant. 
24

Implication for CIE‑Copilot: For a minors-focused product with multi-country operations, Azure’s tenant + geography framing can materially simplify cross-border narratives (especially for UK schools and enterprise procurement), but you must still design around abuse-monitoring considerations and the exact deployment type you choose (Regional vs DataZone vs Global). 
24

Anthropic Claude API

Anthropic’s Privacy Center states that for Anthropic API users, inputs and outputs are automatically deleted within 30 days except (a) services with longer retention under your control (e.g., Files API), (b) if you and Anthropic agree otherwise (e.g., a zero data retention agreement), (c) Usage Policy enforcement needs, or (d) legal compliance. 
25
 Anthropic also states its commercial DPA with SCCs is incorporated into its Commercial Terms of Service. 
26

Implication for CIE‑Copilot: Anthropic’s default 30-day backend deletion is favorable for minimizing vendor-side data footprint, but you still need to manage (1) cross-border transfer requirements per your user regions and (2) any higher-retention features you might enable (files, retained chats, etc.). 
25

Recommendation summary for vendor choice

For CIE‑Copilot (minors, education data, long-lived internal conversation state), the most compliance-friendly posture is:

Prefer stateless inference (no vendor conversation persistence) and keep vendor retention at ≤30 days or ZDR where possible. 
23
Ensure a signed processor agreement (OpenAI DPA; Anthropic DPA incorporation) and reflect the vendor as a sub-processor / processor in your privacy notices and DPIA. 
22
If B2B school procurement is a near-term priority, Azure’s explicit commitments about non-training use and tenant/geography processing may reduce due diligence friction. 
24
Data subject rights and “right to be forgotten” deletion design
What must be deleted on account deletion

A deletion request in the UK triggers the right to erasure workflow (not absolute, but a formal right; typical response time is one month). 
19
 Beyond the UK, PDPO Section 26 requires erasure when personal data is no longer required for its purpose (subject to limited exceptions), Malaysia requires destruction/permanent deletion when no longer required, and PIPL requires deletion in multiple common scenarios (purpose achieved, consent withdrawn, service ceased, unlawful processing, etc.). 
2

For CIE‑Copilot, a “delete account” request should delete (or irreversibly de-identify) at least:

student_state row(s) for the user (progress and mastery profile).
All checkpoints rows for the user (since they contain full dialogue state).
All error_book rows and any attached objects (uploads, notes, tags, spaced repetition schedule).
Prompt/response logs for the user (unless you justify a narrow retention for security/fraud with strict access controls).
Any ai_jobs snapshots/results containing user data.
Redis stream payloads and dead-letter items containing student answers (or ensure encryption + TTL so data is not readable post-deletion).
Teacher analytics: either recompute aggregates excluding the user or ensure aggregates cannot be reverse-engineered; in practice, aggregates can remain if sufficiently non-identifying (apply minimum thresholding).

Hong Kong PCPD’s children guidance specifically highlights that deletion/account removal should be readily accessible and that associated content should be removable, which is consistent with your need to support minors’ understanding and control. 
6

LangGraph checkpoints: cascade deletion

Because checkpoints.state_blob is Level four and likely the highest-risk dataset, you should make deletion mechanically reliable:

Store checkpoints.user_id with a foreign key referencing the user principal table.
Use ON DELETE CASCADE so that deleting the user record deletes checkpoints automatically.
If you need partial retention for “conversation recovery,” consider compaction: keep only a minimized summary, or rotate checkpoints (e.g., last N turns) with TTL.

This “minimize and expire” stance aligns with PIPL’s shortest-necessary retention rule and PDPO/Malaysia retention principles. 
8

Third-party processors and deletion propagation

Even if you delete locally, vendor-side retention must be understood:

OpenAI: endpoint behavior varies; some objects are “until deleted” and may be retained indefinitely if you don’t delete them; ZDR eligibility also varies by capability. 
23
Anthropic API: deletes inputs/outputs within 30 days by default, with exceptions and optional ZDR agreement. 
25
Azure: stored data for stateful features can be deleted by customer; the documentation describes storage in-tenant and geography with encryption controls. 
24

Your deletion SOP should therefore include a vendor checklist: “Which endpoints/features did we use?” → “Are there objects to delete via API?” → “Do we have ZDR enabled/contracted?” 
23

GDPR DPIA outline template tailored to CIE‑Copilot

The ICO defines a DPIA as a process to identify and minimize data protection risks, and states you must do one for processing likely to result in high risk; it also notes that innovative technology including AI is a common trigger. 
27

Below is a DPIA outline you can copy into an internal doc.

DPIA header and governance

Include: project owner, DPO/privacy lead, engineering owner, versioning, review cadence, and change log. (ICO expects DPIAs to be living documents for high-risk processing.) 
28

Processing description and scope

Describe:

Product: AI tutoring for CIE A‑Level students, ages 16–19.
Regions: UK, SG, MY, HK, (potential CN).
Actors/roles: student, teacher, support engineers, AI worker, vendors (OpenAI/Azure/Anthropic).

Explicitly explain that the product processes children’s data (under-18 in UK framing). 
4

Data inventory and flows

Document each dataset (tables + Redis + vendor calls), noting which contain full text:

student_state (progress + mastery + misconceptions).
checkpoints.state_blob (full dialogue history).
error_book (uploads/refs + notes + tags + review schedule).
Prompt/response logs.
BYOC ephemeral raw content.
Vendor transmission: prompts/responses to LLM providers.

Cross-border transfer analysis differs per jurisdiction; record transfer mechanisms (UK TRA, SG comparable protection, etc.). 
12

Purposes, necessity, and proportionality

For each dataset, list:

Purpose (e.g., tutoring personalization, exam simulation, debugging).
Necessity (why that data is required vs optional).
Proportionality reduction (how you minimize: sampling logs, shortening checkpoint retention, aggregation for teachers).

Support claims with jurisdiction principles: PDPO DPP1 (not excessive) + DPP2 retention, Malaysia’s “adequate but not excessive” and retention/deletion duties, and PIPL minimization + shortest retention requirement. 
2

Lawful basis / consent strategy and minors handling

Record your lawful basis approach per market (and whether you rely on consent or contract/legitimate interests where available). If using consent flows, document age handling:

UK ISS consent: 13+ can consent (16→13). 
3
Singapore: 13–17 may consent if understandable; <13 needs parent/guardian. 
5
China: under 14 sensitive PI; guardian consent + specialized rules. 
8
Risk assessment

Create a risk register with likelihood/impact and mitigations. Typical top risks for CIE‑Copilot:

Unauthorized access to checkpoints (full dialogue + student reasoning).
Teacher dashboard inadvertently enabling re-identification of a student via narrow aggregates.
Vendor retention mismatch (e.g., using endpoints that retain until deleted).
Service role misuse bypassing RLS.

These are directly tied to the ICO’s emphasis on high-risk AI processing and to core obligations like security and retention limitation across jurisdictions. 
1

Controls and mitigations

Document technical and organizational measures:

Multi-tenant isolation via Supabase RLS; avoid service role for ordinary access. 
20
Short TTL + encryption for Redis stream payloads.
Aggregation-only teacher analytics (no raw checkpoints).
Retention limits for raw conversation and checkpoints (TTL + compaction).
Vendor controls: DPA execution; prefer stateless endpoints; enable ZDR where available/contracted. 
22
Incident response and breach notification playbooks per jurisdiction (72h ICO; SG PDPA; HK PCPD “as soon as practicable”). 
15
Residual risk, decision, and sign-off

State whether residual risk is acceptable, who approved it, and when the DPIA will be revisited (e.g., before launching the teacher dashboard, before entering China). For China, note that PIPL requires impact assessments in multiple scenarios and keeping records at least three years. 
8
