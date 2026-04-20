/* ═══ MATCH — Cycle de vie du match v0.3.5 (sans auth, Quick Notes) ═══ */
import { S, ans, synFilters, KEY_CURRENT } from './state.js';
import { fmtDate, pad, escapeHtml } from './utils.js';
import { log } from './logger.js';
import { startSafetyAutosave, stopSafetyAutosave } from './storage.js';

export function startMatch() {
  S.tA    = document.getElementById('tA').value    || 'Equipe A';
  S.tB    = document.getElementById('tB').value    || 'Equipe B';
  S.a1    = document.getElementById('a1').value    || 'Arbitre 1';
  S.a2    = document.getElementById('a2').value    || 'Arbitre 2';
  S.mDate = document.getElementById('mDate').value || '';
  S.mTime = document.getElementById('mTime').value || '';
  S.mComp = document.getElementById('mComp').value || '';
  log.info('LIFECYCLE', 'match_start', { equipeA: S.tA, equipeB: S.tB, arbitre1: S.a1, arbitre2: S.a2, date: S.mDate, heure: S.mTime, competition: S.mComp });
  document.getElementById('sTA').textContent = S.tA;
  document.getElementById('sTB').textContent = S.tB;
  document.getElementById('thA').textContent = S.tA;
  document.getElementById('thB').textContent = S.tB;
  /* v0.3.24 (FRAG-3) : noms d'équipes et d'arbitres échappés avant injection HTML */
  document.getElementById('topInfo').innerHTML = '<strong>' + escapeHtml(S.tA) + '</strong> vs <strong>' + escapeHtml(S.tB) + '</strong> | ' + escapeHtml(S.a1) + ' & ' + escapeHtml(S.a2);
  const mp = [];
  if (S.mDate) mp.push(fmtDate(S.mDate));
  if (S.mTime) mp.push(S.mTime);
  if (S.mComp) mp.push(S.mComp);
  document.getElementById('topMeta').textContent = mp.join(' · ');
  window.App.buildQuickNotes();
  window.App.buildTme();
  window.App.buildQs();
  window.App.renderTable();
  localStorage.removeItem(KEY_CURRENT);
  S.matchActif = false; /* v0.3.31 (BUG-5) : aucune action réelle encore */
  document.getElementById('resumeBanner').classList.remove('on');
  document.getElementById('SS').style.display = 'none';
  document.getElementById('MS').style.display = 'flex';
  /* v0.3.20 (BUG-2) : démarre le filet de sécurité d'autosave 30 s */
  startSafetyAutosave();
}

export function endMatch() {
  clearInterval(S.timer); S.run = false;
  log.info('LIFECYCLE', 'match_end', { equipeA: S.tA, equipeB: S.tB, scoreA: S.sA, scoreB: S.sB, scoreMiTempsA: S.htA, scoreMiTempsB: S.htB, periode: S.period, nbObservations: S.obs.length, tempsEcoule: S.elapsed });
  const mp = [];
  if (S.mDate) mp.push(fmtDate(S.mDate));
  if (S.mTime) mp.push(S.mTime);
  if (S.mComp) mp.push(S.mComp);
  document.getElementById('ET').textContent = S.tA + ' vs ' + S.tB;
  document.getElementById('EM').textContent = mp.join(' · ') + (mp.length ? ' — ' : '') + S.a1 + ' & ' + S.a2;
  document.getElementById('ESc').textContent = S.sA + ' : ' + S.sB;
  const htEl = document.getElementById('EHtScore');
  if (S.htA !== null) { htEl.textContent = 'MT  ' + S.htA + ' : ' + S.htB; htEl.style.display = 'block'; } else { htEl.style.display = 'none'; }
  const ctxVal = document.getElementById('ctxTA').value.trim();
  const eCtxEdit = document.getElementById('ECtxEdit');
  if (eCtxEdit) eCtxEdit.value = ctxVal;
  window.App.buildSynTable();
  window.App.renderEndTable();
  document.getElementById('MS').style.display = 'none';
  document.getElementById('ES').style.display = 'flex';
}

