/* js/core/shared.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { COACHES, PLAN, rnd } from './constants.js';
import { getReportsOf, inRange, liveClients, offOn, offSlot } from './derived.js';
import { TODAY, addD, dIdx, first, hhmm, iso, mmss, parseDate, sum } from './helpers.js';
import { findClientById, getClientStatus, getMemberName, appState, store } from './store.js';
import { pill } from '../ui/components.js';
import { canAccess, meId } from './access.js';

/* ===== status baca pesan: tiap pengguna punya penanda "terakhir dibaca" per percakapan ===== */
const waktuAwal=()=>store.msgSeedT||(store.msgSeedT=Date.now()-150*60000);
const readAt=(who,key)=>{const r=store.msgRead||(store.msgRead={});const v=r[who+'|'+key];return v===undefined?waktuAwal():v};
const markRead=(who,key)=>{(store.msgRead||(store.msgRead={}))[who+'|'+key]=Date.now()};
const waktuPesan=m=>+new Date(m.t);
const unreadOf=(arr,who,key)=>arr.filter(m=>m.w!==who&&waktuPesan(m)>readAt(who,key));
const unreadDm=(cid,who)=>unreadOf(store.msgs.dm[cid]||[],who,'dm:'+cid).length;
function unreadTotals(){const me=meId();if(!canAccess('pesan'))return{team:0,dm:0,all:0};const team=unreadOf(store.msgs.team,me,'team').length,dm=(store.clients.filter(c=>!c.arch&&getClientStatus(c)!=='Selesai')).reduce((n,c)=>n+unreadDm(c.id,me),0);return{team,dm,all:team+dm}}
/* posisi "terakhir dibaca" dibekukan selama percakapan terbuka, supaya tanda BARU tidak hilang saat layar dirender ulang */
const openSince=(who,key)=>{const k=who+'|'+key;if(!appState.openMark||appState.openMark.k!==k)appState.openMark={k,since:readAt(who,key)};return appState.openMark.since};
const ubBadge=n=>n?` <i class="ub" aria-label="${n} belum dibaca">${n>99?'99+':n}</i>`:'';
/* tautan latihan dari dashboard klien yang belum ada laporannya:
   tetap muncul di Koreksi sebagai entri tersendiri. Koreksi disimpan di data link itu dan kembali ke dashboard klien. */
const slId=x=>'sl|'+x.cid+'|'+x.date;
const planTypeOn=date=>(PLAN[dIdx(parseDate(date))]||{t:'Latihan'}).t;
const hasReportOn=(cid,date)=>store.reports.some(y=>y.cid===cid&&y.date===date&&!y.missed);
const linkEntries=()=>(store.swLinks||[]).filter(x=>{const c=findClientById(x.cid);return c&&!c.arch&&!hasReportOn(x.cid,x.date)}).map(x=>({id:slId(x),cid:x.cid,date:x.date,type:planTypeOn(x.date),link:true,sw:x.url,fix:x.fix||null}));
const fixOnDate=(cid,date)=>{const r=store.reports.find(y=>y.cid===cid&&y.date===date&&!y.missed);if(r)return r.fix;const x=(store.swLinks||[]).find(y=>y.cid===cid&&y.date===date);return x?(x.fix||null):null};

