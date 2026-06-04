# HandOffLint (Agentic / Multimodal) — POC Specification

> Generated June 1, 2026, by running the capstone-poc-planner skill end-to-end (planner + student roles self-played, with real Phase-2 research). This repositions the original `handofflint-poc-spec.md` (deterministic POC, already built) into an **agentic + multimodal** capstone. Hand this spec to Claude to begin building the agent layer. The deterministic foundation already exists in repo `handofflint/`.

## 1. One-paragraph summary

HandOffLint lets a design lead paste a Figma URL and get a Readiness Score plus severity-sorted, evidence-backed findings before marking a design "ready for dev." Deterministic TypeScript audits (layout, naming, hidden layers, spacing, contrast) produce a trustworthy baseline; a **vision-augmented ReAct agent** then renders suspect frames via the Figma images API, critiques them with a multimodal model, and **cross-checks each visual claim against the JSON** before it becomes a finding — surfacing a class of _perceptual_ defects (broken hierarchy, overlap, crowding, misalignment, "looks unfinished") that JSON audits are structurally blind to. The capstone proves you can make a non-deterministic perceptual agent **trustworthy** via guardrails and evals, not just call a model.

## 2. The problem and the user

- **Specific user**: Design lead / product-design manager at a 10–80 person startup on Figma Pro who personally owns the "ready for dev" gate and absorbs the cost when messy files reach developers.
- **Problem**: Messy Figma (absolute positioning, default names, hidden cruft, off-grid spacing, contrast fails) plus _visual_ defects (broken hierarchy, overlap, crowding) get handed off, causing silent dev rework, Slack churn, and degraded AI-assisted codegen.
- **Current alternative**: Visual skim before handoff; ad-hoc in-editor plugins (Design Lint, Stark) designers rarely install; no unified manager-facing gate.
- **Wedge**: A manager-facing web dashboard with a unified cross-category score from a single URL **plus perceptual findings** no JSON linter can produce — an accountability layer outside Figma, not another in-editor plugin step.

## 3. Why now

Frontier multimodal models can now reason over rendered UI: MMMU-Pro's vision-only setting (arXiv:2409.02813) and Design2Code (arXiv:2403.03163) show VLMs perceive layout and convert screenshots to code. A model can therefore _perceive_ design defects, not just parse JSON — which was not reliable 18 months ago. Crucially, Design2Code also documents that VLMs **lag at recalling visual elements and correct layout**, which is exactly why the perceptual layer must be fenced in by deterministic cross-checks rather than trusted blindly.

## 4. Competitive landscape

