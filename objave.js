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
  if (prop.max_guests) f.push(L.n(prop.max_guests, 'osoba', j))
  if (prop.bedrooms) f.push(L.n(prop.bedrooms, 'spavaća soba', j))
  if (prop.bathrooms) f.push(L.n(prop.bathrooms, 'kupaonica', j))
  if (prop.size_m2) f.push(prop.size_m2 + ' m²')
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
  const rijeci = String(tekst).split(/\s+/), redovi = []
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
function pokrij(ctx, img, W, H) {
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
  const w = img.naturalWidth * s, h = img.naturalHeight * s
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
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
export const PISMA = ['800 80px Manrope', '700 40px Manrope', '600 30px "DM Sans"', '400 30px "DM Sans"']

/**
 * Nacrta objavu. o = { format, j, d (podaci), termin, foto (Image|null), qr (canvas|null), adresa }
 */
export function nacrtaj(canvas, o) {
  const [W, H] = FORMATI[o.format] || FORMATI.post
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d'), j = o.j, d = o.d
  const story = o.format === 'story'
  const M = 64                                           // rub
  // pozadina
  if (o.foto) pokrij(ctx, o.foto, W, H)
  else {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, BOJE.akcija); g.addColorStop(1, BOJE.petrol)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }
  // veo: gore lagano (za oznaku), dolje jako (za tekst)
  let v = ctx.createLinearGradient(0, 0, 0, H * 0.25)
  v.addColorStop(0, 'rgba(10,42,51,.45)'); v.addColorStop(1, 'rgba(10,42,51,0)')
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H * 0.25)
  v = ctx.createLinearGradient(0, H * 0.36, 0, H)
  v.addColorStop(0, 'rgba(10,42,51,0)'); v.addColorStop(0.4, 'rgba(10,42,51,.78)'); v.addColorStop(1, 'rgba(10,42,51,.95)')
  ctx.fillStyle = v; ctx.fillRect(0, H * 0.36, W, H * 0.64)

  // oznaka gore lijevo: „SLOBODNO” (žuto) ili mjesto (bijelo)
  const vrh = story ? 200 : M
  const oznaka = o.termin ? r('pill', j).toLocaleUpperCase(L.lokal(j)) : d.mjesto
  if (oznaka) {
    ctx.font = '800 34px Manrope'
    const tw = Math.min(ctx.measureText(oznaka).width, W - 2 * M - 56)
    zaobljeno(ctx, M, vrh, tw + 56, 68, 34)
    ctx.fillStyle = o.termin ? BOJE.sunce : 'rgba(255,255,255,.92)'; ctx.fill()
    ctx.fillStyle = BOJE.petrol; ctx.textBaseline = 'middle'
    ctx.fillText(oznaka, M + 28, vrh + 35, tw)
  }

  // kartica dolje: QR + „Rezervirajte izravno” + adresa
  const kH = 236, kY = H - (story ? 300 : M) - kH
  zaobljeno(ctx, M, kY, W - 2 * M, kH, 28); ctx.fillStyle = '#FFFFFF'; ctx.fill()
  const qS = kH - 48
  if (o.qr) ctx.drawImage(o.qr, M + 24, kY + 24, qS, qS)
  const tx = M + 24 + (o.qr ? qS + 32 : 16), tsir = W - M - 32 - tx
  ctx.textBaseline = 'alphabetic'; ctx.fillStyle = BOJE.petrol
  stani(ctx, r('izravnoKratko', j), tsir, 800, 46, 'Manrope')
  ctx.fillText(r('izravnoKratko', j), tx, kY + 82)
  ctx.fillStyle = BOJE.akcija
  stani(ctx, o.adresa || '', tsir, 700, 34, 'Manrope')
  ctx.fillText(o.adresa || '', tx, kY + 136)
  ctx.fillStyle = '#536D77'
  stani(ctx, r('bezProvizije', j), tsir, 400, 27, '"DM Sans"')
  ctx.fillText(r('bezProvizije', j), tx, kY + 186)

  // tekst iznad kartice, slaže se odozdo prema gore
  let y = kY - 48
  const pisi = (tekst, font, boja, razmak, maxRedova = 1) => {
    if (!tekst) return
    ctx.font = font; ctx.fillStyle = boja
    const redovi = prelomi(ctx, tekst, W - 2 * M, maxRedova)
    for (let i = redovi.length - 1; i >= 0; i--) { ctx.fillText(redovi[i], M, y); y -= razmak }
    y -= 14
  }
  const cij = d.cijena ? r('cijenaKratko', j, { c: d.cijena }) : ''
  if (o.termin) {
    pisi([d.ime, d.mjesto].filter(Boolean).join(' · '), '600 36px "DM Sans"', 'rgba(255,255,255,.88)', 46, 2)
    pisi([o.termin.otvoren ? '' : L.n(o.termin.nights, 'noć', j), cij].filter(Boolean).join(' · '), '700 44px Manrope', BOJE.menta, 54)
    const vel = story ? 104 : 96
    const dat = o.termin.otvoren ? veliko(odDatuma(o.termin.start, j)) : raspon(o.termin.start, o.termin.end, j)
    ctx.font = `800 ${vel}px Manrope`
    pisi(dat, `800 ${vel}px Manrope`, '#FFFFFF', vel + 6, 2)
  } else {
    pisi(cij, '700 44px Manrope', BOJE.sunce, 54)
    pisi(d.fakti, '600 34px "DM Sans"', 'rgba(255,255,255,.88)', 44, 2)
    const vel = story ? 100 : 92
    pisi(d.ime, `800 ${vel}px Manrope`, '#FFFFFF', vel + 6, 2)
  }
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
