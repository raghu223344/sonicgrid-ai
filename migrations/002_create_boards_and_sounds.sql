-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  columns INTEGER DEFAULT 4,
  gap INTEGER DEFAULT 4,
  user_id TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Create sounds table
CREATE TABLE IF NOT EXISTS sounds (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  audio_data BLOB,
  color TEXT DEFAULT '#06b6d4',
  volume REAL DEFAULT 1.0,
  loop INTEGER DEFAULT 0,
  shortcut TEXT,
  created_by TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sounds_board_id ON sounds(board_id);
