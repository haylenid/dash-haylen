/* js/core/icons.js — diekstrak otomatis dari index.html (fase 4 refactor) */
const ICONS={
 home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 klien:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5c2 .7 3.5 2.5 3.5 5.5"/>',
 coach:'<circle cx="12" cy="14" r="7"/><path d="M12 14v-4M9 3h6M12 3v4"/>',
 komisi:'<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
 keuangan:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1.2"/>',
 koreksi:'<path d="M4 12.5l4.5 4.5L20 6"/><path d="M4 21h16"/>',
 program:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8.5 12h7M8.5 16h5"/>',
 download:'<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14"/>',
 pesan:'<path d="M4 5h16v11H9l-5 4z"/>',
 laporan:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
 absensi:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4M10 14l4 4M14 14l-4 4"/>',
 anggota:'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><circle cx="12" cy="10" r="2.2"/><path d="M8.5 16c.8-1.6 2-2.3 3.5-2.3s2.7.7 3.5 2.3"/>',
 setting:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
 progress:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
 send:'<path d="M4 12L20 4l-6 16-3-7z"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 out:'<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 8l-4 4 4 4M6 12h10"/>',
 more:'<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>',
 chev:'<path d="M6 9l6 6 6-6"/>',
 bell:'<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>'
};
const icon=(n,s=18)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;
const logo=h=>`<span class="logo" role="img" aria-label="Logo N6" style="--h:${h||34}px"></span>`;

export { ICONS, icon, logo };
