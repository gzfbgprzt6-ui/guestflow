// ============================================================================
//  Odmoria — jezik sučelja DOMAĆINA (hrvatski / engleski)
//  ---------------------------------------------------------------------------
//  Dashboard, prijava, registracija, postavljanje, dodavanje objekta i račun
//  pisani su na hrvatskom. Na engleskom se NE prepisuju: ova skripta preko
//  rječnika (domacin-en.js, ključ = hrvatski tekst) prevede tekst na stranici
//  i sve što se kasnije upiše (MutationObserver) — toast, paneli, poruke.
//
//  Zadano je hrvatski; engleski samo kad ga domaćin izabere (pamti se na
//  uređaju). Na hrvatskom se ne učitava ni rječnik — stranica je ista kao prije.
//
//  Što se ne dira: vrijednosti polja (input/textarea — to su podaci domaćina),
//  <script>/<style>/<code>, sve unutar [translate="no"]. <option> bez value
//  dobije value = izvorni tekst PRIJE prijevoda, da se u bazu i dalje upisuje
//  hrvatska vrijednost.
//
//  Gostinske stranice (h.html, p.html) imaju svoj sustav — jezici.js.
// ============================================================================

const KLJUC = 'odm-jezik-domacina'
export const JEZICI_DOMACINA = [{ kod: 'hr', ime: 'Hrvatski' }, { kod: 'en', ime: 'English' }]

export function jezik() {
  try { const s = localStorage.getItem(KLJUC); if (s === 'hr' || s === 'en') return s } catch {}
  return 'hr'
}
export function postaviJezik(l) {
  try { localStorage.setItem(KLJUC, l === 'en' ? 'en' : 'hr') } catch {}
  location.reload()
}

const ATRIBUTI = ['placeholder', 'title', 'aria-label', 'alt']
const PRESKOCI = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'NOSCRIPT', 'svg', 'SVG'])
const HRV = /[čćžšđČĆŽŠĐ]|\b(je|i|za|na|od|do|se|nije|još|ili|vaš|vaše|objekt|gost|gosti|dana|noći|spremi|dodaj|nema)\b/i

let T = null, U = []
const sazmi = s => s.replace(/\s+/g, ' ').trim()

function uzorci(P) {
  return Object.entries(P).map(([k, v]) => {
    const dijelovi = k.split('{}').map(x => x.replace(/[.*+?^$()|[\]\\]/g, '\\$&'))
    return { re: new RegExp('^' + dijelovi.join('([\\s\\S]+?)') + '$'), v, prvi: k.split('{}').find(x => x.trim()) || '', duljina: k.replace(/\{\}/g, '').length }
  }).sort((a, b) => b.duljina - a.duljina)   // specifičniji uzorak (više teksta) prvi
}

// Dio uzorka (npr. „2 noći”, „praznine su kraće”): rječnik, pa jedan uzorak bez daljnjeg spuštanja.
function grupa(x) {
  const k = sazmi(x)
  if (Object.prototype.hasOwnProperty.call(T, k)) return T[k]
  for (const u of U) {
    const g = k.match(u.re)
    if (!g) continue
    let i = 0
    const gr = g.slice(1).map(y => (Object.prototype.hasOwnProperty.call(T, sazmi(y)) ? T[sazmi(y)] : y))
    return u.v.replace(/\{(\d*)\}/g, (_, n) => (n ? gr[+n - 1] : gr[i++]) ?? '')
  }
  const d = datumi(k)
  return d !== k ? d : x
}

// Datumi koje kod formatira hrvatski (toLocaleDateString('hr-HR'), nazivi
// dana i mjeseci). Samo u tekstu s brojkom — da se ne dira sadržaj domaćina.
const DANI = { pon: 'Mon', uto: 'Tue', sri: 'Wed', 'čet': 'Thu', pet: 'Fri', sub: 'Sat', ned: 'Sun' }
const MJ = [['siječ(?:anj|nja)', 'January'], ['velj(?:ača|ače)', 'February'], ['ožuj(?:ak|ka)', 'March'], ['trav(?:anj|nja)', 'April'],
  ['svib(?:anj|nja)', 'May'], ['lip(?:anj|nja)', 'June'], ['srp(?:anj|nja)', 'July'], ['kolovoza?', 'August'], ['ruj(?:an|na)', 'September'],
  ['listopada?', 'October'], ['studen(?:i|oga?)', 'November'], ['prosin(?:ac|ca)', 'December']]
  .map(([r, en]) => [new RegExp('(^|[^\\p{L}])(' + r + ')(?![\\p{L}])', 'giu'), en])
const KRATKI = { sij: 'Jan', velj: 'Feb', 'ožu': 'Mar', tra: 'Apr', svi: 'May', lip: 'Jun', srp: 'Jul', kol: 'Aug', ruj: 'Sep', lis: 'Oct', stu: 'Nov', pro: 'Dec' }
const KRATKI_RE = /(\d\.\s?)(sij|velj|ožu|tra|svi|lip|srp|kol|ruj|lis|stu|pro)(?=[\s.,]|$)/giu
const DAN_RE = /(^|[^\p{L}])(pon|uto|sri|čet|pet|sub|ned)(?=[\s.,)]|$)/giu
function datumi(s) {
  if (!/\d/.test(s)) return s
  let o = s.replace(DAN_RE, (_, a, d) => a + DANI[d.toLowerCase()])
  for (const [re, en] of MJ) o = o.replace(re, (_, a) => a + en)
  o = o.replace(KRATKI_RE, (_, a, m) => a + KRATKI[m.toLowerCase()])
  if (o !== s) o = o.replace(/(\d{4})\.(?=\s|$|[),])/g, '$1')   // „October 2026.” → „October 2026”
  return o
}

