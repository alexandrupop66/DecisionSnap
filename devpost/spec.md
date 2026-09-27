---
doc: spec
status: approved
---

# DecisionSnap — Technical Spec

## How This Works, In Plain Language
DecisionSnap will be a very small web app that runs locally in the browser. A lightweight Node.js server serves the page and makes the single external AI request so the Gemini API key never has to be exposed in browser code.

The user sees a decision sentence plus explicit Criteria and Options list composers. The demo is prefilled with the laptop decision, five visible criteria, and Laptop A/B/C. If the user keeps criteria, Gemini must score exactly those criteria; if the list is cleared, Gemini may suggest a concise set. The server sends the visible inputs to Gemini with a tightly constrained prompt and JSON schema. Gemini returns a 0–100 desirability score for every option on every active criterion. A higher score always means “better for this criterion,” so the browser never needs special-case maths for price versus performance.

From that point onward, the important logic is local and deterministic. The browser combines the visible AI scores with the user-controlled weights, calculates weighted totals, ranks the options, and explains which visible contributions caused the current leader to win. Changing a weight does not call AI again: it recalculates instantly in JavaScript. This preserves the project kernel from `scope.md > The Unique Kernel`: AI structures and scores the inputs; deterministic code evaluates them; the human controls priorities.

If the AI call fails, DecisionSnap offers the known-good demo dataset so the weighting, ranking, breakdown, and winner-change moment still work. No account, database, framework-heavy frontend, build pipeline, or deployment is required for the proof of concept.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. The user opens `http://localhost:3000` and sees one clean decision workspace.
2. They edit the decision sentence, add/remove Criteria and 2–3 Options, then press **Analyse with AI**. Added criteria/options are shown as fixed list entries. The primary add control is a pick-list containing saved values that are not currently active, so removed items can be restored without retyping; a secondary “add different” action is reserved for genuinely new values.
3. Browser JavaScript sends `{ decision, options, criteria }` to `POST /api/analyse`; if the Criteria list is deliberately empty, the `criteria` field is omitted.
4. The server validates the input, adds the DecisionSnap instruction and JSON schema, and calls Gemini 3.8 Flash first, falling back to 3.7 then 3.6 only for temporary capacity/rate failures.
5. Gemini returns structured JSON containing the exact supplied criteria (or a suggested set when none were supplied) and a 0–100 score for every option under every criterion.
6. The server validates and normalises the response before returning it to the browser. Invalid AI output is treated as an AI failure rather than silently trusted.
7. The browser creates equal initial weights totalling 100%, calculates each option’s weighted score, and renders ranking, score breakdown, and a short deterministic explanation.
8. When the user changes one weight, the browser proportionally redistributes the remaining weights so the total remains exactly 100%, then recalculates the result immediately without another API call.
9. Removing a criterion is local and recalculates immediately. Adding or renaming a criterion triggers a small AI refresh for the current criterion list so the AI can provide valid scores for that changed criterion set; if that refresh fails, the previous valid scored state remains on screen.
10. In the demo scenario, increasing **Price** substantially makes a different option move into first place, producing the visible WOW moment required by `prd.md > Explanation and WOW moment`.

## Stack

### Node.js 24 LTS
- Runtime: Node.js 24.x LTS.
- Documentation: https://nodejs.org/download/release/latest-v24.x/docs/api/
- Release status: https://nodejs.org/en/about/previous-releases
- Reason: one JavaScript language for server and browser, current LTS, built-in `fetch`, built-in test runner, and no extra runtime tooling.
- Accepted tradeoff: this is intentionally a local single-process app rather than a production architecture.

### Browser HTML, CSS, and JavaScript
- No React, Next.js, Vue, Tailwind build step, bundler, or component framework.
- Reason: the POC has one screen and one interaction loop; native browser code is the shortest reliable path.
- Accepted tradeoff: fewer abstractions and reusable components, which is appropriate for this single-page demo.

### Gemini Flash model chain
- Preferred model ID: `gemini-3.8-flash`.
- Automatic capacity fallbacks: `gemini-3.7-flash`, then `gemini-3.6-flash`.
- Model docs: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- Structured outputs: https://ai.google.dev/gemini-api/docs/structured-output
- API reference: https://ai.google.dev/api
- Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Reason: current stable Flash models support structured output; a short fallback chain protects the demo from temporary model-capacity spikes.
- Accepted tradeoff: an external API can still fail, so it is not allowed to be the only path to a filmable demo.

