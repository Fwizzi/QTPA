/* ═══ MAIN — Point d'entrée v0.3.6 (Quick Notes + Auth) ═════════════════ */
import { applyTheme, toggleTheme, showAlert, closeAlert, buildQs, setAns } from './ui.js';
import { updateCD, toggleChrono, resumeTme, tickC, advPeriod, activerProlong, resetChrono, applyRecal } from './timer.js';
import { chgScore, buildTme, refreshTme, addTme, deleteTme, tmeVal } from './score.js';
import { buildQuickNotes, closeDetail, saveDetail, refreshCounters, renderTable, renderEndTable, sorted, onFilterChange, onFilterChangeE, resetFilters, resetFiltersE, editObservation, deleteObservation, confirmDelete, closeConfirm } from './observations.js';
import { setSynFilter, buildSynTable } from './synthesis.js';
import { exportPDF } from './pdf.js';
import { autosave, autosaveDebounced, flushAutosave, checkResume, resumeMatch, discardMatch, saveToHistory, openHistory, closeHistory, renderHistory, deleteHistory, deleteHistoryRemote, reexportPDF, startSafetyAutosave, stopSafetyAutosave } from './storage.js';
import { startMatch, endMatch, backMatch, goHome } from './match.js';
import { pad, escapeHtml } from './utils.js';
import { S } from './state.js';
import { log, exportLogs } from './logger.js';
import { APP_VERSION, APP_YEAR, APP_AUTHOR } from './version.js';
import { isLoggedIn, isAdmin, getEmail, getRole, login, logout,
         changePassword, adminGetUsers, adminCreateUser, adminDeleteUser, adminResetPassword } from './auth.js';

/* ── Registre central ── */
window.App = {
  showAlert, closeAlert, buildQs, setAns, applyTheme, toggleTheme,
  updateCD, toggleChrono, resumeTme, advPeriod, activerProlong, resetChrono, applyRecal,
  chgScore, buildTme, refreshTme, addTme, deleteTme,
  buildQuickNotes, closeDetail, saveDetail, refreshCounters, renderTable, renderEndTable,
  onFilterChange, onFilterChangeE, resetFilters, resetFiltersE,
  editObservation, deleteObservation, confirmDelete, closeConfirm,
  setSynFilter, buildSynTable,
  exportPDF,
  autosave, autosaveDebounced, checkResume, resumeMatch, discardMatch, saveToHistory,
  openHistory, closeHistory, renderHistory, deleteHistory, deleteHistoryRemote, reexportPDF,
  startSafetyAutosave, stopSafetyAutosave,
  startMatch, endMatch, backMatch, goHome,
  exportLogs, isLoggedIn, isAdmin, getEmail, getRole, logout
};

/* ── Exposition window ── */
window.startMatch          = startMatch;
window.endMatch            = endMatch;
window.backMatch           = backMatch;
window.goHome              = goHome;
window.toggleChrono        = toggleChrono;
window.resumeTme           = resumeTme;
window.applyRecal          = applyRecal;
window.activerProlong      = activerProlong;
window.resetChrono         = resetChrono;
window.chgScore            = chgScore;
window.addTme              = (t, i) => window.App.addTme(t, i);
window.deleteTme           = (t, i) => window.App.deleteTme(t, i);
window.setSynFilter        = setSynFilter;
window.exportPDF           = exportPDF;
window.resumeMatch         = resumeMatch;
window.discardMatch        = discardMatch;
window.openHistory         = openHistory;
window.closeHistory        = closeHistory;
window.deleteHistory       = deleteHistory;
window.deleteHistoryRemote = deleteHistoryRemote;
window.reexportPDF         = reexportPDF;
window.syncDate = function() {
  const v = document.getElementById('mDate').value; // aaaa-mm-jj
  const d = document.getElementById('mDateDisplay');
  if (d && v) { const p = v.split('-'); d.value = p[2]+'/'+p[1]+'/'+p[0]; }
};
window.syncTime = function() {
  const v = document.getElementById('mTime').value;
  const d = document.getElementById('mTimeDisplay');
  if (d && v) d.value = v;
};
window.toggleTheme         = toggleTheme;
window.closeAlert          = closeAlert;
window.setAns              = setAns;
window.exportLogs          = exportLogs;
window.renderTable         = renderTable;
window.renderEndTable      = renderEndTable;
window.closeDetail         = closeDetail;
window.saveDetail          = saveDetail;
window.onFilterChange      = onFilterChange;
window.onFilterChangeE     = onFilterChangeE;
window.resetFilters        = resetFilters;
window.resetFiltersE       = resetFiltersE;
window.editObservation     = editObservation;
window.deleteObservation   = deleteObservation;
window.confirmDelete       = confirmDelete;
window.closeConfirm        = closeConfirm;
window.submitLogin         = submitLogin;
window.doLogout            = doLogout;
window.openAdmin           = openAdmin;
window.closeAdmin          = closeAdmin;
window.adminSubmitUser     = adminSubmitUser;
window.adminDeleteUser     = adminDeleteUserUI;
window.adminResetPassword  = adminResetPasswordUI;
window.changePasswordUI    = changePasswordUI;

