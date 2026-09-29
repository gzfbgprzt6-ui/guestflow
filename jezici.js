// ============================================================
// Jezici gostinskih stranica (vodič h.html i javna stranica p.html).
//
// Hrvatski je izvor: ključ rječnika JE hrvatski tekst, pa stranica bez
// prijevoda (ili na hrvatskom) ostaje točno ista kao prije. Dva sloja:
//   - SUČELJE (gumbi, naslovi, poruke) — rječnik niže, radi bez mreže;
//   - SADRŽAJ DOMAĆINA (riječ dobrodošlice, upute, pravila…) — /api/prevedi,
//     s AI prijevodom spremljenim u bazi; broj jezika ovisi o planu domaćina.
//
//   t('Prijava od {v}', { v: '15:00' })    tekst sučelja
//   n(3, 'noć')                             „3 noći” / „3 nights” (množina po jeziku)
//   H(tekst)                                tekst domaćina (prijevod ili izvornik)
//   prevediDom()                            statični HTML stranice (tekst + aria-label…)
//
// Redoslijed JEZICI je i redoslijed otključavanja po planu (Free 2 = HR + EN).
// ============================================================

export const JEZICI = [
  { kod: 'hr', ime: 'Hrvatski', loc: 'hr-HR' },
  { kod: 'en', ime: 'English', loc: 'en-GB' },
  { kod: 'de', ime: 'Deutsch', loc: 'de-DE' },
  { kod: 'it', ime: 'Italiano', loc: 'it-IT' },
  { kod: 'pl', ime: 'Polski', loc: 'pl-PL' },
  { kod: 'cs', ime: 'Čeština', loc: 'cs-CZ' }
]
const KODOVI = JEZICI.map(j => j.kod)
const LOC = Object.fromEntries(JEZICI.map(j => [j.kod, j.loc]))
const SPREMLJENO = 'odm-jezik'
// jezici koji se razumiju s hrvatskim bolje nego s engleskim
const BLISKI = { sl: 'hr', bs: 'hr', sr: 'hr', me: 'hr', sh: 'hr' }

let J = 'hr'
let DOPUSTENI = KODOVI
let SADRZAJ = Object.create(null)
let STANJE_PRIJEVODA = null          // odgovor rute za trenutni jezik

export const jezik = () => J
export const lokal = (j = J) => LOC[j] || 'hr-HR'
export const dopusteni = () => DOPUSTENI

// ── rječnik sučelja: [hr, en, de, it, pl, cs] ───────────────
const R = Object.create(null)
const norm = s => String(s).replace(/\s+/g, ' ').trim()
function dodaj(redovi) {
  for (const [hr, en, de, it, pl, cs] of redovi) R[norm(hr)] = { en, de, it, pl, cs }
}

