"use client";

import { useState } from "react";

import type { AgentCredentials } from "@/lib/agent-credentials";

const CARD = "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm";
const INPUT =
  "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-figma-blue focus:outline-none focus:ring-2 focus:ring-figma-blue/20";
const CTA =
  "cursor-pointer rounded-xl bg-figma-blue px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-figma-blue/30 transition hover:bg-[#0b87e0] disabled:cursor-not-allowed disabled:opacity-60";

interface AgentCredentialsFormProps {
  onSave: (credentials: AgentCredentials) => void;
}

export function AgentCredentialsForm({ onSave }: AgentCredentialsFormProps) {
  const [figmaAccessToken, setFigmaAccessToken] = useState("");
  const [googleGenerativeAiApiKey, setGoogleGenerativeAiApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={`${CARD} space-y-5 p-5`}>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-figma-blue">
          API Credentials
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">
          Connect Figma and Gemini
        </h2>
        <p className="text-sm text-zinc-600">
          Enter your tokens before running the agent pipeline. Credentials stay
          in memory for this session only and are sent to HandOffLint API routes
          — they are not saved to disk or localStorage.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();

          const trimmedFigmaToken = figmaAccessToken.trim();
          const trimmedGoogleKey = googleGenerativeAiApiKey.trim();

          if (!trimmedFigmaToken) {
            setError("FIGMA_ACCESS_TOKEN is required.");
            return;
          }

          if (!trimmedGoogleKey) {
            setError("GOOGLE_GENERATIVE_AI_API_KEY is required.");
            return;
          }

          setError(null);
          onSave({
            figmaAccessToken: trimmedFigmaToken,
            googleGenerativeAiApiKey: trimmedGoogleKey,
          });
        }}
      >
        <div className="space-y-2">
          <label
            htmlFor="agent-figma-access-token"
            className="text-sm font-medium text-zinc-700"
          >
            FIGMA_ACCESS_TOKEN
          </label>
          <input
            id="agent-figma-access-token"
            type="password"
            autoComplete="off"
            required
            value={figmaAccessToken}
            onChange={(event) => setFigmaAccessToken(event.target.value)}
            placeholder="figd_…"
            className={INPUT}
          />
          <p className="text-xs text-zinc-500">
            Personal access token with file read access for ingestion and frame
            renders.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="agent-google-api-key"
            className="text-sm font-medium text-zinc-700"
          >
            GOOGLE_GENERATIVE_AI_API_KEY
          </label>
          <input
            id="agent-google-api-key"
            type="password"
            autoComplete="off"
            required
            value={googleGenerativeAiApiKey}
            onChange={(event) => setGoogleGenerativeAiApiKey(event.target.value)}
            placeholder="AIza…"
            className={INPUT}
          />
          <p className="text-xs text-zinc-500">
            Google AI Studio key used by the ReAct vision agent stream.
          </p>
        </div>

        <button type="submit" className={CTA}>
          Save Credentials and Continue
        </button>
      </form>
    </div>
  );
}