## Where It Runs and How Someone Tries It
DecisionSnap runs locally on Node.js and opens in any modern desktop browser.

Environment requirements:
- Node.js 24.x.
- One environment variable for live AI: `GEMINI_API_KEY`.
- No database or other service.

No dependency install is required.

Run with live AI:
```bash
npm start
```

`npm start` uses DecisionSnap's small dependency-free environment loader to read `.env` locally. On Windows, `1_SETUP_GEMINI_KEY.bat` creates the file correctly so the learner does not have to rely on hidden filename extensions. The repository includes `.env.example` but must not include a real `.env` or API key.

Open:
```text
http://localhost:3000
```

Demo recording path:
1. Open the app.
2. Load or enter the stable laptop demo scenario.
3. Analyse with AI, or use the clearly labelled demo fallback if the API is unavailable.
4. Show criteria, AI scores, initial ranking, and breakdown.
5. Increase Price weight.
6. Show the winner changing immediately and the explanation updating.

Deployment is intentionally deferred. The required public GitHub repository and demo video do not require a hosted production URL.

## Look and Feel
Implements `prd.md > Look and Feel` and carries forward `scope.md > Inspiration & Identity`.

- **Overall:** light, clean, calm, and immediately understandable.
- **Layout:** one centred workspace with generous whitespace and clear top-to-bottom progression.
- **Typography:** modern system sans-serif stack; no web-font dependency is required.
- **Colour:** neutral light background and cards, dark readable text, one restrained accent colour for primary actions, active sliders, and winner emphasis.
- **Controls:** large obvious inputs and sliders; weight percentages always visible.
- **Ranking:** visually prominent, with first place easy to identify in a screen recording.
- **Motion:** one short, subtle transition when ranking order changes; no decorative animation system.
- **Copy:** short plain-English labels and explanations.
- **Avoid:** dark mode, dense dashboards, navigation menus, decorative gradients, excessive badges, tutorial overlays, and anything that competes with the weight-change moment.

## Components

### Decision Input Panel
Implements `prd.md > Decision and options`.

Contains the decision sentence, a visible Criteria list, a visible Options list, **Analyse with AI**, and **Reset to laptop demo**. Each composer has an available-items pick-list; after an item is added it becomes a fixed list row with a remove control, and removing it returns it to the pick-list. A secondary “add different” action stores a genuinely new label in the same catalog so it can also be re-added later. The demo starts prefilled so a reviewer immediately sees the assumptions and alternatives. The Criteria list may be cleared to ask AI to suggest criteria. It performs client-side completeness checks before any API request.

### AI Analysis Route
Implements `prd.md > AI-assisted criteria and option scoring`.

`POST /api/analyse` accepts the user decision, options, and optionally an explicit current criterion-name list. When criteria are supplied, the AI must use exactly those names; when absent, AI suggests a small set. The route tries Gemini 3.8 Flash first and automatically falls back to 3.7 then 3.6 only for temporary capacity/rate failures. It validates the structured response and returns only safe normalised JSON to the browser.

### Criteria and Weight Panel
Implements `prd.md > AI-assisted criteria and option scoring` and `prd.md > Weight controls`.

Shows each criterion name, its current weight, rename/remove controls, and an add-criterion control. Weight changes are handled entirely in browser JavaScript. Adding or renaming requests refreshed AI scores for the current criterion list; removing is local because existing scores for remaining criteria are already valid.

### Deterministic Scoring Engine
Implements `prd.md > Deterministic scoring and ranking`.

A pure JavaScript module/function calculates weighted scores from visible inputs only.

For option `o`:

`total(o) = Σ(score(o, criterion) × weight(criterion) / 100)`

AI scores are integers from 0–100 and weights total exactly 100, so the final score is also on a 0–100 scale.

The scoring function must not call AI, use randomness, or contain hidden bonuses.

### Weight Rebalancer
Implements `prd.md > Weight controls`.

When one weight changes from `old` to `target`:
1. Clamp the target to 0–100.
2. Keep that chosen criterion at the target value.
3. Distribute the remaining `100 - target` proportionally across the other active criteria using their previous relative weights.
4. Apply a small final rounding correction to one non-selected criterion so displayed integer percentages total exactly 100.

