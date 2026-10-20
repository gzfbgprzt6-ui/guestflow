// ============================================================
// eVisitor — prijava gostiju iz dashboarda (odluke, točka 40)
//
// Datoteka počinje s „_” pa je Vercel ne objavljuje kao rutu; zove je
// api/sync-ical.js (?evisitor=1), jer je na Hobby planu 12/12 funkcija.
//
// ISKLJUČENO dok se ne provjeri na pravom računu: varijabla okruženja
//   EVISITOR = off (zadano) | test | live
// test → https://www.evisitor.hr/testApi, live → .../eVisitorRhetos_API
// (EVISITOR_URL zamijeni adresu — samo za lažni eVisitor u testovima).
//
// Domaćinova lozinka za eVisitor NIGDJE se ne sprema: dashboard je pošalje
// uz svaki zahtjev, ruta se prijavi, napravi posao i odjavi se. Korisničko
// ime i postavke objekta drži dashboard u user_metadata.evisitor.
//
// Podatke gostiju ruta čita SAMA, korisnikovim tokenom (RLS: vlasnik,
// upravitelj, recepcija) — preglednik ne šalje osobne podatke ovamo.
//
// Što je iz javne dokumentacije (eVisitor Wiki, „Web API”), a što je
// pretpostavka koju treba potvrditi na prvom pravom računu, označeno je
// uz svaku konstantu: PROVJERITI.
// ============================================================

const crypto = require('crypto');

const BAZA = { test: 'https://www.evisitor.hr/testApi', live: 'https://www.evisitor.hr/eVisitorRhetos_API' };
const nacin = () => ({ test: 'test', live: 'live' })[String(process.env.EVISITOR || '').toLowerCase()] || 'off';
const baza = () => process.env.EVISITOR_URL || BAZA[nacin()] || '';
const ROK_MS = 15000;

