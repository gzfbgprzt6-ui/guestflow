// ============================================================
//  Odmoria — male animacije za radnje (listopad 2026.)
//  ------------------------------------------------------------
//  veselje(el)  — sunčeve iskrice iz elementa (upit poslan, ocjena…)
//  kvacica(btn) — „✓ Kopirano” na gumbu na trenutak, pa vrati natpis
//  Stilovi su u odmoria.css (i u dashboard.html, koji ga ne učitava).
//  Ako je korisnik isključio pokret (prefers-reduced-motion), ništa
//  se ne miče — kvačica i dalje promijeni natpis, samo bez skoka.
// ============================================================
const mirno = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Sunčeve iskrice (žuta, petrol, menta) iz sredine elementa. */
export function veselje(el, { koliko = 16 } = {}) {
  if (!el || mirno() || !el.getBoundingClientRect) return
  const r = el.getBoundingClientRect()
  if (!r.width && !r.height) return
  const sloj = document.createElement('div')
  sloj.className = 'o-veselje'; sloj.setAttribute('aria-hidden', 'true')
  sloj.style.left = r.left + r.width / 2 + 'px'
  sloj.style.top = r.top + Math.min(r.height / 2, 48) + 'px'
  for (let i = 0; i < koliko; i++) {
    const s = document.createElement('i')
    const a = (i / koliko) * Math.PI * 2 + Math.random() * 0.5
    const d = 56 + Math.random() * 72
    s.style.setProperty('--x', Math.cos(a) * d + 'px')
    s.style.setProperty('--y', Math.sin(a) * d - 24 + 'px')
    s.style.setProperty('--r', Math.round(Math.random() * 300) + 'deg')
    s.style.animationDelay = (Math.random() * 0.08).toFixed(2) + 's'
    s.className = ['o-v-s', 'o-v-t', 'o-v-m'][i % 3]
    sloj.appendChild(s)
  }
  document.body.appendChild(sloj)
  setTimeout(() => sloj.remove(), 1300)
}

/** Kvačica na gumbu za kopiranje; natpis se vrati nakon 1,6 s. */
export function kvacica(btn, tekst) {
  if (!btn || btn.dataset.oKv) return
  btn.dataset.oKv = '1'
  const prije = btn.innerHTML, sirina = btn.offsetWidth
  btn.style.minWidth = sirina + 'px'                 // gumb ne skače u širini
  btn.innerHTML = `<span class="o-kv" aria-hidden="true">✓</span> ${String(tekst || 'Kopirano').replace(/\.$/, '')}`
  btn.classList.add('o-gotovo')
  setTimeout(() => { btn.innerHTML = prije; btn.classList.remove('o-gotovo'); btn.style.minWidth = ''; delete btn.dataset.oKv }, 1600)
}