Special case: if all other weights were zero, distribute the remaining percentage equally across them before rounding.

### Ranking and Breakdown View
Implements `prd.md > Deterministic scoring and ranking`.

Displays ordered options, final 0–100 totals, and a compact table/card breakdown showing each raw AI criterion score, current weight, and weighted contribution. Ties are allowed and shown honestly.

### Deterministic Explanation Generator
Implements `prd.md > Explanation and WOW moment`.

The explanation is generated locally from visible numbers rather than requiring a second AI call. It identifies the current leader and the criterion(s) making the largest weighted contribution or the weight change that caused the lead to switch.

Example shape:
> Laptop C now ranks first because affordability became your dominant priority.

This keeps explanations fast, reproducible, and aligned with the visible calculation.

### Demo Fallback
Implements `prd.md > States and Boundaries > AI failure`.

A local JSON dataset contains one clearly labelled laptop scenario with criteria, option scores, and initial weights chosen to guarantee the intended winner-change demonstration. It is fallback/sample data, not represented as a live AI response.

## Data Model
All active decision data lives in browser memory for the current session only.

```js
{
  decision: "Which laptop gives me the best balance of price, performance, battery life, portability and display quality?",
  options: [
    { id: "a", name: "Laptop A" },
    { id: "b", name: "Laptop B" },
    { id: "c", name: "Laptop C" }
  ],
  criteria: [
    { id: "price", name: "Price", weight: 30 },
    { id: "performance", name: "Performance", weight: 30 }
  ],
  scores: {
    a: { price: 62, performance: 92 },
    b: { price: 74, performance: 84 },
    c: { price: 95, performance: 68 }
  },
  source: "ai" // or "demo"
}
```

Rules:
- Criterion IDs remain stable across weight changes.
- AI score range is 0–100 inclusive; higher always means more desirable for that criterion.
- Weights total 100.
- Ranking and explanation are derived values and are recalculated rather than stored.
- No data persistence is required. Refreshing the browser starts a fresh session.

## File Structure

```text
DecisionSnap/
├── devpost/
│   ├── learner-profile.md     # private learning context; ignored by git
│   ├── scope.md               # approved product scope
│   ├── prd.md                 # approved product requirements
│   └── spec.md                # this technical blueprint
├── public/
│   ├── index.html             # single DecisionSnap page
│   ├── styles.css             # all visual styling
│   └── js/
│       ├── app.js             # UI, edits, rendering, API calls
│       ├── criteria.js        # pure criterion edit/rescore state helpers
│       ├── scoring.js         # deterministic scoring + weight redistribution helpers
│       └── demo-data.js       # known-good fallback scenario
├── src/
│   └── ai.js                  # Gemini request, prompt, schema, response validation
├── test/
│   ├── ai.test.js             # structured AI contract and malformed-output tests
│   ├── criteria.test.js       # edit, removal and failed-rescore state tests
│   ├── scoring.test.js        # weighted scoring, redistribution and near-tie tests
│   └── server.test.js         # page, input and no-key route tests
├── .env.example               # GEMINI_API_KEY= without a secret
├── .gitignore                 # ignores .env and learner profile
├── package.json
├── server.js                  # Native Node HTTP server + /api/analyse
└── README.md                  # setup, run, demo, architecture, AI disclosure
```

## External Services and Dependencies

### Gemini API
Only external service.

Endpoint:
```text
POST https://generativelanguage.googleapis.com/v1beta/interactions
```

Authentication header:
```text
x-goog-api-key: <GEMINI_API_KEY>
```

Core request shape:
```json
{
  "model": "gemini-3.8-flash",
  "input": "<DecisionSnap instruction + decision + options + optional fixed criterion names>",
  "response_format": {
    "type": "text",
    "mime_type": "application/json",
    "schema": "<DecisionSnap JSON schema>"
  }
}
```

DecisionSnap's schema will require approximately this logical shape:
```json
{
  "criteria": [
    {
      "id": "price",
      "name": "Price",
      "reason": "Why this matters",
      "scores": [
        { "optionId": "a", "score": 62, "reason": "Short justification" }
      ]
    }
  ]
}
```