/* ════════════════════════════════════════
   ECRAN DE CONNEXION
════════════════════════════════════════ */
async function submitLogin() {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errEl    = document.getElementById('authError');
  const btn      = document.getElementById('authSubmit');

  if (!email || !password) { errEl.textContent = 'Remplissez tous les champs.'; return; }

  btn.disabled    = true;
  btn.textContent = 'Connexion...';
  errEl.textContent = '';

  try {
    const result = await login(email, password);

    btn.disabled    = false;
    btn.textContent = 'Se connecter';

    if (!result.ok) {
      errEl.textContent = result.error || 'Identifiants incorrects.';
      log.warn('AUTH', 'login_echec', { error: result.error });
      return;
    }

    log.info('AUTH', 'login_ok', { role: result.role });
    _showApp();
  } catch (e) {
    btn.disabled    = false;
    btn.textContent = 'Se connecter';
    errEl.textContent = 'Impossible de joindre le serveur. V\u00e9rifiez votre connexion.';
    log.error('AUTH', 'login_exception', { message: e.message });
  }
}

function doLogout() {
  if (!confirm('Se d\u00e9connecter ?')) return;
  logout();
  _showLogin();
}

function _showLogin() {
  document.getElementById('AuthS').style.display = 'flex';
  document.getElementById('SS').style.display    = 'none';
  document.getElementById('MS').style.display    = 'none';
  document.getElementById('ES').style.display    = 'none';
  document.getElementById('HistS').style.display = 'none';
  document.getElementById('AdminS').style.display= 'none';
  document.getElementById('authEmail').value    = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authError').textContent = '';
}

function _showApp() {
  document.getElementById('AuthS').style.display = 'none';
  document.getElementById('SS').style.display    = 'flex';
  _updateUserBadge();
  checkResume();
  const now = new Date();
  const isoDate = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate());
  const isoTime = pad(now.getHours()) + ':' + pad(now.getMinutes());
  document.getElementById('mDate').value = isoDate;
  document.getElementById('mTime').value = isoTime;
  const dd = document.getElementById('mDateDisplay');
  const dt = document.getElementById('mTimeDisplay');
  if (dd) dd.value = pad(now.getDate()) + '/' + pad(now.getMonth()+1) + '/' + now.getFullYear();
  if (dt) dt.value = isoTime;
}

function _updateUserBadge() {
  const badge    = document.getElementById('userBadge');
  const adminBtn = document.getElementById('btnAdmin');
  const logsBtn  = document.getElementById('btnLogs'); /* v1.0.4 */
  badge.textContent = getEmail() || '';
  if (isAdmin()) {
    adminBtn.style.display = 'inline-block';
    if (logsBtn) logsBtn.style.display = 'inline-block'; /* v1.0.4 : logs réservés aux admins */
  } else {
    adminBtn.style.display = 'none';
    if (logsBtn) logsBtn.style.display = 'none';
  }
}

