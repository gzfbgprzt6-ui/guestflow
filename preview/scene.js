/* ==========================================================================
   Nacrtani jadranski prizori — isti oni iz `p.html`, izdvojeni da ih
   preview stranice mogu dijeliti. Sve je CSS i SVG, nijedna vanjska slika.
   Klase (.art--zalazak / .art--plava / .art--maslinik) i slojevi dolaze
   iz `atmosphere.css`; ovdje je samo sadržaj.
   ========================================================================== */
(() => {
  const SHIM = [[10,44,22,0],[17,20,16,1.2],[25,60,24,2.3],[33,32,19,.7],[42,14,21,3]]
    .map(([t,l,w,d]) => `<div class="shimmer" style="top:${t}%;left:${l}%;width:${w}%;animation-delay:${d}s"></div>`).join('')

  const SVG = {
    'zalazak': `<svg viewBox="0 0 1440 200" preserveAspectRatio="none" fill="none">
        <path d="M0 148c78-6 122-34 196-32 71 2 104 27 176 24 74-3 110-36 190-34 72 2 118 30 190 30 76 0 122-31 196-28 70 3 118 28 190 30 60 2 200-10 302-22v204H0z" fill="#6E8290" opacity=".5"/>
        <path d="M0 170c96-10 150-42 236-38 78 4 120 33 198 31 80-2 122-40 204-36 74 4 122 34 196 34 80 0 126-33 204-29 66 3 128 26 402 18v210H0z" fill="#3E5A69" opacity=".72"/>
        <path d="M0 192c120-8 170-30 268-24 86 5 128 24 210 22 84-2 126-26 208-22 78 4 126 22 202 22 82 0 132-18 214-14 70 3 200 6 338 2v122H0z" fill="#22394A" opacity=".92"/>
      </svg>`,
    'plava': `<svg viewBox="0 0 1440 200" preserveAspectRatio="none" fill="none">
        <path d="M0 160c110-6 180-26 290-22 96 4 150 20 246 18 98-2 150-24 250-20 92 4 150 20 236 20 96 0 160-16 250-12 60 3 118 6 168 4v52H0z" fill="#8FA3A8" opacity=".45"/>
        <g fill="#5E7780" opacity=".8">
          <path d="M120 176v-28h34v28zM170 176v-40h26v40zM212 176v-22h30v22zM470 176v-34h30v34zM512 176v-24h34v24zM880 176v-30h28v30zM918 176v-42h26v42zM1150 176v-26h32v26zM1196 176v-36h24v36z"/>
          <path d="M120 148l17-13 17 13zM170 136l13-11 13 11zM470 142l15-12 15 12zM880 146l14-12 14 12zM1150 150l16-12 16 12z"/>
        </g>
        <path d="M0 178c140-4 200-14 320-11 104 3 160 11 262 10 106-1 160-13 262-11 96 2 158 11 244 11 92 0 158-8 252-6 40 1 74 2 100 3v26H0z" fill="#33505C" opacity=".92"/>
      </svg>`,
    'maslinik': `<svg viewBox="0 0 1440 260" preserveAspectRatio="none" fill="none">
        <path d="M0 176c120-14 190-40 300-34 100 6 152 28 254 26 104-2 156-32 258-28 94 4 152 28 240 28 92 0 156-22 250-18 52 2 98 6 138 8v102H0z" fill="#9AA678" opacity=".5"/>
        <g opacity=".92">
          <path d="M196 232v-52" stroke="#4A4030" stroke-width="7" stroke-linecap="round"/>
          <ellipse cx="196" cy="166" rx="62" ry="38" fill="#6E7F55"/><ellipse cx="160" cy="180" rx="40" ry="26" fill="#7C8C61"/><ellipse cx="232" cy="180" rx="42" ry="26" fill="#63744C"/>
          <path d="M596 236v-62" stroke="#4A4030" stroke-width="8" stroke-linecap="round"/>
          <ellipse cx="596" cy="158" rx="76" ry="45" fill="#6E7F55"/><ellipse cx="548" cy="176" rx="48" ry="30" fill="#7C8C61"/><ellipse cx="646" cy="176" rx="50" ry="30" fill="#63744C"/>
          <path d="M1044 232v-54" stroke="#4A4030" stroke-width="7" stroke-linecap="round"/>
          <ellipse cx="1044" cy="164" rx="64" ry="39" fill="#6E7F55"/><ellipse cx="1004" cy="180" rx="42" ry="27" fill="#7C8C61"/><ellipse cx="1086" cy="180" rx="44" ry="27" fill="#63744C"/>
          <path d="M1330 234v-46" stroke="#4A4030" stroke-width="6" stroke-linecap="round"/>
          <ellipse cx="1330" cy="176" rx="54" ry="33" fill="#6A7B52"/>
        </g>
      </svg>`
  }

  const BIRDS = `<svg class="art__birds" viewBox="0 0 120 30" fill="none">
      <path d="M6 16c4-6 8-6 12 0 4-6 8-6 12 0"/>
      <path d="M46 9c3-4.5 6-4.5 9 0 3-4.5 6-4.5 9 0"/>
      <path d="M82 20c2.6-4 5.2-4 7.8 0 2.6-4 5.2-4 7.8 0"/>
    </svg>`

  /* `big` znači zaglavlje preko cijelog ekrana: sloj dobiva paralaksu na scroll */
  function inner(kind, big) {
    const sp = big ? ' data-speed="-0.10"' : ''
    if (kind === 'maslinik') {
      return `<div class="art__sun"></div><div class="art__haze"></div><div class="art__ground"></div>
        <div class="art__near" style="bottom:26%;height:26vh;min-height:150px" data-mouse="6"${sp}>${SVG.maslinik}</div>`
    }
    const lift = kind === 'plava'
      ? 'bottom:40%;height:15vh;min-height:82px'
      : 'bottom:36%;height:17vh;min-height:92px'
    return `<div class="art__sun"></div><div class="art__haze"></div>
      ${kind === 'zalazak' ? BIRDS : ''}
      <div class="art__mid" style="${lift}" data-mouse="${kind === 'plava' ? 7 : 9}"${sp}>${SVG[kind]}</div>
      <div class="art__sea">${SHIM}</div>`
  }

  /* Ubacujemo NA POČETAK, ne preko `innerHTML` — inače nestane sve što je
     već u elementu (naslov kartice, oznaka „Naslovna”, gumb za brisanje).
     Slojevi prizora nemaju z-index, pa postojeći sadržaj ostaje iznad njih. */
  const put = (el, html) => el.insertAdjacentHTML('afterbegin', html)

  /* veliki prizori: nose i veo koji ih spaja s kremom ispod */
  document.querySelectorAll('[data-art]').forEach(el => {
    put(el, inner(el.dataset.art, true) + '<div class="scene__veil"></div>')
  })
  /* mali prizori u karticama: bez vela, bez paralakse na scroll */
  document.querySelectorAll('[data-g-art]').forEach(el => {
    put(el, inner(el.dataset.gArt, false))
  })
})()

/* Visina preview trake → CSS varijabla, da fiksna navigacija sjedne ispod nje.
   Vodeći ; je nužan: bez njega se `})()` iz gornjeg bloka i `(` ovoga spoje
   u poziv, pa ovaj blok nikad ne krene. */
;(() => {
  const pv = document.querySelector('.pv')
  if (!pv) return
  const set = () => document.documentElement.style.setProperty('--pv-h', pv.offsetHeight + 'px')
  set()
  addEventListener('resize', set)
})()
