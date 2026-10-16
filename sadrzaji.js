// ============================================================================
//  Odmoria — KATALOG SADRŽAJA OBJEKTA (16. 10. 2026.)
//  Jedan izvor za dashboard (Objekt → Sadržaji) i javnu stranicu (p.html):
//  naziv (hrvatski, sprema se u amenities.name), skupina, Lucide ikona i
//  prijevodi [en, de, it, pl, cs]. Stari nazivi (prije 16. 10.) su ostali
//  isti, pa zatečeni redovi u bazi i dalje odgovaraju katalogu.
//  Novi sadržaj = red ovdje (+ ikona u spriteu dashboarda i p.html — vidi
//  CLAUDE.md, „Sadržaji objekta”).
// ============================================================================

export const SKUPINE = [
  ['osnovno', 'Osnovno'], ['kuhinja', 'Kuhinja'], ['kupaonica', 'Kupaonica i rublje'],
  ['vani', 'Vani'], ['parking', 'Parking i prijevoz'], ['zabava', 'Zabava i opuštanje'],
  ['djeca', 'Djeca i ljubimci'], ['sigurnost', 'Sigurnost'], ['pravila', 'Pristupačnost i pravila']
]

// [naziv, skupina, ikona, en, de, it, pl, cs]
const R = [
  ['Wi-Fi', 'osnovno', 'wifi', 'Wi-Fi', 'WLAN', 'Wi-Fi', 'Wi-Fi', 'Wi-Fi'],
  ['Klima uređaj', 'osnovno', 'snowflake', 'Air conditioning', 'Klimaanlage', 'Aria condizionata', 'Klimatyzacja', 'Klimatizace'],
  ['Grijanje', 'osnovno', 'heater', 'Heating', 'Heizung', 'Riscaldamento', 'Ogrzewanie', 'Topení'],
  ['Ventilator', 'osnovno', 'fan', 'Fan', 'Ventilator', 'Ventilatore', 'Wentylator', 'Ventilátor'],
  ['TV', 'osnovno', 'tv', 'TV', 'Fernseher', 'TV', 'Telewizor', 'Televize'],
  ['Smart TV / streaming', 'osnovno', 'monitor-play', 'Smart TV / streaming', 'Smart-TV / Streaming', 'Smart TV / streaming', 'Smart TV / streaming', 'Smart TV / streamování'],
  ['Radni stol', 'osnovno', 'lamp-desk', 'Desk', 'Schreibtisch', 'Scrivania', 'Biurko', 'Pracovní stůl'],
  ['Posteljina', 'osnovno', 'bed', 'Bed linen', 'Bettwäsche', 'Biancheria da letto', 'Pościel', 'Ložní prádlo'],
  ['Sef', 'osnovno', 'vault', 'Safe', 'Safe', 'Cassaforte', 'Sejf', 'Trezor'],
  ['Glačalo', 'osnovno', 'shirt', 'Iron', 'Bügeleisen', 'Ferro da stiro', 'Żelazko', 'Žehlička'],
  ['Kauč na razvlačenje', 'osnovno', 'sofa', 'Sofa bed', 'Schlafsofa', 'Divano letto', 'Rozkładana sofa', 'Rozkládací pohovka'],

  ['Potpuno opremljena kuhinja', 'kuhinja', 'chef-hat', 'Fully equipped kitchen', 'Voll ausgestattete Küche', 'Cucina completamente attrezzata', 'W pełni wyposażona kuchnia', 'Plně vybavená kuchyně'],
  ['Hladnjak', 'kuhinja', 'refrigerator', 'Fridge', 'Kühlschrank', 'Frigorifero', 'Lodówka', 'Lednice'],
  ['Štednjak', 'kuhinja', 'cooking-pot', 'Stove', 'Herd', 'Fornelli', 'Kuchenka', 'Sporák'],
  ['Pećnica', 'kuhinja', 'flame', 'Oven', 'Backofen', 'Forno', 'Piekarnik', 'Trouba'],
  ['Mikrovalna', 'kuhinja', 'microwave', 'Microwave', 'Mikrowelle', 'Microonde', 'Mikrofalówka', 'Mikrovlnná trouba'],
  ['Perilica posuđa', 'kuhinja', 'utensils-crossed', 'Dishwasher', 'Geschirrspüler', 'Lavastoviglie', 'Zmywarka', 'Myčka nádobí'],
  ['Aparat za kavu', 'kuhinja', 'coffee', 'Coffee machine', 'Kaffeemaschine', 'Macchina del caffè', 'Ekspres do kawy', 'Kávovar'],
  ['Kuhalo za vodu', 'kuhinja', 'cup-soda', 'Kettle', 'Wasserkocher', 'Bollitore', 'Czajnik', 'Rychlovarná konvice'],
  ['Toster', 'kuhinja', 'sandwich', 'Toaster', 'Toaster', 'Tostapane', 'Toster', 'Topinkovač'],
  ['Posuđe i pribor za jelo', 'kuhinja', 'utensils', 'Dishes and cutlery', 'Geschirr und Besteck', 'Stoviglie e posate', 'Naczynia i sztućce', 'Nádobí a příbory'],
  ['Osnovne namirnice (ulje, sol, začini)', 'kuhinja', 'salad', 'Cooking basics (oil, salt, spices)', 'Grundausstattung (Öl, Salz, Gewürze)', 'Base per cucinare (olio, sale, spezie)', 'Podstawowe produkty (olej, sól, przyprawy)', 'Základní potraviny (olej, sůl, koření)'],

  ['Tuš', 'kupaonica', 'shower-head', 'Shower', 'Dusche', 'Doccia', 'Prysznic', 'Sprcha'],
  ['Kada', 'kupaonica', 'bath', 'Bathtub', 'Badewanne', 'Vasca da bagno', 'Wanna', 'Vana'],
  ['Ručnici', 'kupaonica', 'towel-rack', 'Towels', 'Handtücher', 'Asciugamani', 'Ręczniki', 'Ručníky'],
  ['Šampon i gel za tuširanje', 'kupaonica', 'droplets', 'Shampoo and shower gel', 'Shampoo und Duschgel', 'Shampoo e bagnoschiuma', 'Szampon i żel pod prysznic', 'Šampon a sprchový gel'],
  ['Fen za kosu', 'kupaonica', 'wind', 'Hair dryer', 'Föhn', 'Asciugacapelli', 'Suszarka do włosów', 'Fén'],
  ['Perilica rublja', 'kupaonica', 'washing-machine', 'Washing machine', 'Waschmaschine', 'Lavatrice', 'Pralka', 'Pračka'],
  ['Sušilica rublja', 'kupaonica', 'wind', 'Tumble dryer', 'Wäschetrockner', 'Asciugatrice', 'Suszarka do ubrań', 'Sušička'],
  ['Sušilo za rublje', 'kupaonica', 'shirt', 'Drying rack', 'Wäscheständer', 'Stendibiancheria', 'Suszarka na pranie', 'Sušák na prádlo'],

  ['Bazen', 'vani', 'waves', 'Swimming pool', 'Pool', 'Piscina', 'Basen', 'Bazén'],
  ['Grijani bazen', 'vani', 'thermometer-sun', 'Heated pool', 'Beheizter Pool', 'Piscina riscaldata', 'Podgrzewany basen', 'Vyhřívaný bazén'],
  ['Jacuzzi', 'vani', 'bath', 'Hot tub', 'Whirlpool', 'Idromassaggio', 'Jacuzzi', 'Vířivka'],
  ['Balkon / Terasa', 'vani', 'sun', 'Balcony / terrace', 'Balkon / Terrasse', 'Balcone / terrazza', 'Balkon / taras', 'Balkon / terasa'],
  ['Vrt', 'vani', 'sprout', 'Garden', 'Garten', 'Giardino', 'Ogród', 'Zahrada'],
  ['Roštilj', 'vani', 'flame', 'Barbecue', 'Grill', 'Barbecue', 'Grill', 'Gril'],
  ['Vanjski tuš', 'vani', 'shower-head', 'Outdoor shower', 'Außendusche', 'Doccia esterna', 'Prysznic na zewnątrz', 'Venkovní sprcha'],
  ['Ležaljke', 'vani', 'armchair', 'Sun loungers', 'Sonnenliegen', 'Lettini', 'Leżaki', 'Lehátka'],
  ['Suncobran', 'vani', 'umbrella', 'Sun umbrella', 'Sonnenschirm', 'Ombrellone', 'Parasol', 'Slunečník'],
  ['Vanjska blagovaonica', 'vani', 'utensils', 'Outdoor dining area', 'Essbereich im Freien', 'Zona pranzo all’aperto', 'Jadalnia na zewnątrz', 'Venkovní jídelna'],
  ['Pogled na more', 'vani', 'sunset', 'Sea view', 'Meerblick', 'Vista mare', 'Widok na morze', 'Výhled na moře'],
  ['Pogled na planine', 'vani', 'mountain', 'Mountain view', 'Bergblick', 'Vista montagna', 'Widok na góry', 'Výhled na hory'],
  ['Ograđeno dvorište', 'vani', 'fence', 'Fenced yard', 'Eingezäunter Hof', 'Cortile recintato', 'Ogrodzone podwórko', 'Oplocený dvůr'],

  ['Parking', 'parking', 'car', 'Parking', 'Parkplatz', 'Parcheggio', 'Parking', 'Parkování'],
  ['Besplatni parking na ulici', 'parking', 'square-parking', 'Free street parking', 'Kostenloses Parken an der Straße', 'Parcheggio gratuito in strada', 'Bezpłatny parking na ulicy', 'Bezplatné parkování na ulici'],
  ['Garaža', 'parking', 'warehouse', 'Garage', 'Garage', 'Garage', 'Garaż', 'Garáž'],
  ['Punjač za električni auto', 'parking', 'plug-zap', 'EV charger', 'Ladestation für E-Autos', 'Colonnina di ricarica', 'Ładowarka do auta elektrycznego', 'Nabíječka pro elektromobil'],
  ['Bicikli', 'parking', 'bike', 'Bicycles', 'Fahrräder', 'Biciclette', 'Rowery', 'Kola'],
  ['Vez za brod', 'parking', 'anchor', 'Boat mooring', 'Bootsliegeplatz', 'Ormeggio per barca', 'Miejsce do cumowania', 'Kotviště pro loď'],
  ['Prijevoz s aerodroma (na upit)', 'parking', 'plane', 'Airport transfer (on request)', 'Flughafentransfer (auf Anfrage)', 'Transfer aeroporto (su richiesta)', 'Transfer z lotniska (na życzenie)', 'Transfer z letiště (na vyžádání)'],

  ['Sauna', 'zabava', 'thermometer-sun', 'Sauna', 'Sauna', 'Sauna', 'Sauna', 'Sauna'],
  ['Teretana', 'zabava', 'dumbbell', 'Gym', 'Fitnessraum', 'Palestra', 'Siłownia', 'Posilovna'],
  ['Kamin', 'zabava', 'flame-kindling', 'Fireplace', 'Kamin', 'Camino', 'Kominek', 'Krb'],
  ['Društvene igre', 'zabava', 'dice-5', 'Board games', 'Gesellschaftsspiele', 'Giochi da tavolo', 'Gry planszowe', 'Společenské hry'],
  ['Knjige', 'zabava', 'book-open', 'Books', 'Bücher', 'Libri', 'Książki', 'Knihy'],
  ['Igraća konzola', 'zabava', 'gamepad-2', 'Game console', 'Spielkonsole', 'Console di gioco', 'Konsola do gier', 'Herní konzole'],
  ['Bluetooth zvučnik', 'zabava', 'speaker', 'Bluetooth speaker', 'Bluetooth-Lautsprecher', 'Altoparlante Bluetooth', 'Głośnik Bluetooth', 'Bluetooth reproduktor'],

  ['Oprema za bebe', 'djeca', 'baby', 'Baby equipment', 'Babyausstattung', 'Attrezzatura per neonati', 'Wyposażenie dla niemowląt', 'Vybavení pro miminka'],
  ['Dječji krevetić', 'djeca', 'bed', 'Baby cot', 'Babybett', 'Culla', 'Łóżeczko dziecięce', 'Dětská postýlka'],
  ['Dječja hranilica', 'djeca', 'utensils', 'High chair', 'Hochstuhl', 'Seggiolone', 'Krzesełko do karmienia', 'Dětská židlička'],
  ['Igračke', 'djeca', 'puzzle', 'Toys', 'Spielzeug', 'Giocattoli', 'Zabawki', 'Hračky'],
  ['Ljubimci dozvoljeni', 'djeca', 'dog', 'Pets allowed', 'Haustiere erlaubt', 'Animali ammessi', 'Zwierzęta dozwolone', 'Domácí mazlíčci povoleni'],

  ['Detektor dima', 'sigurnost', 'alarm-smoke', 'Smoke detector', 'Rauchmelder', 'Rilevatore di fumo', 'Czujnik dymu', 'Detektor kouře'],
  ['Aparat za gašenje požara', 'sigurnost', 'fire-extinguisher', 'Fire extinguisher', 'Feuerlöscher', 'Estintore', 'Gaśnica', 'Hasicí přístroj'],
  ['Prva pomoć', 'sigurnost', 'briefcase-medical', 'First aid kit', 'Erste-Hilfe-Set', 'Kit di pronto soccorso', 'Apteczka', 'Lékárnička'],
  ['Sigurnosne kamere (vanjske)', 'sigurnost', 'cctv', 'Security cameras (outdoor)', 'Überwachungskameras (außen)', 'Telecamere di sicurezza (esterne)', 'Kamery monitoringu (zewnętrzne)', 'Bezpečnostní kamery (venkovní)'],
  ['Samostalna prijava (kutija za ključ)', 'sigurnost', 'key-round', 'Self check-in (key box)', 'Self-Check-in (Schlüsselbox)', 'Self check-in (cassetta chiavi)', 'Samodzielne zameldowanie (skrytka na klucze)', 'Samoobslužný check-in (schránka na klíče)'],
  ['Pametna brava', 'sigurnost', 'lock-keyhole', 'Smart lock', 'Smart Lock', 'Serratura smart', 'Inteligentny zamek', 'Chytrý zámek'],

  ['Pristup za invalide', 'pravila', 'accessibility', 'Wheelchair accessible', 'Rollstuhlgerecht', 'Accessibile in sedia a rotelle', 'Dostęp dla wózków inwalidzkich', 'Bezbariérový přístup'],
  ['Dizalo', 'pravila', 'arrow-up-down', 'Elevator', 'Aufzug', 'Ascensore', 'Winda', 'Výtah'],
  ['Prikladno za rad na daljinu', 'pravila', 'laptop', 'Suitable for remote work', 'Geeignet für Homeoffice', 'Adatto al lavoro da remoto', 'Odpowiednie do pracy zdalnej', 'Vhodné pro práci na dálku'],
  ['Prikladno za obitelji', 'pravila', 'users', 'Family friendly', 'Familienfreundlich', 'Adatto alle famiglie', 'Przyjazne rodzinom', 'Vhodné pro rodiny'],
  ['Dugi boravci (28+ noći)', 'pravila', 'calendar-range', 'Long stays (28+ nights)', 'Langzeitaufenthalte (28+ Nächte)', 'Soggiorni lunghi (28+ notti)', 'Długie pobyty (28+ nocy)', 'Dlouhodobé pobyty (28+ nocí)'],
  ['Zabranjeno pušenje', 'pravila', 'cigarette-off', 'No smoking', 'Rauchen verboten', 'Vietato fumare', 'Zakaz palenia', 'Zákaz kouření'],
  ['Pušenje dopušteno vani', 'pravila', 'cigarette', 'Smoking allowed outside', 'Rauchen im Freien erlaubt', 'Si può fumare all’aperto', 'Palenie dozwolone na zewnątrz', 'Kouření venku povoleno']
]

export const SADRZAJI = R.map(([naziv, skupina, ikona, ...prijevodi]) => ({ naziv, skupina, ikona, prijevodi }))
export const IKONE = [...new Set(SADRZAJI.map(s => s.ikona))]
const PO_NAZIVU = new Map(SADRZAJI.map(s => [s.naziv.toLowerCase(), s]))
/** Ikona za naziv iz kataloga (javna stranica) ili null — tada p.html pogađa po riječima. */
export const ikonaZa = naziv => PO_NAZIVU.get(String(naziv || '').trim().toLowerCase())?.ikona || null
/** Redovi za rječnik jezici.js: [hr, en, de, it, pl, cs] */
export const RJECNIK = SADRZAJI.map(s => [s.naziv, ...s.prijevodi])
