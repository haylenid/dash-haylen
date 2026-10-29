/* js/app.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { applyTheme, ensurePage } from './actions.js';
import { ROLE } from './core/constants.js';
import { TODAY, dIdx, num, parseDate } from './core/helpers.js';
import { ACT, FORMS, HOOK } from './core/registry.js';
import { appState, fillTemplate, findClientById, findClientByUid, store } from './core/store.js';
import { syncBoot, syncListen } from './core/sync.js';
import { slotPickList, slotPreview } from './pages/coach.js';
import { clientFormSync } from './pages/klien.js';
import { slId, planTypeOn } from './core/shared.js';
import { navigateTo, render, setPath, toast } from './ui/shell.js';
import { apiBoot, apiLog, apiPortalLoad, isApiMode, hasToken, apiLogin, apiLogout, apiUser } from './core/api.js';
import { meId, setLogSink } from './core/access.js';

// Handler logout: hapus token, kembali ke layar login
ACT.logout = () => { apiLogout(); location.reload(); };
setLogSink(t => { if (isApiMode()) apiLog(t); });

import './portal/cdash.js';
import './portal/links.js';
import './portal/client-portal.js';
import './pages/beranda.js';
import './pages/klien.js';
import './pages/coach.js';
import './pages/komisi.js';
import './pages/keuangan.js';
import './pages/koreksi.js';
import './pages/program.js';
import './pages/pesan.js';
import './pages/laporan.js';
import './pages/absensi.js';
import './pages/anggota.js';
import './pages/setting.js';
import './pages/progress.js';
import './actions.js';

document.addEventListener('click',e=>{
 const sc=e.target.closest('.scrim');if(sc&&e.target===sc){appState.modal=null;render();return}
 const t=e.target.closest('[data-act]');if(!t||t.disabled)return;
 const f=ACT[t.dataset.act];if(f)f(t,e);
});
document.addEventListener('submit',e=>{
 const f=e.target.closest('form[data-form]');if(!f)return;
 e.preventDefault();
 // Cegah double-submit: tandai form sedang diproses
 if(f.dataset.busy==='1')return;
 f.dataset.busy='1';
 const btn=f.querySelector('button[type="submit"]');
 const btnTxt=btn?btn.textContent:'';
 if(btn){btn.disabled=true;btn.textContent='Menyimpan...'}
 const h=FORMS[f.dataset.form];
 const done=()=>{f.dataset.busy='';if(btn){btn.disabled=false;btn.textContent=btnTxt}};
 if(h)Promise.resolve(h(new FormData(f),f)).catch(err=>{console.error(err);toast('Gagal menyimpan: '+((err&&err.message)||err))}).finally(done);
 else done();
});
document.addEventListener('input',e=>{
 const t=e.target;
 if(t.hasAttribute&&t.hasAttribute('data-acl')){
  const l=document.getElementById('aclist');if(l)l.innerHTML=slotPickList(t.value,t.dataset.coach,+t.dataset.day,t.dataset.time);
  const hid=document.getElementById('f-slotcid'),p=document.getElementById('idprev');
  if(hid&&hid.value){const k=findClientById(hid.value);if(!k||k.name!==t.value){hid.value='';if(p)p.innerHTML=slotPreview('',t.dataset.coach)}}
  return}
 if(t.hasAttribute&&t.hasAttribute('data-qm')){appState.mq=t.value;appState.focus={id:t.id,pos:t.selectionStart};render();return}
 if(t.hasAttribute&&t.hasAttribute('data-q')){appState.q=t.value;appState.focus={id:t.id,pos:t.selectionStart};render()}
});
document.addEventListener('change',e=>{
 const t=e.target;if(!t.dataset)return;
 if(t.hasAttribute('data-cform')){clientFormSync(t);return}
 if(t.hasAttribute('data-tsel')){const w=document.getElementById('ctw');if(w)w.hidden=t.value!=='custom';return}
 if(t.dataset.f){appState[t.dataset.f]=t.hasAttribute('data-n')?+t.value:t.value;if(t.dataset.f==='adate'){appState.cdate=t.value;appState.pday=dIdx(parseDate(t.value))}render();return}
 if(t.hasAttribute('data-tpl')){
  const form=t.closest('form'),idData=form.dataset.id;
  const tautan=idData.startsWith('sl|')?(store.swLinks||[]).find(x=>slId(x)===idData):null;
  const r=tautan||store.reports.find(x=>x.id===idData),tp=store.tpl.find(x=>x.id===t.value);
  if(r&&tp){const c=findClientById(r.cid);form.querySelector('textarea').value=fillTemplate(tp.text,c.name,tautan?planTypeOn(tautan.date):r.type)}
  return}
 if(t.hasAttribute('data-apply')){ACT.applyps(t);return}
 if(t.dataset.set){
  const p=t.dataset.set;let v=t.value;
  if(t.type==='checkbox')v=t.checked;
  else if(t.hasAttribute('data-num'))v=num(v);
  setPath(p,v);if(HOOK[p])HOOK[p]();
  if(t.hasAttribute('data-unitwk')){const mm=String(v).match(/(\d+)\s*(minggu|mgg)/i);if(mm)store.programs[+p.split('.')[2]].wk=+mm[1]}
  if(p.startsWith('store.programs')||p.startsWith('store.targets'))appState.syncAt=new Date();
  appState.focus=null;
  // Skip render untuk input template program (disimpan via onchange)
  if(!t.hasAttribute('data-norender'))render();
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&appState.modal){appState.modal=null;render()}});
(function boot(){
 // Produksi: role dari user backend, bukan dari demo/prefs
 try{
   const u=apiUser();
   if(u&&u.role&&ROLE[u.role])appState.role=u.role;
   const th=localStorage.getItem('nsr-theme');if(th==='light'||th==='dark'||th==='system')appState.theme=th;
 }catch(e){}
 if(appState.role==='coach'){const mid=meId();appState.sched=mid;appState.cal=mid;appState.share=mid}
 const hm=location.hash.match(/^#c=([A-Za-z0-9_-]+)/);
 window.addEventListener('hashchange',()=>{try{location.reload()}catch(e){}});
 const appEl=document.getElementById('app');
 if(appEl)appEl.innerHTML='<p class="sub" style="padding:48px;text-align:center">Memuat data…</p>';
 // Link portal publik: tanpa sesi login -> langsung dashboard klien
 // (kredensialnya token acak di hash; uid N6-xxxx tidak berlaku di sini).
 if(hm && !hasToken()){ bootPortal(hm[1]); return; }
 // Belum login -> tampilkan layar login
 if(!hasToken()){ renderLogin(); return; }
 bootData();
})();

// Boot portal publik: isi store dari endpoint publik lalu render clientPage.
function bootPortal(token){
 appState.pubPortal=token;
 apiPortalLoad(token).then(c=>{
  appState.cview=c.id; applyTheme(); render(false);
 }).catch(()=>{
  appState.cview='x'; applyTheme(); render(false);
 });
}

function bootData(){
 // Muat dari API; gagal -> tampilkan pesan error yang jelas (tanpa fallback data lokal)
 apiBoot().then(fromApi=>{
  if(!fromApi){ renderApiError(); return; }
  syncListen(()=>{try{ensurePage()}catch(e){}const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)){a.addEventListener('blur',()=>render(),{once:true})}else{render()}toast('Data diperbarui dari portal lain')});
  store.clients=store.clients.filter(c=>!c.arch||(TODAY-parseDate(c.arch))/864e5<7);
  const hm2=location.hash.match(/^#c=([A-Za-z0-9_-]+)/);
  if(hm2){const k=store.clients.find(c=>c.portal_token&&c.portal_token===hm2[1])||findClientByUid(hm2[1]);appState.cview=k?k.id:'x'}
  applyTheme();ensurePage();render(false);
 });
}

// Layar error API: jelaskan alasan, tawarkan coba lagi / logout
function renderApiError(){
 const raw=String(window.__apiErr||'');
 let reason;
 if(/Timeout/i.test(raw)) reason='Server tidak merespons dalam 15 detik. Kemungkinan koneksi lambat atau server sibuk.';
 else if(/Failed to fetch|NetworkError|Load failed/i.test(raw)) reason='Tidak dapat terhubung ke server. Periksa koneksi internet.';
 else if(/401/.test(raw)) reason='Sesi berakhir atau token tidak valid. Silakan login ulang.';
 else reason='Gagal memuat data: '+raw;
 const appEl=document.getElementById('app');
 appEl.innerHTML=`<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px">
 <div style="width:100%;max-width:380px;text-align:center">
 <h1 style="font-size:20px;margin:0 0 8px">Gagal memuat data</h1>
 <p class="sub" style="margin:0 0 20px">${reason}</p>
 <div style="display:flex;gap:8px;justify-content:center">
 <button class="btn primary" id="err-retry">Coba lagi</button>
 <button class="btn" id="err-logout">Keluar</button>
 </div></div></div>`;
 document.getElementById('err-retry').onclick=()=>location.reload();
 document.getElementById('err-logout').onclick=()=>{ apiLogout(); location.reload(); };
}

// Layar login
function renderLogin(){
 const appEl=document.getElementById('app');
 appEl.innerHTML=`<div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px">
 <form id="login-form" style="width:100%;max-width:340px" autocomplete="off">
 <h1 style="font-size:22px;margin:0 0 4px">Number Six Running</h1>
 <p class="sub" style="margin:0 0 20px">Masuk untuk mengelola</p>
 <label class="sub" style="display:block;margin-bottom:4px">ID Login</label>
 <input name="login_id" required autofocus style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg2);color:inherit;margin-bottom:12px" />
 <label class="sub" style="display:block;margin-bottom:4px">Kata sandi</label>
 <input name="password" type="password" required style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg2);color:inherit;margin-bottom:16px" />
 <p id="login-err" class="sub" style="color:#e5484d;min-height:20px;margin:0 0 8px"></p>
 <button type="submit" style="width:100%;padding:12px;border:0;border-radius:12px;background:var(--accent);color:#fff;font-weight:700;font-size:15px">Masuk</button>
 </form></div>`;
 const f=document.getElementById('login-form');
 f.addEventListener('submit',async ev=>{
  ev.preventDefault();
  const err=document.getElementById('login-err');
  err.textContent='';
  const fd=new FormData(f);
  try{
   const login=await apiLogin(String(fd.get('login_id')).trim(), String(fd.get('password')));
   if(login&&login.user&&login.user.role&&ROLE[login.user.role])appState.role=login.user.role;
   bootData();
  }catch(e){
   const m=String((e&&e.message)||e);
   let t;
   if(/Failed to fetch|NetworkError|Load failed/i.test(m)) t='Tidak dapat terhubung ke server. Periksa koneksi internet.';
   else if(/tidak ditemukan/i.test(m)) t='ID login tidak ditemukan.';
   else if(/password salah/i.test(m)) t='Kata sandi salah.';
   else t='Login gagal: '+m;
   err.textContent=t;
  }
 });
}

// handle debug (dipakai test browser)
window.N6 = { navigateTo, setPath, render, version: '4.0.0-modular' };