dodaj([
  // zajedničko
  ['Preskoči na sadržaj', 'Skip to content', 'Zum Inhalt springen', 'Vai al contenuto', 'Przejdź do treści', 'Přeskočit na obsah'],
  ['Jezik', 'Language', 'Sprache', 'Lingua', 'Język', 'Jazyk'],
  ['Riječ domaćina', 'A word from the host', 'Ein Wort vom Gastgeber', "Un messaggio dall'host", 'Słowo od gospodarza', 'Slovo hostitele'],
  ['Kućna pravila', 'House rules', 'Hausregeln', 'Regole della casa', 'Zasady domu', 'Domácí řád'],
  ['Česta pitanja', 'Frequently asked questions', 'Häufige Fragen', 'Domande frequenti', 'Częste pytania', 'Časté otázky'],
  ['Prikaži kartu', 'Show map', 'Karte anzeigen', 'Mostra mappa', 'Pokaż mapę', 'Zobrazit mapu'],
  ['Karta', 'Map', 'Karte', 'Mappa', 'Mapa', 'Mapa'],
  ['Nazovi', 'Call', 'Anrufen', 'Chiama', 'Zadzwoń', 'Zavolat'],
  ['E-mail', 'Email', 'E-Mail', 'E-mail', 'E-mail', 'E-mail'],
  ['e-mail', 'email', 'E-Mail', 'e-mail', 'e-mail', 'e-mail'],
  ['Javi se', 'Contact', 'Kontakt', 'Contatta', 'Napisz', 'Napsat'],
  ['Domaćin', 'Host', 'Gastgeber', 'Host', 'Gospodarz', 'Hostitel'],
  ['Vaš domaćin', 'Your host', 'Ihr Gastgeber', 'Il tuo host', 'Twój gospodarz', 'Váš hostitel'],
  ['Kontakt', 'Contact', 'Kontakt', 'Contatti', 'Kontakt', 'Kontakt'],
  ['Ostalo', 'Other', 'Sonstiges', 'Altro', 'Inne', 'Ostatní'],
  ['Sve', 'All', 'Alle', 'Tutti', 'Wszystkie', 'Vše'],
  ['Prijevoz', 'Transport', 'Verkehrsmittel', 'Trasporti', 'Transport', 'Doprava'],
  ['Izleti', 'Trips', 'Ausflüge', 'Gite', 'Wycieczki', 'Výlety'],
  ['Izlet', 'Trip', 'Ausflug', 'Gita', 'Wycieczka', 'Výlet'],
  ['{n} na karti', '{n} on the map', '{n} auf der Karte', '{n} sulla mappa', '{n} na mapie', '{n} na mapě'],
  ['Preporuke domaćina', "Host's recommendations", 'Empfehlungen des Gastgebers', "Consigli dell'host", 'Polecenia gospodarza', 'Doporučení hostitele'],
  ['Najviše gostiju', 'Maximum guests', 'Max. Gäste', 'Ospiti al massimo', 'Maks. liczba gości', 'Nejvýše hostů'],
  ['Kopirano.', 'Copied.', 'Kopiert.', 'Copiato.', 'Skopiowano.', 'Zkopírováno.'],
  ['Slanje nije uspjelo. Provjerite vezu i pokušajte ponovno.', 'Sending failed. Check your connection and try again.', 'Senden fehlgeschlagen. Prüfen Sie die Verbindung und versuchen Sie es erneut.', 'Invio non riuscito. Controlla la connessione e riprova.', 'Nie udało się wysłać. Sprawdź połączenie i spróbuj ponownie.', 'Odeslání se nezdařilo. Zkontrolujte připojení a zkuste to znovu.'],
  ['Dio teksta domaćina prikazan je na hrvatskom.', "Some of the host's text is shown in Croatian.", 'Ein Teil des Textes des Gastgebers wird auf Kroatisch angezeigt.', "Parte del testo dell'host è mostrata in croato.", 'Część tekstu gospodarza jest wyświetlana po chorwacku.', 'Část textu hostitele je zobrazena v chorvatštině.'],
  ['Tekst domaćina preveden je automatski.', "The host's text was translated automatically.", 'Der Text des Gastgebers wurde automatisch übersetzt.', "Il testo dell'host è stato tradotto automaticamente.", 'Tekst gospodarza został przetłumaczony automatycznie.', 'Text hostitele byl přeložen automaticky.'],

  // vodič (h.html) — stanja linka
  ['Učitavam vaš vodič…', 'Loading your guide…', 'Ihre Gästemappe wird geladen…', 'Sto caricando la tua guida…', 'Ładuję Twój przewodnik…', 'Načítám vašeho průvodce…'],
  ['Link nije ispravan', 'This link is not valid', 'Dieser Link ist ungültig', 'Il link non è valido', 'Link jest nieprawidłowy', 'Odkaz není platný'],
  ['Adresa je nepotpuna ili pogrešno kopirana. Otvorite link iz poruke domaćina ponovno.', "The address is incomplete or was copied incorrectly. Open the link from your host's message again.", 'Die Adresse ist unvollständig oder falsch kopiert. Öffnen Sie den Link aus der Nachricht Ihres Gastgebers erneut.', "L'indirizzo è incompleto o copiato male. Apri di nuovo il link dal messaggio dell'host.", 'Adres jest niepełny lub źle skopiowany. Otwórz ponownie link z wiadomości od gospodarza.', 'Adresa je neúplná nebo špatně zkopírovaná. Otevřete znovu odkaz ze zprávy od hostitele.'],
  ['Iz sigurnosnih razloga ova stranica ne otkriva naziv ni adresu smještaja.', 'For security reasons, this page does not reveal the name or address of the accommodation.', 'Aus Sicherheitsgründen zeigt diese Seite weder den Namen noch die Adresse der Unterkunft.', "Per motivi di sicurezza, questa pagina non mostra il nome né l'indirizzo dell'alloggio.", 'Ze względów bezpieczeństwa ta strona nie ujawnia nazwy ani adresu obiektu.', 'Z bezpečnostních důvodů tato stránka neuvádí název ani adresu ubytování.'],
  ['Ovaj link je istekao', 'This link has expired', 'Dieser Link ist abgelaufen', 'Questo link è scaduto', 'Ten link wygasł', 'Platnost odkazu vypršela'],
  ['Boravak je završio ili je link zamijenjen novim. Zamolite domaćina za novi link.', 'The stay has ended or the link has been replaced by a new one. Ask your host for a new link.', 'Der Aufenthalt ist beendet oder der Link wurde ersetzt. Bitten Sie Ihren Gastgeber um einen neuen Link.', "Il soggiorno è terminato o il link è stato sostituito. Chiedi all'host un nuovo link.", 'Pobyt się zakończył lub link został zastąpiony nowym. Poproś gospodarza o nowy link.', 'Pobyt skončil nebo byl odkaz nahrazen novým. Požádejte hostitele o nový odkaz.'],
  ['Objekt nije pronađen', 'Property not found', 'Unterkunft nicht gefunden', 'Alloggio non trovato', 'Nie znaleziono obiektu', 'Ubytování nenalezeno'],
  ['Smještaj više nije objavljen. Zamolite domaćina za novi link.', 'This accommodation is no longer published. Ask your host for a new link.', 'Die Unterkunft ist nicht mehr veröffentlicht. Bitten Sie Ihren Gastgeber um einen neuen Link.', "L'alloggio non è più pubblicato. Chiedi all'host un nuovo link.", 'Obiekt nie jest już opublikowany. Poproś gospodarza o nowy link.', 'Ubytování už není zveřejněno. Požádejte hostitele o nový odkaz.'],

  // vodič — primjer, zaglavlje, početna
  ['Primjer vodiča', 'Sample guide', 'Beispiel-Gästemappe', 'Guida di esempio', 'Przykładowy przewodnik', 'Ukázkový průvodce'],
  ['· izmišljeni smještaj i podaci. Vaš gost vidi svoj smještaj, s pravim šiframa tek sat prije dolaska.', '· a made-up property and data. Your guest sees their own accommodation, with the real codes only an hour before arrival.', '· erfundene Unterkunft und Daten. Ihr Gast sieht seine eigene Unterkunft, mit den echten Codes erst eine Stunde vor der Ankunft.', "· alloggio e dati inventati. Il tuo ospite vede il proprio alloggio, con i codici veri solo un'ora prima dell'arrivo.", '· zmyślony obiekt i dane. Twój gość widzi swój obiekt, a prawdziwe kody dopiero godzinę przed przyjazdem.', '· smyšlené ubytování a údaje. Váš host vidí své ubytování, se skutečnými kódy až hodinu před příjezdem.'],
  ['Napravite vodič za svoj objekt', 'Create a guide for your property', 'Erstellen Sie eine Gästemappe für Ihre Unterkunft', 'Crea una guida per il tuo alloggio', 'Utwórz przewodnik dla swojego obiektu', 'Vytvořte průvodce pro své ubytování'],
  ['Natrag na početak vodiča', 'Back to the start of the guide', 'Zurück zum Anfang', "Torna all'inizio della guida", 'Wróć na początek przewodnika', 'Zpět na začátek průvodce'],
  ['Vaš privatni vodič', 'Your private guide', 'Ihre private Gästemappe', 'La tua guida privata', 'Twój prywatny przewodnik', 'Váš soukromý průvodce'],
  ['{n} · privatni vodič', '{n} · private guide', '{n} · private Gästemappe', '{n} · guida privata', '{n} · prywatny przewodnik', '{n} · soukromý průvodce'],
  ['{n} — vaš vodič', '{n} — your guide', '{n} — Ihre Gästemappe', '{n} — la tua guida', '{n} — Twój przewodnik', '{n} — váš průvodce'],
  ['Privatno', 'Private', 'Privat', 'Privato', 'Prywatne', 'Soukromé'],
  ['Vaš boravak', 'Your stay', 'Ihr Aufenthalt', 'Il tuo soggiorno', 'Twój pobyt', 'Váš pobyt'],
  ['Vaš smještaj', 'Your accommodation', 'Ihre Unterkunft', 'Il tuo alloggio', 'Twój obiekt', 'Vaše ubytování'],
  ['Dobro došli, {ime}.', 'Welcome, {ime}.', 'Willkommen, {ime}.', 'Ti diamo il benvenuto, {ime}.', 'Witamy, {ime}.', 'Vítejte, {ime}.'],
  ['Dobro došli.', 'Welcome.', 'Willkommen.', 'Benvenuti.', 'Witamy.', 'Vítejte.'],
  ['Prijava od {v}', 'Check-in from {v}', 'Check-in ab {v}', 'Check-in dalle {v}', 'Zameldowanie od {v}', 'Check-in od {v}'],
  ['Odjava do {v}', 'Check-out by {v}', 'Check-out bis {v}', 'Check-out entro le {v}', 'Wymeldowanie do {v}', 'Check-out do {v}'],
  ['Nadamo se da ćete uživati u boravku.', 'We hope you enjoy your stay.', 'Wir wünschen Ihnen einen schönen Aufenthalt.', 'Ci auguriamo che il soggiorno ti piaccia.', 'Mamy nadzieję, że pobyt będzie udany.', 'Doufáme, že si pobyt užijete.'],
  ['Sve za boravak', 'Everything for your stay', 'Alles für Ihren Aufenthalt', 'Tutto per il soggiorno', 'Wszystko na pobyt', 'Vše pro váš pobyt'],
  ['Vaš pristup', 'Your access', 'Ihr Zugang', 'Il tuo accesso', 'Twój dostęp', 'Váš přístup'],
  ['Trebate nešto?', 'Need anything?', 'Brauchen Sie etwas?', 'Ti serve qualcosa?', 'Potrzebujesz czegoś?', 'Potřebujete něco?'],
  ['Javite se domaćinu.', 'Contact your host.', 'Melden Sie sich beim Gastgeber.', "Contatta l'host.", 'Napisz do gospodarza.', 'Ozvěte se hostiteli.'],
  ['Trebate nešto? Javite se domaćinu.', 'Need anything? Contact your host.', 'Brauchen Sie etwas? Melden Sie sich beim Gastgeber.', "Ti serve qualcosa? Contatta l'host.", 'Potrzebujesz czegoś? Napisz do gospodarza.', 'Potřebujete něco? Ozvěte se hostiteli.'],
  ['{n} odgovara na WhatsApp.', '{n} replies on WhatsApp.', '{n} antwortet auf WhatsApp.', '{n} risponde su WhatsApp.', '{n} odpowiada na WhatsAppie.', '{n} odpovídá na WhatsAppu.'],
  ['{n} odgovara.', '{n} will reply.', '{n} antwortet Ihnen.', '{n} ti risponderà.', '{n} odpowie.', '{n} vám odpoví.'],

  // pločice
  ['Dolazak', 'Arrival', 'Anreise', 'Arrivo', 'Przyjazd', 'Příjezd'],
  ['Adresa, parking, upute', 'Address, parking, directions', 'Adresse, Parken, Anfahrt', 'Indirizzo, parcheggio, indicazioni', 'Adres, parking, wskazówki', 'Adresa, parkování, pokyny'],
  ['Wi-Fi i kuća', 'Wi-Fi & house', 'WLAN & Haus', 'Wi-Fi e casa', 'Wi-Fi i dom', 'Wi-Fi a dům'],
  ['Mreža, lozinka, uređaji', 'Network, password, appliances', 'Netz, Passwort, Geräte', 'Rete, password, elettrodomestici', 'Sieć, hasło, urządzenia', 'Síť, heslo, spotřebiče'],
  ['Preporuke', 'Recommendations', 'Empfehlungen', 'Consigli', 'Polecenia', 'Doporučení'],
  ['Plaže, hrana, izleti', 'Beaches, food, trips', 'Strände, Essen, Ausflüge', 'Spiagge, cibo, gite', 'Plaże, jedzenie, wycieczki', 'Pláže, jídlo, výlety'],
  ['Prijava boravka', 'Guest registration', 'Gästeanmeldung', 'Registrazione ospiti', 'Zgłoszenie pobytu', 'Přihlášení k pobytu'],
  ['Podaci za eVisitor', 'Details for eVisitor', 'Daten für eVisitor', 'Dati per eVisitor', 'Dane do eVisitor', 'Údaje pro eVisitor'],
  ['I česta pitanja', 'And FAQs', 'Und häufige Fragen', 'E domande frequenti', 'I częste pytania', 'A časté otázky'],
  ['Odlazak', 'Departure', 'Abreise', 'Partenza', 'Wyjazd', 'Odjezd'],
  ['Popis i ocjena boravka', 'Checklist and rating', 'Checkliste und Bewertung', 'Checklist e valutazione', 'Lista i ocena pobytu', 'Seznam a hodnocení pobytu'],
  ['Prije nego krenete', 'Before you leave', 'Bevor Sie abreisen', 'Prima di partire', 'Zanim wyjedziesz', 'Než odjedete'],
  ['Hitno i pomoć', 'Emergency & help', 'Notfall & Hilfe', 'Emergenze e aiuto', 'Nagłe wypadki i pomoc', 'Nouze a pomoc'],
  ['112, hitna, ljekarna', '112, ambulance, pharmacy', '112, Notarzt, Apotheke', '112, emergenza, farmacia', '112, pogotowie, apteka', '112, záchranka, lékárna'],

  // pristup i šifre
  ['Wi-Fi mreža', 'Wi-Fi network', 'WLAN-Netz', 'Rete Wi-Fi', 'Sieć Wi-Fi', 'Síť Wi-Fi'],
  ['Wi-Fi lozinka', 'Wi-Fi password', 'WLAN-Passwort', 'Password Wi-Fi', 'Hasło Wi-Fi', 'Heslo k Wi-Fi'],
  ['Šifra vrata', 'Door code', 'Türcode', 'Codice della porta', 'Kod do drzwi', 'Kód ke dveřím'],
  ['Zaključano', 'Locked', 'Gesperrt', 'Bloccato', 'Zablokowane', 'Zamčeno'],
  ['Otključano', 'Unlocked', 'Freigeschaltet', 'Sbloccato', 'Odblokowane', 'Odemčeno'],
  ['Kopiraj', 'Copy', 'Kopieren', 'Copia', 'Kopiuj', 'Kopírovat'],
  ['Kopiraj: {k}', 'Copy: {k}', 'Kopieren: {k}', 'Copia: {k}', 'Kopiuj: {k}', 'Kopírovat: {k}'],
  ['Otključava se za {rel}', 'Unlocks in {rel}', 'Freischaltung in: {rel}', 'Si sblocca tra {rel}', 'Odblokuje się za {rel}', 'Odemkne se za {rel}'],
  ['Šifra vrata i Wi-Fi pojavit će se ovdje sat prije prijave.', 'The door code and Wi-Fi will appear here an hour before check-in.', 'Türcode und WLAN erscheinen hier eine Stunde vor dem Check-in.', "Il codice della porta e il Wi-Fi appariranno qui un'ora prima del check-in.", 'Kod do drzwi i Wi-Fi pojawią się tutaj godzinę przed zameldowaniem.', 'Kód ke dveřím a Wi-Fi se tu objeví hodinu před check-inem.'],
  ['Otključava se {d} u {t}', 'Unlocks on {d} at {t}', 'Freischaltung am {d} um {t}', 'Si sblocca il {d} alle {t}', 'Odblokuje się {d} o {t}', 'Odemkne se {d} v {t}'],
  ['Sat vremena prije prijave. Stranica se otključa sama — ne trebate je osvježavati.', 'An hour before check-in. The page unlocks by itself — no need to refresh.', 'Eine Stunde vor dem Check-in. Die Seite schaltet sich selbst frei — Sie müssen sie nicht neu laden.', "Un'ora prima del check-in. La pagina si sblocca da sola, non serve aggiornarla.", 'Godzinę przed zameldowaniem. Strona odblokuje się sama — nie trzeba jej odświeżać.', 'Hodinu před check-inem. Stránka se odemkne sama — nemusíte ji obnovovat.'],
  ['Otključava se prije dolaska', 'Unlocks before arrival', 'Wird vor der Ankunft freigeschaltet', "Si sblocca prima dell'arrivo", 'Odblokuje się przed przyjazdem', 'Odemkne se před příjezdem'],
  ['Vrijedi do {d} u 23:59.', 'Valid until {d} at 23:59.', 'Gültig bis {d} um 23:59.', 'Valido fino al {d} alle 23:59.', 'Ważne do {d}, godz. 23:59.', 'Platí do {d} 23:59.'],
  ['Podijelite samo s osobama koje borave s vama.', 'Share only with the people staying with you.', 'Nur mit Ihren Mitreisenden teilen.', 'Condividi solo con chi soggiorna con te.', 'Udostępnij tylko osobom, które przebywają z Tobą.', 'Sdílejte jen s lidmi, kteří bydlí s vámi.'],
  ['Šifra i lozinka prikazuju se tek kad se pristup otključa.', 'The code and password are shown only once access unlocks.', 'Code und Passwort werden erst nach der Freischaltung angezeigt.', "Codice e password vengono mostrati solo quando l'accesso si sblocca.", 'Kod i hasło pojawią się dopiero po odblokowaniu dostępu.', 'Kód a heslo se zobrazí až po odemčení přístupu.'],
  ['Otključano · vrijedi do {d} u 23:59', 'Unlocked · valid until {d} at 23:59', 'Freigeschaltet · gültig bis {d} um 23:59', 'Sbloccato · valido fino al {d} alle 23:59', 'Odblokowane · ważne do {d}, godz. 23:59', 'Odemčeno · platí do {d} 23:59'],
  ['Zaključano do {d} u {t}', 'Locked until {d} at {t}', 'Gesperrt bis {d} um {t}', 'Bloccato fino al {d} alle {t}', 'Zablokowane do {d}, godz. {t}', 'Zamčeno do {d} {t}'],
  ['Kopiranje nije uspjelo — označite tekst i kopirajte ga ručno.', 'Copying failed — select the text and copy it manually.', 'Kopieren fehlgeschlagen — markieren Sie den Text und kopieren Sie ihn manuell.', 'Copia non riuscita: seleziona il testo e copialo a mano.', 'Nie udało się skopiować — zaznacz tekst i skopiuj go ręcznie.', 'Kopírování se nezdařilo — označte text a zkopírujte ho ručně.'],
  ['Šifra i Wi-Fi su sada dostupni.', 'The code and Wi-Fi are now available.', 'Code und WLAN sind jetzt verfügbar.', 'Codice e Wi-Fi ora sono disponibili.', 'Kod i Wi-Fi są już dostępne.', 'Kód a Wi-Fi jsou nyní k dispozici.'],

  // dolazak, kuća, pravila
  ['Kako do nas', 'How to get here', 'Anreise', 'Come arrivare', 'Jak do nas dojechać', 'Jak k nám'],
  ['Prijava', 'Check-in', 'Check-in', 'Check-in', 'Zameldowanie', 'Check-in'],
  ['Odjava', 'Check-out', 'Check-out', 'Check-out', 'Wymeldowanie', 'Check-out'],
  ['Od {v}.', 'From {v}.', 'Ab {v}.', 'Dalle {v}.', 'Od {v}.', 'Od {v}.'],
  ['Odjava je do {v}.', 'Check-out is by {v}.', 'Check-out bis {v}.', 'Il check-out è entro le {v}.', 'Wymeldowanie do {v}.', 'Check-out je do {v}.'],
  ['od {vrijeme}', 'from {vrijeme}', 'ab {vrijeme}', 'dalle {vrijeme}', 'od {vrijeme}', 'od {vrijeme}'],
  ['do {vrijeme}', 'by {vrijeme}', 'bis {vrijeme}', 'entro le {vrijeme}', 'do {vrijeme}', 'do {vrijeme}'],
  ['Upute za dolazak', 'Arrival instructions', 'Hinweise zur Ankunft', "Istruzioni per l'arrivo", 'Wskazówki dotyczące przyjazdu', 'Pokyny k příjezdu'],
  ['Parking', 'Parking', 'Parkplatz', 'Parcheggio', 'Parking', 'Parkování'],
  ['Kako što radi', 'How things work', 'So funktioniert alles', 'Come funziona tutto', 'Jak wszystko działa', 'Jak co funguje'],
  ['Klima-uređaj', 'Air conditioning', 'Klimaanlage', 'Aria condizionata', 'Klimatyzacja', 'Klimatizace'],
  ['Grijanje', 'Heating', 'Heizung', 'Riscaldamento', 'Ogrzewanie', 'Topení'],
  ['Topla voda', 'Hot water', 'Warmwasser', 'Acqua calda', 'Ciepła woda', 'Teplá voda'],
  ['Kuhinja', 'Kitchen', 'Küche', 'Cucina', 'Kuchnia', 'Kuchyně'],
  ['Sve je spremno. Sretan put!', 'All done. Have a safe trip!', 'Alles erledigt. Gute Reise!', 'Tutto pronto. Buon viaggio!', 'Wszystko gotowe. Szerokiej drogi!', 'Vše hotovo. Šťastnou cestu!'],
  ['Zatvorite prozore i balkonska vrata', 'Close the windows and balcony doors', 'Fenster und Balkontüren schließen', 'Chiudi finestre e porte del balcone', 'Zamknij okna i drzwi balkonowe', 'Zavřete okna a balkonové dveře'],
  ['Ugasite klimu, svjetla i štednjak', 'Turn off the air conditioning, lights and stove', 'Klimaanlage, Licht und Herd ausschalten', 'Spegni aria condizionata, luci e fornelli', 'Wyłącz klimatyzację, światła i kuchenkę', 'Vypněte klimatizaci, světla a sporák'],
  ['Provjerite ormare, ladice i punjače', 'Check wardrobes, drawers and chargers', 'Schränke, Schubladen und Ladegeräte prüfen', 'Controlla armadi, cassetti e caricatori', 'Sprawdź szafy, szuflady i ładowarki', 'Zkontrolujte skříně, šuplíky a nabíječky'],
  ['Ostavite ključeve kako je dogovoreno', 'Leave the keys as agreed', 'Schlüssel wie vereinbart hinterlassen', 'Lascia le chiavi come concordato', 'Zostaw klucze zgodnie z ustaleniami', 'Nechte klíče, jak bylo domluveno'],
  ['Uobičajeni popis — domaćin nije upisao vlastite upute.', 'Standard checklist — your host has not added their own instructions.', 'Standard-Checkliste — der Gastgeber hat keine eigenen Hinweise hinterlegt.', "Checklist standard: l'host non ha inserito istruzioni proprie.", 'Standardowa lista — gospodarz nie dodał własnych wskazówek.', 'Běžný seznam — hostitel nezadal vlastní pokyny.'],

  // ocjena
  ['Kako vam je bilo?', 'How was your stay?', 'Wie war Ihr Aufenthalt?', 'Com’è andato il soggiorno?', 'Jak minął pobyt?', 'Jak se vám líbilo?'],
  ['Kratka ocjena pomaže domaćinu da sljedećim gostima bude još bolje.', 'A quick rating helps your host make the next stay even better.', 'Eine kurze Bewertung hilft Ihrem Gastgeber, es für die nächsten Gäste noch besser zu machen.', "Una breve valutazione aiuta l'host a migliorare per i prossimi ospiti.", 'Krótka ocena pomoże gospodarzowi, by kolejnym gościom było jeszcze lepiej.', 'Krátké hodnocení pomůže hostiteli, aby se příštím hostům líbilo ještě víc.'],
  ['Ocjena od 1 do 5', 'Rating from 1 to 5', 'Bewertung von 1 bis 5', 'Valutazione da 1 a 5', 'Ocena od 1 do 5', 'Hodnocení od 1 do 5'],
  ['Što vam se svidjelo, a što bi moglo bolje?', 'What did you like, and what could be better?', 'Was hat Ihnen gefallen, was könnte besser sein?', 'Cosa ti è piaciuto e cosa si potrebbe migliorare?', 'Co Ci się podobało, a co mogłoby być lepsze?', 'Co se vám líbilo a co by mohlo být lepší?'],
  ['(nije obavezno)', '(optional)', '(optional)', '(facoltativo)', '(opcjonalnie)', '(nepovinné)'],
  ['Ime uz recenziju', 'Name shown with the review', 'Name zur Bewertung', 'Nome accanto alla recensione', 'Imię przy opinii', 'Jméno u recenze'],
  ['Smije se prikazati na javnoj stranici smještaja (samo ime, ocjena i komentar)', 'May be shown on the public page of the property (only name, rating and comment)', 'Darf auf der öffentlichen Seite der Unterkunft angezeigt werden (nur Name, Bewertung und Kommentar)', "Può essere mostrata sulla pagina pubblica dell'alloggio (solo nome, voto e commento)", 'Może zostać pokazana na publicznej stronie obiektu (tylko imię, ocena i komentarz)', 'Smí se zobrazit na veřejné stránce ubytování (jen jméno, hodnocení a komentář)'],
  ['Pošalji ocjenu', 'Send rating', 'Bewertung senden', 'Invia valutazione', 'Wyślij ocenę', 'Odeslat hodnocení'],
  ['Hvala! Ocjena je poslana domaćinu.', 'Thank you! Your rating has been sent to your host.', 'Danke! Ihre Bewertung wurde an den Gastgeber gesendet.', "Grazie! La valutazione è stata inviata all'host.", 'Dziękujemy! Ocena została wysłana gospodarzowi.', 'Děkujeme! Hodnocení bylo odesláno hostiteli.'],
  ['Hvala, ovaj boravak ste već ocijenili.', 'Thank you, you have already rated this stay.', 'Danke, Sie haben diesen Aufenthalt bereits bewertet.', 'Grazie, hai già valutato questo soggiorno.', 'Dziękujemy, ten pobyt został już oceniony.', 'Děkujeme, tento pobyt jste už ohodnotili.'],
  ['{n} od 5', '{n} out of 5', '{n} von 5', '{n} su 5', '{n} z 5', '{n} z 5'],
  ['Odaberite ocjenu od 1 do 5 zvjezdica.', 'Choose a rating from 1 to 5 stars.', 'Wählen Sie eine Bewertung von 1 bis 5 Sternen.', 'Scegli un voto da 1 a 5 stelle.', 'Wybierz ocenę od 1 do 5 gwiazdek.', 'Zvolte hodnocení od 1 do 5 hvězdiček.'],
  ['U primjeru se ocjena ne šalje.', 'In the sample, the rating is not sent.', 'Im Beispiel wird die Bewertung nicht gesendet.', "Nell'esempio la valutazione non viene inviata.", 'W przykładzie ocena nie jest wysyłana.', 'V ukázce se hodnocení neodesílá.'],
  ['Ocjenu možete poslati od dana dolaska.', 'You can send a rating from the day of arrival.', 'Sie können ab dem Anreisetag bewerten.', "Puoi inviare la valutazione dal giorno dell'arrivo.", 'Ocenę możesz wysłać od dnia przyjazdu.', 'Hodnocení můžete poslat ode dne příjezdu.'],
  ['Link je istekao — ocjena se više ne može poslati.', 'The link has expired — the rating can no longer be sent.', 'Der Link ist abgelaufen — die Bewertung kann nicht mehr gesendet werden.', 'Il link è scaduto: la valutazione non può più essere inviata.', 'Link wygasł — nie można już wysłać oceny.', 'Platnost odkazu vypršela — hodnocení už nelze odeslat.'],

  // preporuke
  ['Vrsta preporuke', 'Type of recommendation', 'Art der Empfehlung', 'Tipo di consiglio', 'Rodzaj polecenia', 'Druh doporučení'],

  // hitno
  ['Hitne službe · besplatno, s bilo kojeg telefona, na hrvatskom i engleskom', 'Emergency services · free, from any phone, in Croatian and English', 'Notruf · kostenlos, von jedem Telefon, auf Kroatisch und Englisch', 'Servizi di emergenza · gratis, da qualsiasi telefono, in croato e inglese', 'Służby ratunkowe · bezpłatnie, z każdego telefonu, po chorwacku i angielsku', 'Tísňové linky · zdarma, z jakéhokoli telefonu, v chorvatštině a angličtině'],
  ['Hitna medicinska pomoć', 'Ambulance', 'Rettungsdienst', 'Emergenza sanitaria', 'Pogotowie ratunkowe', 'Záchranná služba'],
  ['Policija', 'Police', 'Polizei', 'Polizia', 'Policja', 'Policie'],
  ['Vatrogasci', 'Fire brigade', 'Feuerwehr', 'Vigili del fuoco', 'Straż pożarna', 'Hasiči'],
  ['Traganje i spašavanje na moru', 'Sea search and rescue', 'Seenotrettung', 'Ricerca e soccorso in mare', 'Ratownictwo morskie', 'Pátrání a záchrana na moři'],
  ['Pomoć na cesti (HAK)', 'Roadside assistance (HAK)', 'Pannenhilfe (HAK)', 'Soccorso stradale (HAK)', 'Pomoc drogowa (HAK)', 'Silniční asistence (HAK)'],
  ['Vaša adresa', 'Your address', 'Ihre Adresse', 'Il tuo indirizzo', 'Twój adres', 'Vaše adresa'],
  ['Recite je dispečeru ako zovete hitnu službu:', 'Tell the dispatcher if you call emergency services:', 'Nennen Sie sie, wenn Sie den Notruf wählen:', "Comunicalo all'operatore se chiami i soccorsi:", 'Podaj go dyspozytorowi, jeśli dzwonisz po pomoc:', 'Nahlaste ji dispečerovi, pokud voláte tísňovou linku:'],
  ['Ljekarne u blizini', 'Pharmacies nearby', 'Apotheken in der Nähe', 'Farmacie vicine', 'Apteki w pobliżu', 'Lékárny poblíž'],
  ['Hitna i bolnica', 'Emergency room and hospital', 'Notaufnahme und Krankenhaus', 'Pronto soccorso e ospedale', 'SOR i szpital', 'Pohotovost a nemocnice'],

  // prijava boravka (eVisitor)
  ['U Hrvatskoj domaćin mora prijaviti svakog gosta u roku 24 sata od dolaska (sustav eVisitor). Upišite podatke za sebe i sve koji borave s vama — domaćin ih samo prepiše, bez fotografiranja isprava.', 'In Croatia, hosts must register every guest within 24 hours of arrival (the eVisitor system). Enter the details for yourself and everyone staying with you — your host simply copies them, with no need to photograph your documents.', 'In Kroatien muss der Gastgeber jeden Gast innerhalb von 24 Stunden nach der Ankunft anmelden (System eVisitor). Tragen Sie Ihre Daten und die aller Mitreisenden ein — der Gastgeber überträgt sie nur, ohne Ihre Ausweise zu fotografieren.', "In Croazia l'host deve registrare ogni ospite entro 24 ore dall'arrivo (sistema eVisitor). Inserisci i dati tuoi e di chi soggiorna con te: l'host li trascrive, senza fotografare i documenti.", 'W Chorwacji gospodarz musi zgłosić każdego gościa w ciągu 24 godzin od przyjazdu (system eVisitor). Wpisz dane swoje i wszystkich osób, które przebywają z Tobą — gospodarz tylko je przepisze, bez fotografowania dokumentów.', 'V Chorvatsku musí hostitel přihlásit každého hosta do 24 hodin od příjezdu (systém eVisitor). Vyplňte údaje o sobě a o všech, kdo s vámi bydlí — hostitel je jen přepíše, bez focení dokladů.'],
  ['+ Dodaj osobu', '+ Add person', '+ Person hinzufügen', '+ Aggiungi persona', '+ Dodaj osobę', '+ Přidat osobu'],
  ['Pošalji domaćinu', 'Send to host', 'An Gastgeber senden', "Invia all'host", 'Wyślij gospodarzowi', 'Odeslat hostiteli'],
  ['Podatke vidi samo vaš domaćin. Brišu se 30 dana nakon odlaska. Dok link vrijedi, možete ih ispraviti i poslati ponovno.', 'Only your host can see these details. They are deleted 30 days after departure. While the link is valid, you can correct them and send them again.', 'Nur Ihr Gastgeber sieht diese Daten. Sie werden 30 Tage nach der Abreise gelöscht. Solange der Link gültig ist, können Sie sie korrigieren und erneut senden.', 'Solo il tuo host vede questi dati. Vengono cancellati 30 giorni dopo la partenza. Finché il link è valido puoi correggerli e inviarli di nuovo.', 'Dane widzi tylko Twój gospodarz. Są usuwane 30 dni po wyjeździe. Dopóki link jest ważny, możesz je poprawić i wysłać ponownie.', 'Údaje vidí jen váš hostitel. Mažou se 30 dní po odjezdu. Dokud odkaz platí, můžete je opravit a odeslat znovu.'],
  ['Ime', 'First name', 'Vorname', 'Nome', 'Imię', 'Jméno'],
  ['Prezime', 'Last name', 'Nachname', 'Cognome', 'Nazwisko', 'Příjmení'],
  ['Spol', 'Sex', 'Geschlecht', 'Sesso', 'Płeć', 'Pohlaví'],
  ['Ž', 'F', 'W', 'F', 'K', 'Ž'],
  ['Datum rođenja', 'Date of birth', 'Geburtsdatum', 'Data di nascita', 'Data urodzenia', 'Datum narození'],
  ['Državljanstvo', 'Citizenship', 'Staatsangehörigkeit', 'Cittadinanza', 'Obywatelstwo', 'Státní občanství'],
  ['Država prebivališta', 'Country of residence', 'Wohnsitzland', 'Paese di residenza', 'Kraj zamieszkania', 'Země bydliště'],
  ['Grad prebivališta', 'City of residence', 'Wohnort', 'Città di residenza', 'Miasto zamieszkania', 'Město bydliště'],
  ['Vrsta isprave', 'Document type', 'Art des Ausweises', 'Tipo di documento', 'Rodzaj dokumentu', 'Druh dokladu'],
  ['Broj isprave', 'Document number', 'Ausweisnummer', 'Numero del documento', 'Numer dokumentu', 'Číslo dokladu'],
  ['Osobna iskaznica', 'ID card', 'Personalausweis', "Carta d'identità", 'Dowód osobisty', 'Občanský průkaz'],
  ['Putovnica', 'Passport', 'Reisepass', 'Passaporto', 'Paszport', 'Cestovní pas'],
  ['Odaberite', 'Choose', 'Bitte wählen', 'Scegli', 'Wybierz', 'Vyberte'],
  ['Osoba {n}', 'Person {n}', 'Person {n}', 'Persona {n}', 'Osoba {n}', 'Osoba {n}'],
  ['Makni', 'Remove', 'Entfernen', 'Rimuovi', 'Usuń', 'Odebrat'],
  ['Podaci su poslani ({n}). Ako nešto ne valja, ispravite i pošaljite ponovno.', 'Details sent ({n}). If anything is wrong, correct it and send again.', 'Daten gesendet ({n}). Falls etwas nicht stimmt, korrigieren und erneut senden.', 'Dati inviati ({n}). Se qualcosa non va, correggi e invia di nuovo.', 'Dane wysłane ({n}). Jeśli coś się nie zgadza, popraw i wyślij ponownie.', 'Údaje odeslány ({n}). Pokud něco nesedí, opravte to a odešlete znovu.'],
  ['Upišite ime i prezime za svaku osobu.', 'Enter a first and last name for each person.', 'Tragen Sie für jede Person Vor- und Nachnamen ein.', 'Inserisci nome e cognome per ogni persona.', 'Wpisz imię i nazwisko każdej osoby.', 'Vyplňte jméno a příjmení u každé osoby.'],
  ['U primjeru se podaci ne šalju.', 'In the sample, the details are not sent.', 'Im Beispiel werden die Daten nicht gesendet.', "Nell'esempio i dati non vengono inviati.", 'W przykładzie dane nie są wysyłane.', 'V ukázce se údaje neodesílají.'],
  ['Poslano domaćinu: {n}. Hvala!', 'Sent to your host: {n}. Thank you!', 'An den Gastgeber gesendet: {n}. Danke!', "Inviato all'host: {n}. Grazie!", 'Wysłano gospodarzowi: {n}. Dziękujemy!', 'Odesláno hostiteli: {n}. Děkujeme!'],
  ['Link je istekao — podatke pošaljite domaćinu izravno.', 'The link has expired — send the details to your host directly.', 'Der Link ist abgelaufen — senden Sie die Daten direkt an den Gastgeber.', "Il link è scaduto: invia i dati direttamente all'host.", 'Link wygasł — wyślij dane bezpośrednio gospodarzowi.', 'Platnost odkazu vypršela — pošlete údaje hostiteli přímo.'],

  // podnožje, bez interneta
  ['Stranica ne prati vaše kretanje; podaci koje sami upišete (prijava boravka, ocjena) idu samo domaćinu ·', 'This page does not track you; anything you enter yourself (registration, rating) goes only to your host ·', 'Diese Seite verfolgt Sie nicht; was Sie selbst eingeben (Anmeldung, Bewertung), geht nur an Ihren Gastgeber ·', 'Questa pagina non ti traccia; ciò che inserisci (registrazione, valutazione) va solo al tuo host ·', 'Ta strona Cię nie śledzi; dane, które sam wpiszesz (zgłoszenie pobytu, ocena), trafiają tylko do gospodarza ·', 'Tato stránka vás nesleduje; co sami vyplníte (přihlášení k pobytu, hodnocení), jde jen hostiteli ·'],
  ['Nema interneta — prikazujem vodič spremljen {d} u {t}.', 'No internet — showing the guide saved on {d} at {t}.', 'Kein Internet — angezeigt wird die am {d} um {t} gespeicherte Gästemappe.', 'Nessuna connessione: mostro la guida salvata il {d} alle {t}.', 'Brak internetu — wyświetlam przewodnik zapisany {d} o {t}.', 'Bez internetu — zobrazuji průvodce uloženého {d} v {t}.'],
  ['Šifre će se pojaviti kad se spojite.', 'The codes will appear once you are online.', 'Die Codes erscheinen, sobald Sie online sind.', 'I codici appariranno quando sarai online.', 'Kody pojawią się po połączeniu z internetem.', 'Kódy se objeví, až budete online.'],

  // javna stranica (p.html)
  ['Učitavam…', 'Loading…', 'Wird geladen…', 'Caricamento…', 'Ładowanie…', 'Načítám…'],
  ['Stranica nije pronađena', 'Page not found', 'Seite nicht gefunden', 'Pagina non trovata', 'Nie znaleziono strony', 'Stránka nenalezena'],
  ['Ovaj objekt ne postoji ili je uklonjen. Provjerite link koji ste dobili od domaćina.', 'This property does not exist or has been removed. Check the link you received from the host.', 'Diese Unterkunft existiert nicht oder wurde entfernt. Prüfen Sie den Link, den Sie vom Gastgeber erhalten haben.', "Questo alloggio non esiste o è stato rimosso. Controlla il link ricevuto dall'host.", 'Ten obiekt nie istnieje lub został usunięty. Sprawdź link otrzymany od gospodarza.', 'Toto ubytování neexistuje nebo bylo odstraněno. Zkontrolujte odkaz od hostitele.'],
  ['Na početnu', 'Go to homepage', 'Zur Startseite', 'Alla home page', 'Na stronę główną', 'Na úvodní stránku'],
  ['Dijelovi stranice', 'Page sections', 'Seitenbereiche', 'Sezioni della pagina', 'Sekcje strony', 'Části stránky'],
  ['O objektu', 'About', 'Über die Unterkunft', "L'alloggio", 'O obiekcie', 'O ubytování'],
  ['Fotografije', 'Photos', 'Fotos', 'Foto', 'Zdjęcia', 'Fotky'],
  ['Lokacija', 'Location', 'Lage', 'Posizione', 'Lokalizacja', 'Poloha'],
  ['Dostupnost', 'Availability', 'Verfügbarkeit', 'Disponibilità', 'Dostępność', 'Dostupnost'],
  ['Pošalji upit', 'Send an enquiry', 'Anfrage senden', 'Invia richiesta', 'Wyślij zapytanie', 'Poslat dotaz'],
  ['Upit', 'Enquiry', 'Anfrage', 'Richiesta', 'Zapytanie', 'Dotaz'],
  ['Osnovni podaci', 'Key facts', 'Eckdaten', 'Dati principali', 'Podstawowe informacje', 'Základní údaje'],
  ['Sažetak', 'Summary', 'Übersicht', 'Riepilogo', 'Podsumowanie', 'Shrnutí'],
  ['Provjeri dostupnost', 'Check availability', 'Verfügbarkeit prüfen', 'Verifica disponibilità', 'Sprawdź dostępność', 'Ověřit dostupnost'],
  ['Pošalji upit domaćinu', 'Send an enquiry to the host', 'Anfrage an den Gastgeber', "Invia una richiesta all'host", 'Wyślij zapytanie do gospodarza', 'Poslat dotaz hostiteli'],
  ['Bez provizije. Termin i plaćanje dogovarate izravno s domaćinom.', 'No commission. You arrange dates and payment directly with the host.', 'Keine Provision. Termin und Zahlung vereinbaren Sie direkt mit dem Gastgeber.', "Nessuna commissione. Date e pagamento si concordano direttamente con l'host.", 'Bez prowizji. Termin i płatność ustalasz bezpośrednio z gospodarzem.', 'Bez provize. Termín a platbu domlouváte přímo s hostitelem.'],
  ['Galerija', 'Gallery', 'Galerie', 'Galleria', 'Galeria', 'Galerie'],
  ['Pogledajte prostor', 'Take a look around', 'Schauen Sie sich um', 'Dai uno sguardo', 'Zobacz wnętrza', 'Prohlédněte si prostor'],
  ['Gdje ćete boraviti', "Where you'll be staying", 'Wo Sie wohnen werden', 'Dove soggiornerai', 'Gdzie się zatrzymasz', 'Kde budete bydlet'],
  ['Točnu adresu i upute za dolazak gost dobiva u privatnom vodiču nakon potvrde boravka.', 'Guests receive the exact address and directions in the private guide once the stay is confirmed.', 'Die genaue Adresse und die Anfahrt erhalten Gäste nach der Bestätigung in der privaten Gästemappe.', "L'indirizzo esatto e le indicazioni arrivano nella guida privata dopo la conferma del soggiorno.", 'Dokładny adres i wskazówki dojazdu gość otrzymuje w prywatnym przewodniku po potwierdzeniu pobytu.', 'Přesnou adresu a pokyny k příjezdu dostane host v soukromém průvodci po potvrzení pobytu.'],
  ['Otvori u Google Maps', 'Open in Google Maps', 'In Google Maps öffnen', 'Apri in Google Maps', 'Otwórz w Mapach Google', 'Otevřít v Google Mapách'],
  ['Karta se učitava s Google Mapsa tek kad je otvorite.', 'The map loads from Google Maps only when you open it.', 'Die Karte wird erst beim Öffnen von Google Maps geladen.', 'La mappa viene caricata da Google Maps solo quando la apri.', 'Mapa ładuje się z Map Google dopiero po otwarciu.', 'Mapa se načte z Google Map až po otevření.'],
  ['Karta lokacije', 'Location map', 'Lageplan', 'Mappa della posizione', 'Mapa lokalizacji', 'Mapa polohy'],
  ['Sadržaji', 'Amenities', 'Ausstattung', 'Servizi', 'Udogodnienia', 'Vybavení'],
  ['Sve što trebate', 'Everything you need', 'Alles, was Sie brauchen', 'Tutto ciò che serve', 'Wszystko, czego potrzebujesz', 'Vše, co potřebujete'],
  ['Dobro je znati', 'Good to know', 'Gut zu wissen', 'Buono a sapersi', 'Warto wiedzieć', 'Dobré vědět'],
  ['Planirajte boravak', 'Plan your stay', 'Planen Sie Ihren Aufenthalt', 'Pianifica il soggiorno', 'Zaplanuj pobyt', 'Naplánujte si pobyt'],
  ['Dostupnost i upit', 'Availability and enquiry', 'Verfügbarkeit und Anfrage', 'Disponibilità e richiesta', 'Dostępność i zapytanie', 'Dostupnost a dotaz'],
  ['Prethodni mjesec', 'Previous month', 'Vorheriger Monat', 'Mese precedente', 'Poprzedni miesiąc', 'Předchozí měsíc'],
  ['Sljedeći mjesec', 'Next month', 'Nächster Monat', 'Mese successivo', 'Następny miesiąc', 'Další měsíc'],
  ['Odabrano', 'Selected', 'Ausgewählt', 'Selezionato', 'Wybrane', 'Vybráno'],
  ['U rasponu', 'In range', 'Im Zeitraum', "Nell'intervallo", 'W zakresie', 'V rozsahu'],
  ['Zauzeto', 'Booked', 'Belegt', 'Occupato', 'Zajęte', 'Obsazeno'],
  ['Kraći termin između rezervacija', 'Shorter stay between bookings', 'Kürzerer Aufenthalt zwischen Buchungen', 'Soggiorno breve tra due prenotazioni', 'Krótszy termin między rezerwacjami', 'Kratší termín mezi rezervacemi'],
  ['Poništi odabir', 'Clear selection', 'Auswahl aufheben', 'Annulla selezione', 'Wyczyść wybór', 'Zrušit výběr'],
  ['Upit domaćinu', 'Enquiry to the host', 'Anfrage an den Gastgeber', "Richiesta all'host", 'Zapytanie do gospodarza', 'Dotaz hostiteli'],
  ['Izravno s domaćinom', 'Directly with the host', 'Direkt mit dem Gastgeber', "Direttamente con l'host", 'Bezpośrednio z gospodarzem', 'Přímo s hostitelem'],
  ['Pronađite svoj termin.', 'Find your dates.', 'Finden Sie Ihren Termin.', 'Trova le tue date.', 'Znajdź swój termin.', 'Najděte si termín.'],
  ['Odaberite dolazak i odlazak u kalendaru. Cijenu i uvjete potvrđuje domaćin.', 'Choose your arrival and departure in the calendar. The host confirms the price and terms.', 'Wählen Sie An- und Abreise im Kalender. Preis und Bedingungen bestätigt der Gastgeber.', "Scegli arrivo e partenza nel calendario. Prezzo e condizioni li conferma l'host.", 'Wybierz przyjazd i wyjazd w kalendarzu. Cenę i warunki potwierdza gospodarz.', 'V kalendáři zvolte příjezd a odjezd. Cenu a podmínky potvrdí hostitel.'],
  ['Ili pitajte bez datuma', 'Or ask without dates', 'Oder ohne Datum fragen', 'Oppure chiedi senza date', 'Albo zapytaj bez dat', 'Nebo se zeptejte bez data'],
  ['Kako želite pitati?', 'How would you like to ask?', 'Wie möchten Sie fragen?', 'Come vuoi chiedere?', 'Jak chcesz zapytać?', 'Jak se chcete zeptat?'],
  ['Ton poruke', 'Message tone', 'Ton der Nachricht', 'Tono del messaggio', 'Ton wiadomości', 'Tón zprávy'],
  ['Kratko i jasno', 'Short and clear', 'Kurz und klar', 'Breve e chiaro', 'Krótko i jasno', 'Stručně a jasně'],
  ['S detaljima', 'With details', 'Mit Details', 'Con dettagli', 'Ze szczegółami', 'S podrobnostmi'],
  ['Fleksibilni smo', "We're flexible", 'Wir sind flexibel', 'Siamo flessibili', 'Jesteśmy elastyczni', 'Jsme flexibilní'],
  ['Gosti', 'Guests', 'Gäste', 'Ospiti', 'Goście', 'Hosté'],
  ['Manje gostiju', 'Fewer guests', 'Weniger Gäste', 'Meno ospiti', 'Mniej gości', 'Méně hostů'],
  ['Više gostiju', 'More guests', 'Mehr Gäste', 'Più ospiti', 'Więcej gości', 'Více hostů'],
  ['Poruka', 'Message', 'Nachricht', 'Messaggio', 'Wiadomość', 'Zpráva'],
  ['Pošaljite upit ovdje', 'Send your enquiry here', 'Anfrage hier senden', 'Invia qui la richiesta', 'Wyślij zapytanie tutaj', 'Pošlete dotaz tady'],
  ['Ime i prezime', 'Full name', 'Vor- und Nachname', 'Nome e cognome', 'Imię i nazwisko', 'Jméno a příjmení'],
  ['Telefon', 'Phone', 'Telefon', 'Telefono', 'Telefon', 'Telefon'],
  ['Dovoljan je e-mail ili telefon. Vidi ih samo domaćin, da vam odgovori na upit (', 'An email or phone number is enough. Only the host sees them, to reply to your enquiry (', 'E-Mail oder Telefon genügt. Nur der Gastgeber sieht sie, um Ihnen zu antworten (', "Basta un'e-mail o un telefono. Li vede solo l'host, per rispondere alla richiesta (", 'Wystarczy e-mail lub telefon. Widzi je tylko gospodarz, by odpowiedzieć na zapytanie (', 'Stačí e-mail nebo telefon. Vidí je jen hostitel, aby vám odpověděl ('],
  ['privatnost', 'privacy', 'Datenschutz', 'privacy', 'prywatność', 'soukromí'],
  ['Ili pošaljite poruku sami', 'Or send the message yourself', 'Oder senden Sie die Nachricht selbst', 'Oppure invia tu il messaggio', 'Albo wyślij wiadomość samodzielnie', 'Nebo pošlete zprávu sami'],
  ['Odmoria ne naplaćuje proviziju. Upit nije rezervacija — termin potvrđuje domaćin.', 'Odmoria charges no commission. An enquiry is not a booking — the host confirms the dates.', 'Odmoria nimmt keine Provision. Eine Anfrage ist keine Buchung — den Termin bestätigt der Gastgeber.', "Odmoria non applica commissioni. La richiesta non è una prenotazione: le date le conferma l'host.", 'Odmoria nie pobiera prowizji. Zapytanie to nie rezerwacja — termin potwierdza gospodarz.', 'Odmoria si neúčtuje provizi. Dotaz není rezervace — termín potvrzuje hostitel.'],
  ['U blizini', 'Nearby', 'In der Nähe', 'Nei dintorni', 'W pobliżu', 'V okolí'],
  ['Vrsta mjesta', 'Type of place', 'Art des Ortes', 'Tipo di luogo', 'Rodzaj miejsca', 'Druh místa'],
  ['Kako stići', 'Getting here', 'Anreise', 'Come arrivare', 'Jak dojechać', 'Jak se sem dostat'],
  ['Istražite okolicu', 'Explore the area', 'Die Umgebung entdecken', 'Esplora i dintorni', 'Poznaj okolicę', 'Prozkoumejte okolí'],
  ['Atrakcije i aktivnosti', 'Sights and activities', 'Sehenswürdigkeiten und Aktivitäten', 'Attrazioni e attività', 'Atrakcje i aktywności', 'Památky a aktivity'],
  ['Iskustva gostiju', 'Guest experiences', 'Erfahrungen von Gästen', 'Esperienze degli ospiti', 'Opinie gości', 'Zkušenosti hostů'],
  ['Što kažu gosti', 'What guests say', 'Was Gäste sagen', 'Cosa dicono gli ospiti', 'Co mówią goście', 'Co říkají hosté'],
  ['Ocjene ostavljaju gosti na kraju boravka, preko privatnog vodiča.', 'Ratings are left by guests at the end of their stay, through the private guide.', 'Bewertungen geben Gäste am Ende des Aufenthalts über die private Gästemappe ab.', 'Le valutazioni le lasciano gli ospiti a fine soggiorno, tramite la guida privata.', 'Oceny wystawiają goście pod koniec pobytu, w prywatnym przewodniku.', 'Hodnocení zanechávají hosté na konci pobytu v soukromém průvodci.'],
  ['Prikaži sve recenzije', 'Show all reviews', 'Alle Bewertungen anzeigen', 'Mostra tutte le recensioni', 'Pokaż wszystkie opinie', 'Zobrazit všechny recenze'],
  ['Rezervacija', 'Booking', 'Buchung', 'Prenotazione', 'Rezerwacja', 'Rezervace'],
  ['Javite se domaćinu', 'Contact the host', 'Kontaktieren Sie den Gastgeber', "Contatta l'host", 'Skontaktuj się z gospodarzem', 'Ozvěte se hostiteli'],
  ['Bez posrednika i bez provizije. Termin i plaćanje dogovarate direktno.', 'No middleman and no commission. You arrange dates and payment directly.', 'Ohne Vermittler und ohne Provision. Termin und Zahlung vereinbaren Sie direkt.', 'Senza intermediari e senza commissioni. Date e pagamento si concordano direttamente.', 'Bez pośredników i bez prowizji. Termin i płatność ustalasz bezpośrednio.', 'Bez prostředníka a bez provize. Termín a platbu domlouváte přímo.'],
  ['Bez posrednika i bez provizije. Termin i plaćanje dogovarate direktno s domaćinom ({n}).', 'No middleman and no commission. You arrange dates and payment directly with the host ({n}).', 'Ohne Vermittler und ohne Provision. Termin und Zahlung vereinbaren Sie direkt mit dem Gastgeber ({n}).', "Senza intermediari e senza commissioni. Date e pagamento si concordano direttamente con l'host ({n}).", 'Bez pośredników i bez prowizji. Termin i płatność ustalasz bezpośrednio z gospodarzem ({n}).', 'Bez prostředníka a bez provize. Termín a platbu domlouváte přímo s hostitelem ({n}).'],
  ['Stranicu pokreće', 'Powered by', 'Bereitgestellt von', 'Realizzato con', 'Stronę obsługuje', 'Stránku provozuje'],
  ['Pitajte domaćina za slobodne termine', 'Ask the host about free dates', 'Fragen Sie den Gastgeber nach freien Terminen', "Chiedi all'host le date libere", 'Zapytaj gospodarza o wolne terminy', 'Zeptejte se hostitele na volné termíny'],
  ['Zatvori galeriju', 'Close gallery', 'Galerie schließen', 'Chiudi galleria', 'Zamknij galerię', 'Zavřít galerii'],
  ['Prethodna fotografija', 'Previous photo', 'Vorheriges Foto', 'Foto precedente', 'Poprzednie zdjęcie', 'Předchozí fotka'],
  ['Sljedeća fotografija', 'Next photo', 'Nächstes Foto', 'Foto successiva', 'Następne zdjęcie', 'Další fotka'],
  ['← → za listanje · Esc za zatvaranje', '← → to browse · Esc to close', '← → zum Blättern · Esc zum Schließen', '← → per sfogliare · Esc per chiudere', '← → przewijanie · Esc zamyka', '← → listování · Esc zavře'],
  ['Pitajte za termin', 'Ask about dates', 'Nach Terminen fragen', 'Chiedi le date', 'Zapytaj o termin', 'Zeptejte se na termín'],
  ['do {n}', 'up to {n}', 'bis zu {n}', 'fino a {n}', 'do {n}', 'až pro {n}'],
  ['od {cijena} / noć', 'from {cijena} / night', 'ab {cijena} / Nacht', 'da {cijena} / notte', 'od {cijena} / noc', 'od {cijena} / noc'],
  ['od {cijena} po noći', 'from {cijena} per night', 'ab {cijena} pro Nacht', 'da {cijena} a notte', 'od {cijena} za noc', 'od {cijena} za noc'],
  ['od {cijena} / noć · pitajte za termin', 'from {cijena} / night · ask about dates', 'ab {cijena} / Nacht · Termin anfragen', 'da {cijena} / notte · chiedi le date', 'od {cijena} / noc · zapytaj o termin', 'od {cijena} / noc · zeptejte se na termín'],
  ['okvirno {cijena}', 'approx. {cijena}', 'ca. {cijena}', 'circa {cijena}', 'około {cijena}', 'přibližně {cijena}'],
  ['Sve fotografije', 'All photos', 'Alle Fotos', 'Tutte le foto', 'Wszystkie zdjęcia', 'Všechny fotky'],
  ['Sve fotografije ({n})', 'All photos ({n})', 'Alle Fotos ({n})', 'Tutte le foto ({n})', 'Wszystkie zdjęcia ({n})', 'Všechny fotky ({n})'],
  ['Otvori fotografiju {i} od {n}', 'Open photo {i} of {n}', 'Foto {i} von {n} öffnen', 'Apri la foto {i} di {n}', 'Otwórz zdjęcie {i} z {n}', 'Otevřít fotku {i} z {n}'],
  ['Fotografija {n}', 'Photo {n}', 'Foto {n}', 'Foto {n}', 'Zdjęcie {n}', 'Fotka {n}'],
  ['još fotografija', 'more photos', 'weitere Fotos', 'altre foto', 'więcej zdjęć', 'další fotky'],
  ['najmanje {n}', 'at least {n}', 'mindestens {n}', 'almeno {n}', 'co najmniej {n}', 'nejméně {n}'],
  ['Najmanje {n}', 'At least {n}', 'Mindestens {n}', 'Almeno {n}', 'Co najmniej {n}', 'Nejméně {n}'],
  ['Najmanje {n}.', 'At least {n}.', 'Mindestens {n}.', 'Almeno {n}.', 'Co najmniej {n}.', 'Nejméně {n}.'],
  ['Cijena na upit', 'Price on request', 'Preis auf Anfrage', 'Prezzo su richiesta', 'Cena na zapytanie', 'Cena na dotaz'],
  ['Najkraći boravak', 'Minimum stay', 'Mindestaufenthalt', 'Soggiorno minimo', 'Minimalny pobyt', 'Minimální pobyt'],
  ['Cijena', 'Price', 'Preis', 'Prezzo', 'Cena', 'Cena'],
  ['Tip objekta', 'Property type', 'Unterkunftsart', 'Tipo di alloggio', 'Rodzaj obiektu', 'Typ ubytování'],
  ['Što {n} preporučuje', 'What {n} recommends', 'Was {n} empfiehlt', 'I consigli di {n}', 'Co poleca {n}', 'Co doporučuje {n}'],
  ['Ocjena {n} od 5', 'Rated {n} out of 5', 'Bewertung {n} von 5', 'Voto {n} su 5', 'Ocena {n} z 5', 'Hodnocení {n} z 5'],
  ['Gost', 'Guest', 'Gast', 'Ospite', 'Gość', 'Host'],
  ['{n} · galerija', '{n} · gallery', '{n} · Galerie', '{n} · galleria', '{n} · galeria', '{n} · galerie'],
  ['{n} — fotografija {i} od {k}', '{n} — photo {i} of {k}', '{n} — Foto {i} von {k}', '{n} — foto {i} di {k}', '{n} — zdjęcie {i} z {k}', '{n} — fotka {i} z {k}'],
  ['slobodno', 'available', 'frei', 'libero', 'wolne', 'volno'],
  ['odabrano', 'selected', 'ausgewählt', 'selezionato', 'wybrane', 'vybráno'],
  ['zauzeto, može biti dan odlaska', 'booked, can be the departure day', 'belegt, kann Abreisetag sein', 'occupato, può essere il giorno di partenza', 'zajęte, może być dniem wyjazdu', 'obsazeno, může být dnem odjezdu'],
  ['zauzeto', 'booked', 'belegt', 'occupato', 'zajęte', 'obsazeno'],
  ['u odabranom rasponu', 'in the selected range', 'im gewählten Zeitraum', "nell'intervallo selezionato", 'w wybranym zakresie', 've vybraném rozsahu'],
  ['kraći termin između rezervacija', 'shorter stay between bookings', 'kürzerer Aufenthalt zwischen Buchungen', 'soggiorno breve tra prenotazioni', 'krótszy termin między rezerwacjami', 'kratší termín mezi rezervacemi'],
  ['Kliknite datum dolaska, zatim datum odlaska.', 'Click your arrival date, then your departure date.', 'Klicken Sie auf das Anreisedatum, dann auf das Abreisedatum.', 'Clicca la data di arrivo, poi quella di partenza.', 'Kliknij datę przyjazdu, a potem datę wyjazdu.', 'Klikněte na datum příjezdu, pak na datum odjezdu.'],
  ['Dolazak: {d} — sad odaberite odlazak', 'Arrival: {d} — now choose departure', 'Anreise: {d} — jetzt Abreise wählen', 'Arrivo: {d} — ora scegli la partenza', 'Przyjazd: {d} — teraz wybierz wyjazd', 'Příjezd: {d} — teď zvolte odjezd'],
  ['Taj raspon nije slobodan — pokušajte drugi', 'Those dates are not available — try others', 'Dieser Zeitraum ist nicht frei — versuchen Sie einen anderen', 'Queste date non sono libere: prova altre date', 'Ten termin nie jest wolny — spróbuj innego', 'Tento termín není volný — zkuste jiný'],
  ['Ovaj razmak se uzima u cijelosti: {a} → {b} ({n})', 'This gap is booked as a whole: {a} → {b} ({n})', 'Diese Lücke wird nur komplett vergeben: {a} → {b} ({n})', 'Questo intervallo si prenota per intero: {a} → {b} ({n})', 'Ten termin rezerwuje się w całości: {a} → {b} ({n})', 'Tato mezera se bere celá: {a} → {b} ({n})'],
  ['Najkraći boravak je {n} — pokušajte dulji raspon', 'The minimum stay is {n} — try a longer range', 'Der Mindestaufenthalt beträgt {n} — wählen Sie einen längeren Zeitraum', 'Il soggiorno minimo è di {n}: prova un periodo più lungo', 'Minimalny pobyt to {n} — spróbuj dłuższego terminu', 'Minimální pobyt je {n} — zkuste delší termín'],
  ['Odabrano: {a} – {b} ({n})', 'Selected: {a} – {b} ({n})', 'Ausgewählt: {a} – {b} ({n})', 'Selezionato: {a} – {b} ({n})', 'Wybrano: {a} – {b} ({n})', 'Vybráno: {a} – {b} ({n})'],
  ['WhatsAppom', 'Via WhatsApp', 'Per WhatsApp', 'Via WhatsApp', 'Przez WhatsApp', 'Přes WhatsApp'],
  ['E-mailom', 'By email', 'Per E-Mail', 'Via e-mail', 'E-mailem', 'E-mailem'],
  ['Poruka je na engleskom, da je domaćin lakše razumije.', 'The message is in English so the host can easily understand it.', 'Die Nachricht ist auf Englisch, damit der Gastgeber sie leicht versteht.', "Il messaggio è in inglese, così l'host lo capisce facilmente.", 'Wiadomość jest po angielsku, aby gospodarz łatwo ją zrozumiał.', 'Zpráva je v angličtině, aby jí hostitel snadno porozuměl.'],
  ['Kopiraj poruku', 'Copy message', 'Nachricht kopieren', 'Copia messaggio', 'Kopiuj wiadomość', 'Kopírovat zprávu'],
  ['Upišite ime i prezime.', 'Enter your full name.', 'Bitte Vor- und Nachnamen eingeben.', 'Inserisci nome e cognome.', 'Wpisz imię i nazwisko.', 'Vyplňte jméno a příjmení.'],
  ['Upišite e-mail ili telefon, da vam domaćin može odgovoriti.', 'Enter an email or phone number so the host can reply.', 'Geben Sie E-Mail oder Telefon an, damit der Gastgeber antworten kann.', "Inserisci e-mail o telefono, così l'host può risponderti.", 'Wpisz e-mail lub telefon, aby gospodarz mógł odpowiedzieć.', 'Vyplňte e-mail nebo telefon, aby vám hostitel mohl odpovědět.'],
  ['E-mail adresa nije ispravna.', 'The email address is not valid.', 'Die E-Mail-Adresse ist ungültig.', "L'indirizzo e-mail non è valido.", 'Adres e-mail jest nieprawidłowy.', 'E-mailová adresa není platná.'],
  ['Telefon smije sadržavati samo brojke, razmake i znak +.', 'The phone number may contain only digits, spaces and the + sign.', 'Die Telefonnummer darf nur Ziffern, Leerzeichen und + enthalten.', 'Il telefono può contenere solo cifre, spazi e il segno +.', 'Telefon może zawierać tylko cyfry, spacje i znak +.', 'Telefon smí obsahovat jen číslice, mezery a znak +.'],
  ['Odaberite dolazak i odlazak u kalendaru.', 'Choose arrival and departure in the calendar.', 'Wählen Sie An- und Abreise im Kalender.', 'Scegli arrivo e partenza nel calendario.', 'Wybierz przyjazd i wyjazd w kalendarzu.', 'Zvolte v kalendáři příjezd a odjezd.'],
  ['Šaljem…', 'Sending…', 'Wird gesendet…', 'Invio…', 'Wysyłanie…', 'Odesílám…'],
  ['Previše upita u kratkom vremenu. Pokušajte kasnije ili pišite domaćinu izravno.', 'Too many enquiries in a short time. Try later or write to the host directly.', 'Zu viele Anfragen in kurzer Zeit. Versuchen Sie es später oder schreiben Sie dem Gastgeber direkt.', "Troppe richieste in poco tempo. Riprova più tardi o scrivi direttamente all'host.", 'Zbyt wiele zapytań w krótkim czasie. Spróbuj później lub napisz bezpośrednio do gospodarza.', 'Příliš mnoho dotazů v krátké době. Zkuste to později nebo napište hostiteli přímo.'],
  ['Upit trenutačno nije moguće poslati. Pošaljite poruku izravno — WhatsAppom ili e-mailom ispod.', 'The enquiry cannot be sent right now. Send a message directly — via WhatsApp or email below.', 'Die Anfrage kann gerade nicht gesendet werden. Schreiben Sie direkt — per WhatsApp oder E-Mail unten.', 'Al momento la richiesta non può essere inviata. Scrivi direttamente, via WhatsApp o e-mail qui sotto.', 'Nie można teraz wysłać zapytania. Napisz bezpośrednio — przez WhatsApp lub e-mail poniżej.', 'Dotaz teď nelze odeslat. Napište přímo — přes WhatsApp nebo e-mail níže.'],
  ['Domaćin {n}', 'Your host {n}', 'Ihr Gastgeber {n}', "L'host {n}", 'Gospodarz {n}', 'Hostitel {n}'],
  ['Upit je poslan ✓', 'Enquiry sent ✓', 'Anfrage gesendet ✓', 'Richiesta inviata ✓', 'Zapytanie wysłane ✓', 'Dotaz odeslán ✓'],
  ['{tko} javit će vam se na {k}. Kad potvrdi termin, dobit ćete privatni link s uputama za dolazak.', '{tko} will get back to you at {k}. Once the dates are confirmed, you will receive a private link with arrival instructions.', '{tko} meldet sich unter {k}. Sobald der Termin bestätigt ist, erhalten Sie einen privaten Link mit den Anreisehinweisen.', "{tko} ti risponderà a {k}. Quando confermerà le date, riceverai un link privato con le istruzioni per l'arrivo.", '{tko} odezwie się na {k}. Po potwierdzeniu terminu dostaniesz prywatny link ze wskazówkami dojazdu.', '{tko} se vám ozve na {k}. Až termín potvrdí, dostanete soukromý odkaz s pokyny k příjezdu.'],
  ['Poruka je kopirana.', 'Message copied.', 'Nachricht kopiert.', 'Messaggio copiato.', 'Wiadomość skopiowana.', 'Zpráva zkopírována.'],
  ['Kopiranje nije uspjelo — označite poruku i kopirajte je ručno.', 'Copying failed — select the message and copy it manually.', 'Kopieren fehlgeschlagen — markieren Sie die Nachricht und kopieren Sie sie manuell.', 'Copia non riuscita: seleziona il messaggio e copialo a mano.', 'Nie udało się skopiować — zaznacz wiadomość i skopiuj ją ręcznie.', 'Kopírování se nezdařilo — označte zprávu a zkopírujte ji ručně.'],
  ['Domaćin nije ostavio kontakt podatke.', 'The host has not left any contact details.', 'Der Gastgeber hat keine Kontaktdaten hinterlegt.', "L'host non ha lasciato recapiti.", 'Gospodarz nie podał danych kontaktowych.', 'Hostitel neuvedl kontaktní údaje.'],

  // poruke domaćinu — samo hr/en/de/it (vidi jezikPoruke)
  ['Dobar dan, {ime}!', 'Hello {ime},', 'Guten Tag {ime},', 'Buongiorno {ime},', 'Dzień dobry, {ime}!', 'Dobrý den, {ime},'],
  ['Dobar dan!', 'Hello,', 'Guten Tag,', 'Buongiorno,', 'Dzień dobry!', 'Dobrý den,'],
  ['Upit za {n}', 'Enquiry: {n}', 'Anfrage: {n}', 'Richiesta: {n}', 'Zapytanie: {n}', 'Dotaz: {n}'],
  ['{pozdrav} Zanima me {objekt} od {d1} do {d2} ({n}). Je li slobodno?',
   "{pozdrav} I'm interested in {objekt} from {d1} to {d2} ({n}). Is it available?",
   '{pozdrav} ich interessiere mich für {objekt} vom {d1} bis {d2} ({n}). Ist es frei?',
   '{pozdrav} mi interessa {objekt} dal {d1} al {d2} ({n}). È disponibile?', null, null],
  ['{pozdrav}\n\nZanima nas {objekt} od {d1} do {d2} — {n}, {osobe}.\n\nMožete li potvrditi je li termin slobodan i koja je cijena? Hvala!',
   "{pozdrav}\n\nWe're interested in {objekt} from {d1} to {d2} — {n}, {osobe}.\n\nCould you confirm whether these dates are available and what the price is? Thank you!",
   '{pozdrav}\n\nwir interessieren uns für {objekt} vom {d1} bis {d2} — {n}, {osobe}.\n\nKönnen Sie bestätigen, ob der Termin frei ist und wie hoch der Preis ist? Vielen Dank!',
   '{pozdrav}\n\nci interessa {objekt} dal {d1} al {d2} — {n}, {osobe}.\n\nPuò confermare se le date sono libere e qual è il prezzo? Grazie!', null, null],
  ['{pozdrav}\n\nRazmišljamo o objektu {objekt} oko termina {d1} – {d2} ({n}, {osobe}), ali smo fleksibilni par dana u oba smjera.\n\nŠto vam najbolje odgovara?',
   "{pozdrav}\n\nWe're considering {objekt} around {d1} – {d2} ({n}, {osobe}), but we're flexible by a couple of days either way.\n\nWhat suits you best?",
   '{pozdrav}\n\nwir denken an {objekt} um den {d1} – {d2} ({n}, {osobe}), sind aber ein paar Tage in beide Richtungen flexibel.\n\nWas passt Ihnen am besten?',
   '{pozdrav}\n\nstiamo pensando a {objekt} intorno al {d1} – {d2} ({n}, {osobe}), ma siamo flessibili di qualche giorno in entrambe le direzioni.\n\nCosa le va meglio?', null, null],
  ['{pozdrav} Zanima me boravak u objektu {objekt} od {d1} do {d2} ({n}). Je li slobodno? Hvala!',
   "{pozdrav} I'm interested in a stay at {objekt} from {d1} to {d2} ({n}). Is it available? Thank you!",
   '{pozdrav} ich interessiere mich für einen Aufenthalt in {objekt} vom {d1} bis {d2} ({n}). Ist es frei? Vielen Dank!',
   '{pozdrav} mi interessa un soggiorno presso {objekt} dal {d1} al {d2} ({n}). È disponibile? Grazie!', null, null],
  ['{pozdrav} Zanima me boravak u objektu {objekt}. Koji su termini slobodni? Hvala!',
   "{pozdrav} I'm interested in a stay at {objekt}. Which dates are available? Thank you!",
   '{pozdrav} ich interessiere mich für einen Aufenthalt in {objekt}. Welche Termine sind frei? Vielen Dank!',
   '{pozdrav} mi interessa un soggiorno presso {objekt}. Quali date sono libere? Grazie!', null, null]
])

