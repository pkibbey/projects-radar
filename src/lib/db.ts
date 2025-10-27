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
    
    // Create table for fetched repositories list
    db.exec(`
      CREATE TABLE IF NOT EXISTS fetched_repos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner TEXT NOT NULL,
        repo TEXT NOT NULL,
        displayName TEXT,
        ownerUsername TEXT,
        isOwnedByUser INTEGER DEFAULT 0,
        isFork INTEGER DEFAULT 0,
        fetchedAt TEXT NOT NULL,
        UNIQUE(owner, repo)
      )
    `);

    // Create table for processing status tracking
    db.exec(`
      CREATE TABLE IF NOT EXISTS repo_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        statusUpdatedAt TEXT NOT NULL,
        startedAt TEXT,
        completedAt TEXT,
        errorMessage TEXT,
        FOREIGN KEY(key) REFERENCES repos(key) ON DELETE CASCADE
      )
    `);

    // Create index on key and status for faster lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_repo_status_key ON repo_status(key)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_repo_status_status ON repo_status(status)`);

    // Create table for tracking hidden repositories
    db.exec(`
      CREATE TABLE IF NOT EXISTS hidden_repos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        hiddenAt TEXT NOT NULL
      )
    `);

    // Create index on key for faster lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_hidden_repos_key ON hidden_repos(key)`);

    // Migration: Add ownership columns if they don't exist
    try {
      db.prepare("ALTER TABLE fetched_repos ADD COLUMN ownerUsername TEXT").run();
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      db.prepare("ALTER TABLE fetched_repos ADD COLUMN isOwnedByUser INTEGER DEFAULT 0").run();
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      db.prepare("ALTER TABLE fetched_repos ADD COLUMN isFork INTEGER DEFAULT 0").run();
    } catch (e) {
      // Column already exists, ignore
    }
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

export const saveFetchedRepositories = async (repos: Array<{ owner: string; repo: string; displayName: string; isFork: boolean; ownerUsername: string; isOwnedByUser: boolean }>) => {
  const db = getDB();
  
  // Clear existing repos
  db.prepare('DELETE FROM fetched_repos').run();
  
  // Insert new repos
  const stmt = db.prepare(`
    INSERT INTO fetched_repos (owner, repo, displayName, ownerUsername, isOwnedByUser, isFork, fetchedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const fetchedAt = new Date().toISOString();
  for (const repo of repos) {
    stmt.run(repo.owner, repo.repo, repo.displayName, repo.ownerUsername, repo.isOwnedByUser ? 1 : 0, repo.isFork ? 1 : 0, fetchedAt);
  }
  
  // Sync displayName updates to repos table
  await syncFetchedReposToRepos();
};

export const syncFetchedReposToRepos = async () => {
  const db = getDB();
  const fetchedRepos = await getFetchedRepositories();
  
  // Update each repo's displayName in the repos table if it exists
  const updateStmt = db.prepare(`
    UPDATE repos
    SET bundle = json_set(bundle, '$.meta.displayName', ?)
    WHERE key = ?
  `);
  
  for (const fetchedRepo of fetchedRepos) {
    const key = keyFor(fetchedRepo.owner, fetchedRepo.repo);
    
    // Check if this repo exists in repos table
    const existingRepo = await getRepoData(fetchedRepo.owner, fetchedRepo.repo);
    if (existingRepo) {
      updateStmt.run(fetchedRepo.displayName, key);
    }
  }
};

export const getFetchedRepositories = async () => {
  const db = getDB();
  
  const stmt = db.prepare('SELECT owner, repo, displayName, ownerUsername, isOwnedByUser, isFork FROM fetched_repos ORDER BY owner, repo');
  const rows = stmt.all() as Array<{ owner: string; repo: string; displayName: string; ownerUsername: string; isOwnedByUser: number; isFork: number }>;
  
  return rows.map(row => ({
    owner: row.owner,
    repo: row.repo,
    displayName: row.displayName,
    ownerUsername: row.ownerUsername,
    isOwnedByUser: Boolean(row.isOwnedByUser),
    isFork: Boolean(row.isFork),
  }));
};

export type RepoProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type RepoStatusRecord = {
  key: string;
  status: RepoProcessingStatus;
  statusUpdatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
};

export const setRepoStatus = async (
  owner: string,
  repo: string,
  status: RepoProcessingStatus,
  errorMessage?: string | null
) => {
  const db = getDB();
  const key = keyFor(owner, repo);
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO repo_status (key, status, statusUpdatedAt, startedAt, completedAt, errorMessage)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      status = excluded.status,
      statusUpdatedAt = excluded.statusUpdatedAt,
      startedAt = CASE WHEN excluded.status = 'processing' THEN excluded.startedAt ELSE startedAt END,
      completedAt = CASE WHEN excluded.status IN ('completed', 'failed') THEN excluded.completedAt ELSE completedAt END,
      errorMessage = excluded.errorMessage
  `);
  
  stmt.run(
    key,
    status,
    now,
    status === 'processing' ? now : null,
    status === 'completed' || status === 'failed' ? now : null,
    errorMessage ?? null
  );
};

