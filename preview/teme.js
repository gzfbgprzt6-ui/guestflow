/* ==========================================================================
   Odmoria — TEME: podaci i osam rasporeda zaglavlja
   Bez ovisnosti, bez build koraka. Vraća HTML koji `teme.css` oblikuje.

   Svaka tema vodi s DRUGOM informacijom — to je bit, ne boja:
     jadran    ime objekta         laguna    temperatura bazena
     zlatnisat cijena              terakota  popis prostorija
     beton     tablica podataka    riviera   ime kao plakat
     ponocni   sama slika          borova    pismo domaćice

   Demo podaci su ovdje na jednom mjestu (`OBJEKT`) da se vidi kako bi ista
   rezervacija izgledala u svih osam tema.
   ========================================================================== */
;(() => {

const OBJEKT = {
  ime:'Apartman Aurora', kratko:'Aurora', mjesto:'Rovinj', kraj:'Istra',
  gosti:4, sobe:2, m2:52, more:'8 min', cijena:145, bazen:32,
  domacica:'Ivana',
  lead:'Jutarnje svjetlo nad starim gradom, osam minuta pješice do mora.',
  pismo:'Kuća je bila bakina. Bor ispred nje stariji je od mene, pa ni u dva '
      + 'popodne nema sunca na terasi. Ostavit ću vam smokve na stolu i ključ '
      + 'ispod prve stepenice.',
  sobe_popis:[
    ['01','Spavaća soba','pogled na luku'],
    ['02','Dnevni boravak','22 m², kamin'],
    ['03','Terasa','jutarnje sunce'],
    ['04','Kupaonica','tuš, perilica'],
  ],
}

/* `s` bježi od HTML-a — demo podaci su naši, ali funkcija ide i u editor gdje
   korisnik upisuje ime objekta, pa nema smisla ostaviti rupu. */
const s = v => String(v).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

/* prizor: `data-art` na pravoj stranici (nosi veo i paralaksu),
   `data-g-art` u minijaturi (bez vela) — crta ih `scene.js`. */
const art = (vrsta, mini, klase = '') =>
  `<div class="th__art art art--${vrsta} ${klase}" data-${mini ? 'g-' : ''}art="${vrsta}"></div>`

/* ---------- osam rasporeda ---------- */
const RASPORED = {

  jadran: (o, m) => `
    ${art('zalazak', m, m ? '' : 'art--dise')}
    <div class="th__veil"></div>
    <div class="th__in th__in--end">
      <div>
        <span class="jd-loc">📍 ${s(o.mjesto)}, ${s(o.kraj)}</span>
        <h1 class="jd-ime">${s(o.ime.split(' ')[0])}<em>${s(o.kratko)}</em></h1>
        <p class="jd-lead">${s(o.lead)}</p>
        <div class="jd-btns">
          <span class="btn btn--fill">Pošalji upit <span class="arr">→</span></span>
          <span class="btn btn--light">Slobodni termini</span>
        </div>
      </div>
    </div>`,

  laguna: (o, m) => `
    ${art('plava', m)}
    <div class="th__veil"></div>
    <div class="th__in th__in--mid">
      <div><div class="lg-card">
        <div class="lg-temp"><b>${o.bazen}</b><sup>°</sup></div>
        <div class="lg-lab">Temperatura bazena · danas</div>
        <div class="lg-ime">${s(o.ime)}<span>${s(o.mjesto)}, ${s(o.kraj)}</span></div>
        <div class="lg-row"><span>bazen 9 × 4 m</span><span>grijan</span>
          <span>${s(o.more)} do mora</span></div>
      </div></div>
    </div>`,

  zlatnisat: (o, m) => `
    ${art('zalazak', m)}
    <div class="th__veil"></div>
    <div class="th__in th__in--ctr">
      <div>
        <div class="zs-od">od</div>
        <div class="zs-cijena">${o.cijena}<em>€</em></div>
        <div class="zs-rule"></div>
        <div class="zs-pod">po noći · najmanje 2 noći · bez provizije</div>
        <div class="zs-ime">${s(o.ime)}</div>
        <div class="zs-loc">${s(o.mjesto)} — ${s(o.kraj)}</div>
        <div class="zs-btn"><span class="btn btn--fill">Rezerviraj izravno</span></div>
      </div>
    </div>`,

  terakota: (o, m) => `
    <div class="th__in th__in--mid">
      <div class="tk">
        <div class="tk-l">
          <div class="tk-ime"><span>${s(o.mjesto)}, ${s(o.kraj)}</span>${s(o.ime)}</div>
          <ol class="tk-idx">
            ${o.sobe_popis.map(([n, ime, det]) =>
              `<li><b>${n}</b>${s(ime)}<em>${s(det)}</em></li>`).join('')}
          </ol>
        </div>
        <div class="tk-r"><div class="tk-luk art art--zalazak" data-g-art="zalazak"></div></div>
      </div>
    </div>`,

  beton: (o, m) => `
    <div class="th__in th__in--mid">
      <div class="bt">
        <div class="bt-hd"><small>Apartman</small><h1>${s(o.kratko)}</h1>
          <small>${s(o.mjesto)} / ${s(o.kraj)} / HR</small></div>
        <dl class="bt-tab">
          <div class="bt-red"><dt>Gosti</dt><dd>${o.gosti}</dd></div>
          <div class="bt-red"><dt>Sobe</dt><dd>${o.sobe}</dd></div>
          <div class="bt-red"><dt>Površina</dt><dd>${o.m2} m²</dd></div>
          <div class="bt-red"><dt>Do mora</dt><dd>${s(o.more)}</dd></div>
          <div class="bt-red"><dt>Od</dt><dd>${o.cijena} € / noć</dd></div>
        </dl>
        <div class="bt-btn"><span class="btn btn--fill">Upit <span class="arr">→</span></span></div>
      </div>
    </div>`,

  riviera: (o, m) => `
    <div class="th__in th__in--mid">
      <div class="rv">
        <div class="rv-krug art art--zalazak" data-g-art="zalazak"></div>
        <h1 class="rv-ime">${s(o.kratko.toUpperCase())}</h1>
        <div class="rv-sub">${s(o.mjesto)} · ${s(o.kraj)} · od 1971.</div>
        <div class="rv-traka">${o.gosti} gosta — ${o.sobe} sobe — ${o.m2} m² — bazen</div>
      </div>
    </div>`,

  ponocni: (o, m) => `
    ${art('plava', m)}
    <div class="th__veil"></div>
    <div class="th__in pn">
      <div class="pn-red">
        <div class="pn-ime">${s(o.kratko)}</div>
        <div class="pn-temp">${o.bazen}°<small>bazen noćas</small></div>
      </div>
    </div>`,

  borova: (o, m) => `
    ${art('maslinik', m)}
    <div class="th__in th__in--mid">
      <div class="bo">
        <p class="bo-pismo">„${s(o.pismo)}”</p>
        <div class="bo-potpis">— ${s(o.domacica)}, domaćica</div>
        <div class="bo-red"></div>
        <div class="bo-ime">${s(o.ime)}
          <span>${s(o.mjesto)}, ${s(o.kraj)} · ${o.gosti} gosta · ${o.m2} m²</span></div>
      </div>
    </div>`,
}

const TEME = [
  { id:'jadran',    ime:'Jadran',          vodi:'imenom objekta',   font:'Fraunces + Manrope',        plan:'free' },
  { id:'laguna',    ime:'Laguna',          vodi:'temperaturom bazena', font:'Jost',                   plan:'host' },
  { id:'zlatnisat', ime:'Zlatni sat',      vodi:'cijenom',          font:'Bodoni Moda + Jost',        plan:'pro'  },
  { id:'terakota',  ime:'Terakota',        vodi:'popisom prostorija', font:'Cormorant + Manrope',     plan:'host' },
  { id:'beton',     ime:'Beton',           vodi:'tablicom podataka', font:'Archivo Black + Space Grotesk', plan:'pro' },
  { id:'riviera',   ime:'Riviera ’70',     vodi:'imenom kao plakatom', font:'Playfair + Syne',        plan:'pro'  },
  { id:'ponocni',   ime:'Ponoćni bazen',   vodi:'samom slikom',     font:'Space Grotesk',             plan:'partner' },
  { id:'borova',    ime:'Borova šuma',     vodi:'pismom domaćice',  font:'Spectral',                  plan:'host' },
]

/* Raspored zaglavlja za temu. `mini` = minijatura u biraču.
   Nepoznat id pada na „jadran” — stranica nikad ne ostane bez zaglavlja. */
function zaglavlje(id, { mini = false, objekt = OBJEKT } = {}) {
  const f = RASPORED[id] || RASPORED.jadran
  return `<div class="th th--${RASPORED[id] ? id : 'jadran'}${mini ? ' th--mini' : ''}">`
       + f(objekt, mini) + '</div>'
}

/* Ubaci zaglavlje u element i nacrtaj prizore koje je donijelo. */
function ubaci(el, id, opt) {
  if (!el) return
  el.innerHTML = zaglavlje(id, opt)
  window.Odmoria?.crtajPrizore?.(el)
  /* elementi ubačeni nakon što je motion.js prošao ne bi se nikad otkrili */
  el.querySelectorAll('[data-rv]').forEach(x => x.classList.add('rv-in'))
}

/* Tema na <html>. „jadran” skida atribut, pa vrijedi čisti atmosphere.css. */
function primijeni(id) {
  const t = TEME.find(x => x.id === id) ? id : 'jadran'
  if (t === 'jadran') document.documentElement.removeAttribute('data-stil')
  else document.documentElement.setAttribute('data-stil', t)
  return t
}

/* Tema iz ?stil= u adresi. */
function izAdrese(zadano = 'jadran') {
  try {
    const q = new URLSearchParams(location.search).get('stil')
    return TEME.find(x => x.id === q) ? q : zadano
  } catch { return zadano }
}

/* ==========================================================================
   BIRAČ — jedna izvedba za obje stranice (dashboard „Izgled” i uređivanje).
   Dvije kopije ove logike značile bi dvije koje se raziđu, kao nekad s
   limitima plana. Svaki element je neobavezan: stranica koja ga nema samo
   ne dobije taj dio.
   ========================================================================== */
const RANG = { free:0, host:1, pro:2, partner:3 }
const PLAN_IME = { free:'Besplatno', host:'Domaćin', pro:'Pro', partner:'Partner' }

function birac(opt = {}) {
  const $ = id => id ? document.getElementById(id) : null
  const grid  = $(opt.grid  || 'teme')
  if (!grid) return
  const zivo  = $(opt.zivo  || 'zivo')
  const okvir = $(opt.okvir || 'zivoOkvir')
  const planbar = $(opt.planbar || 'planbarT')
  let plan = opt.plan || 'host'
  let odabrana = izAdrese('jadran')

  grid.innerHTML = TEME.map(t => `
    <button class="tema" type="button" data-tema="${t.id}" data-treba="${t.plan}"
            aria-pressed="${t.id === odabrana}">
      <div data-stil="${t.id}">${zaglavlje(t.id, { mini:true })}</div>
      <div class="tema__m">
        <div class="tema__ime">${t.ime}<span class="ck">✓</span></div>
        <div class="tema__vodi">vodi <b>${t.vodi}</b></div>
        <div class="tema__font">${t.font}</div>
      </div>
    </button>`).join('')
  window.Odmoria?.crtajPrizore?.(grid)

  function tekst(id, v) { const el = $(id); if (el) el.textContent = v }

  function stanje() {
    let otvoreno = 0
    ;[...grid.children].forEach(b => {
      const ok = RANG[plan] >= RANG[b.dataset.treba]
      b.classList.toggle('lk', !ok)
      if (ok) otvoreno++
    })
    const t = TEME.find(x => x.id === odabrana)
    const ok = RANG[plan] >= RANG[t.plan]
    tekst(opt.upsellIme || 'upsellIme', ok
      ? `Tema ${t.ime} je uključena u plan ${PLAN_IME[plan]}`
      : `Tema ${t.ime} traži plan ${PLAN_IME[t.plan]}`)
    const nota = `Na planu ${PLAN_IME[plan]} otvoreno je ${otvoreno} od ${TEME.length} tema.`
    tekst(opt.upsellTxt || 'upsellTxt', nota)
    tekst(opt.nota || 'temeNota', nota)
  }

  function prikazi(id) {
    const t = TEME.find(x => x.id === id) || TEME[0]
    odabrana = t.id
    ;[...grid.children].forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.tema === t.id)))
    if (okvir) okvir.setAttribute('data-stil', t.id)
    ubaci(zivo, t.id)
    tekst(opt.ime  || 'zivoIme',  t.ime)
    tekst(opt.vodi || 'zivoVodi', 'vodi ' + t.vodi)
    tekst(opt.font || 'zivoFont', t.font)
    const lnk = $(opt.link || 'zivoLink')
    if (lnk) lnk.href = '/preview/public.html?stil=' + t.id
    stanje()
  }

  grid.addEventListener('click', e => {
    const b = e.target.closest('.tema'); if (b) prikazi(b.dataset.tema)
  })
  planbar?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    ;[...e.currentTarget.children].forEach(x =>
      x.setAttribute('aria-pressed', String(x === b)))
    plan = b.dataset.plan; stanje()
  })
  prikazi(odabrana)
}

;(window.Odmoria = window.Odmoria || {}).teme =
  { TEME, OBJEKT, zaglavlje, ubaci, primijeni, izAdrese, birac }
})()