store.prof={
 u3:{rating:4.9,reviews:41,since:'2021-03-01'},u4:{rating:4.8,reviews:36,since:'2022-05-10'},
 u5:{rating:4.7,reviews:29,since:'2023-01-16'},u6:{rating:4.5,reviews:18,since:'2023-09-04'},u7:{rating:4.6,reviews:22,since:'2024-02-12'}
};
store.rapor={};
store.attCoach={};
store.attClient={};
store.clients.filter(c=>!c.arch).forEach((c,i)=>{[[6,i%2===0],[5,i%3===0]].forEach(([day,ok])=>{
 if(!ok)return;const sl=(store.pattern[c.coach]||[])[day]||[];
 for(const t of sl){if(!store.book.some(b=>b.coach===c.coach&&b.day===day&&b.time===t)){store.book.push({coach:c.coach,client:c.id,day,time:t});break}}
})});
(function seedAttendance(){
 const f=t=>{const[h,m]=t.split(':').map(Number);return h*60+m},p=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 COACHES.forEach(c=>{
  store.attCoach[c]={};
  for(let back=30;back>=1;back--){
   const d=addD(TODAY,-back),k=iso(d),sl=store.pattern[c][dIdx(d)]||[];
   if(!sl.length||offOn(c,k))continue;
   if(rnd()<.06){store.attCoach[c][k]={status:'Alpha'};continue}
   store.attCoach[c][k]={in:p(f(sl[0])-5-Math.floor(rnd()*20)),out:p(f(sl[sl.length-1])+60+Math.floor(rnd()*25))};
  }
 });
 const now=new Date(),nm=now.getHours()*60+now.getMinutes();
 ['u3','u7'].forEach(c=>{const sl=store.pattern[c][dIdx(TODAY)]||[];if(sl.length&&f(sl[0])-12<nm&&!offOn(c,iso(TODAY)))store.attCoach[c][iso(TODAY)]={in:p(f(sl[0])-12)}});
 store.book.forEach(b=>{
  for(let back=1;back<=14;back++){
   const d=addD(TODAY,-back);if(dIdx(d)!==b.day)continue;
   const k=iso(d);if(offOn(b.coach,k))continue;
   const r=rnd();store.attClient[k+'|'+b.client]=r<.88?'Hadir':(r<.95?'Izin':'Alpha');
  }
 });
})();
const LEVELS=[{k:'Coach Junior',min:0},{k:'Coach',min:65},{k:'Master Coach',min:90}];
function coachLevel(total){let i=0;LEVELS.forEach((l,x)=>{if(total>=l.min)i=x});return{...LEVELS[i],idx:i,next:LEVELS[i+1]||null}}
function attRate(id,days){
 let tot=0,pres=0;
 for(let back=1;back<=days;back++){
  const d=addD(TODAY,-back),k=iso(d);
  if(!(store.pattern[id]&&store.pattern[id][dIdx(d)]||[]).length||offOn(id,k))continue;
  tot++;const r=(store.attCoach[id]||{})[k];if(r&&r.in)pres++;
 }
 return{pct:tot?Math.round(pres/tot*100):100,present:pres,total:tot};
}
function clientAttRate(id,days){
 let tot=0,ok=0;
 Object.keys(store.attClient).forEach(key=>{
  const[k,cid]=key.split('|'),c=findClientById(cid);if(!c||c.coach!==id)return;
  const d=parseDate(k);if(!inRange(k,days))return;
  tot++;if(store.attClient[key]==='Hadir')ok++;
 });
 return tot?Math.round(ok/tot*100):100;
}
function compliance(cid,days=14){
 let plan=0,act=0;
 store.reports.filter(r=>r.cid===cid&&inRange(r.date,days)).forEach(r=>{plan+=r.plan;if(!r.missed)act+=r.km});
 return plan?Math.min(100,Math.round(act/plan*100)):null;
}
(()=>{const F={p1:90000,p2:80000,p3:60000,p4:60000,p5:150000};store.programs.forEach(p=>{if(p.fee==null)p.fee=F[p.id]||60000;if(!p.unit)p.unit=(p.wk||4)+' minggu'})})();
(()=>{const coachLocations={u3:'GBK Senayan, Jakarta',u4:'Lapangan Banteng, Jakarta Pusat',u5:'Taman Suropati, Menteng',u6:'Ancol, Jakarta Utara',u7:'Stadion Madya, Senayan'};store.members.forEach(m=>{if(coachLocations[m.id]&&!m.loc)m.loc=coachLocations[m.id]})})();
const locOf=id=>((store.members.find(m=>m.id===id)||{}).loc)||'Lokasi belum diisi';
const SKILLS=[{k:'pub',s:'Public speaking',l:'Public speaking'},{k:'ajar',s:'Cara mengajar',l:'Cara mengajar'},{k:'ilmu',s:'Ilmu kepelatihan',l:'Ilmu kepelatihan'},{k:'prog',s:'Susun program',l:'Menyusun program latihan'},{k:'kom',s:'Komunikasi',l:'Komunikasi dengan klien'}];
store.skills={u3:{pub:92,ajar:95,ilmu:94,prog:93,kom:90},u4:{pub:86,ajar:90,ilmu:88,prog:84,kom:92},u5:{pub:78,ajar:82,ilmu:80,prog:76,kom:84},u6:{pub:70,ajar:74,ilmu:72,prog:68,kom:78},u7:{pub:74,ajar:80,ilmu:76,prog:72,kom:82}};
const skillParts=id=>{const o=(store.skills&&store.skills[id])||{};return SKILLS.map(x=>({k:x.k,s:x.s,l:x.l,v:Math.max(0,Math.min(100,Math.round(+o[x.k]||0)))}))};
const skillAvg=id=>{const p=skillParts(id);return Math.round(sum(p.map(x=>x.v))/p.length)};
function coachScore(id){
 const isHead=(store.members.find(m=>m.id===id)||{}).role==='head';
 let first;
 if(isHead){const rs=getReportsOf(null);first={k:'kor',s:'Koreksi',l:'Koreksi tepat waktu',w:25,v:Math.round(rs.filter(r=>r.fix).length/Math.max(1,rs.length)*100)}}
 else{const vs=store.clients.filter(c=>c.coach===id&&!c.arch&&getClientStatus(c)!=='Selesai').map(c=>compliance(c.id)).filter(v=>v!==null);first={k:'kep',s:'Kepatuhan',l:'Kepatuhan klien',w:25,v:vs.length?Math.round(sum(vs)/vs.length):85}}
 const had=attRate(id,30).pct,pr=store.prof[id]||{rating:4.5},rat=Math.round(pr.rating/5*100);
 const mine=store.clients.filter(c=>c.coach===id&&!c.arch),live=mine.filter(c=>getClientStatus(c)!=='Selesai').length;
 const ret=Math.min(100,Math.round(70+30*mine.filter(c=>c.renew).length/Math.max(1,live)));
 const parts=[first,{k:'had',s:'Kehadiran',l:'Kehadiran coach',w:20,v:had},{k:'rat',s:'Rating',l:'Rating dari klien',w:20,v:rat},{k:'ret',s:'Retensi',l:'Retensi klien',w:15,v:ret},{k:'ses',s:'Sesi klien',l:'Kehadiran klien',w:20,v:clientAttRate(id,30)}];
 return{parts,total:Math.round(parts.reduce((a,p)=>a+p.v*p.w/100,0))};
}
function sessionsOn(id,date){
 const k=iso(date),di=dIdx(date);
 if(offOn(id,k))return[];
 const own=store.book.filter(b=>b.coach===id&&b.day===di&&findClientById(b.client)&&!findClientById(b.client).arch)
  .filter(b=>!offSlot(id,k,b.time)).map(b=>{const cc=findClientById(b.client);return{...b,date:k,c:cc,att:store.attClient[k+'|'+b.client]||null,pengganti:!!(cc.end_orig&&k>cc.end_orig)}});
 // Komisi Bulanan Fase C: klien titipan untuk coach ini pada tanggal ini ikut
 // tampil di Daftar Hadir pengganti (bertanda titipFrom = coach pemilik klien).
 const titipan=(store.titip||[]).filter(t=>t.to===id&&t.date===k&&findClientById(t.client)&&!findClientById(t.client).arch)
  .map(t=>({coach:id,client:t.client,day:di,time:t.time,date:k,c:findClientById(t.client),att:store.attClient[k+'|'+t.client]||null,titipFrom:t.from}));
 // Sesi pengganti (undur terjadwal manual): catatan tanggal + jam untuk coach ini
 // ikut tampil bertanda makeup; yang kebetulan sama persis dengan slot pola klien
 // tidak digandakan (slot polanya sendiri sudah tampil di atas).
 const gnti=(store.makeup||[]).filter(t=>t.coach===id&&t.date===k&&findClientById(t.client)&&!findClientById(t.client).arch)
  .filter(t=>!own.some(o=>o.client===t.client&&o.time===t.time))
  .map(t=>({coach:id,client:t.client,day:di,time:t.time,date:k,c:findClientById(t.client),att:store.attClient[k+'|'+t.client]||null,makeup:true,pengganti:true}));
 return own.concat(titipan).concat(gnti).sort((a,b)=>a.time<b.time?-1:1);
}
function upcoming(id,n){
 const out=[],nowS=hhmm(new Date());
 for(let i=0;i<14&&out.length<n;i++){
  const d=addD(TODAY,i);
  sessionsOn(id,d).forEach(s=>{if(i===0&&s.time<=nowS)return;if(out.length<n)out.push({...s,i})});
 }
 return out;
}
const ATT_MIN=60;
const sesStart=(k,t)=>{const d=parseDate(k),a=String(t).split(':').map(Number);d.setHours(a[0]||0,a[1]||0,0,0);return d};
const attOpenAt=(k,t)=>new Date(sesStart(k,t).getTime()+ATT_MIN*6e4);
const attOpen=(k,t)=>Date.now()>=attOpenAt(k,t).getTime();
const ATTENDANCE_TONES={Hadir:'good',Izin:'warn',Alpha:'bad'};
const attPill=c=>{const r=(store.attCoach[c]||{})[iso(TODAY)];return r&&r.in?pill('Hadir '+r.in,'good'):pill('Belum absen','warn')};
/* Masalah 8 (Paket Perbaikan 3): rekap absensi harian coach TIDAK disimpan
   terpisah — diturunkan dari attSlot (catatan per slot dari server) dengan
   aturan yang sama persis seperti penulisan sesi berjalan di ACT.cattset:
   ada slot Hadir pada hari itu -> {in: jam slot Hadir pertama, out: akhir
   slot Hadir terakhir}; slot terkonfirmasi tapi tak ada yang Hadir ->
   {status:'Alpha'}. Dipakai apiBoot untuk membangun ulang store.attCoach
   dari data server, menggantikan data contoh seed lokal. */
