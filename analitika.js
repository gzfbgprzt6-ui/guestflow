/* ==========================================================================
   analitika.js — izračuni i grafikoni za analitiku domaćina (dashboard.html)
   i platforme (admin.html). Bez biblioteke i bez build koraka.

   Ulaz su redovi iz POSTOJEĆIH tablica, bez novih stupaca:
     page_views   property_id, view_type, timestamp
     availability property_id, date (zauzeta noć), source, booking_id
     bookings     id, guest_name, checkin_date, checkout_date, is_active, …

   view_type vrijednosti: public, guest_hub, inquiry_whatsapp, inquiry_email,
   inquiry_copy, map, guide:<podstranica>. Prve dvije postoje od početka;
   ostale se bilježe od rujna 2026. (p.html, h.html).

   Datumi su lokalni nizovi „YYYY-MM-DD”. Noć je datum dolaska u tu noć, pa
   boravak 12.–19. ima noći 12…18, a 19. je dan odlaska (isto kao iCal DTEND).
   ========================================================================== */

// ---------- datumi ----------
export const ds = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const danas = () => ds(new Date())
export const uDatum = s => new Date(s + 'T00:00:00')
export const plusDana = (s, n) => { const d = uDatum(s); d.setDate(d.getDate() + n); return ds(d) }
export const razlikaDana = (a, b) => Math.round((uDatum(b) - uDatum(a)) / 864e5)
export const tsUDan = ts => ds(new Date(ts))

const MJ_KRATKO = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro']
const MJ_DUGO = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac']
const DAN_KRATKO = ['ned', 'pon', 'uto', 'sri', 'čet', 'pet', 'sub']
export const DANI_TJEDNA = ['pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned']

export const fmtKratko = s => { const d = uDatum(s); return `${d.getDate()}. ${d.getMonth() + 1}.` }
export const fmtSDanom = s => { const d = uDatum(s); return `${DAN_KRATKO[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.` }
export const mjKratko = m => MJ_KRATKO[m]
export const mjDugo = m => MJ_DUGO[m]

// ---------- tekst ----------
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
/** hrvatski množinski oblik: mn(5,'noć','noći','noći') */
export const mn = (n, a, b, c) => {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c
}
export const noci = n => `${n} ${mn(n, 'noć', 'noći', 'noći')}`
export const posto = x => `${Math.round(x * 100)} %`
export const eur = n => `${Math.round(n).toLocaleString('hr-HR')} €`

/** Promjena u odnosu na prethodno razdoblje; null kad se nema s čim usporediti. */
export function promjena(sad, prije) {
  if (!prije) return sad ? { txt: 'novo', smjer: 1 } : null
  const p = (sad - prije) / prije
  const r = Math.round(p * 100)
  return { txt: (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r) + ' %', smjer: Math.sign(r) }
}

// ---------- vrste pregleda ----------
export const JE_UPIT = t => typeof t === 'string' && t.startsWith('inquiry_')
export const KANAL = { inquiry_whatsapp: 'WhatsApp', inquiry_email: 'E-mail', inquiry_copy: 'Kopirana poruka' }
export const DIO_VODICA = { 'guide:dolazak': 'Dolazak', 'guide:kuca': 'Wi-Fi i kuća', 'guide:preporuke': 'Preporuke', 'guide:domacin': 'Domaćin' }

// ---------- boravci i noći ----------
export const IZVOR = {
  ical_booking: 'Booking.com',
  ical_airbnb: 'Airbnb',
  odmoria: 'Rezervacija u Odmoriji',
  manual: 'Ručno označeno'
}
export const JE_PLATFORMA = s => s === 'ical_booking' || s === 'ical_airbnb'

function izvorNoci(r) {
  if (JE_PLATFORMA(r.source)) return r.source
  return r.booking_id ? 'odmoria' : 'manual'
}

