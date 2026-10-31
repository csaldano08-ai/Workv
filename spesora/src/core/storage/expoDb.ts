import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { DatabaseError, type Db, type SqlValue } from './db';
import { migrate } from './migrations';

export const DB_NAME = 'spesora.db';

function wrap(conn: SQLite.SQLiteDatabase, inTx: boolean): Db {
  const self: Db = {
    async run(sql, params: SqlValue[] = []) {
      const res = await conn.runAsync(sql, params);
      return { changes: res.changes };
    },
    all<T>(sql: string, params: SqlValue[] = []) {
      return conn.getAllAsync<T>(sql, params);
    },
    first<T>(sql: string, params: SqlValue[] = []) {
      return conn.getFirstAsync<T>(sql, params);
    },
    exec(sql) {
      return conn.execAsync(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      if (inTx) return fn(self);
      let result: T | undefined;
      if (Platform.OS === 'web') {
        // Su web le transazioni esclusive non sono supportate: usate solo per anteprime di sviluppo.
        await conn.withTransactionAsync(async () => {
          result = await fn(wrap(conn, true));
        });
      } else {
        // Connessione dedicata: nessuna altra query si intromette nella transazione.
        await conn.withExclusiveTransactionAsync(async (txn) => {
          result = await fn(wrap(txn, true));
        });
      }
      return result as T;
    },
  };
  return self;
}

/** Apre (o crea) il database locale ed esegue le migrazioni. Non cancella mai dati in caso di errore. */
export async function openAppDb(): Promise<Db> {
  try {
    const conn = await SQLite.openDatabaseAsync(DB_NAME);
    await conn.execAsync('PRAGMA journal_mode = WAL;');
    const db = wrap(conn, false);
    await migrate(db);
    return db;
  } catch (e) {
    throw new DatabaseError('Impossibile aprire il database locale', e);
  }
}
