# 选题11-DS-ChatGPT

- 原始报告标题：CIE-Copilot Copyright & EdTech Compliance Deep Research Report
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:08:14.401Z

CIE-Copilot Copyright & EdTech Compliance Deep Research Report
Context, scope, and non-legal-advice note

This report evaluates copyright and platform-compliance risk for CIE-Copilot, an AI tutoring and marking system focused on Cambridge International AS & A Level Mathematics (9709) and Physics (9702), with a strict BYOC + ephemeral processing content strategy and a database limited to self-authored notes/explanations + synthetic questions + synthetic rubrics (no persistence of CAIE past papers or mark schemes). The target jurisdictions requested are United Kingdom (CDPA 1988), Singapore (Copyright Act 2021), and Hong Kong (Copyright Ordinance, Cap. 528).

This document is research and risk analysis, not legal advice. The practical takeaway is to design your product so that (1) you do not need CAIE/UCLES licensed materials to deliver core value, and (2) when users bring content, you process it in a way that aligns with statutory exceptions only where those exceptions are plausibly available and where the user’s access is lawful.

CAIE copyright policy panorama and what is publicly downloadable
How CAIE positions ownership and control

CAIE (part of Cambridge University Press & Assessment) asserts ownership/control over copyright and other IP in Cambridge-published materials. 
1

On the cambridgeinternational.org site specifically, CAIE’s published Terms and Conditions state that copyright and other IP in material on the site is owned by CAIE unless otherwise stated; users may print extracts for personal use or to assist in preparing students at a school for Cambridge examinations, but “must not otherwise copy, reproduce or re-distribute” content without prior written consent (beyond a temporary browser copy for viewing). 
2

Public availability vs. permission to republish

A key nuance for EdTech: “publicly downloadable” ≠ “free to republish/re-host”. CAIE’s help-center guidance explicitly says it cannot give permission to publish past examination papers on any website (including a school intranet) because material becomes uncontrolled once online; it cites incidents of misuse (including sale online) as a reason for this policy. 
3

Similarly, CAIE’s help-center guidance on classroom copying vs. publication states CAIE will not grant permission for:

publishing complete past examination papers, or
electronic publication (in any format) of questions from past exam papers, or
reproduction of material from mark schemes, principal examiner reports, and certain other categories (e.g., multiple-choice papers, listening exams). 
4

CAIE’s permissions application form (publisher guidance) also signals that permission is not granted for certain categories including (as described in the form’s “Under no circumstances…” clause) specimen papers, mark schemes, principal examiner reports, multiple-choice, audio, and reproduction of syllabuses/curriculum frameworks in full or in part. 
5

What CAIE makes available for download (and what remains gated)

CAIE publishes at least a selection of past papers and mark schemes on its public subject pages. For example, the official 9709 past papers page provides downloadable June 2024 question papers and mark schemes and states it is “only a selection,” with broader resources available via the School Support Hub for registered schools. 
6

The official 9702 past papers page similarly offers downloadable past papers/mark schemes (e.g., 2024) and states broader access requires School Support Hub registration. 
7

CAIE also describes generally that, as a Cambridge school, one has access to all past examination materials, and that some past papers are available publicly. 
8

For student-facing guidance, CAIE’s “Practice for exams” page (US site) states that the website provides syllabuses, past papers, specimen papers, and mark schemes for Cambridge IGCSE and Cambridge International AS & A Level. 
9

Material-by-material snapshot (as relevant to CIE-Copilot)

Past Papers (question papers). Some are publicly downloadable on CAIE subject pages, but CAIE states it cannot give permission to publish past papers on any website/intranet and cites misuse. 
6

Mark Schemes. Some are publicly downloadable alongside certain past papers, but CAIE’s permission guidance is restrictive regarding reproducing mark scheme materials, and it rejects electronic publication of exam questions and reproduction of mark schemes in the permissions context. 
6

