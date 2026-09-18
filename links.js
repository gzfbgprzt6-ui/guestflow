// ============================================================================
//  Odmoria — gradnja linkova
//  ---------------------------------------------------------------------------
//  Adresa se NE zakucava. Link se gradi od domene na kojoj korisnik trenutno
//  jest, pa radi i na Vercel adresi i na vlastitoj domeni kad se spoji —
//  bez ijedne izmjene koda.
//
//  Ako jednog dana zatreba da linkovi UVIJEK pokazuju na jednu domenu
//  (npr. da se s preview deploya ne kopiraju preview linkovi), dovoljno je
//  upisati je u SITE_URL ispod. Prazno znaci "koristi trenutnu".
// ============================================================================

export const SITE_URL = ''   // npr. 'https://odmoria.com'

export function siteBase() {
  const s = (SITE_URL || '').trim().replace(/\/+$/, '')
  if (s) return s
  if (typeof location !== 'undefined' && location.origin && location.origin !== 'null') {
    return location.origin.replace(/\/+$/, '')
  }
  return ''
}

/** Javna stranica objekta: /p/<slug> */
export function publicUrl(slug) {
  return siteBase() + '/p/' + encodeURIComponent(slug || '')
}

/** Privatni vodic za jednu rezervaciju: /h/<token> */
export function bookingUrl(token) {
  return siteBase() + '/h/' + encodeURIComponent(token || '')
}

/** Stariji, opci gostinski link vezan uz objekt: /h/<slug>-<guest_token> */
export function legacyGuestUrl(slug, guestToken) {
  return siteBase() + '/h/' + encodeURIComponent((slug || '') + '-' + (guestToken || ''))
}

/** Za prikaz u sucelju — bez "https://" i bez zavrsne kose crte. */
export function prettyUrl(url) {
  return (url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
}
