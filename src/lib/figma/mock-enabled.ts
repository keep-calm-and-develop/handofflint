/** When true, Figma file tree fetches are served by MSW using `example.json`. */
export function isFigmaApiMockEnabled(): boolean {
  const flag = process.env.FIGMA_API_MOCK?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}
