# React patterns and trade-offs (HandOffLint)

Reference for the [consultation gate](SKILL.md#consultation-gate). Use selectively — not every task needs every pattern.

## Data fetching

| Pattern | Best for | Trade-offs |
|---------|----------|------------|
| **Custom hook + `lib/api/`** | HandOffLint today — few endpoints, full control | You own caching, deduping, retries; matches `use-scan.ts` |
| **TanStack Query (React Query)** | Server state with cache, invalidation, background refetch | Bundle + learning curve; less boilerplate for complex async |
| **SWR** | Read-heavy data, simple cache | Mutations less ergonomic than TanStack Query |
| **Server Components + route handlers** | Data on server via `app/api/` | Client hooks only for interactive islands; scan flow is client-triggered today |
| **Loader/router data APIs** | Route-level data tied to navigation | Couples data to router; not used in HandOffLint yet |

**Decision hints for this repo:**
- Scan-on-submit and Figma URL validation → custom hooks + `lib/api/scan.ts` (current pattern).
- Same endpoint consumed in multiple components → shared hook with cache or query library.
- User asked to avoid new dependencies → custom hook + abort + normalized errors.

## State location

| Pattern | Best for | Trade-offs |
|---------|----------|------------|
| **Local `useState`** | UI-only, single component | Simple; prop drilling if lifted too late |
| **Lifted state via container** | Siblings under `ScanDashboard` | Current pattern; keep state blobs small |
| **Context** | Stable, infrequently changing shared config | Every consumer re-renders on any value change unless split |
| **External store (Zustand, Jotai, Redux)** | Cross-route client state | Setup cost; avoid for server/scan data |
| **URL/search params** | Shareable filters, tabs | Good for bookmarkable scan URLs later |

## Component composition

| Pattern | Best for | Trade-offs |
|---------|----------|------------|
| **Container / presentational** | `ScanDashboard` + leaf components | More files; clear data boundary — repo standard |
| **Compound components** | Flexible kits (tabs, accordion) | Implicit context contract |
| **Headless hook + markup** | Reusable behavior, project-specific UI | Matches `use-figma-url` + `ScanForm` split |

## Forms

| Pattern | Best for | Trade-offs |
|---------|----------|------------|
| **Controlled inputs + hook** | HandOffLint scan form (single URL field) | Current pattern in `use-scan-form.ts` |
| **React Hook Form + Zod** | Medium/large forms, schema validation | Dependency; overkill for one field today |

Keep Figma URL validation in `lib/figma/url.ts`; hooks consume parsed results.

## Performance

| Technique | When it helps | When it hurts |
|-----------|---------------|---------------|
| **`useMemo` / `useCallback`** | URL validation derivation; stable setters | Cheap ops; adds noise |
| **`React.memo`** | `FindingRow` in findings lists | Props still change every render |
| **Virtualization** | Very long findings lists | Layout complexity; likely unnecessary at current scale |
| **Code splitting** | Heavy debug panels (`FigmaApiJson`) | Loading states for rarely opened UI |

## Effects vs alternatives

| Need | Prefer | Avoid |
|------|--------|-------|
| Compute validation from URL | `useMemo` in `use-figma-url` | `useEffect` + `setState` |
| Fetch on submit | Event handler in `use-scan-form` | Effect watching a trigger flag |
| Fetch on param change | Hook with stable deps + abort | Effect with unstable object dep |
| Subscribe to external store | `useSyncExternalStore` or library | Manual subscribe without cleanup |

## Error handling layers

1. **Transport hook** (`use-scan.ts`) — catch, normalize, expose `error`.
2. **Feature boundary** — `ScanErrorAlert` for user-facing messages.
3. **Route boundary** — `error.tsx` for unexpected throws.

Do not duplicate user-facing messages at every layer.

## File organization (HandOffLint)

```
src/
  components/scan/     # UI components (presentational + ScanDashboard container)
  hooks/               # use-figma-url.ts, use-scan.ts, use-scan-form.ts, …
  lib/
    api/               # Client fetch wrappers
    audit/             # Domain audit rules
    figma/             # Figma parsing and tree helpers
  app/
    api/scan/          # Server route handler
    page.tsx           # Server page; imports client dashboard
```

Never introduce a new folder convention unless the task spans a new feature area and no precedent exists.
