/* js/pages/anggota.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, meId } from '../core/access.js';
import { apiAddMember, apiDel, isApiMode } from '../core/api.js';
import { COACHES, ROLE } from '../core/constants.js';
import { esc, first } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, CONF, FORMS, MODALS, PAGES } from '../core/registry.js';
import { appState, getClientStatus, getMemberName, store } from '../core/store.js';
import { initCoach } from './coach.js';
import { kpi, pill, renderHBar, sheet, tabsBar } from '../ui/components.js';
import { render, toast } from '../ui/shell.js';

PAGES.anggota=()=>{
 const tabs=['Ringkasan','Daftar & kelola'],t=Math.min(appState.tab,1),M=store.members;let body='';
 if(t===0)body=`<div class="kpis">${kpi('Total anggota',M.length,'akun aktif')}${kpi('Admin',M.filter(m=>m.role==='admin').length,'Tier 2')}${kpi('Head coach',M.filter(m=>m.role==='head').length,'Tier 3')}${kpi('Coach',M.filter(m=>m.role==='coach').length,'portal coach')}</div><section class="card"><header class="ch"><h3>Beban klien per anggota</h3></header>${renderHBar(COACHES.map(c=>({l:first(getMemberName(c)),v:store.clients.filter(x=>x.coach===c&&!x.arch&&getClientStatus(x)!=='Selesai').length})),v=>v+' klien')}</section>`;
 if(t===1)body=`<div class="toolbar"><span class="sp"></span><button class="btn primary" data-act="modal" data-v="member">${icon('plus',15)} Tambah anggota</button></div><div class="tw"><table><thead><tr><th>Nama</th><th>Peran</th><th>ID login</th><th>Email</th><th>Lokasi melatih</th><th></th></tr></thead><tbody>${M.map(m=>`<tr><td><b>${esc(m.name)}</b></td><td>${pill(ROLE[m.role],m.role==='owner'?'info':'')}</td><td class="mono">${esc(m.login)}</td><td>${esc(m.email)}</td><td>${m.role==='coach'||m.role==='head'?esc(m.loc||'-'):'-'}</td><td><div class="row"><button class="btn sm" data-act="modal" data-v="memedit" data-id="${m.id}">${icon('edit',14)} Edit</button>${m.role==='owner'||m.id===meId()?'':`<button class="btn sm danger" data-act="memdel" data-v="${m.id}">${icon('trash',14)} Hapus</button>`}</div></td></tr>`).join('')}</tbody></table></div>`;
 return `<div class="stackv">${tabsBar(tabs)}${body}</div>`};
MODALS.member=()=>sheet('Tambah anggota',`<form data-form="member" class="fg"><label class="field full"><span>Nama lengkap</span><input id="f-mn" name="name" required></label><label class="field"><span>Peran</span><select name="role"><option value="coach">Coach</option><option value="head">Head Coach</option><option value="admin">Admin</option></select></label><label class="field"><span>ID login</span><input id="f-ml" name="login" required autocomplete="off"></label><label class="field"><span>Kata sandi</span><input id="f-mp" name="password" type="password" required autocomplete="new-password" minlength="4"></label><label class="field full"><span>Email</span><input id="f-me" name="email" type="email" required></label><label class="field full"><span>Lokasi coach melatih (untuk Coach dan Head Coach)</span><input id="f-mloc" name="loc" placeholder="Contoh: GBK Senayan, Jakarta"></label><div class="row full"><button class="btn primary" type="submit">Tambah anggota</button><button class="btn" type="button" data-act="close">Batal</button></div></form>`);
MODALS.memedit=m=>{
 const x=store.members.find(v=>v.id===m.id);if(!x)return '';
 const isC=x.role==='coach'||x.role==='head';
 return sheet('Edit anggota',`<form data-form="memedit" class="fg"><input type="hidden" name="id" value="${x.id}">
 <label class="field full"><span>Nama lengkap</span><input id="f-en" name="name" required value="${esc(x.name)}"></label>
 <label class="field"><span>Peran</span>${isC?`<select name="role"><option value="coach" ${x.role==='coach'?'selected':''}>Coach</option><option value="head" ${x.role==='head'?'selected':''}>Head Coach</option></select>`:`<input value="${ROLE[x.role]}" disabled>`}</label>
 <label class="field"><span>ID login</span><input id="f-el" name="login" required autocomplete="off" value="${esc(x.login)}"></label>
 <label class="field"><span>Email</span><input id="f-ee" name="email" type="email" required value="${esc(x.email)}"></label>
 <label class="field"><span>WhatsApp</span><input id="f-ew" name="wa" inputmode="tel" value="${esc(x.wa||'')}"></label>
 ${isC?`<label class="field full"><span>Lokasi coach melatih</span><input id="f-eloc" name="loc" placeholder="Contoh: GBK Senayan, Jakarta" value="${esc(x.loc||'')}"></label>`:''}
 <div class="row full"><button class="btn primary" type="submit">Simpan perubahan</button><button class="btn" type="button" data-act="close">Batal</button></div></form>`)};
FORMS.memedit=f=>{
 const x=store.members.find(v=>v.id===f.get('id'));if(!x)return;
 const lg=f.get('login').trim();
 if(store.members.some(v=>v.id!==x.id&&v.login===lg)){toast('ID login sudah dipakai');return}
 x.name=f.get('name').trim();x.login=lg;x.email=f.get('email').trim();x.wa=(f.get('wa')||'').trim();
 if(x.role==='coach'||x.role==='head'){x.role=f.get('role')||x.role;x.loc=(f.get('loc')||'').trim()}
 logAct('mengedit anggota '+x.name);appState.modal=null;toast('Data '+first(x.name)+' diperbarui');render()};
FORMS.member=async f=>{const role=f.get('role'),d={name:f.get('name').trim(),role,login:f.get('login').trim(),email:f.get('email').trim(),wa:'',loc:(f.get('loc')||'').trim(),password:f.get('password')};
 const m=isApiMode()?await apiAddMember(d):null;
 const id=m?m.id:'u'+Date.now();
 if(!m)store.members.push({id,...d});
 if(role!=='admin'){COACHES.push(id);initCoach(id)}
 logAct('menambah anggota '+d.name);appState.modal=null;toast('Anggota ditambahkan');render()};
ACT.memdel=t=>{const m=store.members.find(x=>x.id===t.dataset.v);if(!m)return;appState.modal={k:'confirm',text:'Hapus anggota '+m.name+'? Akunnya tidak bisa masuk lagi.',yes:'delmem',arg:m.id,label:'Hapus anggota'};render()};
CONF.delmem=async id=>{const m=store.members.find(x=>x.id===id);if(isApiMode()){try{await apiDel('/members/'+id)}catch(e){
 if(String(e.message||'').startsWith('Tidak bisa dihapus')){appState.modal={k:'forcedel',kind:'member',id,name:m?m.name:id,detail:e.message};render();return}
 toast('Gagal hapus: '+e.message);return}}store.members=store.members.filter(x=>x.id!==id);const i=COACHES.indexOf(id);if(i>=0)COACHES.splice(i,1);store.book=store.book.filter(b=>b.coach!==id);logAct('menghapus anggota '+(m?m.name:id))};
