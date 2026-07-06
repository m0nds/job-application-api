import Database from "better-sqlite3"
import path from "path"

const db = new Database(path.join(__dirname, "..", "data", "jobs.db"))

// WAL mode — better performance for concurrent reads
db.pragma("journal_mode = WAL")

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    appliedDate TEXT NOT NULL,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`)

export default db