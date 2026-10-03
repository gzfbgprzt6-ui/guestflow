// ============================================================================
//  Odmoria — prozor za potvrdu u stilu aplikacije (umjesto confirm/alert)
//  ---------------------------------------------------------------------------
//  Sistemski confirm() pokazuje „Na web-lokaciji … navodi se sljedeće” i
//  izgleda kao upozorenje preglednika. Ovo je isti tijek u našem izgledu:
//
//    if (!await potvrdi('Ukloniti ovu stavku?', { da: 'Ukloni', opasno: true })) return
//    await obavijesti('U odabranom skupu nema e-mail adresa.')
//
//  Esc i „Odustani” = false. Fokus ide na „Odustani” kod opasnih radnji, a po
//  zatvaranju se vraća na gumb koji je prozor otvorio. Stilovi su ugrađeni i
//  čitaju tokene i dashboarda (--paper, --ink…) i odmoria.css (--bg-surface,
//  --text…), pa izgleda isto na svim stranicama. Tekst prevodi domacin-jezik.js
//  (prozor je običan DOM).
// ============================================================================

const CSS = `
.odm-potvrda{width:min(420px,calc(100vw - 32px));padding:24px;border:0;border-radius:var(--radius-lg,var(--radius-feature,14px));
  background:var(--paper,var(--bg-surface,#fff));color:var(--ink,var(--text,#103D4B));box-shadow:0 24px 64px rgba(10,42,51,.28);
  font:500 16px/1.5 var(--font-body,"DM Sans",system-ui,sans-serif)}
.odm-potvrda::backdrop{background:rgba(10,42,51,.45)}
.odm-potvrda__t{margin:0 0 20px;white-space:pre-line;font:700 18px/1.4 var(--font-ui,"Manrope",system-ui,sans-serif)}
.odm-potvrda__akc{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.odm-potvrda button{min-height:44px;padding:0 18px;border-radius:var(--radius-sm,var(--radius-control,7px));cursor:pointer;
  font:700 15px/1 var(--font-ui,"Manrope",system-ui,sans-serif)}
.odm-potvrda .ne{border:1px solid var(--line,var(--border-control,#768B94));background:transparent;color:inherit}
.odm-potvrda .da{border:0;background:var(--copper,var(--action,#116D76));color:#fff}
.odm-potvrda .da.opasno{background:var(--danger,#B42318)}
.odm-potvrda button:focus-visible{outline:2px solid var(--brown,var(--focus,#103D4B));outline-offset:2px}
@media (prefers-reduced-motion:no-preference){.odm-potvrda[open]{animation:odm-potvrda-in .16s ease-out}}
@keyframes odm-potvrda-in{from{opacity:0;transform:translateY(6px) scale(.98)}}
`

let stil = false
function prozor(poruka, { da = 'U redu', ne = 'Odustani', opasno = false, samoDa = false } = {}) {
  if (!stil) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); stil = true }
  const prije = document.activeElement
  const d = document.createElement('dialog')
  d.className = 'odm-potvrda'
  d.setAttribute('role', samoDa ? 'alertdialog' : 'dialog')
  const id = 'odm-p-' + Math.random().toString(36).slice(2, 8)
  d.setAttribute('aria-labelledby', id)
  const t = document.createElement('p'); t.className = 'odm-potvrda__t'; t.id = id; t.textContent = String(poruka ?? '')
  const akc = document.createElement('div'); akc.className = 'odm-potvrda__akc'
  const bNe = document.createElement('button'); bNe.type = 'button'; bNe.className = 'ne'; bNe.textContent = ne
  const bDa = document.createElement('button'); bDa.type = 'button'; bDa.className = 'da' + (opasno ? ' opasno' : ''); bDa.textContent = da
  if (!samoDa) akc.appendChild(bNe)
  akc.appendChild(bDa)
  d.append(t, akc)
  document.body.appendChild(d)
  return new Promise(rijesi => {
    let gotovo = false
    const kraj = v => {
      if (gotovo) return; gotovo = true
      if (d.open) d.close()
      d.remove()
      if (prije && typeof prije.focus === 'function' && document.contains(prije)) prije.focus()
      rijesi(v)
    }
    bDa.addEventListener('click', () => kraj(true))
    bNe.addEventListener('click', () => kraj(false))
    d.addEventListener('cancel', e => { e.preventDefault(); kraj(samoDa) })   // Esc
    d.addEventListener('click', e => { if (e.target === d) kraj(samoDa) })    // klik izvan prozora
    d.showModal()
    ;(opasno && !samoDa ? bNe : bDa).focus()
  })
}

/** Pitanje s „Odustani” i potvrdom → Promise<boolean> */
export const potvrdi = (poruka, opcije) => prozor(poruka, opcije)
/** Obavijest s jednim gumbom → Promise<true> */
export const obavijesti = (poruka, opcije = {}) => prozor(poruka, { ...opcije, samoDa: true })
