import express from 'express';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrate, hasDb } from './db.js';
import { hasStorage } from './storage.js';
import { seedIfEmpty, normalizeLegacy } from './seed.js';
import { attachUser, ensureAdmin } from './auth.js';
import { isUploadError } from './http.js';
import publicRoutes from './routes/public.js';
import accountRoutes from './routes/account.js';
import meRoutes from './routes/me.js';
import adminRoutes from './routes/admin.js';
import statsRoutes from './routes/stats.js';
import messageRoutes from './routes/messages.js';
import feedRoutes from './routes/feed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');
// genau eine Proxy-Stufe (Railway-Edge) vertrauen, damit X-Forwarded-* nicht gefälscht werden kann
app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// ---------- API ----------

app.use('/api', attachUser);
app.use(publicRoutes);
app.use(accountRoutes);
app.use(meRoutes);
app.use(adminRoutes);
app.use(statsRoutes);
app.use(messageRoutes);
app.use(feedRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Nicht gefunden', code: 'not_found' }));

// ---------- Frontend ----------

if (fs.existsSync(dist)) {
  app.use(
    '/assets',
    express.static(path.join(dist, 'assets'), {
      immutable: true,
      maxAge: '1y',
      index: false,
    }),
  );
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  let status = err.status || 500;
  let code = err.code;
  if (isUploadError(err)) {
    status = 400;
    code = 'upload_invalid';
  }
  if (status >= 500) console.error(err);
  const known = Boolean(err.status) || isUploadError(err);
  res.status(status).json({
    error: status >= 500 ? 'Serverfehler' : err.message,
    code: known && typeof code === 'string' ? code : 'server_error',
  });
});

async function start() {
  if (hasDb()) {
    for (let attempt = 1; ; attempt++) {
      try {
        await migrate();
        await seedIfEmpty();
        await normalizeLegacy();
        const adminEmail = await ensureAdmin();
        if (!adminEmail) console.warn('[admin] ADMIN_EMAIL/ADMIN_PASSWORD fehlen – kein Admin-Konto angelegt');
        break;
      } catch (err) {
        if (attempt >= 10) throw err;
        console.warn(`[db] Verbindung fehlgeschlagen (Versuch ${attempt}): ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  } else {
    console.warn('[db] DATABASE_URL fehlt – API läuft ohne Datenbank');
  }
  if (!hasStorage()) console.warn('[storage] Railway Bucket nicht konfiguriert – Uploads deaktiviert');
  if (!process.env.SESSION_SECRET) console.warn('[auth] SESSION_SECRET fehlt – abgeleiteter Schlüssel wird verwendet');
  app.listen(PORT, '0.0.0.0', () => console.log(`Mizax läuft auf Port ${PORT}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
