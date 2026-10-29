/* js/pages/absensi.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, meId, meUser, scope } from '../core/access.js';
import { apiDel, apiPatch, apiPost, apiSaveAttendance, apiSaveClient, apiSaveRequest, isApiMode } from '../core/api.js';
import { COACHES, REQUEST_TYPE_KEYS, REQUEST_TYPE_LABELS, ROLE_USER_IDS } from '../core/constants.js';
import { liveClients, offOn, offSlot } from '../core/derived.js';
import { TODAY, addD, dIdx, esc, first, fmtD, hhmm, iso, parseDate } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, FORMS, MODALS, PAGES } from '../core/registry.js';
import { ATT_MIN, attOpen, attOpenAt, locOf, sessionsOn } from '../core/shared.js';
import { appState, findClientById, findProgramById, getClientEndDate, getMemberName, store } from '../core/store.js';
import { banner, kpi, pill, sheet, tabsBar } from '../ui/components.js';
import { render, toast } from '../ui/shell.js';

const whoName=r=>r.type==='izin_client'?(findClientById(r.who)?.name||'-'):getMemberName(r.who);
function attList(){
 const isC=appState.role==='coach',sel=isC?meId():(appState.acoach||COACHES[0]),all=!isC&&sel==='all';
 const cos=all?COACHES.slice():[sel];
 let dk=appState.adate||iso(TODAY);if(parseDate(dk)>TODAY)dk=iso(TODAY);
 store.attSlot=store.attSlot||{};
 const per=cos.map(co=>{
  const by={};sessionsOn(co,parseDate(dk)).forEach(r=>{(by[r.time]=by[r.time]||[]).push({n:r.c.name+' ('+((findProgramById(r.c.pid)||{}).name||'-')+')',tag:r.titipFrom?'Titipan dari '+first(getMemberName(r.titipFrom)):r.makeup?'Sesi pengganti':r.pengganti?'Sesi pengganti (undur)':null})});
  return{co,slots:Object.keys(by).sort().map(t=>({co,t,names:by[t],rec:store.attSlot[dk+'|'+co+'|'+t]||null,ok:attOpen(dk,t)}))}});
 const all_=[].concat(...per.map(x=>x.slots));
 const done=all_.filter(x=>x.rec).length,open=all_.filter(x=>!x.rec&&x.ok).length,lock=all_.filter(x=>!x.rec&&!x.ok).length;
 /* Masalah 5: jejak informatif pada hari cuti penuh — sessionsOn memang kosong
    by design, tetapi sesi yang dialihkan harus tetap terlihat (tampilan saja,
    tidak masuk hitungan jadwal/KPI di atas). */
 const jejak=co=>{
  if(!offOn(co,dk))return[];
  const di2=dIdx(parseDate(dk));
  return store.book.filter(b=>b.coach===co&&b.day===di2&&findClientById(b.client)&&!findClientById(b.client).arch&&!offSlot(co,dk,b.time))
   .filter(b=>{const c=findClientById(b.client);return dk>=c.start&&dk<=getClientEndDate(c)})
   .map(b=>{const c=findClientById(b.client);const tp=(store.titip||[]).find(t=>t.client===c.id&&t.date===dk);const mk=(store.makeup||[]).filter(t=>t.client===c.id&&t.date>dk).sort((a,z)=>a.date<z.date?-1:1)[0];
    return{t:b.time,n:c.name,ket:tp?'dialihkan ke '+getMemberName(tp.to)+' (titip)':mk?'diundur — sesi pengganti '+fmtD(parseDate(mk.date))+' pukul '+mk.time:'diundur — sesi pengganti di ekor program'}})
   .sort((a,z)=>a.t<z.t?-1:1)};
 const jejakHtml=co=>{const j=jejak(co);return j.length?`<div class="listv"><p class="sub" style="margin:0">Cuti disetujui pada tanggal ini — sesi berikut tidak berlangsung di sini:</p>${j.map(x=>`<div class="li"><div><b>${x.t} · ${esc(x.n)}</b><small>${esc(x.ket)}</small></div></div>`).join('')}</div>`:''};
 const item=x=>{
  const co=x.co,st=x.rec?x.rec.s:null,end=hhmm(attOpenAt(dk,x.t));
  const btns=[['Hadir','Konfirmasi hadir'],['Tidak hadir','Tidak hadir']].map(([v,l])=>`<button class="btn sm ${st===v?'primary':''}" data-act="cattset" data-d="${dk}" data-co="${co}" data-t="${x.t}" data-s="${v}" ${x.ok?'':'disabled'} aria-pressed="${st===v}">${l}</button>`).join('');
  const info=st?pill(st==='Hadir'?'Hadir':'Tidak hadir',st==='Hadir'?'good':'bad'):(x.ok?pill('Menunggu konfirmasi','warn'):pill('Terkunci sampai '+end,'info'));
  const tags=x.names.filter(e=>e.tag).map(e=>esc(e.n.slice(0,e.n.lastIndexOf(' (')))+' — '+esc(e.tag)).join(' · ');
  const body=appState.attCompact
   ?`<div style="flex:1;min-width:200px"><b>${x.t} - ${end} WIB</b><small>${all?esc(first(getMemberName(co)))+' · ':''}${esc(locOf(co))} · ${x.names.map(e=>esc(e.n.slice(0,e.n.lastIndexOf(' (')))).join(', ')}</small>${tags?`<small style="color:var(--warn);font-weight:700">${tags}</small>`:''}</div>`
   :`<div style="flex:1;min-width:220px"><small style="color:${x.rec?'var(--good)':'var(--warn)'};font-weight:700">${x.rec?esc(getMemberName(co))+', absensi jadwal ini sudah dikonfirmasi.':(isC?esc(getMemberName(co))+', kamu memiliki jadwal absensi yang harus kamu konfirmasi.':esc(getMemberName(co))+' memiliki jadwal absensi yang harus dikonfirmasi.')}</small><b>Jadwal melatih ${x.t} - ${end} WIB</b><small><b>Coach:</b> ${esc(getMemberName(co))}</small><small><b>Lokasi melatih:</b> ${esc(locOf(co))}</small><small><b>Klien yang dilatih:</b> ${x.names.map(e=>esc(e.n)+(e.tag?' · '+esc(e.tag):'')).join('; ')}</small><small><b>Absensi bisa diisi:</b> mulai pukul ${end} (setelah jadwal selesai)</small>${x.rec?`<small><b>Status:</b> ${x.rec.s==='Hadir'?'Coach hadir melatih':'Coach tidak hadir'}, dikonfirmasi oleh ${esc(x.rec.by)} pukul ${x.rec.at}</small>`:''}</div>`;
  return `<div class="li" style="align-items:flex-start;flex-wrap:wrap;gap:8px">${body}<div class="acts">${info}${btns}</div></div>`};
 const list=all
  ?per.map(x=>`<div class="listv"><h4 style="margin:6px 0 0;font-size:14px">${esc(getMemberName(x.co))} <span class="sub">· ${esc(locOf(x.co))} · ${x.slots.length} jadwal</span></h4>${x.slots.map(item).join('')||jejakHtml(x.co)||'<p class="sub" style="margin:0">Tidak ada jadwal melatih pada tanggal ini.</p>'}</div>`).join('')
  :(all_.map(item).join('')||jejakHtml(sel)||'<section class="card"><p class="sub">Tidak ada jadwal melatih pada tanggal ini.</p></section>');
 const picker=isC?'':`<label class="field" style="max-width:260px"><span>Coach</span><select data-f="acoach"><option value="all" ${all?'selected':''}>Semua coach</option>${COACHES.map(c=>`<option value="${c}" ${sel===c?'selected':''}>${esc(getMemberName(c))}</option>`).join('')}</select></label>`;
 return `<div class="toolbar">${picker}<label class="field" style="max-width:200px"><span>Tanggal melatih</span><input type="date" data-f="adate" max="${iso(TODAY)}" value="${dk}"></label><span class="sp"></span><div class="row"><span class="sub" id="lb-cmp">Ringkas keterangan</span><button type="button" class="swt" role="switch" aria-checked="${!!appState.attCompact}" aria-labelledby="lb-cmp" data-act="attcompact"><i></i></button></div></div>
 <div class="kpis">${kpi('Jadwal melatih',all_.length,all?cos.length+' coach':esc(locOf(sel)))}${kpi('Sudah dikonfirmasi',done,'')}${kpi('Siap dikonfirmasi',open,'jadwal sudah lewat')}${kpi('Terkunci',lock,'belum waktunya')}</div>
 ${banner('Absensi coach hanya bisa dikonfirmasi setelah jadwal melatih selesai, yaitu '+ATT_MIN+' menit setelah jam mulai. Tombol aktif otomatis saat waktunya tiba. Konfirmasi Hadir langsung tampil di dashboard Pemilik.','info')}
 <div class="listv">${list}</div>`}
