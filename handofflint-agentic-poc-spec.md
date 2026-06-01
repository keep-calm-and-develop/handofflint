# HandOffLint (Agentic / Multimodal) — POC Specification

> Generated June 1, 2026, by running the capstone-poc-planner skill end-to-end (planner + student roles self-played, with real Phase-2 research). This repositions the original `handofflint-poc-spec.md` (deterministic POC, already built) into an **agentic + multimodal** capstone. Hand this spec to Claude to begin building the agent layer. The deterministic foundation already exists in repo `handofflint/`.

## 1. One-paragraph summary

HandOffLint lets a design lead paste a Figma URL and get a Readiness Score plus severity-sorted, evidence-backed findings before marking a design "ready for dev." Deterministic TypeScript audits (layout, naming, hidden layers, spacing, contrast) produce a trustworthy baseline; a **vision-augmented ReAct agent** then renders suspect frames via the Figma images API, critiques them with a multimodal model, and **cross-checks each visual claim against the JSON** before it becomes a finding — surfacing a class of *perceptual* defects (broken hierarchy, overlap, crowding, misalignment, "looks unfinished") that JSON audits are structurally blind to. The capstone proves you can make a non-deterministic perceptual agent **trustworthy** via guardrails and evals, not just call a model.

## 2. The problem and the user

- **Specific user**: Design lead / product-design manager at a 10–80 person startup on Figma Pro who personally owns the "ready for dev" gate and absorbs the cost when messy files reach developers.
- **Problem**: Messy Figma (absolute positioning, default names, hidden cruft, off-grid spacing, contrast fails) plus *visual* defects (broken hierarchy, overlap, crowding) get handed off, causing silent dev rework, Slack churn, and degraded AI-assisted codegen.
- **Current alternative**: Visual skim before handoff; ad-hoc in-editor plugins (Design Lint, Stark) designers rarely install; no unified manager-facing gate.
- **Wedge**: A manager-facing web dashboard with a unified cross-category score from a single URL **plus perceptual findings** no JSON linter can produce — an accountability layer outside Figma, not another in-editor plugin step.

## 3. Why now

Frontier multimodal models can now reason over rendered UI: MMMU-Pro's vision-only setting (arXiv:2409.02813) and Design2Code (arXiv:2403.03163) show VLMs perceive layout and convert screenshots to code. A model can therefore *perceive* design defects, not just parse JSON — which was not reliable 18 months ago. Crucially, Design2Code also documents that VLMs **lag at recalling visual elements and correct layout**, which is exactly why the perceptual layer must be fenced in by deterministic cross-checks rather than trusted blindly.

## 4. Competitive landscape

