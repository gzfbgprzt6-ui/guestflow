// ručne snimke vodiča (nije test): node snimi-vodic.mjs <izlazna mapa>
import { pokreni } from './lib/server.mjs'
import { launch } from './lib/zaj.mjs'
const out = process.argv[2] || '.'
const { s, url } = await pokreni()
const b = await launch()
const METEO = { daily: { time: [0,1,2,3,4,5].map(n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }), weather_code: [0, 2, 61, 3, 0, 1], temperature_2m_max: [27.4, 26, 22, 24, 28, 29], temperature_2m_min: [19, 18, 17, 18, 20, 21] } }
for (const [w, hgt] of [[390, 844], [1280, 900]]) {
  const pg = await b.newPage({ viewport: { width: w, height: hgt }, locale: 'hr-HR', reducedMotion: 'reduce' })
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()))
  await pg.route('**://esm.sh/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: `const q={from:()=>q,select:()=>q,eq:()=>q,order:()=>Promise.resolve({data:[]}),insert:()=>Promise.resolve({})};export const createClient=()=>({from:()=>q,rpc:async()=>({data:null,error:{message:'x'}})});export default {toDataURL:async()=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h4v4H0zM6 0h4v4H6zM0 6h4v4H0zM6 6h2v2H6z"/></svg>')}` }))
  await pg.route(/google\.com\/maps/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<body style="background:#dfe9e4"></body>' }))
  await pg.route('**api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(METEO) }))
  await pg.route('**marine-api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ current: { sea_surface_temperature: 22.6 } }) }))
  await pg.goto(url + '/h.html?token=demo', { waitUntil: 'load' }); await pg.waitForTimeout(3500)
  const sir = await pg.evaluate(() => document.documentElement.scrollWidth)
  await pg.screenshot({ path: `${out}/vodic-${w}.png`, fullPage: true })
  const H = await pg.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0, i = 0; y < H; y += 1300, i++) await pg.screenshot({ path: `${out}/vodic-${w}-${i}.png`, fullPage: true, clip: { x: 0, y, width: w, height: Math.min(1300, H - y) } })
  console.log(w, 'širina', sir, 'greške', errs)
  await pg.close()
}
await b.close(); s.close()
