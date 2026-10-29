/* js/core/helpers.js — diekstrak otomatis dari index.html (fase 4 refactor) */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatRupiah=n=>'Rp '+Math.round(n).toLocaleString('id-ID');
const formatJuta=n=>'Rp '+(n/1e6).toLocaleString('id-ID',{maximumFractionDigits:1})+' jt';
const MASK='Data terkunci';
const DAYS=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
const DAYSL=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
const MONTHS=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const TODAY=(()=>{const d=new Date();d.setHours(0,0,0,0);return d})();
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const parseDate=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const dIdx=d=>(d.getDay()+6)%7;
const fmtD=s=>{const d=typeof s==='string'?parseDate(s):s;return d.getDate()+' '+MONTHS[d.getMonth()]};
const num=v=>Number(String(v).replace(',','.'))||0;
const sum=a=>a.reduce((x,y)=>x+y,0);
const parseHMS=s=>{const p=String(s).trim().split(':').map(Number);if(!p.length||p.some(isNaN))return 0;return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:0};
const hms=sec=>{const r=Math.round(sec);return Math.floor(r/3600)+':'+String(Math.floor(r%3600/60)).padStart(2,'0')+':'+String(r%60).padStart(2,'0')};
const mmss=sec=>{const r=Math.round(sec);return Math.floor(r/60)+':'+String(r%60).padStart(2,'0')};
const first=n=>String(n).split(' ')[0];
const slug=n=>String(n).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ago=t=>{const m=Math.round((Date.now()-t.getTime())/60000);return m<1?'baru saja':m<60?m+' mnt lalu':m<1440?Math.round(m/60)+' jam lalu':Math.round(m/1440)+' hari lalu'};
const hhmm=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
const minsAgo=m=>new Date(Date.now()-m*60000);
const fullD=k=>{const d=parseDate(k);return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear()};

export { $, DAYS, DAYSL, MASK, MONTHS, TODAY, addD, ago, dIdx, esc, first, fmtD, formatJuta, formatRupiah, fullD, hhmm, hms, iso, minsAgo, mmss, num, parseDate, parseHMS, slug, sum };
