import fs from 'node:fs';
import path from 'node:path';
import { query, hasDb } from './db.js';
import { appUrl } from './mail/index.js';

// Suchmaschinen: Die Seite bleibt gesperrt (noindex), bis SEO_INDEX=true gesetzt ist.
// Dann gibt es eine Sitemap, robots.txt erlaubt das Crawlen, und Profilseiten bekommen
// Titel, Beschreibung und Vorschaubild schon im HTML (auch für Link-Vorschauen).

export const seoEnabled = () => process.env.SEO_INDEX === 'true';

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const DEFAULT_DESC = 'Mizax – Escort-Verzeichnis für die ganze Schweiz.';

let template = null;
function loadTemplate(dist) {
  if (!template || process.env.NODE_ENV !== 'production') {
    template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  }
  return template;
}

async function profileMeta(slug) {
  if (!hasDb()) return null;
  const { rows } = await query(
    `SELECT e.name, e.age, e.city, e.tagline,
       (SELECT key FROM escort_photos p WHERE p.escort_id = e.id ORDER BY position, id LIMIT 1) AS cover
     FROM escorts e WHERE e.slug = $1 AND e.published = true`,
    [slug],
  );
  return rows[0] || null;
}

// index.html mit passenden Meta-Angaben für die aufgerufene Seite
export async function renderIndex(req, dist) {
  let html = loadTemplate(dist);
  const base = appUrl(req);
  let title = 'Mizax';
  let desc = DEFAULT_DESC;
  let image = null;

  const m = req.path.match(/^\/escort\/([a-z0-9-]+)\/?$/);
  if (m) {
    const e = await profileMeta(m[1]).catch(() => null);
    if (e) {
      title = `${e.name}, ${e.age} – ${e.city} | Mizax`;
      desc = e.tagline || `${e.name}, ${e.age}, ${e.city} – Profil auf Mizax.`;
      if (e.cover) image = `${base}/media/${e.cover}.webp`;
    }
  }

  const tags = [
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(base + req.path)}" />`,
    `<meta property="og:site_name" content="Mizax" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(base + req.path)}" />`,
    `<meta property="og:type" content="${m ? 'profile' : 'website'}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
  ].filter(Boolean);

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  if (seoEnabled()) html = html.replace(/\s*<meta name="robots" content="noindex" \/>/, '');
  return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
}

export function robots(req, res) {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600');
  if (!seoEnabled()) return res.send('User-agent: *\nDisallow: /\n');
  res.send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /admin',
      'Disallow: /me',
      'Disallow: /messages',
      'Disallow: /settings',
      'Disallow: /stats',
      `Sitemap: ${appUrl(req)}/sitemap.xml`,
      '',
    ].join('\n'),
  );
}

export async function sitemap(req, res) {
  if (!seoEnabled() || !hasDb()) return res.status(404).end();
  const base = appUrl(req);
  const { rows } = await query(
    'SELECT slug, updated_at FROM escorts WHERE published = true ORDER BY updated_at DESC LIMIT 5000',
  );
  const urls = [
    { loc: `${base}/`, priority: '1.0' },
    ...rows.map((r) => ({ loc: `${base}/escort/${r.slug}`, lastmod: r.updated_at, priority: '0.8' })),
    { loc: `${base}/datenschutz`, priority: '0.2' },
    { loc: `${base}/agb`, priority: '0.2' },
  ];
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
    )
    .join('\n');
  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=3600')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    );
}