// Česti tekstovi domaćina (popis sadržaja iz dashboarda, vrste objekta,
// kategorije) — prevedu se i bez AI prijevoda. Isto i sadržaj primjera /h/demo.
dodaj([
  ['Apartman', 'Apartment', 'Ferienwohnung', 'Appartamento', 'Apartament', 'Apartmán'],
  ['Villa', 'Villa', 'Villa', 'Villa', 'Willa', 'Vila'],
  ['Kuća', 'House', 'Ferienhaus', 'Casa', 'Dom', 'Dům'],
  ['Studio', 'Studio', 'Studio', 'Monolocale', 'Studio', 'Studio'],
  ['Soba', 'Room', 'Zimmer', 'Camera', 'Pokój', 'Pokoj'],
  ['Wi-Fi', 'Wi-Fi', 'WLAN', 'Wi-Fi', 'Wi-Fi', 'Wi-Fi'],
  ['Klima uređaj', 'Air conditioning', 'Klimaanlage', 'Aria condizionata', 'Klimatyzacja', 'Klimatizace'],
  ['TV', 'TV', 'TV', 'TV', 'Telewizor', 'Televize'],
  ['Kuhalo za vodu', 'Kettle', 'Wasserkocher', 'Bollitore', 'Czajnik', 'Rychlovarná konvice'],
  ['Aparat za kavu', 'Coffee machine', 'Kaffeemaschine', 'Macchina del caffè', 'Ekspres do kawy', 'Kávovar'],
  ['Perilica rublja', 'Washing machine', 'Waschmaschine', 'Lavatrice', 'Pralka', 'Pračka'],
  ['Sušilica rublja', 'Tumble dryer', 'Wäschetrockner', 'Asciugatrice', 'Suszarka do ubrań', 'Sušička prádla'],
  ['Perilica posuđa', 'Dishwasher', 'Geschirrspüler', 'Lavastoviglie', 'Zmywarka', 'Myčka nádobí'],
  ['Hladnjak', 'Fridge', 'Kühlschrank', 'Frigorifero', 'Lodówka', 'Lednice'],
  ['Pećnica', 'Oven', 'Backofen', 'Forno', 'Piekarnik', 'Trouba'],
  ['Mikrovalna', 'Microwave', 'Mikrowelle', 'Microonde', 'Mikrofalówka', 'Mikrovlnná trouba'],
  ['Bazen', 'Pool', 'Pool', 'Piscina', 'Basen', 'Bazén'],
  ['Balkon / Terasa', 'Balcony / Terrace', 'Balkon / Terrasse', 'Balcone / Terrazza', 'Balkon / Taras', 'Balkon / Terasa'],
  ['Vrt', 'Garden', 'Garten', 'Giardino', 'Ogród', 'Zahrada'],
  ['Roštilj', 'Barbecue', 'Grill', 'Barbecue', 'Grill', 'Gril'],
  ['Sef', 'Safe', 'Safe', 'Cassaforte', 'Sejf', 'Trezor'],
  ['Glačalo', 'Iron', 'Bügeleisen', 'Ferro da stiro', 'Żelazko', 'Žehlička'],
  ['Fen za kosu', 'Hair dryer', 'Haartrockner', 'Asciugacapelli', 'Suszarka do włosów', 'Fén'],
  ['Posteljina', 'Bed linen', 'Bettwäsche', 'Biancheria da letto', 'Pościel', 'Ložní prádlo'],
  ['Ručnici', 'Towels', 'Handtücher', 'Asciugamani', 'Ręczniki', 'Ručníky'],
  ['Oprema za bebe', 'Baby equipment', 'Babyausstattung', 'Attrezzatura per neonati', 'Wyposażenie dla niemowląt', 'Vybavení pro miminka'],
  ['Ljubimci dozvoljeni', 'Pets allowed', 'Haustiere erlaubt', 'Animali ammessi', 'Zwierzęta dozwolone', 'Domácí mazlíčci povoleni'],
  ['Pristup za invalide', 'Wheelchair accessible', 'Barrierefrei', 'Accessibile in sedia a rotelle', 'Dostęp dla niepełnosprawnych', 'Bezbariérový přístup'],
  ['Dizalo', 'Lift', 'Aufzug', 'Ascensore', 'Winda', 'Výtah'],
  ['Zabranjeno pušenje', 'No smoking', 'Rauchen verboten', 'Vietato fumare', 'Zakaz palenia', 'Zákaz kouření'],
  ['Sigurnosne kamere (vanjske)', 'Security cameras (outdoor)', 'Überwachungskameras (außen)', 'Telecamere di sicurezza (esterne)', 'Kamery monitoringu (zewnętrzne)', 'Bezpečnostní kamery (venkovní)'],
  ['Plaža', 'Beach', 'Strand', 'Spiaggia', 'Plaża', 'Pláž'],
  ['Plaže', 'Beaches', 'Strände', 'Spiagge', 'Plaże', 'Pláže'],
  ['Restoran', 'Restaurant', 'Restaurant', 'Ristorante', 'Restauracja', 'Restaurace'],
  ['Restorani', 'Restaurants', 'Restaurants', 'Ristoranti', 'Restauracje', 'Restaurace'],
  ['Trgovina', 'Shop', 'Geschäft', 'Negozio', 'Sklep', 'Obchod'],
  ['Trgovine', 'Shops', 'Geschäfte', 'Negozi', 'Sklepy', 'Obchody'],
  ['Kafić', 'Café', 'Café', 'Bar', 'Kawiarnia', 'Kavárna'],
  ['Kafići', 'Cafés', 'Cafés', 'Bar', 'Kawiarnie', 'Kavárny'],
  ['Pekara', 'Bakery', 'Bäckerei', 'Panificio', 'Piekarnia', 'Pekárna'],
  ['Ljekarna', 'Pharmacy', 'Apotheke', 'Farmacia', 'Apteka', 'Lékárna'],
  ['Priroda', 'Nature', 'Natur', 'Natura', 'Przyroda', 'Příroda'],
  // primjer /h/demo
  ['Dobro došli! Kuća je spremna, bazen očišćen, a u hladnjaku vas čeka domaće maslinovo ulje. Ako išta zatreba, javite se.', 'Welcome! The house is ready, the pool is clean, and homemade olive oil is waiting for you in the fridge. If you need anything, just let me know.', 'Willkommen! Das Haus ist bereit, der Pool gereinigt, und im Kühlschrank wartet hausgemachtes Olivenöl auf Sie. Wenn Sie etwas brauchen, melden Sie sich.', "Benvenuti! La casa è pronta, la piscina pulita e in frigo vi aspetta olio d'oliva fatto in casa. Per qualsiasi cosa, scrivetemi.", 'Witamy! Dom jest gotowy, basen wyczyszczony, a w lodówce czeka domowa oliwa z oliwek. Gdyby czegoś brakowało, dajcie znać.', 'Vítejte! Dům je připravený, bazén vyčištěný a v lednici na vás čeká domácí olivový olej. Kdybyste cokoli potřebovali, ozvěte se.'],
  ['Dva mjesta ispred kuće, lijevo od ulaza.', 'Two spaces in front of the house, to the left of the entrance.', 'Zwei Plätze vor dem Haus, links vom Eingang.', "Due posti davanti alla casa, a sinistra dell'ingresso.", 'Dwa miejsca przed domem, na lewo od wejścia.', 'Dvě místa před domem, vlevo od vchodu.'],
  ['Kutija s ključem je desno od ulaznih vrata. Upišite šifru i povucite poklopac prema dolje.', 'The key box is to the right of the front door. Enter the code and pull the cover down.', 'Der Schlüsselkasten befindet sich rechts neben der Haustür. Code eingeben und die Klappe nach unten ziehen.', "La cassetta delle chiavi è a destra della porta d'ingresso. Inserisci il codice e tira il coperchio verso il basso.", 'Skrzynka na klucze jest na prawo od drzwi wejściowych. Wpisz kod i pociągnij klapkę w dół.', 'Schránka s klíčem je vpravo od vchodových dveří. Zadejte kód a stáhněte víko dolů.'],
  ['Daljinski je u ladici ispod televizora. Preporučena temperatura je 24 °C.', 'The remote is in the drawer under the TV. The recommended temperature is 24 °C.', 'Die Fernbedienung liegt in der Schublade unter dem Fernseher. Empfohlene Temperatur: 24 °C.', 'Il telecomando è nel cassetto sotto la TV. La temperatura consigliata è 24 °C.', 'Pilot jest w szufladzie pod telewizorem. Zalecana temperatura to 24 °C.', 'Ovladač je v šuplíku pod televizí. Doporučená teplota je 24 °C.'],
  ['Bojler je stalno uključen.', 'The water heater is always on.', 'Der Boiler ist immer eingeschaltet.', 'Lo scaldabagno è sempre acceso.', 'Bojler jest cały czas włączony.', 'Bojler je stále zapnutý.'],
  ['Ugasite klimu i svjetla', 'Turn off the air conditioning and lights', 'Klimaanlage und Licht ausschalten', 'Spegni aria condizionata e luci', 'Wyłącz klimatyzację i światła', 'Vypněte klimatizaci a světla'],
  ['Smeće odnesite u kontejnere na kraju ulice', 'Take the rubbish to the bins at the end of the street', 'Müll in die Container am Ende der Straße bringen', 'Porta la spazzatura nei cassonetti in fondo alla strada', 'Wynieś śmieci do kontenerów na końcu ulicy', 'Odneste odpadky do kontejnerů na konci ulice'],
  ['Ključ vratite u kutiju i zaključajte je', 'Put the key back in the box and lock it', 'Schlüssel zurück in den Kasten legen und ihn verschließen', 'Rimetti la chiave nella cassetta e chiudila', 'Włóż klucz z powrotem do skrzynki i zamknij ją', 'Vraťte klíč do schránky a zamkněte ji'],
  ['Pekara u centru', 'Bakery in the centre', 'Bäckerei im Zentrum', 'Panificio in centro', 'Piekarnia w centrum', 'Pekárna v centru'],
  ['Zračna luka Split', 'Split Airport', 'Flughafen Split', 'Aeroporto di Spalato', 'Lotnisko Split', 'Letiště Split'],
  ['Nacionalni park Krka', 'Krka National Park', 'Nationalpark Krka', 'Parco nazionale del Krka', 'Park Narodowy Krka', 'Národní park Krka'],
  ['ulaznica', 'entrance fee', 'Eintritt', "biglietto d'ingresso", 'bilet wstępu', 'vstupné'],
  ['Tišina od 23 do 7 sati.', 'Quiet hours from 11 pm to 7 am.', 'Nachtruhe von 23 bis 7 Uhr.', 'Silenzio dalle 23 alle 7.', 'Cisza nocna od 23 do 7.', 'Noční klid od 23 do 7 hodin.'],
  ['Pušenje samo na terasi.', 'Smoking only on the terrace.', 'Rauchen nur auf der Terrasse.', 'Si fuma solo in terrazza.', 'Palenie tylko na tarasie.', 'Kouření jen na terase.'],
  ['Ima li dječji krevetić?', 'Is there a cot?', 'Gibt es ein Kinderbett?', "C'è un lettino per bambini?", 'Czy jest łóżeczko dziecięce?', 'Je k dispozici dětská postýlka?'],
  ['Da, u ormaru u drugoj sobi.', 'Yes, in the wardrobe in the second room.', 'Ja, im Schrank im zweiten Zimmer.', "Sì, nell'armadio della seconda stanza.", 'Tak, w szafie w drugim pokoju.', 'Ano, ve skříni ve druhém pokoji.']
])

