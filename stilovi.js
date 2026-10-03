// ============================================================================
//  Odmoria — STILOVI javne stranice (listopad 2026.)
//  ---------------------------------------------------------------------------
//  Osam stilova s platna (docs/odluke.md, točka 20) + zadani izgled „Odmoria”.
//  Domaćin bira u dashboardu (Objekt → Osnovno → Izgled stranice); izbor se
//  sprema u properties.theme (sql/add-styles.sql). Prazno / staro ime teme =
//  zadani izgled.
//
//  Ovdje je JEDAN izvor: imena, opisi, pisma (Google Fonts) i osnovne boje.
//  - p.html: primijeni(id) → <html data-stil="…"> + pisma; sve ostalo radi
//    stilovi.css (tokeni odmoria.css + ukrasi po stilu).
//  - dashboard: birač (kartice) i pregled gosta na telefonu čitaju `t` (boje,
//    pisma) — zato pregled izgleda kao stil i bez stilovi.css.
//  - api/stranica.js ima KOPIJU id-jeva i adresa pisama (CommonJS ne može
//    uvesti ovaj modul) — mijenjati zajedno.
// ============================================================================

const GF = 'https://fonts.googleapis.com/css2?'

export const STILOVI = [
  { id: '', ime: 'Odmoria', opis: 'Zadani izgled — perla, petrol i more.', pisma: '',
    t: { bg: '#FCFCFA', surface: '#FFFFFF', wash: '#EDF5F6', ink: '#103D4B', muted: '#536D77', accent: '#116D76',
         action: '#116D76', actionInk: '#FFFFFF', line: '#E0E8EB', display: "Georgia,'Gelasio',serif", ui: "'Manrope',system-ui,sans-serif",
         body: "'DM Sans',system-ui,sans-serif", r: '14px', rBtn: '7px', tint: '10,42,51' } },
  { id: 'priroda', ime: 'Priroda', opis: 'Lan i maslina, organski oblici, pismo domaćina.',
    pisma: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500;1,600&family=Karla:wght@400;500;600;700',
    t: { bg: '#F4F0E6', surface: '#FBF8F1', wash: '#E9E8D6', ink: '#33402A', muted: '#5B5A44', accent: '#4E5C33',
         action: '#56653A', actionInk: '#FBF8F1', line: '#D8CCB2', display: "'Cormorant Garamond',Georgia,serif", ui: "Karla,system-ui,sans-serif",
         body: "Karla,system-ui,sans-serif", r: '28px', rBtn: '999px', tint: '40,48,30' } },
  { id: 'luksuz', ime: 'Luksuz', opis: 'Crno, bjelokost i zlato — puno zraka, tanke linije.',
    pisma: 'family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Jost:wght@400;500;600',
    t: { bg: '#0F0E0C', surface: '#191714', wash: '#221F1B', ink: '#F3EEE5', muted: '#B8AFA1', accent: '#D8BC85',
         action: '#C6A66B', actionInk: '#0F0E0C', line: '#3A352E', display: "'Playfair Display',Georgia,serif", ui: "Jost,system-ui,sans-serif",
         body: "Jost,system-ui,sans-serif", r: '2px', rBtn: '0px', tint: '8,7,6' } },
  { id: 'more', ime: 'Sunce i more', opis: 'Tirkiz, pijesak i koralj — valovi i polaroidi.',
    pisma: 'family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700;800',
    t: { bg: '#FFF6E3', surface: '#FFFFFF', wash: '#D4F2F6', ink: '#0B3A4E', muted: '#3D6070', accent: '#0B4F6C',
         action: '#C93F22', actionInk: '#FFFFFF', line: '#F0DFBA', display: "Fredoka,system-ui,sans-serif", ui: "Fredoka,system-ui,sans-serif",
         body: "Nunito,system-ui,sans-serif", r: '24px', rBtn: '999px', tint: '11,58,78' } },
  { id: 'moderno', ime: 'Moderno', opis: 'Beton i crna, narančasti naglasak, blokovi (01)–(08).',
    pisma: 'family=Urbanist:wght@500;600;700;800&family=Instrument+Sans:wght@400;500;600',
    t: { bg: '#F4F3F1', surface: '#FFFFFF', wash: '#E9E7E3', ink: '#141414', muted: '#5C5A57', accent: '#B23A0A',
         action: '#141414', actionInk: '#FFFFFF', line: '#D9D6D1', display: "Urbanist,system-ui,sans-serif", ui: "Urbanist,system-ui,sans-serif",
         body: "'Instrument Sans',system-ui,sans-serif", r: '0px', rBtn: '0px', tint: '20,20,20' } },
  { id: 'grad', ime: 'Grad', opis: 'Gradska signalizacija — crno i žuto, ploča ulice, vozni red.',
    pisma: 'family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700',
    t: { bg: '#F7F7F2', surface: '#FFFFFF', wash: '#FFF3BF', ink: '#111111', muted: '#565650', accent: '#111111',
         action: '#111111', actionInk: '#FFD23F', line: '#DADAD2', display: "'Space Grotesk',system-ui,sans-serif", ui: "'Space Grotesk',system-ui,sans-serif",
         body: "'Space Grotesk',system-ui,sans-serif", r: '4px', rBtn: '4px', tint: '17,17,17' } },
  { id: 'snijeg', ime: 'Snijeg', opis: 'Alpska kuća — ledeno plava, borova zelena, staklo.',
    pisma: 'family=Josefin+Sans:wght@400;600;700&family=Figtree:wght@400;500;600;700',
    t: { bg: '#F6F9FB', surface: '#FFFFFF', wash: '#DDEBF3', ink: '#1B3A4E', muted: '#4A6575', accent: '#2B5A76',
         action: '#23463A', actionInk: '#FFFFFF', line: '#D3E2EB', display: "'Josefin Sans',system-ui,sans-serif", ui: "'Josefin Sans',system-ui,sans-serif",
         body: "Figtree,system-ui,sans-serif", r: '18px', rBtn: '12px', tint: '20,44,60' } },
  { id: 'relax', ime: 'Relax', opis: 'Spa — pijesak, kamen i eukaliptus, puno mira.',
    pisma: 'family=Marcellus&family=Albert+Sans:wght@300;400;500;600',
    t: { bg: '#F1ECE4', surface: '#FBF9F6', wash: '#DCE5DF', ink: '#3B3833', muted: '#625C54', accent: '#4A675B',
         action: '#4A675B', actionInk: '#FFFFFF', line: '#DCD3C6', display: "Marcellus,Georgia,serif", ui: "'Albert Sans',system-ui,sans-serif",
         body: "'Albert Sans',system-ui,sans-serif", r: '32px', rBtn: '999px', tint: '59,56,51' } },
  { id: 'seoska', ime: 'Seoska kuća', opis: 'Agroturizam — kockasti stolnjak, drvo, školska ploča.',
    pisma: 'family=Zilla+Slab:wght@600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Caveat:wght@500;600',
    t: { bg: '#F7F1E3', surface: '#FFFCF4', wash: '#EFE4CC', ink: '#2E2219', muted: '#665646', accent: '#9E2B25',
         action: '#9E2B25', actionInk: '#FFFFFF', line: '#DCCBAA', display: "'Zilla Slab',Georgia,serif", ui: "'Zilla Slab',Georgia,serif",
         body: "'Source Serif 4',Georgia,serif", r: '6px', rBtn: '6px', tint: '46,34,25' } },
]

