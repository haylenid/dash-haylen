/* js/pages/coach.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, meId, perm } from '../core/access.js';
import { apiAddBooking, apiDel, apiSavePattern, isApiMode } from '../core/api.js';
import { COACHES, PERIODS, ROLE_USER_IDS, SLOTS, periodOf } from '../core/constants.js';
import { calCell, freeSlots, offList, offOn, offSlot } from '../core/derived.js';
import { DAYS, DAYSL, TODAY, addD, dIdx, esc, first, fmtD, hhmm, iso, parseDate, slug } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, FORMS, MODALS, PAGES } from '../core/registry.js';
import { SKILLS, coachScore, locOf, skillAvg } from '../core/shared.js';
import { appState, findClientById, findClientByUid, findProgramById, getClientStatus, getMemberName, store } from '../core/store.js';
import { banner, pill, renderSegmented, sheet, tabsBar } from '../ui/components.js';
import { awaitLogo, logoImg, pagesToPdf } from '../ui/pdf.js';
import { copyToClipboard, render, toast } from '../ui/shell.js';

function coachPicker(key){
 if(appState.role==='coach')return '';
 return `<label class="field" style="max-width:260px"><span>Coach</span><select data-f="${key}">${COACHES.map(c=>`<option value="${c}" ${appState[key]===c?'selected':''}>${esc(getMemberName(c))}</option>`).join('')}</select></label>`}
const myCoach=key=>appState.role==='coach'?meId():appState[key];
function initCoach(id){
 store.pattern[id]=store.pattern[id]||[0,1,2,3,4,5,6].map(d=>d<5?['06:30','17:30']:[]);
 store.prof[id]=store.prof[id]||{rating:4.5,reviews:0,since:iso(TODAY)};
 store.skills[id]=store.skills[id]||{pub:70,ajar:70,ilmu:70,prog:70,kom:70};
 store.attCoach[id]=store.attCoach[id]||{};
}
function shareCanvas(c,from,days){
 const W=1080,SC=2,nowS=hhmm(new Date()),last=addD(from,days-1);
 const rows=[];for(let i=0;i<days;i++){const d=addD(from,i),k=iso(d),pat=store.pattern[c][dIdx(d)]||[];if(pat.length)rows.push({d,k,pat,off:offOn(c,k)})}
 const cols=PERIODS.slice();
 const slotSt=(r,sl)=>(r.off||offSlot(c,r.k,sl))?'off':store.book.some(b=>b.coach===c&&b.day===dIdx(r.d)&&b.time===sl)?'bk':(r.k===iso(TODAY)&&sl<=nowS)?'past':'fr';
 const st=(r,p)=>{const a=r.pat.filter(sl=>periodOf(sl)===p);if(!a.length)return 'na';const z=a.map(sl=>slotSt(r,sl));return z.includes('fr')?'fr':z.every(v=>v==='off')?'off':z.includes('bk')?'bk':'past'};
 let free=0;rows.forEach(r=>r.pat.forEach(sl=>{if(slotSt(r,sl)==='fr')free++}));
 const rowH=60,tx=40,tw=1000,labW=200,ncol=Math.max(1,cols.length),colW=(tw-40-labW)/ncol;
 const tblH=26+62+Math.max(1,rows.length)*rowH+22,tblY=372,ctaY=tblY+tblH+28,H=ctaY+168+70;
 const cv=document.createElement('canvas');cv.width=W*SC;cv.height=H*SC;const g=cv.getContext('2d');g.scale(SC,SC);
 const F=(w,s)=>w+' '+s+'px Montserrat, Arial, sans-serif';
 const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
 const card=(x,y,w,h,r,fill)=>{g.save();g.shadowColor='rgba(11,22,48,.10)';g.shadowBlur=26;g.shadowOffsetY=8;g.fillStyle=fill||'#fff';rr(x,y,w,h,r);g.fill();g.restore()};
 const ls=v=>{try{g.letterSpacing=v}catch(e){}};
 /* latar */
 const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#F3F6FD');bg.addColorStop(.55,'#F8F9FD');bg.addColorStop(1,'#FFEAF2');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.fillStyle='rgba(248,26,115,.10)';g.beginPath();g.arc(W-40,120,190,0,7);g.fill();
 g.fillStyle='rgba(34,184,247,.10)';g.beginPath();g.arc(30,H-260,200,0,7);g.fill();
 g.textBaseline='alphabetic';g.textAlign='left';
 /* kepala: logo merek */
 card(tx,36,tw,118,28);
 const im=logoImg(),lh=64,lw=lh*3.5176;
 if(im&&im.complete&&im.naturalWidth){g.drawImage(im,tx+28,36+(118-lh)/2,lw,lh)}
 else{g.fillStyle='#0B1630';g.font='italic 800 56px Montserrat, Arial, sans-serif';g.fillText('N6',tx+28,112)}
 const hx=tx+28+lw+26;
 g.fillStyle='#E3E8F2';g.fillRect(hx-14,62,2,66);
 
 g.fillStyle='#6B778C';g.font=F(600,15);ls('2px');g.fillText('JADWAL LATIHAN COACH',hx+4,103);ls('0px');
 [['#F81A73',0],['#A8D800',1],['#29BEFF',2],['#8B5CF6',3]].forEach(([col,i])=>{g.fillStyle=col;rr(tx+tw-28-4*34+i*34,90,28,8,4);g.fill()});
 /* judul */
 g.fillStyle='#F81A73';g.font=F(700,14);ls('3px');g.fillText('JADWAL KOSONG',tx,214);ls('0px');
 g.fillStyle='#0B1630';g.font=F(800,46);g.fillText(getMemberName(c),tx,268);
 g.fillStyle='#55637E';g.font=F(600,20);g.fillText(DAYSL[dIdx(from)]+', '+fmtD(from)+'  -  '+DAYSL[dIdx(last)]+', '+fmtD(last),tx,308);
 g.fillStyle='#F81A73';g.beginPath();g.arc(tx+9,333,6,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(tx+9,333,2.4,0,7);g.fill();
 g.fillStyle='#55637E';g.font=F(500,20);g.fillText(locOf(c),tx+26,340);
 /* kartu KPI slot kosong */
 const kg=g.createLinearGradient(0,196,0,320);kg.addColorStop(0,'#F81A73');kg.addColorStop(1,'#29BEFF');
 g.save();g.shadowColor='rgba(248,26,115,.35)';g.shadowBlur=24;g.shadowOffsetY=10;g.fillStyle=kg;rr(tx+tw-212,190,212,134,26);g.fill();g.restore();
 g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.arc(tx+tw-34,200,52,0,7);g.fill();
 g.fillStyle='#fff';g.font=F(600,16);g.fillText('Slot kosong',tx+tw-190,226);
 g.font=F(800,60);g.fillText(String(free),tx+tw-190,290);
 g.font=F(500,14);g.fillText(days+' hari ke depan',tx+tw-190,312);
 /* tabel */
 card(tx,tblY,tw,tblH,28);
 const cx0=tx+20+labW;let y=tblY+26;
 g.textAlign='center';
 cols.forEach((p,i)=>{const x=cx0+i*colW+4,w=colW-8;g.fillStyle='#EEF2FA';rr(x,y+8,w,40,20);g.fill();g.fillStyle='#0B1630';g.font=F(800,17);ls('1px');g.fillText(p.toUpperCase(),x+w/2,y+34);ls('0px')});
 y+=62;
 const C={fr:['#DDF5E6','#0E6B35','Tersedia'],bk:['#E9EDF5','#7A869C','Penuh'],off:['#FDE3E0','#B3261E','Libur'],past:['#F1F3F8','#A3ADC0','-'],na:[null,'#C7CEDC','-']};
 rows.forEach((r,ri)=>{
  if(ri%2===0){g.fillStyle='#F7F9FD';rr(tx+12,y,tw-24,rowH-6,14);g.fill()}
  g.textAlign='left';g.fillStyle='#0B1630';g.font=F(700,19);g.fillText(DAYS[dIdx(r.d)]+', '+fmtD(r.d),tx+30,y+(rowH-6)/2+7);
  g.textAlign='center';
  cols.forEach((p,i)=>{const s=C[st(r,p)],x=cx0+i*colW+4,w=colW-8;if(s[0]){g.fillStyle=s[0];rr(x,y+7,w,rowH-20,11);g.fill()}g.fillStyle=s[1];g.font=F(700,colW<80?14:15);g.fillText(s[2],x+w/2,y+(rowH-6)/2+6)});
  y+=rowH;
 });
 if(!rows.length){g.textAlign='left';g.fillStyle='#55637E';g.font=F(500,20);g.fillText('Belum ada jadwal pada rentang tanggal ini.',tx+30,y+34)}
 /* ajakan */
 const cg=g.createLinearGradient(tx,0,tx+tw,0);cg.addColorStop(0,'#0B1630');cg.addColorStop(1,'#1D3270');
 g.save();g.shadowColor='rgba(11,22,48,.25)';g.shadowBlur=26;g.shadowOffsetY=10;g.fillStyle=cg;rr(tx,ctaY,tw,168,30);g.fill();g.restore();
 g.textAlign='left';g.fillStyle='#fff';g.font=F(800,28);g.fillText('Pilih hari dan sesi yang masih Tersedia',tx+38,ctaY+62);
 g.fillStyle='#C9D6F5';g.font=F(500,19);g.fillText('Kirim pilihan Anda ke admin Number Six Running',tx+38,ctaY+98);g.fillText('untuk memesan sesi latihan.',tx+38,ctaY+126);
 g.fillStyle='#F81A73';rr(tx+tw-232,ctaY+52,194,64,32);g.fill();g.fillStyle='#fff';g.font=F(800,19);g.textAlign='center';g.fillText('Booking via admin',tx+tw-135,ctaY+91);
 g.fillStyle='#8592A8';g.font=F(500,14);g.fillText('Jadwal dapat berubah sewaktu-waktu  ·  Diperbarui '+fmtD(TODAY)+' '+nowS,W/2,H-30);
 return cv;
}
const idPreview=(uid,c)=>{
 if(!String(uid||'').trim())return '<p class="sub">Nama, paket, dan lokasi muncul otomatis setelah ID ditempel.</p>';
 const k=findClientByUid(uid);
 if(!k||k.arch)return '<p class="sub" style="color:var(--bad)">ID klien tidak ditemukan.</p>';
 const warn=k.coach!==c?`<p class="sub" style="color:var(--warn)">Klien ini milik ${esc(getMemberName(k.coach))}. Menyimpan akan memindahkan klien ke ${esc(getMemberName(c))}.</p>`:'';
 return `<div class="idcard"><b>${esc(k.name)}</b><small>${esc(findProgramById(k.pid).name)}</small><small>Lokasi: ${esc(locOf(c))}</small></div>${warn}`;
};
/* Picker klien untuk slotadd (keputusan user 2026-10-20): cari by nama/ID, HANYA klien coach ini
   + klien yang belum punya coach. Klien coach lain tidak ditampilkan sama sekali (pindah coach
   lewat menu Klien). Arsip & status Selesai disembunyikan. Pilihan wajib dari daftar (cid). */
