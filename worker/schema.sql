CREATE TABLE IF NOT EXISTS conferences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  field TEXT NOT NULL,
  deadline TEXT NOT NULL,
  location TEXT NOT NULL,
  website TEXT,
  weight INTEGER NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0
);
