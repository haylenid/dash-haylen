/* js/pages/klien.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { canAccess, logAct, meId, scope } from '../core/access.js';
import { apiDel, apiPortalSaveLink, apiPost, apiSaveClient, apiSaveShareLink, apiSaveTransaction, apiSendPortalMessage, isApiMode } from '../core/api.js';
import { COACHES, CONDC, ROLE_USER_IDS } from '../core/constants.js';
import { scheduledSessions } from '../core/derived.js';
import { TODAY, addD, esc, first, fmtD, formatRupiah, hhmm, iso, parseDate, slug } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { ACT, CONF, FORMS, MODALS, PAGES } from '../core/registry.js';
import { appState, findClientById, findProgramById, getClientEndDate, getClientStatus, getMemberName, isSemi, nextClientUid, partnerOf, store, uniqClientId } from '../core/store.js';
import { cdashBody } from '../portal/cdash.js';
import { clientUrl, isValidShareUrl } from '../portal/links.js';
import { activePrograms, banner, pill, sheet, statusPill, tabsBar } from '../ui/components.js';
import { awaitLogo, logoImg } from '../ui/pdf.js';
import { copyToClipboard, render, toast } from '../ui/shell.js';

const kact=(c,arch)=>appState.role==='coach'?'':`<div class="acts"><button class="btn sm" data-act="clink" data-v="${c.id}">${icon('link',14)} Link</button>${arch?`<button class="btn sm" data-act="restore" data-v="${c.id}">Pulihkan</button><button class="btn sm danger" data-act="askdel" data-v="${c.id}">Hapus</button>`:`<button class="btn sm" data-act="modal" data-v="cdash" data-id="${c.id}">${icon('klien',14)} Dashboard</button><button class="btn sm" data-act="modal" data-v="client" data-id="${c.id}">${icon('edit',14)} Edit</button><button class="btn sm" data-act="archive" data-v="${c.id}">Arsipkan</button><button class="btn sm danger" data-act="askdel" data-v="${c.id}">${icon('trash',14)} Hapus</button>`}</div>`;
PAGES.klien=()=>{
 const arch=appState.tab===1,q=appState.q.toLowerCase();
 const canByCoach=appState.role==='owner'||appState.role==='admin';
 if(!canByCoach||(appState.clcoach!=='all'&&!COACHES.includes(appState.clcoach)))appState.clcoach='all';
 const all=scope(store.clients),list=all.map((c,i)=>({c,i})).filter(x=>!!x.c.arch===arch&&x.c.name.toLowerCase().includes(q)&&(appState.clcoach==='all'||x.c.coach===appState.clcoach)&&(arch||appState.cf==='all'||getClientStatus(x.c)===appState.cf)).sort((a,b)=>((b.c.reg||0)-(a.c.reg||0))||(a.c.start<b.c.start?1:a.c.start>b.c.start?-1:0)||(b.i-a.i)).map(x=>x.c);
 const canEdit=appState.role!=='coach';
 const rows=list.map(c=>{
  const p=findProgramById(c.pid),left=c.arch?7-Math.round((TODAY-parseDate(c.arch))/864e5):0;
  return `<tr><td><b>${esc(c.name)}</b><small class="mono">${esc(c.uid)} <button class="btn sm ghost" data-act="copyuid" data-v="${c.uid}" aria-label="Salin ID ${esc(c.name)}">${icon('copy',13)}</button></small><small><i class="cdot" style="background:var(${CONDC[c.cond]})"></i> ${c.cond}</small>${c.note?`<small title="${esc(c.note)}" style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Catatan: ${esc(c.note)}</small>`:''}${partnerOf(c)?`<small>Semi privat · dengan ${esc(partnerOf(c).name)}</small>`:''}</td><td>${esc(p.name)}</td><td class="mono">${fmtD(c.start)} - ${fmtD(getClientEndDate(c))}</td><td>${esc(first(getMemberName(c.coach)))}</td><td>${arch?pill('Hapus dalam '+Math.max(0,left)+' hari','warn'):statusPill(getClientStatus(c))}</td>
  ${canEdit?`<td>${kact(c,arch)}</td>`:''}</tr>`}).join('');
 const mlist=list.map(c=>{const p=findProgramById(c.pid),left=c.arch?7-Math.round((TODAY-parseDate(c.arch))/864e5):0;return `<div class="li" style="align-items:flex-start"><div style="flex:1"><b>${esc(c.name)}</b><small class="mono">${esc(c.uid)} <button class="btn sm ghost" data-act="copyuid" data-v="${c.uid}" aria-label="Salin ID ${esc(c.name)}">${icon('copy',13)}</button></small><small>${esc(p.name)}</small><small class="mono">${fmtD(c.start)} - ${fmtD(getClientEndDate(c))} · ${esc(first(getMemberName(c.coach)))}</small>${partnerOf(c)?`<small>Semi privat · dengan ${esc(partnerOf(c).name)}</small>`:''}${c.note?`<small>Catatan: ${esc(c.note)}</small>`:''}</div>${arch?pill('Hapus dalam '+Math.max(0,left)+' hari','warn'):statusPill(getClientStatus(c))}${canEdit?`<div style="width:100%">${kact(c,arch)}</div>`:''}</div>`}).join('');
 return `<div class="stackv">${tabsBar(['Daftar klien','Arsip'])}
 ${arch?banner('Klien yang diarsipkan dihapus permanen setelah 7 hari. Pulihkan sebelum batas waktu.'):''}
 <div class="toolbar"><input id="q" data-q type="search" placeholder="Cari nama klien" value="${esc(appState.q)}" aria-label="Cari klien">${canByCoach?`<select data-f="clcoach" aria-label="Filter coach"><option value="all">Semua coach (${store.clients.filter(c=>!!c.arch===arch).length})</option>${COACHES.map(id=>`<option value="${id}" ${appState.clcoach===id?'selected':''}>${esc(getMemberName(id))} (${store.clients.filter(c=>c.coach===id&&!!c.arch===arch).length})</option>`).join('')}</select>`:''}${arch?'':`<select data-f="cf" aria-label="Filter status"><option value="all">Semua status</option>${['Aktif','Segera berakhir','Jeda','Selesai'].map(s=>`<option ${appState.cf===s?'selected':''}>${s}</option>`).join('')}</select>`}<span class="sp"></span>${canEdit&&!arch?`<button class="btn primary" data-act="modal" data-v="client">${icon('plus',15)} Tambah klien</button>`:''}</div>
 <div class="tw dt"><table><thead><tr><th>Nama</th><th>Paket</th><th>Mulai - selesai</th><th>Coach</th><th>Status</th>${canEdit?'<th>Aksi</th>':''}</tr></thead><tbody>${rows||`<tr><td colspan="${canEdit?6:5}" class="sub">Tidak ada klien yang cocok.</td></tr>`}</tbody></table></div><div class="mlist">${mlist||'<p class="sub">Tidak ada klien yang cocok.</p>'}</div></div>`};
MODALS.client=m=>{
 const ap=activePrograms();
 if(!ap.length)return sheet(m.id?'Ubah klien':'Tambah klien',`<p class="sub">Belum ada program aktif. Buat program dulu di menu Program — klien harus terdaftar pada sebuah program.</p><div class="row" style="margin-top:12px"><button class="btn primary" data-act="nav" data-v="program">Buka menu Program</button><button class="btn" data-act="close">Kembali</button></div>`);
 const found=m.id?findClientById(m.id):null;
 if(m.id&&!found)return sheet('Ubah klien',`<p class="sub">Klien ini sudah tidak ada (mungkin baru dihapus). Tutup dan muat ulang daftar klien.</p><div class="row" style="margin-top:12px"><button class="btn" data-act="close">Kembali</button></div>`);
 const c=found||{name:'',pid:ap[0].id,start:iso(TODAY),pbNow:'',pbTarget:''};
 const programOrDefault=findProgramById(c.pid)||ap[0],endV=c.end||iso(addD(parseDate(c.start),programOrDefault.wk*7)),coachV=COACHES.includes(c.coach)?c.coach:(appState.role==='coach'?meId():COACHES[0]);
 const pasangan=m.id?partnerOf(c):null,paketSemi=isSemi(programOrDefault),dataPasangan=pasangan||{name:'',pbNow:'',pbTarget:'',note:''};
 const tautanDash=k=>k&&k.uid?`<small class="mono" style="word-break:break-all">${esc(k.uid)} · ${esc(clientUrl(k))} <button type="button" class="btn sm ghost" data-act="clink" data-v="${k.id}" aria-label="Salin link dashboard ${esc(k.name)}">${icon('copy',13)}</button> <button type="button" class="btn sm ghost" data-act="clinkregen" data-v="${k.id}">Generate ulang</button></small>`:'<small>Link dashboard dibuat otomatis setelah disimpan.</small>';
 return sheet(m.id?'Ubah klien':'Tambah klien',`<form data-form="client" class="fg"><input type="hidden" name="id" value="${m.id||''}">
 <label class="field full"><span>Nama coach</span><select name="coach" ${appState.role==='coach'?'disabled':''} required>${COACHES.map(id=>`<option value="${id}" ${id===coachV?'selected':''}>${esc(getMemberName(id))}</option>`).join('')}</select></label>
 <label class="field full"><span>Pilih program</span><select name="pid" data-cform>${activePrograms().map(p=>`<option value="${p.id}" ${p.id===c.pid?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
 <div class="idcard full"><small>Harga program</small><b id="pricebox" class="mono" style="font-size:20px">${formatRupiah(programOrDefault.price)}</b><small id="priceunit">${esc(programOrDefault.unit||'')}</small><small id="semihint" data-semi ${paketSemi?'':'hidden'}>Paket 2 peserta: pembayaran <b>satu kali</b> sebesar <b class="mono" id="semitotal">${formatRupiah(programOrDefault.price)}</b> untuk kedua peserta. Masing-masing peserta punya ID dan link dashboard sendiri.</small></div>
 <label class="field"><span>Tanggal mulai</span><input name="start" type="date" required value="${c.start}" data-cform></label>
 <label class="field"><span>Tanggal selesai</span><input name="end" type="date" required value="${endV}" data-cform ${c.end?'data-touched="1"':''}></label>
 ${c.end_orig?`<div class="full"><small class="sub">Diundur dari ${fmtD(parseDate(c.end_orig))} (+${scheduledSessions(c,addD(parseDate(c.end_orig),1),parseDate(c.end||c.end_orig))} sesi) — tanggal selesai digeser akibat izin/cuti coach.</small></div>`:''}
 <div class="peserta full fg" id="peserta1">
  <div class="full"><h4 id="p1title">${paketSemi?'Peserta 1':'Data klien'}</h4>${m.id?tautanDash(c):''}</div>
  <label class="field full"><span>Nama klien</span><input id="f-cname" name="name" required value="${esc(c.name)}"></label>
  <label class="field full"><span>Catatan / keterangan (opsional)</span><textarea id="f-cnote" name="note" rows="3" maxlength="300" placeholder="Contoh: riwayat cedera, jam latihan favorit, atau info penting lain">${esc(c.note||'')}</textarea></label>
 </div>
 <div class="peserta full fg" id="peserta2" data-semi ${paketSemi?'':'hidden'}>
  <div class="full"><h4>Peserta 2</h4>${tautanDash(pasangan)}</div>
  <label class="field full"><span>Nama klien ke-2</span><input id="f-cname2" name="name2" ${paketSemi?'required':''} value="${esc(dataPasangan.name)}"></label>
  <label class="field full"><span>Catatan / keterangan (opsional)</span><textarea id="f-cnote2" name="note2" rows="3" maxlength="300" placeholder="Catatan khusus untuk peserta ke-2">${esc(dataPasangan.note||'')}</textarea></label>
 </div>
 <div class="row full"><button class="btn primary" type="submit">Simpan</button><button class="btn" type="button" data-act="dlinvoice">${icon('download',15)} Cetak invoice (JPG)</button><button class="btn" type="button" data-act="close">Batal</button></div></form>`)};
function clientFormSync(t){
 const f=t.closest('form');if(!f)return;const p=findProgramById(f.elements.pid.value);if(!p)return;
 const pb=f.querySelector('#pricebox'),pu=f.querySelector('#priceunit');if(pb)pb.textContent=formatRupiah(p.price);if(pu)pu.textContent=p.unit||'';
 const paketSemi=isSemi(p);f.querySelectorAll('[data-semi]').forEach(e=>{e.hidden=!paketSemi});
 const inputNama2=f.elements.name2;if(inputNama2)inputNama2.required=paketSemi;const tt=f.querySelector('#semitotal');if(tt)tt.textContent=formatRupiah(p.price);const t1=f.querySelector('#p1title');if(t1)t1.textContent=paketSemi?'Peserta 1':'Data klien';
 if(t.name==='end'){t.dataset.touched='1';return}
 if(t.name==='pid'||t.name==='start'){const st=f.elements.start.value,en=f.elements.end;if(st&&!en.dataset.touched)en.value=iso(addD(parseDate(st),p.wk*7))}
}
FORMS.client=async f=>{
 const id=f.get('id'),start=f.get('start'),end=f.get('end');
 if(end<start){toast('Tanggal selesai tidak boleh sebelum tanggal mulai');return}
 const coachTerpilih=appState.role==='coach'?meId():f.get('coach');
 if(!COACHES.includes(coachTerpilih)){toast('Pilih nama coach');return}
 const pg=findProgramById(f.get('pid')),paketSemi=isSemi(pg),trimVal=k=>(f.get(k)||'').trim();
 const dataPeserta1={name:trimVal('name'),note:trimVal('note')};
 const dataPeserta2=paketSemi?{name:trimVal('name2'),note:trimVal('note2')}:null;
 if(!dataPeserta1.name){toast('Nama klien wajib diisi');return}
 if(paketSemi&&!dataPeserta2.name){toast('Isi nama klien ke-2 untuk paket 2 peserta');return}
 const api=isApiMode();
 /* buat klien: via API bila mode API (field tambahan grp/note/end diset lokal, pola sama seperti end/pbNow di fase C) */
 const buatKlienBaru=async nama=>{
  if(api)return await apiSaveClient({name:nama,program_id:f.get('pid'),start,end,coach_id:coachTerpilih});
  const k={id:uniqClientId(),uid:nextClientUid(),hrmax:188,mp:360,renew:false,arch:null,reg:Date.now(),cond:'Prima',coach:coachTerpilih,note:''};
  store.clients.push(k);return k;
 };
 const c0=id?findClientById(id):await buatKlienBaru(dataPeserta1.name),isNew1=!id;
 let c=c0,dataPasangan=null,isNew2=false,lepas='';
 if(paketSemi){dataPasangan=partnerOf(c);if(!dataPasangan){dataPasangan=await buatKlienBaru(dataPeserta2.name);isNew2=true}c.grp=c.grp||'g'+Date.now();dataPasangan.grp=c.grp}
 else if(c.grp){const o=partnerOf(c);delete c.grp;if(o){delete o.grp;lepas=' Pasangan semi privat dilepas dan tetap tercatat sebagai klien sendiri.'}}
 let moved='',inc='';
 const simpanSatu=async(k,o,isNew,primary)=>{
  const coachLama=!isNew&&k.coach!==coachTerpilih;
  const grp=k.grp; /* apiSaveClient me-replace objek di store -> amankan field lokal dulu */
  let cur=k;
  if(api&&k.id)cur=await apiSaveClient({id:k.id,name:o.name,program_id:f.get('pid'),start,end,coach_id:coachTerpilih});
  Object.assign(cur,{name:o.name,pid:f.get('pid'),start,end,note:o.note,coach:coachTerpilih});
  if(grp)cur.grp=grp;else delete cur.grp;
  /* ganti coach: sesi lama di jadwal coach sebelumnya dilepas agar tidak dobel/yatim (sama seperti menu Jadwal coach) */
  if(coachLama){const n=store.book.filter(b=>b.client===cur.id).length;store.book=store.book.filter(b=>b.client!==cur.id);moved=' Coach diganti ke '+first(getMemberName(coachTerpilih))+(n?', sesi lama dilepas. Atur ulang jadwal di menu Coach.':'.')}
  /* pemasukan otomatis: klien baru = transaksi masuk sebesar harga program (tercatat hari ini) */
  /* paket 2 peserta: satu pembayaran saja, dicatat di peserta 1 dengan nama gabungan */
  if(pg&&primary){
   const namaGabungan=paketSemi&&dataPeserta2?dataPeserta1.name+' & '+dataPeserta2.name:cur.name;
   if(api){
    if(isNew){await apiSaveTransaction({date:iso(TODAY),type:'in',program_id:pg.id,category:pg.name,coach_id:cur.coach,desc:namaGabungan,amount:pg.price});inc=' Pemasukan program tercatat di Keuangan (satu pembayaran).'}
   }else{
    const x=store.tx.find(t=>t.cid===cur.id);
    if(!x&&isNew){store.tx.push({id:'t'+Date.now()+Math.floor(Math.random()*999),date:iso(TODAY),type:'in',pid:pg.id,cat:pg.name,coach:cur.coach,desc:namaGabungan,amt:pg.price,cid:cur.id});inc=' Pemasukan program tercatat di Keuangan (satu pembayaran).'}
    else if(x){x.desc=namaGabungan;x.coach=cur.coach;if(x.pid!==pg.id){x.pid=pg.id;x.cat=pg.name;x.amt=pg.price;inc=' Pemasukan di Keuangan ikut diperbarui.'}}
   }
  }
  return cur;
 };
 c=await simpanSatu(c,dataPeserta1,isNew1,true);
 if(paketSemi)dataPasangan=await simpanSatu(dataPasangan,dataPeserta2,isNew2,false);
 logAct((id?'memperbarui klien ':'menambah klien ')+c.name+(paketSemi?' dan '+dataPasangan.name+' (paket 2 peserta)':''));
 appState.modal=null;toast((paketSemi?'Paket 2 peserta disimpan: dua dashboard terpisah, satu pembayaran.':'Klien disimpan dan tersinkron.')+moved+lepas+inc);render()};
