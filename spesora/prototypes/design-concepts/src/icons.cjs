/* Icone (tratto, colore corrente) e micro-illustrazioni delle categorie (contorno scuro, palette Spesora). */
const s = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  sun: s('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>'),
  cal: s('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  basket: s('<path d="M4 10h16l-1.6 8.4a2 2 0 0 1-2 1.6H7.6a2 2 0 0 1-2-1.6z"/><path d="M8.5 10 12 4.5 15.5 10M9.5 14v3M14.5 14v3"/>'),
  pantry: s('<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 9.5h16M4 15h16M10 6.5h4M10 12h4M10 17.5h4"/>'),
  book: s('<path d="M12 6.5c-2-1.6-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6-.1-8 1.5zM12 6.5V19.5"/>'),
  clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  users: s('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.9M17.5 14.6c1.6.6 2.7 2.1 3 4.4"/>'),
  right: s('<path d="M9.5 6l6 6-6 6"/>', 2.2),
  left: s('<path d="M14.5 6l-6 6 6 6"/>', 2.2),
  down: s('<path d="M6 9.5l6 6 6-6"/>', 2.2),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.6),
  info: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>', 2),
  heart: s('<path d="M12 19.5s-7.5-4.4-7.5-9.6A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.6c0 5.2-7.5 9.6-7.5 9.6z"/>'),
  gear: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.7 7.7 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.7 7.7 0 0 0 2.6-1.5l2.3.9 2-3.4z"/>', 1.6),
  search: s('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  dawn: s('<path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 6v3M5.6 10.6l1.6 1.2M18.4 10.6l-1.6 1.2"/>'),
  noon: s('<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'),
  moon: s('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'),
  alert: s('<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17v.2"/>', 2),
  refresh: s('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>'),
  spark: s('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
};
const TYPE_ICON = { Colazione: I.dawn, Pranzo: I.noon, Cena: I.moon };

const ink = '#24332C';
const CAT = {
  veg: `<svg viewBox="0 0 48 48"><path d="M14 30 L33 12 Q37 14 36 18 L18 36 Q12 38 14 30Z" fill="#E58A3F" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="M33 12 L38 5 M35 14 L43 11 M31 11 L33 4" stroke="#4F8468" stroke-width="3" stroke-linecap="round"/><path d="M21 27l3 3M25 22l3 3" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  dairy: `<svg viewBox="0 0 48 48"><path d="M6 32 L32 14 L42 26 L42 36 L6 36Z" fill="#F2CB5C" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="M6 32 L42 26" stroke="${ink}" stroke-width="2"/><circle cx="18" cy="31.5" r="2.2" fill="#E0B348"/><circle cx="30" cy="31" r="1.8" fill="#E0B348"/></svg>`,
  meat: `<svg viewBox="0 0 48 48"><path d="M9 28 Q8 17 20 15 L32 13 Q41 13 40 22 Q39 31 28 32 L17 34 Q9 35 9 28Z" fill="#C8553D" stroke="${ink}" stroke-width="2.2"/><path d="M17 22 Q24 19 31 20" stroke="#F3C9A2" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>`,
  grain: `<svg viewBox="0 0 48 48"><path d="M14 14 Q24 10 34 14 L36 38 Q24 42 12 38Z" fill="#F3C9A2" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="M15 15 Q24 19 33 15" stroke="${ink}" stroke-width="1.8" fill="none"/><path d="M24 22v12M24 26l-3-2M24 26l3-2M24 30l-3-2M24 30l3-2" stroke="#B98552" stroke-width="2" stroke-linecap="round"/></svg>`,
  jar: `<svg viewBox="0 0 48 48"><rect x="14" y="8" width="20" height="6" rx="2" fill="#A7B897" stroke="${ink}" stroke-width="2.2"/><rect x="12" y="13" width="24" height="27" rx="6" fill="#FFFDF8" stroke="${ink}" stroke-width="2.2"/><path d="M14 26 H34 V33 Q34 38 29 38 H19 Q14 38 14 33Z" fill="#E6A46D"/></svg>`,
};
/* Micro-illustrazioni dei singoli prodotti (le altre usano l'icona della categoria). */
const ITEM = {
  Pere: `<svg viewBox="0 0 48 48"><path d="M24 12 Q30 12 30 20 Q38 26 36 34 Q34 42 24 42 Q14 42 12 34 Q10 26 18 20 Q18 12 24 12Z" fill="#C9C55A" stroke="${ink}" stroke-width="2.2"/><path d="M24 12 Q25 7 28 5" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M27 8 Q33 6 34 10 Q29 12 27 8Z" fill="#4F8468" stroke="${ink}" stroke-width="1.6"/></svg>`,
  'Funghi champignon': `<svg viewBox="0 0 48 48"><rect x="19" y="24" width="10" height="16" rx="4" fill="#FFFDF8" stroke="${ink}" stroke-width="2.2"/><path d="M8 26 Q8 8 24 8 Q40 8 40 26 Q24 22 8 26Z" fill="#D9C2A3" stroke="${ink}" stroke-width="2.2"/></svg>`,
  'Fichi freschi': `<svg viewBox="0 0 48 48"><path d="M24 8 Q28 14 32 18 Q40 26 36 36 Q32 42 24 42 Q16 42 12 36 Q8 26 16 18 Q20 14 24 8Z" fill="#7A4C6B" stroke="${ink}" stroke-width="2.2"/><path d="M18 30 Q24 24 30 30 Q24 38 18 30Z" fill="#E07A6F"/></svg>`,
  'Yogurt greco': `<svg viewBox="0 0 48 48"><path d="M12 16 H36 L33 40 Q32 42 30 42 H18 Q16 42 15 40Z" fill="#FFFDF8" stroke="${ink}" stroke-width="2.2"/><rect x="10" y="10" width="28" height="7" rx="3" fill="#A7B897" stroke="${ink}" stroke-width="2.2"/><path d="M15 27 H33" stroke="#4F8468" stroke-width="3"/></svg>`,
};
ITEM['Yogurt bianco'] = ITEM['Yogurt greco'];

/* Rametto botanico a tratto (decorazione). */
const SPRIG = (c1 = '#4F8468', c2 = '#A7B897') => `<svg viewBox="0 0 80 120" fill="none"><path d="M40 118 C38 80 44 46 52 6" stroke="${c1}" stroke-width="2.4" stroke-linecap="round"/>${[[30, 96, -40], [52, 84, 38], [30, 68, -44], [54, 56, 42], [34, 40, -40], [54, 28, 36], [44, 12, 0]]
  .map(([x, y, r], i) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="5" fill="${i % 2 ? c2 : c1}" transform="rotate(${r} ${x} ${y})"/>`)
  .join('')}</svg>`;

module.exports = { I, CAT, ITEM, SPRIG, TYPE_ICON };