// udaljenosti koje domaćini pišu („5 min pješice”, „2 km autom”)
const UZORCI = [
  [/^(\d[\d.,\s–-]*\s*(?:min|km|m|h|sat[ai]?)?\.?) pješice$/i, { en: '$1 on foot', de: '$1 zu Fuß', it: '$1 a piedi', pl: '$1 pieszo', cs: '$1 pěšky' }],
  [/^(\d[\d.,\s–-]*\s*(?:min|km|m|h|sat[ai]?)?\.?) autom$/i, { en: '$1 by car', de: '$1 mit dem Auto', it: '$1 in auto', pl: '$1 samochodem', cs: '$1 autem' }],
  [/^(\d[\d.,\s–-]*\s*(?:min|km|m|h|sat[ai]?)?\.?) brodom$/i, { en: '$1 by boat', de: '$1 mit dem Boot', it: '$1 in barca', pl: '$1 łodzią', cs: '$1 lodí' }],
  [/^(\d[\d.,\s–-]*\s*(?:min|km|m|h|sat[ai]?)?\.?) biciklom$/i, { en: '$1 by bike', de: '$1 mit dem Rad', it: '$1 in bici', pl: '$1 rowerem', cs: '$1 na kole' }]
]

// ── množina ──────────────────────────────────────────────────
// hr: [1, 2–4, 5+]; en/de/it: [1, ostalo]; pl: [1, 2–4, 5+]; cs: [1, 2–4, 5+]
const P = {
  'gost': { hr: ['gost', 'gosta', 'gostiju'], en: ['guest', 'guests'], de: ['Gast', 'Gäste'], it: ['ospite', 'ospiti'], pl: ['gość', 'gości', 'gości'], cs: ['host', 'hosté', 'hostů'] },
  'gosta': { hr: ['gosta', 'gostiju', 'gostiju'], en: ['guest', 'guests'], de: ['Gast', 'Gäste'], it: ['ospite', 'ospiti'], pl: ['gościa', 'gości', 'gości'], cs: ['hosta', 'hosty', 'hostů'] },
  'noć': { hr: ['noć', 'noći', 'noći'], en: ['night', 'nights'], de: ['Nacht', 'Nächte'], it: ['notte', 'notti'], pl: ['noc', 'noce', 'nocy'], cs: ['noc', 'noci', 'nocí'] },
  'dan': { hr: ['dan', 'dana', 'dana'], en: ['day', 'days'], de: ['Tag', 'Tage'], it: ['giorno', 'giorni'], pl: ['dzień', 'dni', 'dni'], cs: ['den', 'dny', 'dní'] },
  'osoba': { hr: ['osoba', 'osobe', 'osoba'], en: ['person', 'people'], de: ['Person', 'Personen'], it: ['persona', 'persone'], pl: ['osoba', 'osoby', 'osób'], cs: ['osoba', 'osoby', 'osob'] },
  'spavaća soba': { hr: ['spavaća soba', 'spavaće sobe', 'spavaćih soba'], en: ['bedroom', 'bedrooms'], de: ['Schlafzimmer', 'Schlafzimmer'], it: ['camera da letto', 'camere da letto'], pl: ['sypialnia', 'sypialnie', 'sypialni'], cs: ['ložnice', 'ložnice', 'ložnic'] },
  'kupaonica': { hr: ['kupaonica', 'kupaonice', 'kupaonica'], en: ['bathroom', 'bathrooms'], de: ['Badezimmer', 'Badezimmer'], it: ['bagno', 'bagni'], pl: ['łazienka', 'łazienki', 'łazienek'], cs: ['koupelna', 'koupelny', 'koupelen'] },
  'krevet': { hr: ['krevet', 'kreveta', 'kreveta'], en: ['bed', 'beds'], de: ['Bett', 'Betten'], it: ['letto', 'letti'], pl: ['łóżko', 'łóżka', 'łóżek'], cs: ['postel', 'postele', 'postelí'] },
  'ocjena gostiju': { hr: ['ocjena gostiju', 'ocjene gostiju', 'ocjena gostiju'], en: ['guest rating', 'guest ratings'], de: ['Gästebewertung', 'Gästebewertungen'], it: ['valutazione degli ospiti', 'valutazioni degli ospiti'], pl: ['ocena gości', 'oceny gości', 'ocen gości'], cs: ['hodnocení hostů', 'hodnocení hostů', 'hodnocení hostů'] }
}
function oblik(broj, oblici, j) {
  const n = Math.abs(Math.trunc(Number(broj) || 0))
  if (oblici.length === 2) return n === 1 ? oblici[0] : oblici[1]
  const d10 = n % 10, d100 = n % 100
  if (j === 'hr') {
    if (d10 === 1 && d100 !== 11) return oblici[0]
    if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return oblici[1]
    return oblici[2]
  }
  if (n === 1) return oblici[0]
  if (j === 'pl') return d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14) ? oblici[1] : oblici[2]
  return n >= 2 && n <= 4 ? oblici[1] : oblici[2]                  // cs
}
/** „3 noći” na trenutnom (ili zadanom) jeziku */
export function n(broj, kljuc, j = J) {
  const p = P[kljuc]
  if (!p) return broj + ' ' + kljuc
  return broj + ' ' + oblik(broj, p[j] || p.hr, p[j] ? j : 'hr')
}

