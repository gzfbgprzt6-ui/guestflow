// ============================================================
//  Odmoria — objave za društvene mreže, oglase i tisak
//  ------------------------------------------------------------
//  Dashboard → Linkovi i QR → Objave. Sve se radi u pregledniku:
//  tekst iz podataka objekta (predlošci na 6 jezika), slika na
//  <canvas> (naslovna fotografija + QR + kratka adresa) i letak za
//  ispis. Nema poslužitelja ni troška po objavi.
//
//  Čiste funkcije (slobodniTermini, tekstovi, raspon) ne diraju DOM,
//  pa se mogu provjeriti i u Nodeu.
// ============================================================
import * as L from './jezici.js'

// ── datumi (YYYY-MM-DD, bez vremenskih zona) ──────────────────
const ds = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const izDs = s => { const [g, m, d] = s.split('-').map(Number); return new Date(g, m - 1, d) }
const plus = (s, n) => { const d = izDs(s); d.setDate(d.getDate() + n); return ds(d) }
const razlika = (a, b) => Math.round((izDs(b) - izDs(a)) / 864e5)

/**
 * Slobodni termini: uzastopne slobodne noći od `danas` do `danas + dana`,
 * duge barem `minNoci`. `otvoren` = niz dopire do kraja razdoblja, pa se
 * ne zna kad završava (u tekstu „od 3. kolovoza”, ne „3.–9. kolovoza”).
 * `zauzete` = Set datuma zauzetih noći (kao u analitici).
 */
export function slobodniTermini(zauzete, danas, { dana = 90, minNoci = 2, najvise = 8 } = {}) {
  const kraj = plus(danas, dana), out = []
  let d = danas
  while (d < kraj && out.length < najvise) {
    if (zauzete.has(d)) { d = plus(d, 1); continue }
    const start = d
    while (d < kraj && !zauzete.has(d)) d = plus(d, 1)
    const n = razlika(start, d)
    if (n >= minNoci) out.push({ start, end: d, nights: n, otvoren: d >= kraj })
  }
  return out
}

