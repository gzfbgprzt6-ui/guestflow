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

/* Demo objekt — koristi ga `preview/` i minijature u biraču. Prava stranica
   šalje `izBaze(prop)`, pa je ovo jedini izmišljeni podatak u lancu. */
const OBJEKT = {
  ime:'Apartman Aurora', kratko:'Aurora', mjesto:'Rovinj, Istra',
  gosti:4, sobe:2, m2:52, kupaonice:1, kreveti:3, cijena:145, minNoci:2,
  istaknuto:'32°', istaknutoLab:'Temperatura bazena · danas',
  domacica:'Ivana',
  lead:'Jutarnje svjetlo nad starim gradom, osam minuta pješice do mora.',
  pismo:'Kuća je bila bakina. Bor ispred nje stariji je od mene, pa ni u dva '
      + 'popodne nema sunca na terasi. Ostavit ću vam smokve na stolu i ključ '
      + 'ispod prve stepenice.',
  prostorije:[
    ['01','Spavaća soba','pogled na luku'],
    ['02','Dnevni boravak','22 m², kamin'],
    ['03','Terasa','jutarnje sunce'],
    ['04','Kupaonica','tuš, perilica'],
  ],
  slike:[],
}

/* ==========================================================================
   IZ BAZE → OBLIK KOJI RASPOREDI ZNAJU ČITATI
   Svako polje ima zamjenu, jer domaćin ne mora ispuniti sve. Tema koja vodi
   cijenom bez cijene vodi imenom; tema koja vodi popisom prostorija bez
   popisa izvede ga iz `bedrooms`/`bathrooms`. Nijedna ne ostane prazna.
   ========================================================================== */
function izBaze(prop = {}) {
  const ime = prop.name || 'Objekt'
  /* „Apartman Aurora” → kratko „Aurora”; jednorječno ime ostaje cijelo */
  const rijeci = ime.trim().split(/\s+/)
  const kratko = rijeci.length > 1 ? rijeci.slice(1).join(' ') : ime

  const prostorije = []
  let n = 0
  const broj = () => String(++n).padStart(2, '0')
  if (prop.bedrooms)  prostorije.push([broj(), rec(prop.bedrooms,'Spavaća soba','Spavaće sobe','Spavaćih soba'),
                                       prop.beds ? prop.beds + ' ' + rec(prop.beds,'krevet','kreveta','kreveta') : ''])
  if (prop.size_m2)   prostorije.push([broj(), 'Dnevni prostor', prop.size_m2 + ' m² ukupno'])
  if (prop.bathrooms) prostorije.push([broj(), rec(prop.bathrooms,'Kupaonica','Kupaonice','Kupaonica'), ''])
  if (prop.max_guests)prostorije.push([broj(), 'Za ' + prop.max_guests + ' ' + rec(prop.max_guests,'gosta','gosta','gostiju'), ''])

  /* Istaknuta brojka (Laguna, Ponoćni). Domaćin je upiše u dashboardu; ako
     nije, uzmemo najbolju brojku koju objekt ima. */
  let ist = (prop.highlight || '').trim(), istLab = ''
  if (ist) {
    const dv = ist.split('·')
    ist = dv[0].trim(); istLab = (dv[1] || '').trim()
  } else if (prop.size_m2)    { ist = prop.size_m2 + ' m²';  istLab = 'Površina' }
  else if (prop.max_guests)   { ist = String(prop.max_guests); istLab = rec(prop.max_guests,'gost','gosta','gostiju') }
  else                        { ist = kratko;                istLab = '' }

  return {
    ime, kratko,
    mjesto: prop.location || '',
    gosti: prop.max_guests || 0, sobe: prop.bedrooms || 0,
    m2: prop.size_m2 || 0, kupaonice: prop.bathrooms || 0, kreveti: prop.beds || 0,
    cijena: prop.price_per_night || 0,
    minNoci: prop.min_stay || 0,
    istaknuto: ist, istaknutoLab: istLab || 'Istaknuto',
    domacica: prop.host_name || '',
    lead: (prop.welcome_msg || '').trim(),
    pismo: (prop.welcome_msg || '').trim(),
    prostorije,
    slike: slikeIz(prop),
  }
}

/* naslovna prva, pa ostale — isto pravilo koje `p.html` već koristi */
function slikeIz(prop = {}) {
  let u = [...(prop.photo_urls || [])].filter(Boolean)
  if (prop.cover_photo_url) u = [prop.cover_photo_url, ...u.filter(x => x !== prop.cover_photo_url)]
  return u
}

