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

export const updateRepoSummary = async (
  owner: string,
  repo: string,
  summary: string,
) => {
  const db = getDB();
  const key = keyFor(owner, repo);
  
  // Get existing record
  const existing = await getRepoData(owner, repo);
  if (!existing) return null;
  
  // Update the analysis with new summary
  const updatedAnalysis = existing.analysis ? { ...existing.analysis, summary } : null;
  const updatedAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    UPDATE repos
    SET analysis = ?, updatedAt = ?
    WHERE key = ?
  `);
  
  stmt.run(
    updatedAnalysis ? JSON.stringify(updatedAnalysis) : null,
    updatedAt,
    key
  );
  
  return getRepoData(owner, repo);
};

export const updateRepoDescription = async (
  owner: string,
  repo: string,
  description: string,
) => {
  const db = getDB();
  const key = keyFor(owner, repo);
  
  // Get existing record
  const existing = await getRepoData(owner, repo);
  if (!existing) return null;
  
  // Update the bundle meta with new description
  const updatedBundle = {
    ...existing.bundle,
    meta: {
      ...existing.bundle.meta,
      description,
    },
  };
  const updatedAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    UPDATE repos
    SET bundle = ?, updatedAt = ?
    WHERE key = ?
  `);
  
  stmt.run(
    JSON.stringify(updatedBundle),
    updatedAt,
    key
  );
  
  return getRepoData(owner, repo);
};

const _db = {
  getRepoData,
  listRepoData,
  upsertRepoData,
  clearRepoData,
  updateRepoSummary,
  updateRepoDescription,
};

export default _db;
