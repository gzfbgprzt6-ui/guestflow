// P1-1: „Prvi koraci” na vrhu Danas — sedam koraka, sljedeći korak istaknut, nestaje kad je sve gotovo
import { launch, otvori, ok } from './lib/zaj.mjs'
export default async function () {
  const b = await launch()
  for (const w of [1440, 390]) {
    const { pg, errs } = await otvori(b, { w, h: 900 })
    await pg.waitForTimeout(600)
    ok(await pg.isVisible('#dn-koraci'), `${w}px: „Prvi koraci” vidljivi`)
    ok(await pg.evaluate(() => document.querySelector('#section-overview > .card')?.id === 'dn-koraci'), `${w}px: prva kartica na Danas`)
    const sad = await pg.textContent('#dn-prvi-sad')
    ok(/Preporuke u blizini/.test(sad), `${w}px: sljedeći korak = preporuke („${sad.trim().slice(0, 60)}”)`)
    ok(/od 7 · još oko \d+ min/.test(await pg.textContent('#dn-prvi-st')), `${w}px: koliko je ostalo`)
    ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w}px: bez prelijevanja`)
    ok(errs.length === 0, `${w}px bez JS grešaka ${errs.join(' | ')}`)
    await pg.close()
  }
  // sve gotovo → kartica nestaje
  const { pg } = await otvori(b, { w: 1440, extra: "window.__ROWS.local_places=[{id:'l1',property_id:'p1',name:'Plaža',category:'Plaže',sort_order:1}]" })
  await pg.waitForTimeout(600)
  ok(!(await pg.isVisible('#dn-koraci')), 'sve gotovo: kartice nema')
  await pg.close(); await b.close()
}
