/* ═══ MATCH — Cycle de vie du match v0.3.5 (sans auth, Quick Notes) ═══ */
import { S, ans, synFilters, KEY_CURRENT } from './state.js';
import { fmtDate, pad, escapeHtml } from './utils.js';
import { log } from './logger.js';
import { startSafetyAutosave, stopSafetyAutosave, saveToHistory } from './storage.js';

export function startMatch() {
  /* v1.4.11 : alerte non-bloquante si champs vides */
  const tAv = document.getElementById('tA').value.trim();
  const tBv = document.getElementById('tB').value.trim();
  const a1v = document.getElementById('a1').value.trim();
  const a2v = document.getElementById('a2').value.trim();
  const missing = [];
  if (!tAv) missing.push('Équipe A');
  if (!tBv) missing.push('Équipe B');
  if (!a1v) missing.push('Arbitre 1');
  if (!a2v) missing.push('Arbitre 2');
  if (missing.length) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:14px;padding:24px 28px;max-width:340px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);text-align:center;">' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Champs manquants</div>' +
      '<div style="font-size:13px;color:var(--text-hint);margin-bottom:20px;">Les champs suivants sont vides : <strong>' + missing.join(', ') + '</strong>.<br>Voulez-vous continuer quand même ?</div>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button id="_startCancel" style="flex:1;padding:10px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-main);font-size:14px;cursor:pointer;">Annuler</button>' +
      '<button id="_startConfirm" style="flex:1;padding:10px;border:none;border-radius:10px;background:var(--blue-main,#1D3A7A);color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Continuer</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#_startCancel').onclick  = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#_startConfirm').onclick = () => { overlay.remove(); _doStartMatch(); };
    return;
  }
  _doStartMatch();
}

function _doStartMatch() {
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
  document.getElementById('SS').style.display = 'none';
  document.getElementById('MS').style.display = 'flex';
  /* v0.3.20 (BUG-2) : démarre le filet de sécurité d'autosave 30 s */
  startSafetyAutosave();
} /* fin _doStartMatch */

export function endMatch() {
  clearInterval(S.timer); S.run = false;
  log.info('LIFECYCLE', 'match_end', { equipeA: S.tA, equipeB: S.tB, scoreA: S.sA, scoreB: S.sB, scoreMiTempsA: S.htA, scoreMiTempsB: S.htB, periode: S.period, nbObservations: S.obs.length, tempsEcoule: S.elapsed });
  const mp = [];
  if (S.mDate) mp.push(fmtDate(S.mDate));
  if (S.mTime) mp.push(S.mTime);
  if (S.mComp) mp.push(S.mComp);
  document.getElementById('ET').innerHTML = '<strong>' + escapeHtml(S.tA) + '</strong> vs <strong>' + escapeHtml(S.tB) + '</strong>';  document.getElementById('EM').textContent = mp.join(' · ') + (mp.length ? ' — ' : '') + S.a1 + ' & ' + S.a2;
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
    /* v1.4.11 : overlay custom à la place de confirm() */
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:14px;padding:24px 28px;max-width:320px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);text-align:center;">' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Retour à l\'accueil ?</div>' +
      '<div style="font-size:13px;color:var(--text-hint);margin-bottom:20px;">Le suivi en cours sera perdu.</div>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button id="_ghCancel" style="flex:1;padding:10px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-main);font-size:14px;cursor:pointer;">Rester</button>' +
      '<button id="_ghConfirm" style="flex:1;padding:10px;border:none;border-radius:10px;background:#C82D2D;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Quitter</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#_ghCancel').onclick  = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#_ghConfirm').onclick = () => {
      overlay.remove();
      log.warn('LIFECYCLE', 'match_abandoned', { equipeA: S.tA, equipeB: S.tB, scoreA: S.sA, scoreB: S.sB, nbObservations: S.obs.length, periode: S.period });
      _doGoHome();
    };
    return;
  }
  log.info('LIFECYCLE', 'go_home');
  _doGoHome();
}

/* v1.4.11 : retour accueil depuis #ES — sauvegarde automatique avant navigation */
export async function goHomeFromEnd() {
  stopSafetyAutosave();
  try { await saveToHistory(); } catch(e) { /* silencieux */ }
  _doGoHome();
}

function _doGoHome() {
  /* v0.3.20 (BUG-2) : arrête le filet de sécurité d'autosave (plus de match actif) */
  stopSafetyAutosave(); /* également appelé depuis goHomeFromEnd avant saveToHistory */
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
  const rm = document.getElementById('rMin'); const rs = document.getElementById('rSec');
  if (rm) rm.value = ''; if (rs) rs.value = '';
  window.App.buildTme(); window.App.renderTable();
  document.getElementById('MS').style.display = 'none';
  document.getElementById('ES').style.display = 'none';
  document.getElementById('HistS').style.display = 'none';
  document.getElementById('SS').style.display = 'none';
  document.getElementById('mComp').value = '';
  document.getElementById('tA').value = ''; document.getElementById('tB').value = '';
  document.getElementById('a1').value = ''; document.getElementById('a2').value = '';
  /* v1.4.9 : retour vers la page de garde */
  const homeS = document.getElementById('HomeS');
  if (homeS) {
    homeS.style.display = 'flex';
    /* Rafraîchir la liste des matchs */
    if (typeof window._renderHomeScreenFn === 'function') window._renderHomeScreenFn();
  }
}