PAGES.absensi=()=>{
 const t=Math.min(appState.tab,6);
 if(t===0){return `<div class="stackv">${tabsBar(['Daftar Hadir'].concat(REQUEST_TYPE_KEYS.map(k=>REQUEST_TYPE_LABELS[k])))}${attList()}</div>`}
 const type=REQUEST_TYPE_KEYS[t-1];
 let list=store.reqs.filter(r=>r.type===type);
 if(appState.role==='coach')list=list.filter(r=>type==='izin_client'?findClientById(r.who)?.coach===meId():r.who===meId());
 /* Filter tanggal (seperti 'Tanggal melatih' di Daftar Hadir): kosong = semua.
    Reschedule dicocokkan ke ujungnya saja (jadwal lama ATAU baru), bukan
    hari-hari di antaranya; jenis lain (termasuk Report Masalah yang
    date==date2==tanggal lapor) dicocokkan ke rentang date s/d date2. */
 const fd=appState.reqdate||'';
 if(fd)list=list.filter(r=>r.type==='reschedule'?(r.date===fd||(r.date2||r.date)===fd):(fd>=(r.date||'')&&fd<=(r.date2||r.date||'')));
 const mine=appState.role==='coach',all=store.reqs.filter(r=>!mine||(r.type==='izin_client'?findClientById(r.who)?.coach===meId():r.who===meId()));
 return `<div class="stackv"><div class="kpis">${kpi('Menunggu keputusan',all.filter(r=>r.status==='Menunggu').length,'semua jenis')}${kpi('Disetujui',all.filter(r=>r.status==='Disetujui').length,'memengaruhi kalender')}${kpi('Ditolak',all.filter(r=>r.status==='Ditolak').length,'')}</div>
 ${tabsBar(['Daftar Hadir'].concat(REQUEST_TYPE_KEYS.map(k=>REQUEST_TYPE_LABELS[k])))}
 <div class="toolbar"><label class="field" style="max-width:200px"><span>Tanggal</span><input type="date" data-f="reqdate" value="${fd}"></label><span class="sub">${list.length} pengajuan</span><span class="sp"></span><button class="btn primary" data-act="modal" data-v="req">${icon('plus',15)} ${type==='masalah'?'Laporkan masalah':'Ajukan '+REQUEST_TYPE_LABELS[type].toLowerCase()}</button></div>
 <div class="listv">${list.sort((a,b)=>b.at-a.at).map(r=>`<div class="li"><div><b>${esc(whoName(r))} ${r.sev?pill(r.sev,r.sev==='Tinggi'?'bad':'warn'):''}</b><small>${r.type==='masalah'?'':fmtD(r.date)+(r.date2&&r.date2!==r.date?' - '+fmtD(r.date2)+' · ':' · ')}${esc(r.detail)}</small>${!mine&&r.status==='Disetujui'&&['izin_coach','cuti','berhalangan'].includes(r.type)&&titipTerlatih(r).length?'<small>Sesi titipan sudah dilatih pengganti — pembatalan persetujuan dinonaktifkan agar komisi pengganti tidak hilang.</small>':''}</div><div class="acts">${pill(r.status,{Menunggu:'warn',Disetujui:'good',Ditolak:'bad',Selesai:'good'}[r.status])}${!mine&&r.status==='Menunggu'?(r.type==='masalah'?`<button class="btn sm" data-act="reqset" data-v="${r.id}" data-s="Selesai">Tandai selesai</button>`:`<button class="btn sm primary" data-act="reqset" data-v="${r.id}" data-s="Disetujui">Setujui</button><button class="btn sm" data-act="reqset" data-v="${r.id}" data-s="Ditolak">Tolak</button>`):''}${!mine&&r.status==='Disetujui'&&['izin_coach','cuti','berhalangan'].includes(r.type)?undoBtn(r):''}</div></div>`).join('')||('<section class="card"><p class="sub">'+(fd?('Tidak ada pengajuan pada '+fmtD(parseDate(fd))+'.'):'Belum ada pengajuan pada kategori ini.')+'</p></section>')}</div></div>`};