function invoiceCanvas(d){
 const W=1080,SC=2,H=1180,tx=60,tw=960,cv=document.createElement('canvas');cv.width=W*SC;cv.height=H*SC;const g=cv.getContext('2d');g.scale(SC,SC);
 const F=(w,z)=>w+' '+z+'px Montserrat, Arial, sans-serif',rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
 const card=(x,y,w,h,r)=>{g.save();g.shadowColor='rgba(11,22,48,.10)';g.shadowBlur=26;g.shadowOffsetY=8;g.fillStyle='#fff';rr(x,y,w,h,r);g.fill();g.restore()};
 const ls=v=>{try{g.letterSpacing=v}catch(e){}};
 const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#F3F6FD');bg.addColorStop(.6,'#F8F9FD');bg.addColorStop(1,'#FFEAF2');g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.textBaseline='alphabetic';g.textAlign='left';
 card(tx,36,tw,118,28);
 const im=logoImg(),lh=64,lw=lh*3.5176;
 if(im&&im.complete&&im.naturalWidth){g.drawImage(im,tx+28,36+(118-lh)/2,lw,lh)}
 else{g.fillStyle='#0B1630';g.font='italic 800 56px Montserrat, Arial, sans-serif';g.fillText('N6',tx+28,112)}
 const hx=tx+28+lw+26;g.fillStyle='#E3E8F2';g.fillRect(hx-14,62,2,66);
 
 g.fillStyle='#6B778C';g.font=F(600,15);ls('2px');g.fillText('COACHING LARI',hx+4,103);ls('0px');
 g.textAlign='right';g.fillStyle='#F81A73';g.font=F(800,34);ls('3px');g.fillText('INVOICE',tx+tw-28,104);ls('0px');g.textAlign='left';
 let y=214;
 g.fillStyle='#6B778C';g.font=F(700,14);ls('2px');g.fillText('DITAGIHKAN KEPADA',tx,y);g.textAlign='right';g.fillText('NO. INVOICE',tx+tw,y);ls('0px');g.textAlign='left';
 g.fillStyle='#0B1630';g.font=F(800,40);g.fillText(d.name,tx,y+52);
 g.textAlign='right';g.font=F(800,26);g.fillText(d.no,tx+tw,y+46);g.fillStyle='#55637E';g.font=F(600,18);g.fillText('Terbit '+fmtD(TODAY)+' '+TODAY.getFullYear(),tx+tw,y+78);g.textAlign='left';
 g.fillStyle='#55637E';g.font=F(600,18);g.fillText('ID klien '+d.uid,tx,y+84);
 y=372;card(tx,y,tw,330,28);
 g.fillStyle='#0B1630';rr(tx+24,y+24,tw-48,46,12);g.fill();g.fillStyle='#fff';g.font=F(700,14);ls('1px');g.fillText('PROGRAM',tx+44,y+53);g.textAlign='right';g.fillText('HARGA',tx+tw-44,y+53);ls('0px');g.textAlign='left';
 g.fillStyle='#0B1630';g.font=F(800,28);g.fillText(d.prog,tx+44,y+120);
 g.fillStyle='#55637E';g.font=F(600,18);g.fillText(d.unit||'',tx+44,y+150);
 g.fillText('Periode: '+fmtD(d.start)+' '+parseDate(d.start).getFullYear()+' - '+fmtD(d.end)+' '+parseDate(d.end).getFullYear(),tx+44,y+182);
 g.textAlign='right';g.fillStyle='#0B1630';g.font=F(800,28);g.fillText(formatRupiah(d.price),tx+tw-44,y+120);g.textAlign='left';
 g.fillStyle='#E3E8F2';g.fillRect(tx+44,y+212,tw-88,2);
 if(d.pbNow||d.pbTarget){g.fillStyle='#55637E';g.font=F(600,18);g.fillText('Personal Best (PB)',tx+44,y+252);g.fillStyle='#0B1630';g.font=F(700,20);
 g.fillText((d.pbNow||'-')+'  →  '+(d.pbTarget||'-'),tx+44,y+286);}
 y=738;const kg=g.createLinearGradient(tx,0,tx+tw,0);kg.addColorStop(0,'#F81A73');kg.addColorStop(1,'#29BEFF');
 g.save();g.shadowColor='rgba(248,26,115,.35)';g.shadowBlur=24;g.shadowOffsetY=10;g.fillStyle=kg;rr(tx,y,tw,130,28);g.fill();g.restore();
 g.fillStyle='#fff';g.font=F(700,20);ls('2px');g.fillText('TOTAL TAGIHAN',tx+40,y+54);ls('0px');g.font=F(800,50);g.textAlign='right';g.fillText(formatRupiah(d.price),tx+tw-40,y+88);g.textAlign='left';
 y=906;card(tx,y,tw,150,28);
 g.fillStyle='#0B1630';g.font=F(800,22);g.fillText('Informasi pembayaran',tx+36,y+52);
 g.fillStyle='#55637E';g.font=F(500,18);g.fillText('Mohon konfirmasi pembayaran ke admin Haylen.',tx+36,y+90);g.fillText('Terima kasih sudah berlatih bersama kami.',tx+36,y+120);
 g.textAlign='center';g.fillStyle='#8592A8';g.font=F(500,14);g.fillText('Invoice ini dibuat otomatis pada '+fmtD(TODAY)+' '+hhmm(new Date()),W/2,H-40);
 return cv}
