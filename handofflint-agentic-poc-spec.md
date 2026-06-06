# handofflint-agentic-poc-spec.md

# HandOffLint (AI-Codegen Guardrail Profile) — Agentic POC Specification

> **Updated:** June 6, 2026. This specification pivots the project from a single-turn linear validation pipeline into a **multi-step agentic architecture**. The backend maintains Figma tree memory across HTTP requests via a server-side flat index cache. A ReAct vision agent (Gemini 2.5 Flash) inspects the rendered frame, calls local tools to verify node properties and search layout guidelines, and returns a structured JSON payload to the wizard dashboard. Phases 0 and 1 (deterministic audits, Figma client, base UI) are already completed and verified.

---

## 1. One-Paragraph Summary

HandOffLint lets a developer or design lead paste a Figma URL to clean, audit, and optimize design schemas _before_ passing them to AI code-generation tools (preventing the "garbage-in, garbage-out" cycle of vibe coding). Deterministic TypeScript audits instantly catch low-level structural defects (missing Auto Layout, hidden cruft, broken SVG constraints) and compute a weighted Readiness Score. A multi-turn **ReAct vision agent** then views the rendered frame screenshot, invokes server-side tools at zero marginal cost to inspect cached node properties and search local layout guideline docs, and synthesizes a final structured response matching a strict Zod schema. This produces grounded, actionable UX suggestions that guarantee production-grade code output when fed into AI generation models.

---

## 2. The Problem and the User

- **Specific User:** The modern software engineer or product builder "vibe coding" applications using AI assistants (Cursor, v0, Bolt, Claude) who relies heavily on Figma layouts for code generation.
- **The Problem:** Modern LLMs are excellent at writing code from clean design layouts, but they inherit structural debt directly from Figma. Messy positioning, overlapping text, missing auto-layout components, and bad line-heights cause AI tools to generate fragile, absolute-positioned, unmaintainable UI code.
- **The Solution:** A fast, external pre-flight dashboard that lints both the JSON properties and the visual layout of a design asset through a staged wizard. Deterministic audits run first as the numerical source of truth; an autonomous vision agent then investigates perceptual defects with tool-backed grounding instead of hallucinating from a single prompt.

---

## 3. Why Now

Frontier vision models like Gemini 2.5 Flash support reliable multi-step tool calling via the Vercel AI SDK (`generateText` + `maxSteps`). A server-side flat node index gives the agent O(1) property lookup without re-fetching the full Figma tree on every tool call — making a lightweight ReAct loop feasible within free-tier rate limits. Local tool execution (cache lookup, markdown RAG) runs at $0 cost per turn, keeping the investigation loop cheap even across 3–5 steps.

---

## 4. Architecture Sketch

### 4a. Wizard Pipeline (Dashboard → Three API Routes)

```
User opens Wizard Dashboard (Next.js split-panel UI)
   ↓
[STEP 1: INGESTION]
POST /api/agent/init  { url }
   → parseFigmaUrl → fetchFigmaTree → saveTreeToCache (flat Map<nodeId, FigmaNode>)
   → returns { fileKey, nodeId, success }
   ↓
[STEP 2: STRUCTURAL LINTERS]
POST /api/agent/audit  { fileKey, layoutProfile: "dashboard" | "landing" }
   → getTreeFromCache → runAllAudits (8 TypeScript checks + density profile)
   → returns { readinessScore, findings[] }
   ↓
[STEP 3: VISION INVESTIGATION — ReAct Agent]
POST /api/agent/vision  { fileKey, nodeId, imageUrl, customGuides? }
   → see 4b below
   ↓
[OUTPUT]
Left panel: Readiness Score + findings table
Right panel: Agent investigation results + codegen suggestions
```

**Server-side state:** A global in-memory `Map<fileKey, Map<nodeId, FigmaNode>>` persists the flattened Figma tree across wizard steps. No database required for POC.

### 4b. Vision Agent User Flow (`POST /api/agent/vision`)

```
Frontend hits POST /api/agent/vision
                                    ↓
       Server runs `generateText({ maxSteps: 5, tools: [...] })`
                                    ↓
    [TURN 1] Gemini inspects screenshot PNG.
             "Hmm, element 4:23 looks squashed."
             → Agent Action: Calls `inspect_node_properties("4:23")`
                                    ↓
    [TURN 2] Tool executes locally at $0 cost, returns raw node padding/bounds.
             Gemini reads observation: "Ah, it has no auto-layout flex attributes."
             → Agent Action: Calls `search_layout_guidelines("clipping")`
                                    ↓
    [TURN 3] RAG tool fetches a GitHub markdown file, chunks it, and ranks paragraphs by keyword match.
             Returns: "Apply whitespace-nowrap or flex-wrap rules."
             → Agent Action: Gemini synthesizes the solution.
                                    ↓
    [FINAL TURN] Loop terminates because Gemini has everything it needs.
                 It structures the final array matching your Zod schema.
                                    ↓
                Backend sends clean JSON back to your UI!
```

