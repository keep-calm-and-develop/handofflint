---
name: agentic-poc-impl
description: >-
  Implement HandOffLint agentic POC backend and frontend tasks from the build
  checklist in handofflint-agentic-poc-spec.md. Use when the user asks to
  implement any Task (1–11) from the agentic architecture spec, mentions
  /api/agent endpoints, wizard pipeline, ReAct vision agent, cache memory
  manager, or references the POC build checklist.
---

# HandOffLint Agentic POC Implementation

## Context

Read `handofflint-agentic-poc-spec.md` at the project root for the full architecture spec before starting any task. The spec defines a wizard pipeline with three API routes (`init`, `audit`, `vision`) backed by a server-side flat-index cache and a ReAct vision agent.

## Task Progress Tracker

Track completed tasks here. **After completing any task, update this section** so future invocations have accurate context.

```
Build Checklist Progress:
- [x] Task 1: Cache Memory Manager (src/lib/figma/cache.ts) — COMPLETED
- [x] Task 2: Endpoint 1 — Ingestion POST /api/agent/init — COMPLETED (src/app/api/agent/init/route.ts)
- [x] Task 3: Endpoint 2 — Structural Linters POST /api/agent/audit — COMPLETED (src/app/api/agent/audit/route.ts)
- [x] Task 4: ReAct Agent Tool Registration — COMPLETED (inspect-node.ts + search-guidelines.ts)
- [x] Task 5: Endpoint 3 — ReAct Vision Engine POST /api/agent/vision — COMPLETED (src/app/api/agent/vision/route.ts)
- [ ] Task 6: Terminal Verification Run
- [ ] Task 7: Master Wizard State Machine (frontend)
- [ ] Task 8: Right Panel — Agent Control Box (frontend)
- [ ] Task 9: Vision Results Panel (frontend)
- [ ] Task 10: Left Panel — Living State Display (frontend)
- [ ] Task 11: Final E2E Calibration
```

## Existing Codebase Map (Key Files)

| File | Purpose |
|------|---------|
| `src/lib/figma/cache.ts` | Global singleton cache: `indexFigmaTreeNodes(fileKey, data)`, `getTreeFromCache(fileKey)`, `getIndexedNode(fileKey, nodeId)`, `getRootNodesFromCache(fileKey)` |
| `src/lib/figma/client.ts` | `fetchFigmaTree(fileKey, nodeId)` — fetches from Figma API with cache-aware logic |
| `src/lib/figma/url.ts` | `parseFigmaUrl(url)` — extracts `fileKey` and `nodeId` from Figma URLs |
| `src/lib/figma/fetch.ts` | `figmaFetch()`, `parseFigmaResponse()`, `FigmaApiError` class |
| `src/lib/figma/tree.ts` | `extractFigmaDocuments()`, `walkFigmaTree()`, `isFigmaNode()` |
| `src/lib/figma/node.ts` | `FigmaNode` type definition |
| `src/app/api/scan/route.ts` | Original monolithic scan endpoint (reference for error handling patterns) |
| `src/lib/api/scan.ts` | Client-side fetch wrapper for `/api/scan` |
| `src/app/api/agent/init/route.ts` | Ingestion endpoint — parses URL, fetches tree, primes flat-index cache |
| `src/app/api/agent/init/route.test.ts` | 8 tests covering input validation, mock flow, cache verification, error handling |
| `src/lib/types.ts` | Includes `AgentInitResponse`, `AgentAuditResponse`, `AgentErrorResponse` (shared across agent endpoints) |
| `src/app/api/agent/audit/route.ts` | Structural linters endpoint — reads cache, runs 8 audits, returns score + findings |
| `src/app/api/agent/audit/route.test.ts` | 9 tests covering input validation, cache miss, happy path, profile defaults, severity ordering |
| `src/lib/agent/tools/inspect-node.ts` | `makeInspectNodeTool(fileKey)` — AI SDK tool wrapper; O(1) cache lookup, strips children, returns shallow layout props |
| `src/lib/agent/tools/search-guidelines.ts` | `makeSearchGuidelinesTool()` — Single-file RAG: fetch markdown → chunk → keyword score → top 3 retrieval |
| `src/lib/agent/tools/search-guidelines.test.ts` | 30 tests: tokenize, chunkMarkdown, scoreChunks, retrieveTopChunks, fetchMarkdownContent, executeSearchGuidelines |
| `src/app/api/agent/vision/route.ts` | Streaming ReAct vision endpoint — `streamText` with `stepCountIs(5)`, layout profile interpolation, `toUIMessageStreamResponse()` |

## Implementation Conventions

1. **Error handling**: Follow the pattern in `src/app/api/scan/route.ts` — catch `FigmaApiError` and return `{ error: string }` with appropriate HTTP status.
2. **Response types**: Define response types in `src/lib/types.ts` or inline; keep them simple for POC.
3. **Cache functions**: The spec says `saveTreeToCache` — this maps to `indexFigmaTreeNodes(fileKey, rawData)` in `cache.ts`. The spec says `getTreeFromCache` — this already exists in `cache.ts`.
4. **Naming**: API routes go in `src/app/api/agent/{endpoint}/route.ts`.
5. **Imports**: Use `@/lib/...` path aliases.

