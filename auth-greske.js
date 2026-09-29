// Prijevod poruka Supabase Autha na hrvatski — jedno mjesto za prijavu,
// registraciju, novu lozinku i Račun. Nepoznata poruka ide uz `uvod`.

const PRIJEVODI = [
  [/invalid login credentials/i, 'E-mail ili lozinka nisu točni.'],
  [/email not confirmed/i, 'E-mail još nije potvrđen. Otvorite link iz poruke koju smo vam poslali.'],
  [/rate limit|too many|only request this after|over_email_send/i, 'Previše pokušaja. Pričekajte minutu pa pokušajte ponovno.'],
  [/already registered|already exists|already been registered/i, 'Račun s tim e-mailom već postoji. Prijavite se ili zatražite link za novu lozinku.'],
  [/different from the old password|same password/i, 'Nova lozinka mora se razlikovati od stare.'],
  [/password.*(least|short|weak|characters)|weak.*password|pwned|known to be weak/i, 'Lozinka je preslaba. Upotrijebite najmanje 8 znakova, sa slovima i brojevima.'],
  [/unable to validate email|invalid.*email|email.*invalid/i, 'E-mail adresa nije ispravna.'],
  [/link is invalid|has expired|otp_expired|token.*expired|expired.*token/i, 'Link je istekao ili je već iskorišten. Zatražite novi.'],
  [/session missing|not authenticated|jwt expired|invalid jwt/i, 'Sesija je istekla. Prijavite se ponovno.'],
  [/signups? not allowed|signup is disabled/i, 'Registracija trenutačno nije otvorena.'],
  [/user not found|no user/i, 'Ne postoji račun s tim e-mailom.'],
  [/provider is not enabled|unsupported provider/i, 'Ta vrsta prijave trenutačno nije uključena.'],
  [/failed to fetch|network|load failed/i, 'Nema veze s poslužiteljem. Provjerite internet i pokušajte ponovno.']
]

export function hrGreska(e, uvod = 'Nije uspjelo') {
  const m = String((e && (e.message || e.error_description || e.msg)) || e || '')
  for (const [re, t] of PRIJEVODI) if (re.test(m)) return t
  return m ? `${uvod}: ${m}` : uvod + '.'
}
