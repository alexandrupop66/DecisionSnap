# DecisionSnap


## Windows quick start (recommended)

No manual `.env` creation is needed.

1. Double-click `1_SETUP_GEMINI_KEY.bat` and paste a **new** Gemini API key.
2. Optional: double-click `3_TEST_GEMINI_CONNECTION.bat` to verify the key and Gemini connection.
3. Double-click `2_START_DECISIONSNAP.bat`.
4. Open `http://localhost:3000` (the script also opens it automatically).

The app displays **AI ready · gemini-3.8-flash** when the key is loaded. Live analysis automatically falls back to Gemini 3.7 Flash and 3.6 Flash if a model is temporarily capacity-constrained. The `.env` file is local-only and ignored by Git.

DecisionSnap is a proof of concept for transparent AI-assisted decisions.

AI structures a decision into criteria and per-option scores. The user controls criterion weights. Deterministic code calculates the final ranking and exposes every weighted contribution.

## Run locally

Requirements: Node.js 22+ (Node.js 24 LTS is the competition target).

```bash
npm start
```

Open http://localhost:3000.

## Enable live AI

DecisionSnap prefers Gemini 3.8 Flash through the Gemini Interactions API, with automatic 3.7/3.6 Flash fallback for temporary capacity errors. The API key stays on the local Node server and is never sent to browser code.

1. Copy `.env.example` to `.env`.
2. Add your key:

```text
GEMINI_API_KEY=your_key_here
```

3. Restart with `npm start`.

If the key is absent or Gemini is unavailable, the app clearly reports that live AI is unavailable and the known-good demo path remains usable.

## Test

```bash
npm test
```

The tests cover deterministic scoring, exact 100% weight redistribution, the frozen winner-change demo, AI input validation, structured-response validation, malformed-output rejection, the HTTP route, and the no-key fallback.

## Demo path

1. Open the app with the laptop demo.
2. Observe Laptop A as the initial leader.
3. Press **Make price the priority → 60%** or move the Price slider to 60%.
4. Observe Laptop C move to first place and the explanation update.

The demo uses clearly labelled fixed sample scores so the visual proof is stable.

## Live AI path

1. Edit the decision sentence, visible **Criteria** list, and visible **Options** list in **Try your own decision**. The laptop demo is prefilled.
2. Press **Analyse with AI**. If you clear the Criteria list, Gemini suggests criteria; otherwise it must use exactly the visible criteria.
3. Gemini returns 0–100 desirability scores for every visible option/criterion pair.
4. DecisionSnap gives the criteria equal starting weights and calculates the ranking locally.
5. Move any weight slider; no second AI request is made.
6. Rename or add a criterion to request fresh AI scores for the explicit edited criterion set; remove a criterion locally without an AI call.

Gemini is explicitly instructed not to choose a winner or assign weights. The final result comes from visible scores + user-controlled weights + deterministic arithmetic.

## AI disclosure

Gemini 3.8 Flash (with 3.7/3.6 capacity fallbacks) is used to suggest comparison criteria only when none are supplied, and to generate comparative 0–100 desirability scores. Those AI scores may be estimates when the prompt does not contain verified factual product data. The AI does not calculate the final winner. Ranking, weight redistribution, criterion removal, score breakdown, and winner explanation are deterministic local code. Renaming or adding a criterion triggers a constrained rescore because the meaning of the scoring dimensions has changed.

## License

Released under the MIT License. See [LICENSE](LICENSE).
