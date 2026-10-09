import multer from 'multer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hasDb } from './db.js';
import { httpError } from './auth.js';

// Async-Handler: Fehler an die Express-Fehlerbehandlung weiterreichen
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function requireDb(req, res, next) {
  if (!hasDb()) return next(httpError(503, 'db_unavailable', 'Datenbank nicht verbunden'));
  next();
}

export function noStore(res) {
  res.set('Cache-Control', 'private, no-store');
}

// Freitext kürzen und Zeilenumbrüche vereinheitlichen
export const text = (v, max) =>
  String(v ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);

// positive Ganzzahl aus einem URL-Parameter, sonst 404
export function toId(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw httpError(404, 'not_found', 'Nicht gefunden');
  return n;
}

export const MAX_UPLOAD_FILES = 20;

// Uploads landen zuerst als temporäre Dateien auf der Platte (nicht im RAM) und werden
// nach der Antwort wieder gelöscht.
const upload = multer({
  dest: path.join(os.tmpdir(), 'mizax-uploads'),
  limits: { fileSize: 20 * 1024 * 1024, files: MAX_UPLOAD_FILES },
});

export function uploadImages(max) {
  return (req, res, next) => {
    res.on('close', () => {
      for (const f of req.files || []) fs.promises.unlink(f.path).catch(() => {});
    });
    upload.array('photos', max)(req, res, next);
  };
}

export const isUploadError = (err) => err instanceof multer.MulterError;