**Registered tools:**

| Tool | Cost | What it does |
| --- | --- | --- |
| `inspect_node_properties` | $0 | Looks up `nodeId` in server cache; returns layout properties with child arrays stripped |
| `search_layout_guidelines` | $0 | Fetches a GitHub raw markdown file, chunks by paragraph, ranks by keyword intersection, returns top 3 matches |

---

## 5. POC Scope

### In Scope

- **Deterministic Baseline (DONE):** 8 automated TypeScript structural checks + weighted Readiness Score computing.
- **Figma Image Fetching (DONE):** Integrated `fetchFigmaImages` client via the Figma Image API (`GET /v1/images`).
- **Server Tree Cache:** Global singleton flat-index cache keyed by `fileKey` for cross-request node lookup.
- **Three API Routes:** `POST /api/agent/init`, `POST /api/agent/audit`, `POST /api/agent/vision`.
- **ReAct Agent Tools:** `inspect_node_properties` (cache lookup, child-array stripping) and `search_layout_guidelines` (single-file GitHub markdown RAG with keyword ranking).
- **Multi-Turn Vision Loop:** Vercel AI SDK `generateText` with `maxSteps: 5`, tools bound in config, final output via Zod schema.
- **Wizard UI State Machine:** 4-step client workflow (URL → profile → launch → results) with split-panel dashboard.
- **Layout Density Profiles:** `"dashboard"` and `"landing"` profile strings passed to audit math boundaries.

### Explicitly Out of Scope

- Persistent database or Redis cache (in-memory only for POC).
- OAuth / user accounts / scan history.
- Expensive multi-model critic or evaluator workflows.
- Figma plugin or MCP server integration.

---

## 6. Tech Stack

- **Core Audits & Logic:** Pure TypeScript inside Next.js App Router API routes.
- **Tree Cache:** Global in-memory `Map` with tree-flattening helper (`src/lib/figma/cache.ts`).
- **Vision Agent:** Vercel AI SDK `generateText` + `google/gemini-2.5-flash`, `maxSteps: 5`, Zod structured output.
- **Agent Tools:** AI SDK tool wrappers in `src/lib/agent/tools/`.
- **Single-File RAG:** GitHub raw CDN fetch → paragraph chunking → keyword intersection scoring → top-3 retrieval (`src/lib/agent/tools/search-guidelines.ts`).
- **Testing:** Vitest for deterministic audit snapshots; manual curl/script verification for endpoint chain.
- **UI:** Tailwind CSS split-panel wizard dashboard.

---

## 7. Eval Plan

1. **Deterministic Stability (Vitest):** Mock Figma JSON payloads through the 8 audits must output identical findings and scores on every run.
2. **Cache Round-Trip:** `init` → `audit` → `vision` sequential calls must share the same `fileKey` index without re-fetching from Figma.
3. **Cache Miss Guard:** `audit` and `vision` routes must return 400 when `fileKey` is absent from cache.
4. **Tool Groundedness:** Every `inspect_node_properties` call must resolve a real `nodeId` from the flat index; no hallucinated IDs.
5. **ReAct Turn Sequence:** Agent must follow the expected pattern — visual observation → inspect tool → RAG tool → structured synthesis — within `maxSteps: 5`.
6. **Structured Output Validity:** Final vision response must parse against the Zod schema with no missing required fields.
7. **Latency Target:** Full wizard pipeline (init + audit + vision) completes in under 30 seconds for a single-frame target.
8. **Rate Limit Safety:** ReAct loop stays within `maxSteps: 5` and Google AI Studio free-tier allowance (15 RPM).

---

## Appendix A — Build Checklist (Agentic Architecture Pivot)

### Phase 0 & Phase 1 — Foundations (COMPLETED)

- [x] **0.1** Next.js architecture scaffold + API routing
- [x] **0.2** 8 core deterministic audits implemented (`naming`, `layout`, `hidden`, `spacing`, `contrast`, `svg`, `export`, `reuse`)
- [x] **0.3** Score calculation engine + Next.js base Dashboard UI
- [x] **1.1** `fetchFigmaImages` integration handling API interaction, 429 safety paths, and null image results
- [x] **1.2** Vercel AI SDK compliant schema implementation for frame evaluation

---

### Part 1: Backend Architecture (Days 1–2)

_Goal: Split the monolithic scan route into three cache-aware endpoints and register the ReAct agent tools._

#### Task 1: The Cache Memory Manager

_Create a global cache utility to save, flat-index, and retrieve parsed Figma trees on the server._

