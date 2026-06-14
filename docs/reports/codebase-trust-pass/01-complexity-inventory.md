# Codebase Trust Pass 01 — Complexity and Dependency Inventory

Issue: #461 (Parent: #460)
Generated: 2026-06-14T08:12:47.551Z
Scan scope: src, api, scripts, tests, .github/workflows

Method: static file-level non-empty LOC; heuristic function boundary detection by brace matching in JS/TS files; hook and import counts are raw regex counts. Generated output is for review planning only.

## Top 50 largest source/test/script files by LOC
| Rank | Path | LOC | Ext | Imports | Risk |
|---|---|---:|---|---:|---|
| 1 | api/learning/__tests__/workspace-read-service.test.js | 3307 | .js | 1 | P0 |
| 2 | api/rag/__tests__/ask-service.test.js | 2246 | .js | 4 | P0 |
| 3 | tests/ao/controller-loop.test.js | 2173 | .js | 7 | P0 |
| 4 | scripts/learning/run_9702_production_ready_gate.js | 2103 | .js | 5 | P0 |
| 5 | scripts/learning/run_9231_wave4_production_ready_gate.js | 1913 | .js | 5 | P0 |
| 6 | scripts/ao/lib/controller-loop.js | 1595 | .js | 13 | P0 |
| 7 | api/learning/__tests__/session-api.test.js | 1480 | .js | 3 | P0 |
| 8 | src/components/learning-runtime/__tests__/view-models.test.js | 1474 | .js | 2 | P0 |
| 9 | scripts/learning/__tests__/question-analysis-backfill.test.js | 1466 | .js | 1 | P0 |
| 10 | api/learning/__tests__/review-task-service.test.js | 1415 | .js | 2 | P0 |
| 11 | api/rag/lib/ask-service.js | 1336 | .js | 24 | P0 |
| 12 | api/learning/__tests__/attempt-event-service.test.js | 1325 | .js | 0 | P0 |
| 13 | src/components/learning-runtime/view-models/workspace-view-model.js | 1283 | .js | 2 | P0 |
| 14 | scripts/ao/lib/state-contracts.js | 1273 | .js | 3 | P0 |
| 15 | api/learning/lib/workspaces/paper-workspace-entry-resolver.js | 1266 | .js | 0 | P0 |
| 16 | api/learning/lib/workspaces/workspace-read-service.js | 1260 | .js | 4 | P0 |
| 17 | api/learning/lib/events/attempt-event-service.js | 1228 | .js | 6 | P0 |
| 18 | scripts/ao/lib/eval-harness.js | 1202 | .js | 20 | P0 |
| 19 | scripts/evaluation/run_question_search_gate.js | 1165 | .js | 6 | P0 |
| 20 | scripts/rag_ingest.js | 1122 | .js | 8 | P0 |
| 21 | src/api/__tests__/learningRuntimeApi.test.js | 1089 | .js | 2 | P0 |
| 22 | scripts/learning/lib/browser-closed-loop-fixture.js | 1070 | .js | 3 | P0 |
| 23 | scripts/learning/run_9702_full_production_ready_aggregate_gate.js | 1059 | .js | 5 | P0 |
| 24 | tests/ao/state-runner.test.js | 1047 | .js | 8 | P0 |
| 25 | tests/ao/action-executor.test.js | 1017 | .js | 5 | P0 |
| 26 | api/marking/__tests__/evaluate-v1.test.js | 1016 | .js | 1 | P0 |
| 27 | scripts/evaluation/__tests__/question-search-gate.test.js | 1015 | .js | 2 | P0 |
| 28 | api/learning/lib/question-analysis/question-intelligence-service.js | 1015 | .js | 0 | P0 |
| 29 | scripts/learning/build_9231_question_text_foundation_inventory.js | 1012 | .js | 3 | P0 |
| 30 | scripts/syllabus/lib/9709-syllabus-gate.js | 997 | .js | 5 | P0 |
| 31 | scripts/rag/run_live_benchmark.js | 996 | .js | 6 | P0 |
| 32 | api/learning/lib/session-runtime/session-service.js | 990 | .js | 8 | P0 |
| 33 | api/learning/lib/review/review-scheduler-policy.js | 963 | .js | 0 | P0 |
| 34 | scripts/learning/build_9231_question_row_foundation.js | 950 | .js | 3 | P0 |
| 35 | api/learning/lib/mastery/mastery-orchestrator.js | 949 | .js | 8 | P1 |
| 36 | scripts/ao/lib/action-executor.js | 936 | .js | 4 | P1 |
| 37 | api/learning/__tests__/question-import-service.test.js | 934 | .js | 2 | P1 |
| 38 | scripts/learning/build_9702_source_truth_inventory.js | 915 | .js | 5 | P1 |
| 39 | scripts/ao/lib/lifecycle-engine.js | 912 | .js | 0 | P1 |
| 40 | src/components/Settings/UserSettings.jsx | 902 | .jsx | 6 | P1 |
| 41 | api/learning/lib/artifacts/artifact-service.js | 869 | .js | 2 | P1 |
| 42 | scripts/learning/run_9231_full_production_ready_aggregate_gate.js | 864 | .js | 4 | P1 |
| 43 | src/pages/TopicDetail.jsx | 845 | .jsx | 13 | P1 |
| 44 | src/pages/PhysicsTopicDetail.jsx | 838 | .jsx | 8 | P1 |
| 45 | api/learning/__tests__/artifact-service.test.js | 832 | .js | 0 | P1 |
| 46 | src/components/learning-runtime/WorkspaceShell.js | 830 | .js | 6 | P1 |
| 47 | scripts/learning/lib/question-analysis-backfill.js | 823 | .js | 6 | P1 |
| 48 | tests/ao/manage-runner.test.js | 821 | .js | 10 | P1 |
| 49 | scripts/learning/build_9231_question_plain_text_v1.js | 817 | .js | 3 | P1 |
| 50 | scripts/learning/build_9231_next_wave_candidate_gate.js | 795 | .js | 3 | P1 |

