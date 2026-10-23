// P1-4: gotove poruke za odgovor na upit i vremenska crta upita
import { launch, otvori, ok, d } from './lib/zaj.mjs'
export default async function () {
  const b = await launch()
  const up = `window.__ROWS.inquiries=[{id:'q1',property_id:'p1',guest_name:'Hans Müller',guest_email:'hans@web.de',guest_phone:'+49 151 2345678',checkin_date:'${d(40)}',checkout_date:'${d(45)}',guests:2,message:'Hallo',status:'novi',created_at:new Date().toISOString()}]`
  for (const w of [1440, 390]) {
    const { pg, errs } = await otvori(b, { w, h: 900, extra: up })
    await pg.evaluate(() => openInquiries()); await pg.waitForTimeout(500)
    if (w < 900) { await pg.click('[data-iq="q1"]'); await pg.waitForTimeout(200) }
    ok(await pg.isVisible('.iq-odg'), `${w}px: brzi odgovor u detalju upita`)
    ok(await pg.inputValue('#iq-odg-j') === 'de', `${w}px: jezik po e-mailu gosta (de)`)
    ok(/frei/.test(await pg.inputValue('#iq-odg-tx')), `${w}px: tekst „Termin je slobodan” na njemačkom`)
    await pg.click('.iq-odg__p button:has-text("Pitanje gostu")'); await pg.waitForTimeout(100)
    ok(/Wie viele/.test(await pg.inputValue('#iq-odg-tx')), `${w}px: druga gotova poruka`)
    await pg.click('.iq-odg__b button:has-text("Kopiraj tekst")'); await pg.waitForTimeout(300)
    const poziv = await pg.evaluate(() => (window.__CALLS || []).find(c => c.startsWith('inquiries:update') && c.includes('odgovoreno_at')))
    ok(!!poziv && poziv.includes('kopija'), `${w}px: odgovor upisan u vremensku crtu`)
    ok((await pg.textContent('.iq-crta')).includes('Odgovorili ste'), `${w}px: vremenska crta pokazuje odgovor`)
    ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w}px: bez prelijevanja`)
    ok(errs.length === 0, `${w}px bez JS grešaka ${errs.join(' | ')}`)
    await pg.close()
  }
  await b.close()
}
