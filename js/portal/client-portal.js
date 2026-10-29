/* js/portal/client-portal.js — diekstrak otomatis dari index.html (fase 4 refactor) */
import { esc, first } from '../core/helpers.js';
import { logo } from '../core/icons.js';
import { appState, findClientById } from '../core/store.js';
import { cdashBody } from './cdash.js';

function clientPage(){
 const c=findClientById(appState.cview);
 const head=`<div class="brand" style="padding:4px 2px 12px">${logo(50)}</div>`;
 if(!c)return `<div class="shell" style="grid-template-columns:min(640px,100%);justify-content:center"><main class="main">${head}<section class="card"><h3>Link tidak valid</h3><p class="sub">Dashboard klien tidak ditemukan. Minta link terbaru ke admin Number Six Running.</p></section></main></div>`;
 return `<div class="shell" style="grid-template-columns:min(760px,100%);justify-content:center"><main class="main cp">${head}<div><p class="eyebrow">Dashboard klien</p><h1>Halo, ${esc(first(c.name))}</h1></div>${cdashBody(c)}</main></div>`}

export { clientPage };