## Top 30 largest React components/pages
| Rank | Path | LOC | useState | useRef | useEffect | Risk |
|---|---|---:|---:|---:|---:|---|
| 1 | src/components/Settings/UserSettings.jsx | 902 | 11 | 0 | 1 | P1 |
| 2 | src/pages/TopicDetail.jsx | 845 | 3 | 0 | 1 | P1 |
| 3 | src/pages/PhysicsTopicDetail.jsx | 838 | 10 | 0 | 4 | P1 |
| 4 | src/components/Navbar.jsx | 672 | 3 | 1 | 1 | P1 |
| 5 | src/components/AI/PersonalizedRecommendations.jsx | 620 | 9 | 0 | 1 | P1 |
| 6 | src/pages/Landing.jsx | 552 | 1 | 0 | 0 | P1 |
| 7 | src/pages/PaperPage.jsx | 531 | 4 | 0 | 1 | P1 |
| 8 | src/pages/learning-runtime/LearningSessionPage.jsx | 523 | 16 | 8 | 6 | P1 |
| 9 | src/components/ChatWidget.jsx | 497 | 5 | 2 | 5 | P1 |
| 10 | src/components/ui/multimodal-ai-chat-input.jsx | 416 | 2 | 2 | 1 | P1 |
| 11 | src/components/CoreFeatures.jsx | 364 | 1 | 0 | 0 | P2 |
| 12 | src/components/Recommendations/PersonalizedRecommendations.jsx | 347 | 5 | 0 | 1 | P2 |
| 13 | src/pages/FurtherMathematicsTopics.jsx | 346 | 2 | 0 | 0 | P2 |
| 14 | src/components/Progress/ProgressTracker.jsx | 331 | 3 | 0 | 1 | P2 |
| 15 | src/pages/MathematicsTopics.jsx | 320 | 2 | 0 | 0 | P2 |
| 16 | src/components/SearchBox.jsx | 303 | 4 | 2 | 2 | P2 |
| 17 | src/pages/PhysicsTopics.jsx | 270 | 2 | 0 | 0 | P2 |
| 18 | src/pages/Pricing.jsx | 261 | 0 | 0 | 0 | P2 |
| 19 | src/components/Auth/SignupForm.jsx | 251 | 4 | 0 | 0 | P2 |
| 20 | src/pages/learning-runtime/TopicWorkspacePage.jsx | 236 | 5 | 0 | 1 | P2 |
| 21 | src/components/SuccessStories.jsx | 235 | 2 | 0 | 1 | P2 |
| 22 | src/pages/SubjectSelection.jsx | 219 | 0 | 0 | 0 | P2 |
| 23 | src/pages/learning-runtime/ReviewQueuePage.jsx | 219 | 5 | 0 | 1 | P2 |
| 24 | src/components/ThemeToggle.jsx | 217 | 1 | 0 | 0 | P2 |
| 25 | src/pages/AskAI.jsx | 186 | 0 | 0 | 0 | P2 |
| 26 | src/pages/PhysicsA2Level.jsx | 178 | 0 | 0 | 0 | P2 |
| 27 | src/pages/PhysicsASLevel.jsx | 178 | 0 | 0 | 0 | P2 |
| 28 | src/pages/FurtherMathematicsPapers.jsx | 177 | 0 | 0 | 0 | P2 |
| 29 | src/pages/MathematicsPapers.jsx | 177 | 0 | 0 | 0 | P2 |
| 30 | src/components/Auth/LoginForm.jsx | 170 | 3 | 0 | 0 | P2 |

