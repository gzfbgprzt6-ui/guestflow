// Cijena noći i boravka sa sezonama (v5, sql/add-direct-bookings.sql).
// ISTA pravila kao cijena_noci() / cijena_boravka() u bazi: sezona
// {od:'MM-DD', do:'MM-DD', cijena} pokriva noć čiji je datum između od i do
// (uključivo; od > do = preko Nove godine), inače vrijedi price_per_night.
// Baza iznos upita računa sama — ovo je samo za prikaz gostu i domaćinu.

const MD = /^\d{2}-\d{2}$/

export function sezone(prop) {
  const s = Array.isArray(prop?.sezonske_cijene) ? prop.sezonske_cijene : []
  return s.filter(x => x && MD.test(x.od || '') && MD.test(x.do || '') && Number(x.cijena) > 0)
}

export function cijenaNoci(prop, ds) {
  const md = String(ds).slice(5, 10)
  for (const x of sezone(prop)) {
    const u = x.od <= x.do ? md >= x.od && md <= x.do : md >= x.od || md <= x.do
    if (u) return Number(x.cijena)
  }
  const p = Number(prop?.price_per_night)
  return p > 0 ? p : null
}

const plus = (ds, n) => { const [y, m, d] = ds.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + n)); return x.toISOString().slice(0, 10) }

/** Iznos boravka [od, do) ili null ako neka noć nema cijenu. */
export function cijenaBoravka(prop, od, doD) {
  if (!od || !doD || doD <= od) return null
  let uk = 0, d = od, i = 0
  while (d < doD && i++ < 90) {
    const c = cijenaNoci(prop, d)
    if (c == null) return null
    uk += c; d = plus(d, 1)
  }
  return d < doD ? null : Math.round(uk * 100) / 100
}

/** Najniža cijena noći (osnovna ili sezonska) — za „od … / noć”. */
export function najnizaCijena(prop) {
  const c = [Number(prop?.price_per_night), ...sezone(prop).map(x => Number(x.cijena))].filter(x => x > 0)
  return c.length ? Math.min(...c) : 0
}