const slotClientPool=c=>store.clients.filter(k=>!k.arch&&getClientStatus(k)!=='Selesai'&&(k.coach===c||!COACHES.includes(k.coach)));
const slotPickList=(q,c,d,tt)=>{
 const query=String(q||'').trim().toLowerCase(),pool=slotClientPool(c);
 const bare=s=>String(s||'').toLowerCase().replace(/[\s-]/g,'');
 const match=k=>!query||k.name.toLowerCase().includes(query)||bare(k.uid).includes(bare(query));
 const rank=k=>{if(!query)return 2;const nm=k.name.toLowerCase();return nm.startsWith(query)?0:nm.includes(query)?1:2};
 const item=k=>{
  const inSlot=tt&&!String(tt).startsWith('p:')&&store.book.some(b=>b.coach===c&&b.day===d&&b.time===tt&&b.client===k.id);
  const sub=`<small>${esc(findProgramById(k.pid).name)} · ${esc(k.uid||'')}</small>`;
  return inSlot?`<div class="acitem dis"><span class="acn">${esc(k.name)}</span>${sub}<em>Sudah di sesi ini</em></div>`
   :`<button type="button" class="acitem" data-act="acpick" data-id="${k.id}"><span class="acn">${esc(k.name)}</span>${sub}</button>`};
 const own=pool.filter(k=>k.coach===c&&match(k)).sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
 const free=pool.filter(k=>k.coach!==c&&match(k)).sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name));
 const total=own.length+free.length;
 if(!total)return '<p class="sub" style="margin:6px 2px">Tidak ada klien yang cocok. Klien coach lain tidak ditampilkan — pindah coach dilakukan lewat menu Klien.</p>';
 /* Tanpa potong: semua hasil dirender, wadah .aclist yang menggulir (tinggi ±5,5 baris).
    Info jumlah menempel (sticky) di dasar daftar bila hasil lebih dari 5. */
 const grp=(title,arr)=>arr.length?`<div class="acgrp">${title}</div>`+arr.map(item).join(''):'';
 return grp('Klien '+esc(getMemberName(c)),own)+grp('Belum punya coach',free)
  +(total>5?`<p class="acfoot">${total} klien cocok — gulir daftar atau ketik nama untuk mempersempit.</p>`:'')};