Prompt constraints:
- Return only criteria relevant to the stated decision.
- Keep the POC criterion count small (target 4–5).
- Score every option for every criterion.
- Score 0–100, where 100 always means more desirable for that criterion.
- For cost criteria, lower real-world cost therefore receives a higher desirability score.
- Use only the supplied options; never add a winner or final ranking.
- Keep justifications short and evidence-aware; if factual product data was not supplied, treat scores as comparative AI estimates rather than verified specifications.
- When explicit criterion names are supplied after an edit, return those criteria rather than inventing a different set.

Response handling:
1. Check HTTP success.
2. Parse returned structured JSON.
3. Validate criterion count, unique IDs/names, all required option IDs, and integer scores 0–100.
4. Reject incomplete or malformed output.
5. Return normalised data to the browser.

Rate limits and quotas can vary by account/tier; the POC makes only occasional requests and does not depend on a particular numerical quota. The model chain uses stable Gemini Flash releases. The demo fallback ensures the project remains filmable if API access is unavailable or all selected models are temporarily capacity-constrained.

## Important Failure Modes

- **Gemini API unavailable, key absent, quota/rate error, or malformed JSON** → show a concise “Live AI unavailable” state and one-click **Use demo data**. Never block the deterministic core demo.
- **User input incomplete** → do not call AI; highlight the missing decision/options and keep results hidden.
- **AI refresh fails after criterion add/rename** → keep the last valid scored state, explain that the edit could not be rescored, and allow retry or revert. Never combine a new criterion name with stale unrelated scores.
- **Rounding in weight redistribution** → apply deterministic correction so visible integer weights always total exactly 100.

## What Was Simplified and Why

- **Plain HTML/CSS/JS** instead of React/Next or another frontend framework — one screen does not justify framework setup or build tooling.
- **One native Node HTTP process** instead of separate frontend/backend services — fewer moving pieces and easier demo startup.
- **Browser-memory session data** instead of database/local persistence — saved decisions do not prove the kernel.
- **One AI request for analysis/rescoring** instead of agents or multi-step AI workflows — structured output is enough to demonstrate AI-assisted decision modelling.
- **Deterministic local explanation** instead of a second LLM explanation call — faster, reproducible, and more transparent.
- **Fixed demo fallback** instead of depending on live API availability during judging/video recording — protects the demonstration while clearly labelling sample data.
- **Local recording** instead of deployment — hosting does not strengthen the proof enough to justify time today.

## Decisions and Open Issues

### Learner decisions
- Keep everything as simple and intuitive as possible, with no unnecessary complications.
- Use Node.js 24 LTS + native Node HTTP + plain HTML/CSS/JavaScript.
- Prefer Gemini 3.8 Flash for AI criteria and option scoring, with automatic 3.7/3.6 capacity fallbacks.
- Use a clean light interface with whitespace, simple cards, modern sans-serif typography, one restrained accent colour, and minimal motion.
- AI assigns criterion scores; deterministic code calculates the final ranking.
- Changing one weight automatically redistributes the others so the total remains 100%.

### Derived implementation decisions
- Use only Node built-ins (`node:http`, `fetch`, environment-file support, and `node:test`) so the runtime has zero npm dependencies.
- Treat all AI scores as desirability scores where higher is always better, avoiding criterion-direction complexity in the scoring engine.
- Generate ranking explanations locally from the same visible numbers used by the calculation.
- Keep no session persistence.

### Learning question clarified
The learner wants to understand how AI interprets prompts well enough to design higher-impact prompts. DecisionSnap gives one concrete example: rather than asking the model “Which option is best?”, the prompt constrains the AI to a role, a bounded task, a 0–100 scoring convention, a fixed JSON schema, and an explicit prohibition on selecting the final winner. The observable build test is whether those constraints repeatedly produce complete structured data that deterministic code can safely consume. This demonstrates the practical difference between an open-ended recommendation prompt and a contract-like prompt designed for software integration.

### Build-time checks
- Use the documented Gemini Interactions REST endpoint with structured JSON output; verify the response text envelope during the AI slice before relying on it. Completed with parser tests for the documented model-output envelope; a real live call still requires the learner's Gemini API key.
- Tune the stable demo scores once so the intended Price-weight winner change is visually strong, then freeze that dataset for recording.
- No product-defining open question remains before build.
