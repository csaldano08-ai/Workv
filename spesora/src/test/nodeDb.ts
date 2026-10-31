import { DatabaseSync } from 'node:sqlite';
import type { Db, SqlValue } from '../core/storage/db';

/** Adattatore node:sqlite usato SOLO nei test: stesse query e migrazioni dell'app. */
export function openNodeDb(path = ':memory:'): Db & { close(): void } {
  const raw = new DatabaseSync(path);
  let depth = 0;
  const db: Db & { close(): void } = {
    async run(sql: string, params: SqlValue[] = []) {
      const res = raw.prepare(sql).run(...params);
      return { changes: Number(res.changes) };
    },
    async all<T>(sql: string, params: SqlValue[] = []) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async first<T>(sql: string, params: SqlValue[] = []) {
      return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async exec(sql: string) {
      raw.exec(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      if (depth > 0) return fn(db);
      depth++;
      raw.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(db);
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
    close() {
      raw.close();
    },
  };
  return db;
}