MODALS.req=()=>{
 const type=REQUEST_TYPE_KEYS[Math.max(0,Math.min(appState.tab,6)-1)],mine=appState.role==='coach';
 const whoOpts=type==='izin_client'?scope(liveClients()).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join(''):(mine?`<option value="${meId()}">${esc(getMemberName(meId()))}</option>`:COACHES.map(c=>`<option value="${c}">${esc(getMemberName(c))}</option>`).join(''));
 const rs=type==='reschedule';
 return sheet(type==='masalah'?'Laporkan masalah':'Ajukan '+REQUEST_TYPE_LABELS[type].toLowerCase(),`<form data-form="req" class="fg"><input type="hidden" name="type" value="${type}">
 <label class="field"><span>${type==='izin_client'?'Klien':type==='masalah'?'Pelapor':'Coach'}</span><select name="who" ${mine&&type!=='izin_client'?'disabled':''}>${type==='masalah'?`<option value="${meId()}">${esc(meUser().name)}</option>`:whoOpts}</select></label>
 ${type==='masalah'?`<label class="field"><span>Tingkat</span><select name="sev"><option>Rendah</option><option selected>Sedang</option><option>Tinggi</option></select></label>`:`<label class="field"><span>${rs?'Jadwal lama (tanggal)':'Tanggal mulai'}</span><input id="f-rd1" name="date" type="date" value="${iso(TODAY)}" required></label><label class="field"><span>${rs?'Jadwal baru (tanggal)':'Tanggal selesai'}</span><input id="f-rd2" name="date2" type="date" value="${iso(TODAY)}" required></label>`}
 <label class="field full"><span>${type==='masalah'?'Jelaskan masalah':rs?'Detail sesi dan alasan':'Alasan'}</span><textarea id="f-rdet" name="detail" required placeholder="Tulis dengan singkat dan jelas"></textarea></label>
 <div class="row full"><button class="btn primary" type="submit">Kirim</button><button class="btn" type="button" data-act="close">Batal</button></div></form>`)};
