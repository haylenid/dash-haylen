/* js/pages/beranda.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, meId, meUser, money, perm, scope } from '../core/access.js';
import { COACHES, CONDC, NAVT, ROLE, ROLE_USER_IDS } from '../core/constants.js';
import { filterTransactions, freeSlots, getPendingCorrections, getSessionAttendance, inRange, liveClients, monthly } from '../core/derived.js';
import { DAYS, DAYSL, TODAY, addD, ago, dIdx, esc, first, fmtD, formatJuta, iso, num, parseDate, sum } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { TONE_LABEL, TONE_PILL_CLASS, buildIndicators, indCards, retensiPct } from '../core/indicators.js';
import { ACT, FORMS, MODALS, PAGES } from '../core/registry.js';
import { attPill, coachScore } from '../core/shared.js';
import { apiPatch, isApiMode } from '../core/api.js';
import { appState, findClientById, findProgramById, getClientEndDate, getClientStatus, getMemberName, store } from '../core/store.js';
import { banner, donut, kpi, locked, meter, renderHBar, renderPercentBar, renderSegmented, sheet, statusPill } from '../ui/components.js';
import { render, toast } from '../ui/shell.js';

function hero(){
 const h=new Date().getHours(),g=h<11?'Selamat pagi':h<15?'Selamat siang':h<19?'Selamat sore':'Selamat malam';
 const co=appState.role==='coach'?meId():null;
 const live=co?store.clients.filter(c=>c.coach===co&&!c.arch&&getClientStatus(c)!=='Selesai').length:liveClients().length;
 const ses=store.book.filter(b=>b.day===dIdx(TODAY)&&(!co||b.coach===co)).length;
 const pd=getPendingCorrections(co).length;
 const lanes=[0,1,2,3,4].map(i=>`<path d="M${-20+i*18} 230C${-20+i*18} ${110-i*4} ${140+i*10} ${20+i*14} ${330+i*6} ${20+i*14}S540 ${40+i*14} 540 ${40+i*14}"/>`).join('');
 return `<section class="hero"><svg class="lanes" viewBox="0 0 540 240" fill="none" stroke="#fff" stroke-width="2" aria-hidden="true">${lanes}</svg><div><p class="eyebrow">${DAYSL[dIdx(TODAY)]}, ${fmtD(TODAY)}</p><h2>${g}, ${esc(first(meUser().name))}</h2><p class="lead">${co?'Sesi dan koreksi Anda hari ini.':'Ringkasan latihan, klien, dan bisnis dalam satu layar.'}</p></div><div class="hstats"><div class="hs"><b>${live}</b><span>klien berjalan</span></div><div class="hs"><b>${ses}</b><span>sesi hari ini</span></div><div class="hs"><b>${pd}</b><span>menunggu koreksi</span></div></div></section>`}
function activityCard(cls){return `<section class="card ${cls}"><header class="ch"><h3>Aktivitas sinkronisasi</h3><span class="sub">Dari portal Pemilik dan Coach</span></header><div class="listv">${store.log.slice(0,6).map(l=>`<div class="li"><div><b>${esc(l.who)}</b><small>${esc(l.text)}</small></div><span class="sub mono">${ago(l.t)}</span></div>`).join('')}</div></section>`}
/* Rapikan baris kartu c4 (3 per baris di layar lebar): bila baris terakhir tidak penuh, kartu terakhir diperlebar mengisi ruang kosong */
function c4fit(list){
 const r=list.length%3,w=r===1?['c12']:r===2?['c6','c6']:[];
 const out=list.slice();
 w.forEach((cls,i)=>{const k=out.length-w.length+i;out[k]=out[k].replace(/class="([^"]*)"/,(m,c)=>'class="'+c.replace(/\bc4\b/,cls)+'"')});
 return out}
function condCard(cls,list){
 const keys=Object.keys(CONDC).filter(k=>k!=='Cedera ringan'),cnt=keys.map(k=>list.filter(c=>c.cond===k).length),tot=list.length||1;
 const st=['Aktif','Segera berakhir','Jeda','Selesai'].map(s=>[s,scope(store.clients).filter(c=>getClientStatus(c)===s).length]);
 return `<section class="card ${cls}" style="align-self:start"><header class="ch"><h3>Ringkasan klien</h3><span class="sub">Distribusi kondisi klien</span></header>
 <div class="stack" role="img" aria-label="Distribusi kondisi klien">${keys.map((k,i)=>cnt[i]?`<i style="width:${cnt[i]/tot*100}%;background:var(${CONDC[k]})"></i>`:'').join('')}</div>
 <ul class="legend">${keys.map((k,i)=>`<li><i style="background:var(${CONDC[k]})"></i>${k}<b>${cnt[i]}</b></li>`).join('')}</ul>
 <div class="row">${st.map(([s,n])=>`${statusPill(s)}<b class="mono">${n}</b>`).join(' ')}</div></section>`}
function renderCoachHome(){
 const myId=meId();
 const mine=store.clients.filter(c=>c.coach===myId&&!c.arch);
 const lv=mine.filter(c=>getClientStatus(c)!=='Selesai');
 const pend=getPendingCorrections(myId).sort((a,b)=>a.date<b.date?-1:1);
 const today=store.book.filter(b=>b.coach===myId&&b.day===dIdx(TODAY)).sort((a,b)=>a.time<b.time?-1:1);
 const kom=sum(getSessionAttendance(30,myId).map(x=>x.fee));
 const fr=freeSlots(7,myId);
 return `<div class="stackv">
 ${banner('Portal Coach. Anda hanya melihat klien dan jadwal milik sendiri. Absen, izin, dan jadwal Anda langsung muncul di portal Pemilik. Koreksi laporan klien dikerjakan Head Coach.')}
 <div class="kpis">${kpi('Klien saya',lv.length,'berjalan')}${kpi('Slot kosong',fr.length,'7 hari ke depan')}${kpi('Sesi hari ini',today.length,DAYSL[dIdx(TODAY)])}${kpi('Komisi 30 hari',perm('komisi')==='none'?'-':money(kom,'komisi'),'bagian Anda')}</div>
 <div class="dash">
  <section class="card c6"><header class="ch"><h3>Absensi hari ini</h3><button class="btn sm" data-act="nav" data-v="absensi">Isi absensi</button></header><div style="margin-bottom:8px">${attPill(myId)}</div><p class="sub">Status kehadiran Anda hari ini.</p></section>
  <section class="card c6"><header class="ch"><h3>Sesi hari ini</h3><button class="btn sm" data-act="nav" data-v="coach">Jadwal saya</button></header>${today.length?`<div class="listv">${today.map(b=>`<div class="li"><div><b>${esc(findClientById(b.client).name)}</b><small>${findProgramById(findClientById(b.client).pid).name}</small></div><span class="pill info mono">${b.time}</span></div>`).join('')}</div>`:'<p class="sub">Tidak ada sesi terjadwal hari ini.</p>'}<p class="sub">Slot kosong 7 hari ke depan: <b class="mono">${fr.length}</b></p></section>
  ${condCard('c6',lv)}${activityCard('c12')}
 </div></div>`}
function growthData(){
 const mo=monthly(),mm=mo.map(m=>{const a=parseDate(m.key+'-01'),z=new Date(a.getFullYear(),a.getMonth()+1,0),zi=z>TODAY?TODAY:z,k0=iso(a),k1=iso(zi);
  const baru=store.clients.filter(c=>c.start>=k0&&c.start<=k1).length;
  const aktif=store.clients.filter(c=>c.start<=k1&&getClientEndDate(c)>=k0&&!(c.arch&&c.arch<k0)).length;
  return{l:m.l,inc:m.inc,laba:m.inc-m.exp,baru,aktif}});
 return mm}
function niceStep(r){const p=Math.pow(10,Math.floor(Math.log10(r/4)));return[1,2,2.5,5,10].map(x=>x*p).find(x=>r/x<=5)||p*10}
function trendChart(vals,labels,fmtA,fmtV,partial,aria){
 const W=640,H=260,marginLeft=56,R=18,T=30,B=30,hi=Math.max(...vals,1)*1.12,lo=Math.min(0,...vals),st=niceStep(hi-lo),top=Math.ceil(hi/st)*st,bot=lo<0?Math.floor(lo/st)*st:0;
 const x=i=>marginLeft+i*(W-marginLeft-R)/Math.max(1,vals.length-1),y=v=>T+(H-T-B)*(1-(v-bot)/(top-bot));
 let g='';for(let v=bot;v<=top+1e-9;v+=st)g+=`<line class="gl" x1="${marginLeft}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${marginLeft-8}" y="${y(v)+4}" text-anchor="end">${fmtA(v)}</text>`;
 const pts=vals.map((v,i)=>[x(i),y(v)]),d=a=>a.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const solid=partial?pts.slice(0,-1):pts,lp=pts[pts.length-1],pp=pts[pts.length-2]||lp;
 const area=d(pts)+` L${lp[0]} ${y(Math.max(0,bot))} L${pts[0][0]} ${y(Math.max(0,bot))} Z`;
 const lb=labels.map((l,i)=>`<text class="ax" x="${x(i)}" y="${H-8}" text-anchor="${i===0?'start':i===labels.length-1?'end':'middle'}">${l}</text>`).join('');
 const dots=pts.map((p,i)=>`<circle class="ep" cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?5:4}"/><text class="vl" x="${p[0]}" y="${p[1]-11}" text-anchor="${i===0?'start':i===pts.length-1?'end':'middle'}">${fmtV(vals[i])}</text>`).join('');
 return `<svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}"><defs><linearGradient id="lgr2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.38"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:.02"/></linearGradient></defs>${g}<path d="${area}" style="fill:url(#lgr2)"/><path class="ln" d="${d(solid)}"/>${partial?`<path class="lp" d="M${pp[0]} ${pp[1]} L${lp[0]} ${lp[1]}"/>`:''}${lb}${dots}</svg>`}
const FINANCE_METRICS={inc:['Pendapatan',v=>formatJuta(v),v=>(v/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt',true],laba:['Laba bersih',v=>formatJuta(v),v=>(v/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt',true],baru:['Klien baru',v=>v+' klien',v=>String(v),false],aktif:['Klien aktif',v=>v+' klien',v=>String(v),false]};
function growthCard(showFinance,cls){
 const gd=growthData(),keys=Object.keys(FINANCE_METRICS).filter(k=>showFinance||!FINANCE_METRICS[k][3]);if(!keys.includes(appState.gm))appState.gm=keys[0];
 const [nm,fmt,ax]=FINANCE_METRICS[appState.gm],vals=gd.map(m=>m[appState.gm]),n=vals.length,partial=TODAY.getDate()<new Date(TODAY.getFullYear(),TODAY.getMonth()+1,0).getDate();
 const lastC=vals[n-2],prevC=vals[n-3],pct=(a,b)=>b?Math.round((a-b)/Math.abs(b)*100):(a?null:0),sgn=p=>p==null?'Baru mulai':(p>=0?'+':'')+p+'%';
 const mom=pct(lastC,prevC),tot=pct(lastC,vals[0]),avg=Math.round(sum(vals.slice(0,n-1))/(n-1)*10)/10;
 const chip=(p)=>p==null?`<span class="pill info">Baru mulai</span>`:`<span class="pill ${p>=0?'good':'bad'}">${sgn(p)}</span>`;
 const kp=`<div class="kpis">${kpi(nm+' '+gd[n-2].l,fmt(lastC),'bulan penuh terakhir')}${kpi('Dibanding '+gd[n-3].l,sgn(mom),'dibanding bulan sebelumnya')}${kpi('Sejak '+gd[0].l,sgn(tot),'pertumbuhan '+(n-2)+' bulan')}${kpi('Bulan ini s/d tgl '+TODAY.getDate(),fmt(vals[n-1]),'rata-rata bulan lalu '+fmt(avg))}</div>`;
 return `<section class="card ${cls}"><header class="ch"><div><h3>Pertumbuhan bisnis</h3><p class="sub">Enam bulan terakhir, dihitung dari transaksi dan data klien. ${gd[n-1].l} baru berjalan sampai tanggal ${TODAY.getDate()}.</p></div>${renderSegmented('gm',appState.gm,keys.map(k=>[k,FINANCE_METRICS[k][0]]))}</header>${kp}${trendChart(vals,gd.map((m,i)=>i===n-1&&partial?m.l+' (s/d '+TODAY.getDate()+')':m.l),ax,ax,partial,nm+' enam bulan terakhir')}<p class="sub" style="margin-top:6px">${appState.gm==='inc'?'Pendapatan: total transaksi masuk di menu Keuangan.':appState.gm==='laba'?'Laba bersih: pemasukan dikurangi pengeluaran per bulan di menu Keuangan.':appState.gm==='baru'?'Klien baru: klien yang tanggal mulainya jatuh di bulan tersebut di menu Klien.':'Klien aktif: klien dengan masa program berjalan pada bulan tersebut.'} ${chip(mom)}</p></section>`}
ACT.gm=t=>{appState.gm=t.dataset.v;render()};
PAGES.beranda=()=>{
 if(appState.role==='coach')return renderCoachHome();
 const IN=buildIndicators();
 const showFinance=perm('keuangan')==='full',showCommission=perm('komisi')==='full';
 const mo=monthly(),n={bulan:1,kuartal:3,semester:6}[appState.tp];
 const revA=sum(mo.slice(-n).map(m=>m.inc)),revT=store.targets.rev*n;
 const ws=new Date(TODAY.getFullYear(),TODAY.getMonth()-(n-1),1);
 const newC=store.clients.filter(c=>!c.arch&&parseDate(c.start)>=ws).length;
 const reps=store.reports.filter(r=>!r.missed),fixed=reps.filter(r=>r.fix).length,kPct=Math.round(fixed/Math.max(1,reps.length)*100);
 const live=liveClients(),nw=live.filter(c=>parseDate(c.start)>=addD(TODAY,-30)).length,rn=live.filter(c=>c.renew&&parseDate(c.start)<addD(TODAY,-30)).length;
 const targets=`<section class="card c12"><header class="ch"><div><h3>Target indikator</h3><p class="sub">Periode ${{bulan:'bulan berjalan',kuartal:'3 bulan terakhir',semester:'6 bulan terakhir'}[appState.tp]}</p></div><div class="row">${renderSegmented('tp',appState.tp,[['bulan','Bulan ini'],['kuartal','3 bulan'],['semester','6 bulan']])}${appState.role==='owner'?`<button class="btn sm" data-act="modal" data-v="targets">${icon('setting',15)} Atur target</button>`:''}</div></header>
 <div class="kpis">${meter('Pendapatan',revA,revT,formatJuta,!showFinance)}${meter('Klien baru ('+({bulan:'bulan ini',kuartal:'3 bulan',semester:'6 bulan'}[appState.tp])+')',newC,store.targets.klien*n,v=>v+' klien')}${meter('Retensi klien',retensiPct(),store.targets.retensi,v=>v+'%')}</div></section>`;
 const rev=growthCard(showFinance,'c12');
 const grow=`<section class="card c4"><header class="ch"><h3>Pertumbuhan klien</h3><span class="sub">${nw>=0?'+'+nw:nw} klien baru 30 hari</span></header>${donut([{l:'Klien baru',v:nw,c:'var(--accent)'},{l:'Perpanjangan',v:rn,c:'var(--volt)'},{l:'Berjalan',v:live.length-nw-rn,c:'var(--sky)'}],live.length,'klien berjalan')}</section>`;
 const kom=showCommission?`<section class="card c4"><header class="ch"><h3>Komisi sesi hadir per program</h3><span class="sub">30 hari</span></header>${renderHBar(store.programs.map(p=>({l:p.name.replace(/ \d+ Minggu| Bulanan/,''),v:sum(getSessionAttendance(30).filter(x=>x.pid===p.id).map(x=>x.fee))})),v=>formatJuta(v))}</section>`:locked('Komisi sesi hadir per program','c4','Komisi disembunyikan untuk peran '+ROLE[appState.role]+'.');
 const perf=`<section class="card c4"><header class="ch"><h3>Performa coach</h3><span class="sub">Score kinerja</span></header>${renderPercentBar(COACHES.map(c=>({l:first(getMemberName(c)),v:coachScore(c).total})))}</section>`;
 const reqs=store.reqs.filter(r=>r.type!=='masalah'),done=reqs.filter(r=>r.status!=='Menunggu').length;
 const wkSlots=sum(COACHES.map(c=>sum((store.pattern[c]||[]).map(a=>a.length))));
 const active7=new Set(store.reports.filter(r=>!r.missed&&inRange(r.date,7)).map(r=>r.cid)).size;
 const ops=`<section class="card c4"><header class="ch"><h3>Progress operasional</h3><span class="sub">Minggu ini</span></header>${renderPercentBar([{l:'Izin diproses',v:Math.round(done/Math.max(1,reqs.length)*100)},{l:'Slot terisi',v:Math.round(store.book.length/Math.max(1,wkSlots)*100)},{l:'Klien lapor',v:Math.round(active7/Math.max(1,live.length)*100)}])}</section>`;
 const inn=sum(filterTransactions(30,'in').map(t=>t.amt)),out=sum(filterTransactions(30,'out').map(t=>t.amt));
 const cash=showFinance?`<section class="card c6"><header class="ch"><h3>Arus keuangan</h3><span class="sub">30 hari terakhir</span></header>${renderHBar([{l:'Pemasukan',v:inn,c:'var(--good)'},{l:'Pengeluaran',v:out,c:'var(--bad)'},{l:'Laba bersih',v:Math.max(0,inn-out),c:'var(--accent)'}],v=>formatJuta(v))}</section>`:locked('Arus keuangan','c6','Data keuangan disembunyikan untuk peran '+ROLE[appState.role]+'.');
 const fr=freeSlots(7).sort((a,b)=>a.d+a.t<b.d+b.t?-1:1);
 const free=`<section class="card c6"><header class="ch"><h3>Jadwal coach kosong</h3><button class="btn sm" data-act="nav" data-v="coach">Lihat jadwal</button></header><p class="sub"><b class="mono">${fr.length}</b> slot kosong dalam 7 hari ke depan. Terdekat:</p><div class="chips">${fr.slice(0,8).map(s=>`<span class="chip">${DAYS[s.di]} ${s.t} · ${first(getMemberName(s.c))}</span>`).join('')||'<span class="sub">Tidak ada slot kosong.</span>'}</div></section>`;
 return `<div class="stackv">${banner('Semua indikator dihitung langsung dari data di setiap menu. Ubah data di menu mana pun, angka di halaman ini ikut berubah, juga dari portal Coach. Hal yang perlu ditindak ada di ikon lonceng pojok kanan atas.','info')}<div class="dash">${targets}${rev}${c4fit([...IN.cards.map(c=>indCards([c])),grow,kom,perf,ops]).join('')}${cash}${free}${condCard('c6',live)}${activityCard('c6')}</div></div>`};
MODALS.notif=()=>{const al=buildIndicators().al;return sheet('Notifikasi',`<p class="sub" style="margin:0 0 10px">Perlu perhatian, dihitung otomatis dari data semua menu.</p>${al.length?`<div class="listv">${al.map(a=>`<div class="li"><div><span class="pill ${TONE_PILL_CLASS[a.lv]}">${TONE_LABEL[a.lv]}</span> <b>${esc(a.x)}</b></div><button class="btn sm" data-act="nav" data-v="${a.m}">Buka ${esc(NAVT[a.m]||a.m)}</button></div>`).join('')}</div>`:'<p class="sub">Semua aman. Tidak ada hal yang perlu ditindak.</p>'}`)};
MODALS.targets=()=>sheet('Atur target indikator',`<form data-form="targets" class="fg">
 <label class="field"><span>Target pendapatan per bulan (Rp)</span><input id="f-trev" name="rev" type="number" min="0" step="500000" value="${store.targets.rev}"></label>
 <label class="field"><span>Target klien baru per bulan</span><input id="f-tkl" name="klien" type="number" min="0" value="${store.targets.klien}"></label>
 <label class="field"><span>Target retensi (%)</span><input id="f-tret" name="retensi" type="number" min="0" max="100" value="${store.targets.retensi}"></label>
 <div class="row full"><button class="btn primary" type="submit">Simpan target</button><button class="btn" type="button" data-act="close">Batal</button></div></form>`);
FORMS.targets=async f=>{
 const t={rev:num(f.get('rev')),klien:num(f.get('klien')),retensi:num(f.get('retensi')),koreksi:store.targets.koreksi};
 if(isApiMode()){
   try{await apiPatch('/settings',{targets:t});store.targets=t}
   catch(e){console.error('Gagal simpan target:',e);toast('Gagal menyimpan: '+(e.message||e));return}
 }else{store.targets=t}
 logAct('memperbarui target indikator');appState.modal=null;toast('Target disimpan');render()};

export { FINANCE_METRICS, activityCard, condCard, growthCard, growthData, hero, niceStep, renderCoachHome, trendChart };
