"use client";

import { useCallback, useState } from "react";

import {
  DEFAULT_LAYOUT_HANDOFF_PROFILE,
  type LayoutHandoffProfile,
} from "@/lib/types";

export interface UseLayoutHandoffProfileReturn {
  profile: LayoutHandoffProfile;
  setProfile: (profile: LayoutHandoffProfile) => void;
}

export function useLayoutHandoffProfile(): UseLayoutHandoffProfileReturn {
  const [profile, setProfileState] = useState<LayoutHandoffProfile>(
    DEFAULT_LAYOUT_HANDOFF_PROFILE,
  );

  const setProfile = useCallback((next: LayoutHandoffProfile) => {
    setProfileState(next);
  }, []);

  return { profile, setProfile };
}