// ---------- države (kopija drzave.js — mijenjati zajedno) ----------
const ISO = 'ADAND,AEARE,AFAFG,AGATG,AIAIA,ALALB,AMARM,AOAGO,AQATA,ARARG,ASASM,ATAUT,AUAUS,AWABW,AXALA,AZAZE,BABIH,BBBRB,BDBGD,BEBEL,BFBFA,BGBGR,BHBHR,BIBDI,BJBEN,BLBLM,BMBMU,BNBRN,BOBOL,BQBES,BRBRA,BSBHS,BTBTN,BVBVT,BWBWA,BYBLR,BZBLZ,CACAN,CCCCK,CDCOD,CFCAF,CGCOG,CHCHE,CICIV,CKCOK,CLCHL,CMCMR,CNCHN,COCOL,CRCRI,CUCUB,CVCPV,CWCUW,CXCXR,CYCYP,CZCZE,DEDEU,DJDJI,DKDNK,DMDMA,DODOM,DZDZA,ECECU,EEEST,EGEGY,EHESH,ERERI,ESESP,ETETH,FIFIN,FJFJI,FKFLK,FMFSM,FOFRO,FRFRA,GAGAB,GBGBR,GDGRD,GEGEO,GFGUF,GGGGY,GHGHA,GIGIB,GLGRL,GMGMB,GNGIN,GPGLP,GQGNQ,GRGRC,GSSGS,GTGTM,GUGUM,GWGNB,GYGUY,HKHKG,HMHMD,HNHND,HRHRV,HTHTI,HUHUN,IDIDN,IEIRL,ILISR,IMIMN,ININD,IOIOT,IQIRQ,IRIRN,ISISL,ITITA,JEJEY,JMJAM,JOJOR,JPJPN,KEKEN,KGKGZ,KHKHM,KIKIR,KMCOM,KNKNA,KPPRK,KRKOR,KWKWT,KYCYM,KZKAZ,LALAO,LBLBN,LCLCA,LILIE,LKLKA,LRLBR,LSLSO,LTLTU,LULUX,LVLVA,LYLBY,MAMAR,MCMCO,MDMDA,MEMNE,MFMAF,MGMDG,MHMHL,MKMKD,MLMLI,MMMMR,MNMNG,MOMAC,MPMNP,MQMTQ,MRMRT,MSMSR,MTMLT,MUMUS,MVMDV,MWMWI,MXMEX,MYMYS,MZMOZ,NANAM,NCNCL,NENER,NFNFK,NGNGA,NINIC,NLNLD,NONOR,NPNPL,NRNRU,NUNIU,NZNZL,OMOMN,PAPAN,PEPER,PFPYF,PGPNG,PHPHL,PKPAK,PLPOL,PMSPM,PNPCN,PRPRI,PSPSE,PTPRT,PWPLW,PYPRY,QAQAT,REREU,ROROU,RSSRB,RURUS,RWRWA,SASAU,SBSLB,SCSYC,SDSDN,SESWE,SGSGP,SHSHN,SISVN,SJSJM,SKSVK,SLSLE,SMSMR,SNSEN,SOSOM,SRSUR,SSSSD,STSTP,SVSLV,SXSXM,SYSYR,SZSWZ,TCTCA,TDTCD,TFATF,TGTGO,THTHA,TJTJK,TKTKL,TLTLS,TMTKM,TNTUN,TOTON,TRTUR,TTTTO,TVTUV,TWTWN,TZTZA,UAUKR,UGUGA,UMUMI,USUSA,UYURY,UZUZB,VAVAT,VCVCT,VEVEN,VGVGB,VIVIR,VNVNM,VUVUT,WFWLF,WSWSM,YEYEM,YTMYT,ZAZAF,ZMZMB,ZWZWE,XKXKX';
const KODOVI = ISO.split(',').map(x => x.slice(0, 2));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
let ALIAS = null;
function imeDrzave(kod, jezik) { try { return new Intl.DisplayNames([jezik || 'hr'], { type: 'region' }).of(kod) || kod; } catch (e) { return kod; } }
function uKod(tekst) {
  const s = String(tekst || '').trim();
  if (/^[A-Za-z]{2}$/.test(s) && KODOVI.includes(s.toUpperCase())) return s.toUpperCase();
  if (/^[A-Za-z]{3}$/.test(s)) { const x = ISO.split(',').find(e => e.slice(2) === s.toUpperCase()); if (x) return x.slice(0, 2); }
  if (!ALIAS) {
    ALIAS = {};
    for (const j of ['hr', 'en', 'de', 'it', 'pl', 'cs', 'sl', 'sk', 'hu', 'fr', 'nl', 'es', 'sr-Latn', 'bs'])
      for (const k of KODOVI) { const n = norm(imeDrzave(k, j)); if (n && !ALIAS[n]) ALIAS[n] = k; }
    Object.assign(ALIAS, { bih: 'BA', uk: 'GB', engleska: 'GB', england: 'GB', usa: 'US', sad: 'US', amerika: 'US', deutschland: 'DE', osterreich: 'AT', ceska: 'CZ', czechia: 'CZ', ceskarepublika: 'CZ', republikahrvatska: 'HR', holland: 'NL', nizozemska: 'NL' });
  }
  return ALIAS[norm(s)] || '';
}
const alfa3 = k => { const x = ISO.split(',').find(e => e.slice(0, 2) === k); return x ? x.slice(2) : ''; };

// ---------- šifrarnici ----------
// Imena resursa: PROVJERITI (Wiki spominje *Lookup resurse, npr.
// ArrivalOrganisationLookup s atributom CodeMI i DocumentTypeLookup s CODE).
// Za svaki se probaju redom; prvi koji odgovori vrijedi.
const SIFRARNICI = {
  objekti:     ['Facility', 'FacilityLookup'],
  drzave:      ['CountryLookup', 'Country'],
  isprave:     ['DocumentTypeLookup', 'DocumentTtypeLookup'],
  pristojba:   ['TTPaymentCategoryLookup', 'TTPaymentCategory'],
  dolazak:     ['ArrivalOrganisationLookup'],
  usluga:      ['OfferedServiceTypeLookup', 'OfferedServiceType']
};
const prvo = (r, polja) => { for (const p of polja) if (r[p] != null && r[p] !== '') return String(r[p]); return ''; };
// zapis šifrarnika → { kod, naziv } (imena atributa nisu svugdje ista)
function zapis(r, vrsta) {
  const kod = vrsta === 'dolazak' ? prvo(r, ['CodeMI', 'Code', 'CODE', 'ID'])
    : vrsta === 'objekti' ? prvo(r, ['Code', 'CODE', 'FacilityCode', 'ID'])
    : prvo(r, ['Code', 'CODE', 'CodeISO', 'ISO', 'ID']);
  return { kod, naziv: prvo(r, ['Name', 'NameNational', 'Naziv', 'Description', 'FacilityName', 'Code', 'CODE']) || kod, izvorno: r };
}

