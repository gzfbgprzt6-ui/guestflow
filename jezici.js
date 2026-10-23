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

import { RJECNIK as SADRZAJI_RJ } from './sadrzaji.js'

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
dodaj(SADRZAJI_RJ)   // nazivi sadržaja objekta (sadrzaji.js) — prije rječnika, pa ručno napisani redovi niže imaju prednost

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
  ['Šifru vrata i Wi-Fi lozinku dobivate u osobnom linku od domaćina.', 'You will get the door code and Wi-Fi password in your personal link from the host.', 'Türcode und WLAN-Passwort erhalten Sie im persönlichen Link Ihres Gastgebers.', 'Il codice della porta e la password Wi-Fi li riceverete nel link personale dal vostro host.', 'Kod do drzwi i hasło Wi-Fi otrzymacie w osobistym linku od gospodarza.', 'Kód ke dveřím a heslo k Wi-Fi dostanete v osobním odkazu od hostitele.'],
  ["Adresa", "Address", "Adresse", "Indirizzo", "Adres", "Adresa"],
  ["Brzo do informacije", "Quick answers", "Schnelle Antworten", "Risposte rapide", "Szybkie odpowiedzi", "Rychlé odpovědi"],
  ["Dobro došli", "Welcome", "Willkommen", "Benvenuti", "Witamy", "Vítejte"],
  ["Dobro došli, {ime}", "Welcome, {ime}", "Willkommen, {ime}", "Benvenuti, {ime}", "Witamy, {ime}", "Vítejte, {ime}"],
  ["Domaćin preporučuje", "Your host recommends", "Ihr Gastgeber empfiehlt", "Il vostro host consiglia", "Gospodarz poleca", "Hostitel doporučuje"],
  ["Domaćin će vas lakše dočekati. Javlja se jednim dodirom.", "It helps your host welcome you. One tap to let them know.", "So kann Ihr Gastgeber Sie besser empfangen. Ein Tippen genügt.", "Così il vostro host potrà accogliervi meglio. Basta un tocco.", "Gospodarz łatwiej was przywita. Wystarczy jedno dotknięcie.", "Hostitel vás tak snáz přivítá. Stačí jedno klepnutí."],
  ["Gdje jesti", "Where to eat", "Essen gehen", "Dove mangiare", "Gdzie zjeść", "Kde se najíst"],
  ["Hvala što ste bili s nama", "Thank you for staying with us", "Danke für Ihren Aufenthalt", "Grazie per essere stati da noi", "Dziękujemy za pobyt", "Děkujeme za pobyt"],
  ["Hvala što ste bili s nama, {ime}", "Thank you for staying with us, {ime}", "Danke für Ihren Aufenthalt, {ime}", "Grazie per essere stati da noi, {ime}", "Dziękujemy za pobyt, {ime}", "Děkujeme za pobyt, {ime}"],
  ["Još {a} od {b} — kvačice su u popisu za odlazak.", "{a} of {b} still to do — tick them off in the departure list.", "Noch {a} von {b} — abhaken in der Abreiseliste.", "Ancora {a} su {b} — spuntateli nella lista per la partenza.", "Jeszcze {a} z {b} — odhaczcie je na liście wyjazdowej.", "Ještě {a} z {b} — odškrtněte je v seznamu před odjezdem."],
  ["Kad otprilike stižete?", "Roughly when will you arrive?", "Wann kommen Sie ungefähr an?", "Più o meno quando arrivate?", "Kiedy mniej więcej przyjedziecie?", "Kdy zhruba dorazíte?"],
  ["Kako ući?", "How to get in?", "Wie komme ich rein?", "Come entrare?", "Jak wejść?", "Jak se dostat dovnitř?"],
  ["Kasnije", "Later", "Später", "Più tardi", "Później", "Později"],
  ["Korak po korak", "Step by step", "Schritt für Schritt", "Passo dopo passo", "Krok po kroku", "Krok za krokem"],
  ["Lozinka se otključa sat prije prijave.", "The password unlocks an hour before check-in.", "Das Passwort wird eine Stunde vor dem Check-in freigeschaltet.", "La password si sblocca un’ora prima del check-in.", "Hasło odblokuje się godzinę przed zameldowaniem.", "Heslo se odemkne hodinu před check-inem."],
  ["Lozinka se otključa {d} u {t}.", "The password unlocks on {d} at {t}.", "Das Passwort wird am {d} um {t} freigeschaltet.", "La password si sblocca il {d} alle {t}.", "Hasło odblokuje się {d} o {t}.", "Heslo se odemkne {d} v {t}."],
  ["Napišite domaćinu", "Message your host", "Schreiben Sie Ihrem Gastgeber", "Scrivete al vostro host", "Napisz do gospodarza", "Napište hostiteli"],
  ["Napišite {n}", "Message {n}", "Schreiben Sie {n}", "Scrivete a {n}", "Napisz do: {n}", "Napište: {n}"],
  ["Naš izbor", "Our picks", "Unsere Auswahl", "La nostra scelta", "Nasz wybór", "Náš výběr"],
  ["Npr. Možemo li doći ranije, oko 13 h?", "E.g. Could we arrive earlier, around 1 pm?", "Z. B. Können wir früher kommen, gegen 13 Uhr?", "Es. Possiamo arrivare prima, verso le 13?", "Np. Czy możemy przyjechać wcześniej, około 13:00?", "Např. Můžeme přijet dřív, kolem 13 h?"],
  ["Odjava za", "Check-out in", "Check-out in", "Check-out tra", "Wymeldowanie za", "Check-out za"],
  ["Odvedi me", "Take me there", "Hinführen", "Portami lì", "Prowadź mnie", "Navigovat"],
  ["Otvori popis", "Open the list", "Liste öffnen", "Apri la lista", "Otwórz listę", "Otevřít seznam"],
  ["Popis za odlazak", "Departure checklist", "Abreise-Checkliste", "Lista per la partenza", "Lista przed wyjazdem", "Seznam před odjezdem"],
  ["Poruka gosta — {n}", "Message from a guest — {n}", "Nachricht eines Gastes — {n}", "Messaggio di un ospite — {n}", "Wiadomość od gościa — {n}", "Zpráva od hosta — {n}"],
  ["Poruka stiže ravno domaćinu — odgovor dobivate na svoj mobitel.", "Your message goes straight to your host — the reply comes to your phone.", "Die Nachricht geht direkt an Ihren Gastgeber — die Antwort kommt auf Ihr Handy.", "Il messaggio arriva direttamente al vostro host — la risposta arriva sul vostro telefono.", "Wiadomość trafia prosto do gospodarza — odpowiedź dostaniecie na telefon.", "Zpráva jde přímo hostiteli — odpověď vám přijde na mobil."],
  ["Pozdrav! Ovdje {ime}. Stižemo kasnije, javit ćemo točno vrijeme.", "Hi! This is {ime}. We will arrive later and let you know the exact time.", "Hallo! Hier ist {ime}. Wir kommen später und melden uns mit der genauen Uhrzeit.", "Ciao! Sono {ime}. Arriveremo più tardi, vi faremo sapere l’orario preciso.", "Dzień dobry! Tu {ime}. Przyjedziemy później, damy znać o dokładnej godzinie.", "Dobrý den! Tady {ime}. Přijedeme později, dáme vědět přesný čas."],
  ["Pozdrav! Ovdje {ime}. Stižemo otprilike {v}.", "Hi! This is {ime}. We will arrive at about {v}.", "Hallo! Hier ist {ime}. Wir kommen ungefähr {v} an.", "Ciao! Sono {ime}. Arriveremo verso le {v}.", "Dzień dobry! Tu {ime}. Przyjedziemy około {v}.", "Dobrý den! Tady {ime}. Dorazíme zhruba {v}."],
  ["Preporuka dana", "Today's pick", "Tipp des Tages", "Il consiglio del giorno", "Polecenie dnia", "Tip dne"],
  ["Prijava, odjava i pravila kuće.", "Check-in, check-out and house rules.", "Check-in, Check-out und Hausregeln.", "Check-in, check-out e regole della casa.", "Zameldowanie, wymeldowanie i zasady domu.", "Check-in, check-out a domácí pravidla."],
  ["Prije dolaska", "Before you arrive", "Vor der Anreise", "Prima dell’arrivo", "Przed przyjazdem", "Před příjezdem"],
  ["Prvi izbor domaćina", "Host's first pick", "Erste Wahl des Gastgebers", "La prima scelta dell’host", "Pierwszy wybór gospodarza", "První volba hostitele"],
  ["Sva pravila", "All rules", "Alle Regeln", "Tutte le regole", "Wszystkie zasady", "Všechna pravidla"],
  ["Sve preporuke", "All recommendations", "Alle Empfehlungen", "Tutti i consigli", "Wszystkie polecenia", "Všechna doporučení"],
  ["Trebate kasniju? Napišite domaćinu — često se može dogovoriti.", "Need a later one? Message your host — it can often be arranged.", "Später nötig? Schreiben Sie Ihrem Gastgeber — oft lässt sich das einrichten.", "Vi serve più tardi? Scrivete al vostro host — spesso si può fare.", "Potrzebujecie później? Napiszcie do gospodarza — często da się to ustalić.", "Potřebujete později? Napište hostiteli — často se dá domluvit."],
  ["Upišite poruku.", "Type your message.", "Bitte Nachricht eingeben.", "Scrivete il messaggio.", "Wpiszcie wiadomość.", "Napište zprávu."],
  ["Vaša poruka domaćinu", "Your message to the host", "Ihre Nachricht an den Gastgeber", "Il vostro messaggio all’host", "Wasza wiadomość do gospodarza", "Vaše zpráva hostiteli"],
  ["Vrijeme dolaska", "Arrival time", "Ankunftszeit", "Orario di arrivo", "Godzina przyjazdu", "Čas příjezdu"],
  ["domaćina", "your host", "Ihren Gastgeber", "il vostro host", "gospodarza", "hostitele"],
  ["parking, adresa", "parking, address", "Parken, Adresse", "parcheggio, indirizzo", "parking, adres", "parkování, adresa"],
  ["vaš gost", "your guest", "Ihr Gast", "il vostro ospite", "wasz gość", "váš host"],
  ["{n} preporučuje", "{n} recommends", "{n} empfiehlt", "{n} consiglia", "{n} poleca", "{n} doporučuje"],
  ["{n} s fotografijama, od ulice do vrata.", "{n} with photos, from the street to the door.", "{n} mit Fotos, von der Straße bis zur Tür.", "{n} con foto, dalla strada alla porta.", "{n} ze zdjęciami, od ulicy do drzwi.", "{n} s fotkami, od ulice ke dveřím."],
  ["{n} će vas lakše dočekati. Javlja se jednim dodirom.", "It helps {n} welcome you. One tap to let them know.", "So kann {n} Sie besser empfangen. Ein Tippen genügt.", "Così {n} potrà accogliervi meglio. Basta un tocco.", "{n} łatwiej was przywita. Wystarczy jedno dotknięcie.", "{n} vás tak snáz přivítá. Stačí jedno klepnutí."],
  ["Šifra je na koraku {k}.", "The code is at step {k}.", "Der Code steht bei Schritt {k}.", "Il codice è al passaggio {k}.", "Kod jest w kroku {k}.", "Kód je v kroku {k}."],
  ["Šifru dobivate u osobnom linku", "You get the code in your personal link", "Den Code erhalten Sie im persönlichen Link", "Il codice è nel vostro link personale", "Kod otrzymacie w osobistym linku", "Kód dostanete v osobním odkazu"],
  ["šifra vrata", "door code", "Türcode", "codice porta", "kod do drzwi", "kód ke dveřím"],
  ["Brojevi vrijede u cijeloj Hrvatskoj i besplatni su.", "These numbers work everywhere in Croatia and are free.", "Diese Nummern gelten in ganz Kroatien und sind kostenlos.", "Questi numeri valgono in tutta la Croazia e sono gratuiti.", "Te numery działają w całej Chorwacji i są bezpłatne.", "Tato čísla platí v celém Chorvatsku a jsou zdarma."],
  ["Danas je odlazak", "Departure is today", "Heute ist Abreise", "Oggi è la partenza", "Dziś wyjazd", "Dnes je odjezd"],
  ["Danas", "Today", "Heute", "Oggi", "Dziś", "Dnes"],
  ["Ispuni prijavu", "Fill in the registration", "Anmeldung ausfüllen", "Compila la registrazione", "Wypełnij zgłoszenie", "Vyplnit přihlášku"],
  ["Javi domaćinu da ste stigli", "Let your host know you've arrived", "Dem Gastgeber Bescheid geben", "Avvisa l’host che siete arrivati", "Daj znać gospodarzowi, że jesteście", "Dejte hostiteli vědět, že jste dorazili"],
  ["Kreni korak po korak", "Go step by step", "Schritt für Schritt starten", "Inizia passo dopo passo", "Krok po kroku", "Krok za krokem"],
  ["Lozinka je uvijek ovdje", "The password is always here", "Das Passwort finden Sie immer hier", "La password è sempre qui", "Hasło jest zawsze tutaj", "Heslo je vždy tady"],
  ["Mreža {m} · uređaji i upute", "Network {m} · appliances and tips", "Netz {m} · Geräte und Hinweise", "Rete {m} · apparecchi e istruzioni", "Sieć {m} · urządzenia i wskazówki", "Síť {m} · spotřebiče a pokyny"],
  ["Mreža, uređaji, pravila i odlazak", "Network, appliances, rules and check-out", "Netz, Geräte, Regeln und Abreise", "Rete, apparecchi, regole e partenza", "Sieć, urządzenia, zasady i wyjazd", "Síť, spotřebiče, pravidla a odjezd"],
  ["Na početak vodiča", "Back to the guide", "Zum Anfang des Guides", "Torna all’inizio della guida", "Na początek przewodnika", "Na začátek průvodce"],
  ["Natrag", "Back", "Zurück", "Indietro", "Wstecz", "Zpět"],
  ["Odjava do {v} · popis i ocjena", "Check-out by {v} · list and rating", "Check-out bis {v} · Liste und Bewertung", "Check-out entro le {v} · lista e voto", "Wymeldowanie do {v} · lista i ocena", "Odhlášení do {v} · seznam a hodnocení"],
  ["Otvori", "Open", "Öffnen", "Apri", "Otwórz", "Otevřít"],
  ["Ovdje je šifra", "Code is here", "Hier ist der Code", "Qui c’è il codice", "Tu jest kod", "Tady je kód"],
  ["Podaci za eVisitor · oko 2 minute", "Details for eVisitor · about 2 minutes", "Angaben für eVisitor · ca. 2 Minuten", "Dati per eVisitor · circa 2 minuti", "Dane do eVisitor · ok. 2 minuty", "Údaje pro eVisitor · asi 2 minuty"],
  ["Pogledaj dolazak", "See arrival", "Anreise ansehen", "Vedi l’arrivo", "Zobacz przyjazd", "Zobrazit příjezd"],
  ["Pogledaj korake ponovno", "See the steps again", "Schritte noch einmal ansehen", "Rivedi i passaggi", "Zobacz kroki ponownie", "Zobrazit kroky znovu"],
  ["Pogledaj preporuke", "See recommendations", "Empfehlungen ansehen", "Vedi i consigli", "Zobacz polecenia", "Zobrazit doporučení"],
  ["Poslano domaćinu", "Sent to your host", "An den Gastgeber gesendet", "Inviato all’host", "Wysłano gospodarzowi", "Odesláno hostiteli"],
  ["Pozdrav! Ovdje {ime}. Stigli smo i ušli — sve je u redu, hvala!", "Hi! This is {ime}. We've arrived and we're in — all good, thank you!", "Hallo! Hier ist {ime}. Wir sind angekommen und drin — alles in Ordnung, danke!", "Ciao! Sono {ime}. Siamo arrivati e siamo entrati — tutto a posto, grazie!", "Dzień dobry! Tu {ime}. Dotarliśmy i weszliśmy — wszystko w porządku, dziękujemy!", "Dobrý den! Tady {ime}. Dorazili jsme a jsme uvnitř — vše v pořádku, děkujeme!"],
  ["Pročitaj", "Read", "Lesen", "Leggi", "Przeczytaj", "Přečíst"],
  ["Pročitano", "Read", "Gelesen", "Letto", "Przeczytane", "Přečteno"],
  ["Sada je na redu", "Up next", "Jetzt dran", "Ora tocca a", "Teraz kolej na", "Teď na řadě"],
  ["Sljedeći korak", "Next step", "Nächster Schritt", "Passo successivo", "Następny krok", "Další krok"],
  ["Stigli smo", "We've arrived", "Wir sind angekommen", "Siamo arrivati", "Dotarliśmy", "Dorazili jsme"],
  ["Sve je spremno", "All set", "Alles erledigt", "Tutto pronto", "Wszystko gotowe", "Vše připraveno"],
  ["Uređaji i upute", "Appliances and tips", "Geräte und Hinweise", "Apparecchi e istruzioni", "Urządzenia i wskazówki", "Spotřebiče a pokyny"],
  ["Ušli smo", "We're in", "Wir sind drin", "Siamo entrati", "Jesteśmy w środku", "Jsme uvnitř"],
  ["Ušli ste · upute ostaju ovdje", "You're in · the steps stay here", "Sie sind drin · die Schritte bleiben hier", "Siete dentro · i passaggi restano qui", "Jesteście w środku · kroki zostają tutaj", "Jste uvnitř · kroky zůstávají tady"],
  ["Ušli ste", "You're in", "Sie sind drin", "Siete entrati", "Jesteście w środku", "Jste uvnitř"],
  ["Ušli ste. Dobro došli!", "You're in. Welcome!", "Sie sind drin. Willkommen!", "Siete dentro. Benvenuti!", "Jesteście w środku. Witamy!", "Jste uvnitř. Vítejte!"],
  ["Već pogledano", "Already seen", "Schon angesehen", "Già visto", "Już obejrzane", "Už zobrazeno"],
  ["Vodi me", "Take me there", "Navigieren", "Portami lì", "Prowadź", "Navigovat"],
  ["Wi-Fi, upute za kuću i preporuke čekaju vas u vodiču. Ako nešto ne štima, javite se domaćinu.", "Wi-Fi, house tips and recommendations are waiting in the guide. If anything's not right, message your host.", "WLAN, Hinweise zum Haus und Empfehlungen finden Sie im Guide. Wenn etwas nicht passt, schreiben Sie Ihrem Gastgeber.", "Wi-Fi, istruzioni per la casa e consigli vi aspettano nella guida. Se qualcosa non va, scrivete all’host.", "Wi-Fi, wskazówki do domu i polecenia czekają w przewodniku. Jeśli coś nie gra, napiszcie do gospodarza.", "Wi-Fi, pokyny k domu a doporučení najdete v průvodci. Pokud něco nesedí, napište hostiteli."],
  ["adresa i parking", "address and parking", "Adresse und Parken", "indirizzo e parcheggio", "adres i parking", "adresa a parkování"],
  ["s fotografijama", "with photos", "mit Fotos", "con foto", "ze zdjęciami", "s fotografiemi"],
  ["šifra na koraku {k}", "code at step {k}", "Code bei Schritt {k}", "codice al passo {k}", "kod w kroku {k}", "kód v kroku {k}"],
  ["Dobro došli! Wi-Fi i upute za kuću su sljedeće.", "Welcome! Wi-Fi and house tips come next.", "Willkommen! Als Nächstes: WLAN und Hinweise zum Haus.", "Benvenuti! Ora Wi-Fi e istruzioni per la casa.", "Witamy! Teraz Wi-Fi i wskazówki do domu.", "Vítejte! Dál Wi-Fi a pokyny k domu."],
  ["Gotovo", "Done", "Fertig", "Fatto", "Gotowe", "Hotovo"],
  ["Javite se kad god nešto trebate — poruka ide ravno domaćinu.", "Get in touch whenever you need something — your message goes straight to your host.", "Melden Sie sich, wann immer Sie etwas brauchen — die Nachricht geht direkt an den Gastgeber.", "Scrivete quando vi serve qualcosa — il messaggio arriva direttamente all’host.", "Piszcie, gdy czegoś potrzebujecie — wiadomość trafia prosto do gospodarza.", "Ozvěte se, kdykoli něco potřebujete — zpráva jde přímo hostiteli."],
  ["Javljam domaćinu…", "Letting your host know…", "Gastgeber wird benachrichtigt…", "Avviso l’host…", "Powiadamiam gospodarza…", "Dávám vědět hostiteli…"],
  ["Kad pritisnete „Ušli smo”, domaćin dobiva obavijest.", "When you tap “We're in”, your host gets a notification.", "Wenn Sie „Wir sind drin“ tippen, bekommt der Gastgeber eine Benachrichtigung.", "Quando toccate “Siamo entrati”, l’host riceve una notifica.", "Gdy naciśniecie „Jesteśmy w środku”, gospodarz dostanie powiadomienie.", "Když klepnete na „Jsme uvnitř“, hostitel dostane upozornění."],
  ["Kratki popis prije polaska i ocjena boravka.", "A short list before you leave and a rating of your stay.", "Eine kurze Liste vor der Abreise und Bewertung des Aufenthalts.", "Una breve lista prima di partire e il voto del soggiorno.", "Krótka lista przed wyjazdem i ocena pobytu.", "Krátký seznam před odjezdem a hodnocení pobytu."],
  ["Na dan dolaska upute su ovdje, a šifra se pojavi sat prije prijave.", "On arrival day the steps are here, and the code appears an hour before check-in.", "Am Anreisetag finden Sie die Schritte hier; der Code erscheint eine Stunde vor dem Check-in.", "Il giorno dell’arrivo i passaggi sono qui e il codice appare un’ora prima del check-in.", "W dniu przyjazdu kroki są tutaj, a kod pojawi się godzinę przed zameldowaniem.", "V den příjezdu jsou kroky tady a kód se objeví hodinu před check-inem."],
  ["Obavijest je poslana — domaćin zna da ste ušli.", "Notification sent — your host knows you're in.", "Benachrichtigung gesendet — der Gastgeber weiß, dass Sie drin sind.", "Notifica inviata — l’host sa che siete entrati.", "Powiadomienie wysłane — gospodarz wie, że jesteście w środku.", "Upozornění odesláno — hostitel ví, že jste uvnitř."],
  ["Obavijest je poslana — {n} zna da ste ušli.", "Notification sent — {n} knows you're in.", "Benachrichtigung gesendet — {n} weiß, dass Sie drin sind.", "Notifica inviata — {n} sa che siete entrati.", "Powiadomienie wysłane — {n} wie, że jesteście w środku.", "Upozornění odesláno — {n} ví, že jste uvnitř."],
  ["Spremni ste za dolazak", "You're ready for arrival", "Sie sind bereit für die Anreise", "Siete pronti per l’arrivo", "Jesteście gotowi na przyjazd", "Jste připraveni na příjezd"],
  ["Sve za lak dolazak — od ceste do vrata.", "Everything for an easy arrival — from the road to the door.", "Alles für eine leichte Anreise — von der Straße bis zur Tür.", "Tutto per un arrivo facile — dalla strada alla porta.", "Wszystko dla łatwego przyjazdu — od drogi do drzwi.", "Vše pro snadný příjezd — od silnice ke dveřím."],
  ["U primjeru se obavijest ne šalje — vaš domaćin bi je sada dobio.", "In the demo nothing is sent — your host would get a notification now.", "Im Beispiel wird nichts gesendet — Ihr Gastgeber bekäme jetzt eine Benachrichtigung.", "Nell’esempio non si invia nulla — l’host riceverebbe ora una notifica.", "W przykładzie nic nie jest wysyłane — gospodarz dostałby teraz powiadomienie.", "V ukázce se nic neodesílá — hostitel by teď dostal upozornění."],
  ["Vidi ih samo domaćin", "Only your host sees them", "Nur der Gastgeber sieht sie", "Li vede solo l’host", "Widzi je tylko gospodarz", "Vidí je jen hostitel"],
  ["Wi-Fi, uređaji i kućna pravila.", "Wi-Fi, appliances and house rules.", "WLAN, Geräte und Hausregeln.", "Wi-Fi, apparecchi e regole della casa.", "Wi-Fi, urządzenia i zasady domu.", "Wi-Fi, spotřebiče a domácí pravidla."],
  ["najbrže preko WhatsAppa", "fastest on WhatsApp", "am schnellsten per WhatsApp", "più rapido su WhatsApp", "najszybciej przez WhatsApp", "nejrychleji přes WhatsApp"],
  ["Čestitamo, ušli ste!", "Congratulations, you're in!", "Glückwunsch, Sie sind drin!", "Complimenti, siete entrati!", "Gratulacje, jesteście w środku!", "Gratulujeme, jste uvnitř!"],
  ["Raniji dolazak", "Early arrival", "Frühere Anreise", "Arrivo anticipato", "Wcześniejszy przyjazd", "Dřívější příjezd"],
  ["Pozdrav! Možemo li doći nešto ranije?", "Hi! Could we arrive a bit earlier?", "Hallo! Könnten wir etwas früher ankommen?", "Ciao! Potremmo arrivare un po’ prima?", "Dzień dobry! Czy możemy przyjechać trochę wcześniej?", "Dobrý den! Můžeme dorazit o něco dřív?"],
  ["Kasnija odjava", "Late check-out", "Späterer Check-out", "Check-out posticipato", "Późniejsze wymeldowanie", "Pozdější odjezd"],
  ["Pozdrav! Bi li bila moguća kasnija odjava?", "Hi! Would a late check-out be possible?", "Hallo! Wäre ein späterer Check-out möglich?", "Ciao! Sarebbe possibile un check-out posticipato?", "Dzień dobry! Czy byłoby możliwe późniejsze wymeldowanie?", "Dobrý den! Byl by možný pozdější odjezd?"],
  ["Nešto ne radi", "Something isn't working", "Etwas funktioniert nicht", "Qualcosa non funziona", "Coś nie działa", "Něco nefunguje"],
  ["Pozdrav! Imamo mali problem: ", "Hi! We have a small problem: ", "Hallo! Wir haben ein kleines Problem: ", "Ciao! Abbiamo un piccolo problema: ", "Dzień dobry! Mamy mały problem: ", "Dobrý den! Máme malý problém: "],
  ["Još ručnika", "More towels", "Mehr Handtücher", "Altri asciugamani", "Więcej ręczników", "Další ručníky"],
  ["Pozdrav! Možemo li dobiti još ručnika?", "Hi! Could we get some more towels?", "Hallo! Könnten wir noch Handtücher bekommen?", "Ciao! Potremmo avere altri asciugamani?", "Dzień dobry! Czy możemy dostać więcej ręczników?", "Dobrý den! Mohli bychom dostat další ručníky?"],
  ["Hvala!", "Thank you!", "Danke!", "Grazie!", "Dziękujemy!", "Děkujeme!"],
  ["Hvala na svemu, sve je super!", "Thanks for everything, it's all great!", "Danke für alles, alles ist super!", "Grazie di tutto, è tutto perfetto!", "Dziękujemy za wszystko, jest super!", "Děkujeme za vše, všechno je skvělé!"],
  ["Trebate kasniju odjavu?", "Need a later check-out?", "Späterer Check-out nötig?", "Vi serve un check-out più tardi?", "Potrzebujecie późniejszego wymeldowania?", "Potřebujete pozdější odjezd?"],
  ["Često se može dogovoriti — pitajte domaćina.", "It can often be arranged — ask your host.", "Oft lässt sich das einrichten — fragen Sie Ihren Gastgeber.", "Spesso si può fare — chiedete all’host.", "Często da się to ustalić — zapytajcie gospodarza.", "Často se dá domluvit — zeptejte se hostitele."],
  ["Pitaj domaćina", "Ask your host", "Gastgeber fragen", "Chiedi all’host", "Zapytaj gospodarza", "Zeptat se hostitele"],
  ["Napišite poruku", "Write a message", "Nachricht schreiben", "Scrivete un messaggio", "Napiszcie wiadomość", "Napište zprávu"],
  ["Upišite poruku…", "Type your message…", "Nachricht eingeben…", "Scrivete il messaggio…", "Wpiszcie wiadomość…", "Napište zprávu…"],
  ["Izravno", "Direct", "Direkt", "Diretto", "Bezpośrednio", "Přímo"],
  ["Brze poruke", "Quick messages", "Schnelle Nachrichten", "Messaggi rapidi", "Szybkie wiadomości", "Rychlé zprávy"],
  ["Ulaz", "Entry", "Eingang", "Ingresso", "Wejście", "Vstup"],
  ["Pravila", "Rules", "Regeln", "Regole", "Zasady", "Pravidla"],
  ["Okolica", "Nearby", "Umgebung", "Dintorni", "Okolica", "Okolí"],
  ["Dolazak, parking i adresa", "Arrival, parking and address", "Anreise, Parken und Adresse", "Arrivo, parcheggio e indirizzo", "Przyjazd, parking i adres", "Příjezd, parkování a adresa"],
  ["Fotografije od ceste do vrata.", "Photos from the road to the door.", "Fotos von der Straße bis zur Tür.", "Foto dalla strada alla porta.", "Zdjęcia od drogi do drzwi.", "Fotky od silnice ke dveřím."],
  ["lozinka", "password", "Passwort", "password", "hasło", "heslo"],
  ["Za mobitel i laptop", "For your phone and laptop", "Für Handy und Laptop", "Per telefono e laptop", "Na telefon i laptop", "Pro telefon a notebook"],
  ["Ukratko", "At a glance", "Kurz gesagt", "In breve", "W skrócie", "Stručně"],
  ["Već obavljeno", "Already done", "Schon erledigt", "Già fatto", "Już zrobione", "Už hotovo"],
  ["Popis za kvačice pojavi se ovdje dan prije odlaska.", "The checklist appears here the day before you leave.", "Die Checkliste erscheint hier am Tag vor der Abreise.", "La lista appare qui il giorno prima della partenza.", "Lista pojawi się tutaj dzień przed wyjazdem.", "Seznam se tu objeví den před odjezdem."],
  ["Hitno · besplatno, 0–24", "Emergency · free, 24/7", "Notfall · kostenlos, rund um die Uhr", "Emergenza · gratuito, 24 ore su 24", "Pomoc w nagłych wypadkach · bezpłatnie, całą dobę", "Tísňové volání · zdarma, nonstop"],
  ["Vodič pokreće", "Guide powered by", "Gästemappe von", "Guida offerta da", "Przewodnik od", "Průvodce od"],
  ["Plaže, hrana i izleti u blizini", "Beaches, food and trips nearby", "Strände, Essen und Ausflüge in der Nähe", "Spiagge, cibo e gite nei dintorni", "Plaże, jedzenie i wycieczki w pobliżu", "Pláže, jídlo a výlety v okolí"],
  ["Dodirnite za upute", "Tap for instructions", "Für Hinweise antippen", "Tocca per le istruzioni", "Dotknij, aby zobaczyć wskazówki", "Klepněte pro pokyny"],
  ["Skoči na", "Jump to", "Springen zu", "Vai a", "Przejdź do", "Přejít na"],
  ["Prikaži", "Show", "Anzeigen", "Mostra", "Pokaż", "Zobrazit"],
  ["Domaćin mora prijaviti svakog gosta u roku 24 sata. Upišite podatke ovdje — on ih samo prepiše.", "Your host must register every guest within 24 hours. Enter your details here — they just copy them over.", "Der Gastgeber muss jeden Gast innerhalb von 24 Stunden anmelden. Tragen Sie Ihre Daten hier ein — er überträgt sie nur.", "L’host deve registrare ogni ospite entro 24 ore. Inserite qui i dati — li copierà soltanto.", "Gospodarz musi zgłosić każdego gościa w ciągu 24 godzin. Wpiszcie tu dane — on je tylko przepisze.", "Hostitel musí každého hosta přihlásit do 24 hodin. Zadejte údaje sem — jen je přepíše."],
  ['Dolazak moguć za', 'Check-in opens in', 'Check-in möglich in', 'Check-in tra', 'Zameldowanie za', 'Check-in za'],
  ['Prijava je otvorena — dobrodošli!', 'Check-in is open — welcome!', 'Check-in ist geöffnet — willkommen!', 'Il check-in è aperto — benvenuti!', 'Zameldowanie jest otwarte — witamy!', 'Check-in je otevřený — vítejte!'],
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
  ['Kako ući', 'How to get in', 'So kommen Sie hinein', 'Come entrare', 'Jak wejść', 'Jak se dostat dovnitř'],
  ['Korak po korak, s fotografijama — od ulice do vrata.', 'Step by step, with photos — from the street to the door.', 'Schritt für Schritt, mit Fotos — von der Straße bis zur Tür.', 'Passo dopo passo, con foto: dalla strada alla porta.', 'Krok po kroku, ze zdjęciami — od ulicy do drzwi.', 'Krok za krokem, s fotkami — od ulice ke dveřím.'],
  ['Korak {n}', 'Step {n}', 'Schritt {n}', 'Passo {n}', 'Krok {n}', 'Krok {n}'],
  ['Korak {n} od {u}', 'Step {n} of {u}', 'Schritt {n} von {u}', 'Passo {n} di {u}', 'Krok {n} z {u}', 'Krok {n} z {u}'],
  ['Povećaj fotografiju', 'Enlarge photo', 'Foto vergrößern', 'Ingrandisci foto', 'Powiększ zdjęcie', 'Zvětšit fotku'],
  ['Zatvori', 'Close', 'Schließen', 'Chiudi', 'Zamknij', 'Zavřít'],
  ['Upute za dolazak', 'Arrival instructions', 'Hinweise zur Ankunft', "Istruzioni per l'arrivo", 'Wskazówki dotyczące przyjazdu', 'Pokyny k příjezdu'],
  ['Parking', 'Parking', 'Parkplatz', 'Parcheggio', 'Parking', 'Parkování'],
  ['Navigiraj do parkinga', 'Directions to parking', 'Route zum Parkplatz', 'Indicazioni per il parcheggio', 'Nawiguj do parkingu', 'Navigovat k parkování'],
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
  ['Najčešće', 'Most common', 'Häufig', 'Più comuni', 'Najczęstsze', 'Nejčastější'],
  ['Sve države', 'All countries', 'Alle Länder', 'Tutti i paesi', 'Wszystkie kraje', 'Všechny země'],
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
  ['Slobodno već danas', 'Available today', 'Heute frei', 'Libero già oggi', 'Wolne już dziś', 'Volno už dnes'],
  ['Slobodno od {d}', 'Available from {d}', 'Frei ab {d}', 'Libero dal {d}', 'Wolne od {d}', 'Volno od {d}'],
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
  ['Kod povratnog gosta', 'Returning guest code', 'Code für wiederkehrende Gäste', 'Codice ospite abituale', 'Kod powracającego gościa', 'Kód vracejícího se hosta'],
  ['ako ga imate', 'if you have one', 'falls vorhanden', 'se ce l\'hai', 'jeśli masz', 'pokud ho máte'],
  ['Domaćin mi smije slati ponude za buduće boravke', 'The host may send me offers for future stays', 'Der Gastgeber darf mir Angebote für künftige Aufenthalte senden', 'L\'host può inviarmi offerte per soggiorni futuri', 'Gospodarz może wysyłać mi oferty na przyszłe pobyty', 'Hostitel mi smí posílat nabídky na budoucí pobyty'],
  ['Vaš domaćin: {ime}', 'Your host: {ime}', 'Ihr Gastgeber: {ime}', 'Il vostro host: {ime}', 'Twój gospodarz: {ime}', 'Váš hostitel: {ime}'],
  ['prošlo', 'past', 'vergangen', 'passato', 'minione', 'uplynulo'],
  ['Taj termin je prošao — odaberite novi datum dolaska.', 'Those dates have passed — please choose a new arrival date.', 'Dieser Termin ist vorbei — bitte wählen Sie ein neues Anreisedatum.', 'Queste date sono passate — scegliete una nuova data di arrivo.', 'Ten termin już minął — wybierz nową datę przyjazdu.', 'Tento termín už uplynul — vyberte nové datum příjezdu.'],
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
  'pravilo': { hr: ['pravilo', 'pravila', 'pravila'], en: ['rule', 'rules'], de: ['Regel', 'Regeln'], it: ['regola', 'regole'], pl: ['zasada', 'zasady', 'zasad'], cs: ['pravidlo', 'pravidla', 'pravidel'] },
  'korak': { hr: ['korak', 'koraka', 'koraka'], en: ['step', 'steps'], de: ['Schritt', 'Schritte'], it: ['passaggio', 'passaggi'], pl: ['krok', 'kroki', 'kroków'], cs: ['krok', 'kroky', 'kroků'] },
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
// vodič prema slici (22. 10. 2026.): dobrodošlica, okvir s vremenom, pločice, preporuke
dodaj([
  ['Preporuke tijekom boravka', 'Recommendations for your stay', 'Empfehlungen für Ihren Aufenthalt', 'Consigli per il soggiorno', 'Polecane miejsca na pobyt', 'Doporučení na pobyt'],
  ['Dobro došli!', 'Welcome!', 'Willkommen!', 'Benvenuti!', 'Witamy!', 'Vítejte!'],
  ['Dobro došli, {ime}!', 'Welcome, {ime}!', 'Willkommen, {ime}!', 'Benvenuti, {ime}!', 'Witamy, {ime}!', 'Vítejte, {ime}!'],
  ['Veselimo se vašem dolasku i želimo vam ugodan boravak.', 'We look forward to your arrival and wish you a pleasant stay.', 'Wir freuen uns auf Ihre Ankunft und wünschen Ihnen einen angenehmen Aufenthalt.', 'Vi aspettiamo e vi auguriamo un piacevole soggiorno.', 'Cieszymy się na Twój przyjazd i życzymy miłego pobytu.', 'Těšíme se na váš příjezd a přejeme příjemný pobyt.'],
  ['Želimo vam ugodan boravak. Sve što trebate je ovdje.', 'Enjoy your stay. Everything you need is here.', 'Schönen Aufenthalt! Alles, was Sie brauchen, finden Sie hier.', 'Buon soggiorno. Tutto ciò che vi serve è qui.', 'Miłego pobytu. Wszystko, czego potrzebujesz, jest tutaj.', 'Příjemný pobyt. Vše potřebné najdete zde.'],
  ['Nadamo se da ste uživali. Sretan put!', 'We hope you enjoyed it. Safe travels!', 'Wir hoffen, es hat Ihnen gefallen. Gute Reise!', 'Speriamo che vi sia piaciuto. Buon viaggio!', 'Mamy nadzieję, że było miło. Szerokiej drogi!', 'Doufáme, že se vám líbilo. Šťastnou cestu!'],
  ['danas', 'today', 'heute', 'oggi', 'dziś', 'dnes'],
  ['sutra', 'tomorrow', 'morgen', 'domani', 'jutro', 'zítra'],
  ['Dolazak {dan} od {v}', 'Arrival {dan} from {v}', 'Anreise {dan} ab {v}', 'Arrivo {dan} dalle {v}', 'Przyjazd {dan} od {v}', 'Příjezd {dan} od {v}'],
  ['Odjava {dan} do {v}', 'Check-out {dan} by {v}', 'Abreise {dan} bis {v}', 'Check-out {dan} entro le {v}', 'Wymeldowanie {dan} do {v}', 'Odjezd {dan} do {v}'],
  ['Ako stignete ranije, javite nam se.', 'If you arrive earlier, let us know.', 'Wenn Sie früher ankommen, melden Sie sich bei uns.', 'Se arrivate prima, fatecelo sapere.', 'Jeśli przyjedziesz wcześniej, daj nam znać.', 'Pokud přijedete dříve, dejte nám vědět.'],
  ['Popis za odlazak je u Korisnim informacijama.', 'The check-out list is under Useful information.', 'Die Abreise-Checkliste finden Sie unter Nützliche Informationen.', 'La lista per la partenza è in Informazioni utili.', 'Lista na wyjazd jest w Przydatnych informacjach.', 'Seznam k odjezdu najdete v Užitečných informacích.'],
  ['Trebate kasniju odjavu? Pitajte domaćina.', 'Need a later check-out? Ask your host.', 'Späterer Check-out? Fragen Sie den Gastgeber.', 'Serve un check-out più tardi? Chiedete all’host.', 'Potrzebujesz późniejszego wymeldowania? Zapytaj gospodarza.', 'Potřebujete pozdější odjezd? Zeptejte se hostitele.'],
  ['Podaci za ulazak dostupni od {t}', 'Access details available from {t}', 'Zugangsdaten verfügbar ab {t}', 'Dati di accesso disponibili dalle {t}', 'Dane do wejścia dostępne od {t}', 'Údaje pro vstup k dispozici od {t}'],
  ['Iz sigurnosnih razloga šifra vrata i Wi-Fi lozinka vidljivi su od sat vremena prije prijave.', 'For security, the door code and Wi-Fi password appear one hour before check-in.', 'Aus Sicherheitsgründen sind Türcode und WLAN-Passwort ab einer Stunde vor dem Check-in sichtbar.', 'Per sicurezza, il codice della porta e la password Wi-Fi sono visibili da un’ora prima del check-in.', 'Ze względów bezpieczeństwa kod do drzwi i hasło Wi-Fi są widoczne godzinę przed zameldowaniem.', 'Z bezpečnostních důvodů jsou kód dveří a heslo k Wi-Fi vidět hodinu před příjezdem.'],
  ['Brzo do', 'Quick links', 'Schnellzugriff', 'Accesso rapido', 'Szybki dostęp', 'Rychlý přístup'],
  ['Foto', 'Photo', 'Foto', 'Foto', 'Zdjęcie', 'Foto']
])
// redizajn vodiča „Pearl” (21. 10. 2026.): popis „Sve za vaš boravak”, detalji, donja traka
dodaj([
  ['Sve za vaš boravak', 'Everything for your stay', 'Alles für Ihren Aufenthalt', 'Tutto per il tuo soggiorno', 'Wszystko na Twój pobyt', 'Vše pro váš pobyt'],
  ['Povratak', 'Back', 'Zurück', 'Indietro', 'Wstecz', 'Zpět'],
  ['Vodič', 'Guide', 'Reiseführer', 'Guida', 'Przewodnik', 'Průvodce'],
  ['Boravak', 'Stay', 'Aufenthalt', 'Soggiorno', 'Pobyt', 'Pobyt'],
  ['Ulazak', 'Getting in', 'Zugang', 'Ingresso', 'Wejście', 'Vstup'],
  ['Uređaji', 'Appliances', 'Geräte', 'Elettrodomestici', 'Urządzenia', 'Spotřebiče'],
  ['Kućni red', 'House rules', 'Hausordnung', 'Regole della casa', 'Regulamin domu', 'Domácí řád'],
  ['Lokacija i pristup', 'Location and access', 'Lage und Zufahrt', 'Posizione e accesso', 'Lokalizacja i dojazd', 'Poloha a příjezd'],
  ['Upute za korištenje', 'How to use', 'Bedienungshinweise', 'Istruzioni per l’uso', 'Instrukcje obsługi', 'Návod k použití'],
  ['Šifra je dostupna', 'Door code available', 'Türcode verfügbar', 'Codice disponibile', 'Kod jest dostępny', 'Kód je k dispozici'],
  ['Dostupno od {d} u {t}', 'Available from {d} at {t}', 'Verfügbar ab {d} um {t}', 'Disponibile dal {d} alle {t}', 'Dostępne od {d} o {t}', 'K dispozici od {d} v {t}'],
  ['Lozinka je dostupna', 'Password available', 'Passwort verfügbar', 'Password disponibile', 'Hasło jest dostępne', 'Heslo je k dispozici'],
  ['Adresa i karta', 'Address and map', 'Adresse und Karte', 'Indirizzo e mappa', 'Adres i mapa', 'Adresa a mapa'],
  ['Korisne informacije', 'Useful information', 'Nützliche Informationen', 'Informazioni utili', 'Przydatne informacje', 'Užitečné informace'],
  ['Pravila i česta pitanja', 'Rules and FAQ', 'Regeln und häufige Fragen', 'Regole e domande frequenti', 'Zasady i częste pytania', 'Pravidla a časté dotazy'],
  ['Kontakt i hitni brojevi', 'Contact and emergency numbers', 'Kontakt und Notrufnummern', 'Contatti e numeri di emergenza', 'Kontakt i numery alarmowe', 'Kontakt a nouzová čísla'],
  ['Wi-Fi i lozinka', 'Wi-Fi and password', 'WLAN und Passwort', 'Wi-Fi e password', 'Wi-Fi i hasło', 'Wi-Fi a heslo'],
  ['Preporuke u blizini', 'Recommendations nearby', 'Empfehlungen in der Nähe', 'Consigli nei dintorni', 'Polecenia w pobliżu', 'Doporučení v okolí'],
  ['Upute za odlazak', 'Departure instructions', 'Hinweise zur Abreise', 'Istruzioni per la partenza', 'Instrukcje wyjazdu', 'Pokyny k odjezdu'],
  ['Hitno', 'Emergency', 'Notfall', 'Emergenza', 'Nagłe wypadki', 'Nouze'],
  ['Mreža {n}', 'Network {n}', 'Netzwerk {n}', 'Rete {n}', 'Sieć {n}', 'Síť {n}'],
  ['Ostale informacije', 'Other information', 'Weitere Informationen', 'Altre informazioni', 'Inne informacje', 'Další informace'],
  ['Navigacija vodiča', 'Guide navigation', 'Navigation des Reiseführers', 'Navigazione della guida', 'Nawigacja przewodnika', 'Navigace průvodce'],
  ['Pogledano', 'Viewed', 'Angesehen', 'Visto', 'Obejrzane', 'Zobrazeno']
])