/**
 * Boravci iz zauzetih noći: uzastopne noći istog izvora (i iste rezervacije)
 * čine jedan boravak. Rezervacije iz Odmorije daju ime gosta; one koje nemaju
 * noći u kalendaru dodaju se zasebno (`bezKalendara`) — vide se u dolascima,
 * ali ne ulaze u popunjenost, jer popunjenost čita samo kalendar.
 */
export function boravci(nociRedovi, rezervacije = []) {
  const redovi = [...nociRedovi].filter(r => r && r.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const out = []
  let cur = null
  for (const r of redovi) {
    const src = izvorNoci(r), bid = r.booking_id || null
    if (cur && cur.end === r.date && cur.source === src && cur.bookingId === bid) { cur.end = plusDana(r.date, 1); cur.nights++; continue }
    if (cur && cur.end > r.date) continue
    cur = { start: r.date, end: plusDana(r.date, 1), nights: 1, source: src, bookingId: bid }
    out.push(cur)
  }
  const poId = new Map(rezervacije.map(b => [b.id, b]))
  const iskoristeno = new Set()
  for (const s of out) {
    let b = s.bookingId && poId.get(s.bookingId)
    // stare rezervacije (prije stupca booking_id): isti datumi = ista rezervacija
    if (!b && s.source === 'manual') b = rezervacije.find(x => !iskoristeno.has(x.id) && x.checkin_date === s.start && x.checkout_date === s.end)
    if (b) { s.booking = b; iskoristeno.add(b.id); if (s.source === 'manual') s.source = 'odmoria' }
  }
  for (const b of rezervacije) {
    if (iskoristeno.has(b.id) || !b.checkin_date || !b.checkout_date || b.checkout_date <= b.checkin_date) continue
    // link napravljen za gosta s Bookinga/Airbnba: isti boravak, samo dobiva ime
    const preklop = out.find(s => !s.booking && !s.bezKalendara && s.start < b.checkout_date && s.end > b.checkin_date)
    if (preklop) { preklop.booking = b; iskoristeno.add(b.id); continue }
    out.push({ start: b.checkin_date, end: b.checkout_date, nights: razlikaDana(b.checkin_date, b.checkout_date), source: 'odmoria', bookingId: b.id, booking: b, bezKalendara: true })
  }
  return out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
}

/** Ime gosta ako ga domaćin zna (rezervacija u Odmoriji), inače „Gost” / „Zauzeto”. */
export const imeBoravka = s => s.booking?.guest_name || (s.source === 'manual' ? 'Zauzeto' : 'Gost')

/** Popunjenost u [od, do): zauzete noći / sve noći. */
export function popunjenost(zauzete, od, doD) {
  const ukupno = Math.max(0, razlikaDana(od, doD))
  let zauzeto = 0
  for (let d = od; d < doD; d = plusDana(d, 1)) if (zauzete.has(d)) zauzeto++
  return { zauzeto, ukupno, udio: ukupno ? zauzeto / ukupno : 0 }
}

/** Popunjenost po kalendarskim mjesecima, počevši od (godina, mjesec). */
export function popunjenostPoMjesecima(zauzete, godina, mjesec, koliko) {
  const out = []
  for (let i = 0; i < koliko; i++) {
    const d = new Date(godina, mjesec + i, 1)
    const od = ds(d), doD = ds(new Date(d.getFullYear(), d.getMonth() + 1, 1))
    out.push({ oznaka: MJ_KRATKO[d.getMonth()], dugo: `${MJ_DUGO[d.getMonth()]} ${d.getFullYear()}.`, g: d.getFullYear(), m: d.getMonth(), ...popunjenost(zauzete, od, doD) })
  }
  return out
}

/**
 * Praznine: slobodni nizovi noći unutar [od, do) omeđeni zauzetom noći s obje
 * strane i ne dulji od `najvise` noći — termini koje je teško popuniti.
 */
export function praznine(zauzete, od, doD, najvise = 7) {
  const out = []
  let d = od
  while (d < doD) {
    if (zauzete.has(d)) { d = plusDana(d, 1); continue }
    const start = d
    while (d < doD && !zauzete.has(d)) d = plusDana(d, 1)
    const n = razlikaDana(start, d)
    if (zauzete.has(plusDana(start, -1)) && d < doD && zauzete.has(d) && n <= najvise) out.push({ start, end: d, nights: n })
  }
  return out
}

/** Noći po izvoru unutar [od, do), iz boravaka (izvor je tamo već ispravljen). */
export function nociPoIzvoru(boravciLista, od, doD) {
  const c = {}
  for (const s of boravciLista) {
    if (s.bezKalendara) continue
    const a = s.start > od ? s.start : od, b = s.end < doD ? s.end : doD
    const n = razlikaDana(a, b)
    if (n > 0) c[s.source] = (c[s.source] || 0) + n
  }
  return c
}

/** Dolasci i odlasci u [od, do), grupirani po danu. */
export function dogadjaji(boravciLista, od, doD) {
  const dani = new Map()
  const dodaj = (dan, e) => { if (dan >= od && dan < doD) { if (!dani.has(dan)) dani.set(dan, []); dani.get(dan).push(e) } }
  for (const s of boravciLista) {
    dodaj(s.start, { vrsta: 'dolazak', boravak: s })
    dodaj(s.end, { vrsta: 'odlazak', boravak: s })
  }
  return [...dani.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([dan, e]) => ({
    dan,
    dolasci: e.filter(x => x.vrsta === 'dolazak').map(x => x.boravak),
    odlasci: e.filter(x => x.vrsta === 'odlazak').map(x => x.boravak)
  }))
}

/** Boravci s Bookinga/Airbnba za koje u Odmoriji nema rezervacije ni linka za vodič. */
export function boravciBezLinka(boravciLista, rezervacije, od, doD) {
  return boravciLista.filter(s => JE_PLATFORMA(s.source) && s.end > od && s.start < doD &&
    !rezervacije.some(b => b.checkin_date && b.checkout_date && b.checkin_date < s.end && b.checkout_date > s.start))
}

// ---------- pregledi ----------
/**
 * Pregledi grupirani u stupce za grafikon. korak: 'dan' | 'tjedan' | 'mjesec'.
 * `filtar` bira vrste (npr. t => t === 'public').
 */
export function kante(pregledi, od, doD, korak, filtar = () => true) {
  const out = []
  if (korak === 'mjesec') {
    const a = uDatum(od)
    let d = new Date(a.getFullYear(), a.getMonth(), 1)
    while (ds(d) < doD) {
      const n = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      out.push({ od: ds(d) < od ? od : ds(d), do: ds(n) > doD ? doD : ds(n), oznaka: MJ_KRATKO[d.getMonth()], v: 0 })
      d = n
    }
  } else {
    const k = korak === 'tjedan' ? 7 : 1
    for (let d = od; d < doD; d = plusDana(d, k)) {
      const e = plusDana(d, k)
      out.push({ od: d, do: e > doD ? doD : e, oznaka: fmtKratko(d), v: 0 })
    }
  }
  for (const r of pregledi) {
    if (!filtar(r.view_type)) continue
    const dan = tsUDan(r.timestamp)
    if (dan < od || dan >= doD) continue
    const b = out.find(x => dan >= x.od && dan < x.do)
    if (b) b.v++
  }
  return out
}

export const broji = (pregledi, filtar, od, doD) => pregledi.reduce((z, r) => {
  if (!filtar(r.view_type)) return z
  const dan = tsUDan(r.timestamp)
  return dan >= od && dan < doD ? z + 1 : z
}, 0)

/** Raspodjela po danu u tjednu (pon…ned) i po satu (0–23). */
export function poDanuISatu(pregledi, filtar) {
  const dani = Array(7).fill(0), sati = Array(24).fill(0)
  for (const r of pregledi) {
    if (!filtar(r.view_type)) continue
    const d = new Date(r.timestamp)
    dani[(d.getDay() + 6) % 7]++
    sati[d.getHours()]++
  }
  return { dani, sati }
}

/** Dohvat svih redova s podjelom na stranice po 1000 (Supabase vraća najviše 1000). */
export async function sviRedovi(upit, najvise = 50000) {
  const out = []
  for (let i = 0; i < najvise; i += 1000) {
    const { data, error } = await upit().range(i, i + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

// ---------- prikaz (HTML nizovi; stil u analitika.css) ----------
/**
 * Stupčasti grafikon. `stupci`: [{oznaka, v, naslov?}]. Stupci su HTML, ne SVG,
 * pa tekst ostaje čitljiv na svakoj širini. Uvijek ide uz tablicu (`tablicaStupaca`).
 */
export function grafikon(stupci, { aria = 'Grafikon', fmt = v => String(v), vrijednosti = false, istakni = -1, oznakaSvaki = 0, visina = 160, maks = 0 } = {}) {
  // `maks` drži istu skalu za više grafikona jedan ispod drugoga
  const max = Math.max(maks, ...stupci.map(s => s.v))
  const svaki = oznakaSvaki || Math.max(1, Math.ceil(stupci.length / 8))
  const zadnji = stupci.length - 1
  return `<figure class="an-bars" role="img" aria-label="${esc(aria)}">
    <div class="an-plot" style="height:${visina}px">${max ? `<span class="an-max">${esc(fmt(max))}</span>` : ''}
      ${stupci.map((s, i) => {
        const h = max ? s.v / max * 100 : 0
        return `<div class="an-col${s.v ? '' : ' is-zero'}${i === istakni ? ' is-now' : ''}" title="${esc((s.naslov || s.oznaka) + ': ' + fmt(s.v))}">
          ${vrijednosti && s.v ? `<b>${esc(fmt(s.v))}</b>` : ''}<i style="height:${h.toFixed(1)}%"></i></div>`
      }).join('')}
    </div>
    <div class="an-x" aria-hidden="true">${stupci.map((s, i) => `<span>${i % svaki === 0 || (i === zadnji && stupci.length <= 12) ? esc(s.oznaka) : ''}</span>`).join('')}</div>
  </figure>`
}

export function tablica(zaglavlje, redovi) {
  return `<div class="an-tblwrap"><table class="an-tbl"><thead><tr>${zaglavlje.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${redovi.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
}

export const kaoTablica = (zaglavlje, redovi) =>
  `<details class="an-details"><summary>Prikaži kao tablicu</summary>${tablica(zaglavlje, redovi)}</details>`

/** Rangirani vodoravni stupci. `redovi`: [{k, v, sub?}] */
export function rang(redovi, { fmt = v => String(v) } = {}) {
  const max = Math.max(1, ...redovi.map(r => r.v))
  return `<div class="an-rank">${redovi.map(r => `<div class="an-rank__r">
      <span class="an-rank__k">${esc(r.k)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>
      <span class="an-rank__v">${esc(fmt(r.v))}</span>
      <span class="an-rank__t" aria-hidden="true"><i style="width:${(r.v / max * 100).toFixed(1)}%"></i></span>
    </div>`).join('')}</div>`
}

/** Pločica s brojkom. `delta` je rezultat funkcije `promjena`. */
export function kpi(oznaka, vrijednost, podnaslov = '', delta = null) {
  return `<div class="an-kpi"><span class="an-kpi__l">${esc(oznaka)}</span>
    <span class="an-kpi__v">${esc(vrijednost)}</span>
    <span class="an-kpi__s">${delta ? `<span class="an-delta${delta.smjer < 0 ? ' is-down' : ''}">${esc(delta.txt)}</span> ` : ''}${esc(podnaslov)}</span></div>`
}

export const prazno = tekst => `<p class="an-empty">${esc(tekst)}</p>`