FORMS.req=async f=>{
 const type=f.get('type');
 const d={type,date:f.get('date')||iso(TODAY),date2:f.get('date2')||f.get('date')||iso(TODAY),detail:f.get('detail').trim()};
 if(isApiMode()){
   try{await apiSaveRequest(d)}catch(e){console.error('Gagal simpan pengajuan:',e);toast('Gagal menyimpan: '+(e.message||e));return}
 }else{
   const who=appState.role==='coach'&&type!=='izin_client'?meId():f.get('who');
   store.reqs.push({id:'r'+Date.now(),type,who:type==='masalah'?meId():who,...d,sev:f.get('sev')||undefined,status:'Menunggu',at:new Date()});
 }
 logAct('mengajukan '+REQUEST_TYPE_LABELS[type].toLowerCase());appState.modal=null;toast('Terkirim dan langsung tampil di portal Pemilik');render()};
ACT.attcompact=()=>{appState.attCompact=!appState.attCompact;render()};
ACT.cattset=async t=>{
 const k=t.dataset.d,co=t.dataset.co,tm=t.dataset.t,v=t.dataset.s;
 if(!['Hadir','Tidak hadir'].includes(v)||!COACHES.includes(co))return;
 if(appState.role==='coach'&&co!==meId()){toast('Hanya bisa mengisi absensi Anda sendiri');return}
 if(parseDate(k)>TODAY||!attOpen(k,tm)){toast('Belum bisa diisi. Terbuka pukul '+hhmm(attOpenAt(k,tm))+' (jadwal selesai)');render();return}
 store.attSlot=store.attSlot||{};
 store.attSlot[k+'|'+co+'|'+tm]={s:v,by:meUser().name,at:hhmm(new Date())};
 if(isApiMode()){try{await apiSaveAttendance(k,co,tm,v,meUser().name,hhmm(new Date()))}catch(e){console.error('Gagal simpan absensi:',e);toast('Gagal simpan ke server: '+(e.message||e));delete store.attSlot[k+'|'+co+'|'+tm];render();return}}
 /* sinkron ke absensi harian coach (dipakai dashboard) */
 const recs=Object.keys(store.attSlot).filter(x=>x.startsWith(k+'|'+co+'|')).map(x=>({t:x.split('|')[2],s:store.attSlot[x].s}));
 const hd=recs.filter(r=>r.s==='Hadir').map(r=>r.t).sort();
 store.attCoach[co]=store.attCoach[co]||{};
 if(hd.length){const end=hhmm(attOpenAt(k,hd[hd.length-1]));store.attCoach[co][k]={in:hd[0],out:end}}
 else store.attCoach[co][k]={status:'Alpha'};
 logAct('mengonfirmasi absensi coach '+getMemberName(co)+' ('+v+') '+tm);
 toast('Absensi '+first(getMemberName(co))+' jam '+tm+': '+v);render()};
/* Komisi Bulanan Fase A — dukungan DIUNDUR (keputusan pemilik): sesi klien yang
   hilang karena izin/cuti coach diganti di ekor masa program; tanggal selesai
   klien digeser maju sejumlah sesi yang hilang. undurHitung menghitung dampak
   per klien: sesi hilang dalam rentang pengajuan + tanggal selesai baru. */
