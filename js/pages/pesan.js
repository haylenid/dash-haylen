/* js/pages/pesan.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, meId, scope } from '../core/access.js';
import { apiSendBroadcast, apiSendDm, apiSendTeamMessage, isApiMode } from '../core/api.js';
import { COACHES, ROLE_USER_IDS } from '../core/constants.js';
import { liveClients } from '../core/derived.js';
import { ago, esc, first, hhmm } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, FORMS, PAGES } from '../core/registry.js';
import { senderName, markRead, openSince, readAt, ubBadge, unreadDm, unreadTotals, waktuPesan } from '../core/shared.js';
import { appState, findClientById, findProgramById, getMemberName, store } from '../core/store.js';
import { activePrograms, tabsBar } from '../ui/components.js';
import { render, toast } from '../ui/shell.js';

const bubbles=(arr,o={})=>{
 const me=meId();let shown=false;
 const rows=arr.map(m=>{
  const mine=m.w===me,isNew=!mine&&o.since!=null&&waktuPesan(m)>o.since;
  let pemisahBaru='';if(isNew&&!shown){shown=true;pemisahBaru='<div class="newdiv" role="separator"><span>Pesan baru</span></div>'}
  let statusThread='';if(mine&&o.peerRead!=null){const sudahDibaca=waktuPesan(m)<=o.peerRead;statusThread=`<span class="rd ${sudahDibaca?'ok':''}">${sudahDibaca?'✓✓ Sudah dibaca':'✓ Belum dibaca'}</span>`}
  return pemisahBaru+`<div class="bub ${mine?'me':''} ${isNew?'new':''}"><small>${mine?'Anda':esc(senderName(m.w))} · ${hhmm(new Date(m.t))}${isNew?'<em class="nb">BARU</em>':''}</small>${esc(m.text)}${statusThread}</div>`}).join('');
 return `<div class="chat">${rows||'<p class="sub">Belum ada pesan.</p>'}</div>`};
/* ringkasan tiap thread DM: pesan terakhir, jumlah belum dibaca, dan status */
const threadMeta=(c,me)=>{const th=store.msgs.dm[c.id]||[],last=th[th.length-1],u=unreadDm(c.id,me);let statusThread='';
 if(last){if(u)statusThread=`<small class="st un">● Belum dibaca (${u})</small>`;
  else if(String(last.w).startsWith('cl'))statusThread='<small class="st wt">Sudah dibaca · menunggu balasan</small>';
  else{const sudahDibaca=waktuPesan(last)<=readAt(c.id,'dm:'+c.id);statusThread=sudahDibaca?'<small class="st rd">✓✓ Sudah dibaca klien</small>':'<small class="st un">✓ Belum dibaca klien</small>'}}
 return{last,u,st:statusThread,t:last?waktuPesan(last):0}};
