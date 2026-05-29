---
name: react-component-dev
description: >-
  HandOffLint: develop and refactor React components, hooks, and related UI
  files with separation of concerns, render safety, and resilient data fetching.
  Extracts business, UI, and calculation logic into hooks and utilities; scans
  for shared methods; keeps components atomic; prevents infinite useEffect
  loops and unnecessary re-renders; handles API errors in hooks. Use when
  creating, modifying, or refactoring React components (.tsx/.jsx), custom
  hooks (use*.ts/use*.tsx), component folders, or UI-related utilities in
  this repository.
---

# React Component Development (HandOffLint)

Apply this skill **before writing or changing code** when the task touches React components, hooks, or closely related UI files in HandOffLint.

## HandOffLint conventions

Follow existing layout — do not introduce new folder patterns:

| Layer | Location | Examples in repo |
|-------|----------|------------------|
| Presentational UI | `src/components/scan/` | `ScanForm`, `FindingsTable`, `SeverityBadge` |
| Container / wiring | `src/components/scan/` | `ScanDashboard` composes hooks + child components |
| Custom hooks | `src/hooks/` (kebab-case files) | `use-figma-url.ts`, `use-scan.ts`, `use-scan-form.ts` |
| Pure domain / audit logic | `src/lib/` | `lib/audit/`, `lib/figma/`, `lib/readiness-score.ts` |
| Client API wrappers | `src/lib/api/` | `lib/api/scan.ts` |
| Display/view-model helpers | `src/lib/` | `lib/scan-display.ts` |
| Route handlers (server) | `src/app/api/` | `app/api/scan/route.ts` |

- Client components that use hooks: `"use client"` at top of file.
- Import alias: `@/` → `src/`.
- Hooks return typed interfaces (e.g. `UseFigmaUrlReturn`).
- Validation and parsing live in `lib/`; hooks orchestrate state and call `lib/` helpers.
- API fetch logic belongs in hooks (`use-scan.ts`), not in presentational components.
- Error UI: dedicated components like `ScanErrorAlert`; hook exposes `error` string.

## Operating rules

