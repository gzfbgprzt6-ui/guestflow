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
