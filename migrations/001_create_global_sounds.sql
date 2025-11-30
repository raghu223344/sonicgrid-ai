-- Create global_sounds table for storing admin sounds
CREATE TABLE IF NOT EXISTS global_sounds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  audio_data BLOB NOT NULL,
  color TEXT DEFAULT '#06b6d4',
  volume REAL DEFAULT 1.0,
  loop INTEGER DEFAULT 0,
  shortcut TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Create index on created_by for faster queries
CREATE INDEX IF NOT EXISTS idx_created_by ON global_sounds(created_by);
