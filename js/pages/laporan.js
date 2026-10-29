/* js/pages/laporan.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { canAccess, logAct, meId, meUser, money, perm, scope } from '../core/access.js';
import { COACHES, REQUEST_TYPE_KEYS, REQUEST_TYPE_LABELS, ROLE_USER_IDS } from '../core/constants.js';
import { filterTransactions, getCommissionData, inRange, liveClients, offOn, payOf } from '../core/derived.js';
import { TODAY, addD, dIdx, esc, first, fmtD, iso, sum } from '../core/helpers.js';
import { icon, logo } from '../core/icons.js';
import { ACT, PAGES } from '../core/registry.js';
import { locOf } from '../core/shared.js';
import { appState, findClientById, findProgramById, getClientStatus, getMemberName, store } from '../core/store.js';
import { kpi, maskNote, perLbl, perRange, renderSegmented } from '../ui/components.js';
import { exportReport } from '../ui/pdf.js';
import { copyToClipboard, render, toast } from '../ui/shell.js';

const REPORT_KINDS=[['client','Ringkasan klien','klien'],['latihan','Hasil latihan klien','klien'],['komisi','Ringkasan komisi','komisi'],['keuangan','Ringkasan keuangan','keuangan'],['absen','Absensi coach','absensi'],['izin','Absensi: izin, jadwal, masalah','absensi']];
function buildReport(kind){
 const sv=[appState.per,appState.pfrom,appState.pto];appState.per=appState.repPer;appState.pfrom=appState.rfrom||'';appState.pto=appState.rto||'';
 try{return buildReportContent(kind)}finally{[appState.per,appState.pfrom,appState.pto]=sv}}
function buildReportContent(kind){
 const d=appState.repPer,per=perLbl(),rg=perRange();
 if(kind==='latihan'){const l=scope(store.clients).filter(c=>!c.arch),rows=l.map(c=>{const rs=store.reports.filter(x=>x.cid===c.id&&inRange(x.date,d)),got=rs.filter(x=>!x.missed),pl=sum(rs.map(x=>x.plan)),ak=sum(got.map(x=>x.km));return{c,n:got.length,ms:rs.length-got.length,ak,pct:pl?Math.round(ak/pl*100):0,fx:got.filter(x=>x.fix).length}}).filter(x=>x.n+x.ms>0);return{title:'Hasil latihan klien',per,sum:[['Klien aktif berlatih',rows.length],['Laporan masuk',sum(rows.map(x=>x.n))],['Tidak lapor',sum(rows.map(x=>x.ms))],['Total jarak',Math.round(sum(rows.map(x=>x.ak)))+' km']],head:['Nama','Paket','Coach','Laporan','Tidak lapor','Jarak (km)','Kepatuhan','Dikoreksi'],rows:rows.map(x=>[x.c.name,findProgramById(x.c.pid).name,first(getMemberName(x.c.coach)),x.n,x.ms,Math.round(x.ak*10)/10,x.pct+'%',x.fx])}}
 if(kind==='absen'){const rows=(appState.role==='coach'?[meId()]:COACHES).map(c=>{let j=0,h=0;for(let t=new Date(rg.a);t<=rg.b&&t<=TODAY;t=addD(t,1)){const k=iso(t);if(!(store.pattern[c][dIdx(t)]||[]).length||offOn(c,k))continue;j++;const rec=(store.attCoach[c]||{})[k];if(rec&&rec.in)h++}return[getMemberName(c),locOf(c),j,h,j?Math.round(h/j*100)+'%':'-']});return{title:'Absensi coach',per,sum:[['Coach',rows.length],['Hari terjadwal',sum(rows.map(x=>x[2]))],['Hari hadir',sum(rows.map(x=>x[3]))]],head:['Coach','Lokasi','Hari terjadwal','Hadir','Kehadiran'],rows}}
 if(kind==='client'){const l=scope(store.clients).filter(c=>!c.arch),st=s=>l.filter(c=>getClientStatus(c)===s).length;return{title:'Ringkasan klien',per,sum:[['Klien berjalan',liveClients().length],['Baru dalam periode',l.filter(c=>inRange(c.start,d)).length],['Segera berakhir',st('Segera berakhir')],['Jeda',st('Jeda')],['Selesai',st('Selesai')]],head:['Nama','Paket','Coach','Status','Kondisi'],rows:l.map(c=>[c.name,findProgramById(c.pid).name,first(getMemberName(c.coach)),getClientStatus(c),c.cond])}}
 if(kind==='komisi'){const k=getCommissionData(d),M=v=>money(v,'komisi');return{title:'Ringkasan komisi',per,sum:[['Sesi hadir',sum(k.byClient.map(x=>x.nSes))],['Total komisi',M(sum(k.byClient.map(x=>x.kom)))],['Klien terbayar',k.byClient.filter(x=>payOf(x.c,per)).length+' dari '+k.byClient.length]],head:['Coach','Klien','Sesi hadir','Komisi','Pembayaran'],rows:k.byClient.map(x=>[getMemberName(x.coach),x.cl.name,x.nSes,M(x.kom),payOf(x.c,per)?'Dibayar':'Belum'])}}
 if(kind==='keuangan'){const i=filterTransactions(d,'in'),o=filterTransactions(d,'out'),M=v=>money(v);const cats=[...new Set([...i,...o].map(x=>x.type+'|'+x.cat))];return{title:'Ringkasan keuangan',per,sum:[['Pemasukan',M(sum(i.map(x=>x.amt)))],['Pengeluaran',M(sum(o.map(x=>x.amt)))],['Laba bersih',M(sum(i.map(x=>x.amt))-sum(o.map(x=>x.amt)))]],head:['Jenis','Kategori','Jumlah'],rows:cats.map(c=>{const[tp,cat]=c.split('|'),l=(tp==='in'?i:o).filter(x=>x.cat===cat);return[tp==='in'?'Masuk':'Keluar',cat,M(sum(l.map(x=>x.amt)))]})}}
 const mine=appState.role==='coach',own=r=>r.type==='izin_client'?findClientById(r.who)?.coach===meId():r.who===meId();
 const l=store.reqs.filter(r=>(!mine||own(r))&&inRange(iso(new Date(r.at)),d)).sort((x,y)=>new Date(y.at)-new Date(x.at));
 const cnt=(tp,st)=>l.filter(r=>r.type===tp&&(!st||r.status===st)).length,tot=st=>l.filter(r=>!st||r.status===st).length;
 const rekap=REQUEST_TYPE_KEYS.map(k=>[REQUEST_TYPE_LABELS[k],cnt(k),cnt(k,'Disetujui'),cnt(k,'Menunggu'),cnt(k,'Ditolak'),cnt(k,'Selesai')]);
 rekap.push(['Total',tot(),tot('Disetujui'),tot('Menunggu'),tot('Ditolak'),tot('Selesai')]);
 const pihak=r=>r.type==='izin_client'?(findClientById(r.who)?.name||'-'):getMemberName(r.who);
 const tgl=r=>r.type==='masalah'?fmtD(new Date(r.at)):fmtD(r.date)+(r.date2&&r.date2!==r.date?' - '+fmtD(r.date2):'');
 const ket=r=>(r.sev?'['+r.sev+'] ':'')+(r.t1?'Jam '+r.t1+'-'+r.t2+'. ':'')+(r.detail||'-');
 const detail=l.map(r=>[REQUEST_TYPE_LABELS[r.type],pihak(r),tgl(r),ket(r),r.status]);
 return{title:'Ringkasan absensi dan pengajuan',per,
  sum:[['Total pengajuan',tot()],['Disetujui',tot('Disetujui')],['Menunggu',tot('Menunggu')],['Ditolak',tot('Ditolak')],['Masalah diselesaikan',cnt('masalah','Selesai')]],
  head:['Jenis','Pihak','Tanggal','Keterangan','Status'],rows:detail,
  sections:[
   {title:'Rekap per jenis',note:'Izin Coach, Reschedule, Cuti, Berhalangan, Izin Client, Masalah',head:['Jenis','Total','Disetujui','Menunggu','Ditolak','Selesai'],rows:rekap,boldLast:true,align:['l','c','c','c','c','c']},
   {title:'Rincian pengajuan',note:detail.length+' data, terbaru di atas',head:['Jenis','Pihak','Tanggal','Keterangan','Status'],rows:detail}
  ]}}
const repSecs=r=>r.sections||[{head:r.head,rows:r.rows}];
const reportText=r=>[`N6 - ${r.title.toUpperCase()}`,`Periode ${r.per}`,'',...r.sum.map(([k,v])=>`${k}: ${v}`),...[].concat(...repSecs(r).map(sc=>['',(sc.title?sc.title.toUpperCase():''),sc.head.join('\t'),...sc.rows.map(x=>x.join('\t'))]))].join('\n');
PAGES.laporan=()=>{
 if(!REPORT_KINDS.some(k=>k[0]===appState.rep&&canAccess(k[2])))appState.rep='client';
 const r=buildReport(appState.rep);
 return `<div class="stackv">${maskNote('laporan')}<div class="toolbar"><span class="sub">Periode</span>${repBar()}</div>
 <div class="kpis">${REPORT_KINDS.map(([k,l,m])=>{const ok=canAccess(m);return `<button class="meter" style="text-align:left;${appState.rep===k?'border-color:var(--accent)':''}" data-act="rep" data-v="${k}" ${ok?'':'disabled'} aria-pressed="${appState.rep===k}"><div class="mh"><span>PDF</span>${ok?'':icon('lock',16)}</div><b style="font-family:var(--f-display);font-size:16px">${l}</b><span class="sub">${ok?(perm(m)==='mask'&&(k==='komisi'||k==='keuangan')?'Nominal disensor':'Siap ditinjau'):'Tidak ada akses'}</span></button>`}).join('')}</div>
 <div class="toolbar"><span class="sub">${esc(r.title)} · ${esc(r.per)}</span><span class="sp"></span><button class="btn" data-act="copyrep">${icon('copy',15)} Salin laporan</button><button class="btn primary" data-act="dlpdf">${icon('download',15)} Unduh PDF</button></div>
 <article class="paper"><div class="row">${logo(38)}<span class="sub">Laporan</span></div><div><h4>${r.title}</h4><p class="sub">Periode ${r.per}. Dibuat ${fmtD(TODAY)} oleh ${esc(meUser().name)}.</p></div>
 <div class="kpis">${r.sum.map(([k,v])=>kpi(k,v)).join('')}</div>
 ${repSecs(r).map(sc=>`${sc.title?`<div class="wkh" style="margin-top:6px"><h4 style="font-size:15px">${esc(sc.title)}</h4>${sc.note?`<span class="sub">${esc(sc.note)}</span>`:''}</div>`:''}<div class="tw"><table><thead><tr>${sc.head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${sc.rows.map((x,ri)=>`<tr>${x.map((c,i)=>`<td class="${typeof c==='string'&&/^Rp/.test(c)?'n':''}" ${sc.boldLast&&ri===sc.rows.length-1?'style="font-weight:800"':''}>${esc(c)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${sc.head.length}" class="sub">Tidak ada data pada periode ini.</td></tr>`}</tbody></table></div>`).join('')}</article>
 <p class="sub">Unduh PDF memakai laporan dan periode yang sedang dipilih. Pilih Pilih tanggal untuk rentang custom.</p></div>`};
const repBar=()=>{const sv=[appState.per,appState.pfrom,appState.pto];appState.per=appState.repPer;appState.pfrom=appState.rfrom||'';appState.pto=appState.rto||'';const rg=perRange();appState.rfrom=iso(rg.a);appState.rto=iso(rg.b);[appState.per,appState.pfrom,appState.pto]=sv;
 return renderSegmented('repper',appState.repPer,[[7,'7 hari'],[30,'30 hari'],[90,'90 hari'],['bulan','Bulan ini'],['kustom','Pilih tanggal']])+(appState.repPer==='kustom'?`<span class="drng"><input type="date" id="f-rfrom" data-f="rfrom" max="${iso(TODAY)}" value="${appState.rfrom}" aria-label="Dari tanggal"><span class="sub">s/d</span><input type="date" id="f-rto" data-f="rto" max="${iso(TODAY)}" value="${appState.rto}" aria-label="Sampai tanggal"></span>`:'')};
Object.assign(ACT,{rep:t=>{appState.rep=t.dataset.v;render()},repper:t=>{const v=t.dataset.v;appState.repPer=/^\d+$/.test(v)?+v:v;render()},
 dlpdf:async()=>{try{const report=buildReport(appState.rep);await exportReport(report,'pdf','laporan-'+appState.rep+'-'+iso(TODAY));logAct('mengunduh PDF '+report.title.toLowerCase());toast('Laporan diunduh sebagai PDF')}catch(e){console.error(e);toast('Gagal membuat PDF')}},
 copyrep:()=>copyToClipboard(reportText(buildReport(appState.rep)),'Laporan tersalin')});

export { REPORT_KINDS, buildReport, buildReportContent, repBar, repSecs, reportText };