export const getRepoStatus = async (owner: string, repo: string): Promise<RepoStatusRecord | null> => {
  const db = getDB();
  const key = keyFor(owner, repo);
  
  const stmt = db.prepare('SELECT * FROM repo_status WHERE key = ?');
  const row = stmt.get(key) as any;
  
  if (!row) return null;
  
  return {
    key: row.key,
    status: row.status,
    statusUpdatedAt: row.statusUpdatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
  };
};

export const getReposByStatus = async (status: RepoProcessingStatus): Promise<RepoStatusRecord[]> => {
  const db = getDB();
  
  const stmt = db.prepare('SELECT * FROM repo_status WHERE status = ? ORDER BY statusUpdatedAt DESC');
  const rows = stmt.all(status) as any[];
  
  return rows.map(row => ({
    key: row.key,
    status: row.status,
    statusUpdatedAt: row.statusUpdatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
  }));
};

export const getReposByStatuses = async (statuses: RepoProcessingStatus[]): Promise<RepoStatusRecord[]> => {
  const db = getDB();
  
  const placeholders = statuses.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM repo_status WHERE status IN (${placeholders}) ORDER BY statusUpdatedAt DESC`);
  const rows = stmt.all(...statuses) as any[];
  
  return rows.map(row => ({
    key: row.key,
    status: row.status,
    statusUpdatedAt: row.statusUpdatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
  }));
};

export const hideRepo = async (owner: string, repo: string): Promise<void> => {
  const db = getDB();
  const key = keyFor(owner, repo);
  const hiddenAt = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO hidden_repos (key, hiddenAt)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET
      hiddenAt = excluded.hiddenAt
  `);
  
  stmt.run(key, hiddenAt);
};

export const unhideRepo = async (owner: string, repo: string): Promise<void> => {
  const db = getDB();
  const key = keyFor(owner, repo);
  
  const stmt = db.prepare('DELETE FROM hidden_repos WHERE key = ?');
  stmt.run(key);
};

export const getHiddenRepos = async (): Promise<string[]> => {
  const db = getDB();
  
  const stmt = db.prepare('SELECT key FROM hidden_repos');
  const rows = stmt.all() as { key: string }[];
  
  return rows.map(row => row.key);
};

export const isRepoHidden = async (owner: string, repo: string): Promise<boolean> => {
  const db = getDB();
  const key = keyFor(owner, repo);
  
  const stmt = db.prepare('SELECT 1 FROM hidden_repos WHERE key = ?');
  const row = stmt.get(key) as { 1: number } | undefined;
  
  return Boolean(row);
};

const _db = {
  getRepoData,
  listRepoData,
  upsertRepoData,
  clearRepoData,
  updateRepoSummary,
  updateRepoDescription,
  saveFetchedRepositories,
  syncFetchedReposToRepos,
  getFetchedRepositories,
  setRepoStatus,
  getRepoStatus,
  getReposByStatus,
  getReposByStatuses,
  hideRepo,
  unhideRepo,
  getHiddenRepos,
  isRepoHidden,
};

export default _db;