const slotPreview=(cid,c)=>{
 const k=cid?findClientById(cid):null;
 if(!k)return '<p class="sub">Pilih klien dari daftar — nama, paket, dan lokasi tampil di sini.</p>';
 const note=!COACHES.includes(k.coach)?`<p class="sub" style="color:var(--warn)">Klien ini belum punya coach. Menyimpan akan menugaskannya ke ${esc(getMemberName(c))}.</p>`
  :k.coach!==c?`<p class="sub" style="color:var(--warn)">Klien ini milik ${esc(getMemberName(k.coach))}. Menyimpan akan memindahkannya ke ${esc(getMemberName(c))}.</p>`:'';
 return `<div class="idcard"><b>${esc(k.name)}</b><small class="mono">${esc(k.uid||'')}</small><small>${esc(findProgramById(k.pid).name)}</small><small>Lokasi: ${esc(locOf(c))}</small></div>${note}`};
PAGES.coach=()=>{
 const tabs=appState.role==='coach'?['Jadwal coach','Bagikan jadwal kosong','Kalender 30 hari']:['Jadwal coach','Bagikan jadwal kosong','Kalender 30 hari','Daftar coach'];
 const t=Math.min(appState.tab,tabs.length-1);let body='';
 if(t<=2){
  const c=myCoach('sched'),pat=store.pattern[c]||[],list=appState.role==='coach'?[meId()]:COACHES;
  if(!appState.shareFrom||appState.shareFrom<iso(TODAY))appState.shareFrom=iso(TODAY);
  /* Paket Perbaikan Jadwal (masalah 7): SATU tanggal terpilih bersama untuk
     Pola mingguan, Kalender 30 hari, dan Daftar Hadir (appState.cdate).
     pday tetap cermin hari dari tanggal itu (pola & booking berbasis hari). */
  if(!appState.cdate)appState.cdate=(appState.adate&&appState.adate<=iso(TODAY))?appState.adate:iso(TODAY);
  appState.pday=dIdx(parseDate(appState.cdate));
  const di=appState.pday,kDate=appState.cdate,cdObj=parseDate(kDate),monday=addD(cdObj,-di);
  const cellOf=(cc,p)=>{
   const pt=((store.pattern[cc]||[])[di]||[]),times=new Set();
   SLOTS.filter(x=>periodOf(x)===p&&pt.includes(x)).forEach(x=>times.add(x));
   store.book.filter(b=>b.coach===cc&&b.day===di&&periodOf(b.time)===p).forEach(b=>times.add(b.time));
   /* Masalah 4: kejadian bertanggal pada tanggal terpilih ikut tampil —
      sesi titipan yang DITERIMA coach ini dan sesi penggantinya. */
   (store.titip||[]).filter(x=>x.to===cc&&x.date===kDate&&periodOf(x.time)===p).forEach(x=>times.add(x.time));
   (store.makeup||[]).filter(x=>x.coach===cc&&x.date===kDate&&periodOf(x.time)===p).forEach(x=>times.add(x.time));
   const offD=offOn(cc,kDate);
   const chips=[...times].sort().map(t=>{const bs=store.book.filter(x=>x.coach===cc&&x.day===di&&x.time===t);
    const inChip=(store.titip||[]).filter(x=>x.to===cc&&x.date===kDate&&x.time===t).map(x=>{const cl=findClientById(x.client);return cl?`<span class="tc bk in"><span>${t}</span><b>${esc(first(cl.name))}</b><i>titipan dari ${esc(first(getMemberName(x.from)))}</i></span>`:''}).join('')
     +(store.makeup||[]).filter(x=>x.coach===cc&&x.date===kDate&&x.time===t&&!bs.some(b=>b.client===x.client)).map(x=>{const cl=findClientById(x.client);return cl?`<span class="tc bk in"><span>${t}</span><b>${esc(first(cl.name))}</b><i>sesi pengganti</i></span>`:''}).join('');
    if(!bs.length){
     if(inChip)return inChip;
     if(offD)return `<span class="tc fr"><span>${t}</span><em>Cuti</em></span>`;
     return `<button class="tc fr" data-act="modal" data-v="slot" data-id="${cc}|${di}|${t}"><span>${t}</span><em>Kosong</em></button>`}
    return bs.map(b=>{const cli=findClientById(b.client);const tp=(store.titip||[]).find(x=>x.date===kDate&&x.from===cc&&x.client===b.client&&x.time===t);return `<button class="tc bk" data-act="modal" data-v="slot" data-id="${cc}|${di}|${t}|${b.client}" title="${esc(cli.name)}${b.hold?' (komisi ditahan)':''}"><span>${t}</span><b>${esc(first(cli.name))}</b>${tp?`<i>dititipkan ke ${esc(first(getMemberName(tp.to)))}</i>`:offD?'<i>diundur</i>':(cli.end_orig&&kDate>cli.end_orig)?'<i>sesi pengganti</i>':''}${b.hold?'<i>ditahan</i>':''}</button>`}).join('')+`<button class="tc add" data-act="modal" data-v="slot" data-id="${cc}|${di}|${t}" title="Tambah klien lain di jam ${t}" aria-label="Gabung klien lain jam ${t}">+</button>`+inChip}).join('');
   return `<div class="tcs">${chips}<button class="tc add" data-act="modal" data-v="slot" data-id="${cc}|${di}|p:${p}" aria-label="Tambah sesi ${p} ${esc(getMemberName(cc))}">+ Jam</button></div>`};
  const rowsT=list.map(cc=>{const bkd=store.book.filter(b=>b.coach===cc&&b.day===di).length,free=Math.max(0,((store.pattern[cc]||[])[di]||[]).filter(s=>!store.book.some(b=>b.coach===cc&&b.day===di&&b.time===s)).length);
   return `<tr><td class="cn"><b>${esc(getMemberName(cc))}</b><small>${esc(locOf(cc))}</small><small>${bkd} terisi · ${free} kosong</small>${offOn(cc,kDate)?`<small style="color:var(--bad)">Cuti pada tanggal ini</small>`:''}</td>${PERIODS.map(p=>`<td>${cellOf(cc,p)}</td>`).join('')}</tr>`}).join('');
  const start=dIdx(TODAY);const cells=[];
  for(let i=0;i<start;i++)cells.push('<div class="cd pad"></div>');
  for(let i=0;i<30;i++){cells.push(calCell(c,i));continue;const d=addD(TODAY,i),k=iso(d),dd=dIdx(d);const off=offOn(c,k);const free=off?0:pat[dd].filter(sl=>!offSlot(c,k,sl)&&!store.book.some(b=>b.coach===c&&b.day===dd&&b.time===sl)).length;cells.push(`<div class="cd ${off?'off':free>0?'hi':''} ${i===0?'today':''}"><b>${d.getDate()}</b><span>${off?'Cuti':free+' kosong'}</span></div>`)}
  const pola=`<section class="card"><header class="ch"><h3>Pola mingguan</h3><span class="sub">Pilih hari pada minggu yang tampil — pola tetap mingguan, sedangkan tanda titipan, sesi pengganti, dan cuti mengikuti tanggal terpilih: <b>${DAYSL[di]}, ${fmtD(cdObj)}</b>. Ketuk jam atau tombol + Jam pada kolom Pagi, Siang, Sore, atau Malam, lalu isi dengan ID klien.</span></header><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">${renderSegmented('pday',kDate,DAYS.map((d,i)=>{const dt=addD(monday,i);return[iso(dt),d+' '+dt.getDate()]}))}<span class="sp"></span><button class="btn sm" data-act="pweek" data-v="-7">‹ Seminggu</button><button class="btn sm" data-act="pweek" data-v="0">Hari ini</button><button class="btn sm" data-act="pweek" data-v="7">Seminggu ›</button></div></section>
  <div class="tw"><table class="ptab"><thead><tr><th>Coach</th>${PERIODS.map(p=>`<th>${p}</th>`).join('')}</tr></thead><tbody>${rowsT}</tbody></table></div>`;
  const share=`<section class="card"><header class="ch"><h3>Bagikan jadwal kosong</h3><span class="sub">Pilih coach dan tanggal, lalu unduh JPG untuk dikirim ke klien atau calon klien. Isinya sesi Pagi, Siang, Sore, dan Malam yang masih tersedia.</span></header>
  <div class="toolbar">${coachPicker('sched')}<label class="field" style="max-width:200px"><span>Mulai tanggal</span><input type="date" id="f-sfrom" data-f="shareFrom" min="${iso(TODAY)}" value="${appState.shareFrom}"></label><label class="field" style="max-width:180px"><span>Rentang</span><select data-f="shareDays" data-n>${[7,14,30].map(n=>`<option value="${n}" ${appState.shareDays===n?'selected':''}>${n} hari</option>`).join('')}</select></label><span class="sp"></span><button class="btn" data-act="dljpg">${icon('download',15)} Unduh JPG</button><button class="btn primary" data-act="dlshare">${icon('download',15)} Unduh PDF</button></div>
  </section>`;
  const kal=`<div class="toolbar">${coachPicker('sched')}</div><section class="card"><header class="ch"><h3>Kalender 30 hari ${esc(first(getMemberName(c)))}</h3><span class="sub">Hijau: ada slot kosong. Merah: cuti atau tidak bisa mengajar. Kuning: pengajuan menunggu persetujuan. Ketuk tanggal untuk membukanya di Pola mingguan.</span></header><div class="cal">${DAYS.map(d=>`<div class="h7">${d}</div>`).join('')}${cells.join('')}</div>${offList(c)}</section>`;
  body=[pola,share,kal][t];
 }
 if(t===3){
  body=`<div class="toolbar"><h3 style="font-size:16px">Daftar coach</h3><span class="sp"></span><span class="sub">Coach baru ditambahkan lewat menu Anggota.</span></div>
  <section class="card"><div class="listv">${COACHES.map(c=>{const n=store.clients.filter(x=>x.coach===c&&!x.arch&&getClientStatus(x)!=='Selesai').length,pc=coachScore(c).total,rec=(store.attCoach[c]||{})[iso(TODAY)],off=offOn(c,iso(TODAY));
   return `<div class="li"><div><b>${esc(getMemberName(c))}</b><small>Lokasi melatih: ${esc(locOf(c))}</small></div><div class="row">${pill(n+' klien','info')}${pill('Score '+pc,pc>=85?'good':'warn')}${pill(freeSlots(7,c).length+' slot kosong')}${off?pill('Cuti','info'):rec&&rec.in?pill('Sudah absen '+rec.in,'good'):pill('Belum absen','warn')}</div></div>`}).join('')}</div></section>
  <section class="card"><header class="ch"><h3>Penilaian kompetensi coach</h3><span class="sub">Tampil di diagram Level profesional pada dashboard coach. Nilai 0 sampai 100.</span></header>${perm('coach')==='full'?'':banner('Anda hanya dapat melihat penilaian ini.')}<div class="tw"><table><thead><tr><th>Coach</th>${SKILLS.map(x=>`<th class="n">${x.s}</th>`).join('')}<th class="n">Rata-rata</th></tr></thead><tbody>${COACHES.map(c=>{store.skills[c]=store.skills[c]||{};return `<tr><td><b>${esc(getMemberName(c))}</b></td>${SKILLS.map(x=>`<td class="n">${perm('coach')==='full'?`<input class="num" style="width:70px" type="number" min="0" max="100" step="1" value="${store.skills[c][x.k]??0}" data-set="store.skills.${c}.${x.k}" data-num aria-label="${x.l} ${esc(getMemberName(c))}">`:(store.skills[c][x.k]??0)}</td>`).join('')}<td class="n"><b>${skillAvg(c)}</b></td></tr>`}).join('')}</tbody></table></div></section>`;
 }
 return `<div class="stackv">${tabsBar(tabs)}${body}</div>`};