// ---------- HTTP prema eVisitoru ----------
function sRokom(url, opts) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ROK_MS);
  return fetch(url, Object.assign({ signal: ctl.signal }, opts)).finally(() => clearTimeout(t));
}
function kolacici(r) {
  const svi = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [r.headers.get('set-cookie') || ''];
  return svi.filter(Boolean).map(c => c.split(';')[0]).join('; ');
}
// Rhetos greška: { UserMessage, SystemMessage } (HTTP 400) — UserMessage je za domaćina
async function greska(r) {
  const tx = await r.text().catch(() => '');
  try { const j = JSON.parse(tx); return j.UserMessage || j.SystemMessage || ('HTTP ' + r.status); } catch (e) { return tx.slice(0, 200) || ('HTTP ' + r.status); }
}
async function prijava(korisnik, lozinka) {
  const r = await sRokom(baza() + '/Resources/AspNetFormsAuth/Authentication/Login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ UserName: korisnik, Password: lozinka, PersistCookie: false })
  });
  if (!r.ok) throw Object.assign(new Error(await greska(r)), { kod: 'prijava' });
  const ok = await r.json().catch(() => false);
  if (ok !== true) throw Object.assign(new Error('Korisničko ime ili lozinka za eVisitor nisu točni.'), { kod: 'lozinka' });
  return kolacici(r);
}
async function odjava(kol) {
  try { await sRokom(baza() + '/Resources/AspNetFormsAuth/Authentication/Logout', { method: 'POST', headers: { Cookie: kol, 'Content-Type': 'application/json' }, body: '{}' }); } catch (e) {}
}
async function citaj(kol, vrsta) {
  for (const ime of SIFRARNICI[vrsta]) {
    try {
      const r = await sRokom(baza() + '/Rest/Htz/' + ime + '/', { headers: { Cookie: kol, Accept: 'application/json' } });
      if (!r.ok) continue;
      const j = await r.json();
      const redovi = Array.isArray(j) ? j : (j.Records || []);
      return { ime, redovi: redovi.slice(0, 2000).map(x => zapis(x, vrsta)) };
    } catch (e) {}
  }
  return { ime: null, redovi: [] };
}
async function akcija(kol, ime, tijelo) {
  const r = await sRokom(baza() + '/Rest/Htz/' + ime + '/', {
    method: 'POST', headers: { Cookie: kol, 'Content-Type': 'application/json' }, body: JSON.stringify(tijelo)
  });
  if (!r.ok) return { ok: false, poruka: await greska(r) };
  return { ok: true };
}

