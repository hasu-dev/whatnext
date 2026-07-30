-- Tier-1 signal aggregation. One row per (conference, UTC day, metric);
-- the per-day grid supports both absolute totals and rate-of-change.
CREATE TABLE IF NOT EXISTS counts (
  conf_id TEXT NOT NULL,
  day TEXT NOT NULL, -- UTC YYYY-MM-DD
  metric TEXT NOT NULL, -- view | open | favorite | ics | share
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conf_id, day, metric)
);

-- Zero-result search queries (incl. tag misses) — the coverage backlog.
CREATE TABLE IF NOT EXISTS search_miss (
  query TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (query, day)
);
