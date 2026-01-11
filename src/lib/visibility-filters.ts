export const VISIBILITY_FILTER_OPTIONS = ["all", "public-only", "private-only"] as const;
export type VisibilityFilter = (typeof VISIBILITY_FILTER_OPTIONS)[number];

export const DEFAULT_VISIBILITY_FILTER: VisibilityFilter = "all";

export const isVisibilityFilter = (value: unknown): value is VisibilityFilter => {
  return typeof value === "string" && VISIBILITY_FILTER_OPTIONS.includes(value as VisibilityFilter);
};

export const getVisibilityFilterLabel = (filter: VisibilityFilter): string => {
  switch (filter) {
    case "all":
      return "All Repos";
    case "public-only":
      return "Public Only";
    case "private-only":
      return "Private Only";
    default:
      return "All Repos";
  }
};