// ---------- gost → CheckInTourist ----------
// Isti gost uvijek dobije isti ID (iz rezervacije i rednog broja): ponovno
// slanje eVisitor tada tretira kao ispravak, ne kao novog gosta (Wiki:
// „promjena prijave … poziv CheckInTourist s ID-jem dodijeljenim pri prijavi”).
function idGosta(bookingId, i) {
  const h = crypto.createHash('sha1').update('odmoria-evisitor:' + bookingId + ':' + i).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), '5' + h.slice(13, 16), ((parseInt(h[16], 16) & 3) | 8).toString(16) + h.slice(17, 20), h.slice(20, 32)].join('-');
}
const ymd = d => String(d || '').slice(0, 10).replace(/-/g, '');
const hhmm = t => /^\d{1,2}:\d{2}/.test(String(t || '')) ? String(t).slice(0, 5).padStart(5, '0') : '';
// šifra iz šifrarnika: po kodu (ISO2 / ISO3) ili po nazivu (hrvatski naziv države)
function nadjiDrzavu(tekst, drzave) {
  const k = uKod(tekst);
  if (!k) return '';
  if (!drzave.length) return alfa3(k);       // bez šifrarnika — ISO3 (PROVJERITI)
  const kand = [k, alfa3(k)].map(x => x.toUpperCase());
  const poKodu = drzave.find(d => kand.includes(String(d.kod).toUpperCase()));
  if (poKodu) return poKodu.kod;
  const n = norm(imeDrzave(k, 'hr'));
  const poNazivu = drzave.find(d => norm(d.naziv) === n);
  return poNazivu ? poNazivu.kod : '';
}
function nadjiIspravu(vrsta, isprave) {
  const n = norm(vrsta);
  if (!n) return '';
  const kljuc = n.includes('putovn') ? 'putovn' : n.includes('osobn') ? 'osobn' : n;
  const x = isprave.find(d => norm(d.naziv).includes(kljuc));
  return x ? x.kod : '';
}
// Atributi CheckInTourist: imena iz Wikija (StayFrom, TimeStayFrom,
// ForeseenStayUntil, DocumentType, TouristName, TouristSurname, Gender,
// Facility, TTPaymentCategory, ArrivalOrganisation, OfferedServiceType, ID);
// ostala (DocumentNumber, DateOfBirth, Citizenship, CountryOfResidence,
// CityOfResidence, TimeEstimatedStay) — PROVJERITI.
function zaEvisitor(o, i, bk, postavke, sif) {
  const nedostaje = [];
  const drz = nadjiDrzavu(o.drzavljanstvo, sif.drzave);
  const preb = nadjiDrzavu(o.drzava_prebivalista || o.drzavljanstvo, sif.drzave);
  const isp = nadjiIspravu(o.vrsta_isprave, sif.isprave);
  if (!o.ime || !o.prezime) nedostaje.push('ime i prezime');
  if (!o.datum_rodjenja) nedostaje.push('datum rođenja');
  if (!o.spol) nedostaje.push('spol');
  if (!drz) nedostaje.push('državljanstvo');
  if (!o.broj_isprave) nedostaje.push('broj isprave');
  if (!isp) nedostaje.push('vrsta isprave');
  return {
    nedostaje,
    tijelo: {
      ID: idGosta(bk.id, i),
      Facility: postavke.objekt,
      StayFrom: ymd(bk.checkin_date),
      TimeStayFrom: hhmm(postavke.vrijeme_dolaska) || '14:00',
      ForeseenStayUntil: ymd(bk.checkout_date),
      TimeEstimatedStay: hhmm(postavke.vrijeme_odlaska) || '10:00',
      DocumentType: isp,
      DocumentNumber: String(o.broj_isprave || '').trim(),
      TouristName: String(o.ime || '').trim(),
      TouristSurname: String(o.prezime || '').trim(),
      Gender: o.spol === 'Ž' ? 'ženski' : o.spol === 'M' ? 'muški' : '',
      DateOfBirth: ymd(o.datum_rodjenja),
      Citizenship: drz,
      CountryOfResidence: preb,
      CityOfResidence: String(o.grad_prebivalista || '').trim(),
      TTPaymentCategory: postavke.pristojba,
      ArrivalOrganisation: postavke.dolazak,
      OfferedServiceType: postavke.usluga
    }
  };
}

// ---------- Supabase (korisnikov token) ----------
function sb(rest, put, token, opts) { return rest(put, token, opts); }

