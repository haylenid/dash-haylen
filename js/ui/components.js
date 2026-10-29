/* js/ui/components.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { perm } from '../core/access.js';
import { ROLE } from '../core/constants.js';
import { MASK, MONTHS, TODAY, addD, esc, fmtD, iso, parseDate } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { appState, store } from '../core/store.js';

const pill=(t,k='')=>`<span class="pill ${k}">${esc(t)}</span>`;
const statusPill=s=>pill(s,{Aktif:'good','Segera berakhir':'warn',Selesai:'info',Arsip:''}[s]||'');
const kpi=(l,v,s='')=>`<div class="kpi"><span class="kl">${l}</span><b class="kv mono">${v}</b><span class="ks">${s}</span></div>`;
const locked=(title,cls='',why='Hanya Pemilik yang dapat melihat data ini.')=>`<section class="card locked ${cls}"><header class="ch"><h3>${title}</h3></header><div class="ghost" aria-hidden="true"><i style="width:82%"></i><i style="width:64%"></i><i style="width:91%"></i><i style="width:47%"></i></div><div class="lm"><div>${icon('lock',20)}<b>Data terkunci</b><span>Tersembunyi</span></div></div></section>`;
const CHART_PALETTE=['var(--accent)','var(--sky)','var(--violet)','var(--volt)','var(--z4)'];
function renderHBar(rows,fmt=v=>v){const m=Math.max(...rows.map(r=>r.v),1);return `<div class="hb">${rows.map((r,i)=>`<div class="hbr"><span class="hl" title="${esc(r.l)}">${esc(r.l)}</span><span class="track"><i style="width:${Math.max(2,r.v/m*100)}%;background:${r.c||CHART_PALETTE[i%CHART_PALETTE.length]}"></i></span><span class="hv">${fmt(r.v,r)}</span></div>`).join('')}</div>`}
function renderPercentBar(rows){return `<div class="hb">${rows.map(r=>{const v=Number.isFinite(r.v)?r.v:0;return `<div class="hbr"><span class="hl" title="${esc(r.l)}">${esc(r.l)}</span><span class="track"><i style="width:${Math.max(2,Math.min(100,v))}%;background:${v>=85?'var(--volt)':v>=65?'var(--sky)':'var(--accent)'}"></i></span><span class="hv">${v}%</span></div>`}).join('')}</div>`}
function meter(l,cur,tar,fmt,lock){
 if(lock)return `<div class="meter"><div class="mh"><span>${l}</span>${icon('lock',16)}</div><span class="track"><i style="width:0"></i></span><div class="mf"><span>${MASK}</span><span>Tersembunyi</span></div></div>`;
 const p=Math.min(100,Math.round(cur/tar*100));
 return `<div class="meter"><div class="mh"><span>${l}</span><b>${p}%</b></div><span class="track"><i style="width:${Math.max(2,p)}%${p>=100?';background:var(--volt)':''}"></i></span><div class="mf"><span>${fmt(cur)}</span><span>target ${fmt(tar)}</span></div></div>`}
function donut(segs,center,sub){
 const R=52,C=2*Math.PI*R,tot=segs.reduce((a,s)=>a+s.v,0)||1;let off=0;
 const arcs=segs.map(s=>{const len=Math.max(0,s.v/tot*C-(s.v>0?2:0));const e=`<circle cx="70" cy="70" r="${R}" fill="none" stroke="${s.c}" stroke-width="18" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;off+=s.v/tot*C;return e}).join('');
 return `<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="${esc(segs.map(s=>s.l+' '+s.v).join(', '))}"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="18"/>${arcs}<text x="70" y="72" text-anchor="middle" class="dn">${center}</text><text x="70" y="88" text-anchor="middle" class="ds">${sub}</text></svg><ul class="legend">${segs.map(s=>`<li><i style="background:${s.c}"></i>${esc(s.l)}<b>${s.v}</b></li>`).join('')}</ul></div>`}
function lineChart(vals,labels,target,partial){
 const W=640,H=240,marginLeft=46,R=14,T=16,B=30;
 const mx=Math.max(...vals,target)*1.05,st=[5e6,10e6,20e6,25e6,50e6,100e6].find(s=>mx/s<=5)||100e6,top=Math.ceil(mx/st)*st;
 const x=i=>marginLeft+i*(W-marginLeft-R)/(vals.length-1),y=v=>T+(H-T-B)*(1-v/top);
 let g='';for(let v=0;v<=top;v+=st)g+=`<line class="gl" x1="${marginLeft}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${marginLeft-8}" y="${y(v)+4}" text-anchor="end">${v/1e6} jt</text>`;
 const pts=vals.map((v,i)=>[x(i),y(v)]);
 const d=a=>a.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const solid=partial?pts.slice(0,-1):pts,lp=pts[pts.length-1],pp=pts[pts.length-2];
 const area=d(pts)+` L${lp[0]} ${y(0)} L${pts[0][0]} ${y(0)} Z`;
 const lb=labels.map((l,i)=>`<text class="ax" x="${x(i)}" y="${H-8}" text-anchor="${i===0?'start':i===labels.length-1?'end':'middle'}">${l}</text>`).join('');
 return `<svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pendapatan enam bulan terakhir dibanding target"><defs><linearGradient id="lgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.38"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:.02"/></linearGradient></defs>${g}<path class="ar" d="${area}"/><line class="tg" x1="${marginLeft}" x2="${W-R}" y1="${y(target)}" y2="${y(target)}"/><text class="tgl" x="${marginLeft+4}" y="${y(target)-6}">Target ${target/1e6} jt</text><path class="ln" d="${d(solid)}"/>${partial?`<path class="lp" d="M${pp[0]} ${pp[1]} L${lp[0]} ${lp[1]}"/>`:''}${lb}<circle class="ep" cx="${lp[0]}" cy="${lp[1]}" r="5"/><text class="vl" x="${lp[0]-10}" y="${lp[1]-10}" text-anchor="end">${(vals[vals.length-1]/1e6).toFixed(1)} jt</text></svg>`}
const tabsBar=list=>`<nav class="tabs" role="tablist">${list.map((t,i)=>`<button role="tab" data-act="tab" data-v="${i}" aria-selected="${appState.tab===i}">${t}</button>`).join('')}</nav>`;
const renderSegmented=(act,cur,opts)=>`<div class="seg" role="group">${opts.map(([v,l])=>`<button data-act="${act}" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join('')}</div>`;
const perRange=()=>{if(typeof appState.per==='number')return{a:addD(TODAY,-appState.per+1),b:TODAY};
 if(appState.per==='bulan')return{a:new Date(TODAY.getFullYear(),TODAY.getMonth(),1),b:TODAY};
 if(!appState.pfrom)appState.pfrom=iso(new Date(TODAY.getFullYear(),TODAY.getMonth(),1));if(!appState.pto)appState.pto=iso(TODAY);
 let a=parseDate(appState.pfrom),z=parseDate(appState.pto);if(a>z){const t=a;a=z;z=t}return{a,b:z}};
const perLbl=()=>{if(typeof appState.per==='number')return appState.per+' hari';const r=perRange();return appState.per==='bulan'?MONTHS[r.a.getMonth()]+' '+r.a.getFullYear():fmtD(r.a)+' - '+fmtD(r.b)};
const perBar=()=>{const r=perRange();return renderSegmented('per',appState.per,[[7,'7 hari'],[30,'30 hari'],[90,'90 hari'],['bulan','Bulan ini'],['kustom','Pilih tanggal']])+(appState.per==='kustom'?`<span class="drng"><input type="date" id="f-pfrom" data-f="pfrom" max="${iso(TODAY)}" value="${iso(r.a)}" aria-label="Dari tanggal"><span class="sub">s/d</span><input type="date" id="f-pto" data-f="pto" max="${iso(TODAY)}" value="${iso(r.b)}" aria-label="Sampai tanggal"></span>`:'')};
const activePrograms=()=>store.programs.filter(p=>!p.del);
const sheet=(title,body)=>`<div class="scrim" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet"><div class="sh"><h3>${title}</h3><button class="btn sm ghost" data-act="close" aria-label="Tutup">${icon('x')}</button></div>${body}</div></div>`;
const banner=(t,k='')=>`<div class="banner ${k}">${icon(k==='warn'?'lock':'info',18)}<div>${t}</div></div>`;
const maskNote=m=>perm(m)==='mask'?banner('Data terkunci. Nominal pada halaman ini tersembunyi untuk peran '+ROLE[appState.role]+'.','warn'):'';

export { CHART_PALETTE, activePrograms, banner, donut, kpi, lineChart, locked, maskNote, meter, perBar, perLbl, perRange, pill, renderHBar, renderPercentBar, renderSegmented, sheet, statusPill, tabsBar };
