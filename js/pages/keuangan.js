/* js/pages/keuangan.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, money, perm } from '../core/access.js';
import { apiDel, apiSaveTransaction, isApiMode } from '../core/api.js';
import { filterTransactions, monthly } from '../core/derived.js';
import { TODAY, esc, fmtD, formatJuta, formatRupiah, iso, num, sum } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, CONF, FORMS, PAGES } from '../core/registry.js';
import { appState, store } from '../core/store.js';
import { kpi, maskNote, perBar, perLbl, pill, renderHBar, tabsBar } from '../ui/components.js';
import { render, toast } from '../ui/shell.js';

PAGES.keuangan=()=>{
 const tabs=['Ringkasan','Pendapatan per kategori','Catatan pengeluaran','Rincian'],t=Math.min(appState.tab,3),full=perm('keuangan')==='full',M=v=>money(v);
 const inc=filterTransactions(appState.per,'in'),exp=filterTransactions(appState.per,'out'),I=sum(inc.map(x=>x.amt)),E=sum(exp.map(x=>x.amt)),net=I-E;let body='';
 if(t===0){
  const mo=monthly();
  body=`<div class="toolbar">${perBar()}</div><div class="kpis">${kpi('Pemasukan',M(I),inc.length+' transaksi')}${kpi('Pengeluaran',M(E),exp.length+' catatan')}${kpi('Laba bersih',M(net),'pemasukan dikurangi pengeluaran')}${kpi('Margin',full?(I?Math.round(net/I*100)+'%':'-'):'••%','dari pemasukan')}</div>
  <section class="card"><header class="ch"><h3>Pemasukan dan pengeluaran per bulan</h3></header>${full?renderHBar(mo.flatMap(m=>[{l:m.l+' masuk',v:m.inc,c:'var(--good)'},{l:m.l+' keluar',v:m.exp,c:'var(--bad)'}]),v=>formatJuta(v)):`<p class="sub">Grafik bulanan disembunyikan.</p>`}</section>`}
 if(t===1){
  const by=store.programs.filter(p=>!p.del||inc.some(x=>x.pid===p.id)).map(p=>({l:p.name,v:sum(inc.filter(x=>x.pid===p.id).map(x=>x.amt))}));
  body=`<div class="toolbar">${perBar()}</div><section class="card"><header class="ch"><h3>Pendapatan per program</h3><span class="sub">${perLbl()}</span></header>${full?renderHBar(by.sort((a,b)=>b.v-a.v),v=>formatJuta(v)):`<p class="sub">Nominal disembunyikan.</p>`}</section>`}
 if(t===2){
  const cats=['Sewa Studio','Gaji Admin','Iklan','Software & Server','Perlengkapan','Lainnya'];
  const by=cats.map(c=>({l:c,v:sum(exp.filter(x=>x.cat===c).map(x=>x.amt))})).filter(x=>x.v>0);
  body=`<div class="toolbar">${perBar()}</div>
  ${full?`<section class="card"><header class="ch"><h3>Catat pengeluaran</h3></header><form data-form="expense" class="fg"><label class="field"><span>Tanggal</span><input id="f-etgl" name="date" type="date" value="${iso(TODAY)}" max="${iso(TODAY)}" required></label><label class="field"><span>Kategori</span><select name="cat">${cats.map(c=>`<option>${c}</option>`).join('')}</select></label><label class="field"><span>Jumlah (Rp)</span><input id="f-ejml" name="amt" type="number" min="1000" step="1000" required placeholder="500000"></label><label class="field"><span>Keterangan</span><input id="f-eket" name="desc" required placeholder="Contoh: sewa lapangan"></label><div class="row full"><button class="btn primary" type="submit">${icon('plus',15)} Simpan pengeluaran</button></div></form></section>`:''}
  <section class="card"><header class="ch"><h3>Pengeluaran per kategori</h3><span class="sub">${perLbl()}</span></header>${full?(by.length?renderHBar(by.sort((a,b)=>b.v-a.v),v=>formatJuta(v)):'<p class="sub">Belum ada pengeluaran pada periode ini.</p>'):'<p class="sub">Nominal disembunyikan.</p>'}</section>`}
 if(t===3){
  const rows=[...inc,...exp].sort((a,b)=>a.date<b.date?1:-1).slice(0,60);
  body=`<div class="toolbar">${perBar()}<span class="sub">${rows.length} transaksi terbaru</span></div><div class="mlist">${rows.map(x=>`<div class="li"><div><b>${esc(x.desc)}</b><small>${fmtD(x.date)} · ${esc(x.cat)}</small></div><div class="row"><b class="mono">${x.type==='in'?'+':'-'} ${M(x.amt)}</b>${full?`<button class="btn sm danger" data-act="asktx" data-v="${x.id}">${icon('trash',14)} Hapus</button>`:''}</div></div>`).join('')}</div><div class="tw dt"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th class="n">Jumlah</th>${full?'<th>Aksi</th>':''}</tr></thead><tbody>${rows.map(x=>`<tr><td class="mono">${fmtD(x.date)}</td><td>${x.type==='in'?pill('Masuk','good'):pill('Keluar','bad')}</td><td>${esc(x.cat)}</td><td>${esc(x.desc)}</td><td class="n">${x.type==='in'?'+':'-'} ${M(x.amt)}</td>${full?`<td><button class="btn sm danger" data-act="asktx" data-v="${x.id}">${icon('trash',14)} Hapus</button></td>`:''}</tr>`).join('')}</tbody></table></div>`}
 return `<div class="stackv">${maskNote('keuangan')}${tabsBar(tabs)}${body}</div>`};
ACT.asktx=t=>{if(perm('keuangan')!=='full')return;const x=store.tx.find(y=>y.id===t.dataset.v);if(!x)return;appState.modal={k:'confirm',text:'Hapus transaksi "'+x.desc+'" ('+fmtD(x.date)+', '+(x.type==='in'?'+':'-')+' '+formatRupiah(x.amt)+')? Angka keuangan, komisi, dan laporan ikut berubah.',yes:'deltx',arg:x.id,label:'Hapus transaksi'};render()};
CONF.deltx=async id=>{const x=store.tx.find(y=>y.id===id);if(!x||perm('keuangan')!=='full')return;if(isApiMode()){try{await apiDel('/transactions/'+id)}catch(e){toast('Gagal hapus: '+e.message);return}}store.tx=store.tx.filter(y=>y.id!==id);logAct('menghapus transaksi '+x.desc)};
FORMS.expense=async f=>{const d={date:f.get('date'),type:'out',category:f.get('cat'),desc:f.get('desc').trim(),amount:num(f.get('amt'))};
 if(isApiMode())await apiSaveTransaction(d);
 else store.tx.push({id:'t'+Date.now(),date:d.date,type:'out',cat:d.category,desc:d.desc,amt:d.amount});
 logAct('mencatat pengeluaran '+d.category);toast('Pengeluaran dicatat');render()};
