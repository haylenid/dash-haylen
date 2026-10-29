/* js/pages/program.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { DAYS, DAYSL, TODAY, addD, esc, first, fmtD, iso, mmss, num, parseDate, parseHMS, slug, sum } from '../core/helpers.js';
import { icon, logo } from '../core/icons.js';
import { ACT, HOOK, PAGES } from '../core/registry.js';
import { apiPatch, isApiMode } from '../core/api.js';
import { appState, store } from '../core/store.js';
import { banner, kpi, renderSegmented, tabsBar } from '../ui/components.js';
import { exportReport } from '../ui/pdf.js';
import { copyToClipboard, render, toast } from '../ui/shell.js';

// Simpan custom program templates ke backend
async function saveTpls(){
  if(!isApiMode())return;
  try{
    await apiPatch('/settings',{program_tpls:appState.prog.tpls});
  }catch(e){
    console.error('[saveTpls] gagal:',e);
    toast('Gagal menyimpan template: '+((e&&e.message)||e));
  }
}
if(typeof window!=='undefined')window._saveTpls=saveTpls;

const TRAINING_PHASES=[['umum','Persiapan umum'],['khusus','Persiapan khusus'],['pra','Prakompetisi']];
const PHASE_WEEK_INCREMENT={umum:6,khusus:8,pra:4};
const PHASE_DESCRIPTIONS={umum:'Membangun dasar aerobik dan konsistensi latihan. Volume naik bertahap.',khusus:'Latihan spesifik menuju target. Volume naik lebih agresif.',pra:'Penajaman menjelang lomba. Volume naik lebih pelan.'};
const TARGET_LIST=[['c12','Lari 12 menit',null],['5000','5000 m',5],['10000','10000 m',10],['21097','21K (half marathon)',21.0975],['42195','42K (marathon)',42.195]];
const TARGET_DEFS={c12:['2400','2800'],'5000':['25:00','22:00'],'10000':['52:00','47:00'],'21097':['2:05:00','1:55:00'],'42195':['4:25:00','4:00:00']};
const PROGLIST=[['Easy Run',60,70],['Medium Run',70,80],['Tempo',80,88],['Long Run',62,75],['Fartlek',70,90],['Jog-stride',60,75],['Interval',88,97],['Hill Run',80,92],['Cross Training',60,75],['Threshold',85,92],['Pace Tinggi',85,95],['Strength Training',null,null],['Core',null,null],['Drill',null,null],['Teknik',null,null],['MAF Training',null,null,true],['Rest Day',null,null]];
const makeTemplates=()=>[{id:'t1',name:'Daftar program',rows:PROGLIST.map((x,i)=>({k:x[0],day:(i%7),share:0,int:x[1]?Math.round((x[1]+x[2])/2*1.1):80,hl:x[1],hh:x[2],maf:!!x[3]}))}];
const phaseName=()=>(TRAINING_PHASES.find(p=>p[0]===appState.prog.phase)||TRAINING_PHASES[0])[1];
const makeLap=(k,p,n)=>({km:k,pace:p,note:n||''});
const makePresets=()=>[
 {id:'ps1',name:'Tangga interval 100-1600 m',lines:[makeLap('100 m','95%','Jeda jogging 100 m'),makeLap('200 m','95%','Jeda jogging 200 m'),makeLap('300 m','93%','Jeda jogging 300 m'),makeLap('600 m','90%','Jeda jogging 400 m'),makeLap('800 m','88%','Jeda jogging 400 m'),makeLap('1000 m','86%','Jeda jogging 400 m'),makeLap('1200 m','84%','Jeda jogging 400 m'),makeLap('1600 m','82%','Selesai, jogging 10 menit')]},
 {id:'ps2',name:'Strength training 6 gerakan',lines:[makeLap('Squat','3 x 12','Beban sedang'),makeLap('Lunge','3 x 10 per kaki','Langkah panjang'),makeLap('Deadlift ringan','3 x 10','Punggung lurus'),makeLap('Plank','3 x 45 detik','Perut kencang'),makeLap('Calf raise','3 x 15','Tahan 1 detik di atas'),makeLap('Glute bridge','3 x 12','Tahan 2 detik')]},
 {id:'ps3',name:'Interval 400 m x 8',lines:[makeLap('Pemanasan 2 km','Easy','Jogging santai'),makeLap('400 m x 8','5:00/km','Jeda jogging 200 m'),makeLap('Pendinginan 1 km','Easy','Jalan lalu jogging')]}];
const findPresetIndex=()=>{const P=appState.prog;let i=P.presets.findIndex(t=>t.id===P.psId);if(i<0){i=0;P.psId=P.presets[0].id}return i};
const INTERVAL_ROW_COUNT=10,DISTANCE_OPTIONS=[100,150,200,300,400,500,600,800,1000,1200,1500,1600],INTENSITY_OPTIONS=Array.from({length:17},(_,i)=>60+i*5);
const seedCr=()=>{const a=[[70,1600],[85,1200],[100,800]];return Array.from({length:INTERVAL_ROW_COUNT},(_,i)=>a[i]?{int:a[i][0],dist:a[i][1]}:{int:'',dist:''})};
const hrPct=(int,row)=>row&&int===row.int?[row.hl,row.hh]:(()=>{const l=Math.max(30,Math.min(95,Math.round(55+(int-78)*.917)));return[l,Math.min(100,l+10)]})();
const crRows=()=>appState.prog.cr.map((c,i)=>{const int=num(c.int),dist=num(c.dist),ok=int>0&&dist>0&&refPace()>0,row=null;if(!ok)return{i,c,ok:false,row,int,dist};const pace=refPace()*100/int,pc=hrPct(int,row);return{i,c,ok:true,row,int,dist,pace,time:pace*dist/1000,pc,bpm:[Math.round(appState.prog.hrmax*pc[0]/100),Math.round(appState.prog.hrmax*pc[1]/100)]}});
const crSigNow=()=>JSON.stringify([appState.prog.pbTarget,appState.prog.target,appState.prog.age,appState.prog.hrmax,appState.prog.cr]);
const progInit=()=>{if(!Array.isArray(appState.prog.cr)||appState.prog.cr.length!==INTERVAL_ROW_COUNT||appState.prog.cr.some(c=>'ref' in c))appState.prog.cr=seedCr();const P=appState.prog,d=iso(TODAY);
 if(!Array.isArray(P.presets)||!P.presets.length)P.presets=makePresets();if(!P.presets.some(x=>x.id===P.psId))P.psId=P.presets[0].id;
 if(P.age==null)P.age=34;if(P.coach==null)P.coach='';if(!P.target||!TARGET_LIST.some(x=>x[0]===P.target))P.target='42195';if(P.pbNow==null)P.pbNow=TARGET_DEFS[P.target][0];if(P.pbTarget==null)P.pbTarget=TARGET_DEFS[P.target][1];
 if(!P.phase)P.phase='umum';if(!P.sdate)P.sdate=d;if(!P.edate)P.edate=iso(addD(parseDate(P.sdate),P.weeks.length*7-1));if(P.title==null)P.title='';if(P.calcVol==null)P.calcVol=Math.max(...P.weeks);
 if(!P.fmt)P.fmt='pdf';if(!Array.isArray(P.tpls)||!P.tpls.length){try{if(window._savedTpls&&window._savedTpls.length)P.tpls=window._savedTpls;else if(isApiMode())P.tpls=[];else P.tpls=makeTemplates()}catch(e){P.tpls=isApiMode()?[]:makeTemplates()}}if(P.tpls.length&&!P.tpls.some(t=>t.id===P.tplId))P.tplId=P.tpls[0].id};
const findTemplateIndex=()=>{const P=appState.prog;if(!P.tpls.length)return -1;let i=P.tpls.findIndex(t=>t.id===P.tplId);if(i<0){i=0;P.tplId=P.tpls[0].id}return i};
const tpl=()=>{const i=findTemplateIndex();return i>=0?appState.prog.tpls[i]:null};
const tgt=()=>TARGET_LIST.find(x=>x[0]===appState.prog.target)||TARGET_LIST[4];
const isCooper12Target=()=>appState.prog.target==='c12';
const paceOf=v=>isCooper12Target()?(num(v)>0?720000/num(v):0):parseHMS(v)/(tgt()[2]||1);
const refPace=()=>paceOf(appState.prog.pbTarget),nowPace=()=>paceOf(appState.prog.pbNow);
const pbFmt=v=>isCooper12Target()?(num(v)?num(v)+' m':'-'):(String(v||'').trim()||'-');
const hmsT=s=>{s=Math.round(Math.abs(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),c=s%60,p=n=>String(n).padStart(2,'0');return h?h+':'+p(m)+':'+p(c):m+':'+p(c)};
const paceTxt=()=>refPace()?mmss(refPace())+'/km':'-';
const gapTxt=()=>{const P=appState.prog;if(isCooper12Target()){const d=num(P.pbTarget)-num(P.pbNow);return num(P.pbNow)&&num(P.pbTarget)?(d>=0?'+':'-')+Math.abs(d)+' m':'-'}const a=parseHMS(P.pbNow),b=parseHMS(P.pbTarget);return a&&b?(a>=b?'Lebih cepat ':'Lebih lambat ')+hmsT(a-b):'-'};
const sessions=v=>tpl().rows.map((t,i)=>({t,i,km:Math.round(v*t.share/100*2)/2,pace:refPace()&&t.int?refPace()*100/t.int:0,bpm:[Math.round(appState.prog.hrmax*t.hl/100),Math.round(appState.prog.hrmax*t.hh/100)]})).sort((a,b)=>a.t.day-b.t.day);
const fitWeeks=()=>{const P=appState.prog;let a=parseDate(P.sdate),z=parseDate(P.edate);if(z<a){P.edate=iso(addD(a,6));z=addD(a,6)}const n0=Math.ceil(((z-a)/864e5+1)/7),n=Math.max(1,Math.min(5,n0));while(P.weeks.length>n)P.weeks.pop();while(P.weeks.length<n){const l=P.weeks[P.weeks.length-1]||P.start;P.weeks.push(Math.round(l*(1+P.inc/100)))}if(n0>5)syncEnd()};
const syncEnd=()=>{const P=appState.prog;P.edate=iso(addD(parseDate(P.sdate),P.weeks.length*7-1))};
const wkLbl=i=>{const a=addD(parseDate(appState.prog.sdate),7*i),b=addD(a,6),z=parseDate(appState.prog.edate);return fmtD(a)+' - '+fmtD(b>z?z:b)};
const refRow=ref=>{if(!ref)return null;const k=ref.indexOf('|'),t=appState.prog.tpls.find(x=>x.id===ref.slice(0,k));return t?t.rows.find(r=>r.k===ref.slice(k+1))||null:null};
const refName=ref=>ref?ref.slice(ref.indexOf('|')+1):'';
const hrOf=row=>{if(!row)return null;if(row.maf){const m=Math.max(100,180-(appState.prog.age||0));return[m-10,m]}if(row.hl==null||row.hh==null)return null;return[Math.round(appState.prog.hrmax*row.hl/100),Math.round(appState.prog.hrmax*row.hh/100)]};
const hrTxt=x=>{const h=hrOf(x);return h?h[0]+'-'+h[1]:'-'};
const hrPctTxt=x=>x.maf?'180 - umur':(x.hl==null?'-':x.hl+'-'+x.hh+'%');
const blankBlock=()=>({ref:'',lines:[makeLap('','','')]});
const blankDay=()=>({blocks:[blankBlock()]});
const blankWeek=()=>[0,1,2,3,4,5,6].map(blankDay);
const ensureSched=()=>{const P=appState.prog;if(!Array.isArray(P.sched)||!P.sched.length)P.sched=[blankWeek()];while(P.sched.length<P.weeks.length)P.sched.push(blankWeek());P.sched.length=P.weeks.length;P.sched.forEach(w=>{while(w.length<7)w.push(blankDay());w.forEach(d=>{if(!Array.isArray(d.blocks)){d.blocks=[{ref:d.ref||'',lines:Array.isArray(d.lines)?d.lines:[makeLap(d.km||'',d.pace||'',d.note||'')]}];delete d.ref;delete d.lines;delete d.km;delete d.pace;delete d.note}if(!d.blocks.length)d.blocks.push(blankBlock());d.blocks.forEach(b=>{if(!Array.isArray(b.lines)||!b.lines.length)b.lines=[makeLap('','','')]})})})};
const wkRows=wi=>appState.prog.sched[wi].map((d,di)=>({di,d,bl:d.blocks.map((b,bi)=>{const r=refRow(b.ref);return{b,bi,r,hr:hrOf(r),name:r?r.k:(b.ref?refName(b.ref):'')}})}));
const wkHead=det=>['Hari','Jenis latihan'].concat(det?['HR (bpm)']:[],['Jarak / gerakan','Pace / intensitas / set','Keterangan']);
const blkOf=t=>appState.prog.sched[+t.dataset.w][+t.dataset.d].blocks[+t.dataset.b||0];
const dayLines=b=>b.lines.filter(l=>l.km||l.pace||l.note);
const wkOutG=(wi,det)=>{const rows=[],grp=[];wkRows(wi).forEach(x=>{let first=true;x.bl.forEach(q=>{const ls=dayLines(q.b);if(!q.name&&!ls.length)return;(ls.length?ls:[makeLap('','','')]).forEach((l,li)=>{const f0=li===0;rows.push([first?DAYSL[x.di]:'',f0?(q.name||'-'):''].concat(det?[f0?(q.hr?q.hr[0]+'-'+q.hr[1]:'-'):'']:[],[l.km||(f0?'-':''),l.pace||'',l.note||'']));grp.push(x.di);first=false})});if(first){rows.push([DAYSL[x.di],'Istirahat'].concat(det?['-']:[],['-','','']));grp.push(x.di)}});return{rows,grp}};
const wkOut=(wi,det)=>wkOutG(wi,det).rows;
function wkTable(wi,det){const o=wkOutG(wi,det);return `<div class="tw"><table class="dtab"><thead><tr>${wkHead(det).map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${o.rows.map((r,ri)=>`<tr class="${ri&&o.grp[ri]!==o.grp[ri-1]?'dstart ':''}${o.grp[ri]%2?'dalt':''}">${r.map((c,i)=>`<td>${i===0||i===1?'<b>'+esc(c)+'</b>':esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
const jenisSel=(wi,di,bi)=>{const b=appState.prog.sched[wi][di].blocks[bi],ok=!b.ref||refRow(b.ref),p=`appState.prog.sched.${wi}.${di}.blocks.${bi}.ref`;return `<select id="f-sj${wi}-${di}-${bi}" data-set="${p}" aria-label="Jenis latihan ${DAYSL[di]} ${bi+1}"><option value="">Pilih jenis latihan...</option>${appState.prog.tpls.map(t=>`<optgroup label="${esc(t.name)}">${t.rows.map(r=>`<option value="${t.id}|${esc(r.k)}" ${b.ref===t.id+'|'+r.k?'selected':''}>${esc(r.k)}</option>`).join('')}</optgroup>`).join('')}${ok?'':`<option value="${esc(b.ref)}" selected>${esc(refName(b.ref))} (sudah dihapus)</option>`}</select>`};
const formatPace=s=>s.pace?mmss(s.pace)+'/km':'-';
const idSum=()=>{const P=appState.prog;return[['Nama',P.name||'-'],['Coach',P.coach||'-'],['Umur',P.age+' tahun'],['Target',tgt()[1]],['PB sekarang',pbFmt(P.pbNow)],['PB target',pbFmt(P.pbTarget)],['Pace target',paceTxt()],['HR maksimal',P.hrmax+' bpm']]};
const progPer=()=>phaseName()+' · '+fmtD(parseDate(appState.prog.sdate))+' - '+fmtD(parseDate(appState.prog.edate))+' ('+appState.prog.weeks.length+' minggu)';
const progReport=()=>{const P=appState.prog;ensureSched();return{kicker:'PROGRAM LATIHAN',tag:'PROGRAM LATIHAN',raw:true,title:P.title||('Program '+tgt()[1]),per:progPer(),sum:idSum(),sections:P.weeks.map((_,i)=>({title:'Minggu '+(i+1),note:wkLbl(i),head:wkHead(P.detail),rows:wkOutG(i,P.detail).rows}))}};
const calcReport=()=>{const P=appState.prog,rs=crRows().filter(x=>x.ok),tm=sum(rs.map(x=>x.time)),td=sum(rs.map(x=>x.dist));return{kicker:'INTENSITAS LATIHAN',tag:'INTENSITAS LATIHAN',raw:true,title:'Intensitas Latihan',per:'Target '+tgt()[1]+' · PB target '+pbFmt(P.pbTarget)+' · usia '+P.age+' tahun',sum:[['Nama',P.name||'-'],['Coach',P.coach||'-'],['Usia',P.age+' tahun'],['Target',tgt()[1]],['PB target',pbFmt(P.pbTarget)],['Pace 100%',paceTxt()],['HR maksimal',P.hrmax+' bpm (estimasi)']],sections:[
 {title:'Intensitas pace, jarak, waktu, dan estimasi HR',note:'100% intensitas = pace PB target '+paceTxt(),w:[.6,1.3,1.2,1.3,1.3,1.5],align:['c','c','c','c','c','c'],head:['No','% Intensitas','Jarak (m)','Pace/km','Waktu','HR (bpm)'],rows:rs.map((x,k)=>[String(k+1),x.int+'%',String(x.dist),mmss(x.pace)+'/km',hmsT(x.time),x.bpm[0]+'-'+x.bpm[1]])}]}};
function programText(){
 const P=appState.prog;ensureSched();const lines=[`N6 - ${(P.title||('PROGRAM '+tgt()[1])).toUpperCase()}`,`Nama: ${P.name}, coach ${P.coach}, umur ${P.age} tahun`,`Target: ${tgt()[1]}, PB sekarang ${pbFmt(P.pbNow)}, PB target ${pbFmt(P.pbTarget)} (pace ${paceTxt()})`,`Program: ${progPer()}`,`HR maks: ${P.hrmax} bpm`,''];
 P.weeks.forEach((_,i)=>{lines.push(`Minggu ${i+1} (${wkLbl(i)})`);wkRows(i).forEach(x=>{const bs=x.bl.filter(q=>q.name||dayLines(q.b).length);if(!bs.length){lines.push(`  ${DAYS[x.di]} Istirahat`);return}lines.push(`  ${DAYS[x.di]}`);bs.forEach(q=>{lines.push(`    ${q.name||'Latihan'}${q.hr?', HR '+q.hr[0]+'-'+q.hr[1]:''}`);dayLines(q.b).forEach(l=>lines.push(`      - ${l.km||''}${l.pace?' | '+l.pace:''}${l.note?' ('+l.note+')':''}`))})});lines.push('')});
 return lines.join('\n')}
const fmtSel=k=>`<div class="row"><label class="row"><span class="sub">Format file</span><select id="f-fmt-${k}" data-set="appState.prog.fmt" aria-label="Format file" style="width:auto"><option value="pdf" ${appState.prog.fmt==='pdf'?'selected':''}>PDF</option><option value="jpg" ${appState.prog.fmt==='jpg'?'selected':''}>JPG</option></select></label><button class="btn primary" data-act="dlprog" data-k="${k}">${icon('download',15)} Unduh ${appState.prog.fmt.toUpperCase()}</button></div>`;
const renderTemplateSelector=id=>`<label class="field"><span>Program persentase</span><select id="${id}" data-set="appState.prog.tplId" aria-label="Program persentase">${appState.prog.tpls.map(t=>`<option value="${t.id}" ${t.id===appState.prog.tplId?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`;
PAGES.program=()=>{
 progInit();ensureSched();
 const tabs=['Identitas klien','Susun program','Kalkulator intensitas','Custom program','Pratinjau & cetak'],t=Math.min(appState.tab,4),P=appState.prog,T=tpl(),ti=findTemplateIndex();let body='';
 const sum100=T?sum(T.rows.map(x=>x.share)):0,ndays=Math.round((parseDate(P.edate)-parseDate(P.sdate))/864e5)+1,c12=isCooper12Target();
 if(t===0){
  body=`${banner('Menu ini hanya untuk membuat program dan mencetaknya sebagai PDF atau JPG. Datanya tidak terhubung ke menu lain.','info')}
  <section class="card"><header class="ch"><h3>Identitas klien</h3></header><div class="fg">
  <label class="field"><span>Nama klien</span><input id="f-pname" value="${esc(P.name)}" data-set="appState.prog.name" placeholder="Nama klien"></label>
  <label class="field"><span>Nama coach</span><input id="f-pcoach" value="${esc(P.coach)}" data-set="appState.prog.coach" placeholder="Nama coach"></label>
  <label class="field"><span>Umur (tahun)</span><input id="f-page" type="number" min="10" max="90" value="${P.age}" data-set="appState.prog.age" data-num></label>
  <label class="field"><span>HR maksimal (bpm)</span><input id="f-phr" type="number" min="120" max="230" value="${P.hrmax}" data-set="appState.prog.hrmax" data-num></label></div>
  <p class="sub" style="margin-top:8px">HR maksimal terisi otomatis 220 dikurangi umur. Anda bisa mengubahnya.</p></section>
  <section class="card"><header class="ch"><h3>Target dan Personal Best</h3></header><div class="fg">
  <label class="field"><span>Target jarak</span><select id="f-ptarget" data-set="appState.prog.target">${TARGET_LIST.map(x=>`<option value="${x[0]}" ${P.target===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></label>
  <span></span>
  <label class="field"><span>Personal Best sekarang ${c12?'(meter)':'(mm:ss atau j:mm:ss)'}</span><input id="f-pbnow" value="${esc(P.pbNow)}" data-set="appState.prog.pbNow" placeholder="${c12?'2400':'4:25:00'}"></label>
  <label class="field"><span>PB target ${c12?'(meter)':'(mm:ss atau j:mm:ss)'}</span><input id="f-pbtg" value="${esc(P.pbTarget)}" data-set="appState.prog.pbTarget" placeholder="${c12?'2800':'4:00:00'}"></label></div>
  ${refPace()?'':banner('PB target belum valid. '+(c12?'Isi jarak dalam meter, misalnya 2800.':'Tulis dengan format mm:ss atau j:mm:ss, misalnya 4:00:00.'),'warn')}</section>
  <div class="kpis">${kpi('Pace PB sekarang',nowPace()?mmss(nowPace())+'/km':'-',pbFmt(P.pbNow))}${kpi('Pace target',paceTxt(),pbFmt(P.pbTarget))}${kpi('Selisih',gapTxt(),'menuju target')}${kpi('Target',tgt()[1],'umur '+P.age+' tahun')}</div>
  <div><button class="btn primary" data-act="ptab" data-v="1">Lanjut ke Susun program</button></div>`}
 if(t===1){
  const nw=P.weeks.length,wkBtns=`<div class="row"><button class="btn sm" data-act="wkdel" ${nw<=1?'disabled':''} aria-label="Kurangi minggu">- Minggu</button><span class="pill info">${nw} dari 5 minggu</span><button class="btn sm" data-act="wkadd" ${nw>=5?'disabled':''} aria-label="Tambah minggu">+ Minggu</button></div>`;
  body=`<div class="toolbar"><span class="sub">${nw} minggu · ${fmtD(parseDate(P.sdate))} - ${fmtD(parseDate(P.edate))}</span><span class="sp"></span>${fmtSel('prog')}</div>
  <section class="card"><header class="ch"><h3>Periode program</h3>${wkBtns}</header><div class="fg">
  <label class="field"><span>Tanggal mulai</span><input id="f-psd" type="date" value="${P.sdate}" data-set="appState.prog.sdate"></label>
  <label class="field"><span>Tanggal selesai</span><input id="f-ped" type="date" value="${P.edate}" min="${P.sdate}" data-set="appState.prog.edate"></label></div>
  <div style="margin-top:12px"><span class="sub">Pilihan program</span>${renderSegmented('pphase',P.phase,TRAINING_PHASES)}</div>
  </section>
  <div class="listv">${P.weeks.map((_,wi)=>`<section class="card"><div class="wkh"><div><h3>Minggu ${wi+1}</h3><span class="sub">${wkLbl(wi)}</span></div>${wi?`<button class="btn sm" data-act="copyweek" data-v="${wi}">Salin dari minggu ${wi}</button>`:''}</div><div class="daylist">${wkRows(wi).map(x=>`<div class="dayb"><div class="dayt"><b>${DAYSL[x.di]}</b><span class="sub">${x.bl.length} jenis latihan</span><span class="sp"></span><button class="btn sm" data-act="blkadd" data-w="${wi}" data-d="${x.di}" ${x.bl.length>=4?'disabled':''}>+ Jenis latihan</button></div>${x.bl.map(q=>`<div class="blk"><div class="dayh">${jenisSel(wi,x.di,q.bi)}<span class="mono sub">${q.hr?'HR '+q.hr[0]+'-'+q.hr[1]+' bpm ('+hrPctTxt(q.r)+')':(q.r?'Tanpa target HR':'HR otomatis')}</span><select id="f-ap${wi}-${x.di}-${q.bi}" data-apply data-w="${wi}" data-d="${x.di}" data-b="${q.bi}" aria-label="Isi dari preset ${DAYSL[x.di]} ${q.bi+1}"><option value="">Isi dari preset...</option>${P.presets.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>${x.bl.length>1?`<button class="btn sm danger" data-act="blkdel" data-w="${wi}" data-d="${x.di}" data-b="${q.bi}" aria-label="Hapus jenis latihan ${q.bi+1}">${icon('trash',14)}</button>`:''}</div>${q.b.lines.map((l,li)=>`<div class="ln"><input id="f-l${wi}-${x.di}-${q.bi}-${li}-k" value="${esc(l.km)}" data-set="appState.prog.sched.${wi}.${x.di}.blocks.${q.bi}.lines.${li}.km" placeholder="Jarak / gerakan: 400 m, Squat" aria-label="Jarak atau gerakan ${DAYSL[x.di]} baris ${li+1}"><input id="f-l${wi}-${x.di}-${q.bi}-${li}-p" value="${esc(l.pace)}" data-set="appState.prog.sched.${wi}.${x.di}.blocks.${q.bi}.lines.${li}.pace" placeholder="Pace / intensitas / set: 5:00/km, 3 x 12" aria-label="Pace atau set ${DAYSL[x.di]} baris ${li+1}"><input id="f-l${wi}-${x.di}-${q.bi}-${li}-n" value="${esc(l.note)}" maxlength="80" data-set="appState.prog.sched.${wi}.${x.di}.blocks.${q.bi}.lines.${li}.note" placeholder="Keterangan" aria-label="Keterangan ${DAYSL[x.di]} baris ${li+1}"><button class="btn sm" data-act="lndel" data-w="${wi}" data-d="${x.di}" data-b="${q.bi}" data-v="${li}" aria-label="Hapus baris ${li+1}">${icon('trash',14)}</button></div>`).join('')}<div class="row"><button class="btn sm" data-act="lnadd" data-w="${wi}" data-d="${x.di}" data-b="${q.bi}" ${q.b.lines.length>=12?'disabled':''}>+ Baris</button>${q.b.lines.length>1?`<span class="sub">${q.b.lines.length} baris</span>`:''}</div></div>`).join('')}</div>`).join('')}</div></section>`).join('')}</div>
  <div class="row">${wkBtns}</div>`}
 if(t===2){
  const rs=crRows(),done=P.crSig===crSigNow(),okn=rs.filter(x=>x.ok),tm=sum(okn.map(x=>x.time)),td=sum(okn.map(x=>x.dist));
  const sel=(id,path,list,cur,fmt,ph,al)=>{const c=cur===''?'':num(cur);return `<select id="${id}" data-set="${path}" data-num aria-label="${al}"><option value="">${ph}</option>${list.map(v=>`<option value="${v}" ${c===v?'selected':''}>${fmt(v)}</option>`).join('')}${c!==''&&!list.includes(c)?`<option value="${c}" selected>${fmt(c)}</option>`:''}</select>`};
  body=`<div class="toolbar"><span class="sub">Atur intensitas pace dan jarak per baris. HR adalah estimasi dari usia dan intensitas.</span><span class="sp"></span>${fmtSel('calc')}</div>
  <section class="card"><header class="ch"><h3>Data dasar</h3></header><div class="fg">
  <label class="field"><span>PB target ${c12?'(meter)':'(mm:ss atau j:mm:ss)'}</span><input id="f-cpb" value="${esc(P.pbTarget)}" data-set="appState.prog.pbTarget" placeholder="${c12?'2800':'4:00:00'}"></label>
  <label class="field"><span>Jarak target</span><select id="f-ctg" data-set="appState.prog.target">${TARGET_LIST.map(x=>`<option value="${x[0]}" ${P.target===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></label>
  <label class="field"><span>Usia (tahun)</span><input id="f-cage" type="number" min="10" max="90" value="${P.age}" data-set="appState.prog.age" data-num></label>
  <label class="field"><span>HR maksimal (bpm)</span><input id="f-chr" type="number" min="120" max="230" value="${P.hrmax}" data-set="appState.prog.hrmax" data-num></label></div>
  <div class="kpis" style="margin-top:12px">${kpi('Pace 100%',paceTxt(),'PB target '+pbFmt(P.pbTarget))}${kpi('HR maksimal',P.hrmax+' bpm','220 dikurangi usia')}${kpi('Total jarak',done?td.toLocaleString('id-ID')+' m':'-',done?okn.length+' baris':'tekan Hitung')}${kpi('Total waktu',done?hmsT(tm):'-','jumlah semua baris')}</div>${refPace()?'':banner('PB target belum valid, pace belum bisa dihitung.','warn')}</section>
  <section class="card"><header class="ch"><h3>Perhitungan per baris</h3><div class="row"><button class="btn" data-act="crreset">Reset baris</button><button class="btn primary" data-act="crcalc">${icon('check',15)} Hitung</button></div></header>
  ${done?'':banner('Isi atau ubah data, lalu tekan Hitung untuk menampilkan pace, waktu, dan HR.','info')}
  
  <div class="tw"><table class="sg" style="min-width:860px"><thead><tr><th>No</th><th>% Intensitas pace</th><th>Jarak (m)</th><th class="n">Pace/km</th><th class="n">Waktu jarak</th><th class="n">HR (bpm)</th></tr></thead><tbody>${rs.map(x=>`<tr><td>${x.i+1}</td><td>${sel(`f-cri${x.i}`,`appState.prog.cr.${x.i}.int`,INTENSITY_OPTIONS,x.c.int,v=>v+'%','Pilih %',`Intensitas baris ${x.i+1}`)}</td><td>${sel(`f-crd${x.i}`,`appState.prog.cr.${x.i}.dist`,DISTANCE_OPTIONS,x.c.dist,v=>v+' m','Pilih jarak',`Jarak baris ${x.i+1}`)}</td><td class="n mono">${done&&x.ok?mmss(x.pace)+'/km':'-'}</td><td class="n mono">${done&&x.ok?hmsT(x.time):'-'}</td><td class="n mono">${done&&x.ok?x.bpm[0]+'-'+x.bpm[1]+'<small class="sub" style="display:block">'+x.pc[0]+'-'+x.pc[1]+'% HR maks</small>':'-'}</td></tr>`).join('')}</tbody></table></div>
  <p class="sub" style="margin-top:8px">Pilih intensitas (60% sampai 140%) dan jarak dari daftar, lalu tekan Hitung. 100% intensitas sama dengan pace PB target.</p></section>`}
 if(t===3){
  body=`<section class="card"><header class="ch"><div><h3>Daftar program</h3><p class="sub">Tambahkan jenis latihan secara manual. Nama di sini muncul sebagai pilihan Jenis latihan di Susun program. Batas HR dihitung otomatis dari umur: HR maksimal = 220 dikurangi umur, zona HR berupa persen dari HR maksimal. MAF Training memakai rumus 180 dikurangi umur. Tanda - berarti latihan tanpa target HR.</p></div><div class="row"><button class="btn primary" data-act="prnew">${icon('plus',15)} Tambah jenis latihan</button></div></header><div class="fg"><div class="row" style="align-items:flex-end"><label class="field"><span>Template</span><select id="f-tplsel" data-set="appState.prog.tplId" aria-label="Pilih template">${appState.prog.tpls.map(t=>`<option value="${t.id}" ${t.id===appState.prog.tplId?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><label class="field"><span>Nama template</span><input id="f-tplname" value="${esc(T?T.name:'')}" data-set="appState.prog.tpls.${ti}.name" onchange="setTimeout(()=>window._saveTpls&amp;&amp;window._saveTpls(),0)" aria-label="Nama template"></label><div class="row" style="padding-bottom:2px"><button class="btn sm" data-act="ptnew">+ Template</button><button class="btn sm" data-act="ptdup">Duplikat</button><button class="btn sm danger" data-act="ptdel" ${P.tpls.length<=1?'disabled':''}>Hapus</button></div></div></div>${T?`<div class="fg"><label class="field"><span>Umur (tahun)</span><input id="f-cpage" type="number" min="10" max="90" value="${P.age}" data-set="appState.prog.age" data-num></label><div class="idcard"><small>HR maksimal</small><b class="mono" style="font-size:20px">${P.hrmax} bpm</b><small>MAF: ${Math.max(100,180-P.age)-10}-${Math.max(100,180-P.age)} bpm</small></div></div><div class="tw"><table><thead><tr><th>Nama program</th><th class="n">Zona HR</th><th class="n">Batas HR (bpm)</th><th></th></tr></thead><tbody>${T.rows.map((x,i)=>`<tr><td><input id="f-rk${i}" value="${esc(x.k)}" data-set="appState.prog.tpls.${ti}.rows.${i}.k" aria-label="Nama program"></td><td class="n" style="text-align:center;white-space:nowrap"><input type="text" inputmode="numeric" value="${x.hl??''}" data-set="appState.prog.tpls.${ti}.rows.${i}.hl" data-num data-norender onchange="setTimeout(()=>window._saveTpls&amp;&amp;window._saveTpls(),0)" style="width:52px;text-align:center" aria-label="Zona bawah %"> - <input type="text" inputmode="numeric" value="${x.hh??''}" data-set="appState.prog.tpls.${ti}.rows.${i}.hh" data-num data-norender onchange="setTimeout(()=>window._saveTpls&amp;&amp;window._saveTpls(),0)" style="width:52px;text-align:center" aria-label="Zona atas %"> %</td><td class="n mono" style="text-align:center"><b>${hrTxt(x)}</b></td><td><button class="btn sm danger" data-act="prdel" data-v="${i}" aria-label="Hapus program" ${T.rows.length<=1?'disabled':''}>${icon('trash',14)} Hapus</button></td></tr>`).join('')}</tbody></table></div>`:`<p class="sub" style="padding:12px">Belum ada custom program. Klik "Tambah program" untuk membuat.</p>`}</section>`}
 if(t===3){const pi=findPresetIndex(),PS=P.presets[pi];body+=`<section class="card"><header class="ch"><h3>Preset isi latihan</h3><span class="sub">Daftar baris siap pakai (tangga interval, strength, dll). Dipilih lewat "Isi dari preset" di Susun program</span></header>
  <div class="fg"><label class="field"><span>Preset</span><select id="f-pps" data-set="appState.prog.psId" aria-label="Pilih preset">${P.presets.map(p=>`<option value="${p.id}" ${p.id===P.psId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label class="field"><span>Nama preset</span><input id="f-psname" value="${esc(PS.name)}" data-set="appState.prog.presets.${pi}.name" aria-label="Nama preset"></label></div>
  <div class="row" style="margin-top:12px"><button class="btn primary" data-act="psnew">${icon('plus',15)} Preset baru</button><button class="btn" data-act="psdup">Duplikat</button><button class="btn danger" data-act="psdel" ${P.presets.length<=1?'disabled':''}>${icon('trash',14)} Hapus preset</button></div>
  <div class="daylist" style="margin-top:12px">${PS.lines.map((l,li)=>`<div class="ln"><input id="f-pk${li}" value="${esc(l.km)}" data-set="appState.prog.presets.${pi}.lines.${li}.km" placeholder="Jarak / gerakan" aria-label="Jarak atau gerakan baris ${li+1}"><input id="f-pp${li}" value="${esc(l.pace)}" data-set="appState.prog.presets.${pi}.lines.${li}.pace" placeholder="Pace / intensitas / set" aria-label="Pace atau set baris ${li+1}"><input id="f-pn${li}" value="${esc(l.note)}" data-set="appState.prog.presets.${pi}.lines.${li}.note" placeholder="Keterangan" aria-label="Keterangan baris ${li+1}"><button class="btn sm danger" data-act="psldel" data-v="${li}" aria-label="Hapus baris ${li+1}" ${PS.lines.length<=1?'disabled':''}>${icon('trash',14)}</button></div>`).join('')}<div class="row"><button class="btn sm" data-act="psladd" ${PS.lines.length>=12?'disabled':''}>+ Baris</button></div></div></section>`}
 if(t===4){
  body=`<div class="toolbar"><label class="row"><input id="f-pdet" type="checkbox" ${P.detail?'checked':''} data-set="appState.prog.detail" data-bool> <span>Tampilkan HR</span></label><span class="sp"></span><button class="btn" data-act="copyprog">${icon('copy',15)} Salin teks</button>${fmtSel('prog')}</div>
  <article class="paper"><div class="row">${logo(38)}<span class="sub">Program latihan</span></div><div><h4>${esc(P.title||('Program '+tgt()[1]))}</h4><p class="sub">${esc(P.name)} · coach ${esc(P.coach||'-')} · ${P.age} tahun · ${esc(progPer())}</p></div>
  <div class="pm"><span>Target <b class="mono">${tgt()[1]}</b></span><span>PB <b class="mono">${esc(pbFmt(P.pbNow))} → ${esc(pbFmt(P.pbTarget))}</b></span><span>Pace target <b class="mono">${paceTxt()}</b></span><span>HR maks <b class="mono">${P.hrmax} bpm</b></span></div>
  ${P.weeks.map((_,i)=>`<div class="listv"><div class="wkh"><div><b>Minggu ${i+1}</b> <span class="sub">${wkLbl(i)}</span></div></div>${wkTable(i,P.detail)}</div>`).join('')}</article>`}
 return `<div class="stackv">${tabsBar(tabs)}${body}</div>`};
HOOK['appState.prog.age']=()=>{appState.prog.hrmax=Math.max(120,Math.min(230,220-(appState.prog.age||0)))};
HOOK['appState.prog.sdate']=()=>fitWeeks();
HOOK['appState.prog.edate']=()=>fitWeeks();
HOOK['appState.prog.target']=()=>{const d=TARGET_DEFS[appState.prog.target];if(d){appState.prog.pbNow=d[0];appState.prog.pbTarget=d[1]}};
Object.assign(ACT,{
 ptab:t=>{appState.tab=+t.dataset.v;render()},
 copyweek:t=>{const w=+t.dataset.v;if(w>0){appState.prog.sched[w]=JSON.parse(JSON.stringify(appState.prog.sched[w-1]));toast('Minggu '+(w+1)+' disalin dari minggu '+w);render()}},
 pphase:t=>{const P=appState.prog;P.phase=t.dataset.v;P.inc=PHASE_WEEK_INCREMENT[P.phase]||P.inc;toast('Program: '+phaseName());render()},
 wkadd:()=>{const w=appState.prog.weeks;if(w.length>=5){toast('Maksimal 5 minggu');return}w.push(Math.round(w[w.length-1]*(1+appState.prog.inc/100)));syncEnd();render()},
 wkdel:()=>{if(appState.prog.weeks.length>1)appState.prog.weeks.pop();syncEnd();render()},
 ptnew:()=>{const P=appState.prog;let n=P.tpls.length+1;while(P.tpls.some(x=>x.name==='Template '+n))n++;const t={id:'t'+Date.now(),name:'Template '+n,rows:[{k:'Easy',day:1,share:100,int:85,hl:62,hh:72}]};P.tpls.push(t);P.tplId=t.id;saveTpls();render();toast('Template baru: '+t.name)},
 ptdup:()=>{const P=appState.prog,t=JSON.parse(JSON.stringify(tpl()));t.id='t'+Date.now();t.name+=' (salinan)';P.tpls.push(t);P.tplId=t.id;saveTpls();toast('Program diduplikat');render()},
 ptdel:()=>{const P=appState.prog;if(P.tpls.length<=1)return;P.tpls.splice(findTemplateIndex(),1);P.tplId=P.tpls[0].id;saveTpls();toast('Program dihapus');render()},
 prnew:()=>{const t=tpl();if(!t)return;t.rows.push({k:'Program baru',day:3,share:0,int:90,hl:62,hh:72});saveTpls();render()},
 prdel:t=>{const r=tpl().rows;if(r.length>1){r.splice(+t.dataset.v,1);saveTpls()}render()},
 blkadd:t=>{const d=appState.prog.sched[+t.dataset.w][+t.dataset.d];if(d.blocks.length<4)d.blocks.push(blankBlock());render()},
 blkdel:t=>{const d=appState.prog.sched[+t.dataset.w][+t.dataset.d];if(d.blocks.length>1)d.blocks.splice(+t.dataset.b,1);render()},
 lnadd:t=>{const b=blkOf(t);if(b.lines.length<12)b.lines.push(makeLap('','',''));render()},
 lndel:t=>{const b=blkOf(t);b.lines.splice(+t.dataset.v,1);if(!b.lines.length)b.lines.push(makeLap('','',''));render()},
 applyps:t=>{const p=appState.prog.presets.find(x=>x.id===t.value);if(!p)return;blkOf(t).lines=JSON.parse(JSON.stringify(p.lines));toast('Preset "'+p.name+'" diisi');render()},
 psnew:()=>{const P=appState.prog,p={id:'ps'+Date.now(),name:'Preset baru',lines:[makeLap('','','')]};P.presets.push(p);P.psId=p.id;render()},
 psdup:()=>{const P=appState.prog,p=JSON.parse(JSON.stringify(P.presets[findPresetIndex()]));p.id='ps'+Date.now();p.name+=' (salinan)';P.presets.push(p);P.psId=p.id;toast('Preset diduplikat');render()},
 psdel:()=>{const P=appState.prog;if(P.presets.length<=1)return;P.presets.splice(findPresetIndex(),1);P.psId=P.presets[0].id;toast('Preset dihapus');render()},
 psladd:()=>{const l=appState.prog.presets[findPresetIndex()].lines;if(l.length<12)l.push(makeLap('','',''));render()},
 psldel:t=>{const l=appState.prog.presets[findPresetIndex()].lines;if(l.length>1)l.splice(+t.dataset.v,1);render()},
 crcalc:()=>{appState.prog.crSig=crSigNow();toast('Perhitungan selesai');render()},
 crreset:()=>{appState.prog.cr=seedCr();appState.prog.crSig=null;render()},
 copyprog:()=>copyToClipboard(programText(),'Teks program tersalin'),
 dlprog:async t=>{try{const k=t.dataset.k,f=appState.prog.fmt==='jpg'?'jpg':'pdf',report=k==='calc'?calcReport():progReport();await exportReport(report,f,(k==='calc'?'kalkulator-intensitas-':'program-latihan-')+slug(appState.prog.name||'klien'));toast('Diunduh sebagai '+f.toUpperCase())}catch(e){console.error(e);toast('Gagal membuat file')}}
});

export { DISTANCE_OPTIONS, INTENSITY_OPTIONS, INTERVAL_ROW_COUNT, PHASE_DESCRIPTIONS, PHASE_WEEK_INCREMENT, PROGLIST, TARGET_DEFS, TARGET_LIST, TRAINING_PHASES, blankBlock, blankDay, blankWeek, blkOf, calcReport, crRows, crSigNow, dayLines, ensureSched, findPresetIndex, findTemplateIndex, fitWeeks, fmtSel, formatPace, gapTxt, hmsT, hrOf, hrPct, hrPctTxt, hrTxt, idSum, isCooper12Target, jenisSel, makeLap, makePresets, makeTemplates, nowPace, paceOf, paceTxt, pbFmt, phaseName, progInit, progPer, progReport, programText, refName, refPace, refRow, renderTemplateSelector, seedCr, sessions, syncEnd, tgt, tpl, wkHead, wkLbl, wkOut, wkOutG, wkRows, wkTable };
