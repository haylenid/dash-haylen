/* js/pages/komisi.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { logAct, meId, money, perm } from '../core/access.js';
import { getCommissionData, komCoachGroups, komLbl, komRange, payDateFor, payOf, paySegOf, pkgSessions } from '../core/derived.js';
import { MASK, TODAY, esc, first, fmtD, iso, num, parseDate, sum } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, CONF, FORMS, MODALS, PAGES } from '../core/registry.js';
import { locOf } from '../core/shared.js';
import { appState, findProgramById, getClientStatus, getMemberName, store } from '../core/store.js';
import { apiCancelCommission, apiDel, apiPayCommission, apiSaveProgram, isApiMode } from '../core/api.js';
import { activePrograms, banner, kpi, maskNote, pill, sheet, tabsBar } from '../ui/components.js';
import { copyToClipboard, render, toast } from '../ui/shell.js';

const progPrice=p=>appState.role==='coach'?MASK:money(p.price,'komisi');
/* Komisi Bulanan Fase B (Bentuk 1): stepper bulan — ‹ label ›, label diklik
   membuka pemilih bulan & tahun; chip "Bulan ini" muncul saat melihat bulan lain. */
const komIsCurrent=()=>appState.komY==null||(appState.komY===TODAY.getFullYear()&&appState.komM===TODAY.getMonth());
const komBar=()=>`<span class="seg"><button data-act="komprev" title="Bulan sebelumnya" aria-label="Bulan sebelumnya">‹</button><button data-act="komjump" title="Pilih bulan & tahun"><b>${komLbl()}</b></button><button data-act="komnext" title="Bulan berikutnya" aria-label="Bulan berikutnya">›</button></span>`+(komIsCurrent()?'':`<button class="btn sm" data-act="kombalik">Bulan ini</button>`);
const komPayBanner=(per,kurang)=>{const pd=payDateFor(komRange());return banner('Jadwal pembayaran komisi '+per+': <b>'+fmtD(pd)+' '+pd.getFullYear()+'</b>'+(pd<TODAY?' (sudah lewat)':'')+' · belum dibayar <b>'+money(kurang,'komisi')+'</b>','info')};
PAGES.komisi=()=>{
 const tabs=['Ringkasan','Performa & pembayaran','Harga program & komisi'],t=Math.min(appState.tab,2),k=getCommissionData(komRange()),mine=appState.role==='coach';
 const coaches=mine?k.byCoach.filter(x=>x.c===meId()):k.byCoach;
 /* rows (per klien) kini hanya untuk agregat toolbar/banner; satuan TAMPIL
    tab Performa adalah grup per coach penghasil (komCoachGroups, masalah 1-3),
    sedangkan satuan BAYAR tetap per segmen klien x pelatih (paidSeg). */
 const rows=mine?k.byClient.filter(x=>x.coach===meId()):k.byClient;
 /* Komisi Bulanan Fase A: periode = bulan kalender terpilih; label bulan adalah
    kunci pembayaran (kompatibel catatan era "Bulan ini" Fase 1). */
 const per=komLbl();
 const tot=sum(rows.map(x=>x.kom)),nses=sum(rows.map(x=>x.nSes)),paid=sum(rows.map(x=>{const p=payOf(x.c,per);return p?Math.min(p.amt,x.kom):0}));
 const M=v=>money(v,'komisi');let body='';
 if(t===0){
  body=`<div class="toolbar">${komBar()}<span class="sp"></span><button class="btn" data-act="copykom">${icon('copy',15)} Salin laporan</button></div>
  <div class="kpis">${kpi('Sesi hadir',nses,per)}${kpi('Total komisi',M(tot),'dibayarkan ke coach')}${kpi('Sudah dibayar',M(paid),'periode berjalan')}${kpi('Belum dibayar',M(tot-paid),'menunggu pembayaran')}</div>
  <div class="tw"><table><thead><tr><th>Program</th>${mine?'':'<th class="n">Harga program</th>'}<th class="n">Komisi per sesi hadir</th><th class="n">Sesi hadir</th><th class="n">Total komisi</th></tr></thead><tbody>${k.byProg.map(x=>`<tr><td>${esc(x.p.name)}</td>${mine?'':`<td class="n">${progPrice(x.p)}</td>`}<td class="n">${M(x.p.fee)}</td><td class="n">${x.nSes}</td><td class="n">${M(x.kom)}</td></tr>`).join('')}</tbody></table></div>`}
 if(t===1){
  /* Paket Perbaikan Komisi (masalah 1-3): tampil per grup coach PENGHASIL
     (komCoachGroups) — semua coach selalu tampil sejak awal; segmen titip
     masuk grup coach pengganti dan kolom Coach selalu berlabel penghasil;
     tampilan coach yang login = grupnya sendiri (termasuk titipannya). */
  /* Filter coach (2026-10-22): pemilik/admin bisa menyempitkan tabel ke satu
     coach; banner kekurangan mengikuti coach yang sedang tampil (dihitung
     per segmen). Coach yang login tetap hanya melihat grupnya sendiri. */
  const fCoach=mine?'':(appState.komcoach||'');
  const groups=komCoachGroups(k).filter(gr=>mine?gr.coach===meId():(!fCoach||gr.coach===fCoach));
  const kurangSeg=groups.reduce((a,gr)=>a+gr.rows.reduce((b,{x,g})=>{const sp=paySegOf(x.c,g.coach,per);return b+(g.kom-(sp?Math.min(sp.amt,g.kom):0))},0),0);
  const segPay=(x,g)=>{const sp=paySegOf(x.c,g.coach,per),lunas=sp&&sp.amt>=g.kom,seba=sp&&sp.amt>0&&sp.amt<g.kom;
   const status=lunas?pill('Dibayar','good'):seba?pill('Sebagian','warn'):pill('Belum dibayar','warn');
   const detail=lunas?`<small class="sub" style="display:block;margin-top:4px">${fmtD(parseDate(sp.date))} · ${esc(sp.method)}</small>`:seba?`<small class="sub" style="display:block;margin-top:4px">Kurang ${M(g.kom-sp.amt)} · terbayar ${M(sp.amt)}</small>`:'';
   return status+detail};
  const segAksi=(x,g)=>{if(perm('komisi')!=='full')return '-';const sp=paySegOf(x.c,g.coach,per),lunas=sp&&sp.amt>=g.kom;
   return lunas?`<button class="btn sm" data-act="paidcl" data-v="${x.c}|${g.coach}">Batalkan</button>`:`<button class="btn sm primary" style="white-space:nowrap" data-act="modal" data-v="bayar" data-id="${x.c}|${g.coach}">${sp?'Bayar kekurangan':'Bayar komisi'}</button>${sp?` <button class="btn sm" data-act="paidcl" data-v="${x.c}|${g.coach}">Batalkan</button>`:''}`};
  const grpStatus=gr=>{if(gr.kom<=0)return pill('Belum dibayar','warn');const pdg=gr.rows.reduce((a,{x,g})=>{const sp=paySegOf(x.c,g.coach,per);return a+(sp?Math.min(sp.amt,g.kom):0)},0);return pdg>=gr.kom?pill('Dibayar','good'):pdg>0?pill('Sebagian','warn'):pill('Belum dibayar','warn')};
  const segRow=({x,g})=>`<tr><td>${esc(getMemberName(g.coach))}${g.coach!==x.coach?'<small class="sub" style="display:block">titipan</small>':''}</td><td><b>${esc(x.cl.name)}</b>${g.coach!==x.coach?`<small class="sub" style="display:block">klien ${esc(getMemberName(x.coach))}</small>`:''}</td><td>${esc((findProgramById(x.pid)||{}).name||'-')}</td><td class="n">${g.coach!==x.coach&&g.titipN?g.titipSes+' / '+g.titipN:x.pkgTotal?x.cumSes+' / '+x.pkgTotal:x.nSes+' / '+x.nJadwal}${g.lastSes?' ('+fmtD(parseDate(g.lastSes))+')':''}</td><td class="n"><b>${M(g.kom)}</b>${g.coach!==x.coach||g.nSes!==x.nSes?`<small class="sub" style="display:block">${g.nSes} sesi oleh pelatih ini</small>`:''}</td><td>${segPay(x,g)}</td>${mine?'':`<td>${segAksi(x,g)}</td>`}</tr>`;
  const grpRows=gr=>`<tr class="ghead" style="background:var(--surface-2)"><td colspan="${mine?6:7}"><b>${esc(getMemberName(gr.coach))}</b> <span class="sub">· ${gr.nSes} sesi · ${M(gr.kom)}</span> ${grpStatus(gr)}</td></tr>`+(gr.rows.length?gr.rows.map(segRow).join(''):`<tr><td>${esc(getMemberName(gr.coach))}</td><td class="sub">Belum ada perolehan</td><td>-</td><td class="n">0</td><td class="n"><b>${M(0)}</b></td><td>${pill('Belum dibayar','warn')}</td>${mine?'':'<td>-</td>'}</tr>`);
  body=`<div class="toolbar">${komBar()}${mine?'':`<span class="sp"></span><label class="sub">Coach <select data-f="komcoach"><option value="">Semua coach</option>${k.byCoach.map(bc=>`<option value="${bc.c}"${fCoach===bc.c?' selected':''}>${esc(getMemberName(bc.c))}</option>`).join('')}</select></label>`}</div>${komPayBanner(per,(fCoach||mine)?kurangSeg:tot-paid)}<div class="tw"><table><thead><tr><th>Coach</th><th>Klien</th><th>Program</th><th class="n">Sesi hadir</th><th class="n">Total komisi</th><th>Pembayaran</th>${mine?'':'<th>Aksi</th>'}</tr></thead><tbody>${groups.map(grpRows).join('')||`<tr><td colspan="${mine?6:7}" class="sub">Belum ada data coach.</td></tr>`}</tbody></table></div>${store.paidLegacy&&store.paidLegacy.length?banner(store.paidLegacy.length+' pembayaran lama (era per-coach) belum tertaut ke klien dan tidak menandai klien mana pun.','info'):''}`}
 if(t===2){
  const ed=appState.role==='owner';
  body=`${banner('Komisi per sesi hadir dihitung otomatis: setiap klien yang diabsen Hadir oleh coach menambah komisi coach sebesar nominal di kartu program. Tidak ada komisi penjualan program.','info')}${ed?banner('Harga dan komisi bebas Anda atur. Tekan Edit pada baris program untuk mengubah nama, harga, komisi, dan durasinya di jendela pop up.'):banner('Tambah, ubah, dan hapus program hanya dapat dilakukan oleh Pemilik.')}
  <div class="toolbar"><h3 style="font-size:16px">Daftar program</h3><span class="sub">${activePrograms().length} program</span><span class="sp"></span>${ed?`<button class="btn primary" data-act="modal" data-v="prog">${icon('plus',15)} Tambah program</button>`:''}</div>
  <div class="tw dt"><table><thead><tr><th>Nama program</th><th>Durasi</th>${appState.role==='coach'?'':'<th class="n">Harga program</th>'}<th class="n">Komisi per sesi hadir</th><th class="n">Klien aktif</th>${ed?'<th>Aksi</th>':''}</tr></thead><tbody>${activePrograms().map(p=>{const n=store.clients.filter(c=>!c.arch&&c.pid===p.id&&getClientStatus(c)!=='Selesai').length;
   return `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.unit||'-')}</td>${appState.role==='coach'?'':`<td class="n mono">${progPrice(p)}</td>`}<td class="n mono">${money(p.fee,'komisi')}</td><td class="n">${n}</td>${ed?`<td><div class="acts"><button class="btn sm" data-act="modal" data-v="prog" data-id="${p.id}">${icon('edit',14)} Edit</button><button class="btn sm danger" data-act="askprog" data-v="${p.id}">${icon('trash',14)} Hapus</button></div></td>`:''}</tr>`}).join('')}</tbody></table></div>
  <div class="mlist">${activePrograms().map(p=>{const n=store.clients.filter(c=>!c.arch&&c.pid===p.id&&getClientStatus(c)!=='Selesai').length;
   return `<div class="li" style="align-items:flex-start"><div style="flex:1"><b>${esc(p.name)}</b><small>Durasi: ${esc(p.unit||'-')}</small>${appState.role==='coach'?'':`<small>Harga program: <span class="mono">${progPrice(p)}</span></small>`}<small>Komisi per sesi hadir: <span class="mono">${money(p.fee,'komisi')}</span></small></div>${pill(n+' klien aktif','info')}${ed?`<div style="width:100%"><div class="acts"><button class="btn sm" data-act="modal" data-v="prog" data-id="${p.id}">${icon('edit',14)} Edit</button><button class="btn sm danger" data-act="askprog" data-v="${p.id}">${icon('trash',14)} Hapus</button></div></div>`:''}</div>`}).join('')}</div>`}
 return `<div class="stackv">${maskNote('komisi')}${tabsBar(tabs)}${body}</div>`};
