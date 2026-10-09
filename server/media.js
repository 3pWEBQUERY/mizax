import sharp from 'sharp';
import crypto from 'node:crypto';
import { putObject, deleteObject } from './storage.js';

// Bild in zwei WebP-Größen umrechnen und im Bucket ablegen. Gibt Schlüssel und Maße zurück.
export async function storeImage(file, prefix) {
  const base = sharp(file.path, { failOn: 'none' }).rotate();
  const large = await base
    .clone()
    .resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const small = await base
    .clone()
    .resize({ width: 640, height: 960, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  const key = `${prefix}/${crypto.randomUUID()}`;
  await putObject(`${key}.webp`, large.data, 'image/webp');
  await putObject(`${key}_sm.webp`, small, 'image/webp');
  return { key, width: large.info.width, height: large.info.height };
}

export function removeImages(keys) {
  return Promise.allSettled(keys.flatMap((k) => [deleteObject(`${k}.webp`), deleteObject(`${k}_sm.webp`)]));
}

export function photoOut(p) {
  return {
    id: p.id,
    url: `/media/${p.key}.webp`,
    thumb: `/media/${p.key}_sm.webp`,
    width: p.width,
    height: p.height,
  };
}

export const isImage = (f) => /^image\//.test(f.mimetype);
