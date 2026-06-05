# handofflint-agentic-poc-spec.md

# HandOffLint (AI-Codegen Guardrail Profile) — POC Specification

> **Updated:** June 4, 2026. This specification refactors the project from a complex, multi-turn ReAct agent into a **lean, single-turn linear validation pipeline**. It focuses on acting as a "pre-flight preprocessor" for AI-assisted code generation (Vibe Coding), cleaning up Figma design quality to unlock production-grade UI output from tools like Cursor, v0, and Bolt. Phases 0 and 1 are already completed and verified.

---

## 1. One-Paragraph Summary

HandOffLint lets a developer or design lead paste a Figma URL to clean, audit, and optimize design schemas _before_ passing them to AI code-generation tools (preventing the "garbage-in, garbage-out" cycle of vibe coding). While deterministic TypeScript audits instantly catch low-level structural defects (missing Auto Layout, hidden cruft, broken SVG constraints), a single-turn **structured vision validation pipeline** uses Gemini 2.5 Flash to view the rendered frame alongside the JSON context. The pipeline isolates perceptual defects (text overlaps, visual crowding, hierarchy breaks) and generates high-level UX suggestions. This produces a clean, high-signal summary of violations that guarantees production-grade code output when fed into AI generation models.

---

## 2. The Problem and the User

- **Specific User:** The modern software engineer or product builder "vibe coding" applications using AI assistants (Cursor, v0, Bolt, Claude) who relies heavily on Figma layouts for code generation.
- **The Problem:** Modern LLMs are excellent at writing code from clean design layouts, but they inherit structural debt directly from Figma. Messy positioning, overlapping text, missing auto-layout components, and bad line-heights cause AI tools to generate fragile, absolute-positioned, unmaintainable UI code.
- **The Solution:** A fast, external pre-flight dashboard that lints both the JSON properties and the visual layout of a design asset. Instead of enforcing arbitrary team severities, it acts as a filter that reduces layout noise, catches visual edge cases, and optimizes components for frictionless AI generation.

---

## 3. Why Now

Frontier vision models like Gemini 2.5 Flash have achieved exceptional performance in structural and visual layout parsing via single-turn structured schema modes (`generateObject`). Running open-ended multi-turn loops is slow and expensive, but a linear single-turn call allows a cheap, fast vision check to identify alignment breaks and overlap failures that raw JSON parsers miss entirely.

---

## 4. Architecture Sketch (Linear Pipeline)

```
User pastes Figma Frame URL (Next.js Dashboard)
   ↓
POST /api/scan
   ↓
[STEP 1: DETERMINISTIC AUDITS - SOURCE OF TRUTH]
fetchFigmaTree → runAllAudits (8 TypeScript checks)
   ↓
[STEP 2: TARGETED VISUAL SOURCE ACQUISITION]
Isolate flagged frames → fetchFigmaImages (Phase 1 Image URL)
   ↓
[STEP 3: SINGLE-TURN VISION CRITIQUE]
Send Image URL + TS Audit context to Gemini 2.5 Flash
Execute via `generateObject` for clean Zod structured output
   ↓
[STEP 4: DETERMINISTIC GUARDRAILS]
- Groundedness Gate: Ensure all cited nodeIds exist in Figma JSON
- Cross-Modal Filter: Drop claims that directly contradict raw JSON
   ↓
[OUTPUT]
Dashboard Display: Core Violations + Clear Code-Gen Suggestions
```

---

## 5. POC Scope

### In Scope

- **Deterministic Baseline (DONE):** 8 automated TypeScript structural checks + weighted Readiness Score computing.
- **Figma Image Fetching (DONE):** Integrated `fetchFigmaImages` client via the Figma Image API (`GET /v1/images`).
- **Single-Turn Vision Tool:** A unified call using `generateObject` powered by Gemini 2.5 Flash to extract `violations` and `suggestions` matching a strict Zod schema.
- **TypeScript Guardrails:** \* _Groundedness check:_ A direct code validation filter matching model-cited IDs against the real Figma tree array.
  - _Cross-modal check:_ Pure code rules discarding structural AI assertions that clash with concrete layout parameters (e.g., claiming a layout is broken when the JSON contains clean Auto Layout declarations).
- **AI-Codegen Output:** High-level optimization summaries ready to be copied directly into AI coding prompts to guide clean layout creation.

### Explicitly Out of Scope

