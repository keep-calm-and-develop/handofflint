# HandOffLint — POC Specification

> Generated May 23, 2026. Hand this spec to Claude (or another tool) to begin building. It contains enough context to start cleanly without re-explaining the project.

## 1. One-paragraph summary

HandOffLint is a web tool for design managers at startups to paste a Figma URL and receive a Readiness Score plus severity-sorted lint findings before marking designs ready for dev. An AgentMark-orchestrated agent calls deterministic TypeScript audit tools against the Figma node tree (layout, naming, hidden layers, spacing, contrast), then synthesizes human-readable explanations with evidence-bound guardrails. The capstone proves that pre-handoff design QA reduces communication debt and improves downstream AI-assisted codegen quality.

## 2. The problem and the user

- **Specific user**: Design lead or product design manager at a 10–80 person startup who owns the "ready for dev" gate but has no formal design QA checklist.
- **Problem**: Messy Figma files (absolute positioning, default layer names, hidden garbage, off-grid spacing, contrast failures) get handed to developers who absorb rework silently or ping designers repeatedly in Slack.
- **Current alternative**: Visual skim before handoff; no structured pre-flight; devs fix issues during implementation; optional ad-hoc Figma plugins (Design Lint, Stark) that designers rarely install consistently.
- **Wedge**: Manager-facing web dashboard with unified multi-category Readiness Score from a single URL paste — accountability layer outside Figma, not another in-editor plugin step.

## 3. Why now

LLMs can now reason over structured Figma JSON and produce actionable explanations designers and managers act on (primary). As AI coding tools consume Figma as input, messy metadata directly degrades generated code quality on layout responsiveness and maintainability — the Figma2Code paper shows models map absolute coordinates and hardcoded values into rigid, unmaintainable UI code (ripple effect). Pre-handoff linting is cheap insurance before vibe-coding from designs.

## 4. Competitive landscape

