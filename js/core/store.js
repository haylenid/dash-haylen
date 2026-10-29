/* js/core/store.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { COACHES, NOTES, PLAN, TARGET_PACE, TARGET_ZONE, ZD0, pick, rnd } from './constants.js';
import { TODAY, addD, dIdx, first, fmtD, iso, minsAgo, parseDate } from './helpers.js';

const store={};
store.members=[
 {id:'u1',name:'Bima Wirawan',role:'owner',login:'bima',email:'bima@numbersix.example',wa:'0812-3456-7801'},
 {id:'u2',name:'Sari Anggraini',role:'admin',login:'sari.admin',email:'sari@numbersix.example',wa:'0812-3456-7802'},
 {id:'u3',name:'Hendra Kusuma',role:'head',login:'hendra',email:'hendra@numbersix.example',wa:'0812-3456-7803'},
 {id:'u4',name:'Dimas Pratama',role:'coach',login:'dimas',email:'dimas@numbersix.example',wa:'0812-3456-7804'},
 {id:'u5',name:'Lestari Ayu',role:'coach',login:'lestari',email:'lestari@numbersix.example',wa:'0812-3456-7805'},
 {id:'u6',name:'Rangga Putra',role:'coach',login:'rangga',email:'rangga@numbersix.example',wa:'0812-3456-7806'},
 {id:'u7',name:'Maya Octaviani',role:'coach',login:'maya',email:'maya@numbersix.example',wa:'0812-3456-7807'}
];
store.programs=[
 {id:'p1',name:'Marathon 16 Minggu',price:6500000,unit:'16 minggu',wk:16,lvl:1},
 {id:'p2',name:'Half Marathon 12 Minggu',price:4200000,unit:'12 minggu',wk:12,lvl:.75},
 {id:'p3',name:'10K Starter 8 Minggu',price:2400000,unit:'8 minggu',wk:8,lvl:.5},
 {id:'p4',name:'Pace Rescue 4 Minggu',price:1500000,unit:'4 minggu',wk:4,lvl:.6},
 {id:'p5',name:'Private 1-on-1 Bulanan',price:3500000,unit:'per bulan',wk:4,lvl:.85},
 {id:'p6',name:'Paket Berdua 8 Minggu',price:4000000,unit:'8 minggu',wk:8,lvl:.6,peserta:2,fee:60000}
];
const findProgramById=id=>store.programs.find(p=>p.id===id)||{id:id||'',name:'(tanpa program)',price:0,unit:'',wk:0,lvl:0,fee:0,del:true};
const nextClientUid=()=>'N6-'+(1001+Math.max(-1,...store.clients.map(c=>parseInt(String(c.uid||'').slice(3))-1001||0))+1);
const findClientByUid=s=>{const k=String(s||'').trim().toUpperCase().replace(/\s+/g,'');return k?store.clients.find(c=>String(c.uid||'').toUpperCase()===k):null};
const SEED_CLIENTS=[
 ['Aditya Nugroho',0,-70,1,'Prima',0,186,330],['Putri Maharani',1,-40,2,'Prima',1,190,372],
 ['Reza Fahlevi',0,-95,0,'Perlu perhatian',0,184,348],['Kartika Dewi',2,-20,3,'Prima',0,192,420],
 ['Bagas Santoso',0,-30,4,'Cedera ringan',0,188,360],['Nadia Salsabila',3,-14,1,'Prima',1,194,405],
 ['Yoga Permana',1,-60,2,'Perlu perhatian',0,187,355],['Intan Permatasari',4,-12,3,'Prima',0,191,385],
 ['Fajar Ramadhan',0,-18,4,'Prima',0,185,338],['Citra Lestari',2,-45,0,'Istirahat',0,193,430],
 ['Andre Gunawan',1,-8,1,'Prima',0,189,365],['Mega Wulandari',4,-26,2,'Prima',1,190,392],
 ['Eko Prasetyo',0,-125,3,'Prima',0,183,342],['Wulan Sari',3,-31,4,'Prima',0,193,410],
 ['Dani Kurniawan',2,-75,0,'Prima',0,188,400],['Tiara Anindya',1,-5,1,'Prima',0,192,382]
];
store.clients=SEED_CLIENTS.map((r,i)=>({id:'cl'+(i+1),uid:'N6-'+(1001+i),name:r[0],pid:store.programs[r[1]].id,start:iso(addD(TODAY,r[2])),coach:COACHES[r[3]],cond:r[4],renew:!!r[5],hrmax:r[6],mp:r[7],arch:null}));
store.clients[12].arch=iso(addD(TODAY,-6));
store.clients[13].arch=iso(addD(TODAY,-3));
store.clients[14].arch=iso(addD(TODAY,-1));
const findClientById=id=>store.clients.find(c=>c.id===id);
const getMemberName=id=>store.members.find(m=>m.id===id)?.name||'-';
/* paket semi privat: program dengan peserta:2 (atau nama mengandung "semi privat"/"paket berdua") */
const isSemi=p=>!!p&&(+p.peserta===2||/semi[\s-]*priv|paket\s*(berdua|2)/i.test(p.name||''));
const partnerOf=c=>c&&c.grp?store.clients.find(x=>x.grp===c.grp&&x.id!==c.id)||null:null;
const uniqClientId=()=>{let id;do{id='cl'+(store.clients.length+1+Math.floor(Math.random()*9000))}while(store.clients.some(x=>x.id===id));return id};
/* catatan awal klien contoh */
const SEED_NOTES={'Reza Fahlevi':'Sering terlambat setor laporan. Perlu diingatkan lewat pesan.','Bagas Santoso':'Cedera ringan betis kanan. Kurangi intensitas sampai pulih.','Yoga Permana':'Target half marathon. Pace belum stabil, fokus easy run.','Citra Lestari':'Istirahat sementara, lanjut setelah urusan keluarga selesai.','Putri Maharani':'Berminat perpanjang program bulan depan.','Nadia Salsabila':'Berminat perpanjang program bulan depan.'};
store.clients.forEach(c=>{c.note=SEED_NOTES[c.name]||''});
const getClientEndDate=c=>c.end||iso(addD(parseDate(c.start),findProgramById(c.pid).wk*7));
function getClientStatus(c){if(c.arch)return'Arsip';if(c.cond==='Istirahat')return'Jeda';const e=parseDate(getClientEndDate(c));if(e<TODAY)return'Selesai';if((e-TODAY)/864e5<=14)return'Segera berakhir';return'Aktif'}
store.pattern={};
COACHES.forEach((c,i)=>{store.pattern[c]=[0,1,2,3,4,5,6].map(d=>d<5?(i%2?['05:30','06:30','17:30','18:30']:['06:30','07:30','16:30','17:30']):d===5?['05:30','06:30','07:30']:(i<3?['05:30','06:30']:[]))});
store.book=[];
store.clients.filter(c=>!c.arch).forEach((c,i)=>{for(let k=0;k<2;k++){const day=(i+k*2+1)%5;const sl=(store.pattern[c.coach]||[])[day]||[];for(let j=0;j<sl.length;j++){const t=sl[(i+k+j)%sl.length];if(!store.book.some(b=>b.coach===c.coach&&b.day===day&&b.time===t)){store.book.push({coach:c.coach,client:c.id,day,time:t});break}}}});
store.reqs=[
 {id:'r1',type:'izin_coach',who:'u5',date:iso(addD(TODAY,3)),date2:iso(addD(TODAY,3)),detail:'Acara keluarga. Sesi pagi dialihkan ke Maya.',status:'Menunggu',at:minsAgo(95)},
 {id:'r2',type:'cuti',who:'u6',date:iso(addD(TODAY,9)),date2:iso(addD(TODAY,13)),detail:'Cuti tahunan.',status:'Disetujui',at:minsAgo(2800)},
 {id:'r3',type:'reschedule',who:'u4',date:iso(addD(TODAY,2)),date2:iso(addD(TODAY,3)),detail:'Sesi Aditya Nugroho 06:30 dipindah ke 17:30 karena bentrok jadwal kerja klien.',status:'Menunggu',at:minsAgo(140)},
 {id:'r4',type:'berhalangan',who:'u7',date:iso(addD(TODAY,1)),date2:iso(addD(TODAY,1)),detail:'Kontrol dokter, tidak bisa sesi pagi.',status:'Disetujui',at:minsAgo(1500)},
 {id:'r5',type:'izin_client',who:'cl3',date:iso(addD(TODAY,1)),date2:iso(addD(TODAY,2)),detail:'Nyeri betis kiri, istirahat 2 hari.',status:'Menunggu',at:minsAgo(60)},
 {id:'r6',type:'izin_client',who:'cl6',date:iso(addD(TODAY,-2)),date2:iso(addD(TODAY,-2)),detail:'Dinas luar kota.',status:'Disetujui',at:minsAgo(4000)},
 {id:'r7',type:'masalah',who:'u4',date:iso(TODAY),date2:iso(TODAY),detail:'Data jam GPS Reza tidak masuk ke laporan harian.',sev:'Sedang',status:'Menunggu',at:minsAgo(30)}
];
store.zones=[{z:1,lo:50,hi:60,n:'Pemulihan'},{z:2,lo:60,hi:70,n:'Aerobik'},{z:3,lo:70,hi:80,n:'Tempo ringan'},{z:4,lo:80,hi:90,n:'Ambang laktat'},{z:5,lo:90,hi:100,n:'Kapasitas maksimal'}];
store.tpl=[
 {id:'t1',title:'Pace terlalu cepat',text:'Halo {nama}, pace {jenis} kamu lebih cepat dari patokan. Turunkan 10 sampai 15 detik per km supaya HR tetap di zona target dan pemulihan terjaga.'},
 {id:'t2',title:'Jarak kurang',text:'{nama}, jarak sesi {jenis} ini kurang dari program. Tidak apa-apa sesekali. Kejar volume minggu ini di sesi berikutnya tanpa menambah intensitas.'},
 {id:'t3',title:'Kerja bagus',text:'Sesi {jenis} yang rapi, {nama}. Pace stabil dan HR terkendali. Pertahankan.'},
 {id:'t4',title:'Waspada cedera',text:'{nama}, catatan nyeri kamu perlu diperhatikan. Kurangi intensitas 2 hari ke depan dan kabari saya kalau nyeri bertahan.'},
 {id:'t5',title:'HR terlalu tinggi',text:'HR rata-rata kamu di atas zona target untuk sesi {jenis}. Perlambat langkah, fokus ke napas, dan cek kualitas tidur serta hidrasi.'}
];
const fillTemplate=(t,name,type)=>t.replace(/\{nama\}/g,first(name)).replace(/\{jenis\}/g,type);
store.reports=[];
let _rid=1;
store.clients.filter(c=>!c.arch&&getClientStatus(c)!=='Selesai'&&c.cond!=='Istirahat').forEach(c=>{
 const f=findProgramById(c.pid).lvl;
 for(let back=13;back>=0;back--){
  const d=addD(TODAY,-back),pl=PLAN[dIdx(d)];
  if(!pl||parseDate(c.start)>d)continue;
  if(back===0&&rnd()<.5)continue;
  const plan=Math.max(3,Math.round(pl.k*f));
  const r={id:'rp'+_rid++,cid:c.id,date:iso(d),type:pl.t,plan,fix:null};
  if(back>0&&rnd()<.1){r.missed=true}
  else{
   r.km=Math.round(plan*(.78+rnd()*.34)*10)/10;
   r.pace=c.mp*TARGET_PACE[pl.t]/100*(.96+rnd()*.1);
   const z=ZD0[TARGET_ZONE[pl.t]-1];
   r.hr=Math.round(c.hrmax*(z[0]+z[1])/200*(.98+rnd()*.12));
   r.rasa=1+Math.floor(rnd()*5);
   r.note=rnd()<.4?pick(NOTES):'';
   if(rnd()<(back>=3?.88:.3)){const tp=pick(store.tpl);r.fix={by:'u3',text:fillTemplate(tp.text,c.name,pl.t),at:new Date(Math.min(Date.now()-600000,d.getTime()+(19+rnd()*3)*36e5))}}
  }
  store.reports.push(r);
 }
});
store.clients.forEach(c=>{c.sw='https://numbersix.example/sw/'+c.uid});
store.reports.forEach(r=>{if(!r.missed&&parseInt(String(r.id).slice(2))%3!==0){const c=findClientById(r.cid);if(c)r.sw='https://numbersix.example/sw/'+c.uid+'/'+r.date}});
store.tx=[];
let _tid=1;
const EXP=[['Sewa Studio',1,6000000,'Sewa studio dan ruang konsultasi'],['Software & Server',5,850000,'Langganan aplikasi dan server'],['Iklan',8,0,'Iklan Instagram dan Strava'],['Perlengkapan',15,0,'Cone, bib, dan perlengkapan sesi'],['Gaji Admin',25,5000000,'Gaji admin bulanan']];
for(let m=5;m>=0;m--){
 const b=new Date(TODAY.getFullYear(),TODAY.getMonth()-m,1);
 const dim=new Date(b.getFullYear(),b.getMonth()+1,0).getDate();
 const last=m===0?TODAY.getDate():dim;
 const n=m===0?Math.max(3,Math.round(last*.55)):9+Math.floor(rnd()*5);
 for(let k=0;k<n;k++){
  const day=Math.min(last,1+Math.floor(k*(last-1)/Math.max(1,n-1)));
  const r=rnd(),pi=r<.25?0:r<.5?1:r<.7?2:r<.8?3:4,p=store.programs[pi];
  store.tx.push({id:'t'+_tid++,date:iso(new Date(b.getFullYear(),b.getMonth(),day)),type:'in',pid:p.id,cat:p.name,coach:pick(COACHES),desc:pick(SEED_CLIENTS)[0],amt:p.price});
 }
 EXP.forEach(([cat,day,amt,desc])=>{if(day>last)return;const a=amt||Math.round((2200000+rnd()*1800000)/50000)*50000;store.tx.push({id:'t'+_tid++,date:iso(new Date(b.getFullYear(),b.getMonth(),day)),type:'out',cat,desc,amt:a})});
}
store.targets={rev:45000000,klien:5,retensi:75,koreksi:90};
store.paid={};
store.payInfo={};
/* F1.4: pembayaran komisi per klien+periode: '<client_id>|<label periode>' -> info bayar.
   paidLegacy: record pembayaran era per-coach (tanpa client_id), tidak menandai klien. */