/* ════════════════════════════════════════
   POLITIQUE DE MOT DE PASSE (centralisee)
════════════════════════════════════════ */
const PWD_RULES = [
  { id: 'len',     test: p => p.length >= 8,        label: '8 caract\u00e8res minimum' },
  { id: 'upper',   test: p => /[A-Z]/.test(p),      label: 'Au moins une majuscule' },
  { id: 'lower',   test: p => /[a-z]/.test(p),      label: 'Au moins une minuscule' },
  { id: 'digit',   test: p => /[0-9]/.test(p),      label: 'Au moins un chiffre' },
  { id: 'special', test: p => /[^A-Za-z0-9]/.test(p), label: 'Au moins un caract\u00e8re sp\u00e9cial' }
];

function validatePassword(pwd) {
  return PWD_RULES.every(r => r.test(pwd));
}

function buildPwdChecklist(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = PWD_RULES.map(r =>
    '<div id="pwdrule_' + containerId + '_' + r.id + '" style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-hint);transition:color .2s;">' +
    '<span class="pwd-check-icon" style="font-size:14px;">\u25CB</span>' +
    '<span>' + r.label + '</span></div>'
  ).join('');
}

function updatePwdChecklist(containerId, pwd) {
  PWD_RULES.forEach(r => {
    const row = document.getElementById('pwdrule_' + containerId + '_' + r.id);
    if (!row) return;
    const ok   = r.test(pwd);
    const icon = row.querySelector('.pwd-check-icon');
    icon.textContent = ok ? '\u2713' : '\u25CB';
    row.style.color  = ok ? 'var(--green-text)' : 'var(--text-hint)';
    icon.style.fontWeight = ok ? '700' : '400';
  });
}

/* ════════════════════════════════════════
   CHANGEMENT DE MOT DE PASSE UTILISATEUR
════════════════════════════════════════ */
async function changePasswordUI() {
  const overlay = document.getElementById('pwdChangeOverlay');
  overlay.style.display = 'flex';
  document.getElementById('pwdCurrent').value  = '';
  document.getElementById('pwdNew').value      = '';
  document.getElementById('pwdConfirm').value  = '';
  document.getElementById('pwdError').textContent   = '';
  document.getElementById('pwdSuccess').textContent = '';
  buildPwdChecklist('pwdRulesChecklist');
  updatePwdChecklist('pwdRulesChecklist', '');
  document.getElementById('pwdCurrent').focus();
}

window.pwdChangeCancel = function() {
  document.getElementById('pwdChangeOverlay').style.display = 'none';
};

window.pwdNewInput = function() {
  updatePwdChecklist('pwdRulesChecklist', document.getElementById('pwdNew').value);
};

