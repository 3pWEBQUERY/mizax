import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { DB_URL, ADMIN, resetDb, startServer, client, register } from './helpers.js';

// Durchgehender Ablauf über die echte API: Registrierung, Profil, Nachrichten (auch in Echtzeit),
// Bewertungen mit Antwort, Blockieren, Melden, Datenauskunft.

const skip = !DB_URL && 'TEST_DATABASE_URL fehlt';
let server;
let escort;
let member;
let slug;

before(async () => {
  if (skip) return;
  await resetDb();
  server = await startServer();
  escort = await register(server.base, { email: 'lea@test.local', name: 'Lea', role: 'escort' });
  member = await register(server.base, { email: 'max@test.local', name: 'Max', role: 'member' });
});

after(() => server?.stop());

test('Gesundheit und gesperrte Suchmaschinen', { skip }, async () => {
  const c = client(server.base);
  const h = await c.get('/api/health');
  assert.equal(h.status, 200);
  assert.equal(h.data.db, true);
  const robots = await c.get('/robots.txt');
  assert.match(robots.data, /Disallow: \//);
});

test('Registrierung: doppelte E-Mail und fehlende Bestätigung werden abgelehnt', { skip }, async () => {
  const c = client(server.base);
  const dup = await c.post('/api/auth/register', {
    email: 'MAX@test.local',
    name: 'X',
    role: 'member',
    password: 'secret-123',
    adult: true,
    terms: true,
  });
  assert.equal(dup.status, 409);
  const noTerms = await c.post('/api/auth/register', {
    email: 'neu@test.local',
    name: 'X',
    role: 'member',
    password: 'secret-123',
    adult: true,
  });
  assert.equal(noTerms.data.code, 'terms_required');
});

test('Escort speichert Profil mit Verfügbarkeitszeiten', { skip }, async () => {
  const schedule = [{ from: '00:00', to: '00:00' }, null, null, null, null, null, null];
  const r = await escort.c.put('/api/me/profile', {
    name: 'Lea',
    age: 25,
    zip: '8001',
    city: 'Zürich',
    services: ['dinner_date'],
    rates: [{ label: '1 Std.', price: '300' }],
    phone: '+41 79 000 00 00',
    schedule,
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.canton, 'ZH');
  assert.deepEqual(r.data.schedule, schedule);
  slug = r.data.slug;

  // Liste: nur Kartendaten, Gäste ohne Leistungen und Kontakte
  const guest = await client(server.base).get('/api/escorts');
  const card = guest.data.find((e) => e.slug === slug);
  assert.ok(card);
  assert.deepEqual(card.services, []);
  assert.equal(card.phone, undefined);
  const forMember = await member.c.get('/api/escorts');
  assert.deepEqual(forMember.data.find((e) => e.slug === slug).services, ['dinner_date']);
  // Vollprofil nur angemeldet
  const full = await member.c.get(`/api/escorts/${slug}`);
  assert.equal(full.data.phone, '+41 79 000 00 00');
});

test('Nachrichten: Mitglied schreibt zuerst, Escort bekommt sie in Echtzeit', { skip }, async () => {
  // Echtzeit-Verbindung der Escort öffnen
  const events = [];
  const url = new URL('/api/live', server.base);
  const req = http.get(url, { headers: { Cookie: escort.c.cookie() } }, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => events.push(chunk));
  });
  await new Promise((r) => setTimeout(r, 300));

  const start = await member.c.post('/api/messages/start', { slug, body: 'Hallo Lea' });
  assert.equal(start.status, 201);
  const convId = start.data.conversationId;
  await new Promise((r) => setTimeout(r, 300));
  req.destroy();
  assert.ok(events.join('').includes('event: message'), 'Echtzeit-Ereignis angekommen');

  const unread = await escort.c.get('/api/messages/unread');
  assert.equal(unread.data.count, 1);
  const reply = await escort.c.post(`/api/messages/${convId}`, { body: 'Hi Max' });
  assert.equal(reply.status, 201);
  const conv = await member.c.get(`/api/messages/${convId}`);
  assert.deepEqual(
    conv.data.messages.map((m) => m.body),
    ['Hallo Lea', 'Hi Max'],
  );
});

test('Bewertungen in beide Richtungen und Antwort der bewerteten Person', { skip }, async () => {
  const r = await member.c.put(`/api/escorts/${slug}/review`, { rating: 5, body: 'Sehr angenehm' });
  assert.equal(r.status, 200);
  assert.equal(r.data.count, 1);
  const reviewId = r.data.items[0].id;

  // nur die bewertete Person darf antworten
  const foreign = await member.c.put(`/api/reviews/${reviewId}/reply`, { body: 'x' });
  assert.equal(foreign.status, 403);
  const reply = await escort.c.put(`/api/reviews/${reviewId}/reply`, { body: 'Danke!' });
  assert.equal(reply.data.reply.body, 'Danke!');

  // Escorts bewerten Mitglieder, Mitglieder keine Mitglieder
  const m = await escort.c.put(`/api/members/${member.user.id}/review`, { rating: 4, body: 'Höflich' });
  assert.equal(m.status, 200);
  const self = await member.c.put(`/api/members/${member.user.id}/review`, { rating: 5 });
  assert.equal(self.status, 403);
});