MODALS.prog=m=>{
 const p=m.id?findProgramById(m.id):{name:'',price:'',unit:'',fee:60000};if(!p)return '';
 return sheet(m.id?'Ubah program':'Tambah program',`<form data-form="prog" class="fg"><input type="hidden" name="id" value="${m.id||''}">
 <label class="field full"><span>Nama program</span><input id="f-pgn" name="name" required value="${esc(p.name)}" placeholder="Contoh: Marathon 16 Minggu"></label>
 <label class="field"><span>Harga (Rp)</span><input id="f-pgp" name="price" type="number" min="0" step="any" required value="${p.price}"></label>
 <label class="field"><span>Jumlah pertemuan (sesi)</span><input id="f-pgu" name="unit" type="number" min="1" step="1" required value="${pkgSessions(p)||''}" placeholder="Contoh: 8"></label>
 ${m.id&&p.unit&&!pkgSessions(p)?`<div class="full"><small class="sub">Sebelumnya: ${esc(p.unit)} — semua program kini paket pertemuan; isi jumlah pertemuan program ini.</small></div>`:''}
  <label class="field"><span>Komisi per sesi hadir (Rp)</span><input id="f-pgf" name="fee" type="number" min="0" step="any" required value="${p.fee}"></label>
  <label class="field"><span>Jumlah peserta</span><select name="peserta"><option value="1" ${+p.peserta===2?'':'selected'}>1 orang (individu)</option><option value="2" ${+p.peserta===2?'selected':''}>2 orang (paket, satu pembayaran)</option></select></label>
 <div class="row full"><button class="btn primary" type="submit">Simpan</button><button class="btn" type="button" data-act="close">Batal</button></div></form>`)};
