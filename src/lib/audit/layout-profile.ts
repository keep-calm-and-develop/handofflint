import {
  DEFAULT_LAYOUT_HANDOFF_PROFILE,
  LAYOUT_HANDOFF_PROFILES,
  type LayoutHandoffProfile,
} from "@/lib/types";

export function parseLayoutHandoffProfile(
  value: unknown,
): LayoutHandoffProfile {
  if (
    typeof value === "string" &&
    LAYOUT_HANDOFF_PROFILES.includes(value as LayoutHandoffProfile)
  ) {
    return value as LayoutHandoffProfile;
  }
  return DEFAULT_LAYOUT_HANDOFF_PROFILE;
}