// ---------- ruta ----------
// GET  ?evisitor=1                                  → { nacin }
// POST ?evisitor=1 { radnja:'sifrarnici', korisnik, lozinka }
// POST ?evisitor=1 { radnja:'prijavi', korisnik, lozinka, booking_id, postavke:{objekt,pristojba,dolazak,usluga,vrijeme_dolaska,vrijeme_odlaska} }
async function obradi(req, res, token, rest) {
  if (req.method === 'GET') { res.status(200).json({ nacin: nacin() }); return; }
  if (nacin() === 'off') { res.status(503).json({ error: 'Prijava u eVisitor još nije uključena.', nacin: 'off' }); return; }
  if (!token) { res.status(401).json({ error: 'Niste prijavljeni.' }); return; }
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const korisnik = String(b.korisnik || '').trim(), lozinka = String(b.lozinka || '');
  if (!korisnik || !lozinka) { res.status(400).json({ error: 'Upišite korisničko ime i lozinku za eVisitor.' }); return; }

  // prije prijave u eVisitor: smije li ovaj korisnik uopće ovu rezervaciju (RLS)
  let bk = null, reg = null;
  if (b.radnja === 'prijavi') {
    const r1 = await sb(rest, 'bookings?id=eq.' + encodeURIComponent(b.booking_id || '') + '&select=id,property_id,checkin_date,checkout_date', token);
    bk = r1.ok ? (await r1.json())[0] : null;
    const r2 = bk ? await sb(rest, 'guest_registrations?booking_id=eq.' + encodeURIComponent(bk.id) + '&select=booking_id,osobe', token) : null;
    reg = r2 && r2.ok ? (await r2.json())[0] : null;
    if (!bk || !reg || !Array.isArray(reg.osobe) || !reg.osobe.length) { res.status(404).json({ error: 'Za ovu rezervaciju nema upisanih podataka gostiju.' }); return; }
    const p = b.postavke || {};
    if (!p.objekt || !p.pristojba || !p.dolazak || !p.usluga) { res.status(400).json({ error: 'Odaberite objekt u eVisitoru, kategoriju pristojbe, organizaciju dolaska i vrstu usluge.' }); return; }
  } else if (b.radnja !== 'sifrarnici') { res.status(400).json({ error: 'Nepoznata radnja.' }); return; }

  let kol = '';
  try { kol = await prijava(korisnik, lozinka); }
  catch (e) { res.status(e.kod === 'lozinka' ? 401 : 502).json({ error: e.name === 'AbortError' ? 'eVisitor se ne javlja — pokušajte za par minuta.' : String(e.message || e) }); return; }
  try {
    if (b.radnja === 'sifrarnici') {
      const out = { nacin: nacin() };
      for (const v of ['objekti', 'pristojba', 'dolazak', 'usluga']) {
        const x = await citaj(kol, v);
        out[v] = x.redovi.map(({ kod, naziv }) => ({ kod, naziv }));
        out[v + '_resurs'] = x.ime;
        if (x.redovi[0]) out[v + '_polja'] = Object.keys(x.redovi[0].izvorno);   // za pilot: kako izgleda zapis
      }
      res.status(200).json(out);
      return;
    }
    const sif = { drzave: (await citaj(kol, 'drzave')).redovi, isprave: (await citaj(kol, 'isprave')).redovi };
    const rezultati = [];
    for (let i = 0; i < reg.osobe.length && i < 20; i++) {
      const o = reg.osobe[i], m = zaEvisitor(o, i, bk, b.postavke, sif);
      const ime = (o.ime || '') + ' ' + (o.prezime || '');
      if (m.nedostaje.length) { rezultati.push({ ime: ime.trim(), ok: false, poruka: 'Nedostaje: ' + m.nedostaje.join(', ') }); continue; }
      const x = await akcija(kol, 'CheckInTourist', m.tijelo);
      rezultati.push({ ime: ime.trim(), ok: x.ok, poruka: x.ok ? '' : x.poruka, id: m.tijelo.ID });
    }
    const stanje = { nacin: nacin(), poslano_at: new Date().toISOString(), osobe: rezultati.map(({ ime, ok, poruka }) => ({ ime, ok, poruka })) };
    // oznaka u bazi (sql/add-evisitor.sql); bez stupca tiho ništa
    try { await sb(rest, 'guest_registrations?booking_id=eq.' + encodeURIComponent(bk.id), token, { method: 'PATCH', body: JSON.stringify({ evisitor: stanje }), headers: { Prefer: 'return=minimal' } }); } catch (e) {}
    res.status(200).json(stanje);
  } catch (e) {
    res.status(502).json({ error: e.name === 'AbortError' ? 'eVisitor se ne javlja — pokušajte za par minuta.' : String(e.message || e) });
  } finally { await odjava(kol); }
}

module.exports = { obradi, nacin, _zaEvisitor: zaEvisitor, _idGosta: idGosta, _uKod: uKod, _nadjiDrzavu: nadjiDrzavu };
