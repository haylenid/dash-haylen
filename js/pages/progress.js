/* js/pages/progress.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { MODS } from '../core/constants.js';
import { icon } from '../core/icons.js';
import { PAGES } from '../core/registry.js';
import { pill } from '../ui/components.js';

PAGES.progress=()=>{
 const steps=[['done','Prototipe antarmuka dan alur','Semua modul dari daftar fitur dapat diklik dengan data contoh, termasuk portal Coach dan pengaturan hak akses.','Selesai'],['now','Database dan sinkronisasi','Satu database untuk portal Pemilik dan Coach. Perubahan coach tampil di portal Pemilik tanpa muat ulang.','Berikutnya'],['','Login dan hak akses sungguhan','Akun per anggota. Peran dan sensor data sensitif ditegakkan di server, bukan hanya di tampilan.','Direncanakan'],['','Ekspor PDF, JPG, dan WhatsApp','Program latihan dan laporan keluar sebagai file. Broadcast terkirim ke WhatsApp klien.','Direncanakan'],['','Uji coba dengan coach','Pilot dua minggu bersama beberapa coach, lalu perbaikan dari masukan.','Direncanakan']];
 return `<div class="stackv"><div class="road">${steps.map(([k,t,d,s],i)=>`<div class="step ${k}"><span class="no">${k==='done'?icon('check',14):i+1}</span><div><b>${t}</b><p>${d}</p></div>${pill(s,k==='done'?'good':k==='now'?'info':'')}</div>`).join('')}</div>
 <section class="card"><header class="ch"><h3>Modul pada prototipe</h3><span class="sub">13 modul aplikasi dan halaman progres ini</span></header><div class="modgrid">${MODS.map(([k,l])=>`<div>${icon('check',16)}${l}</div>`).join('')}</div></section></div>`};