/* hrvatski oblici uz broj: 1 / 2–4 / 5+ (uz iznimke za 11–14) */
function rec(n, jedan, dva, pet) {
  const d = n % 10, s = n % 100
  if (s >= 11 && s <= 14) return pet
  if (d === 1) return jedan
  if (d >= 2 && d <= 4) return dva
  return pet
}

/* `s` bježi od HTML-a — demo podaci su naši, ali funkcija ide i u editor gdje
   korisnik upisuje ime objekta, pa nema smisla ostaviti rupu. */
const s = v => String(v).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

/* Pozadinski sloj zaglavlja.
   Ako objekt ima fotografije — one idu u pozadinu. Ako nema, vrti se nacrtani
   prizor, isto pravilo koje `p.html` već ima. `data-art` crta `scene.js`
   (veo + paralaksa), `data-g-art` je mala inačica bez vela. */
const sloj = (vrsta, mini, o = {}, klase = '') => {
  const u = (o.slike || []).slice(0, mini ? 1 : 3)
  if (u.length) return u.map((x, i) =>
    `<div class="th__art th__foto ${i === 0 ? 'on ' : ''}${klase}"
          style="background-image:url('${s(x)}')"></div>`).join('')
  return `<div class="th__art art art--${vrsta} ${klase}" data-${mini ? 'g-' : ''}art="${vrsta}"></div>`
}

/* Uokvirena fotografija (luk u Terakoti, krug u Rivieri) — ista pravila. */
const okvir = (vrsta, o = {}, kl = '') => {
  const u = (o.slike || [])[0]
  return u
    ? `<div class="${kl}" style="background-image:url('${s(u)}');background-size:cover;background-position:center"></div>`
    : `<div class="${kl} art art--${vrsta}" data-g-art="${vrsta}"></div>`
}

/* „Rovinj, Istra · 4 gosta · 52 m²” — bez praznih članova i bez visećih točaka */
const red = (...d) => d.filter(x => x !== '' && x != null && x !== 0).join(' · ')