Examiner Reports. Some may be published on subject pages (e.g., “Examiner reports 2024 June” appears on 9709/9702 pages), but broader access is often via School Support Hub. 
6

Specimen Papers. Often available (e.g., “Specimen papers” section exists on 9709/9702 pages), but CAIE’s permissions stance indicates specimen papers are treated as protected materials not generally granted for reuse/publication. 
6

Syllabus documents. These are broadly available as part of public “syllabus overview” and subject documentation; however CAIE permissions materials indicate reproduction of syllabuses/curriculum frameworks “in full or in part” is not permitted in the publisher-permissions context. 
5

Bottom line for product strategy: CAIE’s posture is consistent: download access for study does not imply redistribution rights, and CAIE is especially resistant to online publication/hosting of exam materials. 
2

Scenario-by-scenario legality analysis across UK, Singapore, and Hong Kong
Shared framing: why “ephemeral processing” is still legally relevant

In copyright law, many jurisdictions treat copies made in RAM/cache as “copies,” but carve out narrow exceptions for transient/temporary copying as part of a technical process, and various “fair dealing/fair use” exceptions for limited purposes. Your BYOC design reduces distribution risk but does not automatically eliminate copying risk, because ingestion/processing can still require making copies.

Scenario a: user uploads a Past Paper PDF → AI parsing/help → no database storage
United Kingdom (CDPA 1988)

UK CDPA includes an exception for temporary copies (s.28A) where the copy is transient/incidental, integral to a technological process, solely enabling a network transmission by an intermediary or a lawful use, and has no independent economic significance. 
10

However, two hard compliance realities apply:

First, “lawful use” is load-bearing. If the user’s copy is pirated or the user’s use is contractually restricted such that the use is not “lawful,” s.28A may fail. 
10

Second, UK’s explicit “text and data analysis” exception (s.29A) is limited to non-commercial research by a person with lawful access. 
10
 Since CIE-Copilot is a commercial tutoring/marking service, relying on s.29A is typically not a clean fit.

UK “research/private study” fair dealing (s.29) can permit fair dealing for research (non-commercial) and private study, and includes constraints where copying is done by someone other than the student/researcher in a way that results in “substantially the same material” being provided to multiple persons at the same time for the same purpose. 
10
 This is a red flag for scalable AI services even if you do not persist files.

UK conclusion for (a): medium-to-high risk unless you strictly constrain processing to transient technical copies and can demonstrate lawful access and non-redistribution, and even then there remains ambiguity because your service is commercial and can resemble systematic reproduction at scale. 
10

Singapore (Copyright Act 2021)

Singapore is unusually important for ML/AI workflows because it includes a dedicated Computational Data Analysis (CDA) permitted-use regime.

The Act defines “computational data analysis” to include using software to identify/extract/analyse information, and also using material “as an example … to improve the functioning of a computer program,” explicitly giving “use of images to train a computer program” as an illustration. 
11

For CDA, section 244 allows copying (including “storing or retaining the copy”) if conditions are met, including: the copy is made for CDA or preparing for CDA; the copy is not used for any other purpose; the copy is not supplied to others except for verifying results or collaborative research/study; and the user has lawful access (with explicit examples: no lawful access if circumventing paywalls; and no lawful access if accessing in breach of database terms—except terms void under s.187). 
11

In addition, IPOS’s public guidance on commencement of the Act states that lawfully accessed copyright works can be used for “computational data analysis,” including “training machine learning,” without needing permission from each copyright owner. 
12

Singapore conclusion for (a): medium risk, potentially defensible if your workflow stays inside CDA conditions (lawful access checks; no redistribution of the original; internal-only usage of copies), and the output does not substitute for distributing the paper/mark scheme. Key uncertainty: whether a tutoring/chat output that depends on repeatedly consulting the uploaded paper is still “only for CDA” versus a broader purpose; engineering design should keep the CDA stage separable and minimize use of the “copy” outside analysis. 
11

Hong Kong (Copyright Ordinance, Cap. 528)

Hong Kong has fair dealing for research/private study (s.38). 
13

