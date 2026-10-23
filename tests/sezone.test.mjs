// Cijene → sezonske kartice: polja se ne preklapaju i ne izlaze iz kartice (360–1440 px).
import { launch, otvori, ok } from './lib/zaj.mjs'
export default async function () {
  const b = await launch()
  for (const W of [1440, 1100, 900, 600, 390, 360]) {
    const { pg, errs } = await otvori(b, { w: W, h: 900 })
    await pg.evaluate(() => nav('pricing', document.querySelector('.panelnav [data-panel=pricing]'))); await pg.waitForTimeout(400)
    await pg.evaluate(() => { dodajSezonu(); dodajSezonu() })
    const bad = await pg.evaluate(() => { const bad = []; document.querySelectorAll('#sez-lista .sez').forEach((c, ci) => { const cr = c.getBoundingClientRect(); const ins = [...c.querySelectorAll('input')].map(i => i.getBoundingClientRect())
      ins.forEach((a, i) => { if (a.left < cr.left - .5 || a.right > cr.right + .5) bad.push(ci + ':izlazi' + i); ins.forEach((o, j) => { if (j > i && a.left < o.right - .5 && o.left < a.right - .5 && a.top < o.bottom - .5 && o.top < a.bottom - .5) bad.push(ci + ':preklop' + i + j) }) }) }); return bad })
    ok(bad.length === 0, `${W}px sezone bez preklapanja ${bad.join(',')}`)
    ok(errs.length === 0, `${W}px bez JS grešaka`)
    await pg.close()
  }
  await b.close()
}
