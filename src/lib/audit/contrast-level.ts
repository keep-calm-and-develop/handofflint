import {
  CONTRAST_LEVELS,
  DEFAULT_CONTRAST_LEVEL,
  type ContrastLevel,
} from "@/lib/types";

export function parseContrastLevel(value: unknown): ContrastLevel {
  if (
    typeof value === "string" &&
    CONTRAST_LEVELS.includes(value as ContrastLevel)
  ) {
    return value as ContrastLevel;
  }
  return DEFAULT_CONTRAST_LEVEL;
}
