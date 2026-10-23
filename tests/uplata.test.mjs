// P0-2: rezervacija čija šifra čeka potvrdu uplate — stanje u popisu, gumb „Uplata je stigla”
import { launch, otvori, ok } from './lib/zaj.mjs'
export default async function () {
  const b = await launch()
  const { pg, errs } = await otvori(b, { w: 1440, extra: "window.__ROWS.bookings[0].ceka_uplatu=true" })
  await pg.evaluate(() => nav('reservations', document.querySelector('.panelnav [data-panel=reservations]')))
  await pg.waitForTimeout(800)
  ok((await pg.textContent('#bookings-list')).includes('Čeka uplatu'), 'popis rezervacija: „Čeka uplatu”')
  await pg.evaluate(() => bkOdaberi('b1')); await pg.waitForTimeout(300)
  ok(await pg.isVisible('.bk-p__upl button'), 'panel rezervacije ima „Uplata je stigla”')
  await pg.click('.bk-p__upl button'); await pg.waitForTimeout(800)
  const poziv = await pg.evaluate(() => (window.__CALLS || []).find(c => c.startsWith('bookings:update') && c.includes('uplata_potvrdena_at')))
  ok(!!poziv, 'klik upiše uplata_potvrdena_at')
  ok((await pg.textContent('#bk-panel')).includes('Uplata potvrđena'), 'panel nakon potvrde: „Uplata potvrđena”')
  ok(await pg.$('#bk-ceka') !== null, 'kvačica #bk-ceka postoji')
  ok(errs.length === 0, 'bez JS grešaka ' + errs.join(' | '))
  await pg.close(); await b.close()
}
