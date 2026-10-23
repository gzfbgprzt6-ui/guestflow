// Javna stranica: učitava se iz javni_objekt, bez prelijevanja, nikad ne čita sections; „na upit” skriva iznos.
import { launch, FAKE, podaci, BASE, ok } from './lib/zaj.mjs'
export default async function () {
  const b = await launch()
  for (const [w, naUpit] of [[1440, false], [390, false], [390, true]]) {
    const pg = await b.newPage({ viewport: { width: w, height: 900 }, locale: 'hr-HR', reducedMotion: 'reduce' }); const errs = []; pg.on('pageerror', e => errs.push(e.message))
    await pg.route(/fonts\.g|google\.com\/maps/, r => r.fulfill({ status: 200, body: '' }))
    await pg.route('**://esm.sh/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export const createClient=()=>globalThis.__SB;export default {}' }))
    await pg.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
    const extra = `const p=window.__ROWS.properties[0];p.prikaz_cijene='${naUpit ? 'na_upit' : 'javno'}';window.__CITANE=[];window.__RPC=(n,a)=>n==='javni_objekt'?{data:window.__ROWS.properties.find(x=>x.slug===a.p_slug),error:null}:{data:null,error:{code:'PGRST202',message:'no'}};`
    await pg.addInitScript(podaci(extra) + '\n;' + FAKE + `\n;const _f=globalThis.__SB.from.bind(globalThis.__SB);globalThis.__SB.from=t=>{window.__CITANE.push(t);return _f(t)}`)
    await pg.goto(BASE + '/p.html?slug=vila-maslina'); await pg.waitForTimeout(1500)
    const r = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ime: document.getElementById('hero-name')?.textContent || '', cijena: document.getElementById('sum-price')?.textContent || '', sek: (window.__CITANE || []).includes('sections') }))
    ok(r.ime.includes('Villa Maslina'), `${w}px naslov objekta`)
    ok(r.sw <= r.iw, `${w}px bez prelijevanja`)
    ok(!r.sek, `${w}px javna stranica ne čita sections`)
    if (naUpit) ok(!/€/.test(r.cijena), `na upit: bez iznosa u sažetku („${r.cijena}”)`)
    if (w === 1440) {
      ok(await pg.$('#iq-uvjet') !== null, 'upit ima kvačicu „Odmoria nije strana ugovora”')
      const prije = await pg.evaluate(() => (window.__CALLS || []).filter(c => c.startsWith('inquiries:insert')).length)
      await pg.evaluate(() => { document.getElementById('iq-ime').value = 'Ana Test'; document.getElementById('iq-mail').value = 'ana@x.hr'; document.getElementById('iqf').requestSubmit() })
      await pg.waitForTimeout(300)
      const posle = await pg.evaluate(() => (window.__CALLS || []).filter(c => c.startsWith('inquiries:insert')).length)
      ok(posle === prije, 'bez kvačice upit se ne šalje')
    }
    ok(errs.length === 0, `${w}px bez JS grešaka ${errs.join(' | ')}`)
    await pg.close()
  }
  await b.close()
}
