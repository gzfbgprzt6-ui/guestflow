/* Odmoria — domaćin nikad ne vidi tehničke upute (analiza vlasnika, 23. 10. 2026., P0-4).
   Poruke u kodu i dalje kažu koji SQL ili ključ fali (to treba vlasniku aplikacije i
   testovima), ali u sučelju domaćina rečenica s „sql/…”, Supabase, Vercel, imenom
   varijable okruženja ili docs/ nestane, a umjesto nje stoji „Ova mogućnost još nije
   uključena.” Izvorna poruka ide u konzolu. Vlasnik aplikacije (window.__ADMIN = true)
   vidi sve kao prije.
   Radi na svakom tekstu u DOM-u (paneli, toast, upozorenja, prozori potvrda.js) preko
   MutationObservera — nije potrebno mijenjati svaku poruku posebno. */
;(() => {
  const TEHN = /sql\/|\.sql\b|supabase|vercel|service_role|SUPABASE_|ANTHROPIC_|STRIPE_|CRON_SECRET|docs\/odluke/i
  const en = () => { try { return localStorage.getItem('odm-jezik-domacina') === 'en' } catch { return false } }
  const ZAMJENA = () => en() ? 'This feature is not switched on yet.' : 'Ova mogućnost još nije uključena.'

  function ocisti(s) {
    if (!s || !TEHN.test(s)) return s
    // zagrade s tehničkim sadržajem: „(sql/add-x.sql)”, „(docs/odluke.md, točka 18)”
    let t = s.replace(/\s*\([^()]*\)/g, m => TEHN.test(m) ? '' : m)
    // ostatak po rečenicama i odsječcima „ — ”; tehnički odsječci ispadaju
    const dijelovi = t.split(/(?<=[.!?])\s+|\s+[—–]\s+/)
    const ost = dijelovi.filter(d => d && !TEHN.test(d))
    let r = ost.join(' ').trim().replace(/[\s,;:—–-]+$/, '')
    if (r && !/[.!?…]$/.test(r)) r += '.'
    if (ost.length === dijelovi.length) return r   // samo zagrada je bila tehnička
    return r ? (/još nije uključen|not switched on/i.test(r) ? r : r + ' ' + ZAMJENA()) : ZAMJENA()
  }
  window.ocistiTehniku = ocisti

  const BLOK = 'P,LI,SPAN,DIV,SMALL,B,STRONG,H2,H3,H4,TD,LABEL,DD'
  // tekst elementa bez <script>/<style> (inače bi skripta u omotaču „sadržavala” poruku)
  const tekst = el => {
    let s = ''
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('script,style,noscript') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT })
    while (w.nextNode()) s += w.currentNode.nodeValue
    return s
  }
  function obradi(el) {
    if (window.__ADMIN || !el || el.nodeType !== 1 || el.closest('script,style,textarea,[data-tehnika]')) return
    if (!TEHN.test(tekst(el))) return
    // najdublji elementi koji sadrže tehničku poruku
    const kand = [el, ...el.querySelectorAll(BLOK)].filter(d => !d.closest('script,style,textarea,[data-tehnika]') && TEHN.test(tekst(d)))
    for (const d of kand) if (![...d.querySelectorAll(BLOK)].some(c => TEHN.test(tekst(c)))) zamijeni(d)
  }
  function zamijeni(d) {
    const prije = tekst(d), novo = ocisti(prije)
    if (novo === prije) return
    console.info('[Odmoria · tehnička poruka]', prije)
    d.textContent = novo
  }
  function sve() { obradi(document.body) }
  const mo = new MutationObserver(ms => {
    if (window.__ADMIN) return
    for (const m of ms) {
      if (m.type === 'characterData') obradi(m.target.parentElement)
      else { obradi(m.target); m.addedNodes.forEach(n => n.nodeType === 1 ? obradi(n) : n.nodeType === 3 && obradi(n.parentElement)) }
    }
  })
  const kreni = () => { sve(); mo.observe(document.body, { childList: true, subtree: true, characterData: true }) }
  if (document.body) kreni(); else document.addEventListener('DOMContentLoaded', kreni)
})()
