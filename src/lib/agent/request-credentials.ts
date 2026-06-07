import {
  FIGMA_ACCESS_TOKEN_HEADER,
  GOOGLE_GENERATIVE_AI_API_KEY_HEADER,
} from "@/lib/agent-credentials";

export interface RequestCredentials {
  figmaAccessToken: string | null;
  googleGenerativeAiApiKey: string | null;
}

export function extractRequestCredentials(
  request: Request,
): RequestCredentials {
  const figmaAccessToken =
    request.headers.get(FIGMA_ACCESS_TOKEN_HEADER)?.trim() ||
    process.env.FIGMA_ACCESS_TOKEN?.trim() ||
    null;

  const googleGenerativeAiApiKey =
    request.headers.get(GOOGLE_GENERATIVE_AI_API_KEY_HEADER)?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    null;

  return { figmaAccessToken, googleGenerativeAiApiKey };
}
