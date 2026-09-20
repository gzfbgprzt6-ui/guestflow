// ============================================================
// /api/test-calendar — testni iCal feed
//
// Zašto postoji: da se sinkronizacija može isprobati bez računa na
// Booking.com-u ili Airbnb-u. Domaćin zalijepi ovu adresu umjesto
// pravog export linka i vidi radi li cijeli lanac.
//
// Namjerno je funkcija, a ne statična .ics datoteka: datumi se
// računaju od DANAS, pa test nikad ne zastari i termini uvijek
// padnu u mjesec koji je u kalendaru vidljiv.
//
// Sadrži i jedan STATUS:CANCELLED događaj koji se NE smije upisati —
// ako se pojavi u kalendaru, filtriranje otkazanih je puklo.
// ============================================================

function ymd(d) {
  return d.getUTCFullYear() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
}
function plusDays(base, n) {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

module.exports = (req, res) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // DTEND je u iCal-u ekskluzivan, pa je "7 noći" DTSTART+7.
  const events = [
    { from: 10, nights: 7, summary: 'CLOSED - Not available' },
    { from: 24, nights: 5, summary: 'CLOSED - Not available' },
    { from: 40, nights: 3, summary: 'Otkazano - ne smije se upisati', cancelled: true }
  ];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Odmoria//Testni kalendar//HR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Odmoria — testni kalendar'
  ];

  events.forEach((ev, i) => {
    const start = plusDays(today, ev.from);
    const end = plusDays(start, ev.nights);
    lines.push('BEGIN:VEVENT');
    lines.push('UID:odmoria-test-' + i + '-' + ymd(start) + '@odmoria.com');
    lines.push('DTSTAMP:' + ymd(today) + 'T000000Z');
    lines.push('DTSTART;VALUE=DATE:' + ymd(start));
    lines.push('DTEND;VALUE=DATE:' + ymd(end));
    if (ev.cancelled) lines.push('STATUS:CANCELLED');
    lines.push('SUMMARY:' + ev.summary);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(lines.join('\r\n'));
};

// Očekivani rezultat sinkronizacije, da test ima provjerljiv ishod.
module.exports.expected = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return { nights: 12, firstStart: plusDays(today, 10), secondStart: plusDays(today, 24) };
};