But it does not provide a Singapore-style general CDA exception for AI training/analysis in the same way.

Hong Kong does contain a “temporary reproduction by service providers” provision (s.65A) that protects certain temporary copying/storage where the sole purpose is more efficient transmission through a network and the storage is temporary, among other conditions. 
13
 This is closer to caching/CDN behavior than AI parsing.

Hong Kong also has an education-specific fair dealing provision (s.41A) for giving/receiving instruction within a specified course of study, with conditions including technological access restrictions for network communication and ensuring the work is not stored longer than necessary (and in any event no longer than 12 consecutive months in the cited clause). 
13
 But this is architected for educational establishments and controlled networks, not general commercial tutoring services.

Hong Kong conclusion for (a): medium-to-high risk because your core activity is not simply transient technical transmission; it is analytic copying/processing of complete exam papers, and the strongest HK exceptions are framed around traditional education settings or network caching. 
13

Scenario b: extract mathematical form from Specimen Papers → generate isomorphic synthetic questions stored in DB

This scenario is central to your “Synthetic Gold Set” strategy. The legal question is whether you are copying a “substantial part” of the protected expression or merely using unprotected ideas/methods.

United Kingdom

UK has a quotation exception (s.30) requiring that the work be made available to the public and that quotation is fair dealing, no more than required, with acknowledgement. 
10
 But scenario (b) aims to avoid quotation entirely and instead generate new questions.

Your best risk posture is to ensure the synthetic item is independently authored and does not reproduce the original question’s wording, diagram layout, or distinctive narrative. Relying on a specimen question’s mathematical structure as an idea/template is generally safer than reproducing expressive text.

UK conclusion for (b): low-to-medium risk if you (1) do not copy wording/diagrams, (2) vary parameters and context, (3) keep provenance logs showing “transform to abstract form → regenerate,” and (4) do not market it as “Cambridge specimen questions” or imply endorsement. CAIE’s own permissions posture treats specimen papers as protected and disfavored for reuse, which raises practical enforcement risk even if your legal theory is “no copying of expression.” 
5

Singapore

Singapore’s fair use factors include whether the use is commercial, the nature of the work, amount/substantiality, and effect on the market. 
11
 If you are not copying expression and are creating a new work, the “amount/substantiality” and market effect factors generally improve.

Singapore conclusion for (b): low-to-medium risk if you demonstrably avoid copying expressive text/diagrams and the synthetic items do not become substitutes for the original specimen papers (e.g., a near-identical clone). 
11

Hong Kong

Hong Kong’s fair dealing regime similarly requires fairness analysis, considering purpose (including commercial vs non-profit), nature of work, amount/substantiality, and market effect. 
13
 Again, your safest route is to not copy expressive elements at all.

Hong Kong conclusion for (b): low-to-medium risk with the same practical constraints: do not clone text/diagrams, keep audit trails to show independent generation, and avoid confusion about affiliation. 
13

Scenario c: store “knowledge chunks” extracted from Cambridge Learner Guide or other free CAIE documents

This scenario is materially different from (b) because you are storing verbatim or near-verbatim text from CAIE documents. Even if documents are free to download, CAIE site terms restrict copying/redistribution beyond limited uses. 
2

United Kingdom

UK “illustration for instruction” (s.32) is limited to fair dealing for a non-commercial purpose and by a person giving or receiving instruction (or preparing), with acknowledgement. 
10
 A commercial EdTech service is an awkward fit.

UK quotation (s.30) can support limited quoting in answers; it does not naturally authorize building a persistent database of large text extracts for commercial RAG. 
10

UK conclusion for (c): high risk unless you obtain written permission/license or the specific CAIE document is under a reuse-friendly licence (rare for exam board materials) and your use complies with it. 
2

Singapore

Singapore fair use explicitly considers whether the use is commercial and its market impact. 
11
 A commercial RAG database built from CAIE learner guides increases substitution risk: users may rely on your platform instead of the original guide (or Cambridge services).