| Existing solution                                                                                                           | Approach                                                | How this project differs                                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [FigmaLint (Southleft)](https://www.figma.com/community/plugin/1521241390290871981/figmalint)                               | AI Figma plugin: Readiness Score, WCAG, tokens, codegen | Manager web dashboard; multimodal perceptual findings; no plugin install; avoids name collision |
| [Design Lint (destefanis](https://github.com/destefanis/design-lint) / [moduesss)](https://github.com/moduesss/desing-lint) | In-Figma structural/style/token linters                 | Adds perceptual findings + accountability gate + unified score                                  |
| [Stark](https://www.getstark.co/)                                                                                           | Paid a11y/contrast plugin                               | Broader than a11y; vision-based hierarchy/layout critique                                       |
| [Figma Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247)                                                   | Native inspect + ready-for-dev statuses                 | Scores quality _before_ the gate; complements, doesn't replace                                  |
| [Figma MCP Server](https://developers.figma.com/docs/figma-mcp-server/)                                                     | Official MCP design-context → code                      | We lint _before_ codegen; MCP is a Phase-3 distribution channel                                 |

## 5. Capability-trajectory assumptions

- **Assumes**: (a) frontier VLMs reliably perceive UI-layout/hierarchy defects from a rendered frame; (b) tool-calling loops hold for ~6 steps (BFCL-class reliability); (c) Figma render API (`GET /v1/images`) is accessible on demo files; (d) cross-modal verification can catch most vision hallucinations.
- **Survives improvement when**: models get cheaper/better at vision and tool use → the perceptual layer gets stronger and cheaper; the deterministic base + guardrails remain the trust anchor.
- **At risk if**: Figma ships native perceptual lint + manager dashboards; or vision hallucination proves uncontrollable even with cross-modal checks (mitigated, not eliminated).

## 6. POC scope

- **In scope**:
  - Existing deterministic pipeline (5 audits + Readiness Score + dashboard) — **already built**.
  - `fetch_figma_images` client + `render_frame(nodeId, scale)` tool (Figma images endpoint).
  - `vision_critique(image, context)` tool returning structured candidate _visual_ findings.
  - ReAct tool-calling loop (Vercel AI SDK `generateText` + `tools` + `stopWhen`, step/cost budget) wiring the 5 audits + render + vision + node-context tools.
  - **Guardrail gauntlet**: Zod schema validation on all tool I/O + final output; groundedness (every cited `nodeId` exists); cross-modal verification (vision claims about measurable props checked vs JSON, contradictions dropped); optional critic/judge pass; budget + retry caps; graceful degradation to deterministic-only.
  - Score = deterministic findings ⊕ guardrail-verified visual findings.
  - Agent reasoning-trace panel in the dashboard; AgentMark tracing + JSONL evals.
  - **3 additional deterministic audits (no LLM)** — component reuse detection, SVG path / absolute-positioning analysis, export-format validation. These extend the trustworthy baseline and give the vision agent more ground-truth to cross-check against. Detail in **Appendix A**. Effort permitting; deterministic and independently testable, so they can ship before the agent layer.
- **Explicitly out of scope**:
  - OAuth / accounts / scan-history DB.
  - Figma plugin.
  - **Design-system conformance + RAG** (Phase 2/3 — see §14 and the original spec's Appendix G).
  - **Fuzzy/semantic** component matching ("these visually look like the same component despite different structure") — would need vision/embeddings; the deterministic reuse detection in Appendix A does _not_.
  - Auto-fix / codegen.
- **Smallest hypothesis to prove**: A vision-augmented agent can add _perceptual_ findings a JSON linter cannot, while a deterministic guardrail stack keeps hallucinated findings at ~zero (groundedness 100%, vision precision ≥0.7) — proving "trustworthy perceptual agent," not "we called a vision model."

## 7. Tech stack

- **Models**: OpenRouter (env-configurable), `supported_parameters=tools`. Dev/vision: `google/gemini-2.5-flash` ($0.30/M in, $2.50/M out; image inputs billed as tokens). Demo orchestrator + critic: `anthropic/claude-sonnet-4.5` ($3/M in, $15/M out). Cheap vision fallback: `gemini-2.5-flash-lite`.
- **Agent framework**: Vercel AI SDK tool-calling loop wrapped by AgentMark (`.prompt.mdx`) for prompt versioning + OTel traces. No LangGraph — a 5–7 tool ReAct loop doesn't need graph overhead.
- **Retrieval stack**: N/A for POC (design-system RAG is Phase 2/3).
- **Storage**: none (stateless).
- **Orchestration / hosting**: Vercel (Next.js App Router API routes).
- **Frontend**: existing Next.js + Tailwind dashboard + new agent-trace panel.
- **Observability**: AgentMark (traces, JSONL evals, cost tracking).
- **Why this stack**: matches the existing repo and skills; AgentMark covers prompts + evals + tracing in one tool; OpenRouter enables model comparison and a cheap-vision/strong-critic split; the ReAct loop is the genuine agentic surface while deterministic audits + cross-modal checks keep correctness trustworthy.

## 8. Architecture sketch

```
User pastes Figma URL (Next.js UI)
   ↓
POST /api/scan
   ↓
fetchFigmaTree → runAllAudits → computeReadinessScore   [deterministic — SOURCE OF TRUTH]
   ↓
ReAct agent loop (AI SDK tools + stopWhen, step/cost budget):
   Thought → Action → Observation → repeat
     • render_frame(nodeId, scale)   → GET /v1/images/:key  → PNG URL
     • vision_critique(image, ctx)   → multimodal model     → candidate VISUAL findings
     • get_node_context(nodeId)      → parent/siblings/props from tree
     • run_targeted_audit(nodeId)    → re-run a deterministic check on a subtree
   ↓
GUARDRAIL GAUNTLET
   1. Zod schema on every tool I/O + final output
   2. groundedness: every cited nodeId ∈ tool output           (HARD gate)
   3. cross-modal: vision claims about measurable props vs JSON (drop contradictions)
   4. critic/judge pass (separate model)                        (optional)
   5. budget + retry caps → degrade to deterministic-only on failure
   ↓
score = deterministic ⊕ verified visual findings
   ↓
Dashboard: score + findings (sorted) + Figma deep links + agent trace panel
```

## 9. Eval plan

**Eval cases**:

1. Messy file → score < 60; ≥ 8 findings; ≥ 1 per audit category (catches: skipped audits).
2. Clean file → score > 85; zero critical/high (catches: false positives).
3. `?node-id=` scoped scan → findings limited to that subtree (catches: whole-file scan).
4. Same messy file ×3 → identical deterministic audit outputs; score variance ≤ 2 (catches: non-determinism).
5. **Groundedness (hard gate)** → 100% of cited `nodeId`s exist in tool output (catches: hallucinated findings).
6. Malformed URL → 400, no LLM call (catches: wasted cost).
7. Private/inaccessible file → 403/404 with clear message (catches: cryptic 500s).
8. 500+ node file → completes < 60s; truncated tool summaries (catches: context overflow).
9. Empty frame → no invented perceptual issues; "No issues detected" (catches: hallucination on minimal input).
10. **Vision precision/recall** → labeled set with known visual defects vs clean frames; measure flagged-vs-actual (catches: vision over/under-reporting).
11. **Cross-modal consistency** → vision claims about measurable props (sizes/colors/counts) must not contradict JSON; contradictions dropped (catches: VLM layout-recall errors per Design2Code).
12. **Reflection efficacy (fault injection)** → seed a hallucinated `nodeId` into the investigator; critic loop must catch it; final output grounded (catches: decorative-only critic).

**Metrics**:

| Metric                         | How measured                                         | Target    |
| ------------------------------ | ---------------------------------------------------- | --------- |
| Tool-call correctness          | AgentMark trace: required tools called on messy file | ≥ 90%     |
| Groundedness                   | every cited `nodeId` ∈ tool output                   | 100%      |
| Deterministic-audit regression | Vitest snapshot vs committed Figma JSON              | 100% pass |
| Vision-finding precision       | labeled set; flagged visual issues that are real     | ≥ 0.70    |
| Latency p95                    | end-to-end `/api/scan`                               | < 45s     |
| Cost per scan                  | AgentMark cost tracking                              | < $0.10   |

**LLM-as-a-judge** (explanation quality only, never pass/fail on findings):

- Judge model: `google/gemini-2.5-flash` (separate from orchestrator).
- Prompt summary: given a finding + its tool output + the explanation, score whether it (a) names developer impact, (b) cites a real property from tool output, (c) invents nothing absent from tool output.
- Rubric: 1–5 per dimension; pass = ≥ 4 on all three.
- Calibration: hand-label 10–20 findings; require ≥ 80% judge–human agreement before use.

**Red-team case**:

- Input: a frame that _looks_ polished but has messy JSON, plus an empty frame. → Graceful failure: agent surfaces the deterministic JSON issues, invents **no** perceptual findings, and never contradicts deterministic ground truth. Committed to the eval set, not a thought experiment.

## 10. Risks and mitigations

| Risk                                                | Likelihood | Mitigation                                                                                                                   |
| --------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Vision hallucination (false perceptual findings)    | H          | Cross-modal verification (drop claims contradicting JSON); precision target ≥0.7; optional critic pass; confidence threshold |
| Agent collapses to "explainer" (not really agentic) | M          | ReAct loop must _decide_ which frames to render/escalate; trace + tool-call eval prove multi-step behavior                   |
| Latency/cost balloon in the loop                    | M          | `stopWhen` step cap (~6), retry cap (2), render only flagged frames, truncated context, flag-gated                           |
| Eval-labeling effort underestimated                 | H          | Budget ~1 day in week 1; small labeled visual-defect set; reuse existing deterministic snapshots                             |
| Figma render API limits / null renders              | M          | Reuse existing 429/cache handling; handle `null` image map (invisible/0% opacity nodes) gracefully                           |
| Reflection loop oscillates                          | M          | Hard retry cap → degrade to deterministic output; log `agentMeta.reason`                                                     |
| FigmaLint name confusion                            | H          | HandOffLint branding; cite competitor                                                                                        |

## 11. Resource estimate

- **Time to POC (on top of the existing deterministic repo)**: ~70–120 hours.

| Phase                                                                   | Hours (low) | Hours (high) |
| ----------------------------------------------------------------------- | ----------- | ------------ |
| Figma images integration + `render_frame` tool                          | 4           | 8            |
| `vision_critique` tool + visual-finding schema                          | 8           | 14           |
| ReAct loop (AI SDK tools + audits)                                      | 10          | 18           |
| Guardrail gauntlet (schema, groundedness, cross-modal, critic, budgets) | 16          | 26           |
| AgentMark prompts + tracing                                             | 6           | 12           |
| Eval set labeling + harness + metrics                                   | 14          | 22           |
| Polish + bug-fixing                                                     | 12          | 20           |

> Capstones run 1.5–3× the estimate; the guardrail + eval-labeling rows are the schedule risk. If time compresses, cut the separate critic _model_ (keep deterministic cross-modal verification) before cutting evals.

- **Compute**: laptop only; Vercel free tier.
- **API costs** (OpenRouter): per scan ≈ **$0.04–0.06 dev** (Gemini Flash vision ~$0.02 + Sonnet critic ~$0.03); ~**$0.10–0.20** demo on Sonnet vision.
  - Dev total: **$25–50** (~500 calls incl. eval runs).
  - Demo: **$5–10** (~30–50 scans).
- **Data needs**: the labeled eval set is the real cost — messy + clean frames with **known visual defects** (~1 day, week 1). Reuses existing dev Figma file.
- **External services**: Figma REST (free), OpenRouter (PAYG), Vercel (free), AgentMark (local + free cloud tier).

## 12. Week-1 plan

1. `**fetchFigmaImages` + `render_frame` tool\*\* — extend the existing Figma client (reuse PAT/cache/429); render a node to PNG, handle the `null` image-map case. Smallest proof the vision path works.
2. **Visual-finding schema + `vision_critique` tool** — Zod-typed candidate findings (`nodeId`, `claim`, `category`, `confidence`); one multimodal call on a rendered frame.
3. **Groundedness check (no LLM)** — deterministic: every cited `nodeId` ∈ tool output; Vitest. This is the trust gate, build it first.
4. **AgentMark spike** — one `.prompt.mdx` ReAct loop calling `render_frame` + `vision_critique` + one audit; trace visible in AgentMark Dashboard.
5. **Label the eval set** — author/label messy + clean frames with known visual defects (eval cases 10–11); commit deterministic snapshots (cases 1, 2, 4).

## 13. Sources used in planning

1. FigmaLint (Southleft) — [https://www.figma.com/community/plugin/1521241390290871981/figmalint](https://www.figma.com/community/plugin/1521241390290871981/figmalint) — direct competitor; feature overlap.
2. Design Lint (destefanis) — [https://github.com/destefanis/design-lint](https://github.com/destefanis/design-lint) — token/style linter.
3. Design Lint (moduesss) — [https://github.com/moduesss/desing-lint](https://github.com/moduesss/desing-lint) — structural linter w/ JSON export.
4. Stark — [https://www.getstark.co/](https://www.getstark.co/) — a11y/contrast competitor.
5. Figma Dev Mode — [https://help.figma.com/hc/en-us/articles/15023124644247](https://help.figma.com/hc/en-us/articles/15023124644247) — native handoff baseline.
6. Figma MCP Server — [https://developers.figma.com/docs/figma-mcp-server/](https://developers.figma.com/docs/figma-mcp-server/) — Phase-3 channel.
7. Figma REST file/image endpoints — [https://developers.figma.com/docs/rest-api/file-endpoints/](https://developers.figma.com/docs/rest-api/file-endpoints/) — `GET /v1/images/:key` render (PNG/scale; 30-day URLs; 32MP cap; null on unrenderable).
8. MMMU-Pro — arXiv:2409.02813 — vision-only multimodal reasoning SOTA; capability "why now."
9. MMMU — arXiv:2311.16502 — original multimodal benchmark.
10. Design2Code — arXiv:2403.03163 (Stanford SALT) — screenshot→code; VLMs lag at visual-element recall/layout → justifies cross-modal guardrails.
11. Berkeley Function Calling Leaderboard — [https://gorilla.cs.berkeley.edu/leaderboard.html](https://gorilla.cs.berkeley.edu/leaderboard.html) — tool-call reliability for the ReAct loop.
12. Figma2Code — arXiv:2604.13648 — messy metadata → poor codegen.
13. OpenRouter Gemini 2.5 Flash pricing — [https://openrouter.ai/google/gemini-2.5-flash](https://openrouter.ai/google/gemini-2.5-flash) — $0.30/$2.50 per M; image inputs as tokens.
14. OpenRouter Claude Sonnet 4.5 pricing — [https://openrouter.ai/anthropic/claude-sonnet-4.5](https://openrouter.ai/anthropic/claude-sonnet-4.5) — $3/$15 per M.
15. AgentMark — [https://docs.agentmark.co/](https://docs.agentmark.co/) — prompts + evals + tracing.

**Could not find primary sources on:**

- A Figma-specific _perceptual lint_ benchmark — none exists; Design2Code is the closest screenshot-understanding proxy; self-author the eval set.
- Quantitative "pre-flight skip rate" for startup design teams — anecdotal; validate with 3–5 user chats.
- May-2026 agent-benchmark roundup (codersera) — secondary aggregator; used only for orientation, not cited as a result.

## 14. Open questions

- **Critic: model or deterministic-only?** Start deterministic (cross-modal + groundedness); add the LLM critic only if explanation quality demands it (it's the first cost cut).
- **Vision model for demo**: Gemini 2.5 Flash vs Claude Sonnet 4.5 vs Flash-Lite — run eval cases 10–11 on 2–3 in week 2; pick highest precision within budget.
- **How many frames to render per scan?** Top-N by deterministic severity (e.g. 5) to bound cost — confirm cutoff.
- **Capstone rubric**: confirm "ReAct loop + tool calls + multimodal + guardrails + evals" satisfies the agent-framework requirement.
- **Phase 2/3 design-system conformance (RAG)**: provide system as tokens JSON or a published Figma library file; `resolve_token` / `match_component` tools; deterministic exact-match first, then semantic/vision matching. (See original spec Appendix G.)
- **PMF validation**: 3–5 user conversations to confirm perceptual findings are wanted before heavy build.

---

## Note on planning completeness

This spec was produced by self-playing both the planner and student roles in a single session (the user delegated answering the interactive prompts). The three mandatory approval checkpoints — Phase 1 verdict, Phase 2 sources, Phase 5 stack — were **self-approved**, not confirmed by a second party. Treat these with extra caution before committing to the build:

- **PMF evidence (Phase 3)** rests on competitor existence + codegen-quality papers, not a primary survey of the pain's acuteness — validate with real users.
- **Vision-finding precision** is an assumption until the labeled eval set exists — build it in week 1.

---

## Appendix A — Additional deterministic audits (no LLM)

> Three checks carried over from the original plan. **None require an LLM.** They are pure reads over the Figma node JSON (and the export/vector metadata already in that JSON), following the exact pattern of the existing `runLayoutAudit` (walk tree → read node fields → emit `Finding`). Each becomes a new `run*Audit` in `runAllAudits`, with Vitest snapshots. They strengthen the trustworthy baseline **and** give the vision agent more ground-truth findings to cross-check against — i.e. _fewer_ LLM calls, not more.

### A.1 The three audits

| Audit                                        | What it inspects (deterministic fields)                                                                                                                                                                                                                                                                                                                           | LLM? |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **SVG path / absolute-positioning analysis** | On an export-marked vector/icon frame: child `constraints` (`horizontal`/`vertical` = `SCALE`/`STRETCH` vs fixed `LEFT`/`TOP`/`CENTER`), `relativeTransform`, `absoluteBoundingBox` vs parent `size`, and `vectorPaths[].data` (the SVG path `d` string). Fixed-pixel constraints / hardcoded transforms → the SVG won't scale cleanly when exported and resized. | No   |
| **Export-format validation**                 | `node.exportSettings[]` → `{ format, suffix, constraint: { type: SCALE/WIDTH/HEIGHT, value } }` checked against a policy table (icons/vectors → SVG; photos → PNG/JPG @2x; suffix conventions; scale present).                                                                                                                                                    | No   |
| **Component reuse detection**                | Walk `COMPONENT` / `COMPONENT_SET` / `INSTANCE`; read `componentId` + a structural fingerprint (child types/names/layout) to flag detached instances, duplicate components, and copy-pasted frames that _should_ be an instance.                                                                                                                                  | No   |

### A.2 The headline pain: absolute positioning inside SVGs → broken export scaling

This is the clearest deterministic case. When a vector/icon is exported as SVG, children pinned to **absolute coordinates** (fixed `LEFT`/`TOP` constraints, hardcoded `relativeTransform`) don't reflow when the viewBox is resized, so the asset scales wrong in code. Detection is a numeric/enum check on each child of the exported node — identical in shape to the existing `missing-auto-layout` rule (`src/lib/audit/layout.ts`): read `constraints` + transform + bounds from the tree, emit a `Finding` with `nodeId`, `severity`, `figmaUrl`. No perception or model needed.

### A.3 Where the line is (the one optional fuzzy edge)

- **Detection is 100% deterministic** for all three above (exact + structural).
- The **only** part that could _optionally_ use a model is **fuzzy/semantic** component matching — "these two structurally-different frames are visually the same component." That needs vision/embeddings and is **out of scope** (§6). The reuse detection here is exact/structural and needs no LLM.

### A.4 How they fit this spec

- **Layer**: part of the deterministic SOURCE-OF-TRUTH layer (§8), alongside the existing 5 audits — they run in `runAllAudits` before the agent.
- **Synergy with the agent**: more deterministic findings = a richer ground-truth set for the guardrail gauntlet's cross-modal verification (§6, §9 case 11). E.g. the vision model claims "this icon looks squashed"; the SVG audit independently confirms absolute-positioned children → high-confidence, grounded finding.
- **Sequencing**: deterministic and independently unit-testable, so they can ship **before** the agent layer (good week-1/2 wins) and add eval snapshot cases (§9 cases 1, 2, 4).

---

## Appendix B — Build checklist (updated June 4, 2026)

> A single ordered list of every step to finish this POC. Check items off as you go.
> Items marked `[x]` are done. Items marked `[ ]` are not started.
> Each step lists the files it produces and the tests that prove it works.

### Phase 0 — Deterministic foundation (DONE)

All of these exist in the repo and pass 149 Vitest tests.

- [x] **0.1** Scaffold Next.js + `POST /api/scan` route
- [x] **0.2** Figma REST client — PAT auth, URL parsing, `fetchFigmaTree`, cache, retry-after, MSW mock (`example.json`)
- [x] **0.3** Audit: naming (`src/lib/audit/naming.ts`)
- [x] **0.4** Audit: layout (`src/lib/audit/layout.ts`)
- [x] **0.5** Audit: hidden layers (`src/lib/audit/hidden.ts`)
- [x] **0.6** Audit: spacing (`src/lib/audit/spacing.ts`)
- [x] **0.7** Audit: contrast (`src/lib/audit/contrast.ts`)
- [x] **0.8** Audit: SVG scaling (`src/lib/audit/svg.ts`) — Appendix A
- [x] **0.9** Audit: export settings (`src/lib/audit/export.ts`) — Appendix A
- [x] **0.10** Audit: component reuse (`src/lib/audit/reuse.ts`) — Appendix A
- [x] **0.11** `runAllAudits` orchestrator wiring all 8 audits (`src/lib/audit/run-audits.ts`)
- [x] **0.12** `computeReadinessScore` — weighted severity formula (`src/lib/readiness-score.ts`)
- [x] **0.13** Dashboard UI — scan form, findings list, score display, audit labels, export quality picker
- [x] **0.14** Scan options — layout handoff profile, contrast level, grid base, export quality

### Phase 1 — Figma Images + render_frame tool (DONE)

> Spec §12 step 1. Smallest proof the vision path works.

- [x] **1.1** Extract shared `figmaFetch` + `parseFigmaResponse` into `src/lib/figma/fetch.ts` (reused by tree + images clients)
- [x] **1.2** `fetchFigmaImages(fileKey, nodeIds, options)` — calls `GET /v1/images/:fileKey`, 10-min cache, batch >50 IDs, 429 stale-cache fallback, null-render preservation (`src/lib/figma/images.ts`)
- [x] **1.3** MSW mock handler for `/v1/images/:fileKey` with `MOCK_NULL_NODE_ID` (`src/mocks/figma-handlers.ts`)
- [x] **1.4** `fetchFigmaImages` unit tests — 9 cases: no token, empty IDs, happy path, scale/format params, null preservation, cache hit, 429 with/without cache, 403, err field, batching (`src/lib/figma/images.test.ts`)
- [x] **1.5** `makeRenderFrameTool(fileKey)` — Vercel AI SDK `tool()` with Zod input/output schemas, discriminated union output (`ok` / `null_render` / `error`), ready for agent loop (`src/lib/agent/tools/render-frame.ts`)

### Phase 2 — Golden snapshot evals

> Spec §9 cases 1, 2, 4, 6, 7, 9. Lock deterministic correctness **before** adding any LLM code.
> This is the safety net — if the agent layer ever breaks an audit, these tests catch it.

- [ ] **2.1** Export JSON snapshots from dev Figma file — messy frames + at least one clean frame; commit to repo (`src/__snapshots__/` or `test/fixtures/`)
- [ ] **2.2** Vitest snapshot test — `runAllAudits` on messy snapshot → score < 60, ≥ 8 findings, ≥ 1 per audit category (eval case 1)
- [ ] **2.3** Vitest snapshot test — `runAllAudits` on clean snapshot → score > 85, zero critical/high (eval case 2)
- [ ] **2.4** Determinism test — run same messy snapshot ×3, assert identical output (eval case 4)
- [ ] **2.5** Edge-case tests — malformed URL → 400 (case 6), private file → 403/404 (case 7), empty frame → no findings (case 9)

### Phase 3 — Vision critique tool + visual-finding schema

> Spec §12 step 2. One multimodal call on a rendered frame.

- [ ] **3.1** OpenRouter model resolution — env-configurable model slug, dev vs demo split, `supported_parameters=tools` filter (`src/lib/agent/model.ts`)
- [ ] **3.2** Visual finding Zod schema — `{ nodeId, claim, category, confidence, measurableProps? }` for candidate perceptual findings
- [ ] **3.3** `makeVisionCritiqueTool()` — Vercel AI SDK tool that takes an image URL + node context, sends to multimodal model (Gemini Flash), returns typed candidate visual findings (`src/lib/agent/tools/vision-critique.ts`)
- [ ] **3.4** Unit tests for vision critique — mock the OpenRouter call; assert schema validation on output; assert graceful failure on model error

### Phase 4 — Groundedness gate (no LLM)

> Spec §12 step 3. Deterministic trust gate — build before the agent loop.

- [ ] **4.1** `checkGroundedness(citedNodeIds, toolOutputNodeIds)` — pure function, returns `{ grounded: boolean, invalidIds: string[] }` (`src/lib/agent/groundedness.ts`)
- [ ] **4.2** Vitest for groundedness — all cited IDs exist → pass; one hallucinated ID → fail with that ID listed; empty cited list → pass
- [ ] **4.3** Wire groundedness into the `RenderFrameOutput` and vision output paths — every `nodeId` the agent cites must exist in the Figma tree

### Phase 5 — Agent investigation tools (no LLM)

> Spec Appendix F §F.5. Deterministic tools the agent calls in its loop.

- [ ] **5.1** `makeGetNodeContextTool(tree)` — returns parent chain, siblings, key props for a nodeId (`src/lib/agent/tools/get-node-context.ts`)
- [ ] **5.2** `makeGetRelatedFindingsTool(findings)` — returns other findings on same subtree/parent (`src/lib/agent/tools/get-related-findings.ts`)
- [ ] **5.3** `makeLookupHandoffGuidelineTool()` — keyed lookup over local guidelines doc, RAG-lite (`src/lib/agent/tools/lookup-guideline.ts` + `src/lib/agent/guidelines.ts`)
- [ ] **5.4** Unit tests for all three tools — deterministic, no LLM needed

### Phase 6 — Data contracts + env flag

> Spec Appendix F §F.7 step 1. Response shape stable, no behavior change yet.

- [ ] **6.1** Add `FindingEnrichment` and `AgentMeta` TypeScript interfaces to `src/lib/types.ts`
- [ ] **6.2** Extend `ScanResponse` with optional `enrichment?: FindingEnrichment[] | null` and `agentMeta?: AgentMeta`
- [ ] **6.3** Add `ENABLE_AGENT_ENRICHMENT` env flag (default `false`) to `.env.example` + scan route — when off, response is identical to today

### Phase 7 — ReAct agent loop (Investigator)

> Spec §12 step 4 + Appendix F §F.7 steps 3–4. The core agentic surface.

- [ ] **7.1** AgentMark spike — one `.prompt.mdx` calling `render_frame` + `vision_critique` + one audit tool; trace visible in AgentMark Dashboard (`prompts/investigator.prompt.mdx`)
- [ ] **7.2** `enrichFindings(findings, tree, fileKey)` orchestrator — Vercel AI SDK `generateText` + `tools` + `stopWhen` (step cap ~6); calls investigation tools; returns `FindingEnrichment[]` + `AgentMeta` (`src/lib/agent/enrich-findings.ts`)
- [ ] **7.3** Wire `enrichFindings` into `POST /api/scan` behind `ENABLE_AGENT_ENRICHMENT` flag — after `computeReadinessScore`, before JSON response
- [ ] **7.4** Graceful degradation — if agent errors/times out, return deterministic findings + `agentMeta.status = "degraded"` with reason
- [ ] **7.5** Manual smoke test — enable flag, scan messy dev file, confirm enrichment appears alongside deterministic findings

### Phase 8 — Critic / reflection loop

> Spec Appendix F §F.7 step 5. Evaluator–optimizer pattern.

- [ ] **8.1** Critic prompt — AgentMark `.prompt.mdx` that scores enrichment against §9 rubric: (a) names dev impact, (b) cites real property, (c) invents nothing (`prompts/critic.prompt.mdx`)
- [ ] **8.2** Cross-modal verification — vision claims about measurable props (sizes, colors, counts) checked against JSON tree; contradictions dropped (`src/lib/agent/cross-modal.ts`)
- [ ] **8.3** Reflection loop in `enrichFindings` — groundedness hard gate + LLM judge soft gate + max 2 retries; fail → degrade to deterministic-only
- [ ] **8.4** Unit tests for cross-modal verification — known contradiction → dropped; consistent claim → kept
- [ ] **8.5** Integration test — fault-inject a hallucinated `nodeId` into investigator output; assert critic catches it; final output grounded (eval case 12)

### Phase 9 — Vision eval set + metrics

> Spec §9 cases 5, 10, 11. Proves the agent is trustworthy.

- [ ] **9.1** Label the eval set — author/label messy + clean frames with known visual defects; commit labeled data (eval cases 10–11)
- [ ] **9.2** Vision precision test — run vision critique on labeled set; measure flagged-vs-actual; target precision ≥ 0.70 (eval case 10)
- [ ] **9.3** Cross-modal consistency test — vision claims about measurable props must not contradict JSON; contradictions dropped (eval case 11)
- [ ] **9.4** Groundedness CI assertion — 100% of cited `nodeId`s exist in tool output (eval case 5, hard gate)
- [ ] **9.5** Degradation test — `ENABLE_AGENT_ENRICHMENT=false` or forced LLM error → deterministic findings + `agentMeta.status = "skipped" | "degraded"`
- [ ] **9.6** Wire metrics into AgentMark JSONL eval harness — tool-call correctness, groundedness, latency, cost per scan

### Phase 10 — Dashboard agent-trace panel

> Spec §8 bottom. Makes the agent loop visible in the UI.

- [ ] **10.1** Agent trace panel component — shows reasoning steps, tool calls, observations from `agentMeta` in the scan dashboard
- [ ] **10.2** Display `FindingEnrichment` alongside each finding — dev-impact explanation, cited nodes, priority hint
- [ ] **10.3** Visual indicator when agent is disabled/degraded — show deterministic-only badge + reason from `agentMeta`

### Phase 11 — Polish + deploy

- [ ] **11.1** Large-file handling — truncate tool outputs for agent context; confirm 500+ node file completes < 60s (eval case 8)
- [ ] **11.2** Cost tracking — AgentMark cost per scan; confirm < $0.10 target (§9 metrics)
- [ ] **11.3** Deploy to Vercel — confirm PAT + scan works in production with agent flag on/off
- [ ] **11.4** Red-team test — polished-looking frame with messy JSON + empty frame → agent surfaces JSON issues, invents no perceptual findings (§9 red-team case)
- [ ] **11.5** LLM-as-judge calibration — hand-label 10–20 findings, confirm ≥ 80% judge–human agreement (§9)
- [ ] **11.6** README / demo walkthrough for capstone presentation

### Quick reference — what is done vs. next

| Phase                          | Status      | Summary                                                        |
| ------------------------------ | ----------- | -------------------------------------------------------------- |
| 0. Deterministic foundation    | **Done**    | 8 audits, score, dashboard, 149 tests                          |
| 1. Figma images + render_frame | **Done**    | `fetchFigmaImages`, MSW mock, AI SDK tool                      |
| 2. Golden snapshot evals       | **Next**    | Lock deterministic correctness before agent work               |
| 3. Vision critique tool        | Not started | Multimodal model call on rendered frame                        |
| 4. Groundedness gate           | Not started | Deterministic trust check (no LLM)                             |
| 5. Agent investigation tools   | Not started | `get_node_context`, `get_related_findings`, `lookup_guideline` |
| 6. Data contracts + env flag   | Not started | `FindingEnrichment`, `AgentMeta`, feature flag                 |
| 7. ReAct agent loop            | Not started | Investigator + `enrichFindings` orchestrator                   |
| 8. Critic / reflection         | Not started | Cross-modal verification, bounded retries                      |
| 9. Vision eval set             | Not started | Labeled frames, precision/recall metrics                       |
| 10. Dashboard trace panel      | Not started | Agent reasoning UI                                             |
| 11. Polish + deploy            | Not started | Large files, cost, Vercel, red-team                            |

---

_Generated by the capstone-poc-planner skill. Hand this spec to Claude with "Build the POC described in this spec" to start a clean build session._
