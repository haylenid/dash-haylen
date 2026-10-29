/* js/core/indicators.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { money, perm } from './access.js';
import { COACHES, NAVT } from './constants.js';
import { filterTransactions, freeSlots, getCommissionData, inRange, liveClients, monthly, offOn, payOf } from './derived.js';
import { TODAY, esc, iso, sum } from './helpers.js';
import { clientAttRate, locOf, unreadTotals } from './shared.js';
import { findClientById, getClientStatus, store } from './store.js';
import { pill } from '../ui/components.js';

function retensiPct(){const cs=store.clients.filter(c=>!c.arch),base=cs.filter(c=>c.renew||['Segera berakhir','Selesai'].includes(getClientStatus(c)));return base.length?Math.round(cs.filter(c=>c.renew).length/base.length*100):0}
function buildIndicators(){
 const k=iso(TODAY),live=liveClients(),st=s=>store.clients.filter(c=>getClientStatus(c)===s).length;
 const per=live.filter(c=>c.cond==='Perlu perhatian').length,ced=live.filter(c=>c.cond==='Cedera ringan').length,soon=st('Segera berakhir'),jeda=st('Jeda');
 const wkSlots=sum(COACHES.map(c=>sum((store.pattern[c]||[]).map(a=>a.length)))),fill=Math.round(store.book.length/Math.max(1,wkSlots)*100),free7=freeSlots(7).length;
 const offNow=COACHES.filter(c=>offOn(c,k)).length;
 const reps=store.reports.filter(r=>!r.missed),pend=reps.filter(r=>!r.fix).length,kPct=Math.round((reps.length-pend)/Math.max(1,reps.length)*100);
 const missed=store.reports.filter(r=>r.missed&&inRange(r.date,7)).length,rep7=store.reports.filter(r=>!r.missed&&inRange(r.date,7)).length;
 const absen=COACHES.filter(c=>((store.attCoach[c]||{})[k]||{}).in).length;
 const reqW=store.reqs.filter(r=>r.status==='Menunggu'&&r.type!=='masalah').length,issue=store.reqs.filter(r=>r.status==='Menunggu'&&r.type==='masalah').length;
 const cAtt=COACHES.length?Math.round(sum(COACHES.map(c=>clientAttRate(c,30)))/COACHES.length):0;
 /* F1.5: komisi & status bayar dihitung per klien (label periode 30 hari) */
 const klienKom=getCommissionData(30).byClient,kom=sum(klienKom.map(x=>x.kom)),paidN=klienKom.filter(x=>payOf(x.c,'30 hari')).length,unpaidN=klienKom.length-paidN;
 const inn=sum(filterTransactions(30,'in').map(t=>t.amt)),out=sum(filterTransactions(30,'out').map(t=>t.amt)),mo=monthly(),cur=mo[mo.length-1].inc;
 const dim=new Date(TODAY.getFullYear(),TODAY.getMonth()+1,0).getDate(),exp=store.targets.rev*TODAY.getDate()/dim;
 const noLoc=store.members.filter(m=>m.role!=='owner'&&m.role!=='admin'&&locOf(m.id)==='Lokasi belum diisi').length;
 const lastMsg=[].concat(store.msgs.team,...Object.values(store.msgs.dm)).map(m=>+m.t).sort((a,b)=>b-a)[0];
 const dmW=Object.keys(store.msgs.dm).filter(id=>{const t=store.msgs.dm[id],l=t[t.length-1];return findClientById(id)&&!findClientById(id).arch&&l&&String(l.w).startsWith('cl')}).length,dmN=Object.keys(store.msgs.dm).filter(id=>findClientById(id)&&!findClientById(id).arch).length;
 const M=(v,m)=>money(v,m);
 const cards=[
  {m:'klien',t:'Klien',tone:ced?'bad':(per||soon)?'warn':'good',rows:[['Klien berjalan',live.length],['Segera berakhir',soon],['Perlu perhatian / cedera',per+ced],['Jeda',jeda]]},
  {m:'coach',t:'Coach',tone:free7===0?'bad':fill>=90?'warn':'good',rows:[['Slot terisi',fill+'%'],['Slot kosong 7 hari',free7],['Coach libur hari ini',offNow],['Total coach',COACHES.length]]},
  {m:'pesan',t:'Pesan',tone:dmW?'warn':'good',rows:[['Belum dibaca',unreadTotals().all],['Menunggu balasan',dmW],['Thread klien',dmN]]},
  {m:'absensi',t:'Absensi',tone:(reqW||issue)?'warn':'good',rows:[['Coach hadir hari ini',absen+' / '+COACHES.length],['Izin menunggu',reqW],['Masalah dilaporkan',issue],['Kehadiran klien 30 hari',cAtt+'%']]},
  {m:'laporan',t:'Laporan',tone:missed>3?'warn':'good',rows:[['Laporan latihan 7 hari',rep7],['Tidak lapor 7 hari',missed],['Retensi klien',retensiPct()+'%']]},
  {m:'komisi',t:'Komisi',tone:unpaidN?'warn':'good',rows:[['Komisi 30 hari',M(kom,'komisi')],['Sudah dibayar',paidN+' klien'],['Belum dibayar',unpaidN+' klien']]},
  {m:'keuangan',t:'Keuangan',tone:inn-out<0?'bad':cur>=exp?'good':'warn',rows:[['Pemasukan 30 hari',M(inn,'keuangan')],['Pengeluaran 30 hari',M(out,'keuangan')],['Laba bersih',M(inn-out,'keuangan')],['Capaian bulan ini',Math.round(cur/Math.max(1,store.targets.rev)*100)+'% dari target']]}
 ].filter(c=>perm(c.m)!=='none');
 const al=[];
 if(pend)al.push({lv:pend>10?'bad':'warn',x:pend+' laporan menunggu koreksi',m:'koreksi'});
 {const un=unreadTotals().all;if(un)al.push({lv:'info',x:un+' pesan belum dibaca',m:'pesan'})}
 if(dmW)al.push({lv:'warn',x:dmW+' pesan klien menunggu balasan',m:'pesan'});
 if(reqW)al.push({lv:'warn',x:reqW+' izin atau pengajuan menunggu persetujuan',m:'absensi'});
 if(issue)al.push({lv:'bad',x:issue+' masalah dilaporkan coach belum ditangani',m:'absensi'});
 if(ced)al.push({lv:'bad',x:ced+' klien cedera ringan',m:'klien'});
 if(per)al.push({lv:'warn',x:per+' klien perlu perhatian',m:'klien'});
 if(soon)al.push({lv:'warn',x:soon+' klien programnya segera berakhir (peluang perpanjang)',m:'klien'});
 if(absen<COACHES.length-offNow)al.push({lv:'info',x:(COACHES.length-offNow-absen)+' coach belum absen hari ini',m:'absensi'});
 if(perm('komisi')!=='none'&&unpaidN)al.push({lv:'warn',x:unpaidN+' komisi klien belum dibayar',m:'komisi'});
 if(perm('keuangan')==='full'&&inn-out<0)al.push({lv:'bad',x:'Pengeluaran 30 hari melebihi pemasukan',m:'keuangan'});
 else if(perm('keuangan')==='full'&&cur<exp)al.push({lv:'warn',x:'Pendapatan bulan ini di bawah laju target',m:'keuangan'});
 if(!free7)al.push({lv:'warn',x:'Tidak ada slot kosong 7 hari ke depan',m:'coach'});
 al.sort((a,b)=>({bad:0,warn:1,info:2}[a.lv]-{bad:0,warn:1,info:2}[b.lv]));
 return{cards,al}}
