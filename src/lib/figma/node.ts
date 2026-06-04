/** Figma constraint axis values for a node inside a frame. */
export interface FigmaConstraints {
  horizontal: "LEFT" | "RIGHT" | "CENTER" | "LEFT_RIGHT" | "SCALE";
  vertical: "TOP" | "BOTTOM" | "CENTER" | "TOP_BOTTOM" | "SCALE";
}

/** A single export-settings entry attached to a node. */
export interface FigmaExportSetting {
  format: "PNG" | "JPG" | "SVG" | "PDF";
  suffix?: string;
  constraint?: {
    type: "SCALE" | "WIDTH" | "HEIGHT";
    value: number;
  };
}

/** Figma REST color in 0–1 RGBA range. */
export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Single paint entry from a node's `fills` array. */
export interface FigmaPaint {
  type: string;
  color?: FigmaColor;
  /** Absent or true when visible. */
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
}

/** Text style properties relevant for contrast/typography audits. */
export interface FigmaTypeStyle {
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
}

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
  /** Gap between children in auto-layout frames. */
  itemSpacing?: number;
  /** Internal padding (auto-layout frames). */
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  /** Paint fills (foreground for shapes/text, background for frames). */
  fills?: FigmaPaint[];
  /** Text style (only on TEXT nodes). */
  style?: FigmaTypeStyle;
  /** Raw text content (only on TEXT nodes). */
  characters?: string;
  /** How this node is pinned/scaled relative to its parent frame. */
  constraints?: FigmaConstraints;
  /** Export configurations attached to this node in Figma. */
  exportSettings?: FigmaExportSetting[];
  /** Component master ID — present on INSTANCE nodes. */
  componentId?: string;
}
