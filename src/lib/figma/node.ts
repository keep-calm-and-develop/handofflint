/** Minimal Figma REST node shape used by deterministic audits. */
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  /** HORIZONTAL | VERTICAL when auto-layout is on; NONE or absent when manual. */
  layoutMode?: string;
  /** False when the layer is hidden in Figma; absent means visible. */
  visible?: boolean;
}