MODALS.slot=m=>{
 const[c,ds,tt,cid]=String(m.id||'').split('|'),d=+ds;if(!store.pattern[c]||isNaN(d))return '';
 const isAdd=String(tt).startsWith('p:'),per=isAdd?tt.slice(2):periodOf(tt);
 const b=isAdd||!cid?null:store.book.find(x=>x.coach===c&&x.day===d&&x.time===tt&&x.client===cid),cli=b&&findClientById(b.client),mates=isAdd?[]:store.book.filter(x=>x.coach===c&&x.day===d&&x.time===tt&&x.client!==cid);
 const open=!isAdd&&(store.pattern[c][d]||[]).includes(tt),preset=SLOTS.includes(tt);
 const head=`<p class="sub" style="margin:0 0 12px">${esc(getMemberName(c))} · ${DAYSL[d]} · ${per}<br>Lokasi: ${esc(locOf(c))}</p>`;
 const taken=()=>false,cnt=t=>store.book.filter(x=>x.coach===c&&x.day===d&&x.time===t).length;
 const timeSel=cur=>{
  let sel=cur;if(!sel)sel=SLOTS.find(s=>periodOf(s)===per&&!cnt(s))||SLOTS.find(s=>periodOf(s)===per)||'custom';
  const isC=sel==='custom'||!SLOTS.includes(sel);
  return `<label class="field"><span>Jam sesi</span><select name="tsel" data-tsel>${SLOTS.map(s=>`<option value="${s}" ${!isC&&s===sel?'selected':''} ${''}>${s} · ${periodOf(s)}${cnt(s)?' ('+cnt(s)+' klien)':''}</option>`).join('')}<option value="custom" ${isC?'selected':''}>Jam manual (custom)</option></select></label><label class="field" id="ctw" ${isC?'':'hidden'}><span>Jam manual</span><input type="time" name="ctime" id="f-ctime" step="300" value="${isC&&sel!=='custom'?sel:''}"></label>`};
 const hold=on=>`<label class="chk"><input type="checkbox" name="hold" ${on?'checked':''}><span><b>Ada perubahan jadwal: tahan komisi</b><small>Bila dicentang, komisi sesi ini tidak otomatis masuk ke dashboard coach sampai Anda melepas centang.</small></span></label>`;
 const hid=`<input type="hidden" name="c" value="${c}"><input type="hidden" name="d" value="${d}"><input type="hidden" name="id" value="${m.id}">`;
 if(b&&cli)return sheet('Sesi terisi',head+`<div class="idcard"><b>${esc(cli.name)}</b><small class="mono">${esc(cli.uid)}</small><small>${esc(findProgramById(cli.pid).name)}</small><small>Lokasi: ${esc(locOf(c))}</small>${mates.length?`<small>Satu sesi dengan: ${esc(mates.map(x=>findClientById(x.client).name).join(', '))}</small>`:''}</div><form data-form="slotsave" class="listv" style="margin-top:12px">${hid}<div class="fg">${timeSel(b.time)}</div>${hold(b.hold)}<div class="row"><button class="btn primary" type="submit">Simpan</button><button class="btn danger" type="button" data-act="slotdel" data-id="${m.id}">Keluarkan dari sesi</button><button class="btn" type="button" data-act="close">Tutup</button></div></form>`);
 return sheet('Isi sesi dengan klien',head+`<form data-form="slotadd" class="listv">${hid}<label class="field full"><span>Nama klien</span><input id="f-slotname" name="q" data-acl data-coach="${c}" data-day="${d}" data-time="${tt}" autocomplete="off" placeholder="Ketik nama atau ID klien, lalu pilih dari daftar"></label><input type="hidden" name="cid" id="f-slotcid" value=""><div id="aclist" class="aclist">${slotPickList('',c,d,tt)}</div>${!isAdd&&store.book.some(x=>x.coach===c&&x.day===d&&x.time===tt)?`<p class="sub" style="margin:0">Jam ${tt} sudah berisi ${esc(store.book.filter(x=>x.coach===c&&x.day===d&&x.time===tt).map(x=>first(findClientById(x.client).name)).join(', '))}. Klien baru akan bergabung di sesi yang sama.</p>`:''}<div id="idprev" class="idprev">${slotPreview('',c)}</div><div class="fg">${timeSel(isAdd?'':tt)}</div>${hold(false)}<div class="row"><button class="btn primary" type="submit">Simpan ke jadwal</button>${preset&&!isAdd?(open?`<button class="btn" type="button" data-act="slotclose" data-id="${m.id}">Tutup slot</button>`:`<button class="btn" type="button" data-act="slotopen" data-id="${m.id}">Buka sebagai slot kosong</button>`):''}<button class="btn" type="button" data-act="close">Batal</button></div></form>`);
};
const pickTime=f=>{const idp=String(f.get('id')||'').split('|'),ts=f.get('tsel')||idp[2]||'',t=ts==='custom'?(f.get('ctime')||''):ts;return /^\d\d:\d\d$/.test(t)?t:''};
FORMS.slotadd=async f=>{
 const idp=String(f.get('id')||'').split('|'),c=f.get('c')||idp[0],d=+(f.get('d')??idp[1]),sl=pickTime(f),k=findClientById(f.get('cid'));
 if(!k||k.arch){toast('Pilih klien dari daftar saran terlebih dahulu');return}
 if(!sl){toast('Pilih jam sesi atau isi jam manual');return}
 if(store.book.some(b=>b.coach===c&&b.day===d&&b.time===sl&&b.client===k.id)){toast(first(k.name)+' sudah ada di jam '+sl);return}
 if(k.coach!==c){store.book=store.book.filter(b=>b.client!==k.id);k.coach=c}
 if(SLOTS.includes(sl)&&!(store.pattern[c][d]||[]).includes(sl)){
   store.pattern[c]=store.pattern[c].slice();
   store.pattern[c][d]=[...store.pattern[c][d],sl].sort();
   if(isApiMode()){try{await apiSavePattern(c,d,store.pattern[c][d])}catch(e){console.error('Gagal simpan pola:',e)}}
 }
 const rec={coach:c,client:k.id,day:d,time:sl};if(f.get('hold'))rec.hold=true;
 if(isApiMode()){
   try{await apiAddBooking(rec)}catch(e){console.error('Gagal simpan booking:',e);store.book.push(rec)}
 }else{store.book.push(rec)}
 logAct('mengisi jadwal '+first(getMemberName(c))+' '+DAYSL[d]+' '+sl+' dengan '+k.name);appState.modal=null;toast(first(k.name)+' masuk ke '+DAYSL[d]+' '+sl+'. Komisi otomatis saat sesi selesai.');render()};
