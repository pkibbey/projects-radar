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

type RepoRecord = StoredValue & {
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
        isPrivate INTEGER DEFAULT 0,
        fetchedAt TEXT NOT NULL,
        UNIQUE(owner, repo)
      )
    `);

    // Create table for processing status tracking
    db.exec(`
      CREATE TABLE IF NOT EXISTS repo_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        functionType TEXT NOT NULL DEFAULT 'analyze',
        status TEXT NOT NULL DEFAULT 'pending',
        statusUpdatedAt TEXT NOT NULL,
        startedAt TEXT,
        completedAt TEXT,
        errorMessage TEXT,
        UNIQUE(key, functionType),
        FOREIGN KEY(key) REFERENCES repos(key) ON DELETE CASCADE
      )
    `);

    // Create index on key and status for faster lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_repo_status_key ON repo_status(key)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_repo_status_status ON repo_status(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_repo_status_function ON repo_status(functionType)`);

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

    // Create table for project learnings
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_learnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        problem TEXT,
        architecture TEXT,
        keyLearnings TEXT,
        lessonsForImprovement TEXT,
        skillsUsed TEXT,
        timeInvested TEXT,
        statusReason TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY(key) REFERENCES repos(key) ON DELETE CASCADE
      )
    `);

    // Create index on key for faster lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_project_learnings_key ON project_learnings(key)`);

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

    try {
      db.prepare("ALTER TABLE fetched_repos ADD COLUMN isPrivate INTEGER DEFAULT 0").run();
    } catch (e) {
      // Column already exists, ignore
    }

    // Migration: Add functionType column to repo_status if it doesn't exist
    try {
      db.prepare("ALTER TABLE repo_status ADD COLUMN functionType TEXT NOT NULL DEFAULT 'analyze'").run();
    } catch (e) {
      // Column already exists, ignore
    }
  }
  return db;
};

