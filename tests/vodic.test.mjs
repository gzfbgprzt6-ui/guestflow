// Privatni vodič (h.html) „časopis”: šifre prije otključavanja ne postoje u HTML-u,
// sve je na jednoj stranici, stare adrese skrolaju do odjeljka, stil objekta vrijedi i ovdje.
import { BASE, launch, ok, d, FAKE } from './lib/zaj.mjs'

const PROP = { id: 'p1', name: 'Villa Maslina', location: 'Put maslina 12, Primošten', host_name: 'Marija', phone: '+385911234567',
  email: 'm@x.hr', max_guests: 6, theme: null, cover_photo_url: '/assets/landing/villa-900.jpg', photo_urls: ['/assets/landing/villa-900.jpg'] }
const SEC = { wifi_name: 'Maslina-Gost', checkin_time: '15:00', checkout_time: '10:00', address: 'Put maslina 12', ac_info: 'Daljinski je u ladici.',
  checkout_notes: 'Zatvorite prozore\nUgasite klimu', parking_info: 'Ispred kuće' }
const LISTE = { local_places: [{ id: 'l1', property_id: 'p1', name: 'Plaža Raduča', category: 'Plaže', distance: '5 min pješice', maps_query: '43.58,15.92', sort_order: 1 },
  { id: 'l2', property_id: 'p1', name: 'Konoba', category: 'Restorani', distance: '10 min', sort_order: 2 }],
  house_rules: [{ id: 'r1', property_id: 'p1', rule_text: 'Tišina od 23 sata.', sort_order: 1 }], faq: [], transport: [], attractions: [] }

function odgovor({ otvoreno, ci, co, theme = null, ceka = false }) {
  const section = otvoreno ? { ...SEC, door_code: '4821', wifi_pass: 'tajna-lozinka-9' } : { ...SEC, ima_door_code: true, ima_wifi_pass: true }
  return { stanje: 'ok', otvoreno, ceka_uplatu: ceka, property: { ...PROP, theme }, booking: { guest_name: 'Ana Kovač', checkin_date: ci, checkout_date: co },
    section, otkljucava: ci + 'T14:00:00', zavrsava: co + 'T23:59:00' }
}

async function otvoriVodic(b, r, { w = 390, h = 844, hash = '' } = {}) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, locale: 'hr-HR', reducedMotion: 'reduce' })
  const errs = []; pg.on('pageerror', e => errs.push(e.message))
  await pg.route(/google\.com\/maps|fonts\.g/, x => x.fulfill({ status: 200, contentType: 'text/html', body: '' }))
  await pg.route(/open-meteo\.com/, x => x.fulfill({ status: 503, body: '' }))
  await pg.route('**/api/**', x => x.fulfill({ status: 404, body: '' }))
  await pg.route('**://esm.sh/**', x => x.fulfill({ status: 200, contentType: 'application/javascript',
    body: `export const createClient=()=>globalThis.__SB;export default {toDataURL:async s=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><title>'+s+'</title></svg>')}` }))
  await pg.addInitScript(`(()=>{window.__ROWS=${JSON.stringify(LISTE)};window.__RPC=(n)=>n==='vodic_gosta'?{data:${JSON.stringify(r)},error:null}:{data:null,error:{code:'PGRST202',message:'x'}}})();\n;` + FAKE)
  await pg.goto(BASE + '/h.html?token=abcdefgh12345678' + hash, { waitUntil: 'load' }); await pg.waitForTimeout(1500)
  return { pg, errs }
}

