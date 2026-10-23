// P1-3: Provjeren domaćin (ručna provjera, samo plaćeni planovi)
import { BASE, launch, otvori, podaci, FAKE, ok } from './lib/zaj.mjs'

const ADMIN = '56549320-2c02-405c-9936-770144bd9b49'
const ZAHTJEV = { user_id: 'u1', email: 'm@x.hr', stanje: 'ceka', ime: 'Marko Domaćin', oib: '69435151530', obrt: 'Obrt Maslina', iban: 'HR12 1001 0051 8630 0016 0',
  primatelj: 'Marko Domaćin', objekti: [{ id: 'p1', naziv: 'Villa Maslina', slug: 'vila-maslina', registracijski_broj: 'HR-123' }], poslano_at: '2026-10-23T10:00:00Z', plan: 'pro', vrijedi: false, racun_isti: true }

async function stranica(b, put, extra, { w = 1280 } = {}) {
  const pg = await b.newPage({ viewport: { width: w, height: 900 }, locale: 'hr-HR', reducedMotion: 'reduce' }); const errs = []; pg.on('pageerror', e => errs.push(e.message))
  await pg.route('**://esm.sh/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export const createClient=()=>globalThis.__SB;export default {}' }))
  await pg.route(/google\.com|fonts\.g/, r => r.fulfill({ status: 200, body: '' })); await pg.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await pg.addInitScript(podaci(extra) + '\n;' + FAKE)
  await pg.goto(BASE + put); await pg.waitForTimeout(1600)
  return { pg, errs }
}