const getRepoData = async (owner: string, repo: string) => {
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

const listRepoData = async () => {
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

const upsertRepoData = async (
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

const clearRepoData = async (owner: string, repo: string) => {
  const db = getDB();
  const key = keyFor(owner, repo);

  const stmt = db.prepare('DELETE FROM repos WHERE key = ?');
  stmt.run(key);
};

const updateRepoSummary = async (
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

const updateRepoDescription = async (
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

const saveFetchedRepositories = async (repos: Array<{ owner: string; repo: string; displayName: string; isFork: boolean; isPrivate: boolean; ownerUsername: string; isOwnedByUser: boolean }>) => {
  const db = getDB();

  // Clear existing repos
  db.prepare('DELETE FROM fetched_repos').run();

  // Insert new repos
  const stmt = db.prepare(`
    INSERT INTO fetched_repos (owner, repo, displayName, ownerUsername, isOwnedByUser, isFork, isPrivate, fetchedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const fetchedAt = new Date().toISOString();
  for (const repo of repos) {
    stmt.run(repo.owner, repo.repo, repo.displayName, repo.ownerUsername, repo.isOwnedByUser ? 1 : 0, repo.isFork ? 1 : 0, repo.isPrivate ? 1 : 0, fetchedAt);
  }

  // Sync displayName updates to repos table
  await syncFetchedReposToRepos();
};

const syncFetchedReposToRepos = async () => {
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

const getFetchedRepositories = async () => {
  const db = getDB();

  const stmt = db.prepare('SELECT owner, repo, displayName, ownerUsername, isOwnedByUser, isFork, isPrivate FROM fetched_repos ORDER BY owner, repo');
  const rows = stmt.all() as Array<{ owner: string; repo: string; displayName: string; ownerUsername: string; isOwnedByUser: number; isFork: number; isPrivate: number }>;

  return rows.map(row => ({
    owner: row.owner,
    repo: row.repo,
    displayName: row.displayName,
    ownerUsername: row.ownerUsername,
    isOwnedByUser: Boolean(row.isOwnedByUser),
    isFork: Boolean(row.isFork),
    isPrivate: Boolean(row.isPrivate),
  }));
};

type RepoProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
type FunctionType = 'analyze' | 'short-description' | 'readme';

export type RepoStatusRecord = {
  key: string;
  functionType: FunctionType;
  status: RepoProcessingStatus;
  statusUpdatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
};

const setRepoStatus = async (
  owner: string,
  repo: string,
  status: RepoProcessingStatus,
  errorMessage?: string | null,
  functionType: FunctionType = 'analyze'
) => {
  const db = getDB();
  const key = keyFor(owner, repo);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO repo_status (key, functionType, status, statusUpdatedAt, startedAt, completedAt, errorMessage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key, functionType) DO UPDATE SET
      status = excluded.status,
      statusUpdatedAt = excluded.statusUpdatedAt,
      startedAt = CASE WHEN excluded.status = 'processing' THEN excluded.startedAt ELSE startedAt END,
      completedAt = CASE WHEN excluded.status IN ('completed', 'failed') THEN excluded.completedAt ELSE completedAt END,
      errorMessage = excluded.errorMessage
  `);

  stmt.run(
    key,
    functionType,
    status,
    now,
    status === 'processing' ? now : null,
    status === 'completed' || status === 'failed' ? now : null,
    errorMessage ?? null
  );
};

const getRepoStatus = async (owner: string, repo: string, functionType: FunctionType = 'analyze'): Promise<RepoStatusRecord | null> => {
  const db = getDB();
  const key = keyFor(owner, repo);

  const stmt = db.prepare('SELECT * FROM repo_status WHERE key = ? AND functionType = ?');
  const row = stmt.get(key, functionType) as any;

  if (!row) return null;

  return {
    key: row.key,
    functionType: row.functionType,
    status: row.status,
    statusUpdatedAt: row.statusUpdatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
  };
};

const getReposByStatus = async (status: RepoProcessingStatus): Promise<RepoStatusRecord[]> => {
  const db = getDB();

  const stmt = db.prepare('SELECT * FROM repo_status WHERE status = ? ORDER BY statusUpdatedAt DESC');
  const rows = stmt.all(status) as any[];

  return rows.map(row => ({
    key: row.key,
    functionType: row.functionType,
    status: row.status,
    statusUpdatedAt: row.statusUpdatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
  }));
};

const getReposByStatuses = async (statuses: RepoProcessingStatus[]): Promise<RepoStatusRecord[]> => {
  const db = getDB();

  const placeholders = statuses.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM repo_status WHERE status IN (${placeholders}) ORDER BY statusUpdatedAt DESC`);
  const rows = stmt.all(...statuses) as any[];

  return rows.map(row => ({
    key: row.key,
    functionType: row.functionType,
    status: row.status,
    statusUpdatedAt: row.statusUpdatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorMessage: row.errorMessage,
  }));
};

const hideRepo = async (owner: string, repo: string): Promise<void> => {
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

const unhideRepo = async (owner: string, repo: string): Promise<void> => {
  const db = getDB();
  const key = keyFor(owner, repo);

  const stmt = db.prepare('DELETE FROM hidden_repos WHERE key = ?');
  stmt.run(key);
};

const getHiddenRepos = async (): Promise<string[]> => {
  const db = getDB();

  const stmt = db.prepare('SELECT key FROM hidden_repos');
  const rows = stmt.all() as { key: string }[];

  return rows.map(row => row.key);
};

const isRepoHidden = async (owner: string, repo: string): Promise<boolean> => {
  const db = getDB();
  const key = keyFor(owner, repo);

  const stmt = db.prepare('SELECT 1 FROM hidden_repos WHERE key = ?');
  const row = stmt.get(key) as { 1: number } | undefined;

  return Boolean(row);
};

/**
 * Get the aggregated status for a repo across all function types.
 * Returns the worst status among all functions, with priority: processing > pending > failed > completed
 */
const getRepoAggregatedStatus = async (owner: string, repo: string): Promise<RepoStatusRecord | null> => {
  const db = getDB();
  const key = keyFor(owner, repo);

  const stmt = db.prepare('SELECT * FROM repo_status WHERE key = ? ORDER BY statusUpdatedAt DESC');
  const rows = stmt.all(key) as any[];

  if (rows.length === 0) return null;

  // Priority order: processing > pending > failed > completed
  const statusPriority: Record<string, number> = {
    'processing': 3,
    'pending': 2,
    'failed': 1,
    'completed': 0,
  };

  // Find the status with highest priority
  const worstStatus = rows.reduce((worst, current) => {
    const currentPriority = statusPriority[current.status] ?? -1;
    const worstPriority = statusPriority[worst.status] ?? -1;
    return currentPriority > worstPriority ? current : worst;
  });

  return {
    key: worstStatus.key,
    functionType: worstStatus.functionType,
    status: worstStatus.status,
    statusUpdatedAt: worstStatus.statusUpdatedAt,
    startedAt: worstStatus.startedAt,
    completedAt: worstStatus.completedAt,
    errorMessage: worstStatus.errorMessage,
  };
};

// ===== Project Learnings =====

export type StatusReason =
  | "learning-complete"
  | "deprioritized"
  | "overcomplicated"
  | "shifted-focus"
  | "on-hold";

export type ProjectLearning = {
  id?: number;
  key: string;
  problem: string | null;
  architecture: string | null;
  keyLearnings: string[]; // JSON array stored as string
  lessonsForImprovement: string[]; // JSON array stored as string
  skillsUsed: string[]; // JSON array stored as string
  timeInvested: string | null;
  statusReason: StatusReason | null;
  createdAt: string;
  updatedAt: string;
};

const getProjectLearning = async (owner: string, repo: string): Promise<ProjectLearning | null> => {
  const db = getDB();
  const key = keyFor(owner, repo);

  const stmt = db.prepare('SELECT * FROM project_learnings WHERE key = ?');
  const row = stmt.get(key) as any;

  if (!row) return null;

  return {
    id: row.id,
    key: row.key,
    problem: row.problem,
    architecture: row.architecture,
    keyLearnings: row.keyLearnings ? JSON.parse(row.keyLearnings) : [],
    lessonsForImprovement: row.lessonsForImprovement ? JSON.parse(row.lessonsForImprovement) : [],
    skillsUsed: row.skillsUsed ? JSON.parse(row.skillsUsed) : [],
    timeInvested: row.timeInvested,
    statusReason: row.statusReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const upsertProjectLearning = async (
  owner: string,
  repo: string,
  learning: Omit<ProjectLearning, 'id' | 'key' | 'createdAt' | 'updatedAt'>
): Promise<ProjectLearning | null> => {
  const db = getDB();
  const key = keyFor(owner, repo);
  const now = new Date().toISOString();

  // Check if learning exists
  const existing = await getProjectLearning(owner, repo);
  const createdAt = existing?.createdAt || now;

  const stmt = db.prepare(`
    INSERT INTO project_learnings (key, problem, architecture, keyLearnings, lessonsForImprovement, skillsUsed, timeInvested, statusReason, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      problem = excluded.problem,
      architecture = excluded.architecture,
      keyLearnings = excluded.keyLearnings,
      lessonsForImprovement = excluded.lessonsForImprovement,
      skillsUsed = excluded.skillsUsed,
      timeInvested = excluded.timeInvested,
      statusReason = excluded.statusReason,
      updatedAt = excluded.updatedAt
  `);

  stmt.run(
    key,
    learning.problem || null,
    learning.architecture || null,
    JSON.stringify(learning.keyLearnings || []),
    JSON.stringify(learning.lessonsForImprovement || []),
    JSON.stringify(learning.skillsUsed || []),
    learning.timeInvested || null,
    learning.statusReason || null,
    createdAt,
    now
  );

  return getProjectLearning(owner, repo);
};

const deleteProjectLearning = async (owner: string, repo: string): Promise<void> => {
  const db = getDB();
  const key = keyFor(owner, repo);

  const stmt = db.prepare('DELETE FROM project_learnings WHERE key = ?');
  stmt.run(key);
};

const listProjectLearnings = async (): Promise<ProjectLearning[]> => {
  const db = getDB();

  const stmt = db.prepare('SELECT * FROM project_learnings ORDER BY updatedAt DESC');
  const rows = stmt.all() as any[];

  return rows.map(row => ({
    id: row.id,
    key: row.key,
    problem: row.problem,
    architecture: row.architecture,
    keyLearnings: row.keyLearnings ? JSON.parse(row.keyLearnings) : [],
    lessonsForImprovement: row.lessonsForImprovement ? JSON.parse(row.lessonsForImprovement) : [],
    skillsUsed: row.skillsUsed ? JSON.parse(row.skillsUsed) : [],
    timeInvested: row.timeInvested,
    statusReason: row.statusReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
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
  getRepoAggregatedStatus,
  hideRepo,
  unhideRepo,
  getHiddenRepos,
  isRepoHidden,
  getProjectLearning,
  upsertProjectLearning,
  deleteProjectLearning,
  listProjectLearnings,
};

export default _db;