/** „01.07.” ↔ „07-01” */
export const uMD = t => { const m = String(t || '').trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.?$/); return m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31 ? `${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : null }
export const izMD = md => MD.test(md || '') ? `${md.slice(3, 5)}.${md.slice(0, 2)}.` : ''

// ── Prijedlozi cijena po pravilima (odluke, točka 41) ──────────────────
// Bez vanjskih podataka i bez naplate: gleda samo kalendar objekta i njegove
// cijene. Ništa se ne mijenja samo — domaćin klikne „Primijeni”, pregleda
// sezone i spremi. Sezone vrijede SVAKE godine (MM-DD), pa prijedlog to i kaže.
const zaokruzi = x => Math.max(5, Math.round(x / 5) * 5)
const danaUMjesecu = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const p2 = n => String(n).padStart(2, '0')

/**
 * @param prop     objekt (price_per_night, sezonske_cijene)
 * @param zauzeto  Set datuma 'YYYY-MM-DD' koji su zauzeti (sve vrste)
 * @param danas    'YYYY-MM-DD'
 * @returns [{ id, naslov, tekst, sezone?, objava? }]
 */
export function prijedloziCijena(prop, zauzeto, danas) {
  const out = []
  const osnovna = Number(prop?.price_per_night) || 0
  const sez = sezone(prop)
  if (!osnovna) return out

  // A) nema sezona → uobičajeni jadranski raspored
  if (!sez.length) {
    const nove = [
      { od: '07-01', do: '08-31', cijena: zaokruzi(osnovna * 1.3) },
      { od: '10-15', do: '05-14', cijena: zaokruzi(osnovna * 0.8) }
    ]
    out.push({ id: 'jadran', naslov: 'Dodajte sezone',
      tekst: `Gosti na Jadranu najviše traže srpanj i kolovoz. Prijedlog: 1. 7. – 31. 8. po ${nove[0].cijena} €, od 15. 10. do 14. 5. po ${nove[1].cijena} €, a ostatak godine vaša cijena od ${osnovna} €.`,
      sezone: nove })
  }

  // B/C) potražnja po mjesecima — sljedeća 4 mjeseca
  const [y0, m0] = danas.split('-').map(Number)
  for (let k = 0; k < 4; k++) {
    const y = y0 + Math.floor((m0 - 1 + k) / 12), m = (m0 - 1 + k) % 12 + 1
    const n = danaUMjesecu(y, m), prvi = `${y}-${p2(m)}-01`, zadnji = `${y}-${p2(m)}-${p2(n)}`
    const doPocetka = Math.round((Date.parse(prvi) - Date.parse(danas)) / 864e5)
    let noci = 0, zauz = 0
    for (let d = 1; d <= n; d++) { const ds = `${y}-${p2(m)}-${p2(d)}`; if (ds < danas) continue; noci++; if (zauzeto.has(ds)) zauz++ }
    if (noci < 10) continue
    const pop = zauz / noci
    const sred = `${y}-${p2(m)}-15`, sada = cijenaNoci(prop, sred) || osnovna
    const imeM = ['siječanj', 'veljača', 'ožujak', 'travanj', 'svibanj', 'lipanj', 'srpanj', 'kolovoz', 'rujan', 'listopad', 'studeni', 'prosinac'][m - 1]
    const mjesecSezona = cijena => [{ od: `${p2(m)}-01`, do: `${p2(m)}-${p2(n)}`, cijena }, ...sez.filter(x => !(x.od === `${p2(m)}-01` && x.do === `${p2(m)}-${p2(n)}`))]
    if (pop >= 0.8 && doPocetka >= 21) {
      const nova = zaokruzi(sada * 1.1)
      if (nova > sada) out.push({ id: 'vise-' + m, naslov: `${imeM[0].toUpperCase() + imeM.slice(1)} je skoro pun`,
        tekst: `Zauzeto je ${Math.round(pop * 100)} % noći, a do početka je još ${doPocetka} dana. Preostale noći možete prodati skuplje: ${sada} → ${nova} € (sezona za cijeli ${imeM}, vrijedi svake godine).`,
        sezone: mjesecSezona(nova) })
    } else if (pop < 0.2 && doPocetka >= 14 && doPocetka <= 60 && sada >= 30) {
      const nova = zaokruzi(sada * 0.9)
      if (nova < sada) out.push({ id: 'manje-' + m, naslov: `${imeM[0].toUpperCase() + imeM.slice(1)} je još prazan`,
        tekst: `Zauzeto je samo ${Math.round(pop * 100)} % noći, a počinje za ${doPocetka} dana. Niža cijena ili objava mogu pomoći: ${sada} → ${nova} € (sezona za cijeli ${imeM}, vrijedi svake godine).`,
        sezone: mjesecSezona(nova), objava: { od: prvi < danas ? danas : prvi, do: plus(zadnji, 1) } })
    }
  }

  // D) zadnja minuta — sljedećih 14 dana
  let slobodno = 0, najdulje = null, tek = null
  for (let i = 0; i < 14; i++) {
    const ds = plus(danas, i)
    if (zauzeto.has(ds)) { tek = null; continue }
    slobodno++
    tek = tek ? { od: tek.od, do: plus(ds, 1) } : { od: ds, do: plus(ds, 1) }
    if (!najdulje || (Date.parse(tek.do) - Date.parse(tek.od)) > (Date.parse(najdulje.do) - Date.parse(najdulje.od))) najdulje = { ...tek }
  }
  if (slobodno >= 7 && najdulje) out.push({ id: 'zadnja', naslov: `${slobodno} slobodnih noći u sljedeća dva tjedna`,
    tekst: 'Za zadnju minutu ne treba mijenjati sezone: pošaljite ponudu povratnim gostima ili objavite slobodan termin s popustom.',
    objava: najdulje })
  return out
}