FORMS.slotsave=f=>{
 const idp=String(f.get('id')||'').split('|'),c=f.get('c')||idp[0],d=+(f.get('d')??idp[1]),b=store.book.find(x=>x.coach===c&&x.day===d&&x.time===idp[2]&&x.client===idp[3]);
 if(!b){appState.modal=null;render();return}
 const nt=pickTime(f)||b.time;
 if(nt!==b.time&&store.book.some(x=>x.coach===c&&x.day===d&&x.time===nt&&x.client===b.client)){toast('Klien sudah ada di jam '+nt);return}
 if(nt!==b.time&&SLOTS.includes(nt)&&!(store.pattern[c][d]||[]).includes(nt)){store.pattern[c]=store.pattern[c].slice();store.pattern[c][d]=[...store.pattern[c][d],nt].sort()}
 const moved=nt!==b.time;b.time=nt;if(f.get('hold'))b.hold=true;else delete b.hold;
 logAct((moved?'memindah jam sesi ':'memperbarui sesi ')+findClientById(b.client).name+(b.hold?' (komisi ditahan)':''));appState.modal=null;toast(b.hold?'Komisi sesi ditahan':moved?'Jam sesi diubah ke '+nt:'Perubahan disimpan');render()};
Object.assign(ACT,{
 pday:t=>{const v=t.dataset.v;appState.cdate=v;appState.pday=dIdx(parseDate(v));if(v<=iso(TODAY))appState.adate=v;render()},
 pweek:t=>{const n=+t.dataset.v,v=n===0?iso(TODAY):iso(addD(parseDate(appState.cdate||iso(TODAY)),n));appState.cdate=v;appState.pday=dIdx(parseDate(v));if(v<=iso(TODAY))appState.adate=v;render()},
 calpick:t=>{const v=t.dataset.v;appState.cdate=v;appState.pday=dIdx(parseDate(v));if(v<=iso(TODAY))appState.adate=v;appState.tab=0;render()},
 slotopen:t=>{const[c,ds,sl]=t.dataset.id.split('|'),d=+ds;store.pattern[c]=store.pattern[c].slice();store.pattern[c][d]=[...store.pattern[c][d],sl].sort();logAct('membuka slot '+DAYSL[d]+' '+sl);render()},
 slotclose:t=>{const[c,ds,sl]=t.dataset.id.split('|'),d=+ds;store.pattern[c]=store.pattern[c].slice();store.pattern[c][d]=store.pattern[c][d].filter(x=>x!==sl);logAct('menutup slot '+DAYSL[d]+' '+sl);appState.modal=null;render()},
 slotdel:async t=>{
  const[c,ds,sl,cid]=t.dataset.id.split('|'),b=store.book.find(x=>x.coach===c&&x.day===+ds&&x.time===sl&&x.client===cid);
  if(b){
    logAct('mengosongkan slot '+DAYSL[+ds]+' '+sl+' ('+findClientById(b.client).name+')');
    if(isApiMode()&&b.id){try{await apiDel('/bookings/'+b.id)}catch(e){console.error('Gagal hapus booking:',e);toast('Gagal menghapus: '+(e.message||e));return}}
    store.book=store.book.filter(x=>x!==b)
  }
  appState.modal=null;toast('Klien dikeluarkan dari sesi');render()},
 acpick:t=>{
  const k=findClientById(t.dataset.id);if(!k)return;
  const inp=document.getElementById('f-slotname'),hid=document.getElementById('f-slotcid'),p=document.getElementById('idprev'),l=document.getElementById('aclist');
  if(inp)inp.value=k.name;if(hid)hid.value=k.id;
  if(p)p.innerHTML=slotPreview(k.id,inp?inp.dataset.coach:'');
  if(l)l.innerHTML='';if(inp)inp.focus()},
});
Object.assign(ACT,{
 copyuid:t=>copyToClipboard(t.dataset.v,'ID klien '+t.dataset.v+' tersalin'),
 copysw:t=>copyToClipboard(t.dataset.v,'Link smartwatch tersalin'),
 slot:t=>{const c=t.dataset.c,di=+t.dataset.d,sl=t.dataset.t,a=store.pattern[c][di];
  if(a.includes(sl)){if(store.book.some(b=>b.coach===c&&b.day===di&&b.time===sl)){toast('Slot ini terisi klien. Pindahkan klien dulu.');return}store.pattern[c]=store.pattern[c].slice();store.pattern[c][di]=a.filter(x=>x!==sl)}
  else{store.pattern[c][di]=[...a,sl].sort()}
  logAct('memperbarui pola mingguan '+first(getMemberName(c)));render()},
  dlshare:async()=>{try{try{await Promise.all(['500','600','700','800'].map(w=>document.fonts.load(w+' 20px Montserrat')))}catch(e){}await awaitLogo();const c=myCoach('sched'),cv=shareCanvas(c,parseDate(appState.shareFrom),appState.shareDays),a=document.createElement('a');a.href=URL.createObjectURL(pagesToPdf([cv]));a.download='jadwal-'+slug(getMemberName(c))+'-'+appState.shareFrom+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);logAct('mengunduh PDF jadwal kosong '+getMemberName(c));toast('Jadwal diunduh sebagai PDF')}catch(e){console.error(e);toast('Gagal membuat PDF')}},
  dljpg:async()=>{try{try{await Promise.all(['500','600','700','800'].map(w=>document.fonts.load(w+' 20px Montserrat')))}catch(e){}await awaitLogo();const c=myCoach('sched'),cv=shareCanvas(c,parseDate(appState.shareFrom),appState.shareDays),a=document.createElement('a');a.href=cv.toDataURL('image/jpeg',.92);a.download='jadwal-'+slug(getMemberName(c))+'-'+appState.shareFrom+'.jpg';document.body.appendChild(a);a.click();a.remove();logAct('mengunduh jadwal kosong '+getMemberName(c));toast('Jadwal diunduh sebagai JPG')}catch(e){toast('Gagal membuat gambar')}},
 seesched:t=>{appState.sched=t.dataset.v;appState.tab=0;render(false)}
});

export { coachPicker, idPreview, initCoach, myCoach, pickTime, shareCanvas, slotPickList, slotPreview };