/** Prijevod jednog teksta ili null. */
export function tr(s) {
  if (!T || s == null) return null
  const m = String(s).match(/^(\s*)([\s\S]*?)(\s*)$/)
  const k = sazmi(m[2])
  if (!k) return null
  if (Object.prototype.hasOwnProperty.call(T, k)) return T[k] === k ? null : m[1] + T[k] + m[3]
  for (const u of U) {
    if (u.prvi && !k.includes(u.prvi)) continue
    const g = k.match(u.re)
    if (!g) continue
    const grupe = g.slice(1).map(x => grupa(x))
    let i = 0
    const out = u.v.replace(/\{(\d*)\}/g, (_, n) => (n ? grupe[+n - 1] : grupe[i++]) ?? '')
    return m[1] + out + m[3]
  }
  // „1 noć · ručno označeno · za 3 dana” — dijelovi spojeni točkicom
  if (k.includes(' · ')) {
    const d = k.split(' · '), p = d.map(grupa)
    if (p.some((x, i) => x !== d[i])) return m[1] + p.join(' · ') + m[3]
  }
  const dd = datumi(k)
  return dd !== k ? m[1] + dd + m[3] : null
}

const NEPREVEDENO = (globalThis.__NEPREVEDENO = globalThis.__NEPREVEDENO || new Set())
function biljezi(s) {
  const k = sazmi(s || '')
  if (k && NEPREVEDENO.size < 3000 && (globalThis.__SKUPI_SVE ? /\p{L}{3}/u.test(k) : HRV.test(k))) NEPREVEDENO.add(k)
}

function preskoci(el) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (PRESKOCI.has(e.tagName) || e.getAttribute('translate') === 'no' || e.isContentEditable) return true
  }
  return false
}
function tekstCvor(n) {
  if (!n.parentElement || preskoci(n.parentElement)) return
  const p = tr(n.nodeValue)
  if (p != null) n.nodeValue = p
  else biljezi(n.nodeValue)
}
function element(el) {
  if (preskoci(el)) return
  if (el.tagName === 'OPTION' && !el.hasAttribute('value')) el.setAttribute('value', el.textContent)
  for (const a of ATRIBUTI) {
    if (!el.hasAttribute(a)) continue
    const p = tr(el.getAttribute(a))
    if (p != null) el.setAttribute(a, p)
  }
  if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) {
    const p = tr(el.value); if (p != null) el.value = p
  }
}
function prevedi(root) {
  if (!root) return
  if (root.nodeType === 3) return tekstCvor(root)
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return
  if (root.nodeType === 1) { if (preskoci(root)) return; element(root) }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  // opcije se moraju obraditi prije svog teksta (value = izvornik)
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 1 ? element(n) : tekstCvor(n)
}

let pokrenuto = null
/** Učitaj rječnik (samo za engleski), prevedi stranicu i prati izmjene. */
export function pokreni() {
  if (pokrenuto) return pokrenuto
  if (jezik() !== 'en') return (pokrenuto = Promise.resolve(false))
  document.documentElement.lang = 'en'
  pokrenuto = import('./domacin-en.js').then(({ T: t, P }) => {
    T = t; U = uzorci(P || {})
    const naslov = tr(document.title); if (naslov) document.title = naslov
    prevedi(document.body)
    new MutationObserver(lista => {
      for (const m of lista) {
        if (m.type === 'childList') m.addedNodes.forEach(prevedi)
        else if (m.type === 'characterData') tekstCvor(m.target)
        else if (m.type === 'attributes' && !preskoci(m.target)) {
          const p = tr(m.target.getAttribute(m.attributeName)); if (p != null) m.target.setAttribute(m.attributeName, p)
        }
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTI })
    for (const f of ['confirm', 'alert', 'prompt']) {
      const izvorna = window[f]
      if (typeof izvorna === 'function') window[f] = (poruka, ...ostalo) => izvorna.call(window, tr(poruka) ?? poruka, ...ostalo)
    }
    return true
  }).catch(() => false)
  return pokrenuto
}

/** Mali prekidač HR · EN (npr. u podnožju bočne trake ili na prijavi). */
export function prekidac(el) {
  if (!el) return
  const sad = jezik()
  el.setAttribute('translate', 'no')
  el.innerHTML = JEZICI_DOMACINA.map(j => `<button type="button" data-jezik="${j.kod}" aria-pressed="${j.kod === sad}" lang="${j.kod}">${j.kod.toUpperCase()}</button>`).join('')
  el.addEventListener('click', e => { const b = e.target.closest('[data-jezik]'); if (b && b.dataset.jezik !== sad) postaviJezik(b.dataset.jezik) })
}
