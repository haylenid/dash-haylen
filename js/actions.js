/* js/actions.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { canAccess, logAct } from './core/access.js';
import { apiDel, apiLogout, isApiMode } from './core/api.js';
import { COACHES, ROLE_USER_IDS } from './core/constants.js';
import { ACT, CONF } from './core/registry.js';
import { appState, findProgramById, store } from './core/store.js';
import { navigateTo, render, toast } from './ui/shell.js';

function savePreferences(){try{localStorage.setItem('gf-prefs',JSON.stringify({role:appState.role,theme:appState.theme}));localStorage.setItem('nsr-theme',appState.theme)}catch(e){}}
function applyTheme(){const r=document.documentElement;if(appState.theme==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',appState.theme)}
function ensurePage(){if(!(canAccess(appState.page)||appState.page==='setting'))appState.page='beranda'}
Object.assign(ACT,{
 nav:t=>navigateTo(t.dataset.v),
 menu:()=>{appState.nav=!appState.nav;render()},
 role:t=>{/* dinonaktifkan untuk produksi: role hanya dari backend */},
 enter:t=>{appState.gate=false;ACT.role(t)},
 logout:()=>{apiLogout();location.reload()},
 tab:t=>{appState.tab=+t.dataset.v;appState.editfix=null;render()},
 tp:t=>{appState.tp=t.dataset.v;render()},
 theme:t=>{appState.theme=t.dataset.v;applyTheme();savePreferences();render()},
 modal:t=>{appState.modal={k:t.dataset.v,id:t.dataset.id||null};render()},
 close:()=>{appState.modal=null;render()},
 yes:()=>{const m=appState.modal;if(m&&CONF[m.yes])CONF[m.yes](m.arg);appState.modal=null;toast('Selesai');render()},
 forcedel:async()=>{const m=appState.modal;if(!m||m.k!=='forcedel')return;const kind=m.kind,id=m.id;
  if(isApiMode()){try{await apiDel((kind==='member'?'/members/':'/programs/')+id+'?force=1')}catch(e){toast('Gagal hapus paksa: '+e.message);appState.modal=null;render();return}}
  if(kind==='member'){const mm=store.members.find(x=>x.id===id);store.members=store.members.filter(x=>x.id!==id);const i=COACHES.indexOf(id);if(i>=0)COACHES.splice(i,1);store.book=store.book.filter(b=>b.coach!==id);store.clients.forEach(c=>{if(c.coach===id)c.coach=null});logAct('menghapus paksa anggota '+(mm?mm.name:id));toast('Anggota dihapus paksa')}
  else{const p=findProgramById(id);p.del=true;store.clients.forEach(c=>{if(c.pid===id)c.pid=null});appState.syncAt=new Date();logAct('menghapus paksa program '+(p?p.name:id));toast('Program dihapus paksa')}
  appState.modal=null;render()}
});

export { applyTheme, ensurePage, savePreferences };