// ── prijevod ─────────────────────────────────────────────────
const umetni = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m)) : s)

/** tekst sučelja na trenutnom jeziku */
export function t(hr, v) { return tu(J, hr, v) }
/** tekst sučelja na zadanom jeziku (npr. poruka domaćinu) */
export function tu(j, hr, v) {
  if (j === 'hr') return umetni(hr, v)
  const r = R[norm(hr)]
  return umetni((r && r[j]) || hr, v)
}

/** tekst koji je upisao domaćin: prijevod rute → rječnik → uzorak → izvornik */
export function H(s) {
  if (J === 'hr' || s == null || s === '') return s
  const k = String(s).trim()
  if (SADRZAJ[k]) return SADRZAJ[k]
  const r = R[norm(k)]
  if (r && r[J]) return r[J]
  for (const [re, pr] of UZORCI) if (re.test(k)) return k.replace(re, pr[J])
  return s
}

// ── datumi i iznosi ──────────────────────────────────────────
const MJ = ['Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac']
const MJ_GEN = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja', 'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenoga', 'prosinca']
const velikoSlovo = s => s.charAt(0).toLocaleUpperCase(lokal()) + s.slice(1)
const fmt = (j, o) => new Intl.DateTimeFormat(LOC[j], o)

/** ime mjeseca (nominativ, veliko slovo) — naslov kalendara */
export function mjesec(i, j = J) {
  return j === 'hr' ? MJ[i] : velikoSlovo(fmt(j, { month: 'long' }).format(new Date(2026, i, 15)))
}
/** „12. kolovoza” / „12 August”; s godinom: „12. kolovoza 2026.” */
export function datum(d, { godina = false, j = J } = {}) {
  const x = d instanceof Date ? d : new Date(d)
  if (j === 'hr') return `${x.getDate()}. ${MJ_GEN[x.getMonth()]}${godina ? ' ' + x.getFullYear() + '.' : ''}`
  return fmt(j, godina ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }).format(x)
}
/** „12. 8.” / „12/08” */
export function datumKratko(d, j = J) {
  const x = d instanceof Date ? d : new Date(d)
  return j === 'hr' ? `${x.getDate()}. ${x.getMonth() + 1}.` : fmt(j, { day: 'numeric', month: 'numeric' }).format(x)
}
/** „kolovoz 2026.” / „August 2026” — datum recenzije */
export function mjesecGodina(d, j = J) {
  const x = d instanceof Date ? d : new Date(d)
  return j === 'hr' ? `${MJ[x.getMonth()].toLowerCase()} ${x.getFullYear()}.` : fmt(j, { month: 'long', year: 'numeric' }).format(x)
}
/** početna slova dana u tjednu, od ponedjeljka */
export function daniUTjednu(j = J) {
  if (j === 'hr') return ['P', 'U', 'S', 'Č', 'P', 'S', 'N']
  const f = fmt(j, { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, i) => velikoSlovo(f.format(new Date(2026, 0, 5 + i))))   // 5. 1. 2026. je ponedjeljak
}
/** „150 €” */
export const novac = (x, j = J) => Number(x).toLocaleString(LOC[j], { maximumFractionDigits: 2 }) + ' €'