Also, Singapore CDA (s.244) can permit copying/storing for computational analysis, but it is condition-heavy and is not automatically a license to store and reuse extracts for general tutoring outputs. 
11

Singapore conclusion for (c): medium-to-high risk, depending on excerpt size, output behavior, and whether you can justify the storage as within a permitted-use regime. If you store chunks to serve answers, that is functionally content distribution. 
11

Hong Kong

Hong Kong fair dealing and education provisions are narrower and more institution-oriented. While s.41A supports instruction uses within controlled educational contexts, it is not a general commercial-content warehousing exception. 
13

Hong Kong conclusion for (c): high risk without licensing/permission. 
13

Scenario d: AI references mark scheme “logic” without showing original text

This is aligned with your “synthetic rubric” approach. The stronger your system is at generating its own rubric DAG and scoring rules (rather than reproducing mark-scheme text), the lower the risk.

United Kingdom

UK quotation/fair dealing can allow limited quotations with acknowledgement and only to the extent required, but you are explicitly not quoting mark schemes. 
10

UK conclusion for (d): low-to-medium risk if you do not reproduce mark scheme wording and instead express your own scoring rules. Risk rises if your output reveals “model answers” that effectively reproduce mark scheme content or if the system reconstructs the language of mark schemes. CAIE permissions guidance is explicitly hostile to reproducing mark schemes. 
4

Singapore

Singapore fair use (s.190–191) is flexible but factor-based; non-verbatim “rules” are generally safer than verbatim reproduction, especially if you avoid market substitution. 
11

Singapore conclusion for (d): low-to-medium risk with the same guardrails: no verbatim mark scheme text, no systematic reconstruction, and keep outputs pedagogical rather than a substitute for publishing the mark scheme. 
11

Hong Kong

Hong Kong provides explicit protection for exam-related acts (s.41(3))—“anything done for the purposes of an examination by way of setting the questions, communicating the questions to the candidates or answering the questions.” 
13
 This supports exam mechanics but does not give blanket permission to publish mark schemes.

Hong Kong conclusion for (d): low-to-medium risk if you are not reproducing text and are using your own rubric logic, with caution that anything that resembles or substitutes for the actual mark scheme may still be targeted. 
13

Competitor and market reality: how major platforms appear to handle CAIE materials
Observed behavior in the ecosystem

Multiple high-traffic study platforms appear to host CAIE past papers and mark schemes (often free):

Physics & Maths Tutor (PMT) states it provides CAIE past papers and mark schemes across subjects. 
14

PastPapers.Co markets free downloads of CAIE past papers, mark schemes, and examiner reports. 
15

Various directories (e.g., CIE Notes) explicitly acknowledge that the past papers are copyrighted UCLES and claim to have “collected [them] from various online sources.” 
16

Save My Exams also distributes CAIE-related PDFs via its CDN (example PDF contains UCLES/CAIE copyright acknowledgements and references Cambridge’s own “copyright acknowledgement booklet”). 
17

How this intersects with CAIE’s public stance

CAIE’s help-center states it cannot give permission to publish past exam papers on any website/intranet, citing lack of control and misuse (including sale online). 
3

This implies that a large part of the open web “past paper hosting” ecosystem is operating either:

under some form of permission/licensing not visible publicly, or
in a state of tolerated but unauthorized distribution, or
under a take-down driven equilibrium (sites re-upload after removals).
Public lawsuits vs. take-down dynamics

In this research pass, there is clear evidence of restrictive CAIE policy, but limited publicly accessible litigation records specifically naming major past paper sites. CAIE’s own explanation references “incidents of misuse” and the sale of materials online, which is consistent with a pattern of enforcement or complaints, but not necessarily public court actions. 
3

Design implication: Do not treat “competitors do it” as a safe harbor. They may be operating under different risk tolerances, jurisdictions, or private arrangements, or simply haven’t been enforced against recently.

Copyright risk matrix and mitigation measures
Risk categories used

