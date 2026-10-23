// P1-2: registracijski broj i pravila otkazivanja — dashboard sprema, javna stranica pokazuje
import { BASE, launch, otvori, podaci, FAKE, ok } from './lib/zaj.mjs'
export default async function () {
  const b = await launch()
  const d = await otvori(b, { w: 1440 })
  await d.pg.evaluate(() => nav('pricing', document.querySelector('.panelnav [data-panel=pricing]'))); await d.pg.waitForTimeout(400)
  await d.pg.click('#otk-seg [data-otk="umjereno"]')
  await d.pg.fill('#prop-regbr', '2181-RJ-2024-00123')
  ok(await d.pg.isVisible('#savebar.show'), 'izmjena uvjeta pali kapljicu')
  await d.pg.click('#uvjeti-card button[onclick="saveUvjeti()"]'); await d.pg.waitForTimeout(300)
  const poziv = await d.pg.evaluate(() => (window.__CALLS || []).find(c => c.startsWith('properties:update') && c.includes('umjereno')))
  ok(!!poziv && poziv.includes('2181-RJ-2024-00123'), 'spremanje upiše otkazivanje i registracijski broj')
  ok(!(await d.pg.evaluate(() => document.getElementById('savebar').classList.contains('show'))), 'nakon spremanja kapljice nema')
  // Spremi na kapljici sprema samo izmijenjenu karticu (Cijene imaju tri kartice)
  await d.pg.fill('#prop-regbr', 'X-1'); await d.pg.evaluate(() => { window.__CALLS.length = 0; window.saveNow() }); await d.pg.waitForTimeout(300)
  const pozivi = await d.pg.evaluate(() => window.__CALLS.filter(c => c.startsWith('properties:update')))
  ok(pozivi.length === 1 && pozivi[0].includes('X-1'), 'kapljica sprema samo karticu Otkazivanje i registracija')
  ok(d.errs.length === 0, 'dashboard bez JS grešaka ' + d.errs.join(' | '))
  await d.pg.close()
  // javna stranica
  for (const w of [1440, 390]) {
    const pg = await b.newPage({ viewport: { width: w, height: 900 }, locale: 'hr-HR', reducedMotion: 'reduce' }); const errs = []; pg.on('pageerror', e => errs.push(e.message))
    await pg.route('**://esm.sh/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export const createClient=()=>globalThis.__SB;export default {}' }))
    await pg.route(/google\.com|fonts\.g/, r => r.fulfill({ status: 200, body: '' })); await pg.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    await pg.addInitScript(podaci(`const p=window.__ROWS.properties[0];p.otkazivanje='fleksibilno';p.registracijski_broj='2181-RJ-2024-00123';window.__RPC=(n,a)=>n==='javni_objekt'?{data:window.__ROWS.properties.find(x=>x.slug===a.p_slug),error:null}:{data:null,error:{code:'PGRST202',message:'x'}};`) + '\n;' + FAKE)
    await pg.goto(BASE + '/p.html?slug=vila-maslina'); await pg.waitForTimeout(1500)
    const tx = await pg.textContent('#uvj')
    ok(await pg.isVisible('#uvj') && /7 dana/.test(tx) && tx.includes('2181-RJ-2024-00123'), `${w}px: „Uvjeti ovog smještaja” s otkazivanjem i brojem`)
    ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w}px: bez prelijevanja`)
    ok(errs.length === 0, `${w}px bez JS grešaka ${errs.join(' | ')}`)
    await pg.close()
  }
  await b.close()
}
