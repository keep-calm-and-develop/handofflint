/** Minimal Figma REST node shape used by deterministic audits. */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}