ACT.dlinvoice=async()=>{
 const f=document.querySelector('.sheet form[data-form="client"]');if(!f)return;
 if(!f.reportValidity())return;
 try{
  const fd=new FormData(f),p=findProgramById(fd.get('pid')),id=fd.get('id'),k=id?findClientById(id):null,uid=k?k.uid:nextClientUid();
  const paketSemi=isSemi(p)&&(fd.get('name2')||'').trim(),d={name:fd.get('name').trim()+(paketSemi?' & '+fd.get('name2').trim():''),uid,no:'INV-'+iso(TODAY).replace(/-/g,'')+'-'+uid.replace('HY-',''),prog:p.name,unit:(p.unit||'')+(paketSemi?' · 2 peserta':''),price:p.price,start:fd.get('start'),end:fd.get('end')};
  try{await Promise.all(['500','600','700','800'].map(w=>document.fonts.load(w+' 20px Montserrat')))}catch(e){}await awaitLogo();
  const cv=invoiceCanvas(d),a=document.createElement('a');a.href=cv.toDataURL('image/jpeg',.92);a.download='invoice-'+slug(d.name)+'-'+iso(TODAY)+'.jpg';document.body.appendChild(a);a.click();a.remove();
  logAct('mencetak invoice '+d.name);toast('Invoice diunduh sebagai JPG');
 }catch(e){console.error(e);toast('Gagal membuat invoice')}
};
Object.assign(ACT,{
 clink:t=>{const c=findClientById(t.dataset.v);copyToClipboard(clientUrl(c),'Link dashboard klien tersalin')},
 clinkregen:t=>{const c=findClientById(t.dataset.v);if(!c)return;appState.modal={k:'confirm',text:'Generate ulang link portal '+c.name+'? Link lama langsung berhenti berfungsi — klien harus diberi link baru.',yes:'clinkregenya',arg:c.id,label:'Generate ulang'};render()},
 archive:t=>{const c=findClientById(t.dataset.v);c.arch=iso(TODAY);logAct('mengarsipkan klien '+c.name);toast(c.name+' dipindah ke arsip');render()},
 restore:t=>{const c=findClientById(t.dataset.v);c.arch=null;logAct('memulihkan klien '+c.name);toast('Klien dipulihkan');render()},
 askdel:t=>{appState.modal={k:'confirm',text:'Hapus permanen '+findClientById(t.dataset.v).name+'? Data klien tidak dapat dikembalikan.',yes:'delcl',arg:t.dataset.v,label:'Hapus permanen'};render()}
});
CONF.delcl=async id=>{const c=findClientById(id);if(isApiMode()){try{await apiDel('/clients/'+id)}catch(e){toast('Gagal hapus: '+e.message);return}}store.clients=store.clients.filter(x=>x.id!==id);store.book=store.book.filter(b=>b.client!==id);store.reports=store.reports.filter(r=>r.cid!==id);logAct('menghapus klien '+(c?c.name:id))};
CONF.clinkregenya=async id=>{const c=findClientById(id);appState.modal=null;try{const r=await apiPost('/clients/'+id+'/portal-token');if(c&&r)c.portal_token=r.portal_token;toast('Link portal baru dibuat untuk '+(c?c.name:id))}catch(e){toast('Gagal generate ulang: '+e.message)}render()};
MODALS.cdash=m=>{const c=findClientById(m.id);return c?sheet('Dashboard klien',cdashBody(c)):''};
FORMS.cdash=async f=>{
 const c=findClientById(f.get('cid')),u=(f.get('url')||'').trim(),dt=f.get('date')||'';
 if(!c)return;
 if(!isValidShareUrl(u)){toast('Link harus diawali http:// atau https://');return}
 if(!/^\d{4}-\d\d-\d\d$/.test(dt)||parseDate(dt)>TODAY||dt<c.start){toast('Pilih tanggal latihan dari tanggal mulai program sampai hari ini');return}
 store.swLinks=store.swLinks||[];const i=store.swLinks.findIndex(x=>x.cid===c.id&&x.date===dt),rec={cid:c.id,date:dt,url:u,at:new Date()};
 if(i>=0)store.swLinks[i]=rec;else store.swLinks.push(rec);
 if(isApiMode()){try{if(appState.pubPortal)await apiPortalSaveLink(appState.pubPortal,dt,u);else await apiSaveShareLink(c.id,dt,u)}catch(e){console.error('Gagal simpan share link:',e)}}
 if(f.get('reg'))c.sw=u;
 const has=store.reports.some(r=>r.cid===c.id&&r.date===dt&&!r.missed);
 logAct('menerima link hasil latihan '+c.name+' ('+fmtD(dt)+')');
 toast(has?'Link tanggal '+fmtD(dt)+' terkirim ke coach':'Link tersimpan. Belum ada laporan latihan tanggal '+fmtD(dt)+', link tampil di Koreksi saat laporan masuk');
 appState.modal=appState.cview?null:{k:'cdash',id:c.id};render()};
