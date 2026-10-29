/* js/core/sync.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { COACHES } from './constants.js';
import { TODAY, iso } from './helpers.js';
import { appState, nextClientUid, store } from './store.js';
import { isApiMode } from './api.js';

const SYNC_KEY='nsr-sync-v1';
let lastSyncPayload='';
const jsonReplacer=function(k,v){const o=this[k];return o instanceof Date?{$d:o.toISOString()}:v};
const jsonReviver=(k,v)=>v&&typeof v==='object'&&typeof v.$d==='string'?new Date(v.$d):v;
function syncSnapshot(){store.coachIds=COACHES.slice();return JSON.stringify(store,jsonReplacer)}
function syncPush(){
 if(isApiMode())return; // mode API: persistensi via backend, bukan localStorage
 try{
  const j=syncSnapshot();if(j===lastSyncPayload)return;
  lastSyncPayload=j;appState.syncAt=new Date();
  localStorage.setItem(SYNC_KEY,JSON.stringify({by:SYNC_APP_ID,t:Date.now(),day:iso(TODAY),d:j}));
 }catch(e){}
}
function syncLoad(raw){
 try{
  const o=JSON.parse(raw);if(!o||o.day!==iso(TODAY)||typeof o.d!=='string')return false;
  const nd=JSON.parse(o.d,jsonReviver);
  Object.keys(store).forEach(k=>{delete store[k]});Object.assign(store,nd);store.logs=store.logs||[];store.payInfo=store.payInfo||{};store.skills=store.skills||{};store.programs.forEach(p=>{if(!p.unit)p.unit=(p.wk||4)+' minggu'});store.clients.forEach(c=>{if(!c.uid)c.uid=nextClientUid()});
  if(Array.isArray(store.coachIds))COACHES.splice(0,COACHES.length,...store.coachIds);
  lastSyncPayload=syncSnapshot();return true;
 }catch(e){return false}
}
function syncBoot(){
 if(isApiMode())return false;
 try{const raw=localStorage.getItem(SYNC_KEY);if(raw&&syncLoad(raw))return true}catch(e){}
 lastSyncPayload=syncSnapshot();return false;
}
function syncReset(){try{localStorage.removeItem(SYNC_KEY)}catch(e){}try{location.reload()}catch(e){}}
function syncListen(onChange){
 window.addEventListener('storage',e=>{
  if(e.key===SYNC_KEY&&e.newValue===null){try{location.reload()}catch(x){}return}
  if(e.key!==SYNC_KEY||!e.newValue)return;
  if(!syncLoad(e.newValue))return;
  appState.syncAt=new Date();onChange();
 });
}
const SYNC_APP_ID='owner';

export { SYNC_APP_ID, SYNC_KEY, jsonReplacer, jsonReviver, lastSyncPayload, syncBoot, syncListen, syncLoad, syncPush, syncReset, syncSnapshot };
