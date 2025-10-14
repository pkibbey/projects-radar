declare module "nedb-promises" {
  export type Query<T> = Partial<Record<keyof T, unknown>> & Record<string, unknown>;
  export interface UpdateOptions {
    multi?: boolean;
    upsert?: boolean;
    returnUpdatedDocs?: boolean;
  }
  export interface RemoveOptions {
    multi?: boolean;
  }
  export interface IndexOptions {
    fieldName: string;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
  }
  export interface DatastoreOptions {
    filename?: string;
    inMemoryOnly?: boolean;
    autoload?: boolean;
    timestampData?: boolean;
  }

  export default class Datastore<T = Record<string, unknown>> {
    static create<U = Record<string, unknown>>(options: DatastoreOptions): Datastore<U>;
    constructor(options?: DatastoreOptions);
    loadDatabase(): Promise<void>;
    ensureIndex(options: IndexOptions): Promise<void>;
    findOne<U = T>(query: Query<T>): Promise<U | null>;
    find<U = T>(query: Query<T>): Promise<U[]>;
    insert<U = T>(doc: U): Promise<U>;
    update(query: Query<T>, update: Record<string, unknown>, options?: UpdateOptions): Promise<number>;
    remove(query: Query<T>, options?: RemoveOptions): Promise<number>;
  }
}
