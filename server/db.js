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

    -- Kleine Schlüssel/Wert-Ablage für App-Zustand (z. B. zuletzt angewandte ADMIN_EMAIL)
    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

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

    -- Mitgliederprofil (ohne Escort-Leistungen): Profilbild, Alter, Wohnort, Sprachen, Interessen
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_key TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS zip TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS canton TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}';

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

    -- Beiträge auch von Mitgliedern: Autor-Konto (user_id); escort_id nur bei Escort-Beiträgen
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE posts ALTER COLUMN escort_id DROP NOT NULL;
    CREATE INDEX IF NOT EXISTS posts_user_idx ON posts (user_id, id DESC);

    -- Bewertungen von Escorts durch Mitglieder (eine pro Mitglied und Escort)
    CREATE TABLE IF NOT EXISTS escort_reviews (
      id         SERIAL PRIMARY KEY,
      escort_id  INTEGER NOT NULL REFERENCES escorts(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body       TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (escort_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS escort_reviews_escort_idx ON escort_reviews (escort_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS escort_reviews_user_idx ON escort_reviews (user_id, id DESC);

    -- Sitzungen: Erhöhen der Version meldet alle Geräte ab (z. B. nach Passwortänderung)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

    -- Passwort vergessen: nur der Hash des Links wird gespeichert, gültig 1 Stunde, einmal nutzbar
    CREATE TABLE IF NOT EXISTS password_resets (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- E-Mail-Benachrichtigungen (je Art abschaltbar) und Protokoll gegen zu viele E-Mails
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_reviews BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_suggestions BOOLEAN NOT NULL DEFAULT true;
    CREATE TABLE IF NOT EXISTS notify_log (
      id      SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind    TEXT NOT NULL,
      ref     TEXT NOT NULL DEFAULT '',
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS notify_log_lookup_idx ON notify_log (user_id, kind, ref, sent_at DESC);

    -- Meldungen an die Verwaltung (Profile, Beiträge, Kommentare, Bewertungen)
    CREATE TABLE IF NOT EXISTS reports (
      id          SERIAL PRIMARY KEY,
      reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      kind        TEXT NOT NULL,
      target_id   INTEGER NOT NULL,
      reason      TEXT NOT NULL,
      details     TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'open',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ,
      resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS reports_once_idx ON reports (reporter_id, kind, target_id) WHERE status = 'open';

    -- Blockieren: keine Nachrichten, Beiträge, Kommentare oder Bewertungen mehr zwischen beiden
    CREATE TABLE IF NOT EXISTS blocks (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, blocked_id)
    );
    CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks (blocked_id);

    -- Bewertungen von Mitgliedern durch Escorts (eine pro Escort-Konto und Mitglied)
    CREATE TABLE IF NOT EXISTS member_reviews (
      id         SERIAL PRIMARY KEY,
      member_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body       TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (member_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS member_reviews_member_idx ON member_reviews (member_id, id DESC);

    -- Öffentliche Antwort der bewerteten Person auf eine Bewertung
    ALTER TABLE escort_reviews ADD COLUMN IF NOT EXISTS reply TEXT NOT NULL DEFAULT '';
    ALTER TABLE escort_reviews ADD COLUMN IF NOT EXISTS reply_at TIMESTAMPTZ;
    ALTER TABLE member_reviews ADD COLUMN IF NOT EXISTS reply TEXT NOT NULL DEFAULT '';
    ALTER TABLE member_reviews ADD COLUMN IF NOT EXISTS reply_at TIMESTAMPTZ;

    -- Verifizierung: Selfie mit Code, nur für die Verwaltung sichtbar, nach dem Entscheid gelöscht
    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS verify_code TEXT;
    CREATE TABLE IF NOT EXISTS verifications (
      id         SERIAL PRIMARY KEY,
      escort_id  INTEGER NOT NULL REFERENCES escorts(id) ON DELETE CASCADE,
      code       TEXT NOT NULL,
      photo_key  TEXT,
      status     TEXT NOT NULL DEFAULT 'pending',
      reason     TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      decided_at TIMESTAMPTZ,
      decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS verifications_status_idx ON verifications (status, created_at DESC);

    -- Vorschläge: Ereignisse auf Escort-Profilen (wieder aktiv, Standort geändert)
    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS moved_at TIMESTAMPTZ;
    ALTER TABLE escorts ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMPTZ;

    -- Präferenzen der Mitglieder für Vorschläge (nur aktiv, wenn enabled)
    CREATE TABLE IF NOT EXISTS member_prefs (
      user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled    BOOLEAN NOT NULL DEFAULT false,
      city       TEXT NOT NULL DEFAULT '',
      zip        TEXT NOT NULL DEFAULT '',
      canton     TEXT NOT NULL DEFAULT '',
      lat        DOUBLE PRECISION,
      lng        DOUBLE PRECISION,
      radius     INTEGER,
      services   TEXT[] NOT NULL DEFAULT '{}',
      age_min    INTEGER,
      age_max    INTEGER,
      seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
