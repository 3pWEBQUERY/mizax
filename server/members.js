import { query } from './db.js';
import { httpError } from './auth.js';
import { findPlace } from './places.js';
import { thumbUrl } from './escorts.js';

// Datenebene der Mitgliederprofile: anders aufgebaut als Escort-Profile – ein Profilbild statt
// Galerie, Interessen statt Leistungen, keine Honorare oder Kontaktdaten.

export const INTERESTS = [
  'dining',
  'wine',
  'travel',
  'culture',
  'music',
  'theatre',
  'art',
  'cinema',
  'books',
  'sports',
  'wellness',
  'nature',
  'nightlife',
  'fashion',
  'cars',
  'business',
];
export const MAX_INTERESTS = 10;

export const avatarUrl = (key) => (key ? `/media/${key}.webp` : null);
export const avatarThumb = thumbUrl;

export function memberOut(u) {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    age: u.age ?? null,
    tagline: u.tagline || '',
    bio: u.bio || '',
    city: u.city || '',
    zip: u.zip || '',
    canton: u.canton || '',
    languages: u.languages || [],
    interests: u.interests || [],
    avatar: u.avatar_key ? { url: avatarUrl(u.avatar_key), thumb: avatarThumb(u.avatar_key) } : null,
    createdAt: u.created_at,
  };
}

const str = (v, n) =>
  String(v ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, n);

export function memberInput(body) {
  const name = str(body.name, 60);
  if (!name) throw httpError(400, 'name_required', 'Name fehlt');
  let age = null;
  if (body.age !== '' && body.age != null) {
    age = Number(body.age);
    if (!Number.isInteger(age) || age < 18 || age > 99) {
      throw httpError(400, 'age_min', 'Alter muss mindestens 18 sein');
    }
  }
  const place = findPlace(body.zip, body.city);
  const list = (v) => (Array.isArray(v) ? v : []).map((s) => str(s, 40)).filter(Boolean);
  return {
    name,
    age,
    tagline: str(body.tagline, 120),
    bio: str(body.bio, 2000),
    city: place ? place.name : str(body.city, 80),
    zip: place ? place.zip : '',
    canton: place ? place.canton : '',
    languages: [...new Set(list(body.languages))].slice(0, 12),
    interests: [...new Set(list(body.interests))].filter((k) => INTERESTS.includes(k)).slice(0, MAX_INTERESTS),
  };
}

export async function getMember(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateMember(id, data) {
  const { rows } = await query(
    `UPDATE users SET name = $1, age = $2, tagline = $3, bio = $4, city = $5, zip = $6, canton = $7,
       languages = $8, interests = $9
     WHERE id = $10 RETURNING *`,
    [data.name, data.age, data.tagline, data.bio, data.city, data.zip, data.canton, data.languages, data.interests, id],
  );
  return rows[0];
}
