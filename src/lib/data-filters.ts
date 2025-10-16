export const DATA_FILTERS = ["all", "with-data", "without-data"] as const;

export type DataFilter = (typeof DATA_FILTERS)[number];

export const DEFAULT_DATA_FILTER: DataFilter = "all";

export const DATA_FILTER_LABELS: Record<DataFilter, string> = {
  all: "All projects",
  "with-data": "Active projects",
  "without-data": "Stale projects",
};

export const isDataFilter = (value: unknown): value is DataFilter =>
  typeof value === "string" && DATA_FILTERS.includes(value as DataFilter);
