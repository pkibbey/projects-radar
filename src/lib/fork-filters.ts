export const FORK_FILTER_OPTIONS = ["all", "with-forks", "without-forks"] as const;
export type ForkFilter = (typeof FORK_FILTER_OPTIONS)[number];

export const DEFAULT_FORK_FILTER: ForkFilter = "all";

export const isForkFilter = (value: unknown): value is ForkFilter => {
  return typeof value === "string" && FORK_FILTER_OPTIONS.includes(value as ForkFilter);
};

export const getForkFilterLabel = (filter: ForkFilter): string => {
  switch (filter) {
    case "all":
      return "All Repos";
    case "with-forks":
      return "Forks Only";
    case "without-forks":
      return "Excluding Forks";
    default:
      return "All Repos";
  }
};