- Multi-turn ReAct loops, state tracking, and open-ended tool navigation.
- LLM-driven design system RAG lookups or external token directories.
- Expensive multi-model critic or evaluator workflows (e.g., Anthropic Claude 4.5 Sonnet passes).

---

## 6. Tech Stack

- **Core Audits & Logic:** Pure TypeScript, execution environment built natively inside Next.js App Router API routes.
- **Vision & Optimization Inference:** OpenRouter or direct Google AI SDK utilizing `google/gemini-2.5-flash`. Configured for single-turn structured JSON schemas via `generateObject`.
- **Testing & Guardrails:** Vitest for traditional snapshots and edge cases. Pure JavaScript array methods for groundedness validation.
- **UI Interface:** Tailwind CSS dashboard showcasing the asset score, detected structural issues, and high-signal prompt hints.

---

## 7. Eval Plan

1. **Deterministic Stability (Vitest):** Running mock Figma JSON payloads through the 8 audits must output 100% identical findings and scores across every test iteration.
2. **Hard Groundedness Validation:** Seed mock visual findings containing fake node IDs; your TypeScript filter must cleanly catch and discard 100% of the hallucinated entities.
3. **Cross-Modal Consistency:** Feed a visual finding asserting an overlay error on a node that actually possesses a flawless structural flexible layout configuration; the filter must successfully discard the edge-case error.
4. **Latency Target:** Complete processing pipelines for targeted frames in under 8 seconds.

---

## Appendix A — Build Checklist (Linear Pipeline Update)

### Phase 0 & Phase 1 — Foundations (COMPLETED)

- [x] **0.1** Next.js architecture scaffold + API routing
- [x] **0.2** 8 core deterministic audits implemented (`naming`, `layout`, `hidden`, `spacing`, `contrast`, `svg`, `export`, `reuse`)
- [x] **0.3** Score calculation engine + Next.js base Dashboard UI
- [x] **1.1** `fetchFigmaImages` integration handling API interaction, 429 safety paths, and null image results
- [x] **1.2** Vercel AI SDK compliant schema implementation for frame evaluation

### Phase 2 — Golden Snapshot Evals (BUILD BY HAND) (COMPLETED)

_Goal: Secure your deterministic test parameters before connecting LLM operations._

- [ ] **2.1** Save your mock Figma JSON payloads into your test workspace fixture directory.
- [ ] **2.2** Write an automated Vitest script validating that your layout audits output consistent flags against your mock layouts.
- [ ] **2.3** Add a basic validation case verifying that unparseable or completely blank design canvas assets generate empty exception sets.

### Phase 3 — Vision Critique Implementation (SURGICAL AI)

_Goal: Build the single-turn object generator prompt context._

- [ ] **3.1** Configure your API layer to isolate your key targeted design assets (e.g., the parent selection or nodes flagged by Phase 0).
- [ ] **3.2** Declare a clean Zod schema format containing array items: `nodeId`, `violationCategory`, `perceptualFlawDescription`, and `codegenPromptSuggestion`.
- [ ] **3.3** Prompt Cursor to generate _only_ the single-turn `generateObject` message array connecting the image asset URL and raw layout parameters to Gemini 2.5 Flash.

### Phase 4 — Pure TypeScript Guardrails (BUILD BY HAND)

_Goal: Program defensive code wrappers without burning AI tokens._

- [ ] **4.1** Implement a standard JavaScript map check verifying that every AI-cited `nodeId` is actively present in the Figma JSON tree.
- [ ] **4.2** Add simple code exception rules: if the model reports an element alignment failure, but the element has valid Auto Layout properties, skip the finding to reduce visual noise.

### Phase 5 — (Deleted / Absorbed into Phase 4 Contracts)

### Phase 6 — UI Dashboard Enrichment Panel (BUILD BY HAND)

_Goal: Wire your structured AI outputs directly into your visual dashboard layout._

- [ ] **6.1** Update your scan route response payload contract to include an optional `aiEnrichment` collection field.
- [ ] **6.2** Clone an existing layout card layout inside your React front-end workspace.
- [ ] **6.3** Render a clean visual panel displaying the AI's structural flaws alongside code-snippet optimization suggestions.

### Phase 7 — Production Polish & Validation (BUILD BY HAND)

_Goal: Final end-to-end performance runs._

- [ ] **7.1** Run a complete user transaction trace passing a single layout frame URL. Verify that your system outputs unified structural checks and visual prompt enhancements in a single runtime pass.
- [ ] **7.2** Double-check your API token consumption logs to ensure your single-turn architecture stays under your target budget limits.