| Existing solution                                                                                    | Approach                                                                  | How this project differs                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [FigmaLint plugin (Southleft)](https://www.figma.com/community/plugin/1521241390290871981/figmalint) | AI Figma plugin: Readiness Score, WCAG, tokens, auto-fix, codegen exports | HandOffLint is a standalone web dashboard for managers; agent-orchestrated multi-audit pipeline; avoids name collision |
| [Design Lint (destefanis)](https://github.com/destefanis/design-lint)                                | Open-source in-Figma plugin; missing styles/tokens                        | Unified cross-category score + LLM dev-impact explanations; works without plugin install                               |
| [Design Lint (moduesss)](https://github.com/moduesss/desing-lint)                                    | Structural linter; duplication, detached instances; JSON export           | Manager accountability gate + severity ranking; conservative false-negative philosophy compatible                      |
| [Figma Dev Mode](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode)          | Native inspect, Ready-for-dev statuses, notifications                     | Automated quality scoring before marking Ready for dev — complements workflow, doesn't replace it                      |
| [Stark](https://www.getstark.co/support/getting-started/using-the-contrast-checker/)                 | Paid a11y plugin: contrast, focus order, landmarks                        | Broader than a11y — layout, naming, tokens, spacing in one scan                                                        |
| [Figma MCP Server](https://developers.figma.com/docs/figma-mcp-server/)                              | Official MCP for design context → code in AI editors                      | HandOffLint lints _before_ codegen; Phase 3 sequel, not capstone competitor                                            |

## 5. Capability-trajectory assumptions

- **Assumes**: LLMs reliably orchestrate 5–7 tool calls in sequence (BFCL top models ~77% overall agentic accuracy); Figma REST API JSON is parseable without sending full tree to LLM; deterministic audit tools produce trustworthy findings; OpenRouter provides tool-calling models interchangeably via env var.
- **Survives improvement when**: Tool-call reliability improves, inference costs drop, Figma MCP gets richer — audit rule engine + accountability workflow + unified scoring remain valuable; better models enrich explanations and orchestration.
- **At risk if**: Figma ships native unified lint scoring with manager dashboards; or the value proposition reduces to "LLMs can finally parse JSON" without a differentiated workflow layer.

## 6. POC scope

- **In scope for POC**:
  - Next.js web dashboard: paste Figma URL → Readiness Score + severity-sorted findings
  - Figma REST API integration via server-side PAT (no OAuth)
  - 5 deterministic audit tools: auto-layout/absolute positioning, semantic naming, hidden layers, 8px spacing grid, WCAG contrast
  - AgentMark orchestrator: `.prompt.mdx` with tool calls, structured JSON output, evidence binding
  - Readiness Score computed in TypeScript (weighted severity formula — agent explains, never decides)
  - Figma deep links per finding (`node-id` in URL)
  - 2-file eval set (1 messy, 1 clean) + JSON snapshot regression tests via AgentMark JSONL evals
  - AgentMark tracing for capstone demo
- **Explicitly out of scope**:
  - OAuth / user accounts / scan history DB
  - Figma plugin (Phase 2)
  - Vision/multimodal audit (Phase 3)
  - MCP server (Phase 3)
  - Component reuse detection, SVG path analysis, export format validation
  - RAG
  - LangGraph
  - Langfuse (using AgentMark only for observability)
- **Smallest hypothesis to prove**: A design manager can paste a Figma URL and get a trustworthy, evidence-backed Readiness Score with actionable findings in under 60 seconds — without opening Figma plugins.

## 7. Tech stack

- **Model(s)**: OpenRouter (env-configurable). Dev default: `google/gemini-2.5-flash`. Demo: `anthropic/claude-sonnet-4`. Filter with `supported_parameters=tools`.
- **Agent framework**: Vercel AI SDK + AgentMark SDK (`.prompt.mdx` orchestrator, `max_calls` agent loop, inline tool definitions)
- **Retrieval stack**: N/A — Figma JSON fetched on demand, not indexed
- **Storage**: None (stateless MVP)
- **Orchestration / hosting**: Vercel (Next.js App Router API routes)
- **Frontend**: Next.js + Tailwind — URL input, score display, findings table, deep links
- **Observability**: AgentMark only — prompt versioning, OTel traces, JSONL evals, Dashboard trace explorer
- **Why this stack**: Matches existing Next.js/TS skills; AgentMark covers prompts + evals + tracing in one tool; OpenRouter enables model comparison for capstone writeup; no LangGraph learning curve for a 5-tool linear agent.

## 8. Architecture sketch

```
User pastes Figma URL (Next.js UI)
        ↓
POST /api/scan (Next.js API route, server-side secrets)
        ↓
Parse file_key + node_id from URL
        ↓
AgentMark orchestrator (.prompt.mdx, OpenRouter model, max_calls: 8)
  ├─ tool: fetch_figma_tree     → GET /v1/files/:key/nodes (PAT)
  ├─ tool: run_layout_audit     → TS: layoutMode, absolute positioning
  ├─ tool: run_naming_audit     → TS: regex on node.name
  ├─ tool: run_hidden_audit     → TS: visible === false
  ├─ tool: run_spacing_audit    → TS: itemSpacing/padding vs 8px grid
  └─ tool: run_contrast_audit   → TS: WCAG relative luminance math
        ↓
Agent returns structured JSON findings (must cite tool outputs)
        ↓
TS computes Readiness Score from findings (deterministic weights)
        ↓
Dashboard: score + findings sorted by severity + Figma deep links
```

## 9. Eval plan

**Eval cases**:

1. **Input**: URL to intentionally messy test file (absolute frames, "Rectangle 42", hidden layers, 13px spacing, failing contrast) → **Expected**: Readiness Score < 60; ≥ 8 total findings; ≥ 1 finding per audit category; every finding has `nodeId`, `auditTool`, `severity` → **Catches**: agent skipping audit tools or missing obvious violations
2. **Input**: URL to clean control file (Auto Layout throughout, semantic names, 8px grid, passing contrast) → **Expected**: Score > 85; zero `critical` or `high` findings → **Catches**: false positives on well-structured files
3. **Input**: URL with `?node-id=XXX` targeting a single messy frame → **Expected**: findings scoped to that subtree only; no issues from other pages → **Catches**: scanning entire file when user specified a frame
4. **Input**: Messy file URL, run 3 times with same model → **Expected**: identical deterministic audit tool outputs each run; score variance ≤ 2 points → **Catches**: non-deterministic audit logic
5. **Input**: Messy file, inspect agent synthesis output → **Expected**: 100% of findings have `nodeId` present in corresponding tool output JSON; zero findings without tool evidence → **Catches**: hallucinated issues (Phase 1 risk A)
6. **Input**: Malformed URL (`https://google.com`) → **Expected**: 400 response with "Invalid Figma URL" message; no LLM call → **Catches**: unhandled input, wasted API cost
7. **Input**: Valid Figma URL for inaccessible/private file (PAT lacks permission) → **Expected**: 403/404 with "Cannot access file — check permissions" message → **Catches**: cryptic 500 errors
8. **Input**: File with 500+ nodes → **Expected**: scan completes in < 60s; agent receives truncated tool summaries, not raw full tree → **Catches**: context overflow, timeout failures
9. **Red-team — Input**: URL to empty frame (single FRAME node, no children, no violations) → **Expected**: Score ≥ 95; zero findings; agent message "No issues detected" — NOT invented warnings about missing content → **Catches**: hallucination on empty/minimal input (Phase 1 risk A)

**Metrics**:

| Metric                         | How measured                                                                                   | Target            |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------- |
| Tool-call correctness          | AgentMark trace: did agent call `fetch_figma_tree` + all 5 audit tools on messy file?          | ≥ 90% (9/10 runs) |
| Finding groundedness           | Automated check: every finding `nodeId` exists in tool output JSON                             | 100%              |
| Deterministic audit regression | Jest/Vitest snapshot: audit tool outputs match committed JSON snapshots on messy + clean files | 100% pass         |
| Latency p95                    | AgentMark trace timestamps, end-to-end `/api/scan`                                             | < 45 seconds      |
| Cost per scan                  | AgentMark cost tracking per trace                                                              | < $0.05           |

**LLM-as-a-judge** (for explanation quality only — not for pass/fail on findings):

- **Judge model**: `google/gemini-2.5-flash` via OpenRouter (cheap, separate from orchestrator)
- **Judge prompt summary**: Given a finding (rule, nodeId, raw tool output) and the agent's explanation text, score whether the explanation (a) mentions developer impact, (b) references a specific property from tool output, (c) does not claim issues absent from tool output
- **Rubric**: 1–5 scale per dimension; pass = ≥ 4 on all three dimensions
- **Calibration**: Manually spot-check 5 findings; judge agreement ≥ 80% before using in eval pipeline

Note: Pass/fail on _whether issues exist_ is always deterministic (tool output + groundedness check). LLM judge evaluates explanation quality only.

**Red-team case**:

- **Input**: Empty frame URL (case 9 above)
- **Graceful failure**: High score, empty findings array, user-facing copy "No issues detected in this frame." Agent must NOT invent placeholder issues like "consider adding content" or "frame is empty" as lint violations.

## 10. Risks and mitigations

| Risk                                   | Likelihood | Mitigation                                                                                                                         |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Hallucinated findings in synthesis     | M          | Evidence binding: findings must include `nodeId` + `auditTool` from tool output; structured JSON schema; deterministic score in TS |
| Missed real issues (agent skips tool)  | M          | Prompt requires all 5 audit tools; eval case 1 checks tool-call trace; deterministic tools run regardless of agent "opinion"       |
| FigmaLint name confusion               | H          | Use HandOffLint branding; cite existing FigmaLint plugin in competitive analysis                                                   |
| Figma API rate limits on Starter files | M          | Use Pro-plan test files; cache file JSON for dev; document limit in demo                                                           |
| Large file timeout / token overflow    | M          | Truncate tool outputs before agent synthesis; depth limit on tree walk; eval case 8                                                |
| AgentMark learning curve               | M          | Week 1 spike: one `.prompt.mdx` + one tool before building all audits                                                              |
| Scope creep (plugin, vision, MCP)      | H          | Explicit out-of-scope list; roadmap slide for sequels                                                                              |

## 11. Resource estimate

- **Time to POC**: 64–102 hours over 3 weeks (~20–25 hrs/week)

| Phase                                | Hours (low) | Hours (high) |
| ------------------------------------ | ----------- | ------------ |
| Figma API + parsing                  | 8           | 14           |
| Deterministic audit engine (5 tools) | 18          | 28           |
| AgentMark orchestration              | 10          | 16           |
| Dashboard UI                         | 10          | 16           |
| Eval harness + golden files          | 6           | 10           |
| Polish + bug-fixing                  | 12          | 18           |

- **Compute**: Laptop only. No GPU. Vercel free tier for hosting.
- **API costs** (OpenRouter, model-dependent):
  - Dev: $8–20 (~300 scans + eval runs + model comparisons)
  - Demo: $2–5 (~30 live demo scans)
- **Data needs**: 2 Figma files (1 messy built incrementally while developing tools, 1 clean control) + JSON snapshot regression tests. ~4–6 hours, embedded in week 1–2.
- **External services**: Figma REST API (free), OpenRouter (pay-as-you-go), Vercel (free tier), AgentMark (local + optional cloud free tier)

## 12. Week-1 plan

Build the eval harness mindset from day 1 — not an afterthought.

1. **Scaffold Next.js app** on Vercel with `/api/scan` stub returning mock findings — proves deploy path.
2. **Figma fetch working**: PAT in env, parse URL → `GET /v1/files/:key/nodes`, log node tree to console.
3. **Create messy test Figma file** with one known violation per audit category (add violations as you build each tool).
4. **Implement first audit tool** (`run_naming_audit`) as pure TS + Vitest snapshot test against messy file.
5. **AgentMark spike**: one `.prompt.mdx` orchestrator calling `fetch_figma_tree` + `run_naming_audit`, return structured JSON — trace visible in AgentMark Dashboard.

## 13. Sources used in planning

1. FigmaLint plugin (Southleft) — https://www.figma.com/community/plugin/1521241390290871981/figmalint — Direct competitor; Readiness Score + AI audit feature overlap
2. Design Lint (destefanis) — https://github.com/destefanis/design-lint — Open-source token/style linter in Figma
3. Design Lint (moduesss) — https://github.com/moduesss/desing-lint — Structural linter with JSON export
4. Figma Dev Mode — https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode — Native handoff workflow baseline
5. Stark contrast checker — https://www.getstark.co/support/getting-started/using-the-contrast-checker/ — Accessibility audit competitor
6. Figma MCP Server — https://developers.figma.com/docs/figma-mcp-server/ — Phase 3 distribution channel reference
7. Figma REST API file endpoints — https://developers.figma.com/docs/rest-api/file-endpoints/ — Core technical foundation for tree parsing
8. Figma REST API authentication — https://developers.figma.com/docs/rest-api/authentication/ — PAT for capstone; OAuth deferred
9. Figma REST API rate limits — https://developers.figma.com/docs/rest-api/rate-limits/ — Tier 1 limits affect demo file choice
10. Berkeley Function Calling Leaderboard V4 — https://gorilla.cs.berkeley.edu/leaderboard.html — Agent tool-call reliability benchmark (Claude Opus 4.5 FC: 77.47% overall)
11. BFCL paper (Patil et al., ICML 2025) — https://proceedings.mlr.press/v267/patil25a.html — Eval framework for agent orchestration
12. Figma2Code (arXiv:2604.13648) — https://arxiv.org/abs/2604.13648 — Academic justification for messy-metadata → bad codegen
13. Anthropic API pricing — https://platform.claude.com/docs/en/about-claude/pricing — Cost reference (via OpenRouter equivalents)
14. OpenAI API pricing — https://developers.openai.com/api/docs/pricing — GPT-4o cost reference
15. OpenRouter models docs — https://openrouter.ai/docs/guides/overview/models — Multi-model routing with tool-calling filter
16. AgentMark overview — https://docs.agentmark.co/introduction/overview — Prompt management, evals, tracing platform
17. AgentMark tools and agents — https://docs.agentmark.co/build/tools-and-agents — Agent loop + tool definition pattern

**Could not find primary sources on:**

- "Communication debt" as formal design-handoff metric — use as product language only, not cited statistic
- Public labeled dataset for Figma lint eval — using 2 self-authored files + snapshot regression instead
- Quantitative survey on startup design pre-flight skip rates — anecdotal pain point only

## 14. Open questions

- Final OpenRouter model slug for demo day — run eval cases 1–5 on 2–3 candidates in week 2 and pick highest tool-call correctness
- Figma PAT scope: confirm `file_content:read` access on demo files before presentation
- AgentMark Cloud vs local-only for capstone demo — local traces may suffice; cloud Dashboard nicer for presentation
- Capstone rubric: confirm agent framework requirement is satisfied by AgentMark + Vercel AI SDK (not LangGraph specifically)
- Product name for presentation: HandOffLint vs DevReady — HandOffLint recommended

---

## Appendix A — Implementation progress (June 1, 2026)

> **Last updated June 1, 2026.** Reflects the live repo at `handofflint/`. Original planning sections above are unchanged.

### Done

| Area                         | Status | Notes                                                                                         |
| ---------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Next.js app + dashboard UI   | ✅     | URL input, Readiness Score card, findings table, severity badges, Figma deep links            |
| `POST /api/scan`             | ✅     | Parses URL → fetches Figma tree → runs audits → returns score + findings                      |
| Figma REST integration       | ✅     | PAT auth, URL parsing (`file` + `nodes`), cache, retry-after, MSW mock via `example.json`     |
| Deterministic audits (all 5) | ✅     | naming, layout, hidden, spacing, contrast — orchestrated by `runAllAudits()`                  |
| Readiness Score              | ✅     | Weighted severity formula in TypeScript (`readiness-score.ts`)                                |
| Unit tests                   | ✅     | 112 Vitest tests across audit + figma modules                                                 |
| Scan options                 | ✅     | Layout handoff profile, contrast level (standard/AA/AAA), grid base picker                    |
| Dev Figma file               | ✅     | One file with many frames used while building audits (replaces incremental “messy file” plan) |

### Not done (original POC scope)

| Area                             | Status | Notes                                                                          |
| -------------------------------- | ------ | ------------------------------------------------------------------------------ |
| AgentMark orchestrator           | ❌     | No `.prompt.mdx`, no AgentMark SDK dep yet                                     |
| OpenRouter / LLM                 | ❌     | Env stub in `.env.example` only                                                |
| LLM explanation synthesis        | ❌     | Findings use static `message` strings from audit tools                         |
| Eval harness (JSONL + AgentMark) | ❌     | No golden snapshot regression against committed Figma JSON                     |
| Clean control Figma file         | ⚠️     | Dev file has mixed frames; dedicated “clean” file still useful for eval case 2 |
| AgentMark tracing                | ❌     | —                                                                              |

### Architecture note (repo vs. §8 sketch)

The spec (§8) routes scans through an **AgentMark agent** that calls audit tools. The repo currently uses a **direct deterministic pipeline** alongside that planned design:

```
POST /api/scan → fetchFigmaTree → runAllAudits → computeReadinessScore → JSON response
```

This already satisfies the core product hypothesis (trustworthy score + evidence-backed findings). The agent layer from the original plan remains **optional enrichment**, not a prerequisite for correctness.

## Appendix B — Week-1 plan progress (June 1, 2026)

Status against §12 (original week-1 plan):

| #   | Original task (§12)            | Status                                                                   |
| --- | ------------------------------ | ------------------------------------------------------------------------ |
| 1   | Scaffold Next.js + `/api/scan` | ✅ Full pipeline, not mock-only                                          |
| 2   | Figma fetch (PAT, URL parse)   | ✅ + cache, retry, MSW mock                                              |
| 3   | Messy test Figma file          | ✅ One dev file, many frames (violations per category)                   |
| 4   | First audit tool + Vitest      | ✅ All five audits + 112 tests                                           |
| 5   | AgentMark spike                | ❌ Deferred — direct `runAllAudits` replaced agent orchestration for now |

**Revised focus (weeks 2–3):** eval harness, polish, then decide how much agent/LLM to add for capstone vs. product MVP.

## Appendix C — Recommended next steps (June 2026)

Priority order — ship proof before agent complexity.

1. **Golden-file regression** — Export JSON snapshots from the dev Figma file (messy frames + at least one clean frame). Commit snapshots; Vitest asserts `runAllAudits` output matches (eval plan cases 1, 2, 4). This locks audit correctness without an LLM.
2. **Dedicated clean control file or frame** — One frame with Auto Layout, semantic names, 8px grid, passing contrast for eval case 2 (score > 85, no critical/high).
3. **End-to-end eval cases 3, 6, 7** — Node-scoped scan, malformed URL, permission errors (mostly API route + client tests).
4. **Deploy to Vercel** — Confirm PAT + scan works in production; document demo URL.
5. **Agent / LLM (capstone layer)** — See Appendix D; add only after (1)–(3) pass.
6. **Optional polish** — Truncate large trees for future agent context; p95 latency check (eval case 8).

## Appendix D — Why an agent in Phase 1? (June 2026)

**Short answer:** You do **not** need an agent for findings or the Readiness Score. You may still want one for the **capstone story** and **better explanations** (per original §1 and §6).

| Concern                 | Without agent (current repo)             | With agent (original spec intent)                                                  |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Are violations correct? | ✅ Deterministic TS audits               | Same — agent must not invent issues                                                |
| Readiness Score         | ✅ `computeReadinessScore`               | Same — score stays in TS (§6)                                                      |
| Tool orchestration      | ✅ `runAllAudits` calls all tools        | Redundant unless you need dynamic skipping                                         |
| User-facing copy        | Static `message` per rule                | LLM can add _developer impact_ (“this absolute frame becomes fixed px in codegen”) |
| Hallucination risk      | None for findings                        | Only if LLM adds findings not in tool output — mitigated by evidence binding (§10) |
| Capstone rubric         | May need explicit “agent framework” demo | AgentMark + thin synthesis prompt satisfies orchestration requirement              |

**Recommended Phase 1 agent shape (thin, not central):**

```
runAllAudits(findings)  →  already complete
        ↓
optional: AgentMark prompt takes findings[] + audit metadata
        ↓
returns: enriched explanations only (same nodeIds, no new findings)
        ↓
UI shows: deterministic findings + optional "Why this matters for dev" blurb
```

- **Skip the agent for MVP demo** if the rubric allows “deterministic tools + future LLM layer” — the product already works.
- **Add the agent for capstone** as a _post-processor_: 1 prompt, no tool-calling loop (or a loop that only re-fetches if you add more tools later). Eval cases 5 and 9 (groundedness, empty frame) apply to synthesis only.
- **Do not** let the agent choose which audits to run or compute the score — that was the original risk (skipped tools, hallucinated score).

**Cost/latency:** Direct scan is fast and free of LLM cost. Agent synthesis adds ~$0.01–0.05 per scan and 5–15s — justify with explanation quality, not correctness.

## Appendix E — Open questions (updates, June 1, 2026)

Additional questions from implementation (original §14 list unchanged above):

- **Week 1 audit tools** — Resolved: all five implemented.
- **Agent necessity:** Confirm capstone rubric — is “thin LLM explanation layer” enough, or is a tool-calling agent loop required? If loop required, use agent only to _invoke_ the same `runAllAudits` (wrapper), not to replace it.
- Final OpenRouter model slug — only relevant once synthesis is added; judge explanation quality (§9 rubric), not tool-call rate.
- Clean control frame: carve from dev file or duplicate as second file?

---

## Appendix F — Tier 2 agentic upgrade plan (June 1, 2026)

> **Purpose.** Promote HandOffLint from "deterministic pipeline + a possible one-shot LLM judge" into a genuine **AI-engineering** project, *without* weakening the correctness guarantees in §6/§10/Appendix D. This appendix is a build plan only — no code yet.
>
> **Decision recorded:** Tier 2 (Investigator agent + reflection/critic loop), **additive** scope (deterministic findings + score stay authoritative; the agent only enriches), stack = **Vercel AI SDK + AgentMark** (`.prompt.mdx`), as §7 intends.

### F.1 Why this is "real" AI engineering (not complexity theater)

A single OpenRouter call with a system prompt is just text-in/text-out. The capstone-worthy difficulty here is building an agent that is **useful yet fenced in**: it gets tools and a multi-step loop, but deterministic audits decide *what is wrong* and TypeScript computes the score. Embracing that tension is the engineering narrative.

Primitives this tier demonstrates:

- **Tool-calling loop** — agent autonomously calls investigation tools (Vercel AI SDK `generateText` + `tools` + `stopWhen`).
- **Multi-agent orchestration** — an *Investigator* agent and a *Critic* agent with distinct prompts/roles.
- **Reflection / evaluator–optimizer loop** — critic gates output; investigator revises on failure (bounded retries).
- **Groundedness gating** — deterministic check that every cited `nodeId` exists in real tool output (no hallucinated findings).
- **RAG-lite** — small retrieval over a local handoff-guideline doc (not a vector DB; keeps §6 "RAG out of scope" honest by staying a flat keyed lookup).
- **Evals + tracing** — AgentMark JSONL evals and OTel traces over the whole loop.

### F.2 Scope decision — additive (recommended, "unsure" → resolved)

**The agent never decides correctness or score.** Pipeline order is unchanged up to and including `runAllAudits` + `computeReadinessScore`; the agent runs *after* and only produces explanation/prioritization metadata attached to existing findings.

| Concern | Owner | Notes |
| --- | --- | --- |
| Which audits run | Deterministic `runAllAudits` | Agent does **not** choose audits (avoids §10 "skipped tool" risk) |
| Whether a finding exists | Deterministic audit tools | Agent may not add or remove findings |
| Readiness Score | `computeReadinessScore` (TS) | Agent never sees score-as-input until after it's final |
| Explanation / dev-impact copy | Investigator agent | Must cite real `nodeId`s from tool output |
| Prioritization / clustering | Investigator agent | Advisory ordering only; severity still deterministic |
| Explanation quality gate | Critic agent + deterministic groundedness check | Hard gate on groundedness; soft gate on quality rubric |

Rationale: this is the only option that keeps every guarantee in Appendix D while still giving a full agentic surface. If demo-day rubric explicitly demands the agent *drive* tool calls, fall back to "Tier 1 wrapper" (agent invokes the same `runAllAudits`) — recorded as a contingency, not the plan.

### F.3 Target architecture

```
POST /api/scan
  → fetchFigmaTree
  → runAllAudits            (deterministic findings — SOURCE OF TRUTH)
  → computeReadinessScore   (deterministic score)
  → enrichFindings(agent)   ← NEW, additive, best-effort
        ├─ Investigator agent (tool-calling loop, max_steps ≈ 6)
        │     tools:
        │       • get_node_context(nodeId)      → parent chain, siblings, key props from tree
        │       • get_related_findings(nodeId)  → other findings on same subtree (cluster)
        │       • lookup_handoff_guideline(cat) → keyed lookup over local guidelines doc (RAG-lite)
        │     output: enrichment[] keyed by findingId
        │              { findingId, devImpact, citedNodeIds[], priorityHint, cluster? }
        │
        └─ Critic loop (evaluator–optimizer, max_retries = 2)
              1. deterministic groundedness: every citedNodeId ∈ tool-output nodeIds?  (HARD gate)
              2. LLM judge (§9 rubric): devImpact mentions impact + cites a real property + no invented issue
              3. fail → re-prompt Investigator with critique; pass → attach enrichment
  → JSON response: findings (unchanged) + optional `enrichment` per finding + `agentMeta`
```

**Failure isolation:** if the agent layer errors, times out, or fails the groundedness gate after retries, the response degrades gracefully to today's deterministic output with `enrichment: null` and an `agentMeta.status` reason. Correctness path never depends on the LLM.

### F.4 Data contracts (additive to existing `ScanResponse`)

```ts
// NEW — attached alongside existing findings; never replaces them
interface FindingEnrichment {
  findingId: string;        // matches an existing deterministic finding
  devImpact: string;        // "why this hurts dev / codegen" copy
  citedNodeIds: string[];   // MUST all exist in tool output (groundedness gate)
  priorityHint: number;     // advisory ordering only; severity stays deterministic
  clusterId?: string;       // groups systemic issues across findings
}

interface AgentMeta {
  status: "ok" | "skipped" | "degraded";
  reason?: string;          // e.g. "LLM disabled", "groundedness failed x2", "timeout"
  model: string;            // resolved OpenRouter slug
  steps: number;            // tool-call steps taken
  retries: number;          // critic re-prompts
  costUsd?: number;
  latencyMs: number;
}

// ScanResponse gains: enrichment?: FindingEnrichment[] | null; agentMeta?: AgentMeta;
```

Existing clients keep working because `findings`, `readinessScore`, and `auditSummary` are untouched.

### F.5 Module / file plan (no code yet — target layout)

| New file | Responsibility |
| --- | --- |
| `src/lib/agent/enrich-findings.ts` | Orchestrates Investigator + Critic; returns `FindingEnrichment[]` + `AgentMeta`; pure of Next specifics |
| `src/lib/agent/tools.ts` | Vercel AI SDK tool defs: `get_node_context`, `get_related_findings`, `lookup_handoff_guideline` (thin wrappers over existing `tree.ts` / findings) |
| `src/lib/agent/groundedness.ts` | Deterministic check: all `citedNodeIds` ∈ tool-output node set; unit-tested, no LLM |
| `src/lib/agent/guidelines.ts` | Local keyed handoff-guideline lookup (RAG-lite source data) |
| `prompts/investigator.prompt.mdx` | AgentMark Investigator prompt + tool wiring, `max_calls`/steps |
| `prompts/critic.prompt.mdx` | AgentMark Critic/judge prompt (§9 rubric) |
| `src/lib/agent/model.ts` | OpenRouter model resolution via env (`supported_parameters=tools`), dev vs demo slug |

Integration point: one new call in `src/app/api/scan/route.ts` after `computeReadinessScore`, guarded by an `ENABLE_AGENT_ENRICHMENT` env flag (default off → today's behavior).

### F.6 Eval additions (extends §9)

Reuse §9 cases; the agent layer adds:

- **Case 5 (groundedness)** becomes the **hard gate** in the critic loop and a CI assertion: 100% of `citedNodeIds` exist in tool output, else build fails.
- **Case 9 (empty frame)** asserts `enrichment` is empty/`null` — agent must not invent "add content" advice.
- **NEW — reflection efficacy:** seed the Investigator with a deliberately hallucinated `nodeId` (fault injection); expect the critic loop to catch it and the final output to be grounded (proves the loop does work, not decoration).
- **NEW — degradation:** with `ENABLE_AGENT_ENRICHMENT=false` or a forced LLM error, `/api/scan` still returns deterministic findings + score; `agentMeta.status = "skipped" | "degraded"`.
- **Metrics added to §9 table:** tool-call steps per scan, critic retry rate, groundedness pass rate (target 100%), enrichment latency p95 (target < 15s on top of deterministic), enrichment cost/scan (target < $0.05).

### F.7 Phased build order (when we do build)

1. **Contracts + flag** — add `FindingEnrichment`/`AgentMeta` types and the off-by-default env flag; response shape stable, no behavior change.
2. **Tools + groundedness (no LLM)** — implement the 3 tools and `groundedness.ts` with Vitest; these are deterministic and testable alone.
3. **AgentMark spike** — `investigator.prompt.mdx` calling one tool, trace visible in AgentMark Dashboard (mirrors original §12 step 5).
4. **Investigator full loop** — all 3 tools, `enrich-findings.ts`, attach enrichment in `route.ts` behind the flag.
5. **Critic / reflection loop** — groundedness hard gate + LLM judge soft gate + bounded retries.
6. **Evals + tracing** — wire F.6 cases into the AgentMark JSONL eval set; record traces for the demo.

### F.8 Risks specific to this tier (extends §10)

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Agent latency/cost balloons the loop | M | `stopWhen` step cap (~6), retry cap (2), truncate `get_node_context` output, flag-gated |
| Reflection loop oscillates / never passes | M | Hard retry cap → degrade to deterministic output; log `agentMeta.reason` |
| Tool-calling unreliable on cheap dev model | M | §7 model filter `supported_parameters=tools`; eval tool-call-step metric; demo on stronger slug |
| Reviewer sees agent as bolted-on | M | Fault-injection eval (F.6) proves the loop changes outputs; additive design is the stated thesis |
| "RAG-lite" mislabeled as full RAG | L | Keep it a flat keyed lookup; document explicitly that §6 "RAG out of scope" still holds |

### F.9 Open questions (this tier)

- Investigator scope per scan: enrich **all** findings or only top-N by severity (cost control)? Lean top-N (e.g. 8) with a documented cutoff.
- Should `clusterId` feed the UI (grouped "systemic issue" cards) or stay backend-only for v1? Backend-only first.
- AgentMark loop vs. Vercel AI SDK native loop for the reflection cycle — confirm which owns retries; prefer AI SDK `generateText` loop, AgentMark for prompt versioning + tracing.
- Resolve §14 capstone-rubric question: this tier satisfies "agent framework + tool calls + orchestration + evals" — confirm with grader.

---

## Appendix G — Design-system conformance (Phase 2 / 3 roadmap, June 1, 2026)

> **Idea (recorded).** Professional teams build a **design system first**, then design *against* it. If the user supplies their design system, HandOffLint can judge a design by the bar that actually matters at handoff: **conformance to the system**, not just generic lint. This is the most product-defensible direction in the spec and the place where retrieval (RAG) legitimately earns its keep. Captured here as a future phase; not POC scope.

### G.1 Why this is worth doing

Generic lint asks "is this well-formed?" Design-system conformance asks "is this *ours*?" — which is the real handoff gate:

- **Token drift** is the #1 silent handoff cost: a frame using `#3B82F6` / `13px` instead of `color.primary.500` / `space.2` generates one-off hardcoded values in codegen and breaks theming. Deterministic JSON audits can flag "off-grid"; only a system comparison can say "off-*token*."
- **Component drift**: a hand-built or detached element where a published library component exists (`Button/Primary`, `Card`) → divergent implementations downstream.
- **Vocabulary drift**: names that don't match the system's semantic language.

This reframes the Readiness Score from "generically clean" to **"% conformant to *your* system"**, which is what a design lead is actually accountable for.

### G.2 How the user provides a design system (3 input modes, increasing difficulty)

| Mode | Source | Effort | Notes |
| --- | --- | --- | --- |
| A. Tokens export | W3C DTCG / Style Dictionary / Tokens Studio JSON upload | Low | Canonical format = **W3C DTCG**; adapt others. Best Phase-2 starting point |
| B. Published Figma library | Second Figma file URL (the library/foundation file) | Medium | Reuse existing `fetchFigmaTree`; pull `GET /v1/files/:key/styles`, `/components`, `/component_sets` |
| C. Team library + variables | Figma Variables API (modes/themes) | High | May need OAuth / enterprise scope — gate carefully; furthest out |

### G.3 What it unlocks (new finding classes)

- **Token conformance** — every used color / spacing / radius / type style resolves (or fails to resolve) to a system token. Finding: `off-token` with the nearest token suggestion.
- **Component conformance** — detached instances, or ad-hoc frames that match a library component. Finding: `should-be-instance-of: Button/Primary`.
- **Coverage / drift score** — % of values & elements drawn from the system vs. off-system; trend-able per file.
- **Naming vocabulary** — node names checked against the system's semantic terms.

### G.4 Where RAG legitimately enters (relaxes the earlier "no RAG")

A real design system is too large to fit in a prompt (hundreds of tokens, dozens of components). So index it and retrieve:

- **Token index** — used value → nearest token(s) by perceptual/numeric distance (color ΔE, spacing delta). Exact match = deterministic; "near" match = tolerance-based suggestion.
- **Component index** — node fingerprint / rendered image → candidate library components by structural + (Phase 3) visual-embedding similarity.

This is genuinely RAG (retrieve-then-reason over an external corpus), unlike the flat keyed lookup in Appendix F. Scope note: RAG remains **out of POC**; it is introduced *only* in this phase.

### G.5 How it composes with the vision-ReAct agent

Adds two tools to the agent loop (no new pipeline):

- `resolve_token(value, kind)` → nearest system token + match confidence (deterministic core).
- `match_component(nodeId | image)` → candidate library components (structural in P2; vision-embedding in P3).

Cross-modal synergy: the vision model says "this looks like a primary button"; `match_component` confirms `Button/Primary` exists; deterministic check sees it's a detached frame → high-confidence, grounded `should-be-instance` finding. Vision + retrieval + deterministic check agreeing is exactly the trustworthy-agent story.

### G.6 Deterministic vs. fuzzy split (phasing)

| Capability | Determinism | Phase |
| --- | --- | --- |
| Exact token match (value ∈ system tokens) | Deterministic | **2** |
| Library component-id match (instance of published comp) | Deterministic | **2** |
| Nearest-token suggestion (ΔE / numeric tolerance) | Fuzzy, thresholded | **2–3** |
| Semantic component match ("looks like a Card") | Vision + embeddings | **3** |
| Theme/mode-aware conformance (Variables API) | Deterministic but high-access | **3** |

**Recommended path:** Phase 2 = Mode A (tokens JSON) + exact + nearest-token conformance — high value, mostly deterministic, evaluable. Phase 3 = Mode B/C + semantic/vision component matching once the vision-ReAct agent (Appendix F direction) exists.

### G.7 New eval dimension

- **Conformance precision/recall**: labeled set of on-system vs. off-system values/components → flag the off-system ones without false positives on conformant values (false positives here are especially damaging — they erode trust in the system itself).
- **Nearest-token correctness**: suggested token is the one a designer would pick (spot-check / judge).
- **Drift-score stability**: same file → same coverage score (determinism regression).

### G.8 Risks / open questions

| Risk | Notes |
| --- | --- |
| Acquiring the system | Easiest = tokens JSON upload or a readable published library file; Variables API may need OAuth/enterprise — scope before promising |
| Token format fragmentation | Standardize on W3C DTCG; write adapters for Style Dictionary / Tokens Studio |
| Match tolerance tuning | Too tight → misses near-dupes; too loose → false "off-token" noise. Needs the eval set in G.7 to calibrate |
| Big systems | Retrieval, not prompt-stuffing (G.4); cache the index per library version (reuse `cache.ts` version-awareness) |
| Scope creep | Strictly Phase 2/3 — do **not** pull into POC or the vision-ReAct capstone tier |

---

_Generated by the capstone-poc-planner skill. Hand this spec to Claude with "Build the POC described in handofflint-poc-spec.md" to start a clean build session._

_Appendices added June 1, 2026 — implementation progress for repo `handofflint/`._
