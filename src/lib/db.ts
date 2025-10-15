import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { RepositoryBundle } from "@/lib/github";
import type { RepoAnalysis } from "@/lib/ai";

const DATA_DIR = path.resolve(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "repos.db");

const keyFor = (owner: string, repo: string) => `${owner.toLowerCase()}/${repo.toLowerCase()}`;

type StoredValue = {
  bundle: RepositoryBundle;
  analysis: RepoAnalysis | null;
  updatedAt: string;
};

export type RepoRecord = StoredValue & {
  key: string;
  id?: number;
};

let db: Database.Database | null = null;

const getDB = () => {
  if (!db) {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    
    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS repos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        bundle TEXT NOT NULL,
        analysis TEXT,
        updatedAt TEXT NOT NULL
      )
    `);
    
    // Create index on key for faster lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_repos_key ON repos(key)`);
  }
  return db;
};

export const getRepoData = async (owner: string, repo: string) => {
  const db = getDB();
  const key = keyFor(owner, repo);
  
  const stmt = db.prepare('SELECT * FROM repos WHERE key = ?');
  const row = stmt.get(key) as { id: number; key: string; bundle: string; analysis: string | null; updatedAt: string } | undefined;
  
  if (!row) return null;
  
  return {
    key: row.key,
    bundle: JSON.parse(row.bundle),
    analysis: row.analysis ? JSON.parse(row.analysis) : null,
    updatedAt: row.updatedAt,
    id: row.id,
  } as RepoRecord;
};

export const listRepoData = async () => {
  const db = getDB();
  
  const stmt = db.prepare('SELECT * FROM repos');
  const rows = stmt.all() as { id: number; key: string; bundle: string; analysis: string | null; updatedAt: string }[];
  
  return rows.map(row => ({
    key: row.key,
    bundle: JSON.parse(row.bundle),
    analysis: row.analysis ? JSON.parse(row.analysis) : null,
    updatedAt: row.updatedAt,
    id: row.id,
  })) as RepoRecord[];
};

export const upsertRepoData = async (
  owner: string,
  repo: string,
  value: { bundle: RepositoryBundle; analysis: RepoAnalysis | null },
) => {
  const db = getDB();
  const key = keyFor(owner, repo);
  const updatedAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO repos (key, bundle, analysis, updatedAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      bundle = excluded.bundle,
      analysis = excluded.analysis,
      updatedAt = excluded.updatedAt
  `);
  
  stmt.run(
    key,
    JSON.stringify(value.bundle),
    value.analysis ? JSON.stringify(value.analysis) : null,
    updatedAt
  );
  
  return getRepoData(owner, repo);
};

export const clearRepoData = async (owner: string, repo: string) => {
  const db = getDB();
  const key = keyFor(owner, repo);
  
  const stmt = db.prepare('DELETE FROM repos WHERE key = ?');
  stmt.run(key);
};

const _db = {
  getRepoData,
  listRepoData,
  upsertRepoData,
  clearRepoData,
};

export default _db;