FORMS.cdmsg=async f=>{
 const c=findClientById(f.get('cid')),t=(f.get('text')||'').trim();if(!c||!t)return;
 if(isApiMode())await apiSendPortalMessage(c.portal_token||c.uid,c.id,t);
 else (store.msgs.dm[c.id]=store.msgs.dm[c.id]||[]).push({w:c.id,text:t,t:new Date()});
 logAct('menerima pesan dari klien '+c.name);toast('Pesan terkirim ke tim');appState.focus={id:'f-cdmsg',pos:0};appState.modal=appState.cview?null:{k:'cdash',id:c.id};render()};
ACT.cdtab=t=>{appState.cdTab=+t.dataset.v;render()};
ACT.cdday=t=>{const i=document.getElementById('f-cddate');if(i){const c=findClientById(appState.cview)||null,v=iso(addD(TODAY,-(+t.dataset.v)));i.value=c&&v<c.start?c.start:v}};
ACT.cdpaste=async()=>{const i=document.getElementById('f-cdurl');try{const v=(await navigator.clipboard.readText()||'').trim();if(i&&v){i.value=v;toast('Link ditempel')}else toast('Clipboard kosong')}catch(e){toast('Tempel manual: tekan lama di kolom link')}};
ACT.openchat=t=>{if(!canAccess('pesan'))return;appState.chat=t.dataset.v;appState.page='pesan';appState.tab=1;appState.modal=null;appState.nav=false;render(false)};
MODALS.confirm=m=>sheet('Konfirmasi',`<p>${esc(m.text)}</p><div class="row"><button class="btn primary" data-act="yes">${esc(m.label||'Ya, lanjutkan')}</button><button class="btn" data-act="close">Batal</button></div>`);
MODALS.forcedel=m=>{
 const akibat=m.kind==='member'
  ?'Hapus paksa akan: menghapus pola jadwal & profil coach; menghapus booking & absensi coach ini; menghapus catatan pembayaran komisinya; melepaskan klien-kliennya menjadi tanpa coach (klien TIDAK ikut terhapus); transaksi & koreksi tetap disimpan, hanya dilepas dari anggota ini.'
  :'Hapus paksa akan: melepaskan transaksi dari program ini (transaksi tetap disimpan); klien yang memakai program ini menjadi tanpa program (klien TIDAK ikut terhapus).';
 return sheet('Masih ada data terkait',`<p>${esc(m.detail||'')}</p><p class="sub">${akibat}</p><p><b>Hapus paksa ${esc(m.name||'')}?</b> Tindakan ini tidak bisa dibatalkan.</p><div class="row"><button class="btn danger" data-act="forcedel">Hapus paksa</button><button class="btn" data-act="close">Batal</button></div>`)};

export { clientFormSync, invoiceCanvas, kact };