// ── poruke domaćinu ──────────────────────────────────────────
// Gost na poljskom ili češkom domaćinu piše na engleskom — to domaćin
// na Jadranu najčešće razumije. Hrvatski, engleski, njemački i talijanski
// ostaju svoji (odluka: docs/odluke.md, točka 18).
export const jezikPoruke = () => (['hr', 'en', 'de', 'it'].includes(J) ? J : 'en')

// ── odabir jezika ────────────────────────────────────────────
function iz(kod, dop) {
  const k = String(kod || '').toLowerCase().split(/[-_]/)[0]
  const c = BLISKI[k] || k
  return dop.includes(c) ? c : null
}
/** adresa (?lang=) → spremljeni izbor → jezik preglednika → engleski → hrvatski */
export function odaberi(dop = KODOVI) {
  let s = null
  try { s = localStorage.getItem(SPREMLJENO) } catch {}
  const kandidati = [new URLSearchParams(location.search).get('lang'), s, ...(navigator.languages || [navigator.language])]
  for (const k of kandidati) { const c = iz(k, dop); if (c) return c }
  return dop.includes('en') ? 'en' : 'hr'
}
export function postavi(kod) {
  J = KODOVI.includes(kod) ? kod : 'hr'
  document.documentElement.lang = J
}

// ── statični HTML ────────────────────────────────────────────
// Izvornik svakog teksta pamti se pri prvom prolazu, pa se prijevod
// uvijek radi iz hrvatskog (i nakon promjene jezika).
const IZVOR = new WeakMap()
const ATRIBUTI = ['aria-label', 'placeholder', 'title', 'alt']
export function prevediDom(root = document.body) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: x => (x.parentElement && x.parentElement.closest('script,style,svg,[translate="no"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
  })
  for (let x; (x = w.nextNode());) {
    if (!IZVOR.has(x)) { if (!R[norm(x.data)]) continue; IZVOR.set(x, x.data) }
    const izv = IZVOR.get(x), r = R[norm(izv)]
    const pr = J !== 'hr' && r && r[J]
    if (!pr) { x.data = izv; continue }
    const [, prije, poslije] = izv.match(/^(\s*)[\s\S]*?(\s*)$/)   // razmaci oko teksta ostaju
    x.data = prije + pr + poslije
  }
  for (const el of root.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) {
    if (el.closest('[translate="no"]')) continue
    let izv = IZVOR.get(el)
    if (!izv) { izv = {}; for (const a of ATRIBUTI) if (el.hasAttribute(a) && R[norm(el.getAttribute(a))]) izv[a] = el.getAttribute(a); IZVOR.set(el, izv) }
    for (const [a, v] of Object.entries(izv)) el.setAttribute(a, J === 'hr' ? v : (R[norm(v)] && R[norm(v)][J]) || v)
  }
}