FORMS.prog=async f=>{
 if(appState.role!=='owner')return;
 const id=f.get('id'),name=f.get('name').trim();if(!name){toast('Nama program wajib diisi');return}
 // Paket Pertemuan (2026-10-21): Durasi = jumlah pertemuan, wajib angka.
 // Disimpan kanonis "N pertemuan" (tampilan lama langsung terbaca benar);
 // wk := N sebagai amplop perkiraan tanggal selesai (mulai + N minggu).
 const nSesi=parseInt(f.get('unit'),10);
 if(!nSesi||nSesi<1){toast('Jumlah pertemuan wajib diisi (angka minimal 1)');return}
 const data={name,price:num(f.get('price')),unit:nSesi+' pertemuan',fee:num(f.get('fee')),peserta:+f.get('peserta')===2?2:1,wk:nSesi,lvl:.7};
 let p;
 if(isApiMode()){
   try{p=await apiSaveProgram(id?{...data,id}:data)}
   catch(e){toast('Gagal simpan: '+e.message);return}
 }else{
   p=id&&findProgramById(id);if(!p){p={id:'p'+Date.now(),lvl:.7};store.programs.push(p)}
   Object.assign(p,data);delete p.del;
 }
 appState.syncAt=new Date();
 logAct((id?'mengubah program ':'menambah program ')+p.name);appState.modal=null;toast(id?'Program diperbarui':'Program ditambahkan');render()};