/* ---------- osam rasporeda ---------- */
const RASPORED = {

  jadran: (o, m) => `
    ${sloj('zalazak', m, o, m ? '' : 'art--dise')}
    <div class="th__veil"></div>
    <div class="th__in th__in--end">
      <div>
        ${o.mjesto ? `<span class="jd-loc">📍 ${s(o.mjesto)}</span>` : ''}
        <h1 class="jd-ime">${s(o.ime)}</h1>
        ${o.lead ? `<p class="jd-lead">${s(o.lead)}</p>` : ''}
        <div class="jd-btns">
          <span class="btn btn--fill">Pošalji upit <span class="arr">→</span></span>
          <span class="btn btn--light">Slobodni termini</span>
        </div>
      </div>
    </div>`,

  laguna: (o, m) => `
    ${sloj('plava', m, o)}
    <div class="th__veil"></div>
    <div class="th__in th__in--mid">
      <div><div class="lg-card">
        <div class="lg-temp">${s(o.istaknuto)}</div>
        <div class="lg-lab">${s(o.istaknutoLab)}</div>
        <div class="lg-ime">${s(o.ime)}${o.mjesto ? `<span>${s(o.mjesto)}</span>` : ''}</div>
        <div class="lg-row">
          ${[o.gosti && o.gosti + ' ' + rec(o.gosti,'gost','gosta','gostiju'),
             o.sobe  && o.sobe  + ' ' + rec(o.sobe,'soba','sobe','soba'),
             o.m2    && o.m2 + ' m²'].filter(Boolean)
            .map(x => `<span>${s(x)}</span>`).join('')}
        </div>
      </div></div>
    </div>`,

  /* Bez cijene nema čime voditi, pa vodi imenom — ista paleta i isto pismo. */
  zlatnisat: (o, m) => `
    ${sloj('zalazak', m, o)}
    <div class="th__veil"></div>
    <div class="th__in th__in--ctr">
      <div>
        ${o.cijena ? `<div class="zs-od">od</div>
        <div class="zs-cijena">${o.cijena}<em>€</em></div>` : ''}
        <div class="zs-rule"></div>
        <div class="zs-pod">${s(red(o.cijena && 'po noći',
                                    o.minNoci && 'najmanje ' + o.minNoci + ' ' + rec(o.minNoci,'noć','noći','noći'),
                                    'bez provizije'))}</div>
        <div class="zs-ime"${o.cijena ? '' : ' style="margin-top:0;font-size:calc(var(--hs)*5rem)"'}>${s(o.ime)}</div>
        ${o.mjesto ? `<div class="zs-loc">${s(o.mjesto)}</div>` : ''}
        <div class="zs-btn"><span class="btn btn--fill">Rezerviraj izravno</span></div>
      </div>
    </div>`,

  terakota: (o, m) => `
    <div class="th__in th__in--mid">
      <div class="tk">
        <div class="tk-l">
          <div class="tk-ime">${o.mjesto ? `<span>${s(o.mjesto)}</span>` : ''}${s(o.ime)}</div>
          <ol class="tk-idx">
            ${o.prostorije.map(([n, ime, det]) =>
              `<li><b>${n}</b>${s(ime)}${det ? `<em>${s(det)}</em>` : ''}</li>`).join('')}
          </ol>
        </div>
        <div class="tk-r">${okvir('zalazak', o, 'tk-luk')}</div>
      </div>
    </div>`,

  beton: (o, m) => `
    <div class="th__in th__in--mid">
      <div class="bt">
        <div class="bt-hd"><small>${s(o.ime.split(' ')[0])}</small><h1>${s(o.kratko)}</h1>
          ${o.mjesto ? `<small>${s(o.mjesto)}</small>` : ''}</div>
        <dl class="bt-tab">
          ${[['Gosti', o.gosti], ['Sobe', o.sobe], ['Kreveta', o.kreveti],
             ['Kupaonica', o.kupaonice], ['Površina', o.m2 && o.m2 + ' m²'],
             ['Od', o.cijena && o.cijena + ' € / noć']]
            .filter(([, v]) => v).map(([k, v]) =>
              `<div class="bt-red"><dt>${k}</dt><dd>${s(v)}</dd></div>`).join('')}
        </dl>
        <div class="bt-btn"><span class="btn btn--fill">Upit <span class="arr">→</span></span></div>
      </div>
    </div>`,

  riviera: (o, m) => `
    <div class="th__in th__in--mid">
      <div class="rv">
        ${okvir('zalazak', o, 'rv-krug')}
        <h1 class="rv-ime">${s(o.kratko.toUpperCase())}</h1>
        ${o.mjesto ? `<div class="rv-sub">${s(o.mjesto)}</div>` : ''}
        <div class="rv-traka">${s(red(
          o.gosti && o.gosti + ' ' + rec(o.gosti,'gost','gosta','gostiju'),
          o.sobe  && o.sobe  + ' ' + rec(o.sobe,'soba','sobe','soba'),
          o.m2    && o.m2 + ' m²'))}</div>
      </div>
    </div>`,

  ponocni: (o, m) => `
    ${sloj('plava', m, o)}
    <div class="th__veil"></div>
    <div class="th__in pn">
      <div class="pn-red">
        <div class="pn-ime">${s(o.kratko)}</div>
        <div class="pn-temp">${s(o.istaknuto)}<small>${s(o.istaknutoLab)}</small></div>
      </div>
    </div>`,

  /* Bez pisma dobrodošlice vodi imenom u istom tihom ritmu. */
  borova: (o, m) => `
    ${sloj('maslinik', m, o)}
    <div class="th__in th__in--mid">
      <div class="bo">
        ${o.pismo ? `<p class="bo-pismo">„${s(o.pismo)}”</p>
        <div class="bo-potpis">${o.domacica ? '— ' + s(o.domacica) + ', domaćin' : ''}</div>
        <div class="bo-red"></div>` : ''}
        <div class="bo-ime"${o.pismo ? '' : ' style="font-size:calc(var(--hs)*3.4rem)"'}>${s(o.ime)}
          <span>${s(red(o.mjesto,
                        o.gosti && o.gosti + ' ' + rec(o.gosti,'gost','gosta','gostiju'),
                        o.m2 && o.m2 + ' m²'))}</span></div>
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

/* Ubaci zaglavlje u element, nacrtaj prizore i pokreni izmjenu fotografija. */
function ubaci(el, id, opt) {
  if (!el) return
  el.innerHTML = zaglavlje(id, opt)
  window.Odmoria?.crtajPrizore?.(el)
  /* elementi ubačeni nakon što je motion.js prošao ne bi se nikad otkrili */
  el.querySelectorAll('[data-rv]').forEach(x => x.classList.add('rv-in'))
  vrtiFoto(el)
}

/* Izmjena fotografija u zaglavlju, isti ritam kao rotator u `p.html` (7 s).
   Stane na `prefers-reduced-motion` i dok je kartica u pozadini. */
function vrtiFoto(korijen) {
  const sl = [...korijen.querySelectorAll('.th__foto')]
  if (sl.length < 2) return
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return
  let i = 0, t = null
  const arm = () => { clearTimeout(t); t = setTimeout(idi, 7000) }
  const idi = () => {
    sl[i].classList.remove('on')
    i = (i + 1) % sl.length
    sl[i].classList.add('on')
    arm()
  }
  /* Prethodni interval mora stati, inače dvije teme vrte isti element. */
  korijen.__vrti && clearTimeout(korijen.__vrti)
  arm(); korijen.__vrti = t
  document.addEventListener('visibilitychange', () =>
    document.hidden ? clearTimeout(t) : arm())
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

let _odabrana = 'jadran'
let _osvjezi = () => {}

function birac(opt = {}) {
  const $ = id => id ? document.getElementById(id) : null
  const grid  = $(opt.grid  || 'teme')
  if (!grid) return
  const zivo  = $(opt.zivo  || 'zivo')
  const okvir = $(opt.okvir || 'zivoOkvir')
  const planbar = $(opt.planbar || 'planbarT')
  /* Prava stranica šalje funkciju, da se pregled osvježi kad domaćin promijeni
     podatke. Pregled bez funkcije vrti demo objekt. */
  const daj = typeof opt.objekt === 'function' ? opt.objekt
            : opt.objekt ? () => opt.objekt : () => OBJEKT
  let plan = opt.plan || 'host'
  _odabrana = TEME.some(t => t.id === opt.odabrana) ? opt.odabrana : izAdrese('jadran')

  grid.innerHTML = TEME.map(t => `
    <button class="tema" type="button" data-tema="${t.id}" data-treba="${t.plan}"
            aria-pressed="${t.id === _odabrana}">
      <div data-stil="${t.id}">${zaglavlje(t.id, { mini:true, objekt: daj() })}</div>
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
    const t = TEME.find(x => x.id === _odabrana)
    const ok = RANG[plan] >= RANG[t.plan]
    tekst(opt.upsellIme || 'upsellIme', ok
      ? `Tema ${t.ime} je uključena u plan ${PLAN_IME[plan]}`
      : `Tema ${t.ime} traži plan ${PLAN_IME[t.plan]}`)
    const nota = `Na planu ${PLAN_IME[plan]} otvoreno je ${otvoreno} od ${TEME.length} tema.`
    tekst(opt.upsellTxt || 'upsellTxt', nota)
    tekst(opt.nota || 'temeNota', nota)
  }

  function prikazi(id, javi) {
    const t = TEME.find(x => x.id === id) || TEME[0]
    _odabrana = t.id
    ;[...grid.children].forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.tema === t.id)))
    if (okvir) okvir.setAttribute('data-stil', t.id)
    ubaci(zivo, t.id, { objekt: daj() })
    tekst(opt.ime  || 'zivoIme',  t.ime)
    tekst(opt.vodi || 'zivoVodi', 'vodi ' + t.vodi)
    tekst(opt.font || 'zivoFont', t.font)
    const lnk = $(opt.link || 'zivoLink')
    if (lnk) lnk.href = (opt.linkBaza || '/preview/public.html') + '?stil=' + t.id
    stanje()
    if (javi && opt.naPromjenu) opt.naPromjenu(t.id)
  }

  /* Podaci su se promijenili, tema nije: precrtaj pregled i sve minijature. */
  _osvjezi = () => {
    const o = daj()
    ;[...grid.children].forEach(b => {
      const drz = b.firstElementChild
      drz.innerHTML = zaglavlje(b.dataset.tema, { mini:true, objekt:o })
      window.Odmoria?.crtajPrizore?.(drz)
    })
    ubaci(zivo, _odabrana, { objekt:o })
  }

  grid.addEventListener('click', e => {
    const b = e.target.closest('.tema'); if (b) prikazi(b.dataset.tema, true)
  })
  planbar?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    ;[...e.currentTarget.children].forEach(x =>
      x.setAttribute('aria-pressed', String(x === b)))
    plan = b.dataset.plan; stanje()
  })
  prikazi(_odabrana, false)
}

/* Tema objekta: `?stil=` u adresi ima prednost (da se na pravoj stranici može
   isprobati svih osam prije nego se ijedna spremi), pa ono što je spremljeno u
   bazi, pa „jadran”. Ako stupac `theme` još ne postoji, `prop.theme` je
   `undefined` i sve radi kao i dosad. */
function zaObjekt(prop = {}) {
  const q = izAdrese(null)
  if (q) return q
  return TEME.some(t => t.id === prop.theme) ? prop.theme : 'jadran'
}

;(window.Odmoria = window.Odmoria || {}).teme =
  { TEME, OBJEKT, zaglavlje, ubaci, primijeni, izAdrese, birac, izBaze, slikeIz, zaObjekt,
    odabrana: () => _odabrana, osvjezi: () => _osvjezi() }
})()