| Existing solution | Approach | How this project differs |
|---|---|---|
| [FigmaLint (Southleft)](https://www.figma.com/community/plugin/1521241390290871981/figmalint) | AI Figma plugin: Readiness Score, WCAG, tokens, codegen | Manager web dashboard; multimodal perceptual findings; no plugin install; avoids name collision |
| [Design Lint (destefanis](https://github.com/destefanis/design-lint) / [moduesss)](https://github.com/moduesss/desing-lint) | In-Figma structural/style/token linters | Adds perceptual findings + accountability gate + unified score |
| [Stark](https://www.getstark.co/) | Paid a11y/contrast plugin | Broader than a11y; vision-based hierarchy/layout critique |
| [Figma Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247) | Native inspect + ready-for-dev statuses | Scores quality *before* the gate; complements, doesn't replace |
| [Figma MCP Server](https://developers.figma.com/docs/figma-mcp-server/) | Official MCP design-context → code | We lint *before* codegen; MCP is a Phase-3 distribution channel |

## 5. Capability-trajectory assumptions

- **Assumes**: (a) frontier VLMs reliably perceive UI-layout/hierarchy defects from a rendered frame; (b) tool-calling loops hold for ~6 steps (BFCL-class reliability); (c) Figma render API (`GET /v1/images`) is accessible on demo files; (d) cross-modal verification can catch most vision hallucinations.
- **Survives improvement when**: models get cheaper/better at vision and tool use → the perceptual layer gets stronger and cheaper; the deterministic base + guardrails remain the trust anchor.
- **At risk if**: Figma ships native perceptual lint + manager dashboards; or vision hallucination proves uncontrollable even with cross-modal checks (mitigated, not eliminated).

## 6. POC scope

- **In scope**:
  - Existing deterministic pipeline (5 audits + Readiness Score + dashboard) — **already built**.
  - `fetch_figma_images` client + `render_frame(nodeId, scale)` tool (Figma images endpoint).
  - `vision_critique(image, context)` tool returning structured candidate *visual* findings.
  - ReAct tool-calling loop (Vercel AI SDK `generateText` + `tools` + `stopWhen`, step/cost budget) wiring the 5 audits + render + vision + node-context tools.
  - **Guardrail gauntlet**: Zod schema validation on all tool I/O + final output; groundedness (every cited `nodeId` exists); cross-modal verification (vision claims about measurable props checked vs JSON, contradictions dropped); optional critic/judge pass; budget + retry caps; graceful degradation to deterministic-only.
  - Score = deterministic findings ⊕ guardrail-verified visual findings.
  - Agent reasoning-trace panel in the dashboard; AgentMark tracing + JSONL evals.
  - **3 additional deterministic audits (no LLM)** — component reuse detection, SVG path / absolute-positioning analysis, export-format validation. These extend the trustworthy baseline and give the vision agent more ground-truth to cross-check against. Detail in **Appendix A**. Effort permitting; deterministic and independently testable, so they can ship before the agent layer.
- **Explicitly out of scope**:
  - OAuth / accounts / scan-history DB.
  - Figma plugin.
  - **Design-system conformance + RAG** (Phase 2/3 — see §14 and the original spec's Appendix G).
  - **Fuzzy/semantic** component matching ("these visually look like the same component despite different structure") — would need vision/embeddings; the deterministic reuse detection in Appendix A does *not*.
  - Auto-fix / codegen.
- **Smallest hypothesis to prove**: A vision-augmented agent can add *perceptual* findings a JSON linter cannot, while a deterministic guardrail stack keeps hallucinated findings at ~zero (groundedness 100%, vision precision ≥0.7) — proving "trustworthy perceptual agent," not "we called a vision model."

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
| Metric | How measured | Target |
|---|---|---|
| Tool-call correctness | AgentMark trace: required tools called on messy file | ≥ 90% |
| Groundedness | every cited `nodeId` ∈ tool output | 100% |
| Deterministic-audit regression | Vitest snapshot vs committed Figma JSON | 100% pass |
| Vision-finding precision | labeled set; flagged visual issues that are real | ≥ 0.70 |
| Latency p95 | end-to-end `/api/scan` | < 45s |
| Cost per scan | AgentMark cost tracking | < $0.10 |

**LLM-as-a-judge** (explanation quality only, never pass/fail on findings):
- Judge model: `google/gemini-2.5-flash` (separate from orchestrator).
- Prompt summary: given a finding + its tool output + the explanation, score whether it (a) names developer impact, (b) cites a real property from tool output, (c) invents nothing absent from tool output.
- Rubric: 1–5 per dimension; pass = ≥ 4 on all three.
- Calibration: hand-label 10–20 findings; require ≥ 80% judge–human agreement before use.

**Red-team case**:
- Input: a frame that *looks* polished but has messy JSON, plus an empty frame. → Graceful failure: agent surfaces the deterministic JSON issues, invents **no** perceptual findings, and never contradicts deterministic ground truth. Committed to the eval set, not a thought experiment.

## 10. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Vision hallucination (false perceptual findings) | H | Cross-modal verification (drop claims contradicting JSON); precision target ≥0.7; optional critic pass; confidence threshold |
| Agent collapses to "explainer" (not really agentic) | M | ReAct loop must *decide* which frames to render/escalate; trace + tool-call eval prove multi-step behavior |
| Latency/cost balloon in the loop | M | `stopWhen` step cap (~6), retry cap (2), render only flagged frames, truncated context, flag-gated |
| Eval-labeling effort underestimated | H | Budget ~1 day in week 1; small labeled visual-defect set; reuse existing deterministic snapshots |
| Figma render API limits / null renders | M | Reuse existing 429/cache handling; handle `null` image map (invisible/0% opacity nodes) gracefully |
| Reflection loop oscillates | M | Hard retry cap → degrade to deterministic output; log `agentMeta.reason` |
| FigmaLint name confusion | H | HandOffLint branding; cite competitor |

## 11. Resource estimate

- **Time to POC (on top of the existing deterministic repo)**: ~70–120 hours.

| Phase | Hours (low) | Hours (high) |
|---|---|---|
| Figma images integration + `render_frame` tool | 4 | 8 |
| `vision_critique` tool + visual-finding schema | 8 | 14 |
| ReAct loop (AI SDK tools + audits) | 10 | 18 |
| Guardrail gauntlet (schema, groundedness, cross-modal, critic, budgets) | 16 | 26 |
| AgentMark prompts + tracing | 6 | 12 |
| Eval set labeling + harness + metrics | 14 | 22 |
| Polish + bug-fixing | 12 | 20 |

> Capstones run 1.5–3× the estimate; the guardrail + eval-labeling rows are the schedule risk. If time compresses, cut the separate critic *model* (keep deterministic cross-modal verification) before cutting evals.

- **Compute**: laptop only; Vercel free tier.
- **API costs** (OpenRouter): per scan ≈ **$0.04–0.06 dev** (Gemini Flash vision ~$0.02 + Sonnet critic ~$0.03); ~**$0.10–0.20** demo on Sonnet vision.
  - Dev total: **$25–50** (~500 calls incl. eval runs).
  - Demo: **$5–10** (~30–50 scans).
- **Data needs**: the labeled eval set is the real cost — messy + clean frames with **known visual defects** (~1 day, week 1). Reuses existing dev Figma file.
- **External services**: Figma REST (free), OpenRouter (PAYG), Vercel (free), AgentMark (local + free cloud tier).

## 12. Week-1 plan

1. **`fetchFigmaImages` + `render_frame` tool** — extend the existing Figma client (reuse PAT/cache/429); render a node to PNG, handle the `null` image-map case. Smallest proof the vision path works.
2. **Visual-finding schema + `vision_critique` tool** — Zod-typed candidate findings (`nodeId`, `claim`, `category`, `confidence`); one multimodal call on a rendered frame.
3. **Groundedness check (no LLM)** — deterministic: every cited `nodeId` ∈ tool output; Vitest. This is the trust gate, build it first.
4. **AgentMark spike** — one `.prompt.mdx` ReAct loop calling `render_frame` + `vision_critique` + one audit; trace visible in AgentMark Dashboard.
5. **Label the eval set** — author/label messy + clean frames with known visual defects (eval cases 10–11); commit deterministic snapshots (cases 1, 2, 4).

## 13. Sources used in planning

1. FigmaLint (Southleft) — https://www.figma.com/community/plugin/1521241390290871981/figmalint — direct competitor; feature overlap.
2. Design Lint (destefanis) — https://github.com/destefanis/design-lint — token/style linter.
3. Design Lint (moduesss) — https://github.com/moduesss/desing-lint — structural linter w/ JSON export.
4. Stark — https://www.getstark.co/ — a11y/contrast competitor.
5. Figma Dev Mode — https://help.figma.com/hc/en-us/articles/15023124644247 — native handoff baseline.
6. Figma MCP Server — https://developers.figma.com/docs/figma-mcp-server/ — Phase-3 channel.
7. Figma REST file/image endpoints — https://developers.figma.com/docs/rest-api/file-endpoints/ — `GET /v1/images/:key` render (PNG/scale; 30-day URLs; 32MP cap; null on unrenderable).
8. MMMU-Pro — arXiv:2409.02813 — vision-only multimodal reasoning SOTA; capability "why now."
9. MMMU — arXiv:2311.16502 — original multimodal benchmark.
10. Design2Code — arXiv:2403.03163 (Stanford SALT) — screenshot→code; VLMs lag at visual-element recall/layout → justifies cross-modal guardrails.
11. Berkeley Function Calling Leaderboard — https://gorilla.cs.berkeley.edu/leaderboard.html — tool-call reliability for the ReAct loop.
12. Figma2Code — arXiv:2604.13648 — messy metadata → poor codegen.
13. OpenRouter Gemini 2.5 Flash pricing — https://openrouter.ai/google/gemini-2.5-flash — $0.30/$2.50 per M; image inputs as tokens.
14. OpenRouter Claude Sonnet 4.5 pricing — https://openrouter.ai/anthropic/claude-sonnet-4.5 — $3/$15 per M.
15. AgentMark — https://docs.agentmark.co/ — prompts + evals + tracing.

**Could not find primary sources on:**
- A Figma-specific *perceptual lint* benchmark — none exists; Design2Code is the closest screenshot-understanding proxy; self-author the eval set.
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

> Three checks carried over from the original plan. **None require an LLM.** They are pure reads over the Figma node JSON (and the export/vector metadata already in that JSON), following the exact pattern of the existing `runLayoutAudit` (walk tree → read node fields → emit `Finding`). Each becomes a new `run*Audit` in `runAllAudits`, with Vitest snapshots. They strengthen the trustworthy baseline **and** give the vision agent more ground-truth findings to cross-check against — i.e. *fewer* LLM calls, not more.

### A.1 The three audits

| Audit | What it inspects (deterministic fields) | LLM? |
|---|---|---|
| **SVG path / absolute-positioning analysis** | On an export-marked vector/icon frame: child `constraints` (`horizontal`/`vertical` = `SCALE`/`STRETCH` vs fixed `LEFT`/`TOP`/`CENTER`), `relativeTransform`, `absoluteBoundingBox` vs parent `size`, and `vectorPaths[].data` (the SVG path `d` string). Fixed-pixel constraints / hardcoded transforms → the SVG won't scale cleanly when exported and resized. | No |
| **Export-format validation** | `node.exportSettings[]` → `{ format, suffix, constraint: { type: SCALE/WIDTH/HEIGHT, value } }` checked against a policy table (icons/vectors → SVG; photos → PNG/JPG @2x; suffix conventions; scale present). | No |
| **Component reuse detection** | Walk `COMPONENT` / `COMPONENT_SET` / `INSTANCE`; read `componentId` + a structural fingerprint (child types/names/layout) to flag detached instances, duplicate components, and copy-pasted frames that *should* be an instance. | No |

### A.2 The headline pain: absolute positioning inside SVGs → broken export scaling

This is the clearest deterministic case. When a vector/icon is exported as SVG, children pinned to **absolute coordinates** (fixed `LEFT`/`TOP` constraints, hardcoded `relativeTransform`) don't reflow when the viewBox is resized, so the asset scales wrong in code. Detection is a numeric/enum check on each child of the exported node — identical in shape to the existing `missing-auto-layout` rule (`src/lib/audit/layout.ts`): read `constraints` + transform + bounds from the tree, emit a `Finding` with `nodeId`, `severity`, `figmaUrl`. No perception or model needed.

### A.3 Where the line is (the one optional fuzzy edge)

- **Detection is 100% deterministic** for all three above (exact + structural).
- The **only** part that could *optionally* use a model is **fuzzy/semantic** component matching — "these two structurally-different frames are visually the same component." That needs vision/embeddings and is **out of scope** (§6). The reuse detection here is exact/structural and needs no LLM.

### A.4 How they fit this spec

- **Layer**: part of the deterministic SOURCE-OF-TRUTH layer (§8), alongside the existing 5 audits — they run in `runAllAudits` before the agent.
- **Synergy with the agent**: more deterministic findings = a richer ground-truth set for the guardrail gauntlet's cross-modal verification (§6, §9 case 11). E.g. the vision model claims "this icon looks squashed"; the SVG audit independently confirms absolute-positioned children → high-confidence, grounded finding.
- **Sequencing**: deterministic and independently unit-testable, so they can ship **before** the agent layer (good week-1/2 wins) and add eval snapshot cases (§9 cases 1, 2, 4).

---

*Generated by the capstone-poc-planner skill. Hand this spec to Claude with "Build the POC described in this spec" to start a clean build session.*