CONF.delprog=async id=>{const p=findProgramById(id);if(isApiMode()){try{await apiDel('/programs/'+id)}catch(e){
 if(String(e.message||'').startsWith('Masih dipakai')){appState.modal={k:'forcedel',kind:'program',id,name:p?p.name:id,detail:e.message};render();return}
 toast('Gagal hapus: '+e.message);return}}p.del=true;appState.syncAt=new Date();logAct('menghapus program '+(p?p.name:id))};
MODALS.komjump=()=>{
 const r=komRange(),v=r.a.getFullYear()+'-'+String(r.a.getMonth()+1).padStart(2,'0');
 return sheet('Pilih bulan komisi',`<div class="fg"><label class="field full"><span>Bulan & tahun</span><input id="f-komjump" type="month" value="${v}"></label>
 <div class="row full"><button class="btn primary" data-act="komapply">Terapkan</button><button class="btn" data-act="close">Batal</button></div></div>`)};
MODALS.bayar=m=>{
 /* F1.4: modal bayar dibuka dari baris KLIEN (m.id = client_id).
    Komisi Bulanan Fase A: nominal yang dibayar = KEKURANGAN bulan terpilih.
    Fase C: m.id bisa "client|coach" — pembayaran per SEGMEN pelatih aktual
    (sesi titipan dibayar ke coach pengganti, bukan pemilik klien). */
 const [cl,segCoach]=String(m.id||'').split('|'),k=getCommissionData(komRange()),x=k.byClient.find(y=>y.c===cl);if(!x||perm('komisi')!=='full')return '';
 const g=(x.perCoach||[]).find(y=>y.coach===segCoach)||{coach:x.coach,nSes:x.nSes,kom:x.kom},split=!!segCoach||(x.perCoach||[]).length>1,multi=(x.perCoach||[]).length>1||g.coach!==x.coach;
 const pay=paySegOf(cl,g.coach,komLbl()),sudah=pay?pay.amt:0,kurang=Math.max(0,g.kom-sudah),belumSelesai=komRange().b>TODAY;
 /* Catatan titip (2026-10-22): segmen pengganti dibaca dengan hitungan
    titipannya sendiri (titipSes / titipN), bukan progres paket klien. */
 const sesLine=g.coach!==x.coach&&g.titipN?g.titipSes+' / '+g.titipN+' sesi titipan · '+g.nSes+' sesi oleh pelatih ini'+(x.pkgTotal?' · progres paket klien '+x.cumSes+' / '+x.pkgTotal:' (total klien '+x.nSes+' / '+x.nJadwal+' sesi)'):x.pkgTotal?x.cumSes+' / '+x.pkgTotal+' sesi (progres paket) · '+(multi?g.nSes+' sesi oleh pelatih ini':x.nSes+' sesi bulan ini'):(multi?g.nSes+' sesi oleh pelatih ini (total klien '+x.nSes+' sesi)':x.nSes+' / '+x.nJadwal+' sesi');
 const M=v=>money(v,'komisi'),row=(a,b,bold)=>`<tr><td>${a}</td><td class="n">${bold?'<b>'+b+'</b>':b}</td></tr>`;
 return sheet('Pembayaran komisi coach',`<div class="idcard"><b>${esc(x.cl.name)}</b><small>Klien dari coach ${esc(getMemberName(x.coach))}</small><small>Periode ${esc(komLbl())}</small><small>Lokasi: ${esc(locOf(g.coach))}</small></div>
 <div class="tw" style="margin-top:12px"><table><tbody>${row('Program',(findProgramById(x.pid)||{}).name||'-')}${split?row('Pelatih yang dibayar',esc(getMemberName(g.coach))+(g.coach!==x.coach?' (titipan)':'')):''}${row('Sesi hadir',sesLine)}${row('Komisi per sesi hadir',M(x.fee))}${row(split?'Total komisi pelatih ini':'Total komisi',M(g.kom))}${sudah?row('Sudah dibayar',M(sudah)):''}${row('Dibayarkan sekarang',M(kurang),true)}</tbody></table></div>${belumSelesai?`<p class="sub" style="margin-top:10px">Bulan ${esc(komLbl())} belum berakhir — sesi setelah hari ini belum termasuk. Kekurangannya dapat dibayar menyusul; status akan tampil "Sebagian" sampai lunas.</p>`:''}
 <form data-form="bayar" class="fg" style="margin-top:12px"><input type="hidden" name="cl" value="${cl}"><input type="hidden" name="coach" value="${g.coach}">
 <label class="field"><span>Tanggal pembayaran</span><input id="f-paydate" name="date" type="date" required value="${iso(TODAY)}" max="${iso(TODAY)}"></label>
 <label class="field"><span>Metode pembayaran</span><select name="method"><option>Transfer bank</option><option>Tunai</option><option>E-wallet</option></select></label>
 <label class="field full"><span>Catatan (opsional)</span><input id="f-paynote" name="note" placeholder="Contoh: transfer BCA, bukti dikirim via WhatsApp"></label>
 <label class="chk full"><input type="checkbox" name="ok" required><span><b>Saya sudah memeriksa rincian komisi</b><small>Setelah dikonfirmasi, status klien ini berubah menjadi Dibayar dan tercatat di log. Klien lain dari coach yang sama tidak ikut berubah.</small></span></label>
 <div class="row full"><button class="btn primary" type="submit">Konfirmasi pembayaran</button><button class="btn" type="button" data-act="close">Batal</button></div></form>`)};