window.pwdChangeSubmit = async function() {
  const current = document.getElementById('pwdCurrent').value;
  const newPwd  = document.getElementById('pwdNew').value;
  const confirmPwd = document.getElementById('pwdConfirm').value;
  const errEl   = document.getElementById('pwdError');
  const succEl  = document.getElementById('pwdSuccess');
  const btn     = document.getElementById('pwdSubmitBtn');

  errEl.textContent  = '';
  succEl.textContent = '';

  if (!current || !newPwd || !confirmPwd) { errEl.textContent = 'Remplissez tous les champs.'; return; }
  if (!validatePassword(newPwd))          { errEl.textContent = 'Le mot de passe ne respecte pas tous les crit\u00e8res.'; return; }
  if (newPwd !== confirmPwd)              { errEl.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
  if (current === newPwd)                 { errEl.textContent = 'Le nouveau mot de passe doit \u00eatre diff\u00e9rent de l\'actuel.'; return; }

  btn.disabled    = true;
  btn.textContent = 'Modification...';

  const result = await changePassword(current, newPwd);

  btn.disabled    = false;
  btn.textContent = 'Modifier';

  if (!result.ok) {
    errEl.textContent = result.error || 'Erreur lors du changement.';
    return;
  }

  succEl.textContent = 'Mot de passe modifi\u00e9 avec succ\u00e8s.';
  setTimeout(() => {
    document.getElementById('pwdChangeOverlay').style.display = 'none';
  }, 1500);
};

/* ════════════════════════════════════════
   ESPACE ADMIN
════════════════════════════════════════ */
async function openAdmin() {
  document.getElementById('SS').style.display    = 'none';
  document.getElementById('AdminS').style.display = 'flex';
  buildPwdChecklist('adminPwdChecklist');
  updatePwdChecklist('adminPwdChecklist', '');
  await _renderAdminUsers();
}

window.adminPwdInput = function() {
  updatePwdChecklist('adminPwdChecklist', document.getElementById('newUserPassword').value);
};

function closeAdmin() {
  document.getElementById('AdminS').style.display = 'none';
  document.getElementById('SS').style.display     = 'flex';
}

async function _renderAdminUsers() {
  const list   = document.getElementById('adminUserList');
  const errEl  = document.getElementById('adminListError');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-hint);">Chargement...</div>';
  errEl.textContent = '';

  const result = await adminGetUsers();
  if (!result.ok) { errEl.textContent = result.error; list.innerHTML = ''; return; }

  const users = result.users;
  document.getElementById('adminUserCount').textContent = users.length + ' utilisateur(s)';

  list.innerHTML = users.map(u => {
    const lastLogin = u.last_login
      ? new Date(u.last_login).toLocaleDateString('fr-FR') + ' ' +
        new Date(u.last_login).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : 'Jamais';
    const isMe = u.email === getEmail();
    /* v0.3.24 (FRAG-3) : email, rôle et id échappés. L'échappement HTML
       transforme les apostrophes en &#39; ce qui sécurise aussi les
       injections dans les attributs onclick='...'. */
    const eEmail = escapeHtml(u.email);
    const eRole  = escapeHtml(u.role);
    const eId    = escapeHtml(u.id);
    return '<div class="admin-user-row">' +
      '<div class="admin-user-info">' +
      '<span class="admin-user-email">' + eEmail + '</span>' +
      '<span class="admin-role-badge ' + (u.role === 'admin' ? 'role-admin' : 'role-user') + '">' + eRole + '</span>' +
      '<span class="admin-user-meta">Derni\u00e8re connexion : ' + lastLogin + '</span>' +
      '</div>' +
      '<div class="admin-user-actions">' +
      '<button class="btn-act" onclick="adminResetPassword(\'' + eId + '\')" title="R\u00e9initialiser le mot de passe">Mot de passe</button>' +
      (!isMe ? '<button class="btn-act btn-danger" onclick="adminDeleteUser(\'' + eId + '\', \'' + eEmail + '\')">Supprimer</button>' : '<span style="font-size:11px;color:var(--text-hint);">(vous)</span>') +
      '</div></div>';
  }).join('');
}

async function adminSubmitUser() {
  const email    = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value;
  const role     = document.getElementById('newUserRole').value;
  const errEl    = document.getElementById('adminCreateError');
  const btn      = document.getElementById('adminCreateBtn');

  if (!email || !password) { errEl.textContent = 'Remplissez tous les champs.'; return; }
  if (!validatePassword(password)) { errEl.textContent = 'Le mot de passe ne respecte pas la politique de s\u00e9curit\u00e9.'; return; }

  btn.disabled = true;
  btn.textContent = 'Cr\u00e9ation...';
  errEl.textContent = '';

  const result = await adminCreateUser(email, password, role);
  btn.disabled = false;
  btn.textContent = 'Cr\u00e9er';

  if (!result.ok) { errEl.textContent = result.error; return; }

  document.getElementById('newUserEmail').value    = '';
  document.getElementById('newUserPassword').value = '';
  errEl.textContent = '';
  await _renderAdminUsers();
}

