// P0-4: tehničke poruke (sql/…, Supabase…) domaćin ne vidi; Preporuči domaćina je u Postavkama; vlastita adresa skrivena
import { launch, otvori, ok } from './lib/zaj.mjs'
export default async function () {
  const b = await launch()
  const { pg, errs } = await otvori(b, { w: 1440 })
  await pg.evaluate(() => { const p = document.createElement('p'); p.className = 'helper'; p.id = 'tt'; p.innerHTML = 'Suradnici još nisu uključeni — u Supabaseu treba pokrenuti <code>sql/add-team-access.sql</code>.'; document.querySelector('.editor-panel.active').appendChild(p); window.toast('Za slike treba pokrenuti sql/add-place-photos.sql') })
  await pg.waitForTimeout(200)
  const tt = await pg.textContent('#tt'), toast = await pg.textContent('#toast')
  ok(!/sql\/|Supabase/.test(tt) && /još nisu uključeni/.test(tt), 'poruka u panelu bez SQL-a: ' + tt)
  ok(!/sql\//.test(toast) && /nije uključena/.test(toast), 'toast bez SQL-a: ' + toast)
  ok(await pg.$eval('#adresa-card', e => e.hidden), 'kartica „Vlastita adresa” je skrivena')
  ok(await pg.$eval('#prep-card', e => !!e.closest('#section-sub')), '„Preporuči domaćina” je u Postavkama (Pretplata)')
  ok(errs.length === 0, 'bez JS grešaka ' + errs.join(' | '))
  await pg.close(); await b.close()
}