// ── sadržaj domaćina (/api/prevedi) ─────────────────────────
export function sadrzaj(prijevodi) {
  SADRZAJ = Object.create(null)
  for (const [k, v] of Object.entries(prijevodi || {})) if (typeof v === 'string') SADRZAJ[k.trim()] = v
}
/** stanje za spremanje (vodič bez interneta) */
export const stanje = () => ({ jezik: J, jezici: DOPUSTENI, prijevodi: { ...SADRZAJ }, odgovor: STANJE_PRIJEVODA })

async function ucitaj(upit, j) {
  const q = new URLSearchParams({ lang: j })
  if (upit.token) q.set('token', upit.token)
  if (upit.slug) q.set('slug', upit.slug)
  try {
    const r = await fetch('/api/prevedi?' + q)
    if (!r.ok) return null
    const o = await r.json()
    return o && o.ok ? o : null
  } catch { return null }
}
// zahtjev poslan unaprijed (usporedo s podacima stranice), po jeziku
const RANI = new Map()
export function unaprijed(upit) { if (!RANI.has(J)) RANI.set(J, ucitaj(upit, J)) }

const KASNO = Symbol('kasno')
const doRoka = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(KASNO), ms))])

/**
 * Jezik stranice za ovaj objekt: suzi željeni jezik na one koje plan domaćina
 * dopušta i učita prijevod sadržaja domaćina.
 *   upit        { token, slug } za /api/prevedi; null = bez rute (primjer)
 *   spremljeno  stanje() iz predmemorije vodiča (rad bez interneta)
 *   kasnije     poziva se ako prijevod stigne nakon roka — stranica se ponovno nacrta
 * Vraća true ako se jezik stranice promijenio (npr. plan ne dopušta željeni).
 */