Low: plausible statutory basis and/or no protected expression stored; minimal substitution risk.
Medium: arguable basis but fact-dependent; meaningful enforcement exposure.
High: likely infringement or contract breach risk; strong enforcement posture by rights-holder.

Risk matrix: content type × jurisdiction
Content / behavior in CIE-Copilot	UK (CDPA 1988)	Singapore (Copyright Act 2021)	Hong Kong (Cap. 528)	Why	Mitigation priorities
BYOC upload of CAIE Past Paper for user-specific tutoring (no persistence)	Medium–High 
10
	Medium 
11
	Medium–High 
13
	Still requires copying; UK TDM is non-commercial; HK lacks CDA; “lawful access” is critical everywhere	Strict ephemeral pipeline; no embeddings persistence from uploaded CAIE; user warranty of lawful access; block known pirated sources; “no re-hosting” outputs
Extract abstract math structure from specimen → generate new synthetic question	Low–Medium 
10
	Low–Medium 
11
	Low–Medium 
13
	Safer if not copying expression; but CAIE treats specimen as protected and may object to close clones	Prove non-copying: template abstraction logs; regenerate wording/context; avoid diagrams reuse; plagiarism/similarity filter
Store CAIE Learner Guide text chunks in RAG database	High 
2
	Medium–High 
11
	High 
13
	Persistent textual copying + potential public communication via answers	Avoid: do not ingest CAIE docs unless licensed; use self-authored notes; use open-licensed alternatives
AI “references” mark scheme logic (no verbatim, no display)	Low–Medium 
10
	Low–Medium 
11
	Low–Medium 
13
	Lower if expressing ideas/methods, but rises if outputs reconstruct mark scheme text	Generate original rubric DAG; prohibit verbatim outputs; output-length limits; high-similarity detector vs. mark schemes (where available)
Hosting/re-distributing CAIE PDFs (past papers/mark schemes/examiner reports)	High 
3
	High 
2
	High 
13
	CAIE explicitly refuses permission for online publication; strong substitution	Don’t do it (aligns with your PRD)
Storing embeddings derived from CAIE text	Medium–High (fact-dependent) 
2
	Medium (if within CDA constraints) 
11
	Medium–High 
13
	Embeddings may be treated as “copying” depending on reversibility and use	Treat embeddings as derivative storage; for CAIE BYOC, keep embeddings ephemeral only; retention-time hard limits
Engineering compliance playbook for CIE-Copilot
Ephemeral-by-design ingestion pipeline

Your PRD’s BYOC constraint (“ephemeral processing, no persistent original text”) should be enforced technically, not just by policy.

Implement an ingestion architecture where uploaded files are:

stored only in short-lived object storage (or ideally not stored at all; streamed),
processed in an isolated worker sandbox with disk encryption and automatic wipe,
and deleted quickly with a verifiable deletion log (time, file size, hash, user, deletion status).

This is critical because CAIE’s policy concern is loss of control once materials are “published on the internet,” and they explicitly decline permission for such publication. 
3

In the UK context, “temporary copies” protections are conditioned on transient/incidental copies integral to a technical process and enabling lawful use, with no independent economic significance. Your implementation should aim to look like that: transient, incidental, and not retained. 
10

Hong Kong’s service-provider temporary reproduction similarly emphasizes temporary storage and limited purpose for network efficiency (and prompt removal when appropriate). 
13

Hashing, fingerprinting, and “do-not-store” enforcement

A practical engineering set:

Use SHA-256 hashing to detect and prevent accidental persistence:

Compute sha256(file_bytes) on upload.
Store only the hash + metadata (uploader, timestamp, declared rights) in an audit table.
If a file is accidentally written to persistent storage, a periodic scan can detect it by hash match and auto-delete.

Add “copyrighted-exam-material heuristics” to lower the chance of retaining forbidden content:

