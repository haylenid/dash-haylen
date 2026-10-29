/* js/core/api.js — SATU-SATUNYA modul yang boleh fetch().
   Fase B: baca dari mock API. Ganti API_BASE ke backend asli nanti;
   translasi bentuk API -> bentuk store terpusat di sini. */
import { buildSessionLogs, deriveAttCoach } from './shared.js';
import { store } from './store.js';
import { COACHES } from './constants.js';

// Basis URL backend.
const API_BASE = 'https://api.denisbergkam.com/api/dbn6sport/v1';

// Token JWT disimpan di localStorage (bertahan antar refresh).
const TOKEN_KEY = 'n6r-token';
let apiToken = null;
try { apiToken = localStorage.getItem(TOKEN_KEY) || null; } catch (e) {}
let apiMode = false;
const isApiMode = () => apiMode;
const hasToken = () => !!apiToken;

// Login: kirim kredensial, simpan token + info user.
async function apiLogin(login_id, password) {
  const login = await req('POST', '/auth/login', { login_id, password });
  apiToken = login.token;
  try {
    localStorage.setItem(TOKEN_KEY, apiToken);
    if (login.user) localStorage.setItem('n6r-user', JSON.stringify(login.user));
  } catch (e) {}
  return login;
}
// Logout: hapus token + info user.
function apiLogout() {
  apiToken = null;
  apiMode = false;
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem('n6r-user'); } catch (e) {}
}
// Info user yang login (dari backend).
function apiUser() {
  try { return JSON.parse(localStorage.getItem('n6r-user') || 'null'); } catch (e) { return null; }
}