test('Melden landet bei der Verwaltung', { skip }, async () => {
  const escortId = (await member.c.get(`/api/escorts/${slug}`)).data.id;
  const r = await member.c.post('/api/reports', { kind: 'escort', targetId: escortId, reason: 'fake' });
  assert.equal(r.status, 201);
  const admin = client(server.base);
  await admin.post('/api/auth/login', ADMIN);
  const list = await admin.get('/api/admin/reports');
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].kind, 'escort');
  assert.equal((await member.c.get('/api/admin/reports')).status, 403);
});

test('Blockieren verhindert weitere Nachrichten', { skip }, async () => {
  const conv = (await member.c.get('/api/messages')).data[0];
  const b = await escort.c.put(`/api/blocks/${member.user.id}`);
  assert.equal(b.status, 200);
  const send = await member.c.post(`/api/messages/${conv.id}`, { body: 'Noch da?' });
  assert.equal(send.status, 403);
  await escort.c.del(`/api/blocks/${member.user.id}`);
  const again = await member.c.post(`/api/messages/${conv.id}`, { body: 'Noch da?' });
  assert.equal(again.status, 201);
});

test('Datenauskunft enthält eigene Daten, aber kein Passwort', { skip }, async () => {
  const r = await member.c.get('/api/me/export');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-disposition'), /attachment/);
  assert.equal(r.data.account.email, 'max@test.local');
  assert.equal(r.data.conversations.length, 1);
  assert.equal(r.data.reviews.givenToEscorts.length, 1);
  assert.ok(!JSON.stringify(r.data).includes('password'));
  assert.equal((await client(server.base).get('/api/me/export')).status, 401);
});

test('Abo: Paket bestellen, Zahlung bestätigen, Vorteile aktiv', { skip }, async () => {
  const start = await escort.c.get('/api/me/billing');
  assert.equal(start.status, 200);
  assert.equal(start.data.subscription, null);
  const premium = start.data.plans.find((p) => p.highlight && !p.top);
  assert.ok(premium, 'Startpakete angelegt');

  const ordered = await escort.c.post('/api/me/billing/order', { planId: premium.id });
  const invoice = ordered.data.invoices.find((i) => i.status === 'open');
  assert.equal(invoice.amount, premium.price);
  assert.match(invoice.number, /^MZ-\d{4}-\d{6}$/);
  assert.match(invoice.reference, /^RF\d{2}MZ\d{8}$/);
  // ohne Bankverbindung (Variablen) gibt es keine QR-Rechnung
  assert.equal((await escort.c.get(`/api/billing/invoices/${invoice.id}/qr.svg`)).status, 404);
  // nur Escorts haben Abos, nur Admins bestätigen
  assert.equal((await member.c.get('/api/me/billing')).status, 403);
  assert.equal((await escort.c.post(`/api/admin/invoices/${invoice.id}`, { action: 'paid' })).status, 403);

  const admin = client(server.base);
  await admin.post('/api/auth/login', ADMIN);
  const paid = await admin.post(`/api/admin/invoices/${invoice.id}`, { action: 'paid' });
  assert.equal(paid.data.status, 'paid');

  const after = await escort.c.get('/api/me/billing');
  assert.equal(after.data.subscription.active, true);
  assert.equal(after.data.subscription.name, premium.name);
  assert.equal(after.data.photoLimit, premium.maxPhotos);
  const card = (await client(server.base).get('/api/escorts')).data.find((e) => e.slug === slug);
  assert.equal(card.plan.highlight, true);
});

test('Abo: „nur mit Abo sichtbar“ blendet Profile ohne Paket aus', { skip }, async () => {
  const other = await register(server.base, { email: 'nina@test.local', name: 'Nina', role: 'escort' });
  const saved = await other.c.put('/api/me/profile', { name: 'Nina', age: 30, zip: '3011', city: 'Bern' });
  const admin = client(server.base);
  await admin.post('/api/auth/login', ADMIN);
  await admin.put('/api/admin/billing/settings', { requirePlan: true, freePhotos: 3 });
  const list = (await client(server.base).get('/api/escorts')).data.map((e) => e.slug);
  assert.ok(list.includes(slug), 'mit Paket sichtbar');
  assert.ok(!list.includes(saved.data.slug), 'ohne Paket ausgeblendet');
  assert.equal((await member.c.get(`/api/escorts/${saved.data.slug}`)).status, 404);
  assert.equal(
    (await other.c.get(`/api/escorts/${saved.data.slug}`)).status,
    200,
    'die Escort selbst sieht ihr Profil',
  );
  assert.equal((await other.c.get('/api/me/profile')).data.photoLimit, 3);
  await admin.put('/api/admin/billing/settings', { requirePlan: false, freePhotos: 20 });
});
