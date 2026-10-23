// Recenzije po kategorijama: vodič traži svih šest, javna stranica pokazuje prosjek po kategoriji, dashboard bez brisanja
import { BASE, launch, otvori, podaci, FAKE, ok } from './lib/zaj.mjs'
const ESM = r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export const createClient=()=>globalThis.__SB;export default {toDataURL:async()=>"data:,"}' })
export default async function () {
  const b = await launch()
  // vodič (primjer: boravak je u tijeku, ocjena se nudi)
  let pg = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'hr-HR', reducedMotion: 'reduce' })
  let errs = []; pg.on('pageerror', e => errs.push(e.message))
  await pg.route('**://esm.sh/**', ESM); await pg.route(/google\.com|fonts\.g|open-meteo/, r => r.fulfill({ status: 200, body: '' }))
  await pg.addInitScript(FAKE)
  await pg.goto(BASE + '/h.html?token=demo'); await pg.waitForTimeout(1500)
  ok(await pg.locator('#stars .oc-red').count() === 6, 'vodič: šest kategorija ocjene')
  await pg.click('#stars [data-k="cistoca"] [data-n="5"]')
  await pg.click('#oc-posalji'); await pg.waitForTimeout(200)
  ok((await pg.textContent('#oc-err')).includes('Ocijenite još'), 'vodič: bez svih kategorija javlja što fali')
  ok(errs.length === 0, 'vodič bez JS grešaka ' + errs.join(' | '))
  await pg.close()
  // javna stranica
  pg = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'hr-HR', reducedMotion: 'reduce' }); errs = []; pg.on('pageerror', e => errs.push(e.message))
  await pg.route('**://esm.sh/**', ESM); await pg.route(/google\.com|fonts\.g/, r => r.fulfill({ status: 200, body: '' })); await pg.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  const jo = { stanje: 'ok', oznaka: true, prosjek: 4.6, broj: 2, kategorije: { cistoca: 5, domacin: 4.5, lokacija: 4 }, recenzije: [{ ocjena: 5, ocjene: { cistoca: 5 }, tekst: 'Super', ime: 'Ana', created_at: '2026-09-01' }, { ocjena: 4, tekst: '', ime: 'Ivo', created_at: '2026-08-01' }] }
  await pg.addInitScript(podaci(`window.__RPC=(n,a)=>n==='javni_objekt'?{data:window.__ROWS.properties.find(x=>x.slug===a.p_slug),error:null}:n==='javno_o_objektu'?{data:${JSON.stringify(jo)},error:null}:{data:null,error:{code:'PGRST202',message:'x'}};`) + '\n;' + FAKE)
  await pg.goto(BASE + '/p.html?slug=vila-maslina'); await pg.waitForTimeout(1500)
  ok(await pg.isVisible('#hero-ocj') && (await pg.textContent('#hero-ocj')).includes('4,6'), 'javna stranica: ukupna ocjena na vrhu')
  ok(await pg.isVisible('#rev-kat'), 'javna stranica: prosjek po kategorijama')
  ok((await pg.textContent('#rev-kat')).includes('Čistoća'), 'javna stranica: naziv kategorije „Čistoća”')
  ok(errs.length === 0, 'javna bez JS grešaka ' + errs.join(' | '))
  await pg.close()
  // dashboard
  const d = await otvori(b, { w: 1440, extra: "window.__ROWS.reviews=[{id:'r1',property_id:'p1',ocjena:4,ocjene:{cistoca:5,domacin:3},tekst:'Dobro',ime:'Ana',javno:true,skriveno:false,created_at:'2026-09-01'}]" })
  await d.pg.evaluate(() => nav('reviews', document.querySelector('.panelnav [data-panel=reviews]'))); await d.pg.waitForTimeout(600)
  const tx = await d.pg.textContent('#rv-list')
  ok(!/Obriši|Sakrij|Prikaži/.test(tx), 'dashboard: recenzija nema „Obriši” ni „Sakrij”')
  ok(/Čistoća 5/.test(tx), 'dashboard: ocjene po kategoriji uz recenziju')
  ok(d.errs.length === 0, 'dashboard bez JS grešaka ' + d.errs.join(' | '))
  await d.pg.close(); await b.close()
}