- [ ] **1.1** Create `src/lib/figma/cache.ts`.
- [ ] **1.2** Declare a global singleton `Map` instance to hold tree nodes indexed by `fileKey`.
- [ ] **1.3** Write a tree-flattening helper function that walks a deeply nested Figma node structure and builds a flat `Map<string, FigmaNode>` for O(1) property lookup by `nodeId`.
- [ ] **1.4** Export two core functions: `saveTreeToCache(fileKey, rawData)` (which flattens and caches the nodes) and `getTreeFromCache(fileKey)` (which retrieves the map index).

#### Task 2: Endpoint 1 — Ingestion (`POST /api/agent/init`)

_This route takes the user's raw Figma URL, parses it, and primes the server cache._

- [ ] **2.1** Create `src/app/api/agent/init/route.ts`.
- [ ] **2.2** Extract the incoming `url` parameter from the request JSON body.
- [ ] **2.3** Call the existing `parseFigmaUrl(url)` utility to isolate the `fileKey` and `nodeId`.
- [ ] **2.4** Invoke `fetchFigmaTree(fileKey)` to pull the data from Figma (or mock files) and run `saveTreeToCache` to populate the flat index.
- [ ] **2.5** Return a 200 OK JSON object containing `fileKey`, `nodeId`, and a success validation boolean.

#### Task 3: Endpoint 2 — Structural Linters (`POST /api/agent/audit`)

_This route calculates the numerical metrics based on the user's design density profile choice._

- [ ] **3.1** Create `src/app/api/agent/audit/route.ts`.
- [ ] **3.2** Accept `fileKey` and `layoutProfile` (`"dashboard"` or `"landing"`) from the body payload.
- [ ] **3.3** Retrieve the flat tree node map from the cache helper using `fileKey`. If empty, throw a 400 Cache Miss error.
- [ ] **3.4** Feed the nodes into the 8 existing TypeScript deterministic audit functions, passing the user's density configuration string down to adjust math boundaries.
- [ ] **3.5** Compute the `readinessScore` and return a standard JSON payload: `{ readinessScore: number, findings: Finding[] }`.

#### Task 4: ReAct Agent Tool Registration (Revised for Single-File RAG)

_Program the execution tools that Gemini invokes during the multi-turn vision loop. Task 4.1 builds the node inspection tool; Task 4.2 builds a standalone search utility that extracts relevant guidelines directly from a user's GitHub markdown file._

**`inspect_node_properties` — Cache Lookup Tool**

- [x] **4.1.1** Create a fresh file for your inspection tool at `src/lib/agent/tools/inspect-node.ts`. Configure its Vercel AI SDK wrapper primitive with a strict schema that requires the model to supply a specific target node ID string.
- [x] **4.1.2** Write the properties extraction script inside the execution block. Program it to fetch the target node ID from your server-side map index cache (built in Task 1). Use JavaScript object destructuring to completely extract and remove the nested children arrays, returning only the shallow layout properties (padding, width, height) to safeguard the AI's token context window.

**`search_layout_guidelines` — Single-File RAG Pipeline**

- [x] **4.2.1** Create a fresh file for your RAG engine at `src/lib/agent/tools/search-guidelines.ts`. Configure its schema blocks to require two distinct parameters from the model: an open keyword search query string and a unified remote `designManualUrl` string.
- [x] **4.2.2** Program the ingestion layer. Implement an asynchronous HTTP network request that targets the raw markdown URL supplied by the model arguments to pull down the entire unstructured design manual text asset into server memory.
- [x] **4.2.3** Implement the chunking tokenizer. Write a string utility to split the downloaded markdown text into distinct text blocks using double-newline paragraph breaks. Run a filter mapping pass across these text blocks to strip out short noise lines, table-of-contents lists, and empty syntax characters shorter than 30 characters.
- [x] **4.2.4** Build the keyword ranking logic. Program an intersection check that tokenizes both the AI's inquiry and each individual paragraph block into clean, lowercase alphanumeric word arrays. Calculate an absolute relevance score for every paragraph based on the count of exact keyword overlaps found between the search words and the chunk tokens.
- [x] **4.2.5** Assemble the final retrieval payload. Sort the scored paragraphs by highest keyword relevance, isolate the top 3 matching chunks, join them with a distinct separator line, and return this condensed layout guideline context block back to the running Gemini session.

#### Task 5: Endpoint 3 — ReAct Vision Engine (`POST /api/agent/vision`)

_This route boots the autonomous vision loop and returns structured JSON to the client._

