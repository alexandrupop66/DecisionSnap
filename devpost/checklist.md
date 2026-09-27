---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. The demo decision ranks transparently and the winner changes when priorities change**
  Becomes usable: A running single-page DecisionSnap demo with three laptop options, visible criteria and scores, weights that always total 100%, deterministic ranking, transparent breakdown, and the intended Price-weight winner-change moment.
  Why now: This proves the unique kernel and the visual WOW moment before any external AI dependency can slow or destabilise the build. It also gives every later feature a working end-to-end surface to extend.
  PRD ref: `prd.md > Weight controls`, `prd.md > Deterministic scoring and ranking`, `prd.md > Explanation and WOW moment`
  Spec ref: `spec.md > Deterministic Scoring Engine`, `spec.md > Weight Rebalancer`, `spec.md > Ranking and Breakdown View`, `spec.md > Deterministic Explanation Generator`, `spec.md > Demo Fallback`
  Build: Scaffold the dependency-free Node project inside this slice; create the single-page UI, demo dataset, deterministic scoring helpers, proportional weight redistribution, ranking/breakdown rendering, local explanation, and the clean visual treatment from the spec. Freeze demo scores only after the Price-weight change produces a strong visible winner switch.
  Verify (mechanical): Run `npm test`; start the server; verify `/` loads successfully; run a deterministic script/test confirming initial totals, weights sum to 100, repeated calculations match, and increasing Price causes the expected winner change.
  Learner check: Open DecisionSnap, use the demo data, drag Price substantially higher, and confirm the winner change and explanation are obvious without needing a technical explanation.
  Commit: `Build deterministic DecisionSnap demo core`

- [x] **2. A real decision can be analysed by AI and turned into the same transparent ranking**
  Becomes usable: The user can type a decision plus 2–3 options, press **Analyse with AI**, and receive AI-generated criteria and per-option scores that feed the already-working deterministic ranking. If live AI is unavailable, the app clearly offers the demo path rather than breaking.
  Why now: This adds the AI half of the product only after the deterministic kernel is proven, while testing the main external-risk integration before polish work continues.
  PRD ref: `prd.md > Decision and options`, `prd.md > AI-assisted criteria and option scoring`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Decision Input Panel`, `spec.md > AI Analysis Route`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Add the decision/options form, input validation, `POST /api/analyse`, Gemini prompt and structured-output schema, response validation/normalisation, loading/error UI, `.env.example`, and one-click fallback to the labelled demo dataset. Keep the final ranking calculation entirely local and deterministic.
  Verify (mechanical): Run `npm test`; test the route with incomplete input and absent API key; validate the parser against a representative structured response; if `GEMINI_API_KEY` is available, run one live request and verify every option has an integer 0–100 score for every returned criterion. Confirm malformed AI output is rejected cleanly.
  Learner check: Enter a simple three-option decision, run AI analysis if configured, and confirm you can see exactly which criteria and scores AI supplied rather than only a black-box recommendation. If live AI is unavailable, confirm the fallback message and demo button are clear.
  Commit: `Add structured AI decision analysis`

- [x] **3. The user can edit criteria and the complete one-page flow is polished and demo-ready**
  Becomes usable: Criteria can be renamed, removed, or added within the same page; rescoring preserves a valid state; incomplete inputs, ties, AI refresh failures, and normal use remain understandable; the whole screen is polished enough to record without explanation-heavy narration.
  Why now: These are the remaining POC behaviours and presentation details. They are added only after both the deterministic kernel and AI integration work, so polish cannot hide a broken core.
  PRD ref: `prd.md > AI-assisted criteria and option scoring`, `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > States and Boundaries`, `prd.md > What We're Building`
  Spec ref: `spec.md > Criteria and Weight Panel`, `spec.md > Look and Feel`, `spec.md > Important Failure Modes`, `spec.md > File Structure`
  Build: Add criterion rename/remove/add controls; rescore changed criteria through the existing AI route while preserving the last valid state on failure; handle ties/near-ties and incomplete input; refine spacing, typography, cards, slider feedback, winner-change emphasis, accessibility basics, and responsive behaviour; finish README setup/demo/AI-disclosure instructions.
  Verify (mechanical): Run the full test suite; start the app and exercise add/rename/remove, a failed rescore, incomplete input, a tie/near-tie fixture, and the frozen demo path; confirm no console/server errors on the core journey and that README start instructions work from a clean shell.
  Learner check: Run the complete demo path yourself from first screen to winner change, then try one awkward input or criterion edit and tell me anything that feels confusing, ugly, or unnecessary.
  Commit: `Complete editable polished DecisionSnap flow`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after Slice 1; learner confirmed the winner switch works and described the interface as “super tare”, with no requested changes
