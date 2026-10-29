/* js/core/derived.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { COACHES } from './constants.js';
import { MONTHS, TODAY, addD, dIdx, esc, fmtD, hhmm, iso, parseDate, sum } from './helpers.js';
import { appState, findClientById, findProgramById, getClientEndDate, getClientStatus, store } from './store.js';
import { activePrograms, perRange, pill } from '../ui/components.js';

const inRange=(k,days)=>{const d=parseDate(k);if(days&&typeof days==='object')return d>=days.a&&d<=days.b;if(typeof days==='string'){const r=perRange();return d>=r.a&&d<=r.b}return d<=TODAY&&d>addD(TODAY,-days)};
// Komisi Bulanan (Fase A): satuan periode Komisi = bulan kalender.
// appState.komY/komM null = bulan berjalan. Rentang {a,b} dipakai getSessionAttendance
// lewat cabang objek inRange; halaman lain tetap memakai appState.per lama.
const komRange=()=>{const y=appState.komY==null?TODAY.getFullYear():appState.komY,m=appState.komM==null?TODAY.getMonth():appState.komM;return{a:new Date(y,m,1),b:new Date(y,m+1,0)}};
const komLbl=()=>{const r=komRange();return MONTHS[r.a.getMonth()]+' '+r.a.getFullYear()};
// Komisi Bulanan Fase B: pengaturan tanggal pembayaran (menu Pengaturan, kunci
// settings 'komisi') — 'akhir' = hari terakhir bulan, atau tanggal 1..28.
const komisiSet=()=>store.komisiSet&&store.komisiSet.tgl_bayar!==undefined?store.komisiSet:{tgl_bayar:'akhir'};
const payDateFor=range=>{const t=komisiSet().tgl_bayar;if(t==='akhir'||t==null)return range.b;return new Date(range.a.getFullYear(),range.a.getMonth(),Math.min(+t||28,range.b.getDate()))};
const filterTransactions=(days,type)=>store.tx.filter(t=>(!type||t.type===type)&&inRange(t.date,days));
function monthly(){const o=[];for(let m=5;m>=0;m--){const b=new Date(TODAY.getFullYear(),TODAY.getMonth()-m,1),key=iso(b).slice(0,7);const inc=sum(store.tx.filter(t=>t.type==='in'&&t.date.startsWith(key)).map(t=>t.amt));const exp=sum(store.tx.filter(t=>t.type==='out'&&t.date.startsWith(key)).map(t=>t.amt));o.push({key,l:MONTHS[b.getMonth()],inc,exp})}return o}
const liveClients=()=>store.clients.filter(c=>!c.arch&&getClientStatus(c)!=='Selesai');
const hrZone=(hr,mx)=>{const p=hr/mx*100;return store.zones.find(z=>p>=z.lo&&p<z.hi)||(p<store.zones[0].lo?store.zones[0]:store.zones[store.zones.length-1])};
const offOn=(coach,k)=>store.reqs.some(r=>r.status==='Disetujui'&&['izin_coach','cuti','berhalangan'].includes(r.type)&&!r.t1&&r.who===coach&&k>=r.date&&k<=(r.date2||r.date));
const offSlot=(coach,k,t)=>store.reqs.some(r=>r.status==='Disetujui'&&r.type==='berhalangan'&&r.t1&&r.who===coach&&k>=r.date&&k<=(r.date2||r.date)&&t>=r.t1&&t<r.t2);
const offInfo=(coach,k)=>store.reqs.filter(r=>r.who===coach&&['izin_coach','cuti','berhalangan'].includes(r.type)&&['Menunggu','Disetujui'].includes(r.status)&&k>=r.date&&k<=(r.date2||r.date));
const offLbl=r=>r.type==='cuti'?'Cuti':r.type==='izin_coach'?'Izin':(r.t1?r.t1+'-'+r.t2:'Tidak mengajar');
const calCell=(c,i)=>{const d=addD(TODAY,i),k=iso(d),dd=dIdx(d),pat=store.pattern[c]||[],inf=offInfo(c,k),ap=offOn(c,k);
 const pend=!ap&&inf.some(r=>!r.t1&&r.status==='Menunggu'),part=inf.find(r=>r.t1);
 const free=ap?0:(pat[dd]||[]).filter(sl=>!offSlot(c,k,sl)&&!store.book.some(b=>b.coach===c&&b.day===dd&&b.time===sl)).length;
 const tip=inf.map(r=>offLbl(r)+' ('+r.status.toLowerCase()+')'+(r.detail?': '+r.detail:'')).join(' | ');
 const cls=ap?'off':pend?'pend':free>0?'hi':'';
 const line=ap?offLbl(inf.find(r=>r.status==='Disetujui'&&!r.t1)):pend?offLbl(inf.find(r=>!r.t1)):free+' kosong';
 return `<div class="cd ${cls} ${part?'part':''} ${i===0?'today':''} ${k===appState.cdate?'sel':''}" data-act="calpick" data-v="${k}" ${tip?`title="${esc(tip)}"`:''}><b>${d.getDate()}${inf.length?'<i class="dot"></i>':''}</b><span>${esc(line)}</span>${part?`<em>${esc(part.t1+'-'+part.t2)}${part.status==='Menunggu'?' ?':''}</em>`:''}</div>`};
const offList=c=>{const t=iso(TODAY),a=store.reqs.filter(r=>r.who===c&&['izin_coach','cuti','berhalangan'].includes(r.type)&&['Menunggu','Disetujui'].includes(r.status)&&(r.date2||r.date)>=t).sort((x,y)=>x.date<y.date?-1:1);
 return a.length?`<div class="listv" style="margin-top:12px"><h4 style="margin:0;font-size:13px">Informasi coach tidak bisa mengajar</h4>${a.map(r=>`<div class="li"><div><b>${fmtD(parseDate(r.date))}${r.date2&&r.date2!==r.date?' - '+fmtD(parseDate(r.date2)):''} · ${esc(offLbl(r))}</b><small>${esc(r.detail||'')}</small></div>${pill(r.status==='Disetujui'?'Disetujui':'Menunggu',r.status==='Disetujui'?'good':'warn')}</div>`).join('')}</div>`:''};
function freeSlots(days,coachId){const out=[];const nowS=hhmm(new Date());for(let i=0;i<days;i++){const d=addD(TODAY,i),k=iso(d),di=dIdx(d);(coachId?[coachId]:COACHES).forEach(c=>{if(offOn(c,k))return;((store.pattern[c]||[])[di]||[]).forEach(t=>{if(i===0&&t<=nowS)return;if(offSlot(c,k,t))return;if(!store.book.some(b=>b.coach===c&&b.day===di&&b.time===t))out.push({d:k,di,t,c})})})}return out}
const getReportsOf=coachId=>store.reports.filter(r=>!r.missed&&(!coachId||findClientById(r.cid).coach===coachId));
const getPendingCorrections=coachId=>getReportsOf(coachId).filter(r=>!r.fix);
const holdOf=(cid,k)=>{const b=store.book.find(x=>x.client===cid&&x.day===dIdx(parseDate(k)));return !!(b&&b.hold)};
function getSessionAttendance(days,coach){
 const out=[];
 // Komisi dari absensi coach (attSlot): setiap slot yang dikonfirmasi Hadir.
 // F1.1: filter periode memakai inRange (sama seperti transaksi) — benar juga
 // untuk periode 'bulan'/'kustom', bukan hanya angka hari.
 // F1.3: satu entri PER KLIEN dalam slot (bukan booking pertama saja);
 // kehadiran klien tidak diperiksa (keputusan user 2026-10-20: pemicu komisi
 // adalah kehadiran coach; uang program klien sudah disetor).
 Object.keys(store.attSlot||{}).forEach(key=>{
  const rec=store.attSlot[key];
  if(!rec||rec.s!=='Hadir')return;
  const[k,coachId,time]=key.split('|');
  if(coach&&coachId!==coach)return;
  if(!inRange(k,days))return;
  const d=parseDate(k);
  // Semua booking yang cocok: coach + hari-dalam-seminggu + jam
  const bs=store.book.filter(x=>x.coach===coachId&&x.day===dIdx(d)&&x.time===time);
  // Komisi Bulanan Fase C: klien titipan ke coach ini pada tanggal+jam ini ikut
  // terhitung; pelatih aktual (penerima komisi) adalah coach pengganti.
  const titipan=(store.titip||[]).filter(t=>t.to===coachId&&t.date===k&&t.time===time);
  // Sesi pengganti (undur terjadwal manual): catatan tanggal + jam untuk coach
  // ini ikut terhitung; pelatihnya coach yang sama (yang izinnya digantikan).
  const gnti=(store.makeup||[]).filter(t=>t.coach===coachId&&t.date===k&&t.time===time);
  if(!bs.length&&!titipan.length&&!gnti.length){out.push({date:k,cid:null,client:'-',coach:coachId,pid:null,fee:0});return}
  const seen=new Set();
  bs.forEach(b=>{
   const c=findClientById(b.client);
   if(!c||seen.has(c.id))return;
   seen.add(c.id);
   // Pengaman warisan: sesi sebelum tanggal mulai klien tidak dihitung untuknya
   if(c.start&&k<c.start)return;
   // Komisi Bulanan Fase A: sesi setelah tanggal selesai klien juga tidak dihitung
   // (sebelumnya bocor selama booking klien belum dihapus).
   if(k>getClientEndDate(c))return;
   out.push({date:k,cid:c.id,client:c.name,coach:coachId,pid:c.pid,fee:(findProgramById(c.pid)||{}).fee||0});
  });
  titipan.forEach(t=>{
   const c=findClientById(t.client);
   if(!c||c.arch||seen.has(c.id))return;
   seen.add(c.id);
   if(c.start&&k<c.start)return;
   if(k>getClientEndDate(c))return;
   out.push({date:k,cid:c.id,client:c.name,coach:coachId,pid:c.pid,fee:(findProgramById(c.pid)||{}).fee||0,titip:true,from:t.from});
  });
  gnti.forEach(t=>{
   const c=findClientById(t.client);
   if(!c||c.arch||seen.has(c.id))return;
   seen.add(c.id);
   if(c.start&&k<c.start)return;
   if(k>getClientEndDate(c))return;
   out.push({date:k,cid:c.id,client:c.name,coach:coachId,pid:c.pid,fee:(findProgramById(c.pid)||{}).fee||0,makeup:true});
  });
 });
 return out;
}
// Komisi Bulanan Fase A: total sesi TERJADWAL klien dalam rentang [a,b] —
// penyebut kolom "hadir / terjadwal". Diturunkan dari slot booking klien,
// dibatasi masa program [mulai, selesai], dan mengeluarkan hari/jam izin-cuti
// coach yang disetujui (penyesuaian C: sesi yang mustahil hadir tidak dihitung).
function scheduledSessions(c,a,b){
 if(!c||!c.start)return 0;
 const slots=store.book.filter(x=>x.client===c.id);
 if(!slots.length)return 0;
 const lo=parseDate(c.start),hi=parseDate(getClientEndDate(c));
 let n=0;const counted=new Set();
 for(let d=new Date(a);d<=b;d=addD(d,1)){
  if(d<lo||d>hi)continue;
  const k=iso(d),di=dIdx(d);
  slots.forEach(s=>{
   if(s.day!==di)return;
   // Fase C: sesi yang dititipkan ke coach pengganti tetap terjadwal (digelar
   // oleh pengganti), jadi hari izin coach pemilik tidak mengeluarkannya.
   if((store.titip||[]).some(t=>t.client===c.id&&t.date===k&&t.time===s.time)){counted.add(k+'|'+s.time);n++;return}
   if(c.coach&&offOn(c.coach,k))return;
   if(c.coach&&offSlot(c.coach,k,s.time))return;
   counted.add(k+'|'+s.time);n++;
  });
 }
 // Sesi pengganti (undur terjadwal manual): penempatannya terjadwal pada
 // tanggal + jam pilihannya. Yang kebetulan sama persis dengan slot pola yang
 // sudah terhitung di atas tidak dihitung dua kali.
 (store.makeup||[]).forEach(t=>{
  if(t.client!==c.id)return;
  const kd=parseDate(t.date);
  if(kd<a||kd>b||kd<lo||kd>hi)return;
  if(counted.has(t.date+'|'+t.time))return;
  n++;
 });
 return n;
}
function getCommissionData(days){
 const ses=getSessionAttendance(days);
 const byCoach=COACHES.map(c=>{const sc=ses.filter(x=>x.coach===c),ks=sum(sc.map(x=>x.fee));return{c,kom:ks,komSes:ks,nSes:sc.length}});
 const byProg=activePrograms().map(p=>{const sp=ses.filter(x=>x.pid===p.id);return{p,kom:sum(sp.map(x=>x.fee)),nSes:sp.length}});
 // Paket Pertemuan: sesi KUMULATIF dari tanggal mulai klien s/d akhir periode
 // terpilih — dasar progres paket (cumSes / pkgTotal). Dihitung sekali, hanya
 // bila ada klien berprogram paket pada mode rentang (bulan).
 const hasPkg=!!(days&&typeof days==='object')&&store.clients.some(cl=>pkgSessions(findProgramById(cl.pid)));
 const sesCum=hasPkg?getSessionAttendance({a:parseDate(store.clients.map(c=>c.start).filter(Boolean).sort()[0]||iso(days.a)),b:days.b}):null;
 // F1.2: baris per klien — klien aktif selalu tampil (walau belum ada sesi);
 // klien non-aktif (arsip/selesai) tampil bila punya sesi pada periode ini.
 const isRange=!!(days&&typeof days==='object');
 const byClient=store.clients.map(cl=>{
  const sc=ses.filter(x=>x.cid===cl.id);
  const aktif=!cl.arch&&getClientStatus(cl)!=='Selesai';
  // Mode bulan: klien yang masa programnya sama sekali di luar bulan terpilih
  // (belum mulai / sudah berakhir sebelum bulan itu) tidak ditampilkan.
  const showable=isRange?(aktif&&cl.start<=iso(days.b)&&getClientEndDate(cl)>=iso(days.a)):aktif;
  if(!showable&&!sc.length)return null;
  // Fase C: rincian per pelatih AKTUAL — sesi titipan menjadi perolehan coach
  // pengganti, sehingga pembayaran klien bisa dipecah per pelatih.
  const perCoach={};sc.forEach(x=>{const g=perCoach[x.coach]||(perCoach[x.coach]={coach:x.coach,nSes:0,kom:0});g.nSes++;g.kom+=x.fee});
  const pkg=pkgSessions(findProgramById(cl.pid));
  const cumSes=pkg&&sesCum?Math.min(sesCum.filter(x=>x.cid===cl.id).length,pkg):0;
  // Catatan titip (2026-10-22): segmen pelatih PENGGANTI membawa hitungan
  // titipannya sendiri — titipSes (sesi titipan yang ia latih) dari titipN
  // (sesi yang dititipkan kepadanya untuk klien ini) — BUKAN progres paket
  // klien. Cakupan titipSes mengikuti kolom progres (kumulatif s/d akhir
  // periode untuk program paket; periode terpilih untuk program kalender).
  Object.values(perCoach).forEach(g=>{
   if(g.coach===cl.coach)return;
   g.titipSes=(pkg&&sesCum?sesCum:sc).filter(y=>y.cid===cl.id&&y.coach===g.coach&&y.titip).length;
   const tN=(store.titip||[]).filter(t=>t.client===cl.id&&t.to===g.coach&&(pkg&&isRange?(!cl.start||t.date>=cl.start)&&t.date<=iso(days.b):inRange(t.date,days))).length;
   g.titipN=Math.max(tN,g.titipSes);
  });
  // Tanggal sesi terakhir terhitung per segmen (2026-10-22): cakupannya sama
  // dengan pecahan yang ditampilkan segmen itu — progres klien (semua pelatih)
  // untuk segmen pemilik, sesi titipannya sendiri untuk segmen pengganti.
  const lastOf=arr=>arr.reduce((a,y)=>y.date>a?y.date:a,'');
  const lastKlien=lastOf(pkg&&sesCum?sesCum.filter(y=>y.cid===cl.id):sc);
  Object.values(perCoach).forEach(g=>{
   g.lastSes=g.coach===cl.coach?lastKlien:lastOf((pkg&&sesCum?sesCum:sc).filter(y=>y.cid===cl.id&&y.coach===g.coach&&y.titip));
  });
  // Klien yang sesi-sesinya dilatih pengganti tetap tampil di grup pemiliknya
  // sebagai baris progres (komisi pemilik Rp 0 untuk sesi titipan).
  if(sc.length&&!perCoach[cl.coach])perCoach[cl.coach]={coach:cl.coach,nSes:0,kom:0,lastSes:lastKlien};
  return{cl,c:cl.id,coach:cl.coach,pid:cl.pid,nSes:sc.length,nJadwal:isRange?scheduledSessions(cl,days.a,days.b):0,kom:sum(sc.map(x=>x.fee)),fee:(findProgramById(cl.pid)||{}).fee||0,perCoach:Object.values(perCoach),pkgTotal:pkg,cumSes};
 }).filter(Boolean);
 // Komisi Bulanan Fase A: baris diurutkan terbaru -> terlama (tanggal mulai klien).
 byClient.sort((x,y)=>x.cl.start<y.cl.start?1:x.cl.start>y.cl.start?-1:(x.cl.name<y.cl.name?-1:1));
 return{byCoach,byProg,byClient}}
// Paket Perbaikan Komisi (masalah 1-3): grup Performa per coach PENGHASIL.
// Sumbernya data getCommissionData yang sama (byCoach + byClient.perCoach):
// - SEMUA coach dari byCoach selalu hadir sebagai grup, walau tanpa perolehan
//   (grup kosong digambar 0 sesi / Rp 0 / Belum dibayar oleh perender);
// - tiap baris adalah satu segmen (klien x pelatih aktual): sesi titipan masuk
//   grup coach PENGGANTI, bukan pemilik klien;
// - klien tanpa sesi pada periode tampil sebagai satu segmen nol di grup
//   pemiliknya (aturan F1: klien aktif langsung tampil sejak awal).
const komCoachGroups=k=>{
 const groups=new Map();
 const ensure=c=>{if(!groups.has(c))groups.set(c,{coach:c,nSes:0,kom:0,rows:[]});return groups.get(c)};
 (k.byCoach||[]).forEach(bc=>ensure(bc.c));
 (k.byClient||[]).forEach(x=>{
  const segs=x.perCoach&&x.perCoach.length?x.perCoach:[{coach:x.coach,nSes:0,kom:0}];
  segs.forEach(g=>{const gr=ensure(g.coach);gr.rows.push({x,g});gr.nSes+=g.nSes;gr.kom+=g.kom})});
 return[...groups.values()]};
// F1.4: status bayar per KLIEN + label periode (bukan per coach lagi).
// Kunci peta store.paidByClient: '<client_id>|<label periode>' — label persis
// seperti perLbl() saat pembayaran dicatat. Record pembayaran tanpa client_id
// (legacy era per-coach) tidak masuk peta ini dan tidak menandai klien mana pun.
const payKey=(clientId,per)=>clientId+'|'+per;
const payOf=(clientId,per)=>(store.paidByClient||{})[payKey(clientId,per)]||null;
// Fase C: status bayar per segmen pelatih aktual (client|coach|periode).
const paySegOf=(clientId,coach,per)=>(store.paidSeg||{})[clientId+'|'+coach+'|'+per]||null;
// Paket Pertemuan (2026-10-21): unit kanonis "N pertemuan" (atau angka murni)
// berarti program adalah paket N sesi; bentuk lain (warisan: "16 minggu",
// "per bulan") -> null dan Komisi memakai penyebut kalender seperti sebelumnya.
const pkgSessions=p=>{if(!p||p.unit==null)return null;const m=String(p.unit).trim().match(/^(\d+)\s*(pertemuan)?$/i);return m?+m[1]:null};

export { calCell, filterTransactions, freeSlots, getCommissionData, getPendingCorrections, getReportsOf, getSessionAttendance, holdOf, hrZone, inRange, komCoachGroups, komLbl, komRange, komisiSet, liveClients, monthly, offInfo, offLbl, offList, offOn, offSlot, payDateFor, payKey, payOf, paySegOf, pkgSessions, scheduledSessions };
