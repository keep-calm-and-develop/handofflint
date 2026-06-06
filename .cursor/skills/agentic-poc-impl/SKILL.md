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
- [ ] Task 3: Endpoint 2 — Structural Linters POST /api/agent/audit
- [ ] Task 4: ReAct Agent Tool Registration (inspect-node + search-guidelines)
- [ ] Task 5: Endpoint 3 — ReAct Vision Engine POST /api/agent/vision
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
| `src/lib/figma/cache.ts` | Global singleton cache: `indexFigmaTreeNodes(fileKey, data)`, `getTreeFromCache(fileKey)`, `getIndexedNode(fileKey, nodeId)` |
| `src/lib/figma/client.ts` | `fetchFigmaTree(fileKey, nodeId)` — fetches from Figma API with cache-aware logic |
| `src/lib/figma/url.ts` | `parseFigmaUrl(url)` — extracts `fileKey` and `nodeId` from Figma URLs |
| `src/lib/figma/fetch.ts` | `figmaFetch()`, `parseFigmaResponse()`, `FigmaApiError` class |
| `src/lib/figma/tree.ts` | `extractFigmaDocuments()`, `walkFigmaTree()`, `isFigmaNode()` |
| `src/lib/figma/node.ts` | `FigmaNode` type definition |
| `src/app/api/scan/route.ts` | Original monolithic scan endpoint (reference for error handling patterns) |
| `src/lib/api/scan.ts` | Client-side fetch wrapper for `/api/scan` |
| `src/app/api/agent/init/route.ts` | Ingestion endpoint — parses URL, fetches tree, primes flat-index cache |
| `src/app/api/agent/init/route.test.ts` | 8 tests covering input validation, mock flow, cache verification, error handling |
| `src/lib/types.ts` | Includes `AgentInitResponse`, `AgentErrorResponse` (shared across agent endpoints) |

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

**Key decisions**:
- Return 400 Cache Miss if `getTreeFromCache` returns null
- Reuse existing `runAllAudits()`, `computeReadinessScore()`, `sortFindingsBySeverity()`

### Task 5: POST /api/agent/vision

**Route**: `src/app/api/agent/vision/route.ts`

**Flow**: Parse body `{ fileKey, nodeId, imageUrl, customGuides? }` → validate cache → `generateText()` with tools → return structured JSON

## Self-Update Protocol

**After completing any task**, update the Task Progress Tracker in this file:
1. Change `[ ]` to `[x]` for the completed task
2. Add any new files created to the Codebase Map
3. Add implementation notes under the task's guide section if decisions were made that affect downstream tasks