- [ ] **5.1** Create `src/app/api/agent/vision/route.ts`.
- [ ] **5.2** Read `fileKey`, `nodeId`, `imageUrl`, and optional custom guide configurations from the request payload.
- [ ] **5.3** Initialize the Vercel AI SDK `generateText` engine using `google('gemini-2.5-flash')`.
- [ ] **5.4** Set `maxSteps: 5` and bind `inspect_node_properties` and `search_layout_guidelines` tools inside the config object.
- [ ] **5.5** Attach the screenshot PNG and audit context to the initial message array so Gemini can begin Turn 1 visual inspection.
- [ ] **5.6** On loop termination, extract the final structured output matching your Zod schema and return clean JSON to the UI.

#### Task 6: Terminal Verification Run

_Verify the entire backend state cycle manually without a frontend browser._

- [ ] **6.1** Start the Next.js local server (`pnpm dev`).
- [ ] **6.2** Execute 3 sequential curl commands or run a local node test script to trace that the endpoints read/write to the server cache correctly and return valid structured JSON from the vision route.

---

### Part 2: Frontend Dashboard (Days 3–5)

_Goal: Map UI state onto the split-screen wizard dashboard once the backend endpoint chain is locked._

#### Task 7: The Master Wizard State Machine

_Set up the central client-side control center to drive the wizard workflow step-by-step._

- [ ] **7.1** Open the main dashboard interface workspace page (`src/app/scan/page.tsx` or similar layout component).
- [ ] **7.2** Declare Option B state tracking primitives:
  - `wizardStep: 1 | 2 | 3 | 4` (default `1`)
  - `fileKey: string` (default `""`)
  - `scanData: ScanAuditResult | null` (populated after Step 2)
  - `visionResults: VisionCritique | null` (populated after Step 4)

#### Task 8: Right Panel — The Interactive Agent Control Box

_Build out the wizard's UI forms, action buttons, and investigation results display._

- [ ] **8.1** Set up a split-panel grid structure (`grid grid-cols-1 lg:grid-cols-2`). Dedicate the right side to the Agent Control Box.
- [ ] **8.2** Render Step 1 UI: Display the Figma URL input field. On submission, hit `/api/agent/init`, save the returned `fileKey`, and call `setWizardStep(2)`.
- [ ] **8.3** Render Step 2 UI: Hide the URL input and render two big selection cards: **[Dashboard View]** and **[Landing Page View]**. On click, hit `/api/agent/audit` with the selected profile, save the findings payload to state, and call `setWizardStep(3)`.
- [ ] **8.4** Render Step 3 UI: Render an optional text field for custom GitHub Markdown URLs and a primary button labeled **[Launch Vision Agent Investigation]**. On click, advance to step 4 and fire `POST /api/agent/vision`.
- [ ] **8.5** Render Step 4 UI: Show a loading state while the ReAct loop runs server-side, then render the structured violations and codegen suggestions from the JSON response.

#### Task 9: Vision Results Panel

_Display the agent's final structured output and tie findings back to the audit table._

- [ ] **9.1** Parse the vision route JSON response against the Zod schema shape (`violations`, `suggestions`, or equivalent fields).
- [ ] **9.2** Render each violation with its cited `nodeId`, perceptual description, and codegen prompt suggestion.
- [ ] **9.3** When a vision finding cites a `nodeId` that also appears in `scanData.findings`, highlight that row in the left-panel findings table.

#### Task 10: Left Panel — The Living State Display

_Connect backend data frames to update visual indicators and telemetry cards automatically._

- [ ] **10.1** Connect the left panel metrics scoreboard, readiness meter gauges, and finding tables directly to the `scanData` React state variable populated during Step 2.
- [ ] **10.2** After vision results arrive, cross-reference cited `nodeId` values between `scanData` and `visionResults` to show which structural and perceptual issues overlap.

#### Task 11: Final E2E Calibration & Review Run

_Run through the complete application chain using a pre-tested layout frame target profile to prepare for the project presentation._

- [ ] **11.1** Trigger the entire pipeline end-to-end. Confirm that the cache transfers context across wizard steps, the ReAct loop completes within `maxSteps: 5`, and the UI renders the structured JSON response without page crashes or layout stuttering.

---

### Phase 8 — AgentMark Observability Foundation (DEFERRED)

_Goal: Integrate AgentMark to capture execution traces, version prompts, and monitor cost/latency — to be wired after the agentic endpoint chain is stable._

- [ ] **8.1** Install and initialize AgentMark within the project workspace (`pnpm add agentmark`).
- [ ] **8.2** Build the file infrastructure layout for prompts: create `src/prompts/handoff-investigator.prompt.mdx`.
- [ ] **8.3** Migrate system instructions and core prompt blocks out of static TypeScript files and into the `.prompt.mdx` layout to separate AI prompts from application logic.
- [ ] **8.4** Connect the telemetry logger inside `src/app/api/agent/vision/route.ts` to output local JSONL trace arrays during development passes.