export function backMatch() {
  log.info('LIFECYCLE', 'back_to_match');
  const eCtxEdit = document.getElementById('ECtxEdit');
  const ctxTA = document.getElementById('ctxTA');
  if (eCtxEdit && ctxTA) ctxTA.value = eCtxEdit.value;
  document.getElementById('ES').style.display = 'none';
  document.getElementById('MS').style.display = 'flex';
}

export function goHome() {
  if (S.run || S.obs.length > 0 || S.sA > 0 || S.sB > 0 || S.htA !== null) {
    if (!confirm("Retourner a l'accueil ? Le suivi en cours sera perdu.")) return;
    log.warn('LIFECYCLE', 'match_abandoned', { equipeA: S.tA, equipeB: S.tB, scoreA: S.sA, scoreB: S.sB, nbObservations: S.obs.length, periode: S.period });
  } else { log.info('LIFECYCLE', 'go_home'); }
  /* v0.3.20 (BUG-2) : arrête le filet de sécurité d'autosave (plus de match actif) */
  stopSafetyAutosave();
  clearInterval(S.timer);
  Object.assign(S, { tA: 'Equipe A', tB: 'Equipe B', a1: 'Arb 1', a2: 'Arb 2', mDate: '', mTime: '', mComp: '', run: false, elapsed: 0, period: 'MT1', timer: null, tick: null, sA: 0, sB: 0, htA: null, htB: null, tme: { A: [null,null,null], B: [null,null,null] }, obs: [], detailPending: null, pauseTme: false });
  ans.esprit = null; ans.engage = null; ans.niveau = null;
  Object.assign(synFilters, { arb: 'all', per: 'all' });
  document.getElementById('CD').textContent = '00:00';
  document.getElementById('BSS').textContent = 'Demarrer';
  document.getElementById('BSS').className = 'bc go';
  document.getElementById('PBadge').textContent = 'MT1';
  document.getElementById('PBadge').className = 'period-badge p-mt1';
  document.getElementById('sA').textContent = '0';
  document.getElementById('sB').textContent = '0';
  document.getElementById('tmeP').classList.remove('on');
  document.getElementById('PB').classList.remove('on');
  document.getElementById('ctxTA').value = '';
  localStorage.removeItem(KEY_CURRENT);
  S.matchActif = false; /* v0.3.31 (BUG-5) : reset au retour accueil */
  document.getElementById('resumeBanner').classList.remove('on');
  const rm = document.getElementById('rMin'); const rs = document.getElementById('rSec');
  if (rm) rm.value = ''; if (rs) rs.value = '';
  window.App.buildTme(); window.App.renderTable();
  document.getElementById('MS').style.display = 'none';
  document.getElementById('ES').style.display = 'none';
  document.getElementById('HistS').style.display = 'none';
  document.getElementById('SS').style.display = 'flex';
  const now = new Date();
  const _p = n => String(n).padStart(2,'0');
  const isoDate = now.getFullYear() + '-' + _p(now.getMonth()+1) + '-' + _p(now.getDate());
  const isoTime = _p(now.getHours()) + ':' + _p(now.getMinutes());
  document.getElementById('mDate').value = isoDate;
  document.getElementById('mTime').value = isoTime;
  const dd = document.getElementById('mDateDisplay');
  const dt = document.getElementById('mTimeDisplay');
  if (dd) dd.value = _p(now.getDate()) + '/' + _p(now.getMonth()+1) + '/' + now.getFullYear();
  if (dt) dt.value = isoTime;
  document.getElementById('mComp').value = '';
  document.getElementById('tA').value = ''; document.getElementById('tB').value = '';
  document.getElementById('a1').value = ''; document.getElementById('a2').value = '';
}
