const DATA_FILTERS = ["all", "with-data", "without-data"] as const;

export type DataFilter = (typeof DATA_FILTERS)[number];

export const DEFAULT_DATA_FILTER: DataFilter = "all";

export const isDataFilter = (value: unknown): value is DataFilter =>
  typeof value === "string" && DATA_FILTERS.includes(value as DataFilter);
