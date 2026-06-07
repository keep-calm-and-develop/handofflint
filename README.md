# HandOffLint

**Pre-flight audits for structured design-to-code generation.**

An engineering evaluation workspace built on a multi-turn design verification loop. Check Figma schemas and layouts with zero-cost RAG context, deterministic rule evaluations, and a ReAct vision agent before dev handoff.

| | |
|---|---|
| **Website** | [handofflint.vercel.app](https://handofflint.vercel.app/) |
| **Source code** | [github.com/keep-calm-and-develop/handofflint](https://github.com/keep-calm-and-develop/handofflint) |
| **Architecture overview** | [handofflint.vercel.app/#architecture](https://handofflint.vercel.app/#architecture) |
| **Try the agent** | [handofflint.vercel.app/agent](https://handofflint.vercel.app/agent) |

## Architecture deep dives

Each major pipeline stage has a dedicated walkthrough page on the live site:

| Route | Topic |
|---|---|
| [/react-loop](https://handofflint.vercel.app/react-loop) | ReAct vision agent loop — multi-turn tool calling with Gemini 2.5 Flash |
| [/inspect-node](https://handofflint.vercel.app/inspect-node) | `inspect_node` tool — O(1) flat-index lookup with shallow property stripping |
| [/rag](https://handofflint.vercel.app/rag) | `search_guides` tool — zero-cost keyword RAG over layout guideline markdown |
| [/guardrails](https://handofflint.vercel.app/guardrails) | Cross-modal guardrails — vetting vision findings against structural Figma JSON |

## Figma setup

HandOffLint reads Figma file trees and renders frame images via the [Figma REST API](https://www.figma.com/developers/api). You need two things before running a scan or the agent wizard.

### 1. Create a personal access token

1. Open Figma and go to **Settings** → **Security** → **Personal access tokens** (or visit [Manage personal access tokens](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens) directly).
2. Click **Generate new token**, give it a name (e.g. `handofflint`), and copy the token — it is shown only once.
3. Grant scopes that allow reading file content:
   - **`file_content:read`** — required to fetch node trees and render frames
   - **`file_metadata:read`** — recommended for cache validation via `/meta`

### 2. Enable link sharing on your design file

The token can only access files your Figma account is allowed to read. For files you own:

1. Open the Figma file you want to audit.
2. Click **Share** in the top-right corner.
3. Set link access to **Anyone with the link** → **can view** (or ensure your account has at least view access to the file).
4. Copy the file URL — it should look like:
   `https://www.figma.com/design/YOUR_FILE_KEY/Example?node-id=1-2`

If the file belongs to a team or org, confirm your token's account has view permission on that file; link sharing alone does not grant access to private team files your account cannot open.

## Getting started (local)

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and set server-side variables:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `FIGMA_ACCESS_TOKEN` | Yes (for live Figma) | Personal access token from the steps above |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes (for vision agent) | [Google AI Studio](https://aistudio.google.com/apikey) key for Gemini 2.5 Flash |

Open [http://localhost:3000](http://localhost:3000) for the landing page, or [http://localhost:3000/agent](http://localhost:3000/agent) for the wizard. On the deployed site and in the agent UI you can also paste credentials per session instead of using `.env.local`.

### API routes

The agentic pipeline is orchestrated across three endpoints:

- `POST /api/agent/init` — parse Figma URL, fetch and flatten the node tree
- `POST /api/agent/audit` — run 8 deterministic linter rules, compute Readiness Score
- `POST /api/agent/vision` — ReAct vision loop with `inspect_node` and `search_guides` tools

Legacy single-shot scanning is available at `POST /api/scan`.

## Tech stack

- **Next.js** (App Router) — server routes and wizard UI
- **Vercel AI SDK** + **Gemini 2.5 Flash** — multi-turn vision agent
- **Tailwind CSS** — UI
- **TypeScript** — deterministic audit rules and tool implementations

## License

See [LICENSE](LICENSE).