// Sesi kadaluarsa di tengah sesi: 401 dari aksi apa pun -> logout + login ulang.
// Dijaga sekali saja (boot menembak ~17 request paralel; semuanya 401).
// Hanya sesi staf (punya token): portal publik klien tidak ikut terlempar.
let loggingOut = false;
async function req(method, path, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(apiToken ? { Authorization: 'Bearer ' + apiToken } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      if (j.detail) {
        if (Array.isArray(j.detail)) {
          msg = j.detail.map(e => (e.loc ? e.loc.join('.') + ': ' : '') + e.msg).join('; ');
        } else if (typeof j.detail === 'string') {
          msg = j.detail;
        }
      } else if (j.error && j.error.message) {
        msg = j.error.message;
      }
      if (r.status === 401 && apiToken && !loggingOut) {
        loggingOut = true;
        apiLogout();
        try { location.reload(); } catch (e) {}
      }
      throw new Error(msg);
    }
    return j;
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('Timeout: server tidak merespons dalam 30 detik');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
const apiGet = p => req('GET', p).then(j => j.data);
const apiPost = (p, b) => req('POST', p, b).then(j => j.data);
const apiPatch = (p, b) => req('PATCH', p, b).then(j => j.data);
const apiPut = (p, b) => req('PUT', p, b).then(j => j.data || j);
const apiDel = p => req('DELETE', p);

// ---------- translasi: bentuk API -> bentuk store frontend ----------
const D = s => (s ? new Date(s) : null);
const tClient = c => {
  const o = { ...c, pid: c.program_id, coach: c.coach_id, sw: c.share_url,
    reg: c.created_at ? new Date(c.created_at).getTime() : 0 };
  delete o.program_id; delete o.coach_id; delete o.share_url;
  return o;
};
const tReport = (r, uidById) => {
  const o = { ...r, cid: r.client_id, plan: r.plan_km, fix: null };
  delete o.client_id; delete o.plan_km;
  if (r.correction) o.fix = { by: r.correction.by, text: r.correction.text, at: r.correction.at ? new Date(r.correction.at) : null };
  delete o.correction;
  if (!o.missed && uidById[o.cid]) o.sw = 'https://numbersix.example/sw/' + uidById[o.cid] + '/' + o.date;
  return o;
};
const tTx = t => {
  const o = { ...t, pid: t.program_id, cat: t.category, coach: t.coach_id, amt: t.amount };
  delete o.program_id; delete o.category; delete o.coach_id; delete o.amount;
  return o;
};
const tBooking = b => ({ id: b.id, coach: b.coach_id, client: b.client_id, day: b.day, time: b.time });
const tRequest = r => ({ ...r, at: D(r.date + 'T00:00:00') });
const tMsg = m => ({ ...m, t: D(m.t) });
const tActivity = a => ({ ...a, t: D(a.t) });

// ---------- boot: pakai token tersimpan; 401 -> butuh login ulang ----------
async function apiBoot() {
  if (!apiToken) { apiMode = false; return false; }
  try {
    const [members, programs, clients, tx, reqs, team, bcs, settings, tpl, activity, sched, att, cprof, swl, compay, titip, makeup] = await Promise.all([
      apiGet('/members'),
      apiGet('/programs'),
      apiGet('/clients?status=semua'),
      apiGet('/transactions'),
      apiGet('/requests'),
      apiGet('/messages/team'),
      apiGet('/messages/broadcasts'),
      apiGet('/settings'),
      apiGet('/correction-templates'),
      apiGet('/activity'),
      req('GET', '/schedule'),
      apiGet('/attendance').catch(e => { console.error('Gagal load attendance:', e); return { data: [] }; }),
      apiGet('/coach-profiles').catch(() => ({ data: [] })),
      apiGet('/share-links').catch(() => ({ data: [] })),
      apiGet('/commission-payments').catch(() => []),
      apiGet('/titip').catch(() => []),
      apiGet('/makeup').catch(() => []),
    ]);
    const repLists = await Promise.all(clients.map(c => apiGet('/clients/' + c.id + '/reports').catch(() => [])));
    const dmLists = await Promise.all(clients.map(c => apiGet('/messages/dm/' + c.id).catch(() => [])));
    // isi store (bentuk frontend)
    store.members = members;
    store.programs = programs;
    store.clients = clients.map(tClient);
    const uidById = {};
    store.clients.forEach(c => { uidById[c.id] = c.uid; });
    store.reports = repLists.flat().map(r => tReport(r, uidById));
    store.tx = tx.map(tTx);
    store.reqs = reqs.map(tRequest);
    const nAktif = store.clients.filter(c => !c.arch).length;
    store.msgs = {
      team: team.map(tMsg),
      dm: Object.fromEntries(clients.map((c, i) => [c.id, dmLists[i].map(tMsg)])),
      bc: bcs.map(b => ({ ...tMsg(b), n: b.n || nAktif })),
    };
    store.targets = settings.targets;
    store.acl = settings.acl;
    // Komisi Bulanan Fase B: pengaturan tanggal bayar (default akhir bulan)
    store.komisiSet = (settings.komisi && settings.komisi.tgl_bayar !== undefined) ? settings.komisi : { tgl_bayar: 'akhir' };
    store.tpl = tpl;
    // Simpan custom program templates untuk dipakai progInit
    if (settings.program_tpls) {
      try { window._savedTpls = settings.program_tpls; } catch (e) {}
    }
    store.log = activity.map(tActivity);
    store.pattern = sched.patterns || {};
    // Ganti COACHES hardcoded dengan coach asli dari DB agar notifikasi tidak dummy
    COACHES.length = 0;
    store.members.filter(m => m.role === 'coach' || m.role === 'head').forEach(m => COACHES.push(m.id));
    // Pastikan setiap coach punya entry pattern
    COACHES.forEach(cid => {
      if (!store.pattern[cid]) store.pattern[cid] = [[], [], [], [], [], [], []];
    });
    store.book = (sched.bookings || []).map(tBooking);
    // Absensi dari backend
    store.attSlot = {};
    // apiGet sudah unwrap .data, jadi att langsung array
    ((Array.isArray(att) ? att : (att && att.data)) || []).forEach(r => {
      store.attSlot[r.date + '|' + r.coach_id + '|' + r.time] = { s: r.status, by: r.by_name, at: r.at };
    });
    // Masalah 8: rekap absensi harian coach dibangun ulang dari attSlot
    // server (bukan memori sesi peramban) — pil Beranda, Daftar coach, skor,
    // dan Laporan Absensi coach jadi sinkron di semua perangkat.
    store.attCoach = deriveAttCoach();
    // Profil coach dari backend
    ((Array.isArray(cprof) ? cprof : (cprof && cprof.data)) || []).forEach(p => {
      store.prof[p.coach_id] = { rating: p.rating, reviews: p.reviews, since: p.since };
      if (p.skills) store.skills[p.coach_id] = p.skills;
    });
    // Share links dari backend
    store.swLinks = ((Array.isArray(swl) ? swl : (swl && swl.data)) || []).map(r => ({
      cid: r.client_id, date: r.date, url: r.url, id: r.id,
      fix: r.fix_text ? { by: r.fix_by, text: r.fix_text, at: r.fix_at ? new Date(r.fix_at) : new Date() } : null
    }));
    // Pembayaran komisi dari backend — F1.4: per klien + periode.
    // Record tanpa client_id = pembayaran legacy era per-coach: disimpan di
    // paidLegacy dan TIDAK menandai klien mana pun (dulu: menandai coach-nya,
    // sehingga semua klien coach itu ikut tampil Dibayar).
    store.paid = {}; store.payInfo = {}; store.payIds = {};
    store.paidByClient = {}; store.paidLegacy = []; store.paidSeg = {};
    // Komisi Bulanan Fase C: titipan klien ke coach pengganti (per tanggal)
    store.titip = (Array.isArray(titip) ? titip : []).map(t => ({ id: t.id, client: t.client_id, date: t.date, from: t.from_coach, to: t.to_coach, time: t.time, req: t.request_id }));
    // Sesi pengganti (undur terjadwal manual): catatan per tanggal + jam, coach sama
    store.makeup = (Array.isArray(makeup) ? makeup : []).map(t => ({ id: t.id, client: t.client_id, coach: t.coach_id, date: t.date, time: t.time, req: t.request_id }));
    ((Array.isArray(compay) ? compay : (compay && compay.data)) || []).forEach(p => {
      const info = { id: p.id, date: p.date, method: p.method, note: p.note || '', amt: p.amount, per: p.period, coach: p.coach_id };
      if (p.client_id) {
        // Komisi Bulanan Fase A (penyesuaian B): beberapa pembayaran untuk
        // klien+periode yang sama (mis. bayar kekurangan) DIJUMLAHKAN —
        // amt = total terbayar, ids = semua record (untuk pembatalan).
        const key = p.client_id + '|' + p.period, ex = store.paidByClient[key];
        if (ex) {
          ex.amt += p.amount; ex.ids.push(p.id);
          if ((p.date || '') >= (ex.date || '')) { ex.date = p.date; ex.method = p.method; ex.id = p.id; }
        } else store.paidByClient[key] = { ...info, ids: [p.id] };
        // Fase C: agregat per SEGMEN pelatih aktual (client|coach|periode) —
        // dasar status bayar terpisah saat sesi klien dilatih coach titipan.
        const skey = p.client_id + '|' + p.coach_id + '|' + p.period, sx = store.paidSeg[skey];
        if (sx) {
          sx.amt += p.amount; sx.ids.push(p.id);
          if ((p.date || '') >= (sx.date || '')) { sx.date = p.date; sx.method = p.method; sx.id = p.id; }
        } else store.paidSeg[skey] = { ...info, ids: [p.id] };
      }
      else store.paidLegacy.push(info);
    });
    buildSessionLogs();
    apiMode = true;
    return true;
  } catch (e) {
    // token basi/invalid -> paksa login ulang
    if (String((e && e.message) || e).includes('401')) apiLogout();
    apiMode = false;
    try { window.__apiErr = String((e && e.message) || e); } catch (x) {}
    return false;
  }
}

export { API_BASE, apiBoot, apiDel, apiGet, apiPatch, apiPost, isApiMode, hasToken, apiLogin, apiLogout, apiUser,
  apiSaveClient, apiSaveTransaction, apiAddMember, apiSaveProgram, apiSendTeamMessage, apiSendDm,
  apiSendBroadcast, apiSendPortalMessage, apiPortalLoad, apiPortalSaveLink, apiSubmitCorrection, apiLog, apiSavePattern, apiAddBooking,
  apiSaveAttendance, apiSaveCoachProfile, apiSaveShareLink, apiSaveRequest, apiSaveTemplate,
  apiUpdateTemplate, apiDeleteTemplate,
  apiPayCommission, apiCancelCommission, apiFixShareLink };

// ---------- tulis (Fase C): panggil API lalu selaraskan store lokal ----------
function upsert(arr, o) {
  const i = arr.findIndex(x => x.id === o.id);
  if (i >= 0) arr[i] = o; else arr.push(o);
  return o;
}
// d: {id?, name, program_id, start, coach_id} -> client bentuk frontend (sudah di store)
async function apiSaveClient(d) {
  const body = { ...d };
  delete body.id;
  const raw = d.id ? await apiPatch('/clients/' + d.id, body) : await apiPost('/clients', body);
  return upsert(store.clients, tClient(raw));
}
// d: {date, type, category, amount, desc, program_id?, coach_id?} -> tx bentuk frontend
async function apiSaveTransaction(d) {
  const t = tTx(await apiPost('/transactions', d));
  return upsert(store.tx, t);
}
async function apiAddMember(d) {
  const m = await apiPost('/members', d);
  return upsert(store.members, m);
}
// Simpan pola jadwal coach ke backend
async function apiSavePattern(coach_id, day, slots) {
  await apiPut('/schedule/patterns', { coach_id, day, slots });
  // update store lokal sudah dilakukan pemanggil
}
// Tambah booking via backend
async function apiAddBooking(d) {
  const raw = await apiPost('/bookings', {
    coach_id: d.coach, client_id: d.client, day: d.day, time: d.time
  });
  const b = raw.data || raw;
  return upsert(store.book, { id: b.id, coach: b.coach_id, client: b.client_id, day: b.day, time: b.time });
}
// Simpan absensi slot ke backend
async function apiSaveAttendance(date, coach_id, time, status, by_name, at) {
  await apiPost('/attendance', { date, coach_id, time, status, by_name, at });
}
// Simpan profil coach ke backend
async function apiSaveCoachProfile(coach_id, patch) {
  await apiPut('/coach-profiles/' + coach_id, patch);
}
// Simpan koreksi untuk share link ke backend
async function apiFixShareLink(linkId, text) {
  await apiPatch('/share-links/' + linkId, { fix_text: text });
}
// Simpan pembayaran komisi ke backend (F1.4: dicatat per klien)
async function apiPayCommission(coach_id, period, amount, date, method, note, client_id) {
  const raw = await apiPost('/commission-payments', { coach_id, period, amount, date, method, note, client_id });
  return raw;
}
async function apiCancelCommission(paymentId) {
  await apiDel('/commission-payments/' + paymentId);
}
// Simpan template koreksi ke backend
async function apiSaveTemplate(title, text) {
  const raw = await apiPost('/correction-templates', { title, text });
  return upsert(store.tpl, raw);
}
// Ubah template koreksi di backend
async function apiUpdateTemplate(id, title, text) {
  const raw = await apiPatch('/correction-templates/' + id, { title, text });
  return upsert(store.tpl, raw);
}
// Hapus template koreksi di backend (idempotent: 204 walau id tidak ada)
async function apiDeleteTemplate(id) {
  await apiDel('/correction-templates/' + id);
  const i = store.tpl.findIndex(t => t.id === id);
  if (i >= 0) store.tpl.splice(i, 1);
}
// Simpan pengajuan izin/cuti ke backend
async function apiSaveRequest(d) {
  const raw = await apiPost('/requests', d);
  return upsert(store.reqs, tRequest(raw));
}
// Simpan share link ke backend
async function apiSaveShareLink(client_id, date, url) {
  await apiPost('/share-links', { client_id, date, url });
}
async function apiSaveProgram(d) {
  const body = { ...d };
  delete body.id;
  const raw = d.id ? await apiPatch('/programs/' + d.id, body) : await apiPost('/programs', body);
  return upsert(store.programs, raw);
}
async function apiSendTeamMessage(text) {
  const m = tMsg(await apiPost('/messages/team', { text }));
  store.msgs.team.push(m);
  return m;
}
async function apiSendDm(cid, text, w) {
  const m = tMsg(await apiPost('/messages/dm/' + cid, { text }));
  (store.msgs.dm[cid] = store.msgs.dm[cid] || []).push(m);
  return m;
}
async function apiSendBroadcast(to, text, n) {
  const b = await apiPost('/messages/broadcasts', { to, text });
  const o = { ...tMsg(b), n: n || 0 };
  store.msgs.bc.unshift(o);
  return o;
}
// portal publik (kredensial: portal_token acak klien, BUKAN uid)
async function apiSendPortalMessage(token, cid, text) {
  const m = tMsg(await apiPost('/portal/' + encodeURIComponent(token) + '/messages', { text }));
  (store.msgs.dm[cid] = store.msgs.dm[cid] || []).push(m);
  return m;
}
// Portal publik: muat dashboard klien dari endpoint publik (tanpa sesi login)
// dan isi store secukupnya untuk clientPage/cdashBody. Lempar error bila
// token tidak dikenal (pemanggil menampilkan "Link tidak valid").
async function apiPortalLoad(token) {
  apiMode = true; // sesi portal tetap mode API (form Pesan & Setor Link harus menembak backend)
  const d = await apiGet('/portal/' + encodeURIComponent(token));
  const c = tClient(d.client);
  store.clients = [c];
  store.programs = d.program ? [{ unit: '', wk: 0, fee: 0, lvl: 0, peserta: 1, ...d.program }] : [];
  const uidById = { [c.id]: c.uid };
  store.reports = (d.reports || []).map(r => tReport(r, uidById));
  store.swLinks = (d.links || []).map(r => ({
    cid: r.client_id, date: r.date, url: r.url, id: r.id,
    fix: r.fix_text ? { by: r.fix_by, text: r.fix_text, at: r.fix_at ? new Date(r.fix_at) : new Date() } : null
  }));
  store.msgs = { team: [], dm: { [c.id]: (d.messages || []).map(tMsg) }, bc: [] };
  store.members = (d.people || []).map(p => ({ id: p.id, name: p.name }));
  return c;
}
async function apiPortalSaveLink(token, date, url) {
  await apiPost('/portal/' + encodeURIComponent(token) + '/links', { date, url });
}
// -> {by, text, at:Date}
async function apiSubmitCorrection(reportId, text) {
  const r = await apiPost('/reports/' + reportId + '/correction', { text });
  const c = r.correction || {};
  return { by: c.by, text: c.text, at: c.at ? new Date(c.at) : new Date() };
}
// fire-and-forget (dipakai logAct)
function apiLog(text) {
  return apiPost('/activity', { text }).catch(() => null);
}
