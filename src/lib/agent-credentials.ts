export const FIGMA_ACCESS_TOKEN_HEADER = "X-Figma-Access-Token";
export const GOOGLE_GENERATIVE_AI_API_KEY_HEADER =
  "X-Google-Generative-Ai-Api-Key";

export interface AgentCredentials {
  figmaAccessToken: string;
  googleGenerativeAiApiKey: string;
}

export function hasAgentCredentials(
  credentials: AgentCredentials | null | undefined,
): credentials is AgentCredentials {
  return Boolean(
    credentials?.figmaAccessToken.trim() &&
      credentials?.googleGenerativeAiApiKey.trim(),
  );
}