export const IDS = STILOVI.map(s => s.id).filter(Boolean)
export const jeStil = id => IDS.includes(id)
/** Stil po id-ju; sve nepoznato (null, staro ime teme) = zadani. */
export const stil = id => STILOVI.find(s => s.id === id) || STILOVI[0]
export const pismaUrl = id => { const s = stil(id); return s.pisma ? GF + s.pisma + '&display=swap' : '' }

/** Učitaj Google pisma stila (jednom po stilu). */
export function ucitajPisma(id, doc = document) {
  const url = pismaUrl(id)
  if (!url || doc.querySelector(`link[data-pisma="${id}"]`)) return
  const l = doc.createElement('link')
  l.rel = 'stylesheet'; l.href = url; l.dataset.pisma = id
  doc.head.appendChild(l)
}

/** Javna stranica: <html data-stil> + pisma. Prazno/nepoznato = zadani izgled. */
export function primijeni(id, el = document.documentElement) {
  if (jeStil(id)) { el.setAttribute('data-stil', id); ucitajPisma(id, el.ownerDocument || document) }
  else el.removeAttribute('data-stil')
}

/** CSS varijable --pv-* za pregled gosta i minijature u dashboardu.
    Imena pisama su u JEDNOSTRUKIM navodnicima — niz ide u style="…" atribut. */
export function varijable(id) {
  const t = stil(id).t
  return `--pv-bg:${t.bg};--pv-surface:${t.surface};--pv-wash:${t.wash};--pv-ink:${t.ink};--pv-muted:${t.muted};`
    + `--pv-accent:${t.accent};--pv-action:${t.action};--pv-action-ink:${t.actionInk};--pv-line:${t.line};`
    + `--pv-display:${t.display};--pv-ui:${t.ui};--pv-body:${t.body};--pv-r:${t.r};--pv-r-btn:${t.rBtn};--pv-tint:${t.tint}`
}
