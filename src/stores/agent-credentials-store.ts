"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { AgentCredentials } from "@/lib/agent-credentials";
import { hasAgentCredentials } from "@/lib/agent-credentials";

let credentials: AgentCredentials | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getAgentCredentials(): AgentCredentials | null {
  return credentials;
}

export function setAgentCredentials(next: AgentCredentials): void {
  credentials = {
    figmaAccessToken: next.figmaAccessToken.trim(),
    googleGenerativeAiApiKey: next.googleGenerativeAiApiKey.trim(),
  };
  emit();
}

export function clearAgentCredentials(): void {
  credentials = null;
  emit();
}

export interface UseAgentCredentialsStoreReturn {
  credentials: AgentCredentials | null;
  isReady: boolean;
  saveCredentials: (next: AgentCredentials) => void;
  clearCredentials: () => void;
}

export function useAgentCredentialsStore(): UseAgentCredentialsStoreReturn {
  const snapshot = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => credentials,
    () => null,
  );

  const saveCredentials = useCallback((next: AgentCredentials) => {
    setAgentCredentials(next);
  }, []);

  const clearCredentials = useCallback(() => {
    clearAgentCredentials();
  }, []);

  return {
    credentials: snapshot,
    isReady: hasAgentCredentials(snapshot),
    saveCredentials,
    clearCredentials,
  };
}