1. **Read first** — Scan target file(s), sibling components under `src/components/scan/`, and hooks under `src/hooks/`. Match naming, file layout, and patterns already in use.
2. **Consult when it matters** — Before implementing non-trivial or ambiguous work, discuss applicable patterns and trade-offs with the developer (see [Consultation gate](#consultation-gate)). Skip the gate for trivial edits (typo, one-line prop rename, copy change).
3. **Separate concerns** — Components render; hooks orchestrate; `lib/` utilities compute. Do not ship mixed responsibilities in one file when extraction is warranted.
4. **Prefer minimal diffs** — Apply these rules without unrelated refactors. Extract only what the current task needs or what duplication clearly demands.

## Consultation gate

Pause and ask the developer **only when the choice affects structure, performance, or maintainability**. Present 2–3 options max, each with a one-line trade-off. Do not lecture; do not block trivial work.

Trigger consultation when any of these apply:

| Situation | Topics to discuss |
|-----------|-------------------|
| New feature with server/async data | Data-fetching pattern (see [patterns.md](patterns.md#data-fetching)) |
| Shared state across distant components | State location (local vs lifted vs context vs external store) |
| Complex form or multi-step flow | Form library vs controlled state; validation location |
| List/table with 50+ rows or heavy cells | Virtualization, memoization scope, row component split |
| Replacing `useEffect` for derived data | Effect vs event handler vs `useMemo` |
| Extracting a hook vs inline logic | Hook granularity and reuse boundary |

**Consultation format** (keep it short):

```markdown
## Approach check

**Goal:** [one sentence]

**Options:**
1. **[Pattern A]** — [benefit] / [cost]
2. **[Pattern B]** — [benefit] / [cost]

**Recommendation:** [pick one with reason tied to this codebase]

Which direction should I take?
```

Proceed without waiting only when the user already specified the approach or the change is trivial.

## Workflow

Copy and track:

```
React task progress:
- [ ] Read target files + nearby hooks/utils
- [ ] Consultation gate (if applicable)
- [ ] Plan extractions (hook / lib util / sub-component)
- [ ] Scan for shared methods to reuse or extract
- [ ] Implement with render + effect safety
- [ ] Verify API error paths in hooks
- [ ] Final checklist
```

### Step 1: Classify logic

| Logic type | Belongs in | HandOffLint examples |
|------------|------------|----------------------|
| Business / domain rules | `lib/` util or hook | Figma URL parsing, audit rules, readiness score |
| UI behavior | `src/hooks/` | form submit wiring, URL field state |
| Pure calculation | `src/lib/` (no React) | formatting findings, score computation |
| Rendering / composition | `src/components/scan/` | JSX, layout, conditional UI shells |

**Hook naming:** kebab-case files (`use-scan.ts`); `useFeatureName` exports; typed return interfaces.

### Step 2: Scan for shared methods

Before adding a function:

1. Search `src/lib/`, `src/hooks/`, and `src/components/` for the same or similar logic.
2. If a util or hook exists → reuse or extend it.
3. If duplicated in 2+ places → extract to the nearest shared module (`lib/`, `hooks/`).
4. Keep utils **pure** (same input → same output, no hooks, no side effects).

Do not create a one-line wrapper hook unless it encapsulates real state or effects.

### Step 3: Keep components atomic

Each component should have **one clear job** in the UI tree.

- `ScanDashboard` wires hooks; leaf components (`ScanForm`, `FindingRow`) receive narrow props.
- Split when a section has its own state, effects, or heavy markup (> ~40–60 lines of JSX/logic combined).
- Colocate small private sub-components in the same file only if not reused and under ~30 lines.
- Props should be narrow — pass data and callbacks, not entire hook return objects unless wiring a container.

### Step 4: `useEffect` safety

Effects are for **synchronizing with external systems**, not for deriving state from other state.

**Never:**
- Set state in an effect that depends on that same state without a stable exit condition
- Use a non-memoized object/array/function in the dependency array when it is recreated every render
- Chain effects where A updates dep of B which updates dep of A

**Prefer instead:**
- Derive with `useMemo` / inline during render (see `use-figma-url.ts` for validation derivation)
- Run logic in event handlers for user actions (see `use-scan-form.ts` submit flow)
- Stabilize callbacks with `useCallback` only when passed to memoized children or listed as effect deps

**Effect checklist:**
- [ ] Dependency array is complete and every dep is stable or intentionally reactive
- [ ] Cleanup function returned when subscribing (listeners, timers, abort controllers)
- [ ] Guard against updates after unmount (abort signal or cancelled flag)
- [ ] No `eslint-disable` for `exhaustive-deps` without a documented reason

```tsx
// Good: abort in-flight fetch on dep change / unmount
useEffect(() => {
  const controller = new AbortController();
  void loadData(id, controller.signal);
  return () => controller.abort();
}, [id]);
```

### Step 5: Avoid unnecessary rendering

Apply in order of impact:

1. **Fix root cause** — Move expensive work out of render (`lib/` utils, `useMemo` for costly pure transforms only).
2. **Stabilize props** — Avoid inline object/array literals and unmemoized callbacks passed to memoized children.
3. **`React.memo`** — On list rows (`FindingRow`) and heavy leaf components with stable props.
4. **Split state** — Do not store unrelated state in one object if updates force large subtree re-renders.
5. **Lazy load** — `React.lazy` for heavy panels not needed on first paint.

Do not blanket-memo everything. Memoize where structure (findings lists) justifies it.

### Step 6: API calls in hooks

All scan/fetch logic lives in hooks like `use-scan.ts`, calling `lib/api/scan.ts` — not in presentational components.

**Required behavior:**

| Concern | Pattern |
|---------|---------|
| Loading | Expose `loading` (match `use-scan.ts`) |
| Success data | Typed return value; narrow public API |
| Errors | Catch, normalize to string; expose `error` |
| User feedback | Hook returns error; component renders `ScanErrorAlert` |
| Retry | Expose retry/refetch when UX needs it |
| Cancellation | `AbortController` on fetch; ignore aborted errors |
| Race conditions | Ignore stale responses (abort or compare latest request) |

```tsx
// Align with use-scan.ts — adapt types to feature
type UseScanReturn = {
  result: ScanResult | null;
  loading: boolean;
  error: string | null;
  runScan: (parsed: ParsedFigmaUrl) => Promise<void>;
};
```

- Do not swallow errors silently.
- Re-throw only when the caller must handle (e.g. mutation with optimistic UI).

## Final checklist

Before marking the task done:

- [ ] Business, UI, and calculation logic are in the right layer (`components/` vs `hooks/` vs `lib/`)
- [ ] No duplicated logic that should be a shared util/hook
- [ ] Components are atomic; files are readable
- [ ] No effect dependency loops or missing cleanups
- [ ] Memoization is purposeful, not defensive noise
- [ ] Async hooks expose loading, error, and recovery; aborted requests do not set error state
- [ ] Matches HandOffLint file structure and kebab-case hook naming
- [ ] Consultation gate was run when applicable, or skipped with reason

## Additional resources

- Design patterns and trade-offs: [patterns.md](patterns.md)
