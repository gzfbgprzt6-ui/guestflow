// Dashboard: svaki panel se otvara bez JS greške i bez vodoravnog prelijevanja; grupe vode na pravi panel.
import { launch, otvori, ok } from './lib/zaj.mjs'
export default async function () {
  const b = await launch()
  for (const w of [1440, 390]) {
    const { pg, errs } = await otvori(b, { w, h: 900 })
    const paneli = await pg.evaluate(() => [...document.querySelectorAll('.panelnav .nav-item[data-panel]')].map(x => x.dataset.panel))
    for (const id of paneli) {
      await pg.evaluate(id => nav(id, document.querySelector(`.panelnav [data-panel=${id}]`)), id); await pg.waitForTimeout(250)
      const r = await pg.evaluate(() => ({ akt: !!document.querySelector('.editor-panel.active'), sw: document.documentElement.scrollWidth, iw: innerWidth }))
      ok(r.akt && r.sw <= r.iw, `${w}px panel ${id} se otvara bez prelijevanja (${r.sw}/${r.iw})`)
    }
    for (const [g, p] of [['pregled', 'overview'], ['upiti', 'inquiries'], ['kalendar', 'availability'], ['rezervacije', 'reservations'], ['objekt', 'basic'], ['tim', 'tim'], ['pretplata', 'sub']]) {
      await pg.evaluate(g => openGroup(g), g); await pg.waitForTimeout(200)
      // grupa vraća na zadnji otvoreni podtab, pa se provjerava da je aktivni panel iz te grupe
      const a = await pg.evaluate(() => { const id = document.querySelector('.editor-panel.active')?.id.replace('section-', ''); return document.querySelector(`.panelnav [data-panel="${id}"]`)?.dataset.group || id })
      ok(a === g || a === p, `${w}px grupa ${g} otvara svoj panel (${a})`)
    }
    // tehničke poruke o SQL-u domaćin ne smije vidjeti
    const sql = await pg.evaluate(() => [...document.querySelectorAll('.editor-panel')].some(p => /pokren\w+ .*sql\//i.test(p.innerText)))
    ok(!sql, `${w}px nema poruka „pokrenite sql/…” u vidljivim panelima`)
    ok(errs.length === 0, `${w}px bez JS grešaka ${errs.join(' | ')}`)
    await pg.close()
  }
  await b.close()
}
