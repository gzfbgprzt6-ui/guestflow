// ============================================================
// /api/stranica — javna stranica objekta s podacima za Google i dijeljenje
//
// /p/:slug ide ovdje (vercel.json). Ruta pročita p.html i u <head> upiše
// naslov, opis, fotografiju (Open Graph — pregled linka na WhatsAppu,
// Facebooku, Viberu) i strukturirane podatke (schema.org LodgingBusiness).
// WhatsApp i Facebook ne pokreću JavaScript, pa bez ovoga pregled linka
// pokazuje samo „Odmoria”. Ostatak stranice radi isto kao prije (p.html
// sam učita sve u pregledniku).
//
// Isto mjesto daje i /sitemap.xml i /robots.txt (?sto=sitemap|robots),
// da ne troši zasebne funkcije (Vercel Hobby: najviše 12).
//
// Adresa se uzima iz zahtjeva, nikad zakucana (vidi links.js).
// Ako išta pođe po zlu, vraća se neizmijenjeni p.html — stranica radi.
// Namjerno bez npm ovisnosti; javni podaci preko javnog ključa.
// ============================================================

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F';

let PREDLOZAK = null;
function predlozak() {
  if (PREDLOZAK) return PREDLOZAK;
  for (const f of [path.join(__dirname, '..', 'p.html'), path.join(process.cwd(), 'p.html')]) {
    try { PREDLOZAK = fs.readFileSync(f, 'utf8'); return PREDLOZAK; } catch {}
  }
  throw new Error('p.html nije pronađen');
}

const atr = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kratko = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

function ishodiste(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? proto + '://' + host : '';
}

async function rest(put, opts = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1' + put, Object.assign({
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' }
  }, opts));
  if (!r.ok) throw new Error('supabase ' + r.status);
  return r.json();
}

// Cloudinary: izrez 1200×630 za pregled linka (ostale adrese ostaju kakve jesu)
function slikaZaDijeljenje(url) {
  return /res\.cloudinary\.com\/.+\/image\/upload\//.test(url || '')
    ? url.replace('/image/upload/', '/image/upload/c_fill,w_1200,h_630,q_auto,f_jpg/') : url;
}

function glava(prop, javno, baza) {
  const url = baza + '/p/' + encodeURIComponent(prop.slug);
  const naslov = prop.name + (prop.location ? ' · ' + prop.location : '') + ' — izravno od domaćina';
  const opis = kratko(prop.welcome_msg
    || [prop.name, prop.location, prop.max_guests ? 'do ' + prop.max_guests + ' gostiju' : '',
        'fotografije, dostupnost i izravan kontakt s domaćinom, bez provizije'].filter(Boolean).join(' · '), 160);
  const slike = [prop.cover_photo_url, ...(Array.isArray(prop.photo_urls) ? prop.photo_urls : [])]
    .filter((u, i, a) => u && /^https:\/\//.test(u) && a.indexOf(u) === i);
  const cijena = parseFloat(prop.price_per_night) || 0;

  const ld = {
    '@context': 'https://schema.org', '@type': 'LodgingBusiness',
    name: prop.name, url, description: opis,
    image: slike.slice(0, 8)
  };
  if (prop.location) ld.address = { '@type': 'PostalAddress', addressLocality: prop.location, addressCountry: 'HR' };
  if (cijena > 0) ld.priceRange = 'od ' + cijena + ' € po noći';
  if (prop.max_guests) ld.maximumAttendeeCapacity = prop.max_guests;
  if (javno && javno.broj > 0 && javno.prosjek) {
    ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(javno.prosjek), reviewCount: javno.broj, bestRating: 5, worstRating: 1 };
  }

  return [
    `<title>${atr(naslov)}</title>`,
    `<meta name="description" content="${atr(opis)}">`,
    `<link rel="canonical" href="${atr(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Odmoria">`,
    `<meta property="og:locale" content="hr_HR">`,
    `<meta property="og:title" content="${atr(naslov)}">`,
    `<meta property="og:description" content="${atr(opis)}">`,
    `<meta property="og:url" content="${atr(url)}">`,
    slike[0] ? `<meta property="og:image" content="${atr(slikaZaDijeljenje(slike[0]))}">` : '',
    slike[0] ? `<meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`
  ].filter(Boolean).join('\n');
}

