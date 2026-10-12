import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// Startet den echten Server gegen eine leere Test-Datenbank (TEST_DATABASE_URL).
// Ohne TEST_DATABASE_URL werden die API-Tests übersprungen.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DB_URL = process.env.TEST_DATABASE_URL;
export const ADMIN = { email: 'admin@test.local', password: 'admin-test-123' };

async function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// Alle Tabellen leeren, damit jeder Lauf gleich startet
export async function resetDb() {
  // Schutz: nur Datenbanken mit „test“ im Namen werden geleert
  const name = new URL(DB_URL).pathname.slice(1);
  if (!/test/i.test(name)) throw new Error(`TEST_DATABASE_URL muss auf eine Test-Datenbank zeigen (ist: ${name})`);
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.end();
}

export async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      PORT: String(port),
      SESSION_SECRET: 'test-secret',
      ADMIN_EMAIL: ADMIN.email,
      ADMIN_PASSWORD: ADMIN.password,
      SEED_DEMO: 'false',
      NODE_ENV: 'test',
      // kein Bucket, kein E-Mail-Versand in Tests
      BUCKET: '',
      SMTP_HOST: '',
      RESEND_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return { base, stop: () => child.kill(), log: () => log };
    } catch {
      /* startet noch */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  child.kill();
  throw new Error(`Server startet nicht:\n${log}`);
}

// Kleiner Client mit eigenem Sitzungs-Cookie
export function client(base) {
  let cookie = '';
  async function call(method, url, body) {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data, headers: res.headers };
  }
  return {
    get: (u) => call('GET', u),
    post: (u, b) => call('POST', u, b || {}),
    put: (u, b) => call('PUT', u, b || {}),
    del: (u) => call('DELETE', u),
    cookie: () => cookie,
  };
}

export async function register(base, { email, name, role }) {
  const c = client(base);
  const r = await c.post('/api/auth/register', {
    email,
    name,
    role,
    password: 'secret-123',
    adult: true,
    terms: true,
  });
  if (r.status !== 201) throw new Error(`Registrierung fehlgeschlagen: ${JSON.stringify(r.data)}`);
  return { c, user: r.data.user };
}