## Top 30 likely largest functions/handlers
| Rank | File | Function | Kind | Start-End | LOC | Signature | LikelyHandler | Risk |
|---|---|---|---|---|---:|---|---:|---|
| 1 | src/components/Settings/UserSettings.jsx | UserSettings | arrow_const | 27-975 | 949 | const UserSettings = () => { | N | P0 |
| 2 | src/pages/TopicDetail.jsx | TopicDetail | arrow_const | 29-887 | 859 | const TopicDetail = () => { | N | P1 |
| 3 | src/pages/PhysicsTopicDetail.jsx | PhysicsTopicDetail | arrow_const | 28-660 | 633 | const PhysicsTopicDetail = () => { | N | P1 |
| 4 | scripts/learning/lib/browser-closed-loop-fixture.js | createClosedLoopLearningDb | function_decl | 596-1197 | 602 | export function createClosedLoopLearningDb(fixture = buildBrowserClosedLoopFixture()) { | N | P1 |
| 5 | src/pages/Landing.jsx | Landing | arrow_const | 13-598 | 586 | const Landing = () => { | N | P1 |
| 6 | src/pages/PaperPage.jsx | PaperPage | arrow_const | 12-568 | 557 | const PaperPage = () => { | N | P1 |
| 7 | scripts/learning/run_9709_diagram_review_server.js | renderReviewHtml | function_decl | 189-686 | 498 | function renderReviewHtml() { | N | P1 |
| 8 | api/learning/__tests__/workspace-read-service.test.js | createBoundaryLearningDb | function_decl | 690-1183 | 494 | function createBoundaryLearningDb() { | N | P1 |
| 9 | scripts/learning/lib/browser-closed-loop-fixture.js | resolveQuery | function_decl | 668-1143 | 476 | function resolveQuery(query) { | N | P1 |
| 10 | scripts/rag/run_s1_1_benchmark.js | main | function_decl | 264-651 | 388 | async function main() { | N | P1 |
| 11 | src/pages/FurtherMathematicsTopics.jsx | FurtherMathematicsTopics | arrow_const | 12-369 | 358 | const FurtherMathematicsTopics = () => { | N | P2 |
| 12 | src/components/Progress/ProgressTracker.jsx | ProgressTracker | arrow_const | 19-355 | 337 | const ProgressTracker = () => { | N | P2 |
| 13 | src/pages/MathematicsTopics.jsx | MathematicsTopics | arrow_const | 11-341 | 331 | const MathematicsTopics = () => { | N | P2 |
| 14 | src/components/learning-runtime/__tests__/view-models.test.js | createWorkspacePayload | function_decl | 119-433 | 315 | function createWorkspacePayload() { | N | P2 |
| 15 | src/pages/TopicDetail.jsx | generateKeyPoints | arrow_const | 58-353 | 296 | const generateKeyPoints = (topicName) => { | N | P2 |
| 16 | api/learning/__tests__/artifact-service.test.js | createArtifactRepositoryFixture | function_decl | 7-300 | 294 | function createArtifactRepositoryFixture() { | N | P2 |
| 17 | src/pages/PhysicsTopics.jsx | PhysicsTopics | arrow_const | 10-292 | 283 | const PhysicsTopics = () => { | N | P2 |
| 18 | src/components/learning-runtime/__tests__/WorkspaceShell.test.js | createWorkspacePayload | function_decl | 20-293 | 274 | function createWorkspacePayload() { | N | P2 |
| 19 | src/pages/Pricing.jsx | Pricing | arrow_const | 7-276 | 270 | const Pricing = () => { | N | P2 |
| 20 | scripts/learning/__tests__/question-analysis-backfill.test.js | createBackfillClient | function_decl | 3-260 | 258 | function createBackfillClient() { | N | P2 |
| 21 | scripts/rag/lib/curriculum-nodes-quality-audit.js | auditCurriculumNodes | function_decl | 34-290 | 257 | export function auditCurriculumNodes(rows = [], manualSample = null) { | N | P2 |
| 22 | scripts/syllabus/generate-9709-canonical-topic-tree-draft-v1.js | buildDraft | function_decl | 444-681 | 238 | function buildDraft() { | N | P2 |
| 23 | src/pages/SubjectSelection.jsx | SubjectSelection | arrow_const | 6-234 | 229 | const SubjectSelection = () => { | N | P2 |
| 24 | api/marking/lib/ledger-orchestrator.js | writeLedger | function_decl | 41-260 | 220 | export async function writeLedger(params) { | N | P2 |
| 25 | api/learning/__tests__/workspace-read-service.test.js | resolveQuery | function_decl | 839-1056 | 218 | function resolveQuery(query) { | N | P2 |
| 26 | api/rag/lib/config.js | getRagConfig | function_decl | 60-255 | 196 | export function getRagConfig() { | N | P2 |
| 27 | scripts/rag/run_question_aware_chunk_pilot.js | main | function_decl | 118-312 | 195 | async function main() { | N | P2 |
| 28 | api/learning/__tests__/workspace-repository.test.js | createWorkspaceDb | function_decl | 9-202 | 194 | function createWorkspaceDb() { | N | P2 |
| 29 | src/pages/AskAI.jsx | AskAI | arrow_const | 11-200 | 190 | const AskAI = () => { | N | P2 |
| 30 | scripts/rag/run_step3_production_population_pilot.js | main | function_decl | 125-308 | 184 | function main() { | N | P2 |

## Files with high local state/effect density
- src/components/AI/PersonalizedRecommendations.jsx — LOC:620, useState:9, useRef:0, useEffect:1, hooks:10, hooks/LOC:0.016 (Risk P2)
- src/components/Auth/SignupForm.jsx — LOC:251, useState:4, useRef:0, useEffect:0, hooks:4, hooks/LOC:0.016 (Risk P2)
- src/components/ChatPanel.jsx — LOC:166, useState:6, useRef:1, useEffect:3, hooks:10, hooks/LOC:0.060 (Risk P1)
- src/components/ChatWidget.jsx — LOC:497, useState:5, useRef:2, useEffect:5, hooks:12, hooks/LOC:0.024 (Risk P2)
- src/components/Navbar.jsx — LOC:672, useState:3, useRef:1, useEffect:1, hooks:5, hooks/LOC:0.007 (Risk P2)
- src/components/PWAInstallButton.jsx — LOC:164, useState:4, useRef:0, useEffect:1, hooks:5, hooks/LOC:0.030 (Risk P2)
- src/components/Progress/ProgressTracker.jsx — LOC:331, useState:3, useRef:0, useEffect:1, hooks:4, hooks/LOC:0.012 (Risk P2)
- src/components/Recommendations/PersonalizedRecommendations.jsx — LOC:347, useState:5, useRef:0, useEffect:1, hooks:6, hooks/LOC:0.017 (Risk P2)
- src/components/SearchBox.jsx — LOC:303, useState:4, useRef:2, useEffect:2, hooks:8, hooks/LOC:0.026 (Risk P2)
- src/components/Settings/UserSettings.jsx — LOC:902, useState:11, useRef:0, useEffect:1, hooks:12, hooks/LOC:0.013 (Risk P2)
- src/components/learning-runtime/WorkspaceShell.js — LOC:830, useState:4, useRef:0, useEffect:1, hooks:5, hooks/LOC:0.006 (Risk P2)
- src/components/ui/multimodal-ai-chat-input.jsx — LOC:416, useState:2, useRef:2, useEffect:1, hooks:5, hooks/LOC:0.012 (Risk P2)
- src/contexts/AuthContext.jsx — LOC:193, useState:3, useRef:0, useEffect:1, hooks:4, hooks/LOC:0.021 (Risk P2)
- src/contexts/ThemeContext.jsx — LOC:323, useState:3, useRef:0, useEffect:3, hooks:6, hooks/LOC:0.019 (Risk P2)
- src/hooks/useChat.js — LOC:137, useState:3, useRef:2, useEffect:1, hooks:6, hooks/LOC:0.044 (Risk P2)
- src/pages/PaperPage.jsx — LOC:531, useState:4, useRef:0, useEffect:1, hooks:5, hooks/LOC:0.009 (Risk P2)
- src/pages/PhysicsTopicDetail.jsx — LOC:838, useState:10, useRef:0, useEffect:4, hooks:14, hooks/LOC:0.017 (Risk P2)
- src/pages/Search.jsx — LOC:132, useState:4, useRef:2, useEffect:3, hooks:9, hooks/LOC:0.068 (Risk P1)
- src/pages/StudyHub.jsx — LOC:145, useState:3, useRef:0, useEffect:1, hooks:4, hooks/LOC:0.028 (Risk P2)
- src/pages/SubjectPage.jsx — LOC:102, useState:4, useRef:0, useEffect:1, hooks:5, hooks/LOC:0.049 (Risk P2)
- src/pages/TopicDetail.jsx — LOC:845, useState:3, useRef:0, useEffect:1, hooks:4, hooks/LOC:0.005 (Risk P2)
- src/pages/learning-runtime/LearningSessionPage.jsx — LOC:523, useState:16, useRef:8, useEffect:6, hooks:30, hooks/LOC:0.057 (Risk P2)
- src/pages/learning-runtime/ReviewQueuePage.jsx — LOC:219, useState:5, useRef:0, useEffect:1, hooks:6, hooks/LOC:0.027 (Risk P2)
- src/pages/learning-runtime/TopicWorkspacePage.jsx — LOC:236, useState:5, useRef:0, useEffect:1, hooks:6, hooks/LOC:0.025 (Risk P2)

## Files with unusually high import counts
| Rank | Path | LOC | Import statements | Risk |
| 1 | api/rag/lib/ask-service.js | 1336 | 24 | P1 |
| 2 | scripts/ao/lib/eval-harness.js | 1202 | 20 | P1 |
| 3 | tests/ao/controller-shadow-parity.test.js | 245 | 16 | P1 |
| 4 | api/marking/evaluate-v1.js | 585 | 13 | P1 |
| 5 | scripts/ao/lib/controller-loop.js | 1595 | 13 | P1 |
| 6 | src/App.jsx | 134 | 13 | P1 |
| 7 | src/components/SearchBox.jsx | 303 | 13 | P1 |
| 8 | src/pages/TopicDetail.jsx | 845 | 13 | P1 |
| 9 | src/pages/Landing.jsx | 552 | 11 | P1 |
| 10 | api/index.js | 238 | 10 | P1 |
| 11 | scripts/ao/lib/state-runner.js | 383 | 10 | P1 |
| 12 | tests/ao/manage-runner.test.js | 821 | 10 | P1 |
| 13 | scripts/rag/lib/production-evidence-promotion-bridge.js | 454 | 9 | P1 |
| 14 | api/learning/lib/mastery/mastery-orchestrator.js | 949 | 8 | P1 |
| 15 | api/learning/lib/session-runtime/session-service.js | 990 | 8 | P1 |
| 16 | scripts/learning/lib/closed-loop-release-gate.js | 453 | 8 | P1 |
| 17 | scripts/rag/run_s2_augmentation_eval.js | 517 | 8 | P1 |
| 18 | scripts/rag/run_s2_c1_classifier_gate.js | 253 | 8 | P1 |
| 19 | scripts/rag_ingest.js | 1122 | 8 | P1 |
| 20 | src/components/ChatWidget.jsx | 497 | 8 | P1 |
| 21 | src/components/Navbar.jsx | 672 | 8 | P1 |
| 22 | src/pages/FurtherMathematicsTopics.jsx | 346 | 8 | P1 |
| 23 | src/pages/PhysicsTopicDetail.jsx | 838 | 8 | P1 |
| 24 | tests/ao/state-runner.test.js | 1047 | 8 | P1 |

## Large tests (contract/coverage risk candidates)
| Rank | Path | LOC | Imports | Hook usage | Risk |
|---|---|---:|---:|---:|---|
| 1 | api/learning/__tests__/workspace-read-service.test.js | 3307 | 1 | 0 | P0 |
| 2 | api/rag/__tests__/ask-service.test.js | 2246 | 4 | 0 | P0 |
| 3 | tests/ao/controller-loop.test.js | 2173 | 7 | 0 | P0 |
| 4 | api/learning/__tests__/session-api.test.js | 1480 | 3 | 0 | P0 |
| 5 | src/components/learning-runtime/__tests__/view-models.test.js | 1474 | 2 | 0 | P0 |
| 6 | scripts/learning/__tests__/question-analysis-backfill.test.js | 1466 | 1 | 0 | P0 |
| 7 | api/learning/__tests__/review-task-service.test.js | 1415 | 2 | 0 | P0 |
| 8 | api/learning/__tests__/attempt-event-service.test.js | 1325 | 0 | 0 | P0 |
| 9 | src/api/__tests__/learningRuntimeApi.test.js | 1089 | 2 | 0 | P0 |
| 10 | tests/ao/state-runner.test.js | 1047 | 8 | 0 | P0 |
| 11 | tests/ao/action-executor.test.js | 1017 | 5 | 0 | P0 |
| 12 | api/marking/__tests__/evaluate-v1.test.js | 1016 | 1 | 0 | P0 |
| 13 | scripts/evaluation/__tests__/question-search-gate.test.js | 1015 | 2 | 0 | P0 |
| 14 | api/learning/__tests__/question-import-service.test.js | 934 | 2 | 0 | P0 |
| 15 | api/learning/__tests__/artifact-service.test.js | 832 | 0 | 0 | P0 |
| 16 | tests/ao/manage-runner.test.js | 821 | 10 | 0 | P0 |
| 17 | tests/ao/state-repository.test.js | 736 | 5 | 0 | P0 |
| 18 | tests/evidence-ledger/aggregation.pbt.test.js | 720 | 2 | 0 | P0 |
| 19 | scripts/learning/__tests__/paper-question-registry-backfill.test.js | 706 | 1 | 0 | P0 |
| 20 | api/error-book/__tests__/error-book-api.test.js | 701 | 1 | 0 | P0 |
| 21 | tests/ao/lifecycle-engine.test.js | 649 | 3 | 0 | P1 |
| 22 | scripts/rag/__tests__/corpus-schema-compat.test.js | 636 | 1 | 0 | P1 |
| 23 | tests/ao/state-contracts.test.js | 633 | 1 | 0 | P1 |
| 24 | scripts/learning/__tests__/question-evidence-bundle-v1.test.js | 600 | 0 | 0 | P1 |
| 25 | tests/evidence-ledger/error-event-writer.pbt.test.js | 586 | 2 | 0 | P1 |
| 26 | src/components/learning-runtime/__tests__/WorkspaceShell.test.js | 577 | 4 | 0 | P1 |
| 27 | tests/evidence-ledger/decision-writer.pbt.test.js | 544 | 3 | 0 | P1 |
| 28 | api/learning/__tests__/paper-workspace-entry-resolver.test.js | 532 | 0 | 0 | P1 |
| 29 | tests/evidence-ledger/attempt-repository.pbt.test.js | 525 | 2 | 0 | P1 |
| 30 | api/learning/__tests__/schema-contract.test.js | 517 | 2 | 0 | P1 |

## Candidate dependency clusters
### Top external dependency packages by importing-file count
| Package | Importing files | Risk |
|---|---:|---|
| node:path | 297 | P1 |
| node:fs | 272 | P1 |
| @jest/globals | 130 | P1 |
| node:url | 107 | P1 |
| react | 85 | P1 |
| node:os | 52 | P1 |
| node:child_process | 42 | P1 |
| framer-motion | 37 | P1 |
| node:crypto | 34 | P2 |
| lucide-react | 31 | P2 |
| react-router-dom | 29 | P2 |
| dotenv | 17 | P2 |
| node:http | 11 | P2 |
| @supabase/supabase-js | 11 | P2 |
| fast-check | 9 | P2 |
| supertest | 8 | P2 |
| path | 7 | P2 |
| react-dom | 6 | P2 |
| fs | 5 | P2 |
| node:module | 5 | P2 |

### Internal coupling edges (root directory -> root directory)
| From | To | Count | Risk |
|---|---|---:|---|
| api | api | 273 | P1 |
| scripts | scripts | 217 | P1 |
| src | src | 178 | P1 |
| tests | scripts | 61 | P1 |
| scripts | api | 52 | P1 |
| tests | api | 6 | P2 |

## Interpretation guidance
- P0/P1/P2 labels indicate review-impact risk only; no refactor decisions are implied.
- The same file can appear in multiple sections; confirm evidence before downstream triage.
- Treat `.github/workflows` outputs separately if future non-code generated artifacts are added in this scope path.