const undurHitung=r=>{
 if(!['izin_coach','cuti','berhalangan'].includes(r.type))return[];
 const out=[];
 store.clients.filter(c=>c.coach===r.who&&!c.arch).forEach(c=>{
  const slots=store.book.filter(b=>b.client===c.id);if(!slots.length)return;
  const a=parseDate(r.date),z=parseDate(r.date2||r.date);let lost=0;const occ=[];
  for(let d=new Date(a);d<=z;d=addD(d,1)){
   const k=iso(d);if(k<c.start||k>getClientEndDate(c))continue;
   slots.forEach(s=>{if(s.day!==dIdx(d))return;
    // Sesi yang hilang bisa jadi sesi PENGGANTI itu sendiri: catatan sesi
    // pengganti pada tanggal+jam ini, atau sesi ekor hasil undur sebelumnya
    // (tanggalnya melewati tanggal selesai asal klien).
    const ganti=(store.makeup||[]).some(t=>t.client===c.id&&t.date===k&&t.time===s.time)||!!(c.end_orig&&k>c.end_orig);
    if(r.type==='berhalangan'&&r.t1){if(s.time>=r.t1&&s.time<r.t2){lost++;occ.push({date:k,time:s.time,ganti})}}
    else{lost++;occ.push({date:k,time:s.time,ganti})}});
  }
  if(!lost)return;
  const days=new Set(slots.map(s=>s.day));let add=0,d=addD(parseDate(getClientEndDate(c)),1),guard=0;
  while(add<lost&&guard++<370){if(days.has(dIdx(d))&&!offOn(r.who,iso(d)))add++;d=addD(d,1)}
  // Penempatan bawaan sesi pengganti: kemunculan pola pertama setelah tanggal
  // selesai saat ini (hari latihan klien, melompati libur coach) sejumlah sesi
  // yang hilang. Pemilik boleh mengubah tanggal + jam tiap penempatan di modal.
  const place=[];let pd=addD(parseDate(getClientEndDate(c)),1),pg=0;
  while(place.length<lost&&pg++<370){
   const pk=iso(pd);
   if(!offOn(r.who,pk))slots.filter(s=>s.day===dIdx(pd)).sort((x,y)=>x.time<y.time?-1:1).forEach(s=>{if(place.length<lost)place.push({date:pk,time:s.time})});
   pd=addD(pd,1);
  }
  out.push({c,lost,occ,place,lostGanti:occ.filter(o=>o.ganti).length,endLama:getClientEndDate(c),endBaru:iso(addD(d,-1))});
 });
 return out;
};
/* Hari libur penuh coach akibat izin LAIN yang sudah disetujui (mengecualikan
   pengajuan r itu sendiri) — dipakai penempatan sesi pengganti & pemulihan. */
const offSelain=(r,coach,k)=>store.reqs.some(q=>q.id!==r.id&&q.status==='Disetujui'&&['izin_coach','cuti','berhalangan'].includes(q.type)&&!q.t1&&q.who===coach&&k>=q.date&&k<=(q.date2||q.date));
/* Dampak PEMBATALAN persetujuan izin: catatan titip & sesi pengganti milik
   pengajuan ini terhapus; tanggal selesai klien yang digeser pengajuan ini
   dipulihkan dengan berjalan mundur sejauh sesi hilangny (menghormati izin
   lain yang masih disetujui). Bila mundur sampai tanggal asal, end_orig
   dibersihkan (tuntas). */
/* Aturan titip (2026-10-22): sesi titipan yang SUDAH DILATIH coach pengganti
   (attSlot Hadir pada tanggal+jam titipan) mengunci pembatalan persetujuan —
   menghapus catatan titip sesudah itu menghilangkan komisi pengganti yang
   sudah terbit. Daftar tombol, modal, dan eksekusi memakai penjaga yang sama. */