async function adminDeleteUserUI(id, email) {
  if (!confirm('Supprimer le compte de ' + email + ' ?\nSes matchs seront \u00e9galement supprim\u00e9s.')) return;
  const result = await adminDeleteUser(id);
  if (!result.ok) { window.App.showAlert('Erreur : ' + result.error); return; }
  await _renderAdminUsers();
}

async function adminResetPasswordUI(id) {
  const pwd = prompt('Nouveau mot de passe pour cet utilisateur :');
  if (!pwd) return;
  if (!validatePassword(pwd)) {
    window.App.showAlert('Le mot de passe ne respecte pas la politique de s\u00e9curit\u00e9 :\n\u2022 8 caract\u00e8res minimum\n\u2022 1 majuscule, 1 minuscule, 1 chiffre, 1 caract\u00e8re sp\u00e9cial');
    return;
  }
  const result = await adminResetPassword(id, pwd);
  if (!result.ok) { window.App.showAlert('Erreur : ' + result.error); return; }
  window.App.showAlert('Mot de passe r\u00e9initialis\u00e9 avec succ\u00e8s.');
}

/* ── Erreurs globales ── */
window.addEventListener('error', e => {
  log.error('GLOBAL', 'js_erreur_non_geree', { message: e.message, source: e.filename, ligne: e.lineno });
});
window.addEventListener('unhandledrejection', e => {
  log.error('GLOBAL', 'promise_rejetee_non_geree', { message: e.reason?.message || String(e.reason) });
});

/* ─────────────────────────────────────────────────────────────────────
   v0.3.20 (BUG-2) — Filets de sécurité sur fermeture / arrière-plan
   ─────────────────────────────────────────────────────────────────────
   beforeunload     : déclenché à la fermeture/rechargement de l'onglet
                      sur desktop. Peu fiable sur iOS, d'où l'ajout de
                      visibilitychange en complément.
   visibilitychange : déclenché quand l'app passe en arrière-plan
                      (verrouillage écran, changement d'app, onglet
                      masqué). C'est le filet le plus important sur
                      mobile, où l'OS peut tuer l'app à tout moment
                      sans préavis une fois qu'elle est masquée.
   Les deux écouteurs déclenchent un autosave silencieux protégé par
   try/catch — il ne faut surtout pas qu'une erreur ici empêche la
   fermeture de la page.
═════════════════════════════════════════════════════════════════════ */
/* v0.3.31 (BUG-5) : exposer setMatchActif pour le handler oninput du contexte */
window.App.setMatchActif = function() { S.matchActif = true; };

/* ─────────────────────────────────────────────────────────────────────────
   v0.3.31 (BUG-5) — Garde d'autosave simplifiée.
   Un match est considéré "actif" uniquement si au moins une action réelle
   a été effectuée dans l'écran match : chrono, score, TME, observation ou
   contexte. Le simple fait de démarrer le match (startMatch) ne suffit pas.
   Le flag S.matchActif est positionné par chaque déclencheur concerné et
   remis à false par startMatch() et goHome().
═════════════════════════════════════════════════════════════════════════ */
function _hasMatchData() {
  return S.matchActif === true;
}

window.addEventListener('beforeunload', () => {
  if (!_hasMatchData()) return;
  /* v0.3.22 (FRAG-1) : flush du debounce de saisie contexte avant fermeture
     pour ne perdre aucun caractère tapé dans les 500 dernières ms. */
  try { flushAutosave(); } catch (e) { /* silencieux */ }
  try { autosave(); } catch (e) { /* silencieux : ne pas bloquer la fermeture */ }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (!_hasMatchData()) return;
    /* v0.3.22 (FRAG-1) : idem flush avant passage en arrière-plan. */
    try { flushAutosave(); } catch (e) { /* silencieux */ }
    try { autosave(); } catch (e) { /* silencieux */ }
  }
});