// ── tekstovi na šest jezika ───────────────────────────────────
// Ključ je uloga rečenice; {x} se umeće. Gramatika je namjerno bez
// padeža imena i mjesta (ime objekta i mjesto stoje uz zarez ili u
// zagradi), pa predložak vrijedi za svako ime.
const R = {
  pill: { hr: 'Slobodno', en: 'Available', de: 'Frei', it: 'Disponibile', pl: 'Wolne', cs: 'Volno' },
  imamo: { hr: 'Imamo slobodan termin', en: 'We have free dates', de: 'Bei uns ist noch frei', it: 'Abbiamo date libere', pl: 'Mamy wolny termin', cs: 'Máme volný termín' },
  od: { hr: 'od {d}', en: 'from {d}', de: 'ab {d}', it: 'dal {d}', pl: 'od {d}', cs: 'od {d}' },
  odIt: { it: "dall'{d}" },
  predstavljamo: { hr: 'Predstavljamo naš smještaj', en: 'Let us introduce our holiday home', de: 'Wir stellen unsere Unterkunft vor', it: 'Vi presentiamo il nostro alloggio', pl: 'Przedstawiamy nasze miejsce na wakacje', cs: 'Představujeme naše ubytování' },
  pozdrav: { hr: 'Pozdrav svima!', en: 'Hi everyone!', de: 'Hallo zusammen!', it: 'Ciao a tutti!', pl: 'Cześć wszystkim!', cs: 'Ahoj všichni!' },
  cijena: { hr: 'od {c} po noći', en: 'from {c} per night', de: 'ab {c} pro Nacht', it: 'da {c} a notte', pl: 'od {c} za noc', cs: 'od {c} za noc' },
  cijenaKratko: { hr: 'od {c} / noć', en: 'from {c} / night', de: 'ab {c} / Nacht', it: 'da {c} / notte', pl: 'od {c} / noc', cs: 'od {c} / noc' },
  izravno: { hr: 'Rezervirajte izravno kod domaćina — bez provizije.', en: 'Book directly with the host — no booking fees.', de: 'Direkt beim Gastgeber buchen — ohne Provision.', it: 'Prenotate direttamente dal proprietario — senza commissioni.', pl: 'Rezerwuj bezpośrednio u gospodarza — bez prowizji.', cs: 'Rezervujte přímo u hostitele — bez provize.' },
  izravnoKratko: { hr: 'Rezervirajte izravno', en: 'Book direct', de: 'Direkt buchen', it: 'Prenota direttamente', pl: 'Rezerwuj bezpośrednio', cs: 'Rezervujte přímo' },
  bezProvizije: { hr: 'Bez provizije · izravno kod domaćina', en: 'No booking fees · straight from the host', de: 'Ohne Provision · direkt vom Gastgeber', it: 'Senza commissioni · direttamente dal proprietario', pl: 'Bez prowizji · bezpośrednio u gospodarza', cs: 'Bez provize · přímo od hostitele' },
  link: { hr: 'Fotografije, slobodni termini i upit: {l}', en: 'Photos, availability and enquiries: {l}', de: 'Fotos, freie Termine und Anfrage: {l}', it: 'Foto, disponibilità e richieste: {l}', pl: 'Zdjęcia, wolne terminy i zapytania: {l}', cs: 'Fotky, volné termíny a poptávka: {l}' },
  bio: { hr: 'Link je u opisu profila.', en: 'Link in bio.', de: 'Link in der Bio.', it: 'Link in bio.', pl: 'Link w bio.', cs: 'Odkaz najdete v profilu.' },
  kontakt: { hr: 'Kontakt', en: 'Contact', de: 'Kontakt', it: 'Contatto', pl: 'Kontakt', cs: 'Kontakt' },
  hvala: { hr: 'Hvala što ste bili naši gosti!', en: 'Thank you for staying with us!', de: 'Danke, dass Sie bei uns waren!', it: 'Grazie per essere stati nostri ospiti!', pl: 'Dziękujemy za pobyt u nas!', cs: 'Děkujeme, že jste u nás byli!' },
  sljedeci: { hr: 'Sljedeći put rezervirajte izravno kod nas — bez provizije.', en: 'Next time, book directly with us — no booking fees.', de: 'Buchen Sie beim nächsten Mal direkt bei uns — ohne Provision.', it: 'La prossima volta prenotate direttamente da noi — senza commissioni.', pl: 'Następnym razem zarezerwuj bezpośrednio u nas — bez prowizji.', cs: 'Příště rezervujte přímo u nás — bez provize.' },
  skeniraj: { hr: 'Skenirajte za slobodne termine', en: 'Scan for available dates', de: 'Scannen für freie Termine', it: 'Scansiona per le date libere', pl: 'Zeskanuj, aby zobaczyć wolne terminy', cs: 'Naskenujte pro volné termíny' }
}
const HASH = {
  hr: '#odmor #hrvatska #jadran #apartmani #ljeto',
  en: '#croatia #adriatic #holiday #vacationrental #travel',
  de: '#kroatien #urlaub #ferienwohnung #adria #sommerurlaub',
  it: '#croazia #vacanze #adriatico #casavacanze #estate',
  pl: '#chorwacja #wakacje #urlop #apartament #adriatyk',
  cs: '#chorvatsko #dovolena #jadran #apartman #leto'
}
export const r = (k, j, v) => (R[k][j] || R[k].hr).replace(/\{(\w)\}/g, (m, x) => (v && x in v ? v[x] : m))

const BEZ_TOCKE = { en: 1, it: 1, pl: 1 }      // „12–16 July” / „12.–16. Juli”
/** „12. – 16. srpnja”, „12–16 July”, „30. lipnja – 4. srpnja”; do = dan odlaska */
export function raspon(od, doD, j) {
  const a = izDs(od), b = izDs(doD)
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    const dan = a.getDate() + (BEZ_TOCKE[j] ? '' : '.')
    return dan + (j === 'hr' ? ' – ' : '–') + L.datum(b, { j })
  }
  return L.datum(a, { j }) + ' – ' + L.datum(b, { j })
}
/** „12. 7. – 16. 7.” / „12/07 – 16/07” — za sliku, gdje je mjesto skupo */
export const rasponKratko = (od, doD, j) => L.datumKratko(izDs(od), j) + ' – ' + L.datumKratko(izDs(doD), j)

