/* js/portal/links.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { esc } from '../core/helpers.js';
import { icon } from '../core/icons.js';
import { findClientById, store } from '../core/store.js';

const getShareLinkFor=(cid,date)=>((store.swLinks||[]).find(x=>x.cid===cid&&x.date===date)||{}).url;
const clientUrl=c=>location.href.split('#')[0]+'#c='+(c.portal_token||c.uid);
const isValidShareUrl=u=>/^https?:\/\/\S+$/i.test(String(u||'').trim());
const shareLinkAnchor=u=>isValidShareUrl(u)?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" style="word-break:break-all">${esc(u)}</a>`:(u?esc(u):'<span class="sub">Belum ada</span>');
function renderShareLinkBlock(r){
 const c=findClientById(r.cid);
 const row=(l,u)=>`<div class="indr" style="align-items:flex-start;gap:12px"><span>${l}</span><div class="row" style="justify-content:flex-end;flex:1;min-width:0;flex-wrap:nowrap"><b style="min-width:0;font-weight:600;text-align:right">${shareLinkAnchor(u)}</b>${isValidShareUrl(u)?`<button class="btn sm" data-act="copysw" data-v="${esc(u)}" aria-label="Salin link smartwatch">${icon('copy',13)}</button>`:''}</div></div>`;
 return `<div class="idcard"><b>Link smartwatch ${esc(c.name)}</b><div class="indl">${row('Dikirim klien untuk sesi ini',getShareLinkFor(r.cid,r.date)||r.sw)}${row('Terdaftar di profil klien',c.sw)}</div></div>`}

export { clientUrl, getShareLinkFor, isValidShareUrl, renderShareLinkBlock, shareLinkAnchor };