FORMS.bayar=async f=>{
 const cl=f.get('cl'),x=getCommissionData(komRange()).byClient.find(y=>y.c===cl);
 if(!x||perm('komisi')!=='full')return;
 const per=komLbl(),segCoach=f.get('coach')||x.coach,g=(x.perCoach||[]).find(y=>y.coach===segCoach)||{coach:x.coach,kom:x.kom};
 const pay=paySegOf(cl,g.coach,per),kurang=Math.max(0,g.kom-(pay?pay.amt:0));
 if(kurang<=0){toast('Komisi segmen ini sudah lunas');appState.modal=null;render();return}
 const payData={date:f.get('date'),method:f.get('method'),note:(f.get('note')||'').trim(),amt:kurang,per,coach:g.coach};
 if(isApiMode()){
   try{
     const res=await apiPayCommission(g.coach,per,kurang,f.get('date'),f.get('method'),payData.note,cl);
     payData.id=res.id;
   }catch(e){toast('Gagal menyimpan: '+(e.message||e));return}
 }
 store.paidByClient=store.paidByClient||{};store.paidSeg=store.paidSeg||{};
 const key=cl+'|'+per,ex=store.paidByClient[key];
 if(ex){ex.amt+=kurang;ex.date=payData.date;ex.method=payData.method;ex.ids=ex.ids||[ex.id].filter(Boolean);if(payData.id)ex.ids.push(payData.id);ex.id=payData.id||ex.id}
 else store.paidByClient[key]={...payData,ids:payData.id?[payData.id]:[]};
 const skey=cl+'|'+g.coach+'|'+per,sx=store.paidSeg[skey];
 if(sx){sx.amt+=kurang;sx.date=payData.date;sx.method=payData.method;sx.ids=sx.ids||[sx.id].filter(Boolean);if(payData.id)sx.ids.push(payData.id);sx.id=payData.id||sx.id}
 else store.paidSeg[skey]={...payData,ids:payData.id?[payData.id]:[]};
 logAct('membayar komisi '+getMemberName(g.coach)+' untuk klien '+x.cl.name+' ('+money(kurang,'komisi')+', '+f.get('method')+')');appState.modal=null;toast('Pembayaran komisi untuk '+first(x.cl.name)+' dicatat');render()};