/** termin u rečenici: „12. – 16. srpnja (4 noći)” ili „od 3. kolovoza” */
export function terminTekst(t, j) {
  if (!t) return ''
  return t.otvoren ? odDatuma(t.start, j) : `${raspon(t.start, t.end, j)} (${L.n(t.nights, 'noć', j)})`
}
/** „od 3. kolovoza”; talijanski „dall'8 / dall'11” */
function odDatuma(s, j) {
  const d = izDs(s)
  return r(j === 'it' && [8, 11].includes(d.getDate()) ? 'odIt' : 'od', j, { d: L.datum(d, { j }) })
}

/**
 * Podaci za tekst iz retka `properties` (+ sadržaji), na jeziku j.
 * Sadržaji se na stranom jeziku navode samo ako ih rječnik zna — inače bi
 * u njemačkom tekstu stajalo „Pogled na more”.
 */
export function podaci(prop, sadrzaji, j, link) {
  const f = []
  const nb = x => x.replace(' ', '\u00a0')             // „6 osoba” se ne lomi na slici
  if (prop.max_guests) f.push(nb(L.n(prop.max_guests, 'osoba', j)))
  if (prop.bedrooms) f.push(nb(L.n(prop.bedrooms, 'spavaća soba', j)))
  if (prop.bathrooms) f.push(nb(L.n(prop.bathrooms, 'kupaonica', j)))
  if (prop.size_m2) f.push(prop.size_m2 + '\u00a0m²')
  const s = []
  for (const ime of sadrzaji || []) {
    if (!ime) continue
    const x = String(ime).trim()
    if (j === 'hr' || /^wi-?fi$/i.test(x)) { s.push(x); continue }
    const p = L.tu(j, x)
    // rječnik ga zna ako ga prevodi barem na jedan jezik („Parking” je isti na engleskom)
    if (p !== x || ['en', 'de', 'it', 'pl', 'cs'].some(k => L.tu(k, x) !== x)) s.push(p)
  }
  const mjesto = String(prop.location || '').trim()
  const cijena = Number(prop.price_per_night) > 0 ? L.novac(prop.price_per_night, j) : ''
  return {
    ime: String(prop.name || '').trim(), mjesto, fakti: f.join(' · '), sadrzaji: s.slice(0, 6).join(' · '),
    cijena, link, opis: j === 'hr' ? String(prop.welcome_msg || '').trim() : '',
    domacin: String(prop.host_name || '').trim(), tel: String(prop.phone || '').trim(), mail: String(prop.email || '').trim()
  }
}

// '' = prazan red između odlomaka; null/false/undefined = izostavi
const red = (...x) => x.filter(v => v != null && v !== false).join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '')
const ili = v => v || null
const veliko = s => s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s
const mjestoTag = m => { const t = String(m || '').split(',')[0].replace(/[^\p{L}\p{N}]/gu, ''); return t ? '#' + t : '' }

/**
 * Četiri gotova teksta: Instagram, Facebook grupe, WhatsApp status, oglasnik.
 * `termin` = jedan od slobodniTermini() (ili vlastiti) za objavu „Slobodni
 * termini”; null = opća objava objekta.
 */