// sigurna izravna rezervacija (javna stranica, 21. 10. 2026.)
dodaj([
  ['Sigurna izravna rezervacija', 'Safe direct booking', 'Sicher direkt buchen', 'Prenotazione diretta sicura', 'Bezpieczna rezerwacja bezpośrednia', 'Bezpečná přímá rezervace'],
  ['Odmoria ne prima uplate i nikad ne traži podatke kartice. Dogovor i plaćanje su izravno između vas i domaćina.', 'Odmoria does not take payments and never asks for card details. The agreement and payment are directly between you and the host.', 'Odmoria nimmt keine Zahlungen entgegen und fragt nie nach Kartendaten. Vereinbarung und Zahlung erfolgen direkt zwischen Ihnen und dem Gastgeber.', 'Odmoria non riceve pagamenti e non chiede mai i dati della carta. Accordo e pagamento avvengono direttamente tra te e l’host.', 'Odmoria nie przyjmuje płatności i nigdy nie prosi o dane karty. Umowa i płatność są bezpośrednio między Tobą a gospodarzem.', 'Odmoria nepřijímá platby a nikdy nežádá údaje o kartě. Dohoda i platba probíhají přímo mezi vámi a hostitelem.'],
  ['Upit nije rezervacija. Rezervacija vrijedi kad je domaćin potvrdi.', 'An inquiry is not a booking. The booking is valid once the host confirms it.', 'Eine Anfrage ist keine Buchung. Die Buchung gilt, sobald der Gastgeber sie bestätigt.', 'Una richiesta non è una prenotazione. La prenotazione è valida quando l’host la conferma.', 'Zapytanie nie jest rezerwacją. Rezerwacja obowiązuje po potwierdzeniu przez gospodarza.', 'Poptávka není rezervace. Rezervace platí, jakmile ji hostitel potvrdí.'],
  ['Prije uplate kapare razgovarajte s domaćinom — telefonom ili porukom s ove stranice.', 'Before paying a deposit, talk to the host — by phone or a message from this page.', 'Sprechen Sie vor einer Anzahlung mit dem Gastgeber — telefonisch oder per Nachricht von dieser Seite.', 'Prima di pagare la caparra, parla con l’host — al telefono o con un messaggio da questa pagina.', 'Przed wpłatą zaliczki porozmawiaj z gospodarzem — telefonicznie lub wiadomością z tej strony.', 'Před zaplacením zálohy si promluvte s hostitelem — telefonicky nebo zprávou z této stránky.'],
  ['Pri uplati vaša banka pokazuje ime primatelja. Ako se ne podudara s imenom domaćina, ne uplaćujte.', 'When you pay, your bank shows the recipient’s name. If it does not match the host’s name, do not pay.', 'Bei der Überweisung zeigt Ihre Bank den Namen des Empfängers. Stimmt er nicht mit dem Namen des Gastgebers überein, zahlen Sie nicht.', 'Al momento del pagamento la tua banca mostra il nome del beneficiario. Se non corrisponde al nome dell’host, non pagare.', 'Przy przelewie bank pokazuje nazwę odbiorcy. Jeśli nie zgadza się z nazwiskiem gospodarza, nie płać.', 'Při platbě vám banka ukáže jméno příjemce. Pokud neodpovídá jménu hostitele, neplaťte.'],
  ['Nešto nije u redu sa stranicom?', 'Something wrong with this page?', 'Stimmt etwas mit dieser Seite nicht?', 'Qualcosa non va con questa pagina?', 'Coś jest nie tak z tą stroną?', 'Něco není v pořádku s touto stránkou?'],
  ['Prijavi stranicu', 'Report this page', 'Seite melden', 'Segnala la pagina', 'Zgłoś stronę', 'Nahlásit stránku'],
  ['Prijava stranice', 'Page report', 'Seitenmeldung', 'Segnalazione pagina', 'Zgłoszenie strony', 'Nahlášení stránky'],
  ['Opišite što nije u redu:', 'Describe what is wrong:', 'Beschreiben Sie, was nicht stimmt:', 'Descrivi cosa non va:', 'Opisz, co jest nie tak:', 'Popište, co není v pořádku:'],
  ['Odmoria ne prima uplate.', 'Odmoria does not take payments.', 'Odmoria nimmt keine Zahlungen entgegen.', 'Odmoria non riceve pagamenti.', 'Odmoria nie przyjmuje płatności.', 'Odmoria nepřijímá platby.'],
  ['Kako sigurno rezervirati', 'How to book safely', 'So buchen Sie sicher', 'Come prenotare in sicurezza', 'Jak bezpiecznie rezerwować', 'Jak bezpečně rezervovat']
])