const msgForm=(kind,ph)=>`<form data-form="msg" data-kind="${kind}" class="row" style="flex-wrap:nowrap"><input id="f-msg-${kind}" name="text" placeholder="${ph}" required autocomplete="off" aria-label="${ph}"><button class="btn primary" type="submit" aria-label="Kirim">${icon('send',16)}</button></form>`;
function recips(v){let l=liveClients();if(appState.role==='coach')l=l.filter(c=>c.coach===meId());if(v.startsWith('p:'))l=l.filter(c=>c.pid===v.slice(2));if(v.startsWith('c:'))l=l.filter(c=>c.coach===v.slice(2));return l}
PAGES.pesan=()=>{
 const me=meId(),t=Math.min(appState.tab,2);let body='';if(t>1)appState.openMark=null;
 if(t===0){const batasBaca=openSince(me,'team');body=`<section class="card"><header class="ch"><h3>Ruang tim</h3><span class="sub">Pemilik, admin, head coach, dan semua coach</span></header>${bubbles(store.msgs.team,{since:batasBaca})}${msgForm('team','Tulis pesan untuk tim')}</section>`;markRead(me,'team')}
 if(t===1){
  const all=scope(liveClients());if(!all.some(c=>c.id===appState.chat)&&all[0])appState.chat=all[0].id;const mq=(appState.mq||'').trim().toLowerCase(),daftarKlien=mq?all.filter(c=>c.name.toLowerCase().includes(mq)||String(c.uid||'').toLowerCase().includes(mq)):all;
  const cur=findClientById(appState.chat),batasBaca=cur?openSince(me,'dm:'+cur.id):null;if(cur)markRead(me,'dm:'+cur.id);
  const meta={};daftarKlien.forEach(c=>{meta[c.id]=threadMeta(c,me)});
  const cs=daftarKlien.slice().sort((a,b)=>(meta[b.id].t-meta[a.id].t)||a.name.localeCompare(b.name));
  body=`<div class="msgs"><section class="card"><header class="ch"><h3>Member</h3><span class="sub">${cs.length} dari ${all.length}</span></header><input id="mq" data-qm type="search" placeholder="Cari nama atau ID klien" value="${esc(appState.mq||'')}" aria-label="Cari klien" style="margin-bottom:8px"><div class="listv" style="gap:2px;max-height:60vh;overflow:auto">${!cs.length?'<p class="sub">Klien tidak ditemukan.</p>':''}${cs.map(c=>{const m=meta[c.id];return `<button class="th ${m.u?'unread':''}" data-act="thread" data-v="${c.id}" aria-pressed="${appState.chat===c.id}" aria-label="${esc(c.name)}${m.u?', '+m.u+' pesan belum dibaca':''}"><span class="tr">${m.u?'<i class="udot"></i>':''}<b>${esc(c.name)}</b>${m.last?`<time>${ago(new Date(m.last.t))}</time>`:''}${m.u?`<i class="ub">${m.u}</i>`:''}</span><small class="pv">${m.last?esc(m.last.text):'Belum ada pesan'}</small>${m.st}</button>`}).join('')}</div></section>
  <section class="card"><header class="ch"><h3>${esc(findClientById(appState.chat)?.name||'')}</h3><span class="sub">${esc(first(getMemberName(findClientById(appState.chat)?.coach||'')))} sebagai coach</span></header>${bubbles(store.msgs.dm[appState.chat]||[],{since:batasBaca,peerRead:cur?readAt(cur.id,'dm:'+cur.id):null})}${msgForm('dm','Tulis pesan untuk member')}</section></div>`}
 if(t===2){
  const v=appState.bcTo,n=recips(v).length;
  body=`<section class="card"><header class="ch"><h3>Broadcast baru</h3></header><form data-form="bc" class="fg"><label class="field"><span>Penerima</span><select id="f-bcto" data-f="bcTo">${appState.role==='coach'?`<option value="all" ${v==='all'?'selected':''}>Semua klien saya</option>`:`<option value="all" ${v==='all'?'selected':''}>Semua klien aktif</option>${activePrograms().map(p=>`<option value="p:${p.id}" ${v==='p:'+p.id?'selected':''}>Paket ${esc(p.name)}</option>`).join('')}${COACHES.map(c=>`<option value="c:${c}" ${v==='c:'+c?'selected':''}>Klien ${esc(first(getMemberName(c)))}</option>`).join('')}`}</select></label><div class="field"><span>Jumlah penerima</span><b class="mono" style="padding:8px 0">${n} klien</b></div><label class="field full"><span>Pesan</span><textarea id="f-bctext" name="text" required placeholder="Tulis pengumuman untuk klien"></textarea></label><div class="row full"><button class="btn primary" type="submit" ${n?'':'disabled'}>${icon('send',15)} Kirim broadcast</button></div></form></section>
  <section class="card"><header class="ch"><h3>Riwayat broadcast</h3></header><div class="listv">${store.msgs.bc.map(b=>`<div class="li"><div><b>${esc(b.to)} · ${b.n} klien</b><small>${esc(b.text)}</small></div><span class="sub">${esc(first(getMemberName(b.by)))} · ${ago(b.t)}</span></div>`).join('')||'<p class="sub">Belum ada broadcast.</p>'}</div></section>`}
 const un=unreadTotals(),tabs=['Pesan tim'+ubBadge(un.team),'Pesan member'+ubBadge(un.dm),'Broadcast'];
 return `<div class="stackv">${tabsBar(tabs)}${body}</div>`};
FORMS.msg=async (f,form)=>{const text=f.get('text').trim();if(!text)return;
 if(isApiMode()){
  if(form.dataset.kind==='team')await apiSendTeamMessage(text);
  else await apiSendDm(appState.chat,text);
 }else{
  const m={w:meId(),text,t:new Date()};
  if(form.dataset.kind==='team')store.msgs.team.push(m);
  else{(store.msgs.dm[appState.chat]=store.msgs.dm[appState.chat]||[]).push(m)}
 }
 logAct(form.dataset.kind==='team'?'menulis di ruang tim':'membalas '+findClientById(appState.chat).name);render()};
FORMS.bc=async f=>{const v=appState.bcTo,n=recips(v).length;let to='Semua klien aktif';if(v.startsWith('p:'))to='Paket '+findProgramById(v.slice(2)).name;if(v.startsWith('c:'))to='Klien '+first(getMemberName(v.slice(2)));if(appState.role==='coach')to='Klien saya';
 const text=f.get('text').trim();
 if(isApiMode())await apiSendBroadcast(to,text,n);
 else store.msgs.bc.unshift({id:'b'+Date.now(),to,n,text,t:new Date(),by:meId()});
 logAct('mengirim broadcast ke '+to);toast('Broadcast terkirim ke '+n+' klien');render()};
ACT.thread=t=>{appState.chat=t.dataset.v;render()};

export { bubbles, msgForm, recips };
