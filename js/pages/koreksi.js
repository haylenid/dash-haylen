/* js/pages/koreksi.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, meId, scope } from '../core/access.js';
import { apiFixShareLink, apiSaveTemplate, apiUpdateTemplate, apiDeleteTemplate, apiSubmitCorrection, isApiMode } from '../core/api.js';
import { COACHES, PLAN, ROLE_USER_IDS } from '../core/constants.js';
import { getPendingCorrections, hrZone, inRange } from '../core/derived.js';
import { DAYS, TODAY, addD, dIdx, esc, first, fmtD, hhmm, iso, parseDate } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, FORMS, PAGES } from '../core/registry.js';
import { appState, findClientById, findProgramById, getMemberName, store } from '../core/store.js';
import { fixOnDate, linkEntries, planTypeOn, slId } from '../core/shared.js';
import { getShareLinkFor, renderShareLinkBlock } from '../portal/links.js';
import { banner, kpi, pill, renderHBar, renderSegmented, tabsBar } from '../ui/components.js';
import { render, toast } from '../ui/shell.js';

const weekDates=()=>{const mon=addD(TODAY,-dIdx(TODAY)-7*appState.kweek);return[0,1,2,3,4,5,6].map(i=>addD(mon,i))};
const kCoachId=()=>appState.role==='coach'?meId():(appState.kcoach==='all'?null:appState.kcoach);
const kReports=()=>{const id=kCoachId();return store.reports.filter(r=>{const c=findClientById(r.cid);return c&&(!id||c.coach===id)})};
const kLinks=()=>{const id=kCoachId();return linkEntries().filter(r=>{const c=findClientById(r.cid);return c&&(!id||c.coach===id)})};
const zonePill=(hr,mx)=>{const z=hrZone(hr,mx);return `<span class="pill"><i class="zdot" style="background:var(--z${z.z})"></i>Z${z.z}</span>`};
const renderCorrectionFilters=(noWeek)=>`<div class="toolbar">${appState.role==='coach'?'':`<label class="field" style="max-width:220px"><span>Coach</span><select data-f="kcoach"><option value="all">Semua coach</option>${COACHES.map(c=>`<option value="${c}" ${appState.kcoach===c?'selected':''}>${esc(getMemberName(c))}</option>`).join('')}</select></label>`}${noWeek?'<span class="sub">Laporan harian hanya untuk minggu ini</span>':renderSegmented('kweek',appState.kweek,[[0,'Minggu ini'],[1,'Minggu lalu']])}</div>`;
function fixBlock(r){return renderShareLinkBlock(r)+renderFixDetails(r)}
function renderFixDetails(r){
 const c=findClientById(r.cid);
 if(r.fix&&appState.editfix!==r.id)return `<div class="fixbox"><div class="row">${pill('Dikoreksi','good')}<span class="sub">${esc(getMemberName(r.fix.by))} · ${hhmm(r.fix.at)}</span><span class="sp"></span><button class="btn sm" data-act="editfix" data-v="${r.id}">Ubah</button></div><p>${esc(r.fix.text)}</p></div>`;
 return `<form data-form="fix" data-id="${r.id}" class="listv"><label class="field"><span>Template koreksi</span><select id="f-tpl-${r.id}" data-tpl><option value="">Pilih template atau tulis sendiri</option>${store.tpl.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('')}</select></label><label class="field"><span>Koreksi untuk ${esc(first(c.name))}</span><textarea id="f-fix-${r.id}" name="text" required placeholder="Tulis koreksi">${r.fix?esc(r.fix.text):''}</textarea></label><div class="row"><button class="btn primary sm" type="submit">${icon('send',14)} Kirim koreksi</button>${r.fix?'<button class="btn sm" type="button" data-act="editfix" data-v="">Batal</button>':''}</div></form>`}
PAGES.koreksi=()=>{
 const tabs=['Ringkasan','Hasil latihan klien','Laporan harian','Template'],t=Math.min(appState.tab,3);let body='';
 const days=weekDates();
 if(t===0){
  const rs=kReports().filter(r=>inRange(r.date,7)),got=rs.filter(r=>!r.missed),fx=got.filter(r=>r.fix),tungguKoreksi=got.filter(r=>!r.fix),pd=tungguKoreksi.concat(kLinks().filter(r=>inRange(r.date,7)&&!r.fix)).sort((a,b)=>a.date<b.date?1:-1);
  const byC=COACHES.map(c=>({l:first(getMemberName(c)),v:getPendingCorrections(c).length}));
  body=`<div class="kpis">${kpi('Laporan masuk',got.length,'7 hari terakhir')}${kpi('Sudah dikoreksi',fx.length,Math.round(fx.length/Math.max(1,got.length)*100)+'% dari laporan')}${kpi('Menunggu koreksi',pd.length,'perlu tindakan')}${kpi('Tidak lapor',rs.filter(r=>r.missed&&!getShareLinkFor(r.cid,r.date)).length,'hari latihan terlewat')}</div>
  <div class="dash"><section class="card ${appState.role==='coach'?'c12':'c8'}"><header class="ch"><h3>Perlu dikoreksi</h3><span class="sub">Terbaru di atas</span></header>${pd.length?`<div class="listv">${pd.slice(0,7).map(r=>`<div class="li"><div><b>${esc(findClientById(r.cid).name)}</b><small>${r.link?r.type+' · link dari klien':r.type+' · '+r.km+' dari '+r.plan+' km'} · ${fmtD(r.date)} · ${esc(first(getMemberName(findClientById(r.cid).coach)))}</small></div><button class="btn sm" data-act="kopen" data-d="${r.date}">Koreksi</button></div>`).join('')}</div>`:'<p class="sub">Semua laporan sudah dikoreksi.</p>'}</section>
  ${appState.role==='coach'?'':`<section class="card c4"><header class="ch"><h3>Antrean per coach</h3></header>${renderHBar(byC,v=>v)}</section>`}</div>`}
 if(t===1){
  const id=kCoachId(),cls=scope(store.clients).filter(c=>!c.arch&&(!id||c.coach===id)&&(store.reports.some(r=>r.cid===c.id)||(store.swLinks||[]).some(x=>x.cid===c.id)));
  body=`${renderCorrectionFilters()}<div class="tw"><table class="sg" style="min-width:720px"><thead><tr><th>Klien</th>${days.map(d=>`<th>${DAYS[dIdx(d)]}<br><span class="mono">${d.getDate()}</span></th>`).join('')}<th>Total km</th></tr></thead><tbody>${cls.map(c=>{
   let a=0,p=0;
   const cells=days.map(d=>{const k=iso(d),r=store.reports.find(x=>x.cid===c.id&&x.date===k);
    if(!r)return getShareLinkFor(c.id,k)?`<td><button class="cell ov" data-act="kopen" data-d="${k}" title="Link dari klien">Link</button></td>`:`<td><span class="cell no">${d>TODAY||!PLAN[dIdx(d)]?'-':'...'}</span></td>`;
    p+=r.plan;if(r.missed)return getShareLinkFor(c.id,k)?`<td><button class="cell ov" data-act="kopen" data-d="${k}" title="Link dari klien">Link</button></td>`:`<td><button class="cell ms" data-act="kopen" data-d="${k}">Tidak lapor</button></td>`;
    a+=r.km;const q=r.km/r.plan,cls2=q<.85?'un':q>1.15?'ov':'ok';
    return `<td><button class="cell ${cls2}" data-act="kopen" data-d="${k}" title="${r.type}">${r.km}/${r.plan}</button></td>`}).join('');
   return `<tr><td><b>${esc(c.name)}</b><small>${esc(first(getMemberName(c.coach)))}</small></td>${cells}<td class="mono">${Math.round(a)}/${p}</td></tr>`}).join('')||'<tr><td colspan="9" class="sub">Belum ada laporan pada filter ini.</td></tr>'}</tbody></table></div>
  <p class="sub">Sel menampilkan km aktual dari km rencana. Hijau sesuai rencana, kuning kurang dari 85%, biru lebih dari 115%, merah tidak lapor. Ketuk sel untuk membuka laporannya.</p>`}
 if(t===2){
  const wk=[0,1,2,3,4,5,6].map(i=>addD(TODAY,i-dIdx(TODAY)));
  if(!wk.some(d=>iso(d)===appState.kdate))appState.kdate=iso(TODAY);
  const list=kReports().filter(r=>r.date===appState.kdate&&!(r.missed&&getShareLinkFor(r.cid,r.date))).concat(kLinks().filter(r=>r.date===appState.kdate)).sort((a,b)=>findClientById(a.cid).name<findClientById(b.cid).name?-1:1);
  body=`${renderCorrectionFilters(true)}<div class="dstrip">${wk.map(d=>{const k=iso(d),n=kReports().filter(r=>r.date===k&&!r.missed&&!r.fix).length+kLinks().filter(r=>r.date===k&&!r.fix).length;return `<button data-act="kdate" data-v="${k}" aria-pressed="${appState.kdate===k}" ${d>TODAY?'disabled':''}><small>${DAYS[dIdx(d)]}</small><b>${d.getDate()}</b><small>${d>TODAY?'-':n+' menunggu'}</small></button>`}).join('')}</div>
  <div class="listv">${list.map(r=>{const c=findClientById(r.cid);
   if(r.link)return `<div class="rep"><div class="wkh"><div><b>${esc(c.name)}</b><p class="sub">${esc(findProgramById(c.pid).name)} · ${esc(r.type)}</p></div><div class="row">${pill('Link dari klien','info')}${r.fix?pill('Dikoreksi','good'):pill('Menunggu','warn')}</div></div>
   <p class="sub">Klien menyetor link hasil latihan dari dashboard-nya. Cek hasilnya di link, lalu tulis koreksi.</p>${fixBlock(r)}</div>`;
   if(r.missed)return `<div class="rep"><div class="wkh"><div><b>${esc(c.name)}</b><p class="sub">${esc(findProgramById(c.pid).name)}</p></div>${pill('Tidak lapor','bad')}</div></div>`;
   return `<div class="rep"><div class="wkh"><div><b>${esc(c.name)}</b><p class="sub">${esc(findProgramById(c.pid).name)}</p></div><div class="row">${r.fix?pill('Dikoreksi','good'):pill('Menunggu','warn')}</div></div>
   ${fixBlock(r)}</div>`}).join('')||`<section class="card"><p class="sub">Tidak ada laporan pada tanggal ini.</p></section>`}</div>`}
 if(t===3){
  body=`${banner('Gunakan {nama} dan {jenis} di dalam teks. Keduanya diganti otomatis dengan nama depan klien dan jenis sesi.')}<div class="listv">${store.tpl.map((x,i)=>`<section class="card"><div class="fg"><label class="field"><span>Judul template</span><input id="f-tt${i}" value="${esc(x.title)}" data-set="store.tpl.${i}.title" onchange="setTimeout(()=>window._saveCorrTpl&amp;&amp;window._saveCorrTpl(${i}),0)"></label><label class="field full"><span>Isi koreksi</span><textarea id="f-tx${i}" data-set="store.tpl.${i}.text" onchange="setTimeout(()=>window._saveCorrTpl&amp;&amp;window._saveCorrTpl(${i}),0)">${esc(x.text)}</textarea></label></div><div class="row"><button class="btn sm danger" data-act="tpldel" data-v="${i}">${icon('trash',14)} Hapus</button></div></section>`).join('')}</div><div><button class="btn primary" data-act="tplnew">${icon('plus',15)} Program baru</button></div>`}
 return `<div class="stackv">${tabsBar(tabs)}${body}</div>`};
FORMS.fix=async (f,form)=>{const idData=form.dataset.id,tautanLink=idData.startsWith('sl|')?(store.swLinks||[]).find(x=>slId(x)===idData):null,r=tautanLink||store.reports.find(x=>x.id===idData);
 if(!r){toast('Data laporan tidak ditemukan');return}
 const rtype=tautanLink?planTypeOn(tautanLink.date):r.type,text=f.get('text').trim();
 if(isApiMode()){
   try{
     if(tautanLink){
       // Koreksi untuk share link disimpan ke backend
       await apiFixShareLink(tautanLink.id||tautanLink.cid+'|'+tautanLink.date, text);
       r.fix={by:meId(),text,at:new Date()};
     }else{
       r.fix=await apiSubmitCorrection(r.id,text);
     }
   }catch(e){toast('Gagal menyimpan koreksi: '+((e&&e.message)||e));return}
 }else r.fix={by:meId(),text,at:new Date()};
 (store.msgs.dm[r.cid]=store.msgs.dm[r.cid]||[]).push({w:meId(),text:'Koreksi '+rtype+' '+fmtD(r.date)+': '+r.fix.text,t:r.fix.at});appState.editfix=null;logAct('mengirim koreksi untuk '+findClientById(r.cid).name);toast('Koreksi terkirim dan masuk ke dashboard '+first(findClientById(r.cid).name));render()};
Object.assign(ACT,{
 kopen:t=>{const d=parseDate(t.dataset.d),mon=addD(TODAY,-dIdx(TODAY));appState.kweek=Math.max(0,Math.round((mon-addD(d,-dIdx(d)))/(7*864e5)));appState.kdate=t.dataset.d;appState.page='koreksi';appState.tab=d<mon?1:2;appState.modal=null;appState.nav=false;render(false)},
 kdate:t=>{appState.kdate=t.dataset.v;render()},
 kweek:t=>{appState.kweek=+t.dataset.v;const ds=weekDates();appState.kdate=iso(appState.kweek===0?TODAY:ds[6]);render()},
 editfix:t=>{appState.editfix=t.dataset.v||null;render()},
 tplnew:async ()=>{
   if(isApiMode()){
     try{await apiSaveTemplate('Template baru','Halo {nama}, ')}catch(e){toast('Gagal menyimpan: '+(e.message||e));return}
   }else{store.tpl.push({id:'t'+Date.now(),title:'Template baru',text:'Halo {nama}, '})}
   render()},
 tpldel:async t=>{
   const i=+t.dataset.v,tp=store.tpl[i];if(!tp)return;
   if(isApiMode()){
     try{await apiDeleteTemplate(tp.id)}catch(e){toast('Gagal menghapus template: '+((e&&e.message)||e));return}
   }else store.tpl.splice(i,1);
   render()}
});
// Simpan edit template koreksi ke backend (dipanggil via onchange setelah data-set)
async function saveCorrTpl(i){
 const t=store.tpl[i];if(!t||!isApiMode())return;
 try{await apiUpdateTemplate(t.id,t.title,t.text)}
 catch(e){toast('Gagal menyimpan template: '+((e&&e.message)||e))}
}
if(typeof window!=='undefined')window._saveCorrTpl=saveCorrTpl;

export { fixBlock, kCoachId, kLinks, kReports, renderCorrectionFilters, renderFixDetails, weekDates, zonePill };
