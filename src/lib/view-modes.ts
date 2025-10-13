export const VIEW_MODES = [
  "list",
  "compact",
  "regular",
  "expanded",
  "detailed",
] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_VIEW_MODE: ViewMode = "regular";

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  list: "List",
  compact: "Compact",
  regular: "Regular",
  expanded: "Expanded",
  detailed: "Detailed",
};

export function isViewMode(value: string | null | undefined): value is ViewMode {
  return value ? (VIEW_MODES as readonly string[]).includes(value) : false;
}
