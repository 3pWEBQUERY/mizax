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
    DROP INDEX IF EXISTS escorts_list_idx;
    CREATE INDEX IF NOT EXISTS escorts_newest_idx ON escorts (published, created_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('member', 'escort')),
      locale        TEXT NOT NULL DEFAULT 'de',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login_at TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS zip TEXT NOT NULL DEFAULT '';
    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS canton TEXT NOT NULL DEFAULT '';
    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    CREATE UNIQUE INDEX IF NOT EXISTS escorts_user_idx ON escorts (user_id) WHERE user_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS favorites (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      escort_id  INTEGER NOT NULL REFERENCES escorts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, escort_id)
    );
    CREATE INDEX IF NOT EXISTS favorites_escort_idx ON favorites (escort_id, created_at DESC);

    -- Einstellungen: NULL = Standard der Kontoart (Escorts sichtbar, Mitglieder anonym)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS show_visits BOOLEAN;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';

    -- Statistik: Aufrufe von Escort-Profilen
    CREATE TABLE IF NOT EXISTS profile_views (
      id         BIGSERIAL PRIMARY KEY,
      escort_id  INTEGER NOT NULL REFERENCES escorts(id) ON DELETE CASCADE,
      viewer_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      viewer_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS profile_views_escort_idx ON profile_views (escort_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS profile_views_key_idx ON profile_views (escort_id, viewer_key, created_at DESC);
    CREATE INDEX IF NOT EXISTS profile_views_viewer_idx ON profile_views (viewer_id, created_at DESC);

    -- Statistik: Besuche von Mitgliederprofilen (nur durch angemeldete Escorts)
    CREATE TABLE IF NOT EXISTS member_views (
      id         BIGSERIAL PRIMARY KEY,
      member_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS member_views_member_idx ON member_views (member_id, created_at DESC);

    -- Nachrichten zwischen Mitglied und Escort-Profil
    CREATE TABLE IF NOT EXISTS conversations (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      escort_id       INTEGER NOT NULL REFERENCES escorts(id) ON DELETE CASCADE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, escort_id)
    );
    CREATE INDEX IF NOT EXISTS conversations_escort_idx ON conversations (escort_id, last_message_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id              BIGSERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      body            TEXT NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at         TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages (conversation_id, id);
    CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages (conversation_id) WHERE read_at IS NULL;

    -- Feed der Escorts
    CREATE TABLE IF NOT EXISTS posts (
      id         SERIAL PRIMARY KEY,
      escort_id  INTEGER NOT NULL REFERENCES escorts(id) ON DELETE CASCADE,
      body       TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS posts_newest_idx ON posts (id DESC);
    CREATE INDEX IF NOT EXISTS posts_escort_idx ON posts (escort_id, id DESC);

    CREATE TABLE IF NOT EXISTS post_photos (
      id       SERIAL PRIMARY KEY,
      post_id  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      key      TEXT NOT NULL,
      width    INTEGER,
      height   INTEGER,
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS post_photos_post_idx ON post_photos (post_id, position);

    CREATE TABLE IF NOT EXISTS post_likes (
      post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id         SERIAL PRIMARY KEY,
      post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS post_comments_post_idx ON post_comments (post_id, id);
  `);
}
