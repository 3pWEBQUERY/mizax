import express from 'express';
import { query } from '../db.js';
import { requireUser, rateLimit } from '../auth.js';
import { wrap, requireDb } from '../http.js';
import { appUrl } from '../mail/index.js';

// Datenauskunft nach DSG/DSGVO: alle personenbezogenen Daten des eigenen Kontos als JSON-Datei.
// Passwort-Hash, Sitzungs- und Rücksetz-Daten sowie Daten anderer Personen (ausser Namen in
// gemeinsamen Unterhaltungen und Bewertungen) sind nicht enthalten.

const router = express.Router();

const rows = async (sql, args) => (await query(sql, args)).rows;

router.get(
  '/api/me/export',
  requireUser,
  requireDb,
  rateLimit(10, 60 * 60 * 1000),
  wrap(async (req, res) => {
    const id = req.user.id;
    const base = appUrl(req);
    const media = (key, suffix = '') => (key ? `${base}/media/${key}${suffix}.webp` : null);

    const [account] = await rows(
      `SELECT id, email, name, role, locale, created_at, last_login_at, terms_accepted_at, show_visits,
              age, tagline, bio, city, zip, canton, languages, interests, avatar_key,
              notify_messages, notify_reviews, notify_comments, notify_suggestions
       FROM users WHERE id = $1`,
      [id],
    );
    const [escort] = await rows('SELECT * FROM escorts WHERE user_id = $1', [id]);
    const escortId = escort?.id ?? null;

    const [
      photos,
      favorites,
      prefs,
      posts,
      comments,
      likes,
      conversations,
      reviewsGiven,
      reviewsReceived,
      memberReviewsGiven,
      memberReviewsReceived,
      blocks,
      reports,
      visits,
      verifications,
    ] = await Promise.all([
      rows('SELECT key, width, height, created_at FROM escort_photos WHERE escort_id = $1 ORDER BY position, id', [
        escortId,
      ]),
      rows(
        `SELECT e.name, e.slug, f.created_at FROM favorites f JOIN escorts e ON e.id = f.escort_id
         WHERE f.user_id = $1 ORDER BY f.created_at`,
        [id],
      ),
      rows('SELECT * FROM member_prefs WHERE user_id = $1', [id]),
      rows(
        `SELECT p.id, p.body, p.created_at, p.updated_at,
           COALESCE((SELECT array_agg(pp.key ORDER BY pp.position, pp.id) FROM post_photos pp WHERE pp.post_id = p.id), '{}') AS photos
         FROM posts p WHERE p.user_id = $1 OR p.escort_id = $2 ORDER BY p.id`,
        [id, escortId],
      ),
      rows('SELECT post_id, body, created_at FROM post_comments WHERE user_id = $1 ORDER BY id', [id]),
      rows('SELECT post_id, created_at FROM post_likes WHERE user_id = $1 ORDER BY created_at', [id]),
      rows(
        `SELECT c.id, c.created_at,
           CASE WHEN c.user_id = $1 THEN e.name ELSE u.name END AS with_name,
           (SELECT json_agg(json_build_object('from_me', m.sender_id = $1, 'body', m.body, 'photo', m.photo_key IS NOT NULL, 'sent_at', m.created_at,
                    'read_at', m.read_at) ORDER BY m.id)
            FROM messages m WHERE m.conversation_id = c.id) AS messages
         FROM conversations c JOIN escorts e ON e.id = c.escort_id JOIN users u ON u.id = c.user_id
         WHERE c.user_id = $1 OR c.escort_id = $2 ORDER BY c.id`,
        [id, escortId],
      ),
      rows(
        `SELECT e.name AS escort, r.rating, r.body, r.reply, r.created_at, r.updated_at
         FROM escort_reviews r JOIN escorts e ON e.id = r.escort_id WHERE r.user_id = $1 ORDER BY r.id`,
        [id],
      ),
      rows(
        `SELECT u.name AS author, r.rating, r.body, r.reply, r.created_at, r.updated_at
         FROM escort_reviews r JOIN users u ON u.id = r.user_id WHERE r.escort_id = $1 ORDER BY r.id`,
        [escortId],
      ),
      rows(
        `SELECT u.name AS member, r.rating, r.body, r.reply, r.created_at, r.updated_at
         FROM member_reviews r JOIN users u ON u.id = r.member_id WHERE r.user_id = $1 ORDER BY r.id`,
        [id],
      ),
      rows(
        `SELECT COALESCE(e.name, u.name) AS author, r.rating, r.body, r.reply, r.created_at, r.updated_at
         FROM member_reviews r JOIN users u ON u.id = r.user_id LEFT JOIN escorts e ON e.user_id = r.user_id
         WHERE r.member_id = $1 ORDER BY r.id`,
        [id],
      ),
      rows(
        `SELECT u.name, b.created_at FROM blocks b JOIN users u ON u.id = b.blocked_id
         WHERE b.user_id = $1 ORDER BY b.created_at`,
        [id],
      ),
      rows(
        'SELECT kind, target_id, reason, details, status, created_at FROM reports WHERE reporter_id = $1 ORDER BY id',
        [id],
      ),
      rows(
        `SELECT e.name AS profile, v.created_at FROM profile_views v JOIN escorts e ON e.id = v.escort_id
         WHERE v.viewer_id = $1 ORDER BY v.id`,
        [id],
      ),
      rows('SELECT status, reason, created_at, decided_at FROM verifications WHERE escort_id = $1 ORDER BY id', [
        escortId,
      ]),
    ]);

    const { avatar_key: avatarKey, ...accountData } = account;
    const data = {
      exportedAt: new Date().toISOString(),
      service: 'Mizax',
      account: { ...accountData, avatar: media(avatarKey) },
      escortProfile: escort
        ? {
            ...Object.fromEntries(Object.entries(escort).filter(([k]) => !['verify_code', 'lat', 'lng'].includes(k))),
            photos: photos.map((p) => ({ ...p, url: media(p.key), key: undefined })),
            verifications,
          }
        : null,
      suggestionPreferences: prefs[0] || null,
      favorites,
      posts: posts.map((p) => ({ ...p, photos: p.photos.map((k) => media(k)) })),
      comments,
      likes,
      conversations,
      reviews: {
        givenToEscorts: reviewsGiven,
        receivedAsEscort: reviewsReceived,
        givenToMembers: memberReviewsGiven,
        receivedAsMember: memberReviewsReceived,
      },
      blockedPeople: blocks,
      reportsMade: reports,
      profileVisits: visits,
    };

    const day = new Date().toISOString().slice(0, 10);
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Disposition', `attachment; filename="mizax-daten-${day}.json"`);
    res.type('application/json').send(JSON.stringify(data, null, 2));
  }),
);

export default router;
