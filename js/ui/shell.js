/* js/ui/shell.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { canAccess, meId, meUser, perm } from '../core/access.js';
import { NAVIC, NAVT, ROLE } from '../core/constants.js';
/* Menu yang disembunyikan dari navigasi (halaman & kodenya tetap ada). Hapus nama dari daftar ini untuk menampilkannya lagi. */
const HIDDEN_NAV=['koreksi','program'];
const navShow=k=>!HIDDEN_NAV.includes(k);
import { getPendingCorrections } from '../core/derived.js';
import { $, esc, hhmm } from '../core/helpers.js';
import { icon, logo } from '../core/icons.js';
import { buildIndicators } from '../core/indicators.js';
import { MODALS, PAGES } from '../core/registry.js';
import { linkEntries, unreadTotals } from '../core/shared.js';
import { appState, findClientById, store } from '../core/store.js';
import { syncPush } from '../core/sync.js';
import { clientPage } from '../portal/client-portal.js';
import { pill, renderSegmented, sheet } from './components.js';

const navLabel=k=>appState.role==='coach'?({klien:'Klien Saya',coach:'Jadwal Saya',komisi:'Komisi Saya'}[k]||NAVT[k]):NAVT[k];
const bellBtn=()=>{if(appState.role==='coach'||typeof buildIndicators!=='function')return '';const n=buildIndicators().al.length;return `<button class="bell" data-act="modal" data-v="notif" aria-label="Notifikasi, ${n} hal perlu perhatian">${icon('bell',20)}${n?`<i class="bdg">${n}</i>`:''}</button>`};
function view(){
 if(appState.cview)return clientPage();
 const eyebrow={owner:'Tier 1 · Pemilik',admin:'Tier 2 · Admin',head:'Tier 3 · Head Coach',coach:'Portal Coach'}[appState.role];
 const me=meUser();
 const groups=[['Operasional',['beranda','klien','coach','koreksi','program','pesan','absensi']],['Bisnis',['komisi','keuangan','laporan']],['Kelola',['anggota','setting']]];
 const unreadCount=unreadTotals();
 const side=groups.map(([g,keys])=>{const it=keys.filter(k=>navShow(k)&&(k==='setting'||canAccess(k))).map(k=>`<button class="nav" data-act="nav" data-v="${k}" ${appState.page===k?'aria-current="page"':''}>${icon(NAVIC[k])}<span>${navLabel(k)}</span>${k==='pesan'&&unreadCount.all?`<i class="ub" aria-label="${unreadCount.all} pesan belum dibaca">${unreadCount.all>99?'99+':unreadCount.all}</i>`:''}${perm(k)==='mask'&&k!=='setting'?'<em class="tag">Terkunci</em>':''}</button>`).join('');return it?`<div class="ng"><p class="nl">${g}</p>${it}</div>`:''}).join('');
 const body=(canAccess(appState.page)||appState.page==='setting')?PAGES[appState.page]():lockedPage();
 return `<div class="shell ${appState.nav?'nav-open':''}">
 <aside class="side" aria-label="Navigasi">
  <div class="brand">${logo(46)}</div>
  ${side}
  <div class="me"><span class="av">${esc(me.name[0])}</span><div><b>${esc(me.name)}</b><span class="r">${ROLE[me.role]}</span></div><button class="btn sm ghost" data-act="logout" title="Keluar" aria-label="Keluar">${icon('out',16)}</button></div>
 </aside>
 ${appState.nav?'<div class="navscrim" data-act="menu"></div>':''}
 <main class="main">
  <div class="top">
   <div class="tl"><span class="mlogo">${logo(30)}</span><div><p class="eyebrow">${eyebrow}</p><h1>${navLabel(appState.page)}</h1></div></div>
   ${bellBtn()}
   <button class="rolechip" data-act="modal" data-v="more" aria-label="Menu"><span class="av">${esc(me.name[0])}</span>${ROLE[appState.role]}${icon('chev',14)}</button>
  </div>
  <div class="row meta"><span class="sync"><i class="dot"></i><span>Tersinkron ${hhmm(appState.syncAt)}</span></span></div>
  ${body}
 </main></div>${renderBottomNav()}${appState.modal?renderModal():''}${appState.gate?checkPageAccess():''}`;
}
function renderBottomNav(){
 const allow=k=>navShow(k)&&(k==='setting'||canAccess(k));
 let prim=['beranda','klien','coach','koreksi'].filter(allow);
 for(const k of ['pesan','absensi','program','laporan','komisi','keuangan']){if(prim.length>=4)break;if(allow(k)&&!prim.includes(k))prim.push(k)}
 prim=prim.slice(0,4);
 const bl=k=>({klien:'Klien',coach:appState.role==='coach'?'Jadwal':'Coach',program:'Program'}[k]||NAVT[k]);
 const pendingKoreksi=canAccess('koreksi')?getPendingCorrections(appState.role==='coach'?meId():null).length+linkEntries().filter(r=>!r.fix&&(appState.role!=='coach'||findClientById(r.cid).coach===meId())).length:0;
 const unreadPesan=canAccess('pesan')?unreadTotals().all:0;
 const btn=k=>`<button data-act="nav" data-v="${k}" ${appState.page===k?'aria-current="page"':''} aria-label="${navLabel(k)}"><span class="ico">${icon(NAVIC[k],20)}${k==='koreksi'&&pendingKoreksi?`<em class="bdg">${pendingKoreksi>99?'99+':pendingKoreksi}</em>`:''}${k==='pesan'&&unreadPesan?`<em class="bdg">${unreadPesan>99?'99+':unreadPesan}</em>`:''}</span><span>${bl(k)}</span></button>`;
 return `<nav class="bnav" aria-label="Menu utama">${prim.map(btn).join('')}<button data-act="modal" data-v="more" ${prim.includes(appState.page)?'':'aria-current="page"'} aria-label="Menu lainnya"><span class="ico">${icon('more',20)}</span><span>Lainnya</span></button></nav>`}
