/* js/pages/setting.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, meUser } from '../core/access.js';
import { MODS, ROLE } from '../core/constants.js';
import { esc } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, FORMS, PAGES } from '../core/registry.js';
import { apiPatch, isApiMode } from '../core/api.js';
import { appState, store } from '../core/store.js';
import { syncReset } from '../core/sync.js';
import { banner, pill, renderSegmented, tabsBar } from '../ui/components.js';
import { render, toast } from '../ui/shell.js';

const ACL_OPTIONS=[['full','Penuh'],['mask','Disensor'],['none','Tersembunyi']];
PAGES.setting=()=>{
 const tabs=['Profile','Login & sesi','ID & password','Tema'];if(appState.role==='owner')tabs.push('Komisi','Hak akses');
 const t=Math.min(appState.tab,tabs.length-1),me=meUser();let body='';
 if(t===0)body=`<section class="card"><div class="row"><span class="av" style="width:48px;height:48px;font-size:20px">${esc(me.name[0])}</span><div><b>${esc(me.name)}</b><p class="sub">${ROLE[me.role]}</p></div></div><form data-form="profile" class="fg"><label class="field"><span>Nama</span><input id="f-pfn" name="name" value="${esc(me.name)}" required></label><label class="field"><span>Email</span><input id="f-pfe" name="email" type="email" value="${esc(me.email)}" required></label><label class="field"><span>WhatsApp</span><input id="f-pfw" name="wa" value="${esc(me.wa)}"></label><div class="row full"><button class="btn primary" type="submit">Simpan profil</button></div></form></section>`;
 if(t===1)body=`<section class="card"><header class="ch"><h3>Sesi saat ini</h3></header><div class="li"><div><b>${esc(me.name)}</b><small>Masuk sebagai ${ROLE[me.role]}</small></div><button class="btn" data-act="logout">${icon('out',15)} Keluar</button></div></section><section class="card"><header class="ch"><h3>Perangkat tersambung</h3><span class="sub">Contoh status sinkronisasi</span></header><div class="listv"><div class="li"><div><b>Portal Pemilik</b><small>Web, sesi ini</small></div>${pill('Online','good')}</div><div class="li"><div><b>Portal Coach, Dimas Pratama</b><small>Ponsel</small></div>${pill('Online','good')}</div><div class="li"><div><b>Portal Coach, Lestari Ayu</b><small>Terakhir aktif 2 jam lalu</small></div>${pill('Offline')}</div></div></section><section class="card"><header class="ch"><h3>Data contoh dan sinkronisasi</h3></header><p class="sub">Portal Pemilik dan portal Coach berbagi data lewat penyimpanan browser yang sama. Pada produksi, keduanya membaca satu database di server.</p><div><button class="btn danger" data-act="syncreset">Atur ulang data contoh</button></div></section>`;
 if(t===2)body=`<section class="card"><form data-form="pw" class="fg"><label class="field"><span>ID login</span><input id="f-pid" value="${esc(me.login)}" readonly></label><div></div><label class="field"><span>Password saat ini</span><input id="f-pw0" name="old" type="password" autocomplete="current-password" required></label><label class="field"><span>Password baru (minimal 8 karakter)</span><input id="f-pw1" name="new" type="password" autocomplete="new-password" required></label><label class="field"><span>Ulangi password baru</span><input id="f-pw2" name="new2" type="password" autocomplete="new-password" required></label><div class="row full"><button class="btn primary" type="submit">Ganti password</button></div></form><p class="sub">Prototipe ini tidak menyimpan password.</p></section>`;
 if(t===3)body=`<section class="card"><header class="ch"><h3>Tema tampilan</h3></header>${renderSegmented('theme',appState.theme,[['light','Terang'],['dark','Gelap'],['system','Ikuti perangkat']])}<p class="sub">Warna mengikuti pilihan Anda di semua halaman, termasuk grafik dan laporan.</p></section>`;
 if(t===4){
  const kb=(store.komisiSet&&store.komisiSet.tgl_bayar!==undefined)?store.komisiSet.tgl_bayar:'akhir';
  body=`<section class="card"><header class="ch"><h3>Pembayaran komisi</h3></header><p class="sub">Komisi coach dibayarkan setiap bulan. Pilih tanggal pembayarannya — jadwal untuk bulan yang sedang dilihat tampil di halaman Komisi (menu Komisi, tab Performa & pembayaran).</p><form data-form="komisiset" class="fg"><label class="field"><span>Tanggal pembayaran komisi</span><select name="tgl_bayar"><option value="akhir" ${kb==='akhir'?'selected':''}>Akhir bulan</option>${Array.from({length:28},(_,i)=>`<option value="${i+1}" ${kb===i+1||kb===String(i+1)?'selected':''}>Tanggal ${i+1}</option>`).join('')}</select></label><div class="row full"><button class="btn primary" type="submit">Simpan pengaturan</button></div></form></section>`}
 if(t===5){
  body=`${banner('Pemilik menentukan apa yang boleh dilihat tiap peran. Disensor berarti halaman tetap terbuka tetapi nominal keuangan dan komisi disembunyikan. Tersembunyi berarti modul hilang dari menu. Untuk Coach, Penuh berarti hanya data klien dan jadwal miliknya.')}
  <div class="tw"><table class="acl"><thead><tr><th>Modul</th><th>Admin</th><th>Head Coach</th><th>Coach</th></tr></thead><tbody>${MODS.filter(m=>m[0]!=='setting').map(([k,l])=>`<tr><td><b>${l}</b></td>${['admin','head','coach'].map(r=>`<td><select id="f-acl-${r}-${k}" data-set="store.acl.${r}.${k}" aria-label="${l} untuk ${ROLE[r]}">${ACL_OPTIONS.map(([v,n])=>`<option value="${v}" ${store.acl[r][k]===v?'selected':''}>${n}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="row"><button class="btn primary" data-act="aclsave">Simpan hak akses</button></div>`}
 return `<div class="stackv">${tabsBar(tabs)}${body}</div>`};
ACT.syncreset=()=>syncReset();
ACT.aclsave=async()=>{
  if(!isApiMode()){toast('Tersimpan lokal');return}
  try{
    await apiPatch('/settings',{acl:store.acl});
    toast('Hak akses disimpan');
  }catch(e){toast('Gagal simpan: '+e.message)}
};
FORMS.komisiset=async f=>{
 const v=f.get('tgl_bayar');
 store.komisiSet={tgl_bayar:v==='akhir'?'akhir':+v};
 if(isApiMode()){
   try{await apiPatch('/settings',{komisi:store.komisiSet})}
   catch(e){toast('Gagal simpan: '+e.message);return}
 }
 logAct('mengubah tanggal pembayaran komisi menjadi '+(v==='akhir'?'akhir bulan':'tanggal '+v));toast('Pengaturan komisi disimpan');render()};
FORMS.profile=f=>{const m=meUser();m.name=f.get('name').trim();m.email=f.get('email').trim();m.wa=f.get('wa').trim();logAct('memperbarui profil');toast('Profil disimpan');render()};
FORMS.pw=f=>{if(f.get('new').length<8){toast('Password baru minimal 8 karakter');return}if(f.get('new')!==f.get('new2')){toast('Konfirmasi password tidak sama');return}toast('Password diganti');render()};

export { ACL_OPTIONS };
