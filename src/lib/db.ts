import fs from "fs";
import path from "path";
import Datastore from "nedb-promises";
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
  _id?: string;
};

let storePromise: Promise<Datastore<RepoRecord>> | null = null;

const getStore = async () => {
  if (!storePromise) {
    storePromise = (async () => {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      const store = Datastore.create<RepoRecord>({
        filename: DB_PATH,
        autoload: true,
        timestampData: true,
      });
      await store.ensureIndex({ fieldName: "key", unique: true });
      return store;
    })();
  }
  return storePromise;
};

export const getRepoData = async (owner: string, repo: string) => {
  const store = await getStore();
  return store.findOne({ key: keyFor(owner, repo) });
};

export const listRepoData = async () => {
  const store = await getStore();
  return store.find({});
};

export const upsertRepoData = async (
  owner: string,
  repo: string,
  value: { bundle: RepositoryBundle; analysis: RepoAnalysis | null },
) => {
  const store = await getStore();
  const key = keyFor(owner, repo);
  const payload: RepoRecord = {
    key,
    bundle: value.bundle,
    analysis: value.analysis,
    updatedAt: new Date().toISOString(),
  };

  await store.update({ key }, { $set: payload }, { upsert: true });
  return store.findOne({ key });
};

export const clearRepoData = async (owner: string, repo: string) => {
  const store = await getStore();
  await store.remove({ key: keyFor(owner, repo) }, { multi: false });
};

const _db = {
  getRepoData,
  listRepoData,
  upsertRepoData,
  clearRepoData,
};

export default _db;
