// ============================================================================
//  Odmoria — prijedlozi adrese dok domaćin tipka (kao na Google Maps)
//  ---------------------------------------------------------------------------
//  Photon (komoot, podaci OpenStreetMap): besplatan, bez ključa, napravljen
//  za „traži dok tipkaš”. Nominatim to izričito NE dopušta, zato ovdje nije.
//  Zahtjev ide tek 300 ms nakon zadnjeg slova, od 3 znaka, a stariji se
//  prekida — jedan domaćin = nekoliko zahtjeva po polju (pravilo poštene upotrebe).
//
//    predloziAdresu(input, { vrsta: 'adresa' | 'mjesto', odabrano(x) })
//
//  vrsta 'mjesto' nudi samo mjesta (grad, selo, kvart) — za JAVNU „Lokaciju”,
//  da se točna adresa ne nudi na javnoj stranici. 'adresa' nudi i ulice i
//  kućne brojeve (privatna „Točna adresa”, pretraga mjesta u blizini).
//
//  Lokacija uređaja: ako je već dopuštena, prijedlozi su odmah oko domaćina;
//  inače prvi red nudi „Koristi moju trenutnu lokaciju” (preglednik tek tada
//  pita) — i predloži adresu na kojoj domaćin stoji. Bez nje prednost ima
//  Hrvatska. Domaćin i dalje smije upisati što hoće — prijedlog nije obavezan.
//
//  Odabir upiše tekst u polje i okine 'input' i 'change' (pregled uživo,
//  traka za spremanje). Adrese nose translate="no" (domacin-jezik.js ih ne
//  dira); natpis „© OpenStreetMap suradnici” je obavezan (ODbL).
// ============================================================================

const PHOTON = 'https://photon.komoot.io'
const HRVATSKA = { lat: 44.6, lon: 16.4, zoom: 7 }

const CSS = `
.odm-adr-omot{position:relative}
/* fixed (ne absolute): kartica s overflow:hidden ga inače odreže; mjesto računa smjesti() */
.odm-adr{position:fixed;z-index:1000;margin:0;padding:6px 0 0;box-sizing:border-box;
  background:var(--paper,var(--bg-surface,#fff));color:var(--ink,var(--text,#103D4B));
  border:1px solid var(--line,var(--border,#D5DEE1));border-radius:var(--radius-sm,var(--radius-control,10px));
  box-shadow:0 12px 32px rgba(10,42,51,.16);font:500 15px/1.35 var(--font-body,"DM Sans",system-ui,sans-serif);overflow:hidden}
.odm-adr[hidden]{display:none}
.odm-adr ul{list-style:none;margin:0;padding:0;max-height:320px;overflow:auto}
.odm-adr li{display:flex;gap:10px;align-items:flex-start;padding:9px 14px;cursor:pointer}
.odm-adr li[aria-selected="true"],.odm-adr li:hover{background:var(--paper-2,var(--bg-wash,#EDF5F6))}
.odm-adr li.odm-adr__ne{cursor:default;color:var(--muted,var(--text-muted,#536D77))}
.odm-adr li.odm-adr__ne:hover{background:none}
.odm-adr svg{flex:none;width:18px;height:18px;margin-top:1px;color:var(--copper,var(--action,#116D76))}
.odm-adr b{display:block;font-weight:600}
.odm-adr small{display:block;color:var(--muted,var(--text-muted,#536D77));font-size:13px}
.odm-adr__izvor{margin:0;padding:6px 14px 8px;font-size:12px;color:var(--muted,var(--text-muted,#536D77));border-top:1px solid var(--line,var(--border,#E3E9EB))}
`
const IKONA_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
const IKONA_GEO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg>'

let stil = false, brojac = 0
// lokacija uređaja dijeli se među poljima na stranici
let POLOZAJ = null, geoNeDa = false

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** Kućni broj koji je domaćin upisao: „Ulica krušaka 1, Zagreb” → „1”.
    Photon često zna ulicu, ali ne i broj — tada se broj prenese u prijedlog. */
