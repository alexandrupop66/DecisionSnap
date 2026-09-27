---
doc: scope
status: approved
---

# DecisionSnap

One line: an AI-assisted decision tool that turns opaque recommendations into visible, adjustable criteria and a transparent ranking.

## The Unique Kernel
AI does not make the final decision. It structures the problem into useful criteria, while deterministic scoring evaluates the options and the human controls the priorities. The memorable moment is that changing a criterion weight can instantly change the winning option and explain why.

## Who It's For
A person trying to choose between a small number of real alternatives when several priorities conflict — for example, someone comparing three laptops on price, performance, battery life, portability, and display. Today they may rely on intuition, spreadsheets, reviews, or an AI answer whose assumptions are not visible.

## The Core Loop
The user enters a decision and a few options. AI suggests relevant criteria. The user edits the criteria and adjusts their importance. DecisionSnap recalculates the ranking immediately and shows the score breakdown and explanation. The user keeps adjusting priorities until the result matches the trade-offs they actually care about.

## Inspiration & Identity
It should feel simple, intelligent, polished, and obviously useful. The interface should be easy to understand in a screen recording, with visible controls and ranking changes rather than a dense dashboard or long explanation.

## Why This Matters to the Learner
This project is a deliberate exercise in disciplined AI-assisted development: turning an idea into a small testable specification, building it with coding agents without unnecessary complexity, understanding enough of the generated architecture to make informed decisions, and improving prompt design through practical use.

## What "Working" Looks Like
A user can open DecisionSnap, enter or load three options, receive useful AI-suggested criteria, adjust criterion weights, and see a deterministic ranking with transparent score breakdowns. In the demo, one option initially ranks first; increasing the importance of price causes another option to take first place immediately, with a short explanation of the change.

## The POC Boundary
In: one polished decision flow, 2–3 options, AI-assisted criterion suggestion, editable criteria, adjustable weights, deterministic scoring, instant recalculation, visible ranking, transparent breakdown, and a stable demo scenario.

The POC only needs enough AI to demonstrate structured criterion generation. Scoring and ranking remain deterministic and must continue to work with a fallback if the AI call fails.

## Later
Presets or examples, richer visualisations, export/share, sensitivity analysis, and more sophisticated explanations are worthwhile only after the core proof works and are not required for this hackathon build.

## Explicitly Cut
- Authentication and accounts — no value for proving the core idea.
- Database and saved history — unnecessary for the demo.
- Collaboration and social features — outside the decision kernel.
- Payments — irrelevant to the proof of concept.
- Agents, RAG, voice, and MCP — complexity without enough judging value for this quick strike.
- Mobile apps and multi-screen product flows — would increase build time without improving the central demonstration.