const titipTerlatih=r=>(store.titip||[]).filter(t=>t.req===r.id&&((store.attSlot||{})[t.date+'|'+t.to+'|'+t.time]||{}).s==='Hadir');
const undoBtn=r=>titipTerlatih(r).length?`<button class="btn sm" data-act="requndo" data-v="${r.id}" disabled title="Sesi titipan pengajuan ini sudah dilatih coach pengganti — pembatalan akan menghapus komisinya">Batalkan persetujuan</button>`:`<button class="btn sm" data-act="requndo" data-v="${r.id}">Batalkan persetujuan</button>`;
const pulihHitung=r=>{
 const daftar=undurHitung(r);
 const titipDihapus=(store.titip||[]).filter(t=>t.req===r.id);
 const makeupDihapus=(store.makeup||[]).filter(t=>t.req===r.id);
 const pulih=[];
 daftar.filter(x=>x.c.end_orig).forEach(x=>{
  const days=new Set(store.book.filter(b=>b.client===x.c.id).map(b=>b.day));
  let cnt=0,d=parseDate(getClientEndDate(x.c)),t1=null,g=0;
  while(cnt<x.lost&&g++<370){
   if(days.has(dIdx(d))&&!offSelain(r,r.who,iso(d))){cnt++;t1=iso(d)}
   if(cnt<x.lost)d=addD(d,-1);
  }
  if(!t1)return;
  const e1=iso(addD(parseDate(t1),-1));
  let sisa=0;for(let dd=addD(parseDate(x.c.end_orig),1);dd<=parseDate(e1);dd=addD(dd,1))if(days.has(dIdx(dd)))sisa++;
  if(!sisa){pulih.push({c:x.c,lost:x.lost,dari:getClientEndDate(x.c),baru:x.c.end_orig,tuntas:true});return}
  let d2=parseDate(e1),g2=0;while(!days.has(dIdx(d2))&&g2++<370)d2=addD(d2,-1);
  pulih.push({c:x.c,lost:x.lost,dari:getClientEndDate(x.c),baru:iso(d2),tuntas:false});
 });
 return{titipDihapus,makeupDihapus,pulih};
};
const applyReq=async(r,st)=>{
 if(isApiMode()){await apiPatch('/requests/'+r.id,{status:st});r.status=st}
 else r.status=st;
};
MODALS.undur=m=>{
 const r=store.reqs.find(x=>x.id===m.id);if(!r)return '';
 const daftar=undurHitung(r);
 const pengganti=COACHES.filter(c=>c!==r.who);
 return sheet('Izin coach — pilih tindak lanjut',`<p><b>${esc(whoName(r))}</b> — ${esc(REQUEST_TYPE_LABELS[r.type])} ${fmtD(parseDate(r.date))}${r.date2&&r.date2!==r.date?' s/d '+fmtD(parseDate(r.date2)):''}.</p>
 <p class="sub">Sesi klien berikut hilang pada masa izin ini. Sesuai aturan pemilik, pilih salah satu: <b>diundur</b> (tanggal selesai klien bergeser, coach tetap melatih sampai jumlah sesi terpenuhi) atau <b>dititipkan</b> ke coach pengganti (sesi tetap berjalan di tanggal yang sama; komisi sesi menjadi milik pengganti). Tidak ada pilihan ketiga: sesi tidak boleh hangus.</p>
 <div class="listv">${daftar.map(x=>`<div class="li" style="display:block"><div><b>${esc(x.c.name)}</b><small>${x.lost} sesi hilang · selesai ${fmtD(parseDate(x.endLama))} → <b>${fmtD(parseDate(x.endBaru))}</b> bila diundur${x.lostGanti?` · <b>termasuk ${x.lostGanti} sesi pengganti</b>`:''}</small></div>
 <div style="margin-top:6px">${x.occ.map((o,i)=>{const p=x.place[i]||{date:x.endBaru,time:o.time};return `<div class="row" style="gap:6px;align-items:center;margin-top:4px"><span class="sub" style="min-width:190px">Pengganti ${fmtD(parseDate(o.date))} · ${esc(o.time)}${o.ganti?' (sesi pengganti)':''} →</span><input type="date" id="mk-d-${x.c.id}-${i}" value="${p.date}"><input type="time" id="mk-t-${x.c.id}-${i}" value="${p.time}"></div>`}).join('')}
 <small class="sub">Tanggal + jam sesi pengganti boleh diubah (mis. kesepakatan dengan klien); bawaan = ekor pola otomatis.</small></div></div>`).join('')}</div>
 <div class="row" style="margin-top:12px"><button class="btn primary" data-act="undurya" data-v="${r.id}">Setujui & geser tanggal (undur)</button><button class="btn" data-act="close">Batal</button></div>
 <div class="fg" style="margin-top:14px"><label class="field full"><span>Atau titipkan sesi ke coach pengganti</span><select id="f-titipcoach">${pengganti.map(c=>`<option value="${c}">${esc(getMemberName(c))}</option>`).join('')}</select></label>
 <div class="row full"><button class="btn primary" data-act="undurtitip" data-v="${r.id}">Setujui & titipkan sesi</button><button class="btn" data-act="close">Batal</button></div></div>`)};
ACT.undurtitip=async t=>{
 const r=store.reqs.find(x=>x.id===t.dataset.v);if(!r)return;
 const sel=document.getElementById('f-titipcoach'),target=sel?sel.value:'';
 if(!target){toast('Pilih coach pengganti dulu');return}
 const daftar=undurHitung(r);
 try{await applyReq(r,'Disetujui')}
 catch(e){toast('Gagal menyimpan: '+(e.message||e));return}
 store.titip=store.titip||[];
 let gagal=0,tot=0;
 for(const x of daftar){
  for(const o of x.occ){
   tot++;
   try{
    if(isApiMode()){
     const raw=await apiPost('/titip',{client_id:x.c.id,date:o.date,from_coach:r.who,to_coach:target,time:o.time,request_id:r.id});
     store.titip.push({id:raw.id,client:raw.client_id,date:raw.date,from:raw.from_coach,to:raw.to_coach,time:raw.time,req:raw.request_id});
    }else store.titip.push({id:'tp'+Date.now()+'-'+tot,client:x.c.id,date:o.date,from:r.who,to:target,time:o.time,req:r.id});
   }catch(e){gagal++}
  }
 }
 appState.modal=null;
 logAct('menyetujui '+REQUEST_TYPE_LABELS[r.type].toLowerCase()+' '+whoName(r)+' + menitipkan '+tot+' sesi ke '+getMemberName(target));
 toast(gagal?'Disetujui, tapi '+gagal+' titipan gagal dibuat':'Disetujui. '+tot+' sesi dititipkan ke '+first(getMemberName(target)));render()};