export function tekstovi(d, j, termin) {
  const naziv = [d.ime, d.mjesto].filter(Boolean).join(', ')
  const cij = d.cijena ? r('cijena', j, { c: d.cijena }) : ''
  const tt = terminTekst(termin, j)
  const slob = termin ? `☀️ ${r('pill', j)}: ${tt}` : ''
  const tagovi = [mjestoTag(d.mjesto), HASH[j]].filter(Boolean).join(' ')

  const instagram = red(
    ili(slob), slob ? '' : null,
    [d.ime, d.mjesto && '📍 ' + d.mjesto].filter(Boolean).join(' · '),
    ili(d.fakti), ili(d.sadrzaji), ili(cij), '',
    r('izravno', j), r('bio', j), '', tagovi)

  const facebook = red(
    r('pozdrav', j) + ' ' + (termin ? `${r('imamo', j)}: ${naziv} — ${tt}.` : `${r('predstavljamo', j)}: ${naziv}.`), '',
    ili(d.fakti), ili(d.sadrzaji), ili(cij), '',
    r('izravno', j), r('link', j, { l: d.link }))

  const whatsapp = termin
    ? `${slob} — ${naziv}.${d.cijena ? ' ' + veliko(r('cijenaKratko', j, { c: d.cijena })) + '.' : ''} ${d.link}`
    : `${naziv} — ${r('izravno', j)} ${d.link}`

  const crta = x => '• ' + x
  const kontakt = [d.domacin, d.tel, d.mail].filter(Boolean).join(' · ')
  const oglas = red(
    naziv, '',
    ili(d.opis), d.opis ? '' : null,
    ...(d.fakti ? d.fakti.split(' · ').map(crta) : []),
    ...(d.sadrzaji ? d.sadrzaji.split(' · ').map(crta) : []),
    cij ? crta(cij) : null, '',
    termin ? r('imamo', j) + ': ' + tt + '.' : null,
    r('izravno', j), r('link', j, { l: d.link }),
    kontakt ? r('kontakt', j) + ': ' + kontakt : null)

  return { instagram, facebook, whatsapp, oglas }
}

// ── slika (canvas) ────────────────────────────────────────────
export const FORMATI = { post: [1080, 1350], story: [1080, 1920] }
const BOJE = { petrol: '#103D4B', akcija: '#116D76', menta: '#A8E2D8', sunce: '#FFC93C', tinta: '#0A2A33' }