/* ── Initialisation ── */
window.addEventListener('load', () => {
  log.info('LIFECYCLE', 'app_initialisee', { version: APP_VERSION });

  document.querySelectorAll('.copyright-bar').forEach(el => {
    const btn = el.querySelector('button');
    el.innerHTML =
      '\u00a9 ' + APP_YEAR + ' <strong>' + APP_AUTHOR + '</strong>' +
      ' \u2014 Tous droits r\u00e9serv\u00e9s \u2014 <span style="opacity:.6;font-size:.9em;">v' + APP_VERSION + '</span>';
    if (btn) el.appendChild(btn);
  });
  document.querySelectorAll('.copyright-bar-inline').forEach(el => {
    el.style.cssText = 'font-size:10px;color:#bbb;text-align:center;padding:4px 0;';
    el.innerHTML =
      '\u00a9 ' + APP_YEAR + ' <strong style="color:#999;">' + APP_AUTHOR + '</strong>' +
      ' \u2014 <span style="opacity:.6;">v' + APP_VERSION + '</span>';
  });

  const saved       = localStorage.getItem('arbitres_hb_theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const isDark      = saved === 'dark' || (!saved && prefersDark);
  applyTheme(isDark, false);
  document.documentElement.classList.remove('dark-init');

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('arbitres_hb_theme')) applyTheme(e.matches, false);
  });

  document.getElementById('rMin').addEventListener('input', function () {
    if (this.value.length >= 2) document.getElementById('rSec').focus();
  });

  /* Fermer l'overlay detail en cliquant en dehors de la sheet */
  document.getElementById('detailOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('detailOverlay')) closeDetail();
    if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
  });

  /* Auth : si deja connecte -> app, sinon -> login */
  if (isLoggedIn()) {
    _showApp();
  } else {
    _showLogin();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => log.info('SW', 'service_worker_enregistre'))
    .catch(e  => log.error('SW', 'service_worker_erreur', { message: e.message }));

  /* ─────────────────────────────────────────────────────────────────────
     v0.3.27 (FRAG-2) — Réception des messages du service worker
     ─────────────────────────────────────────────────────────────────────
     Quand le SW détecte en arrière-plan (via stale-while-revalidate)
     qu'une nouvelle version de l'app est disponible sur le serveur, il
     envoie un postMessage { type: 'APP_UPDATE_AVAILABLE' } à tous les
     clients actifs. On affiche alors un bandeau discret en bas de
     l'écran proposant à l'utilisateur de recharger pour activer la
     nouvelle version.

     Bandeau créé dynamiquement (pas dans le HTML statique) car c'est
     une notification transverse qui doit pouvoir s'afficher depuis
     n'importe quel écran. Protection contre les déclenchements
     multiples : une fois le bandeau affiché, on ignore les postMessages
     suivants jusqu'au rechargement.
  ═════════════════════════════════════════════════════════════════════ */
  let _updateBannerShown = false;
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'APP_UPDATE_AVAILABLE') {
      log.info('SW', 'update_disponible');
      if (_updateBannerShown) return;
      _updateBannerShown = true;
      _showUpdateBanner();
    }
  });

  function _showUpdateBanner() {
    /* Évite les doublons si appelé deux fois */
    if (document.getElementById('swUpdateBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'swUpdateBanner';
    banner.className = 'sw-update-banner';
    banner.innerHTML =
      '<span class="sw-update-text">Une nouvelle version de l\'application est disponible.</span>' +
      '<button class="sw-update-btn" id="swUpdateReload">Recharger</button>' +
      '<button class="sw-update-close" id="swUpdateDismiss" title="Plus tard">&times;</button>';
    document.body.appendChild(banner);
    document.getElementById('swUpdateReload').addEventListener('click', () => {
      log.info('SW', 'update_reload_demande');
      window.location.reload();
    });
    document.getElementById('swUpdateDismiss').addEventListener('click', () => {
      log.info('SW', 'update_reload_differe');
      banner.remove();
    });
  }
}
