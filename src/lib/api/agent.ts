import {
  FIGMA_ACCESS_TOKEN_HEADER,
  GOOGLE_GENERATIVE_AI_API_KEY_HEADER,
  type AgentCredentials,
} from "@/lib/agent-credentials";
import { isAbsoluteHttpUrl } from "@/lib/agent/validate-url";
import type {
  AgentAuditResponse,
  AgentErrorResponse,
  AgentInitResponse,
  LayoutHandoffProfile,
  VisionLayoutProfile,
} from "@/lib/types";

export class AgentApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AgentApiError";
  }
}

const LAYOUT_HANDOFF_PROFILE_BY_VISION_PROFILE: Record<
  VisionLayoutProfile,
  LayoutHandoffProfile
> = {
  dashboard: "separate-screens",
  "landing-page": "flexible-layout",
  "mobile-app": "fixed-size",
  "ai-chat": "separate-screens",
  "e-commerce": "separate-screens",
  "form-heavy": "flexible-layout",
};

async function readAgentErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const data = (await response.json()) as Partial<AgentErrorResponse>;
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Ignore JSON parse errors and fall through to the fallback message.
  }

  return fallbackMessage;
}

function buildAgentHeaders(
  credentials: AgentCredentials,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    [FIGMA_ACCESS_TOKEN_HEADER]: credentials.figmaAccessToken,
    [GOOGLE_GENERATIVE_AI_API_KEY_HEADER]: credentials.googleGenerativeAiApiKey,
  };
}

async function postAgentJson<T>(
  path: string,
  body: unknown,
  fallbackMessage: string,
  credentials: AgentCredentials,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: buildAgentHeaders(credentials),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AgentApiError(
      await readAgentErrorMessage(response, fallbackMessage),
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function mapVisionProfileToHandoff(
  layoutProfile: VisionLayoutProfile,
): LayoutHandoffProfile {
  return LAYOUT_HANDOFF_PROFILE_BY_VISION_PROFILE[layoutProfile];
}

export async function postAgentInit(
  url: string,
  credentials: AgentCredentials,
): Promise<AgentInitResponse> {
  return postAgentJson<AgentInitResponse>(
    "/api/agent/init",
    { url },
    "Agent init failed",
    credentials,
  );
}

export async function postAgentAudit(
  fileKey: string,
  layoutProfile: VisionLayoutProfile,
  credentials: AgentCredentials,
): Promise<AgentAuditResponse> {
  return postAgentJson<AgentAuditResponse>(
    "/api/agent/audit",
    {
      fileKey,
      layoutHandoffProfile: mapVisionProfileToHandoff(layoutProfile),
    },
    "Agent audit failed",
    credentials,
  );
}

export async function postAgentVision(
  body: {
    fileKey: string;
    nodeId: string;
    imageUrl: string;
    layoutProfile: VisionLayoutProfile;
    designManualUrl: string;
  },
  credentials: AgentCredentials,
  options?: { signal?: AbortSignal },
): Promise<Response> {
  if (!isAbsoluteHttpUrl(body.imageUrl)) {
    throw new AgentApiError(
      "imageUrl must be an absolute http(s) URL before calling the vision API",
    );
  }

  if (!isAbsoluteHttpUrl(body.designManualUrl)) {
    throw new AgentApiError(
      "designManualUrl must be an absolute http(s) URL before calling the vision API",
    );
  }

  const response = await fetch("/api/agent/vision", {
    method: "POST",
    headers: buildAgentHeaders(credentials),
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new AgentApiError(
      await readAgentErrorMessage(response, "Agent vision failed"),
      response.status,
    );
  }

  return response;
}
