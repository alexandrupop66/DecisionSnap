---
doc: prd
status: approved
---

# DecisionSnap — Product Requirements

DecisionSnap is a single-flow AI-assisted decision tool for a person comparing a few alternatives against conflicting priorities, with transparent scoring and user-controlled weights.
Source: `scope.md > Who It's For`, `scope.md > The Unique Kernel`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. The user opens DecisionSnap and sees a simple decision workspace rather than a dashboard.
2. The user sees a decision sentence that states what “best” means, plus explicit Criteria and Options lists. The stable demo begins with the laptop decision, five visible criteria, and Laptop A/B/C.
3. The user can add or remove criteria/options before analysis. Removed items return to a pick-list so they can be restored without retyping; a small “add different” escape hatch exists only for genuinely new values. Added items appear as list entries rather than remaining editable text fields. If the Criteria list is empty, AI suggests a short relevant set; if criteria are supplied, AI must use exactly those criteria.
4. AI assigns an explicit score to each option for each active criterion. These scores are visible in the breakdown used for ranking.
5. The user can rename, remove, or add criteria before relying on the result.
6. The user adjusts criterion weights to reflect what matters most. Weights always total 100%: when one weight increases or decreases, the remaining weights are redistributed automatically and proportionally.
7. DecisionSnap recalculates the weighted result immediately using deterministic scoring and displays the ranking, total score, criterion breakdown, and a short explanation.
8. The user changes a priority and sees the ranking respond instantly. In the demo, increasing the importance of price changes the winning option and the explanation states why.
9. Success is reached when the user can understand both the current winner and the trade-off that caused it to win, without treating the AI as an opaque final authority.

## Screens and Layout
Source: `scope.md > Inspiration & Identity`, `scope.md > The POC Boundary`.

DecisionSnap uses one primary page with a natural top-to-bottom flow:

- **Decision area** — a plain-English decision sentence describing the desired balance or outcome.
- **Criteria composer** — an explicit list such as Price, Performance, Battery life, Portability, and Display quality. Criteria are normally added from a pick-list of available/saved values and then shown as fixed list entries with remove controls. Removing a criterion returns it to the pick-list; a separate “add different” action handles genuinely new criteria. The list may be cleared to let AI suggest criteria.
- **Options composer** — an explicit list such as Laptop A, Laptop B, and Laptop C. Options are normally added from a pick-list of available/saved values and then shown as fixed list entries with remove controls. Removing an option returns it to the pick-list; a separate “add different” action handles genuinely new options.
- **Weight controls** — a clear weight control beside each criterion, with the total implicitly maintained at 100%.
- **Ranking area** — visually prominent ordered results with total scores.
- **Breakdown area** — visible per-criterion scores and weighted contributions for each option.
- **Explanation area** — a short plain-language explanation of why the leading option ranks first and, after a weight change, why the ranking changed.

The user should not need navigation, accounts, settings pages, or a tutorial to complete the core journey.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.

The product should feel simple, intelligent, polished, and immediately understandable in a screen recording. It should favour whitespace, readable typography, cards or clearly separated sections, obvious weight controls, and a ranking that can be understood at a glance. The interface should avoid dense enterprise dashboards, unnecessary menus, long explanatory text, or visual clutter. The weight-change moment must be visually obvious enough to understand without narration.

## Features and Behavior

### Decision and options
Source: `scope.md > The Core Loop`.

- The user can enter one decision sentence describing what a good result should balance.
- The user sees the option list directly before analysis and can add/remove entries. Once added, each option is displayed as a list item rather than a permanently editable field.
- The user can provide at least two and up to three options.
- The stable demo sentence is: “Which laptop gives me the best balance of price, performance, battery life, portability and display quality?”
- The stable demo path shows Laptop A, Laptop B, and Laptop C explicitly so the ranking change is easy to see.
- Incomplete input should not produce a misleading ranking; the interface should clearly indicate that more information is required.

### AI-assisted criteria and option scoring
Source: `scope.md > The Unique Kernel`, `scope.md > The POC Boundary`.

- The user sees a Criteria list before analysis. The stable demo exposes Price, Performance, Battery life, Portability, and Display quality. Criteria are added as list items and can be removed; they do not remain as always-editable fields in the composer.
- If the Criteria list is empty, AI interprets the decision/options and returns a concise relevant set. If criteria are supplied, AI uses exactly that visible set rather than silently replacing it.
- AI assigns a score for every option against every criterion.
- The generated criteria and scores must be represented explicitly enough that the user can see what the ranking is based on.
- Criteria remain under user control: the user can rename, remove, or add them.
- The AI does not directly choose the final winner. Its structured criteria and option scores become inputs to the deterministic ranking logic.

Acceptance criteria:
- [ ] With a complete decision and 2–3 options, useful criteria appear.
- [ ] Every option has a score for every active criterion.
- [ ] The scoring basis is visible in the breakdown rather than hidden behind a single recommendation.
- [ ] The user can modify the criterion set without restarting the decision.

### Weight controls
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

- Every active criterion has a visible percentage weight.
- Active weights always total 100%.
- When the user changes one weight, all remaining weights are redistributed automatically and proportionally so the total stays at 100%.
- The updated percentages are shown immediately so the user can see the new priority mix.

