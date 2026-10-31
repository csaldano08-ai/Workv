/**
 * Interfaccia minima del database. In app è implementata con expo-sqlite,
 * nei test con node:sqlite: stessi SQL, stesse migrazioni.
 * Tutte le query usano parametri posizionali (`?`), mai concatenazione di valori.
 */
export type SqlValue = string | number | null;

export interface Db {
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  exec(sql: string): Promise<void>;
  /** Esegue `fn` in una transazione atomica: tutto o niente. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

export class DatabaseError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}
