// ============================================================
// Države (ISO 3166-1) za prijavu boravka — vodič (h.html) i dashboard.
// Gost bira s popisa, u bazu ide dvoslovni kod (npr. "DE"), a ime se
// prikazuje na jeziku čitatelja (Intl.DisplayNames). Stari upisi slobodnim
// tekstom („Njemačka”, "Germany") prepoznaju se kroz uKod().
// Kopija tablice je u api/_evisitor.js (CJS) — mijenjati zajedno.
// ============================================================
export const ISO = 'ADAND,AEARE,AFAFG,AGATG,AIAIA,ALALB,AMARM,AOAGO,AQATA,ARARG,ASASM,ATAUT,AUAUS,AWABW,AXALA,AZAZE,BABIH,BBBRB,BDBGD,BEBEL,BFBFA,BGBGR,BHBHR,BIBDI,BJBEN,BLBLM,BMBMU,BNBRN,BOBOL,BQBES,BRBRA,BSBHS,BTBTN,BVBVT,BWBWA,BYBLR,BZBLZ,CACAN,CCCCK,CDCOD,CFCAF,CGCOG,CHCHE,CICIV,CKCOK,CLCHL,CMCMR,CNCHN,COCOL,CRCRI,CUCUB,CVCPV,CWCUW,CXCXR,CYCYP,CZCZE,DEDEU,DJDJI,DKDNK,DMDMA,DODOM,DZDZA,ECECU,EEEST,EGEGY,EHESH,ERERI,ESESP,ETETH,FIFIN,FJFJI,FKFLK,FMFSM,FOFRO,FRFRA,GAGAB,GBGBR,GDGRD,GEGEO,GFGUF,GGGGY,GHGHA,GIGIB,GLGRL,GMGMB,GNGIN,GPGLP,GQGNQ,GRGRC,GSSGS,GTGTM,GUGUM,GWGNB,GYGUY,HKHKG,HMHMD,HNHND,HRHRV,HTHTI,HUHUN,IDIDN,IEIRL,ILISR,IMIMN,ININD,IOIOT,IQIRQ,IRIRN,ISISL,ITITA,JEJEY,JMJAM,JOJOR,JPJPN,KEKEN,KGKGZ,KHKHM,KIKIR,KMCOM,KNKNA,KPPRK,KRKOR,KWKWT,KYCYM,KZKAZ,LALAO,LBLBN,LCLCA,LILIE,LKLKA,LRLBR,LSLSO,LTLTU,LULUX,LVLVA,LYLBY,MAMAR,MCMCO,MDMDA,MEMNE,MFMAF,MGMDG,MHMHL,MKMKD,MLMLI,MMMMR,MNMNG,MOMAC,MPMNP,MQMTQ,MRMRT,MSMSR,MTMLT,MUMUS,MVMDV,MWMWI,MXMEX,MYMYS,MZMOZ,NANAM,NCNCL,NENER,NFNFK,NGNGA,NINIC,NLNLD,NONOR,NPNPL,NRNRU,NUNIU,NZNZL,OMOMN,PAPAN,PEPER,PFPYF,PGPNG,PHPHL,PKPAK,PLPOL,PMSPM,PNPCN,PRPRI,PSPSE,PTPRT,PWPLW,PYPRY,QAQAT,REREU,ROROU,RSSRB,RURUS,RWRWA,SASAU,SBSLB,SCSYC,SDSDN,SESWE,SGSGP,SHSHN,SISVN,SJSJM,SKSVK,SLSLE,SMSMR,SNSEN,SOSOM,SRSUR,SSSSD,STSTP,SVSLV,SXSXM,SYSYR,SZSWZ,TCTCA,TDTCD,TFATF,TGTGO,THTHA,TJTJK,TKTKL,TLTLS,TMTKM,TNTUN,TOTON,TRTUR,TTTTO,TVTUV,TWTWN,TZTZA,UAUKR,UGUGA,UMUMI,USUSA,UYURY,UZUZB,VAVAT,VCVCT,VEVEN,VGVGB,VIVIR,VNVNM,VUVUT,WFWLF,WSWSM,YEYEM,YTMYT,ZAZAF,ZMZMB,ZWZWE,XKXKX'
export const KODOVI = ISO.split(',').map(x => x.slice(0, 2))
// najčešći gosti na Jadranu — na vrhu popisa
export const PRVE = ['HR', 'DE', 'AT', 'SI', 'IT', 'PL', 'CZ', 'SK', 'HU', 'BA', 'RS', 'GB', 'NL', 'FR']
const imena = {}
export function ime(kod, jezik = 'hr') {
  if (!kod) return ''
  try { return (imena[jezik] = imena[jezik] || new Intl.DisplayNames([jezik], { type: 'region' })).of(kod) || kod } catch { return kod }
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
let ALIAS = null
export function uKod(tekst) {
  const s = String(tekst || '').trim()
  if (/^[A-Za-z]{2}$/.test(s) && KODOVI.includes(s.toUpperCase())) return s.toUpperCase()
  if (/^[A-Za-z]{3}$/.test(s)) { const x = ISO.split(',').find(e => e.slice(2) === s.toUpperCase()); if (x) return x.slice(0, 2) }
  if (!ALIAS) {
    ALIAS = {}
    for (const j of ['hr', 'en', 'de', 'it', 'pl', 'cs', 'sl', 'sk', 'hu', 'fr', 'nl', 'es', 'sr-Latn', 'bs'])
      for (const k of KODOVI) { const n = norm(ime(k, j)); if (n && !ALIAS[n]) ALIAS[n] = k }
    Object.assign(ALIAS, { bih: 'BA', uk: 'GB', engleska: 'GB', england: 'GB', usa: 'US', sad: 'US', amerika: 'US', deutschland: 'DE', osterreich: 'AT', ceska: 'CZ', czechia: 'CZ', ceskarepublika: 'CZ', republikahrvatska: 'HR', holland: 'NL', nizozemska: 'NL' })
  }
  return ALIAS[norm(s)] || ''
}