Detect “© UCLES” / “Cambridge Assessment International Education” strings common in CAIE PDFs and covers, and force a “BYOC ephemeral-only” processing path. (CAIE materials and PDFs commonly include UCLES/CAIE copyright notices.) 
17
Count page headers and known paper code patterns; if detected, disable any caching of extracted text.

Prevent “derived persistence”:

For BYOC uploads, ensure you do not store extracted raw text, OCR output, or embeddings in Supabase/pgvector. This matters because your database would become a de facto repository.
Output controls to avoid “reconstruction and redistribution”

Even with ephemeral input, outputs can accidentally reconstruct the protected work at scale.

Add hard constraints:

never reproduce or re-render the entire question paper text,
limit direct quoting to small spans and only when you can justify an exception (and include attribution where required),
add “high similarity rejection” guardrails to prevent model output that resembles known mark scheme wording or known paper sections.

This aligns with CAIE’s general “no redistribution” stance on site materials. 
2

BYOC user agreement clauses

Your BYOC terms should include (at minimum) the following clause families:

User representations and warranties:

User represents they have lawful access and required rights to upload and to authorize processing.
User agrees they will not upload materials obtained unlawfully or in breach of terms of access.

License to operate (narrow, functional):

User grants a limited license to process uploaded content solely to provide the service to that user, with no ownership transfer.

Prohibited uses:

No using the platform to distribute copyrighted exam materials to others.
No requesting the system to reproduce or output entire past papers/mark schemes.

Indemnity + repeat infringer policy:

User indemnifies the provider for claims arising from their uploads.
Repeat infringer termination policy (aligns with common safe-harbor expectations).

Disclosure of processing model:

Make clear that uploads are processed ephemerally and not stored as documents (consistent with PRD), but you may store derived analytics (error tags, scoring metadata) that do not contain protected text.

These terms help because CAIE’s policy emphasizes lack of control once materials are online and misuse incidents. 
3

Notice-and-takedown and incident response

Even if you do not host CAIE documents, you can still receive notices if outputs are alleged to reproduce protected content.

Adopt a process modeled on global “notice-and-takedown” norms:

Dedicated copyright inbox.
Triage within 24–48 hours.
Preserve evidence (hashes, logs, output transcripts) while respecting privacy.
Disable access to the allegedly infringing output and associated cached artifacts.
Provide counter-notice path for clear cases of mistake.
Recordkeeping and pattern analysis (repeat offending prompts/users).

In Hong Kong, the ordinance itself includes service-provider-oriented provisions around temporary reproduction and prompt action when facts come to the provider’s knowledge. 
13

In Singapore, the statute explicitly discusses contractual enforceability around permitted uses and lawful access (especially relevant if a notice alleges the first copy was unlawfully accessed). 
11

Final, actionable conclusions aligned to your requested outputs
Four scenarios legality conclusions

Scenario a (BYOC past paper, ephemeral): UK: medium–high risk; Singapore: medium (best statutory footing); HK: medium–high. The gating factor is “lawful access” + exception fit (UK non-commercial TDM constraint; HK lack of CDA). 
10

Scenario b (specimen → abstract math form → synthetic isomorphs): Generally low–medium risk across all three if you avoid copying expressive text/diagrams and can defend against “substantial part” copying. Practical risk remains because CAIE treats specimen as protected and disfavored for reuse. 
5

Scenario c (store learner guide chunks): High risk in UK and HK; medium–high in Singapore unless licensed/open-licensed. This is the least compatible with your PRD constraint and should be avoided. 
2

Scenario d (reference mark scheme logic without verbatim): Low–medium risk if truly non-verbatim and synthesized; risk rises sharply if outputs reconstruct mark schemes. 
4

Compliance posture vs. competitor posture

Competitors often appear to host CAIE past papers/mark schemes (e.g., PMT, PastPapers.Co), despite CAIE’s public “no permission for website publication” policy—suggesting either private arrangements, or more likely an enforcement/takedown churn. Your PRD’s “no persistence of past papers/mark schemes” is a strategically strong differentiator. 
14