// vodič „časopis” (23. 10. 2026.): oznaka faze, vrijeme, QR za Wi-Fi
dodaj([
  ['Dolazak za {n}', 'Arriving in {n}', 'Anreise in {n}', 'Arrivo tra {n}', 'Przyjazd za {n}', 'Příjezd za {n}'],
  ['Dolazak sutra', 'Arriving tomorrow', 'Anreise morgen', 'Arrivo domani', 'Przyjazd jutro', 'Příjezd zítra'],
  ['Danas stižete', 'You arrive today', 'Sie reisen heute an', 'Arrivate oggi', 'Przyjeżdżacie dziś', 'Dnes přijíždíte'],
  ['Dan {a} od {b}', 'Day {a} of {b}', 'Tag {a} von {b}', 'Giorno {a} di {b}', 'Dzień {a} z {b}', 'Den {a} z {b}'],
  ['Danas odlazite', 'You leave today', 'Sie reisen heute ab', 'Partite oggi', 'Wyjeżdżacie dziś', 'Dnes odjíždíte'],
  ['Popis za odlazak je niže na stranici.', 'The departure checklist is further down the page.', 'Die Checkliste für die Abreise finden Sie weiter unten.', 'La lista per la partenza è più in basso nella pagina.', 'Lista przed wyjazdem jest niżej na stronie.', 'Seznam před odjezdem je níže na stránce.'],
  ['QR kod za Wi-Fi', 'Wi-Fi QR code', 'WLAN-QR-Code', 'Codice QR del Wi-Fi', 'Kod QR do Wi-Fi', 'QR kód pro Wi-Fi'],
  ['Spojite se skeniranjem', 'Connect by scanning', 'Per Scan verbinden', 'Connettiti con la scansione', 'Połącz przez skanowanie', 'Připojte se naskenováním'],
  ['Za drugi mobitel ili tablet: usmjerite kameru na kod i mreža se spoji sama.', 'For another phone or tablet: point the camera at the code and it connects by itself.', 'Für ein weiteres Handy oder Tablet: Kamera auf den Code richten, die Verbindung erfolgt automatisch.', 'Per un altro telefono o tablet: inquadra il codice con la fotocamera e si connette da solo.', 'Dla drugiego telefonu lub tabletu: skieruj aparat na kod, a sieć połączy się sama.', 'Pro další telefon nebo tablet: namiřte fotoaparát na kód a síť se připojí sama.'],
  ['Vrijeme · {mj}', 'Weather · {mj}', 'Wetter · {mj}', 'Meteo · {mj}', 'Pogoda · {mj}', 'Počasí · {mj}'],
  ['Vrijeme', 'Weather', 'Wetter', 'Meteo', 'Pogoda', 'Počasí'],
  ['More {t}°', 'Sea {t}°', 'Meer {t}°', 'Mare {t}°', 'Morze {t}°', 'Moře {t}°'],
  ['Prognoza', 'Forecast', 'Vorhersage', 'Previsioni', 'Prognoza', 'Předpověď'],
  ['Sunčano', 'Sunny', 'Sonnig', 'Soleggiato', 'Słonecznie', 'Slunečno'],
  ['Djelomično oblačno', 'Partly cloudy', 'Teilweise bewölkt', 'Parzialmente nuvoloso', 'Częściowe zachmurzenie', 'Polojasno'],
  ['Oblačno', 'Cloudy', 'Bewölkt', 'Nuvoloso', 'Pochmurno', 'Zataženo'],
  ['Magla', 'Fog', 'Nebel', 'Nebbia', 'Mgła', 'Mlha'],
  ['Rosulja', 'Drizzle', 'Nieselregen', 'Pioviggine', 'Mżawka', 'Mrholení'],
  ['Kiša', 'Rain', 'Regen', 'Pioggia', 'Deszcz', 'Déšť'],
  ['Snijeg', 'Snow', 'Schnee', 'Neve', 'Śnieg', 'Sníh'],
  ['Grmljavina', 'Thunderstorm', 'Gewitter', 'Temporale', 'Burza', 'Bouřka'],
  ['Uređaji i kako ih koristiti', 'Appliances and how to use them', 'Geräte und ihre Bedienung', 'Elettrodomestici e come usarli', 'Urządzenia i jak z nich korzystać', 'Spotřebiče a jak je používat']
])

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