function deriveAttCoach(){
 const per={};
 Object.keys(store.attSlot||{}).forEach(key=>{
  const [k,co,t]=key.split('|');if(!k||!co||!t)return;
  const days=(per[co]=per[co]||{});
  const day=days[k]||(days[k]=[]);
  if(store.attSlot[key].s==='Hadir')day.push(t);
 });
 Object.values(per).forEach(days=>Object.keys(days).forEach(k=>{
  const hd=days[k].sort();
  days[k]=hd.length?{in:hd[0],out:hhmm(attOpenAt(k,hd[hd.length-1]))}:{status:'Alpha'};
 }));
 return per;
}
store.logs=[];
function buildSessionLogs(){
 store.logs=[];
 store.reports.filter(r=>!r.missed&&findClientById(r.cid)&&inRange(r.date,7)&&r.date!==iso(TODAY)).forEach((r,i)=>{
  const c=findClientById(r.cid);
  store.logs.push({id:'lg'+(i+1),cid:r.cid,coach:c.coach,date:r.date,train:r.type+' '+r.plan+' km',hr:r.hr,detail:'Rencana '+r.plan+' km. Aktual '+r.km+' km, pace '+mmss(r.pace)+'/km.',score:Math.max(60,Math.min(98,Math.round(60+Math.min(1.1,r.km/r.plan)*35))),at:new Date(parseDate(r.date).getTime()+20*36e5)});
 });
}
buildSessionLogs();
const senderName=w=>w.startsWith('cl')?(findClientById(w)?.name||'Klien'):getMemberName(w);

export { ATTENDANCE_TONES, ATT_MIN, LEVELS, SKILLS, attOpen, attOpenAt, attPill, attRate, buildSessionLogs, clientAttRate, coachLevel, coachScore, compliance, deriveAttCoach, fixOnDate, hasReportOn, linkEntries, locOf, markRead, openSince, planTypeOn, readAt, senderName, sesStart, sessionsOn, skillAvg, skillParts, slId, ubBadge, unreadDm, unreadOf, unreadTotals, upcoming, waktuAwal, waktuPesan };