ACT.reqset=async t=>{
 const r=store.reqs.find(x=>x.id===t.dataset.v);if(!r)return;
 const st=t.dataset.s;
 if(st==='Disetujui'&&['izin_coach','cuti','berhalangan'].includes(r.type)&&undurHitung(r).length){appState.modal={k:'undur',id:r.id};render();return}
 try{await applyReq(r,st)}
 catch(e){console.error('Gagal update status:',e);toast('Gagal menyimpan: '+(e.message||e));return}
 logAct((st==='Disetujui'?'menyetujui ':st==='Ditolak'?'menolak ':'menyelesaikan ')+REQUEST_TYPE_LABELS[r.type].toLowerCase()+' '+whoName(r));
 toast(['izin_coach','cuti','berhalangan'].includes(r.type)&&st==='Disetujui'?'Disetujui. Kalender coach diperbarui':'Status diperbarui');render()};
ACT.undurya=async t=>{
 const r=store.reqs.find(x=>x.id===t.dataset.v);if(!r)return;
 const daftar=undurHitung(r);
 try{await applyReq(r,'Disetujui')}
 catch(e){toast('Gagal menyimpan: '+(e.message||e));return}
 store.makeup=store.makeup||[];
 let gagal=0,totSesi=0,totCatat=0,balik=0;
 for(const x of daftar){
  totSesi+=x.lost;
  // Penempatan tiap sesi hilang dibaca dari editor modal. Tanggal yang jatuh
  // pada hari libur penuh coach (izin LAIN yang sudah disetujui) dikembalikan
  // ke bawaan ekor pola — sesi pengganti tidak boleh jatuh di hari coach libur.
  const places=x.occ.map((o,i)=>{
   const bawaan=x.place[i]||{date:x.endBaru,time:o.time};
   const de=document.getElementById('mk-d-'+x.c.id+'-'+i),te=document.getElementById('mk-t-'+x.c.id+'-'+i);
   const p={date:(de&&de.value)||bawaan.date,time:(te&&te.value)||bawaan.time};
   if(p.date!==bawaan.date&&offSelain(r,r.who,p.date)){balik++;return bawaan}
   return p;
  });
  let endFinal=x.endBaru;places.forEach(p=>{if(p.date>endFinal)endFinal=p.date});
  // Penempatan yang persis merupakan kemunculan pola di dalam masa program
  // baru tidak butuh catatan — slot polanya tampil & terhitung sendiri.
  // Sisanya menjadi catatan sesi pengganti (tanggal + jam pilihan pemilik).
  for(const p of places){
   const pola=store.book.some(b=>b.client===x.c.id&&b.day===dIdx(parseDate(p.date))&&b.time===p.time);
   if(pola&&p.date>=x.c.start&&p.date<=endFinal)continue;
   try{
    if(isApiMode()){
     const raw=await apiPost('/makeup',{client_id:x.c.id,coach_id:r.who,date:p.date,time:p.time,request_id:r.id});
     store.makeup.push({id:raw.id,client:raw.client_id,coach:raw.coach_id,date:raw.date,time:raw.time,req:raw.request_id});
    }else store.makeup.push({id:'mk'+Date.now()+'-'+totCatat,client:x.c.id,coach:r.who,date:p.date,time:p.time,req:r.id});
    totCatat++;
   }catch(e){gagal++}
  }
  try{
   if(isApiMode())await apiSaveClient({id:x.c.id,end:endFinal,end_orig:x.c.end_orig||x.endLama});
   else{x.c.end=endFinal;if(!x.c.end_orig)x.c.end_orig=x.endLama}
  }catch(e){gagal++}
 }
 appState.modal=null;
 logAct('menyetujui '+REQUEST_TYPE_LABELS[r.type].toLowerCase()+' '+whoName(r)+' + menggeser tanggal selesai '+daftar.length+' klien ('+totSesi+' sesi diundur, '+totCatat+' sesi pengganti terjadwal manual)');
 toast(gagal?'Disetujui, tapi '+gagal+' langkah gagal — periksa menu Klien':'Disetujui. '+totSesi+' sesi diganti di ekor program '+daftar.length+' klien'+(totCatat?' ('+totCatat+' ditempatkan manual)':'')+(balik?' — '+balik+' penempatan dikembalikan ke bawaan (hari libur coach)':''));render()};