const TONE_PILL_CLASS={good:'good',warn:'warn',bad:'bad',info:'info'},TONE_LABEL={good:'Baik',warn:'Perhatian',bad:'Mendesak',info:'Info'};
function indAlerts(cls,al){return `<section class="card ${cls}"><header class="ch"><div><h3>Perlu perhatian</h3><p class="sub">Dihitung otomatis dari data semua menu</p></div>${pill(al.length?al.length+' hal':'Semua aman',al.length?'warn':'good')}</header>${al.length?`<div class="alg">${al.slice(0,8).map(a=>`<div class="li"><div><span class="pill ${TONE_PILL_CLASS[a.lv]}">${TONE_LABEL[a.lv]}</span> <b>${esc(a.x)}</b></div><button class="btn sm" data-act="nav" data-v="${a.m}">Buka ${esc(NAVT[a.m]||a.m)}</button></div>`).join('')}</div>`:'<p class="sub">Tidak ada hal yang perlu ditindak.</p>'}</section>`}
function indCards(cards){return cards.map(c=>`<section class="card c4 indc"><header class="ch"><h3><i class="tdot ${c.tone}"></i>${c.t}</h3><button class="btn sm" data-act="nav" data-v="${c.m}">Buka</button></header><div class="indl">${c.rows.map(([l,v])=>`<div class="indr"><span>${l}</span><b class="mono">${v}</b></div>`).join('')}</div></section>`).join('')}

export { TONE_LABEL, TONE_PILL_CLASS, buildIndicators, indAlerts, indCards, retensiPct };
