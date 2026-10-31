import type { Db } from './db';

/**
 * Migrazioni versionate tramite `PRAGMA user_version`.
 * Regola: non modificare mai una migrazione già distribuita, aggiungerne una nuova.
 */
export interface Migration {
  version: number;
  description: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Schema iniziale',
    sql: `
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  onboarding_step INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE notification_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  permission_requested INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE weekly_plans (
  id TEXT PRIMARY KEY,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  seed INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE planned_meals (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('colazione','pranzo','cena','spuntino')),
  time_minutes INTEGER NOT NULL CHECK (time_minutes BETWEEN 0 AND 1439),
  recipe_id TEXT NOT NULL,
  servings INTEGER NOT NULL CHECK (servings BETWEEN 1 AND 30),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','cooked','skipped','ate_out','other')),
  source TEXT NOT NULL CHECK (source IN ('auto','manual','repeat')),
  reasons TEXT NOT NULL DEFAULT '[]',
  status_at TEXT,
  UNIQUE (date, meal_type)
);
CREATE INDEX ix_planned_meals_date ON planned_meals(date);
CREATE TABLE meal_history (
  meal_id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  servings INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('cooked','skipped','ate_out','other')),
  created_at TEXT NOT NULL
);
CREATE TABLE pantry_items (
  ingredient_id TEXT PRIMARY KEY,
  staple_present INTEGER NOT NULL DEFAULT 0,
  expiry_date TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE pantry_movements (
  id TEXT PRIMARY KEY,
  ingredient_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('initial','purchase','meal_consumption','manual_add','manual_remove','correction')),
  meal_id TEXT,
  created_at TEXT NOT NULL,
  note TEXT
);
CREATE UNIQUE INDEX ux_pantry_consumption ON pantry_movements(meal_id, ingredient_id) WHERE kind = 'meal_consumption';
CREATE INDEX ix_pantry_movements_ingredient ON pantry_movements(ingredient_id);
CREATE TABLE shopping_trips (
  trip_date TEXT PRIMARY KEY,
  confirmed_at TEXT NOT NULL,
  partial INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE shopping_items (
  trip_date TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  purchased_qty INTEGER,
  purchased_at TEXT,
  PRIMARY KEY (trip_date, ingredient_id)
);
CREATE TABLE favorite_recipes (
  recipe_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
`,
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export async function migrate(db: Db, migrations: Migration[] = MIGRATIONS): Promise<number> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;
  if (current > migrations[migrations.length - 1].version) {
    throw new Error(`Database creato da una versione più recente dell'app (schema ${current}).`);
  }
  for (const m of migrations) {
    if (m.version <= current) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.exec(`PRAGMA user_version = ${m.version}`);
    });
    current = m.version;
  }
  return current;
}