Acceptance criteria:
- [ ] The displayed weights total 100% at all times.
- [ ] Increasing one criterion reduces the others automatically without requiring manual correction.
- [ ] A weight change triggers immediate recalculation of the ranking.

### Deterministic scoring and ranking
Source: `scope.md > The Unique Kernel`, `scope.md > What "Working" Looks Like`.

- DecisionSnap combines the AI-produced option scores with the user-controlled weights using a deterministic weighted calculation.
- For the same scores and weights, the same ranking must always be produced.
- Each option displays a total score and its position in the ranking.
- The breakdown shows how individual criteria contribute to the result.
- Close or tied results remain valid outcomes; the interface must not invent certainty where the scores are effectively equal.

Acceptance criteria:
- [ ] The ranking changes only when its underlying scores, criteria, or weights change.
- [ ] The total scores match the visible criterion scores and weights.
- [ ] Repeating the same calculation produces the same result.
- [ ] A tie or near-tie is displayed without breaking the core flow.

### Explanation and WOW moment
Source: `scope.md > What "Working" Looks Like`.

- The interface gives a short explanation of why the current leading option ranks first.
- After a material weight change, the explanation reflects the new dominant priority.
- The demo scenario must support a visible winner change when price becomes substantially more important.

Acceptance criteria:
- [ ] The initial demo state has a clear leader.
- [ ] Increasing the price weight causes a different option to become the leader.
- [ ] The ranking update is immediate and visually obvious.
- [ ] The explanation explicitly connects the change in winner to the changed priority.

## States and Boundaries

- **First use** — the page shows the decision and option inputs with enough guidance to start, without a tutorial flow.
- **Normal state** — criteria, AI-generated option scores, weights, ranking, breakdown, and explanation are visible together in the single decision workspace.
- **Incomplete input** — if too few usable options or insufficient decision information are provided, DecisionSnap does not fabricate a final ranking and instead prompts for the missing input.
- **AI failure** — the core application must still have a stable demo/fallback path so deterministic scoring, weighting, ranking, and the WOW moment can be demonstrated even if the AI call fails.
- **Tie or near-tie** — the result may show equal or very close scores rather than forcing a false distinction.
- **Session boundary** — persistence between sessions is not required for this POC.

## Product Decisions

- AI will decide the option scores for each criterion, rather than requiring the user to score every option manually. The criteria themselves are visible before analysis and can be supplied by the user; AI only invents them when the list is deliberately left empty. This keeps the interaction fast while making the assumptions explicit.
- The AI structures and scores the decision, but deterministic logic produces the final weighted ranking. This preserves the project's central distinction between AI assistance and the final calculation.
- Weight totals are maintained automatically. Changing one criterion redistributes the remaining weights proportionally so the total always remains 100%, avoiding manual slider housekeeping and preserving the instant demo moment.
- The POC uses a single primary page because the central interaction should be understandable and filmable without navigation overhead.
- The user controls criteria and their importance; accounts, saved history, and collaboration are deliberately excluded because they do not help prove the kernel.

## What We're Building

- One polished single-page decision flow.
- Decision sentence input that can describe the desired balance/trade-offs.
- Visible Criteria list with a pick-list for safe re-adding, remove controls, and a secondary “add different” action; added items render as list entries.
- Visible Options list with a pick-list for safe re-adding, remove controls, and a secondary “add different” action (2–3 options at analysis time); added items render as list entries.
- AI-generated relevant criteria only when the visible Criteria list is empty; otherwise AI respects the supplied list.
- AI-generated option scores for each criterion.
- Editable criteria: rename, add, remove.
- User-controlled criterion weights.
- Automatic proportional rebalancing to keep weights at 100%.
- Deterministic weighted scoring.
- Instant ranking recalculation.
- Visible total scores and criterion breakdown.
- Short explanation of the leading result and ranking change.
- Stable three-option demo scenario with a clear winner-change WOW moment.
- Graceful incomplete-input and AI-failure behaviour sufficient to preserve the demo.

## Deferred From the POC

- **Presets/examples beyond the stable demo** — useful for onboarding, but not needed to prove the core interaction.
- **Richer charts and visualisations** — may improve presentation later, but the ranking and breakdown must work without them.
- **Export or share** — useful product functionality, but it does not strengthen the central proof enough for today's build.
- **Sensitivity analysis** — closely related to the core idea, but the interactive weight change already demonstrates the concept more simply.
- **More sophisticated explanations** — only worth adding after the ranking and WOW moment are stable.

## Possible Later Enhancements

DecisionSnap could later add reusable decision templates, richer sensitivity analysis, saved decisions, export/share functionality, or collaborative comparison. These remain future product directions rather than requirements for the hackathon POC.

## Non-Goals

- Authentication or user accounts — unnecessary for the proof of concept.
- Database-backed history — no need to preserve decisions for the demo.
- Collaboration or social features — outside the decision kernel.
- Payments — unrelated to the problem being demonstrated.
- Agents, RAG, voice, or MCP — add complexity without enough value for this quick strike.
- Native mobile apps — a responsive demo surface is sufficient.
- Multi-page navigation — would dilute the single clear interaction.
- AI as an opaque final authority — DecisionSnap must expose the criteria, scores, weights, and deterministic result rather than only output a recommendation.

## Open Questions

No product-defining questions remain before `4-spec`. Implementation choices for the AI provider, score format, exact deterministic formula representation, fallback mechanism, and UI technology belong in the technical specification.