MODALS.requndo=m=>{
 const r=store.reqs.find(x=>x.id===m.id);if(!r)return '';
 const terlatih=titipTerlatih(r);
 if(terlatih.length)return sheet('Batalkan persetujuan izin?',`<p><b>${esc(whoName(r))}</b> — ${esc(REQUEST_TYPE_LABELS[r.type])} ${fmtD(parseDate(r.date))}${r.date2&&r.date2!==r.date?' s/d '+fmtD(parseDate(r.date2)):''} <b>tidak bisa dibatalkan</b>.</p>
 <div class="listv">${terlatih.map(t=>{const c=findClientById(t.client);return `<div class="li"><div><b>${esc(c?c.name:'-')}</b><small>sesi titipan ${fmtD(parseDate(t.date))} pukul ${esc(t.time)} sudah dilatih ${esc(getMemberName(t.to))} — komisi pengganti sudah terbit</small></div></div>`}).join('')}</div>
 <p class="sub" style="margin-top:10px">Membatalkan sekarang akan menghapus catatan titip dan menghilangkan komisi coach pengganti untuk sesi yang sudah dilatih, jadi pembatalan dinonaktifkan.</p>
 <div class="row" style="margin-top:12px"><button class="btn" data-act="close">Kembali</button></div>`);
 const p=pulihHitung(r);
 return sheet('Batalkan persetujuan izin?',`<p><b>${esc(whoName(r))}</b> — ${esc(REQUEST_TYPE_LABELS[r.type])} ${fmtD(parseDate(r.date))}${r.date2&&r.date2!==r.date?' s/d '+fmtD(parseDate(r.date2)):''} akan dikembalikan ke status <b>Menunggu</b> supaya bisa diputuskan ulang.</p>
 <div class="listv">
 ${p.titipDihapus.length?`<div class="li"><div><b>${p.titipDihapus.length} catatan titip dihapus</b><small>sesi kembali menjadi tanggungan coach pemilik klien</small></div></div>`:''}
 ${p.makeupDihapus.length?`<div class="li"><div><b>${p.makeupDihapus.length} catatan sesi pengganti dihapus</b><small>penempatan manual hasil undur pengajuan ini dibatalkan</small></div></div>`:''}
 ${p.pulih.map(x=>`<div class="li"><div><b>${esc(x.c.name)}</b><small>tanggal selesai ${fmtD(parseDate(x.dari))} → <b>${fmtD(parseDate(x.baru))}</b>${x.tuntas?' (kembali ke tanggal asal)':''}</small></div></div>`).join('')}
 ${!p.titipDihapus.length&&!p.makeupDihapus.length&&!p.pulih.length?'<div class="li"><div><small>Tidak ada titip, sesi pengganti, atau geseran tanggal dari pengajuan ini — hanya status yang dikembalikan.</small></div></div>':''}
 </div>
 <div class="row" style="margin-top:12px"><button class="btn primary" data-act="requndoya" data-v="${r.id}">Ya, batalkan persetujuan</button><button class="btn" data-act="close">Kembali</button></div>`)};
ACT.requndo=t=>{appState.modal={k:'requndo',id:t.dataset.v};render()};
ACT.requndoya=async t=>{
 const r=store.reqs.find(x=>x.id===t.dataset.v);if(!r)return;
 if(titipTerlatih(r).length){toast('Tidak bisa dibatalkan: sesi titipan pengajuan ini sudah dilatih coach pengganti.');return}
 const p=pulihHitung(r);
 let gagal=0;
 try{await applyReq(r,'Menunggu')}
 catch(e){toast('Gagal menyimpan: '+(e.message||e));return}
 for(const td of p.titipDihapus){
  try{if(isApiMode())await apiDel('/titip/'+td.id);store.titip=store.titip.filter(x=>x.id!==td.id)}
  catch(e){gagal++}
 }
 for(const mk of p.makeupDihapus){
  try{if(isApiMode())await apiDel('/makeup/'+mk.id);store.makeup=store.makeup.filter(x=>x.id!==mk.id)}
  catch(e){gagal++}
 }
 for(const x of p.pulih){
  try{
   if(isApiMode())await apiSaveClient({id:x.c.id,end:x.baru,end_orig:x.tuntas?null:x.c.end_orig});
   else{x.c.end=x.baru;if(x.tuntas)x.c.end_orig=null}
  }catch(e){gagal++}
 }
 appState.modal=null;
 logAct('membatalkan persetujuan '+REQUEST_TYPE_LABELS[r.type].toLowerCase()+' '+whoName(r)+' (kembali Menunggu; '+p.titipDihapus.length+' titip & '+p.makeupDihapus.length+' sesi pengganti dihapus, '+p.pulih.length+' tanggal selesai dipulihkan)');
 toast(gagal?'Persetujuan dibatalkan, tapi '+gagal+' langkah gagal — periksa data terkait':'Persetujuan dibatalkan. Pengajuan kembali Menunggu dan bisa diputuskan ulang.');render()};

export { attList, whoName };