export function kucniBroj(q) {
  const prvi = String(q || '').split(',')[0].trim()
  const m = prvi.match(/\s(\d{1,4}\s?[a-zA-Z]?|bb)$/i)
  return m ? m[1].replace(/\s+/g, '').toLowerCase() : ''
}

// Država na jeziku sučelja („Croatia” → „Hrvatska”), iz ISO koda
let IMENA = null
function drzava(p) {
  const kod = (p.countrycode || '').toUpperCase()
  if (kod && typeof Intl !== 'undefined' && Intl.DisplayNames) {
    try {
      IMENA = IMENA || new Intl.DisplayNames([(typeof document !== 'undefined' && document.documentElement.lang) || 'hr'], { type: 'region' })
      return IMENA.of(kod) || p.country || ''
    } catch {}
  }
  return p.country || ''
}

/** Photon feature → { tekst (u polje), opis (drugi red), lat, lon } ili null.
    broj = kućni broj iz upita; dopisuje se ulici koja ga u podacima nema. */
export function oblikuj(f, vrsta = 'adresa', broj = '') {
  const p = { ...((f && f.properties) || {}) }
  p.country = drzava(p)
  const g = f && f.geometry && f.geometry.coordinates
  if (!g) return null
  if (['country', 'state', 'county'].includes(p.type)) return null
  const mjesto = p.city || p.town || p.village || p.locality || p.district || ''
  const jeMjesto = p.osm_key === 'place' || ['city', 'district', 'locality'].includes(p.type)
  if (vrsta === 'mjesto') {
    if (!jeMjesto || !p.name) return null
    return { tekst: [p.name, p.country].filter(Boolean).join(', '), opis: p.county || p.state || '', lat: g[1], lon: g[0] }
  }
  let prvi
  if (p.housenumber && p.street) prvi = `${p.street} ${p.housenumber}`
  else if (p.type === 'street' || (p.osm_key === 'highway')) prvi = p.name && broj ? `${p.name} ${broj}` : p.name
  else if (jeMjesto) prvi = p.name
  else prvi = [p.name, p.street && (p.street + (p.housenumber ? ' ' + p.housenumber : ''))].filter(Boolean).join(', ')
  if (!prvi) return null
  const tekst = jeMjesto ? [prvi, p.country].filter(Boolean).join(', ') : [prvi, mjesto].filter(Boolean).join(', ')
  const opis = [p.postcode && mjesto ? p.postcode + ' ' + mjesto : (jeMjesto ? '' : mjesto), p.county && p.county !== mjesto ? p.county : '', jeMjesto ? '' : p.country]
    .filter(Boolean).join(', ')
  return { tekst, opis, lat: g[1], lon: g[0] }
}

/** Adresa photon API-ja s prednošću oko domaćina (ili Hrvatske). */
export function urlPretrage(q, polozaj) {
  const b = polozaj ? { lat: polozaj.lat, lon: polozaj.lon, zoom: 12 } : HRVATSKA
  return `${PHOTON}/api/?limit=8&q=${encodeURIComponent(q)}&lat=${b.lat.toFixed(4)}&lon=${b.lon.toFixed(4)}&zoom=${b.zoom}&location_bias_scale=0.4`
}

function dohvatiPolozaj(pitaj) {
  return new Promise(rijesi => {
    if (!navigator.geolocation) return rijesi(null)
    const uzmi = () => navigator.geolocation.getCurrentPosition(
      p => { POLOZAJ = { lat: p.coords.latitude, lon: p.coords.longitude }; rijesi(POLOZAJ) },
      () => { geoNeDa = true; rijesi(null) },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 600000 })
    if (pitaj) return uzmi()
    // bez pitanja: samo ako je lokacija već dopuštena
    if (!navigator.permissions || !navigator.permissions.query) return rijesi(null)
    navigator.permissions.query({ name: 'geolocation' })
      .then(s => { if (s.state === 'granted') uzmi(); else { if (s.state === 'denied') geoNeDa = true; rijesi(null) } })
      .catch(() => rijesi(null))
  })
}