store.paidByClient={};
store.paidLegacy=[];
store.msgs={
 team:[
  {w:'u1',text:'Pagi tim. Minggu ini koreksi laporan harian maksimal H+1.',t:minsAgo(190)},
  {w:'u3',text:'Siap. Saya cek koreksi yang menunggu dan bagi ke coach.',t:minsAgo(170)},
  {w:'u5',text:'Izin hari Rabu depan sudah saya ajukan di Absensi.',t:minsAgo(95)},
  {w:'u2',text:'Sudah masuk. Menunggu persetujuan Head Coach.',t:minsAgo(80)}
 ],
 dm:{
  cl1:[{w:'cl1',text:'Coach, betis kanan agak kaku setelah long run kemarin.',t:minsAgo(300)},{w:'u4',text:'Terima kasih infonya. Besok easy 6 km saja dan stretching 10 menit.',t:minsAgo(280)}],
  cl3:[{w:'cl3',text:'Izin istirahat dua hari ya coach, betis kiri nyeri.',t:minsAgo(70)}],
  cl6:[{w:'u4',text:'Minggu ini fokus ke pace easy. Jangan kejar kecepatan dulu.',t:minsAgo(1200)},{w:'cl6',text:'Siap coach.',t:minsAgo(1180)}]
 },
 bc:[{id:'b1',to:'Semua klien aktif',n:12,text:'Pengingat: latihan bersama hari Minggu pukul 05:30 di titik kumpul biasa.',t:minsAgo(1500),by:'u2'}]
};
store.log=[
 {t:minsAgo(3),who:'Hendra Kusuma',text:'mengirim koreksi untuk Reza Fahlevi'},
 {t:minsAgo(18),who:'Sari Anggraini',text:'memproses izin klien Putri Maharani'},
 {t:minsAgo(45),who:'Lestari Ayu',text:'mengajukan izin tanggal '+fmtD(addD(TODAY,3))},
 {t:minsAgo(120),who:'Hendra Kusuma',text:'memperbarui pola mingguan jadwal coach'}
];
store.acl={
 admin:{beranda:'full',klien:'full',coach:'full',koreksi:'full',program:'full',pesan:'full',absensi:'full',komisi:'mask',keuangan:'none',laporan:'mask',anggota:'full',setting:'full',progress:'none'},
 head:{beranda:'full',klien:'full',coach:'full',koreksi:'full',program:'full',pesan:'full',absensi:'full',komisi:'none',keuangan:'none',laporan:'mask',anggota:'none',setting:'full',progress:'none'},
 coach:{beranda:'full',klien:'full',coach:'full',koreksi:'none',program:'full',pesan:'full',absensi:'full',komisi:'full',keuangan:'none',laporan:'none',anggota:'none',setting:'full',progress:'none'}
};
const appState={role:'owner',page:'beranda',tab:0,nav:false,modal:null,q:'',cf:'all',per:30,komY:null,komM:null,tp:'bulan',gate:false,theme:'system',
 kcoach:'all',clcoach:'all',kweek:0,kdate:iso(TODAY),sched:'u4',cal:'u4',chat:'cl1',editfix:null,rep:'client',repPer:30,confirm:null,syncAt:new Date(),focus:null,openMark:null,share:'u4',shareDays:7,bcTo:'all',acoach:'all',adate:iso(TODAY),
 prog:{name:'Aditya Nugroho',coach:'Dimas Pratama',age:34,target:'42195',pbNow:'4:25:00',pbTarget:'4:00:00',title:'',phase:'umum',sdate:iso(TODAY),edate:iso(addD(TODAY,6)),hrmax:186,weeks:[36],start:36,inc:8,calcVol:48,detail:true,fmt:'pdf',tplId:'t1'}
};
store.types=[
 {k:'Recovery',zone:1,day:5,pace:128,share:10},
 {k:'Easy',zone:2,day:1,pace:118,share:15},
 {k:'Tempo',zone:4,day:2,pace:94,share:20},
 {k:'Interval',zone:5,day:4,pace:88,share:15},
 {k:'Long Run',zone:2,day:6,pace:110,share:40}
];

export { EXP, SEED_CLIENTS, _rid, _tid, appState, fillTemplate, findClientById, findClientByUid, findProgramById, getClientEndDate, getClientStatus, getMemberName, isSemi, nextClientUid, partnerOf, store, uniqClientId };