MODALS.more=()=>{
 const me=meUser();
 const keys=['beranda','klien','coach','koreksi','program','pesan','absensi','komisi','keuangan','laporan','anggota','setting'].filter(k=>navShow(k)&&(k==='setting'||canAccess(k)));
 return sheet('Menu',`<div class="row"><span class="av">${esc(me.name[0])}</span><div><b>${esc(me.name)}</b><p class="sub">${ROLE[me.role]}</p></div><span class="sp"></span><button class="btn sm" data-act="logout">${icon('out',15)} Keluar</button></div>
 <div class="mgrid">${keys.map((k,i)=>`<button class="mt t${i%4}" data-act="nav" data-v="${k}" ${appState.page===k?'aria-current="page"':''}><span class="mi">${icon(NAVIC[k],22)}</span><span>${navLabel(k)}</span>${perm(k)==='mask'&&k!=='setting'?'<em class="tag">Sensor</em>':''}</button>`).join('')}</div>`)};
function lockedPage(){return `<section class="card"><div class="lm" style="position:static;padding:30px 10px"><div>${icon('lock',22)}<b>Halaman ini disembunyikan</b><span>Peran ${ROLE[appState.role]} tidak memiliki akses ke modul ${NAVT[appState.page]}. Pemilik dapat mengubahnya di Setting, Hak Akses.</span></div></div></section>`}
function checkPageAccess(){
 const info=[['owner','Pemilik','Tier 1. Akses penuh, termasuk keuangan, komisi, dan pengaturan hak akses.'],['admin','Admin','Tier 2. Mengelola operasional. Data keuangan disembunyikan atau disensor.'],['head','Head Coach','Tier 3. Memantau semua coach dan klien dengan akses terbatas.'],['coach','Coach','Portal Coach. Hanya klien dan jadwal milik sendiri, terhubung ke data Pemilik.']];
 return `<div class="gate"><div class="gate-in"><div class="brand">${logo(76)}</div><h2>Masuk sebagai siapa?</h2><div class="roles">${info.map(([k,t,d])=>`<button class="rc" data-act="enter" data-v="${k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div><p class="sub">Ini prototipe. Pilih peran untuk melihat tampilan dan batas akses masing-masing.</p></div></div>`}
function render(keep=true){
 const app=$('#app'),sy=window.scrollY,ss=$('.side')?.scrollTop||0;
 app.innerHTML=view();
 const sd=$('.side');if(sd)sd.scrollTop=ss;
 if(keep)window.scrollTo(0,sy);else window.scrollTo(0,0);
 document.querySelectorAll('.chat').forEach(e=>{e.scrollTop=e.scrollHeight});
 if(appState.focus){const el=document.getElementById(appState.focus.id);if(el){el.focus();try{el.setSelectionRange(appState.focus.pos,appState.focus.pos)}catch(e){}}appState.focus=null}
 if(typeof syncPush==='function')syncPush();
}
function renderModal(){const m=appState.modal;return MODALS[m.k]?MODALS[m.k](m):''}
function navigateTo(p){appState.openMark=null;appState.page=p;appState.tab=0;appState.q='';appState.cf='all';appState.nav=false;appState.modal=null;render(false)}
let toastTimer;
function toast(m){const el=$('#toast');el.textContent=m;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true},2800)}
function copyToClipboard(text,msg){
 const done=()=>toast(msg||'Tersalin');
 const fb=()=>{const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){toast('Salin manual dari teks yang tampil')}ta.remove()};
 try{navigator.clipboard.writeText(text).then(done,fb)}catch(e){fb()}
}
function setPath(p,v){const a=p.split('.');let o=a[0]==='appState'?appState:store;for(let i=1;i<a.length-1;i++)o=o[a[i]];o[a[a.length-1]]=v}

export { bellBtn, checkPageAccess, copyToClipboard, lockedPage, navLabel, navigateTo, render, renderBottomNav, renderModal, setPath, toast, toastTimer, view };