export async function pokreni(upit, { rok = 6000, spremljeno = null, kasnije = null } = {}) {
  const pocetni = J
  if (!upit) { DOPUSTENI = KODOVI; crtajBirace(); return false }
  const prvi = RANI.get(J) || ucitaj(upit, J)
  let o = await doRoka(prvi, rok)
  if (o === KASNO) {
    if (spremljeno && spremljeno.jezik === J) primijeni(spremljeno.odgovor || { jezici: spremljeno.jezici, prijevodi: spremljeno.prijevodi, prijevod: true, potpuno: true })
    else DOPUSTENI = KODOVI
    crtajBirace()
    prvi.then(x => { if (x && x.jezici && x.jezici.includes(J) && primijeni(x) && kasnije) { crtajBirace(); kasnije() } })
    return false
  }
  if (!o && spremljeno && spremljeno.jezik === J) o = spremljeno.odgovor || { jezici: spremljeno.jezici, prijevodi: spremljeno.prijevodi, prijevod: true, potpuno: true }
  if (o && Array.isArray(o.jezici) && !o.jezici.includes(J)) {
    // plan domaćina ne uključuje ovaj jezik → najbliži dopušteni (engleski ili hrvatski)
    DOPUSTENI = o.jezici
    postavi(odaberi(o.jezici))
    prevediDom()
    if (J !== 'hr') {
      const drugi = await doRoka(ucitaj(upit, J), rok)
      o = drugi && drugi !== KASNO ? drugi : { jezici: o.jezici, prijevodi: {}, prijevod: false }
    }
  }
  if (o) primijeni(o); else { DOPUSTENI = KODOVI; STANJE_PRIJEVODA = null }
  crtajBirace()
  return J !== pocetni
}
function primijeni(o) {
  if (!o) return false
  if (Array.isArray(o.jezici) && o.jezici.length) DOPUSTENI = o.jezici.filter(k => KODOVI.includes(k))
  sadrzaj(o.prijevodi)
  STANJE_PRIJEVODA = { jezici: DOPUSTENI, prijevodi: { ...SADRZAJ }, prijevod: !!o.prijevod, potpuno: !!o.potpuno }
  return true
}

/** napomena ispod stranice: je li tekst domaćina preveden i koliko */
export function napomena() {
  if (J === 'hr') return ''
  const s = STANJE_PRIJEVODA
  if (s && s.prijevod && s.potpuno && Object.keys(SADRZAJ).length) return t('Tekst domaćina preveden je automatski.')
  if (s && s.prijevod && s.potpuno) return ''
  return t('Dio teksta domaćina prikazan je na hrvatskom.')
}

// ── birač jezika: svaki element s [data-jezik-birac] ─────────
function crtajBirace() {
  for (const el of document.querySelectorAll('[data-jezik-birac]')) {
    if (DOPUSTENI.length < 2) { el.hidden = true; continue }
    el.hidden = false
    el.innerHTML = ''
    const s = document.createElement('select')
    s.className = 'jezik'
    s.setAttribute('aria-label', t('Jezik'))
    s.setAttribute('translate', 'no')
    for (const j of JEZICI) if (DOPUSTENI.includes(j.kod)) {
      const o = document.createElement('option')
      o.value = j.kod; o.textContent = j.ime; o.lang = j.kod
      if (j.kod === J) o.selected = true
      s.appendChild(o)
    }
    s.onchange = () => promijeni(s.value)
    el.appendChild(s)
  }
}
export function promijeni(kod) {
  try { localStorage.setItem(SPREMLJENO, kod) } catch {}
  const u = new URL(location.href)
  if (u.searchParams.has('lang')) { u.searchParams.set('lang', kod); location.replace(u.toString()) }
  else location.reload()
}