export default async function () {
  const b = await launch()

  // 1) javna stranica: oznaka i ime primatelja samo kad baza kaže da vrijedi
  for (const [prov, w] of [[{ primatelj: 'Marko Domaćin', od: '2026-10-20' }, 390], [null, 1440]]) {
    const { pg, errs } = await stranica(b, '/p.html?slug=vila-maslina', `window.__RPC=(n,a)=>n==='javni_objekt'?{data:window.__ROWS.properties[0],error:null}:n==='javno_o_objektu'?{data:{stanje:'ok',oznaka:true,broj:0,recenzije:[],provjera:${JSON.stringify(prov)}},error:null}:{data:null,error:{code:'PGRST202',message:'x'}};`, { w })
    if (prov) {
      ok(await pg.isVisible('#hero-prov'), 'javna: „Provjeren domaćin” pod naslovom')
      ok((await pg.textContent('#prov-prim')) === 'Marko Domaćin' && await pg.isVisible('#prov'), 'javna: ime primatelja u „Sigurna izravna rezervacija”')
      ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'javna 390 px: bez prelijevanja')
    } else ok(!(await pg.isVisible('#hero-prov')) && !(await pg.isVisible('#prov')), 'javna: bez provjere nema oznake')
    ok(errs.length === 0, 'javna bez JS grešaka ' + errs.join(' | '))
    await pg.close()
  }

  // 2) Postavke → Sigurnost: Free ne može, plaćeni bez 2FA ne može poslati, s 2FA šalje
  const META = "window.__USER.user_metadata.iban='HR12 1001 0051 8630 0016 0';window.__USER.user_metadata.primatelj='Marko Domaćin';"
  let r = await stranica(b, '/account.html#sigurnost', META + "window.__RPC=n=>n==='moja_provjera'?{data:{smije:false,stanje:'nema'},error:null}:{data:null,error:{code:'PGRST202',message:'x'}};")
  ok((await r.pg.textContent('#prov-st')).includes('plaćenim planovima') && !(await r.pg.isVisible('#prov-forma')), 'Free: provjera samo u plaćenim planovima, bez obrasca')
  ok(r.errs.length === 0, 'račun (Free) bez JS grešaka ' + r.errs.join(' | '))
  await r.pg.close()

  // plaćeni domaćin, SQL još nije pokrenut: obrazac se ipak vidi (plan iz plans.js)
  r = await stranica(b, '/account.html#sigurnost', META)
  ok(await r.pg.isVisible('#prov-card') && await r.pg.isVisible('#prov-forma'), 'bez SQL-a: plaćeni domaćin vidi obrazac za provjeru')
  ok(!(await r.pg.$('#mfa-card')), 'nema prijave u dva koraka (nije uvjet)')
  await r.pg.fill('#prov-oib', '69435151530'); await r.pg.check('#prov-pristanak'); await r.pg.click('#prov-btn'); await r.pg.waitForTimeout(300)
  ok((await r.pg.textContent('#prov-err')).includes('još nije uključena'), 'bez SQL-a slanje kaže „još nije uključena”')
  await r.pg.close()

  r = await stranica(b, '/account.html#sigurnost', META + "window.__ARGS=[];window.__RPC=(n,a)=>{window.__ARGS.push([n,a]);return n==='moja_provjera'?{data:window.__ARGS.some(x=>x[0]==='zatrazi_provjeru')?{smije:true,stanje:'ceka',poslano_at:new Date().toISOString(),iban:'HR12',primatelj:'Marko Domaćin'}:{smije:true,stanje:'nema'},error:null}:n==='zatrazi_provjeru'?{data:{stanje:'ok'},error:null}:{data:null,error:{code:'PGRST202',message:'x'}}};", { w: 390 })
  ok(await r.pg.isVisible('#prov-forma') && !(await r.pg.isDisabled('#prov-btn')), 'plaćeni: obrazac i „Pošalji na provjeru” odmah, bez preduvjeta')
  ok((await r.pg.inputValue('#prov-iban')).startsWith('HR12'), 'IBAN iz računa je unaprijed upisan')
  await r.pg.fill('#prov-oib', '69435151530'); await r.pg.check('#prov-pristanak')
  await r.pg.click('#prov-btn'); await r.pg.waitForTimeout(400)
  const zahtjev = await r.pg.evaluate(() => window.__ARGS.find(x => x[0] === 'zatrazi_provjeru'))
  ok(zahtjev && zahtjev[1].p_oib === '69435151530' && zahtjev[1].p_obrt === null, 'zahtjev ide u zatrazi_provjeru s OIB-om')
  ok((await r.pg.textContent('#prov-st')).includes('Zahtjev je poslan'), 'nakon slanja: „Zahtjev je poslan”')
  ok(await r.pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'račun 390 px: bez prelijevanja')
  ok(r.errs.length === 0, 'račun bez JS grešaka ' + r.errs.join(' | '))
  await r.pg.close()

  // 4) dashboard: provjereni domaćin ima zaključan IBAN
  const d = await otvori(b, { extra: META + "window.__RPC=n=>n==='moja_provjera'?{data:{smije:true,stanje:'provjeren',vrijedi:true,racun_isti:true},error:null}:{data:null,error:{code:'PGRST202',message:'x'}};" })
  await d.pg.evaluate(() => nav('pricing', document.querySelector('.panelnav [data-panel=pricing]'))); await d.pg.waitForTimeout(400)
  ok(await d.pg.evaluate(() => document.getElementById('dom-iban').readOnly) && (await d.pg.textContent('#dom-prov')).includes('Zaključano'), 'dashboard: IBAN zaključan dok je oznaka važeća')
  await d.pg.click('#dom-prov button'); await d.pg.waitForTimeout(300)
  ok(!(await d.pg.evaluate(() => document.getElementById('dom-iban').readOnly)), 'dashboard: „Promijeni račun” (uz potvrdu) otključa IBAN')
  ok(d.errs.length === 0, 'dashboard bez JS grešaka ' + d.errs.join(' | '))
  await d.pg.close()

  // 5) admin: tab Provjere, odluka ide kroz admin_odluci_provjeru
  r = await stranica(b, '/admin.html#provjere', `window.__USER.id='${ADMIN}';window.__ARGS=[];window.__RPC=(n,a)=>{window.__ARGS.push([n,a]);return n==='admin_provjere'?{data:[${JSON.stringify(ZAHTJEV)}],error:null}:n==='admin_odluci_provjeru'?{data:{stanje:'ok'},error:null}:{data:null,error:{code:'PGRST202',message:'x'}}};`)
  ok(await r.pg.isVisible('.pv[data-uid="u1"]') && (await r.pg.textContent('.pv')).includes('HR-123'), 'admin: zahtjev s IBAN-om i registracijskim brojem')
  ok((await r.pg.textContent('#cntProvjere')) === '1', 'admin: značka broji zahtjeve na čekanju')
  await r.pg.click('.pv [data-pv-odluka="odbijen"]'); await r.pg.waitForTimeout(300)
  ok(!(await r.pg.evaluate(() => window.__ARGS.some(x => x[0] === 'admin_odluci_provjeru'))), 'admin: odbijanje bez razloga se ne šalje')
  await r.pg.keyboard.press('Escape'); await r.pg.waitForTimeout(200)
  await r.pg.click('.pv [data-pv-odluka="provjeren"]'); await r.pg.waitForTimeout(500)
  const odl = await r.pg.evaluate(() => window.__ARGS.find(x => x[0] === 'admin_odluci_provjeru'))
  ok(odl && odl[1].p_user === 'u1' && odl[1].p_odluka === 'provjeren', 'admin: „Provjeren” zove admin_odluci_provjeru')
  ok(r.errs.length === 0, 'admin bez JS grešaka ' + r.errs.join(' | '))
  await r.pg.close()
  await b.close()
}