## Per-Task Implementation Guide

### Task 2: POST /api/agent/init

**Route**: `src/app/api/agent/init/route.ts`

**Flow**: Parse body `{ url }` → `parseFigmaUrl(url)` → `fetchFigmaTree(fileKey, nodeId)` → `indexFigmaTreeNodes(fileKey, data)` → respond `{ fileKey, nodeId, success: true }`

**Key decisions (resolved)**:
- Passes `nodeId` from the parsed URL to `fetchFigmaTree` to scope the fetch to the targeted subtree
- Handles `FigmaApiError` for 429/403/404 scenarios, returns error status from Figma directly
- Returns 400 for invalid/missing URL, returns 500 for missing FIGMA_ACCESS_TOKEN
- Uses `AgentErrorResponse` (shared type) for all error responses across agent endpoints
- Old `/api/scan` route left untouched — will be deprecated later

### Task 3: POST /api/agent/audit

**Route**: `src/app/api/agent/audit/route.ts`

**Flow**: Parse body `{ fileKey, layoutProfile }` → `getTreeFromCache(fileKey)` → run audits → compute score → respond `{ readinessScore, findings[] }`

**Key decisions (resolved)**:
- Returns 400 Cache Miss if `getRootNodesFromCache` returns null (init must run first)
- Uses existing `LayoutHandoffProfile` values ("fixed-size", "separate-screens", "flexible-layout") — NOT the spec's "dashboard"/"landing" strings
- Accepts all optional params: `layoutHandoffProfile`, `contrastLevel`, `gridBase`, `exportQuality`
- Added `getRootNodesFromCache(fileKey)` helper to `cache.ts` — tracks root node IDs during indexing, returns `FigmaNode[]` with full child trees for `runAllAudits`
- Response includes `nodesScanned` and `layoutHandoffProfile` for frontend display

### Task 4: ReAct Agent Tool Registration

**Files**: `src/lib/agent/tools/inspect-node.ts`, `src/lib/agent/tools/search-guidelines.ts`

**Sub-task 4.1 — `inspect_node_properties`**:
- AI SDK `tool()` wrapper with Zod schema requiring `nodeId: z.string()`
- Execute block calls `getIndexedNode(fileKey, nodeId)` from `cache.ts`
- Destructure `{ children, ...shallowProps }` to strip nested arrays before returning
- Returns only layout properties (padding, width, height, layoutMode, etc.) to protect token budget

**Sub-task 4.2 — `search_layout_guidelines` (Single-File RAG)**:
- AI SDK `tool()` with schema: `query: z.string()` + `designManualUrl: z.string().url()`
- Execution pipeline: fetch raw markdown → chunk by `\n\n` → filter lines < 30 chars → keyword intersection scoring → return top 3 chunks joined by separator
- Keyword scoring: tokenize query and each chunk into lowercase alphanumeric word arrays, count exact overlaps as relevance score
- No external vector DB — pure in-memory string processing at $0 cost

**Key decisions**:
- `fileKey` for inspect-node is captured via closure from the route handler scope (not a tool parameter — the model only supplies `nodeId`)
- `designManualUrl` is a model-supplied parameter so the agent can target different guideline docs per investigation
- Chunk noise filter threshold: < 30 characters

### Task 5: POST /api/agent/vision (Streaming)

**Route**: `src/app/api/agent/vision/route.ts`

**Flow**: Parse body `{ fileKey, nodeId, imageUrl, layoutProfile, designManualUrl }` → validate cache → `streamText()` with tools → `toUIMessageStreamResponse()`

**Key decisions (resolved)**:
- Uses AI SDK v6 `streamText` (not `generateText`) for real-time chunked streaming
- `stopWhen: stepCountIs(5)` — allows up to 5 investigation turns
- `toUIMessageStreamResponse()` replaces old `toDataStreamResponse()` — returns HTTP 200 with `Transfer-Encoding: chunked` immediately
- `layoutProfile` (VisionLayoutProfile) dynamically interpolated into system prompt to set investigation priorities per screen context
- Available profiles: "dashboard", "landing-page", "mobile-app", "ai-chat", "e-commerce", "form-heavy" — each has a context string in `VISION_PROFILE_CONTEXT`
- `designManualUrl` passed directly in body — injected into user prompt so agent uses it with RAG tool
- No Zod structured output (incompatible with streaming tools in SDK v6) — frontend parses the stream events
- Logs: `stream_start`, `step_finish` (with tool names), `stream_complete` (steps, tokens), `stream_error`

## Self-Update Protocol

**After completing any task**, update the Task Progress Tracker in this file:
1. Change `[ ]` to `[x]` for the completed task
2. Add any new files created to the Codebase Map
3. Add implementation notes under the task's guide section if decisions were made that affect downstream tasks