- [x] Final kick-the-tires exploration and feedback completed — learner tested the final v5 flow, supplied a screenshot, and confirmed “perfect, ramane asa”

## Final Review

- [x] Decision composer rebuilt and learner rechecked — decision sentence plus visible Criteria and Options lists, safe dropdown re-add flow, and Gemini model-capacity fallback work as intended.

- [x] Final review complete — feedback resolved; learner explicitly confirmed the final interface should remain as-is and is ready to ship

## Code Tour and App Map

- [x] Learning activity complete — prior practice connected: prompt-as-contract vs. open-ended AI recommendation, grounded in the finished Gemini request and deterministic ranking
- [x] Optional edit and transfer reflection addressed — optional edit not needed after final freeze; transfer reflection offered in the handoff
- [x] `devpost/app-map.html` generated from finished code, checked offline, and prepared for review, including a project-grounded practice to reuse

Activity and evidence: Focused recap connected the learner's prompt-design goal to `src/ai.js > buildGeminiRequest()`, `test/ai.test.js`, and the observed design choice that AI supplies structured criteria/scores while deterministic code chooses the ranking.
Route and stops: Reference route recorded in `devpost/app-map.html`: `public/js/app.js > analyseWithAI()`, `src/ai.js > buildGeminiRequest()/analyseDecision()`, and `public/js/scoring.js > calculateRanking()/rebalanceWeights()`.
Edit outcome: Not applicable — the learner froze the final UI/flow after review; no extra learning edit was introduced.
Reflection: Offered in the final handoff; optional and not a submission gate.
Activity mode: Prior practice connected + reference app map.

## Revisions

- Decision composer rebuilt after learner feedback — the original fixed Option 1/2/3 fields hid the assumptions. The revised composer shows editable Criteria and Options lists before AI analysis, uses the supplied criteria exactly, and the demo decision explicitly states the trade-offs.
- Gemini capacity fallback added — a live 3.7 Flash request reached Gemini but hit a temporary high-demand error, so the AI route now tries stable Flash models 3.8 → 3.7 → 3.6 on capacity/rate failures while preserving the deterministic demo fallback.
- Windows API-key setup was hardened after final-review feedback showed that manually creating `.env` was error-prone. A dependency-free `.env` parser, one-click Windows setup/start scripts, `/api/status` indicator, and Gemini connection diagnostic were added; the product behavior and approved architecture remain unchanged.
- Express was removed after the build environment could not access npm and the learner approved the simpler architecture. The app now uses Node's built-in HTTP server, preserving the same product behavior with zero runtime dependencies.
- Browser-only scoring and demo data live under `public/js/` rather than `src/`, because those modules execute directly in the browser with no bundler. The approved architecture and behavior are unchanged; `spec.md > File Structure` was corrected to match the runnable implementation.
- Composer list interaction refined after final-review feedback — Criteria and Options now use one add field each; once added, values render as clean list entries with remove controls instead of staying as editable inputs.
- Composer re-add flow refined after learner feedback — removed Criteria and Options now return to dropdown pick-lists, preventing accidental spelling variants and making restoration one click; genuinely new values remain available through a secondary “add different” action.