// Stil javne stranice (properties.theme) — KOPIJA id-jeva i pisama iz stilovi.js
// (ES modul se ovdje ne može uvesti); mijenjati zajedno. Stil u HTML-u od prvog
// prikaza = bez treptaja zadanog izgleda prije nego JS učita objekt.
const PISMA = {
  priroda: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500;1,600&family=Karla:wght@400;500;600;700',
  luksuz: 'family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Jost:wght@400;500;600',
  more: 'family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700;800',
  moderno: 'family=Urbanist:wght@500;600;700;800&family=Instrument+Sans:wght@400;500;600',
  grad: 'family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700',
  snijeg: 'family=Josefin+Sans:wght@400;600;700&family=Figtree:wght@400;500;600;700',
  relax: 'family=Marcellus&family=Albert+Sans:wght@300;400;500;600',
  seoska: 'family=Zilla+Slab:wght@600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Caveat:wght@500;600'
};
function saStilom(html, theme) {
  if (!Object.prototype.hasOwnProperty.call(PISMA, theme)) return html;
  return html
    .replace('<html lang="hr">', `<html lang="hr" data-stil="${theme}">`)
    .replace('<link rel="stylesheet" href="/stilovi.css">',
      `<link rel="stylesheet" href="/stilovi.css">\n<link rel="stylesheet" data-pisma="${theme}" href="https://fonts.googleapis.com/css2?${PISMA[theme]}&display=swap">`);
}

function ubaci(html, novo) {
  return html
    .replace(/<title>[^<]*<\/title>\s*/, '')
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('<meta name="viewport" content="width=device-width,initial-scale=1">',
             '<meta name="viewport" content="width=device-width,initial-scale=1">\n' + novo);
}

async function stranica(req, res) {
  const html = predlozak();
  const slug = String((req.query && req.query.slug) || '').slice(0, 120);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    if (!slug) throw new Error('bez sluga');
    const redovi = await rest('/properties?select=*&limit=1&slug=eq.' + encodeURIComponent(slug));
    const prop = Array.isArray(redovi) ? redovi[0] : null;
    if (!prop) {
      res.statusCode = 404;
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.end(ubaci(html, '<title>Objekt nije pronađen — Odmoria</title>\n<meta name="robots" content="noindex">'));
    }
    let javno = null;
    try { javno = await rest('/rpc/javno_o_objektu', { method: 'POST', body: JSON.stringify({ p_slug: slug }) }); } catch {}
    res.statusCode = 200;
    // CDN drži stranicu 5 minuta — manje poziva, a izmjene se vide brzo
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    return res.end(saStilom(ubaci(html, glava(prop, javno, ishodiste(req))), prop.theme));
  } catch (e) {
    console.error('stranica:', e.message);
    res.statusCode = 200;
    res.setHeader('Cache-Control', 'no-store');
    return res.end(html);
  }
}

async function sitemap(req, res) {
  const baza = ishodiste(req);
  let redovi = [];
  try { redovi = await rest('/properties?select=slug,updated_at&slug=not.is.null&order=slug&limit=5000'); }
  catch { try { redovi = await rest('/properties?select=slug&slug=not.is.null&order=slug&limit=5000'); } catch {} }
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const url = [`<url><loc>${x(baza + '/')}</loc></url>`].concat((redovi || []).map(r =>
    `<url><loc>${x(baza + '/p/' + encodeURIComponent(r.slug))}</loc>${r.updated_at ? `<lastmod>${x(String(r.updated_at).slice(0, 10))}</lastmod>` : ''}</url>`));
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${url.join('\n')}\n</urlset>\n`);
}

function robots(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400');
  res.end(['User-agent: *',
    // privatni vodič, čistačica i aplikacija domaćina ne idu u tražilice
    'Disallow: /h/', 'Disallow: /h.html', 'Disallow: /c/', 'Disallow: /c.html', 'Disallow: /dashboard', 'Disallow: /admin',
    'Disallow: /account', 'Disallow: /onboarding', 'Disallow: /add-property', 'Disallow: /api/',
    'Allow: /', '', 'Sitemap: ' + ishodiste(req) + '/sitemap.xml', ''].join('\n'));
}

module.exports = async function handler(req, res) {
  const sto = req.query && req.query.sto;
  if (sto === 'sitemap') return sitemap(req, res);
  if (sto === 'robots') return robots(req, res);
  return stranica(req, res);
};
module.exports._glava = glava;
module.exports._ubaci = ubaci;
module.exports._saStilom = saStilom;