export default async function () {
  const b = await launch()

  // 1) prije dolaska: zaključano
  let { pg, errs } = await otvoriVodic(b, odgovor({ otvoreno: false, ci: d(5), co: d(9) }))
  const html = await pg.content()
  ok(!html.includes('4821') && !html.includes('tajna-lozinka-9'), 'prije otključavanja šifra i lozinka nisu u HTML-u')
  ok(!(await pg.$('#wifi-qr')), 'prije otključavanja nema QR koda za Wi-Fi')
  ok(await pg.isVisible('#skok'), 'trake za skok su vidljive')
  ok(await pg.isVisible('#o-ulaz') && await pg.isVisible('#o-wifi') && await pg.isVisible('#o-pravila'), 'odjeljci su odmah na početnoj (bez podstranica)')
  ok((await pg.textContent('#hero-poz')).includes('Dolazak za'), 'oznaka faze na fotografiji: „Dolazak za …”')
  ok(await pg.isVisible('#zakl'), 'okvir „Podaci za ulazak dostupni od …”')
  ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 390, 'bez vodoravnog prelijevanja na 390 px')
  await pg.click('#skok [data-skok="pravila"]'); await pg.waitForTimeout(300)
  const y = await pg.evaluate(() => document.getElementById('o-pravila').getBoundingClientRect().top)
  ok(y >= 0 && y < 200, 'klik na „Pravila” skrola do odjeljka')
  ok(errs.length === 0, 'bez JS grešaka (prije dolaska) ' + errs.join(' | '))
  await pg.close()

  // 2) stara adresa podstranice skrola do odjeljka
  ;({ pg, errs } = await otvoriVodic(b, odgovor({ otvoreno: false, ci: d(5), co: d(9) }), { hash: '#kuca/odlazak' }))
  await pg.waitForTimeout(300)
  const y2 = await pg.evaluate(() => document.getElementById('o-odlazak').getBoundingClientRect().top)
  ok(y2 >= 0 && y2 < 200, 'stara adresa #kuca/odlazak vodi na odjeljak Odlazak')
  await pg.close()

  // 3) boravak: otključano, QR, stil objekta
  ;({ pg, errs } = await otvoriVodic(b, odgovor({ otvoreno: true, ci: d(-1), co: d(3), theme: 'luksuz' }), { w: 1280, h: 900 }))
  await pg.waitForTimeout(500)
  if (process.env.SNIMKE) await pg.screenshot({ path: process.env.SNIMKE + '/luksuz.png', fullPage: true })
  ok((await pg.textContent('#codes-wifi')).includes('tajna-lozinka-9'), 'nakon otključavanja lozinka je vidljiva')
  ok(await pg.isVisible('#wifi-qr'), 'nakon otključavanja QR za Wi-Fi')
  ok((await pg.textContent('#hero-poz')).includes('Dan 2 od 4'), 'oznaka faze: „Dan 2 od 4”')
  ok(await pg.evaluate(() => document.documentElement.dataset.stil) === 'luksuz', 'stil objekta (Tamni) vrijedi i u vodiču')
  ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 1280, 'bez prelijevanja na 1280 px')
  ok(errs.length === 0, 'bez JS grešaka (boravak) ' + errs.join(' | '))
  await pg.close()

  // 3b) boravak, ali šifre čekaju potvrdu uplate (baza ih ne šalje)
  ;({ pg, errs } = await otvoriVodic(b, odgovor({ otvoreno: false, ceka: true, ci: d(0), co: d(3) })))
  ok(!(await pg.content()).includes('4821'), 'čeka uplatu: šifre nema u HTML-u')
  ok((await pg.textContent('#zakl')).includes('potvrdi uplatu'), 'čeka uplatu: „Šifra stiže kad domaćin potvrdi uplatu”')
  ok(errs.length === 0, 'bez JS grešaka (čeka uplatu) ' + errs.join(' | '))
  await pg.close()

  // 4) 360 px, dan odlaska
  ;({ pg, errs } = await otvoriVodic(b, odgovor({ otvoreno: true, ci: d(-4), co: d(0) }), { w: 360, h: 760 }))
  ok((await pg.textContent('#hero-poz')).includes('Danas odlazite'), 'dan odlaska: „Danas odlazite”')
  ok(await pg.evaluate(() => document.documentElement.scrollWidth) <= 360, 'bez prelijevanja na 360 px')
  ok(errs.length === 0, 'bez JS grešaka (odlazak) ' + errs.join(' | '))
  await pg.close()
  await b.close()
}
