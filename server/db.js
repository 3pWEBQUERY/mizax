import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new pg.Pool({
      connectionString,
      max: 10,
      ssl: /sslmode=require/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
    })
  : null;

export function hasDb() {
  return Boolean(pool);
}

export async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL ist nicht gesetzt');
  return pool.query(text, params);
}

export async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS escorts (
      id          SERIAL PRIMARY KEY,
      slug        TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      age         INTEGER NOT NULL CHECK (age >= 18),
      city        TEXT NOT NULL DEFAULT '',
      tagline     TEXT NOT NULL DEFAULT '',
      bio         TEXT NOT NULL DEFAULT '',
      height      INTEGER,
      nationality TEXT NOT NULL DEFAULT '',
      languages   TEXT[] NOT NULL DEFAULT '{}',
      services    TEXT[] NOT NULL DEFAULT '{}',
      rates       JSONB NOT NULL DEFAULT '[]',
      phone       TEXT NOT NULL DEFAULT '',
      whatsapp    TEXT NOT NULL DEFAULT '',
      email       TEXT NOT NULL DEFAULT '',
      accent      TEXT NOT NULL DEFAULT '#6d4aff',
      verified    BOOLEAN NOT NULL DEFAULT false,
      available   BOOLEAN NOT NULL DEFAULT true,
      featured    BOOLEAN NOT NULL DEFAULT false,
      published   BOOLEAN NOT NULL DEFAULT true,
      sort        INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS escort_photos (
      id         SERIAL PRIMARY KEY,
      escort_id  INTEGER NOT NULL REFERENCES escorts(id) ON DELETE CASCADE,
      key        TEXT NOT NULL,
      width      INTEGER,
      height     INTEGER,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS escort_photos_escort_idx ON escort_photos (escort_id, position);
    CREATE INDEX IF NOT EXISTS escorts_list_idx ON escorts (published, featured DESC, sort, created_at DESC);
  `);
}