function prelomi(ctx, tekst, sirina, maxRedova = 2) {
  const rijeci = String(tekst).split(/[ \t\n]+/), redovi = []   // tvrdi razmak (\u00a0) ne lomi
  let r0 = ''
  for (const w of rijeci) {
    const p = r0 ? r0 + ' ' + w : w
    if (ctx.measureText(p).width <= sirina || !r0) r0 = p
    else { redovi.push(r0); r0 = w }
  }
  if (r0) redovi.push(r0)
  if (redovi.length > maxRedova) {
    const v = redovi.slice(0, maxRedova)
    let zadnji = v[maxRedova - 1]
    while (zadnji.length > 1 && ctx.measureText(zadnji + '…').width > sirina) zadnji = zadnji.slice(0, -1)
    v[maxRedova - 1] = zadnji.trimEnd() + '…'
    return v
  }
  return redovi
}
/** smanji pismo dok tekst ne stane u širinu */
function stani(ctx, tekst, sirina, tezina, velicina, obitelj, min = 18) {
  let v = velicina
  do { ctx.font = `${tezina} ${v}px ${obitelj}`; v -= 2 } while (ctx.measureText(tekst).width > sirina && v > min)
}
function zaobljeno(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function pokrij(ctx, img, x, y, W, H) {
  const iw = img.videoWidth || img.naturalWidth || img.width, ih = img.videoHeight || img.naturalHeight || img.height
  if (!iw || !ih) return
  const s = Math.max(W / iw, H / ih), w = iw * s, h = ih * s
  ctx.drawImage(img, x + (W - w) / 2, y + (H - h) / 2, w, h)
}
/** Sunce: krug + zrake (isti znak kao u prijedlogu loga). */
function sunce(ctx, x, y, r, boja, zraka = 8) {
  ctx.save(); ctx.fillStyle = boja; ctx.strokeStyle = boja; ctx.lineCap = 'round'; ctx.lineWidth = r * 0.42
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  for (let k = 0; k < zraka; k++) {
    const a = (k / zraka) * Math.PI * 2 + Math.PI / zraka
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6); ctx.lineTo(x + Math.cos(a) * r * 2.05, y + Math.sin(a) * r * 2.05); ctx.stroke()
  }
  ctx.restore()
}
/** Žuta naljepnica-sunce s cijenom, lagano nakrivljena. */
function naljepnica(ctx, x, y, R, d, j) {
  if (!d.cijena) return
  const [pre, post] = r('cijenaKratko', j, { c: '|' }).split('|').map(t => t.replace('/', '').trim())
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.16)
  ctx.shadowColor = 'rgba(10,42,51,.28)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8
  ctx.fillStyle = BOJE.sunce
  ctx.beginPath()
  const zubi = 16
  for (let k = 0; k <= zubi * 2; k++) {                 // valoviti rub, kao pečat
    const a = (k / (zubi * 2)) * Math.PI * 2, rr = k % 2 ? R * 0.93 : R
    k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(rr, 0)
  }
  ctx.closePath(); ctx.fill(); ctx.shadowColor = 'transparent'
  ctx.fillStyle = BOJE.petrol; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.font = `700 ${Math.round(R * 0.24)}px Manrope`; ctx.fillText(pre, 0, -R * 0.3)
  stani(ctx, d.cijena, R * 1.5, 800, Math.round(R * 0.5), 'Manrope')
  ctx.fillText(d.cijena, 0, R * 0.2)
  ctx.font = `700 ${Math.round(R * 0.22)}px Manrope`; ctx.fillText('/ ' + post, 0, R * 0.52)
  ctx.restore()
}
/** Oznaka (pilula) — „☀ SLOBODNO · 4 NOĆI” ili mjesto. */
function oznaka(ctx, x, y, tekst, { pozadina, boja, sa_suncem }) {
  if (!tekst) return 0
  ctx.save(); ctx.font = '800 32px Manrope'; ctx.textBaseline = 'middle'
  const pl = sa_suncem ? 76 : 30, tw = ctx.measureText(tekst).width, w = tw + pl + 30
  zaobljeno(ctx, x, y, w, 68, 34); ctx.fillStyle = pozadina; ctx.fill()
  if (sa_suncem) sunce(ctx, x + 40, y + 34, 10, boja)
  ctx.fillStyle = boja; ctx.fillText(tekst, x + pl, y + 36)
  ctx.restore(); return w
}
/** Kartica s QR kodom i adresom. */
function kartica(ctx, x, y, w, h, o, { pozadina = '#FFFFFF', sjena = true } = {}) {
  const j = o.j
  ctx.save()
  if (sjena) { ctx.shadowColor = 'rgba(10,42,51,.25)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10 }
  zaobljeno(ctx, x, y, w, h, 28); ctx.fillStyle = pozadina; ctx.fill(); ctx.restore()
  const qS = h - 48
  if (o.qr) ctx.drawImage(o.qr, x + 24, y + 24, qS, qS)
  const tx = x + 24 + (o.qr ? qS + 30 : 16), ts = x + w - 28 - tx
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
  ctx.fillStyle = BOJE.petrol; stani(ctx, r('izravnoKratko', j), ts, 800, 44, 'Manrope'); ctx.fillText(r('izravnoKratko', j), tx, y + h * 0.36)
  ctx.fillStyle = BOJE.akcija; stani(ctx, o.adresa || '', ts, 700, 32, 'Manrope'); ctx.fillText(o.adresa || '', tx, y + h * 0.6)
  ctx.fillStyle = '#536D77'; stani(ctx, r('bezProvizije', j), ts, 400, 26, '"DM Sans"'); ctx.fillText(r('bezProvizije', j), tx, y + h * 0.82)
}
/** Lukovi: fotografija u obliku kamenog luka (zaobljen vrh). */
function luk(ctx, x, y, w, h) {
  const rr = w / 2
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + rr); ctx.arc(x + rr, y + rr, rr, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath()
}
/** Tekstovi za sliku: naslov, podnaslov, sitni redak, sadržaj oznake. */
function sadrzajSlike(o) {
  const d = o.d, j = o.j, t = o.termin
  if (t) return {
    naslov: t.otvoren ? veliko(odDatuma(t.start, j)) : raspon(t.start, t.end, j),
    pod: [d.ime, d.mjesto].filter(Boolean).join(' · '),
    sitno: d.fakti,
    oznaka: (r('pill', j) + (t.otvoren ? '' : ' · ' + L.n(t.nights, 'noć', j))).toLocaleUpperCase(L.lokal(j)),
    sunce: true
  }
  return { naslov: d.ime, pod: d.fakti, sitno: d.sadrzaji.split(' · ').slice(0, 3).join(' · '), oznaka: d.mjesto, sunce: false }
}
/** Fotografija s Cloudinaryja u razumnoj veličini; crossOrigin da canvas ostane čitljiv. */
export function urlSlike(url) {
  if (!url) return ''
  return /\/image\/upload\//.test(url) && !/\/image\/upload\/[a-z]_/.test(url)
    ? url.replace('/image/upload/', '/image/upload/c_limit,w_1600,q_auto,f_jpg/') : url
}
export function ucitajSliku(url) {
  return new Promise(res => {
    if (!url) return res(null)
    const i = new Image(); i.crossOrigin = 'anonymous'
    i.onload = () => res(i); i.onerror = () => res(null)
    i.src = url
  })
}
export const PISMA = ['800 80px Manrope', '700 40px Manrope', '600 30px "DM Sans"', '400 30px "DM Sans"', '500 30px "DM Sans"', '600 80px Fraunces']
export const PREDLOSCI = { foto: 'Fotografija', razglednica: 'Razglednica', luk: 'Luk' }
const NASLOV = (v) => `600 ${v}px Fraunces, Georgia, serif`

/**
 * Nacrta objavu. o = { format, predlozak, j, d (podaci), termin, foto (Image|Video|null), qr (canvas|null), adresa }
 * Isti crtež služi i za svaku sličicu videa/GIF-a (foto = <video>).
 */
export function nacrtaj(canvas, o) {
  const [W, H] = FORMATI[o.format] || FORMATI.post
  if (canvas.width !== W) canvas.width = W
  if (canvas.height !== H) canvas.height = H
  const ctx = canvas.getContext('2d'), j = o.j, d = o.d
  const story = o.format === 'story', M = 64
  const top = story ? 200 : M, dno = story ? 290 : M     // story: Instagram gore i dolje crta svoje
  const t = sadrzajSlike(o)
  const pozadinaFoto = (x, y, w, h) => {
    if (o.foto) pokrij(ctx, o.foto, x, y, w, h)
    else { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, BOJE.akcija); g.addColorStop(1, BOJE.petrol); ctx.fillStyle = g; ctx.fillRect(x, y, w, h) }
  }
  ctx.save(); ctx.textAlign = 'left'
  const pred = o.predlozak || 'foto'

  if (pred === 'foto') {
    pozadinaFoto(0, 0, W, H)
    let v = ctx.createLinearGradient(0, 0, 0, H * 0.25)
    v.addColorStop(0, 'rgba(10,42,51,.45)'); v.addColorStop(1, 'rgba(10,42,51,0)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H * 0.25)
    v = ctx.createLinearGradient(0, H * 0.34, 0, H)
    v.addColorStop(0, 'rgba(10,42,51,0)'); v.addColorStop(0.42, 'rgba(10,42,51,.8)'); v.addColorStop(1, 'rgba(10,42,51,.96)')
    ctx.fillStyle = v; ctx.fillRect(0, H * 0.34, W, H * 0.66)
    oznaka(ctx, M, top, t.oznaka, { pozadina: t.sunce ? BOJE.sunce : 'rgba(255,255,255,.94)', boja: BOJE.petrol, sa_suncem: t.sunce })
    naljepnica(ctx, W - M - 118, top + 150, 118, d, j)
    const kH = 228, kY = H - dno - kH
    kartica(ctx, M, kY, W - 2 * M, kH, o)
    // tekst iznad kartice, odozdo prema gore
    let y = kY - 46
    const pisi = (tekst, font, boja, razmak, max = 1) => {
      if (!tekst) return; ctx.font = font; ctx.fillStyle = boja
      const red = prelomi(ctx, tekst, W - 2 * M, max)
      for (let i = red.length - 1; i >= 0; i--) { ctx.fillText(red[i], M, y); y -= razmak }
      y -= 12
    }
    pisi(t.sitno, '500 30px "DM Sans"', 'rgba(255,255,255,.8)', 40)
    pisi(t.pod, '700 40px Manrope', BOJE.menta, 50, 2)
    const vel = story ? 112 : 100
    pisi(t.naslov, NASLOV(vel), '#FFFFFF', vel + 4, 2)
  }

  else if (pred === 'razglednica') {
    ctx.fillStyle = '#FBF6EA'; ctx.fillRect(0, 0, W, H)           // topli papir
    const fx = 48, fy = story ? top - 40 : 48, fw = W - 96, fh = Math.round(H * (story ? 0.48 : 0.5))
    ctx.save(); zaobljeno(ctx, fx, fy, fw, fh, 32); ctx.clip(); pozadinaFoto(fx, fy, fw, fh)
    const v = ctx.createLinearGradient(0, fy, 0, fy + 160); v.addColorStop(0, 'rgba(10,42,51,.35)'); v.addColorStop(1, 'rgba(10,42,51,0)')
    ctx.fillStyle = v; ctx.fillRect(fx, fy, fw, 160); ctx.restore()
    oznaka(ctx, fx + 28, fy + 28, t.oznaka, { pozadina: t.sunce ? BOJE.sunce : 'rgba(255,255,255,.94)', boja: BOJE.petrol, sa_suncem: t.sunce })
    naljepnica(ctx, W - 150, fy + fh - 10, 112, d, j)
    let y = fy + fh + (story ? 120 : 100)
    const vel = story ? 104 : 88
    ctx.fillStyle = BOJE.petrol; ctx.font = NASLOV(vel)
    for (const red of prelomi(ctx, t.naslov, W - 2 * M - (d.cijena ? 150 : 0), 2)) { ctx.fillText(red, M, y); y += vel + 4 }
    y += 6; ctx.font = '700 38px Manrope'; ctx.fillStyle = BOJE.akcija
    if (t.pod) for (const red of prelomi(ctx, t.pod, W - 2 * M, 2)) { ctx.fillText(red, M, y); y += 48 }
    ctx.font = '500 30px "DM Sans"'; ctx.fillStyle = '#536D77'
    if (t.sitno) { ctx.fillText(prelomi(ctx, t.sitno, W - 2 * M, 1)[0], M, y + 4) }
    // crtkana crta kao na razglednici, pa QR
    const kH = 216, kY = H - dno - kH
    ctx.save(); ctx.setLineDash([14, 12]); ctx.strokeStyle = 'rgba(16,61,75,.25)'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(M, kY - 34); ctx.lineTo(W - M, kY - 34); ctx.stroke(); ctx.restore()
    kartica(ctx, M - 24, kY, W - 2 * M + 48, kH, o, { pozadina: '#FBF6EA', sjena: false })
  }

  else {                                                          // luk
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, BOJE.petrol); g.addColorStop(1, BOJE.tinta)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    sunce(ctx, W - 150, story ? top + 40 : 120, 26, 'rgba(255,201,60,.9)')
    const lw = story ? 760 : 640, lh = story ? 880 : 640, lx = (W - lw) / 2, ly = story ? top + 60 : 96
    ctx.save(); luk(ctx, lx, ly, lw, lh); ctx.clip(); pozadinaFoto(lx, ly, lw, lh); ctx.restore()
    ctx.save(); luk(ctx, lx - 14, ly - 14, lw + 28, lh + 14); ctx.strokeStyle = 'rgba(168,226,216,.55)'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore()
    naljepnica(ctx, lx + lw - 20, ly + lh - 40, 104, d, j)
    ctx.textAlign = 'center'
    let y = ly + lh + (story ? 130 : 96)
    if (t.oznaka) {
      ctx.font = '800 30px Manrope'; ctx.fillStyle = t.sunce ? BOJE.sunce : BOJE.menta
      ctx.fillText(t.oznaka.toLocaleUpperCase(L.lokal(j)), W / 2, y); y += story ? 104 : 86
    }
    const vel = story ? 100 : 80
    ctx.font = NASLOV(vel); ctx.fillStyle = '#FFFFFF'
    for (const red of prelomi(ctx, t.naslov, W - 2 * M, 2)) { ctx.fillText(red, W / 2, y); y += vel + 4 }
    ctx.font = '600 34px "DM Sans"'; ctx.fillStyle = 'rgba(255,255,255,.82)'
    if (t.pod) ctx.fillText(prelomi(ctx, t.pod, W - 2 * M, 1)[0], W / 2, y + 2)
    ctx.textAlign = 'left'
    const kH = 210
    kartica(ctx, M, H - dno - kH, W - 2 * M, kH, o)
  }
  ctx.restore()
  return canvas
}

