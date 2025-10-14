export const VIEW_MODES = [
  "list",
  "compact",
  "expanded",
] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_VIEW_MODE: ViewMode = "compact";

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  list: "List",
  compact: "Compact",
  expanded: "Expanded",
};

export function isViewMode(value: string | null | undefined): value is ViewMode {
  return value ? (VIEW_MODES as readonly string[]).includes(value) : false;
}
