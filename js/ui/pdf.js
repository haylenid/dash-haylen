/* js/ui/pdf.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { meUser } from '../core/access.js';
import { TODAY, first, fmtD, sum } from '../core/helpers.js';
import { render } from './shell.js';

let cachedLogoImg=null;
function logoImg(){
 if(cachedLogoImg)return cachedLogoImg;
 try{const v=getComputedStyle(document.documentElement).getPropertyValue('--logo-img'),m=v.match(/url\(["']?([^"')]+)["']?\)/);if(m){const im=new Image();im.onload=()=>{try{render(false)}catch(e){}};im.src=m[1];cachedLogoImg=im}}catch(e){}
 return cachedLogoImg}
async function awaitLogo(){const im=logoImg();if(im&&!im.complete)await new Promise(r=>{im.onload=r;im.onerror=r;setTimeout(r,1500)})}
async function exportReport(report,fmt,name){
 try{await Promise.all(['500','600','700','800'].map(w=>document.fonts.load(w+' 20px Montserrat')))}catch(e){}await awaitLogo();
 const pages=reportPages(report);let blob;
 if(fmt==='pdf')blob=pagesToPdf(pages);
 else{const np=Math.min(pages.length,18),cv=document.createElement('canvas');cv.width=pages[0].width;cv.height=pages[0].height*np;const g=cv.getContext('2d');pages.slice(0,np).forEach((p,i)=>g.drawImage(p,0,i*p.height));blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.92))}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'.'+(fmt==='pdf'?'pdf':'jpg');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function reportPages(r){
 const W=1240,H=1754,M=72,TW=W-2*M,F=(w,z)=>w+' '+z+'px Montserrat, Arial, sans-serif',pages=[];let g,y;
 const fit=(t,w)=>{t=String(t);if(g.measureText(t).width<=w)return t;while(t.length>1&&g.measureText(t+'...').width>w)t=t.slice(0,-1);return t+'...'};
 const rr=(x,yy,w,h,rad)=>{g.beginPath();g.moveTo(x+rad,yy);g.arcTo(x+w,yy,x+w,yy+h,rad);g.arcTo(x+w,yy+h,x,yy+h,rad);g.arcTo(x,yy+h,x,yy,rad);g.arcTo(x,yy,x+w,yy,rad);g.closePath()};
 const logoAt=(x,yy,h)=>{const im=logoImg();if(im&&im.complete&&im.naturalWidth){const w=h*im.naturalWidth/im.naturalHeight;g.drawImage(im,x,yy,w,h);return w}g.fillStyle='#0B1630';g.font='italic 800 '+h+'px Montserrat, Arial, sans-serif';g.fillText('N6',x,yy+h*.85);return h*1.6};
 const newPage=first=>{const cv=document.createElement('canvas');cv.width=W;cv.height=H;g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.textBaseline='alphabetic';g.textAlign='left';pages.push(cv);
  g.fillStyle='#F81A73';g.fillRect(0,0,W,10);
  if(first){const lw=logoAt(M,44,66);g.fillStyle='#E3E8F2';g.fillRect(M+lw+22,52,2,52);g.fillStyle='#6B778C';g.font=F(700,15);g.fillText(r.tag||'LAPORAN RESMI',M+lw+42,86);
   if(!r.raw){g.textAlign='right';g.fillStyle='#6B778C';g.font=F(500,15);g.fillText('Dibuat '+fmtD(TODAY)+' oleh '+meUser().name,W-M,80);g.textAlign='left'}
   g.fillStyle='#F81A73';g.font=F(700,14);g.fillText(r.kicker||'LAPORAN',M,168);g.fillStyle='#0B1630';g.font=F(800,42);g.fillText(r.title,M,216);g.fillStyle='#55637E';g.font=F(600,20);g.fillText((r.raw?'':'Periode ')+r.per,M,252);y=282}
  else{logoAt(M,34,36);g.fillStyle='#55637E';g.font=F(700,15);g.textAlign='right';g.fillText(r.title+' · '+r.per,W-M,62);g.textAlign='left';y=118}};
 newPage(true);
 const n=r.sum.length,per=Math.min(4,n),cw=(TW-(per-1)*16)/per;
 r.sum.forEach(([k,v],i)=>{const cx=M+(i%per)*(cw+16),cy=y+Math.floor(i/per)*112;g.fillStyle='#F3F6FD';rr(cx,cy,cw,96,16);g.fill();g.fillStyle='#6B778C';g.font=F(600,14);g.fillText(fit(k,cw-32),cx+16,cy+30);g.fillStyle='#0B1630';let z=28;g.font=F(800,z);while(g.measureText(String(v)).width>cw-32&&z>14){z-=2;g.font=F(800,z)}g.fillText(String(v),cx+16,cy+72)});
 y+=Math.ceil(n/per)*112+20;
 const secs=r.sections||[{head:r.head,rows:r.rows}];
 secs.forEach(sec=>{
  if(sec.title){if(y+130>H-110)newPage(false);g.fillStyle='#0B1630';g.font=F(800,22);g.fillText(sec.title,M,y+24);if(sec.note){g.fillStyle='#6B778C';g.font=F(600,15);g.textAlign='right';g.fillText(sec.note,W-M,y+24);g.textAlign='left'}y+=42}
  const cols=sec.head.map((h,i)=>{g.font=F(700,14);let m=g.measureText(h).width;sec.rows.forEach(x=>{g.font=F(500,16);m=Math.max(m,Math.min(g.measureText(String(x[i])).width,h==='Keterangan'?520:320))});return Math.max(70,m+28)});
  const tot=sum(cols),cwid=sec.w?sec.w.map(c=>c*TW/sum(sec.w)):cols.map(c=>c*TW/tot),right=sec.head.map((h,i)=>sec.rows.length&&sec.rows.every(x=>String(x[i])===''||/^(Rp|[\d.,:\-]+( ?%| ?km| ?\/km| ?bpm)?)$/.test(String(x[i]))));
  const AL=i=>sec.align?sec.align[i]:(right[i]?'r':'l'),AX=(i,x)=>AL(i)==='c'?x+cwid[i]/2:AL(i)==='r'?x+cwid[i]-12:x+12,AT=i=>AL(i)==='c'?'center':AL(i)==='r'?'right':'left';
   const head=()=>{g.fillStyle='#0B1630';rr(M,y,TW,44,10);g.fill();let x=M;g.font=F(700,14);g.fillStyle='#fff';sec.head.forEach((h,i)=>{g.textAlign=AT(i);g.fillText(fit(h.toUpperCase(),cwid[i]-20),AX(i,x),y+28);x+=cwid[i]});g.textAlign='left';y+=48};
  if(y+48+46>H-110)newPage(false);
  head();
  if(!sec.rows.length){g.fillStyle='#55637E';g.font=F(500,18);g.fillText('Tidak ada data pada periode ini.',M+12,y+34);y+=46}
  sec.rows.forEach((row,ri)=>{if(y+46>H-110){newPage(false);head()}
   const gi=sec.grp?sec.grp[ri]:ri,gs=sec.grp&&ri>0&&sec.grp[ri-1]!==gi,g0=sec.grp&&(ri===0||gs);if(gi%2===0){g.fillStyle=sec.grp?'#EAEFFA':'#F5F7FC';g.fillRect(M,y,TW,46)}if(gs){g.fillStyle='#F81A73';g.fillRect(M,y-1,TW,3)}
   let x=M;g.font=F(500,16);g.fillStyle='#0B1630';row.forEach((c,i)=>{g.font=F((sec.grp&&i<2&&c)||(sec.boldLast&&ri===sec.rows.length-1)?800:500,16);g.textAlign=AT(i);g.fillText(fit(c,cwid[i]-20),AX(i,x),y+29);x+=cwid[i]});g.textAlign='left';y+=46});
  y+=26});
 g=null;
 pages.forEach((cv,i)=>{const c=cv.getContext('2d');c.fillStyle='#E3E8F2';c.fillRect(M,H-84,TW,2);c.fillStyle='#8592A8';c.font=F(500,13);c.textAlign='left';c.fillText('HAYLEN SWIMMING CLUB · Laporan dibuat '+fmtD(TODAY),M,H-52);c.textAlign='right';c.fillText('Halaman '+(i+1)+' dari '+pages.length,W-M,H-52)});
 return pages}
function pagesToPdf(pages){
 const enc=x=>new TextEncoder().encode(x),parts=[],xr=[];let off=0;
 const push=b=>{parts.push(b);off+=b.length},obj=(n,...bs)=>{xr[n]=off;push(enc(n+' 0 obj\n'));bs.forEach(b=>push(typeof b==='string'?enc(b):b));push(enc('\nendobj\n'))};
 push(enc('%PDF-1.4\n'));
 const N=pages.length,kids=pages.map((_,i)=>(5+3*i)+' 0 R').join(' ');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');obj(2,'<< /Type /Pages /Kids ['+kids+'] /Count '+N+' >>');
 pages.forEach((cv,i)=>{const bin=atob(cv.toDataURL('image/jpeg',.9).split(',')[1]),by=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)by[k]=bin.charCodeAt(k);
  obj(3+3*i,'<< /Type /XObject /Subtype /Image /Width '+cv.width+' /Height '+cv.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+by.length+' >>\nstream\n',by,'\nendstream');
  const ph=Math.round(595.28*cv.height/cv.width*100)/100,ct='q 595.28 0 0 '+ph+' 0 0 cm /Im0 Do Q';obj(4+3*i,'<< /Length '+ct.length+' >>\nstream\n'+ct+'\nendstream');
  obj(5+3*i,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 '+ph+'] /Resources << /XObject << /Im0 '+(3+3*i)+' 0 R >> >> /Contents '+(4+3*i)+' 0 R >>')});
 const tn=3*N+3,xo=off;let x='xref\n0 '+tn+'\n0000000000 65535 f \n';for(let n=1;n<tn;n++)x+=String(xr[n]).padStart(10,'0')+' 00000 n \n';
 push(enc(x+'trailer\n<< /Size '+tn+' /Root 1 0 R >>\nstartxref\n'+xo+'\n%%EOF'));
 return new Blob(parts,{type:'application/pdf'})}

export { awaitLogo, cachedLogoImg, exportReport, logoImg, pagesToPdf, reportPages };