// ── letak za ispis (A4, četiri kartice A6) ─────────────────────
const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
export function letakHtml({ j, d, qrUrl, adresa, foto }) {
  const kontakt = [d.domacin, d.tel, d.mail].filter(Boolean).map(escH).join(' · ')
  const kartica = `<article class="k">
    ${foto ? `<div class="f" style="background-image:url('${escH(foto)}')"></div>` : '<div class="f f--bez"></div>'}
    <div class="t">
      <h1>${escH(d.ime)}</h1>${d.mjesto ? `<p class="m">${escH(d.mjesto)}</p>` : ''}
      <p class="h">${escH(r('hvala', j))}</p>
      <p>${escH(r('sljedeci', j))}</p>
      <div class="q"><img src="${escH(qrUrl)}" alt=""><div><b>${escH(r('skeniraj', j))}</b><span>${escH(adresa)}</span>${kontakt ? `<small>${kontakt}</small>` : ''}</div></div>
    </div></article>`
  return `<!doctype html><html lang="${j}"><head><meta charset="utf-8"><title>${escH(d.ime)} — letak</title>
<!-- skripta ispisa stoji ispred fontova: spori ili blokirani font ne smije zaustaviti ispis -->
<script>(()=>{let gotovo=false;const ispis=()=>{if(gotovo)return;gotovo=true;setTimeout(()=>print(),300)}
const cekaj=()=>Promise.all([...document.images].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r}))).then(()=>document.fonts&&document.fonts.ready).then(ispis,ispis)
if(document.readyState==='complete')cekaj();else addEventListener('load',cekaj)
setTimeout(ispis,4000)})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=DM+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:"DM Sans",system-ui,sans-serif;color:#103D4B;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.list{width:210mm;height:297mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.k{border:.2mm dashed #B9C7CC;display:flex;flex-direction:column;overflow:hidden}
.f{height:44mm;background:#116D76 center/cover no-repeat}
.f--bez{background:linear-gradient(135deg,#116D76,#103D4B)}
.t{flex:1;padding:6mm 7mm;display:flex;flex-direction:column;gap:1.6mm}
h1{margin:0;font:800 6.2mm/1.15 Manrope,sans-serif;letter-spacing:-.02em}
.m{margin:0;color:#536D77;font-size:3.4mm}
.h{margin:1.5mm 0 0;font:700 4.1mm/1.3 Manrope,sans-serif;color:#116D76}
p{margin:0;font-size:3.5mm;line-height:1.4}
.q{margin-top:auto;display:flex;gap:4mm;align-items:center}
.q img{width:30mm;height:30mm;display:block}
.q b{display:block;font:700 3.4mm/1.3 Manrope,sans-serif}
.q span{display:block;margin-top:1mm;font-weight:600;font-size:3.3mm;color:#116D76;word-break:break-all}
.q small{display:block;margin-top:1.4mm;font-size:2.9mm;color:#536D77}
.upute{font:14px/1.5 "DM Sans",sans-serif;padding:16px 20px;background:#EDF5F6}
@media print{.upute{display:none}}
</style></head><body>
<p class="upute">Četiri kartice na jednom listu A4 — izrežite po isprekidanim crtama. Ispis se otvara sam; ako ne, pritisnite Ctrl + P (na Macu ⌘ + P).</p>
<div class="list">${kartica.repeat(4)}</div>

</body></html>`
}
