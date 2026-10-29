/* js/core/constants.js — diekstrak otomatis dari index.html (fase 4 refactor) */
const ROLE={owner:'Pemilik',admin:'Admin',head:'Head Coach',coach:'Coach'};
const ROLE_USER_IDS={owner:'u1',admin:'u2',head:'u3',coach:'u4'};
const COACHES=['u3','u4','u5','u6','u7'];
const SLOTS=['05:30','06:30','07:30','12:00','13:00','16:30','17:30','18:30','19:30','20:30'];
const PERIODS=['Pagi','Siang','Sore','Malam'];
const periodOf=t=>t<'11:00'?'Pagi':t<'15:00'?'Siang':t<'19:00'?'Sore':'Malam';
const MODS=[['beranda','Beranda'],['klien','Klien'],['coach','Coach'],['koreksi','Koreksi'],['program','Buat Program'],['pesan','Pesan'],['absensi','Absensi'],['komisi','Komisi'],['keuangan','Keuangan'],['laporan','Laporan'],['anggota','Anggota'],['setting','Setting'],['progress','Progress']];
const NAVIC={beranda:'home',klien:'klien',coach:'coach',koreksi:'koreksi',program:'program',pesan:'pesan',absensi:'absensi',komisi:'komisi',keuangan:'keuangan',laporan:'laporan',anggota:'anggota',setting:'setting',progress:'progress'};
const PLAN=[null,{t:'Easy',k:8},{t:'Tempo',k:10},null,{t:'Interval',k:9},{t:'Recovery',k:6},{t:'Long Run',k:24}];
const TARGET_PACE={Easy:118,Tempo:94,Interval:88,Recovery:128,'Long Run':110};
const TARGET_ZONE={Easy:2,Tempo:4,Interval:5,Recovery:1,'Long Run':2};
const ZD0=[[50,60],[60,70],[70,80],[80,90],[90,100]];
const NOTES=['Kaki terasa berat di km terakhir.','Cuaca panas, beberapa kali berhenti minum.','Rute menanjak, pace sulit stabil.','Tidur kurang semalam.','Merasa kuat, negative split.','Nyeri ringan di betis kiri.'];
const CONDC={Prima:'--good','Perlu perhatian':'--warn','Cedera ringan':'--bad',Istirahat:'--muted'};
let prngSeed=11;
const rnd=()=>(prngSeed=(prngSeed*1664525+1013904223)%4294967296)/4294967296;
const pick=a=>a[Math.floor(rnd()*a.length)];
const NAVT={beranda:'Beranda',klien:'Klien',coach:'Coach',komisi:'Komisi',keuangan:'Keuangan',koreksi:'Koreksi',program:'Buat Program',pesan:'Pesan',laporan:'Laporan',absensi:'Absensi',anggota:'Anggota',setting:'Setting',progress:'Progress'};
const REQUEST_TYPE_LABELS={izin_coach:'Izin Coach',reschedule:'Reschedule Jadwal',cuti:'Cuti',berhalangan:'Jadwal Berhalangan',izin_client:'Izin Client',masalah:'Report Masalah'};
const REQUEST_TYPE_KEYS=Object.keys(REQUEST_TYPE_LABELS);

export { COACHES, CONDC, MODS, NAVIC, NAVT, NOTES, PERIODS, PLAN, REQUEST_TYPE_KEYS, REQUEST_TYPE_LABELS, ROLE, ROLE_USER_IDS, SLOTS, TARGET_PACE, TARGET_ZONE, ZD0, periodOf, pick, prngSeed, rnd };