Object.assign(ACT,{
 komprev:()=>{const r=komRange(),d=new Date(r.a.getFullYear(),r.a.getMonth()-1,1);appState.komY=d.getFullYear();appState.komM=d.getMonth();render()},
 komnext:()=>{const r=komRange(),d=new Date(r.a.getFullYear(),r.a.getMonth()+1,1);appState.komY=d.getFullYear();appState.komM=d.getMonth();render()},
 kombalik:()=>{appState.komY=null;appState.komM=null;render()},
 komjump:()=>{appState.modal={k:'komjump'};render()},
 komapply:()=>{const el=document.getElementById('f-komjump'),v=el?el.value:'';if(!v)return;const p=v.split('-').map(Number);if(p[0]===TODAY.getFullYear()&&p[1]-1===TODAY.getMonth()){appState.komY=null;appState.komM=null}else{appState.komY=p[0];appState.komM=p[1]-1}appState.modal=null;render()},
 askprog:t=>{const p=findProgramById(t.dataset.v);appState.modal={k:'confirm',text:'Hapus program '+p.name+'? Riwayat transaksi lama tetap tersimpan.',yes:'delprog',arg:p.id,label:'Hapus program'};render()},
 per:t=>{const v=t.dataset.v;appState.per=/^\d+$/.test(v)?+v:v;render()},
 paidcl:async t=>{
   const [cl,segCoach]=String(t.dataset.v||'').split('|'),per=komLbl(),rec=paySegOf(cl,segCoach,per);
   if(!rec){appState.modal={k:'bayar',id:cl+'|'+segCoach};render();return}
   if(isApiMode()){
     const ids=(rec.ids&&rec.ids.length?rec.ids:[rec.id]).filter(Boolean);
     try{for(const id of ids)await apiCancelCommission(id)}catch(e){toast('Gagal membatalkan: '+(e.message||e));return}
   }
   delete store.paidSeg[cl+'|'+segCoach+'|'+per];
   // Susun ulang total per klien dari segmen yang tersisa
   const sisa=Object.keys(store.paidSeg||{}).filter(k2=>k2.startsWith(cl+'|')&&k2.endsWith('|'+per)).map(k2=>store.paidSeg[k2]);
   if(!sisa.length)delete store.paidByClient[cl+'|'+per];
   else{const tot2=sum(sisa.map(s2=>s2.amt)),last=sisa.slice().sort((a,b)=>(a.date<b.date?-1:1)).pop();
     store.paidByClient[cl+'|'+per]={amt:tot2,date:last.date,method:last.method,note:'',per,coach:last.coach||segCoach,ids:sisa.flatMap(s2=>s2.ids||[]),id:last.id}}
   const x=getCommissionData(komRange()).byClient.find(y=>y.c===cl);
   logAct('membatalkan pembayaran komisi '+getMemberName(segCoach)+' untuk klien '+(x?x.cl.name:cl));toast('Pembayaran dibatalkan');render()},
 copykom:()=>{const k=getCommissionData(komRange());copyToClipboard(`Laporan komisi ${komLbl()}\n`+k.byCoach.map(x=>`${getMemberName(x.c)}: ${x.nSes} sesi hadir, komisi ${money(x.kom,'komisi')}`).join('\n'),'Laporan komisi tersalin')}
});

export { progPrice };