export function predloziAdresu(input, { vrsta = 'adresa', odabrano, f = (...a) => fetch(...a) } = {}) {
  if (!input || input.dataset.adrPredlozi) return
  input.dataset.adrPredlozi = vrsta
  if (!stil) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); stil = true }

  const id = 'odm-adr-' + (++brojac)
  const omot = document.createElement('div')
  omot.className = 'odm-adr-omot'
  input.parentNode.insertBefore(omot, input)
  omot.appendChild(input)
  const box = document.createElement('div')
  box.className = 'odm-adr'; box.hidden = true
  box.innerHTML = `<ul role="listbox" id="${id}" aria-label="Prijedlozi adrese"></ul><p class="odm-adr__izvor">Podaci: © OpenStreetMap suradnici</p>`
  omot.appendChild(box)
  const ul = box.querySelector('ul')

  input.setAttribute('autocomplete', 'off')
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-autocomplete', 'list')
  input.setAttribute('aria-expanded', 'false')
  input.setAttribute('aria-controls', id)

  let stavke = [], aktivna = -1, tajmer = 0, kontrola = null, red = 0, tiho = false

  const zatvori = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); aktivna = -1 }
  // ispod polja, a gore kad dolje nema mjesta (npr. polje pri dnu zaslona)
  function smjesti() {
    const r = input.getBoundingClientRect(), vh = window.innerHeight
    const ispod = vh - r.bottom, iznad = r.top, gore = ispod < 240 && iznad > ispod
    box.style.left = r.left + 'px'
    box.style.width = r.width + 'px'
    box.style.top = gore ? '' : (r.bottom + 4) + 'px'
    box.style.bottom = gore ? (vh - r.top + 4) + 'px' : ''
    ul.style.maxHeight = Math.max(120, Math.min(320, (gore ? iznad : ispod) - 56)) + 'px'
  }
  const otvori = () => { box.hidden = false; input.setAttribute('aria-expanded', 'true'); smjesti() }
  const prati = () => { if (!box.hidden) smjesti() }
  window.addEventListener('scroll', prati, true)
  window.addEventListener('resize', prati)
  const oznaci = i => {
    aktivna = i
    ul.querySelectorAll('li[role="option"]').forEach((li, j) => li.setAttribute('aria-selected', String(j === i)))
    const li = ul.querySelector(`#${id}-${i}`)
    if (li) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }) }
    else input.removeAttribute('aria-activedescendant')
  }

  // stavke: { vrsta:'adresa'|'geo', tekst, opis, lat, lon } ; poruka = red koji se ne bira
  function nacrtaj(lista, poruka) {
    stavke = lista
    ul.innerHTML = lista.map((x, i) => x.vrsta === 'geo'
      ? `<li role="option" id="${id}-${i}" aria-selected="false">${IKONA_GEO}<span><b>Koristi moju trenutnu lokaciju</b><small>Predložit ćemo adresu na kojoj ste sada</small></span></li>`
      : `<li role="option" id="${id}-${i}" aria-selected="false">${IKONA_PIN}<span translate="no"><b>${esc(x.tekst)}</b>${x.opis ? `<small>${esc(x.opis)}</small>` : ''}</span></li>`
    ).join('') + (poruka ? `<li class="odm-adr__ne" role="presentation">${esc(poruka)}</li>` : '')
    aktivna = -1
    if (lista.length || poruka) otvori(); else zatvori()
  }

  const geoRed = () => (!POLOZAJ && !geoNeDa && navigator.geolocation) ? [{ vrsta: 'geo' }] : []

  async function trazi() {
    const q = input.value.trim()
    const moj = ++red
    if (kontrola) kontrola.abort()
    if (q.length < 3) { nacrtaj(geoRed()); return }
    kontrola = typeof AbortController !== 'undefined' ? new AbortController() : null
    try {
      const r = await f(urlPretrage(q, POLOZAJ), kontrola ? { signal: kontrola.signal } : {})
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const d = await r.json()
      if (moj !== red) return
      const vidjeno = new Set()
      const broj = kucniBroj(q)
      const lista = (d.features || []).map(x => oblikuj(x, vrsta, broj)).filter(x => x && !vidjeno.has(x.tekst) && vidjeno.add(x.tekst)).slice(0, 6)
      nacrtaj([...geoRed(), ...lista], lista.length ? '' : 'Nema prijedloga — možete upisati ručno.')
    } catch (e) {
      if (e && e.name === 'AbortError') return
      if (moj === red) nacrtaj(geoRed(), 'Prijedlozi se trenutno ne učitavaju — upišite ručno.')
    }
  }

  function upisi(x) {
    tiho = true
    input.value = x.tekst
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    tiho = false
    zatvori()
    if (typeof odabrano === 'function') odabrano({ tekst: x.tekst, lat: x.lat, lon: x.lon })
  }

  async function koristiLokaciju() {
    nacrtaj([], 'Tražim vašu lokaciju…')
    const p = await dohvatiPolozaj(true)
    if (!p) { nacrtaj([], 'Lokacija nije dopuštena — upišite adresu.'); return }
    const moj = ++red
    try {
      const r = await f(`${PHOTON}/reverse?lat=${p.lat.toFixed(6)}&lon=${p.lon.toFixed(6)}&limit=3`)
      const d = await r.json()
      if (moj !== red) return
      const lista = (d.features || []).map(x => oblikuj(x, vrsta)).filter(Boolean)
      if (vrsta === 'mjesto' && !lista.length && d.features && d.features[0]) {
        // obrnuto traženje vraća kuću/ulicu — za „mjesto” uzmi grad iz nje
        const q = d.features[0].properties || {}
        const ime = q.city || q.town || q.village || q.locality
        if (ime) lista.push({ tekst: [ime, q.country].filter(Boolean).join(', '), opis: q.county || '', lat: p.lat, lon: p.lon })
      }
      nacrtaj(lista, lista.length ? '' : 'Za vašu lokaciju nema adrese — upišite ručno.')
      if (lista.length) oznaci(0)
    } catch { if (moj === red) nacrtaj([], 'Prijedlozi se trenutno ne učitavaju — upišite ručno.') }
  }

  function biraj(i) {
    const x = stavke[i]
    if (!x) return
    if (x.vrsta === 'geo') koristiLokaciju()
    else upisi(x)
  }

  input.addEventListener('input', () => {
    if (tiho) return
    clearTimeout(tajmer)
    tajmer = setTimeout(trazi, 300)
  })
  input.addEventListener('focus', async () => {
    if (!POLOZAJ && !geoNeDa) await dohvatiPolozaj(false)
    if (document.activeElement === input && !input.value.trim()) nacrtaj(geoRed())
  })
  input.addEventListener('keydown', e => {
    const n = stavke.length
    if (e.key === 'ArrowDown') { e.preventDefault(); if (box.hidden) { trazi(); return } oznaci(n ? (aktivna + 1) % n : -1) }
    else if (e.key === 'ArrowUp') { if (box.hidden) return; e.preventDefault(); oznaci(n ? (aktivna - 1 + n) % n : -1) }
    else if (e.key === 'Enter') { if (!box.hidden && aktivna >= 0) { e.preventDefault(); biraj(aktivna) } }
    else if (e.key === 'Escape') { if (!box.hidden) { e.preventDefault(); e.stopPropagation(); zatvori() } }
  })
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) zatvori() }, 150))
  // mousedown: fokus ostaje u polju, pa blur ne zatvori popis prije klika
  ul.addEventListener('mousedown', e => e.preventDefault())
  ul.addEventListener('click', e => {
    const li = e.target.closest('li[role="option"]')
    if (li) biraj(+li.id.slice(id.length + 1))
  })
}
