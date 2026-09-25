/* ═══ MAIN — Point d'entrée v1.1.0 (Supabase auth) ══════════════════════
   Auth restaurée via Supabase SDK (remplace api.suiviarbitres.omnelya.fr).
   initAuth() appelé au load pour restaurer la session existante avant
   d'afficher login ou app.
════════════════════════════════════════════════════════════════════════════ */
import { applyTheme, toggleTheme, showAlert, closeAlert, buildQs, setAns } from './ui.js';
import { updateCD, toggleChrono, resumeTme, tickC, advPeriod, activerProlong, resetChrono, applyRecal } from './timer.js';
import { chgScore, buildTme, refreshTme, addTme, deleteTme, tmeVal } from './score.js';
import { buildQuickNotes, closeDetail, saveDetail, refreshCounters, renderTable, renderEndTable, sorted, onFilterChange, onFilterChangeE, resetFilters, resetFiltersE, editObservation, deleteObservation, confirmDelete, closeConfirm } from './observations.js';
import { setSynFilter, buildSynTable } from './synthesis.js';
import { exportPDF } from './pdf.js';
import { autosave, autosaveDebounced, flushAutosave, checkResume, resumeMatch, discardMatch, saveToHistory, openHistory, closeHistory, renderHistory, deleteHistory, deleteHistoryRemote, reexportPDF, reexportPDFRemote, setAdminFilter, setHistFilters, startSafetyAutosave, stopSafetyAutosave } from './storage.js';
import { startMatch, endMatch, backMatch, goHome } from './match.js';
import { pad, escapeHtml } from './utils.js';
import { S } from './state.js';
import { log, exportLogs } from './logger.js';
import { APP_VERSION, APP_YEAR, APP_AUTHOR } from './version.js';
import { initAuth, isLoggedIn, isAdmin, getEmail, getRole, login, logout,
         changePassword, requestPasswordReset, handlePasswordReset,
         adminGetUsers, adminCreateUser, adminInviteUser, adminUpdateRole,
         adminDeleteUser, adminResetPassword, fetchMatchesAdmin, fetchMatches } from './auth.js';

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
  openHistory, closeHistory, renderHistory, deleteHistory, deleteHistoryRemote, reexportPDF, reexportPDFRemote, setAdminFilter,
  startSafetyAutosave, stopSafetyAutosave,
  startMatch, endMatch, backMatch, goHome,
  exportLogs, isLoggedIn, isAdmin, getEmail, getRole, logout,
  getCurrentUserId: () => { try { return window._supabaseSession?.user?.id || null; } catch(e) { return null; } }
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
  const v = document.getElementById('mDate').value;
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
window.forgotPassword      = forgotPassword;
window.pwdResetSubmit      = pwdResetSubmit;
window.pwdResetCancel      = pwdResetCancel;
window.adminChangeRole     = adminChangeRole;
window.openAdmin           = openAdmin;
window.closeAdmin          = closeAdmin;
window.adminSubmitUser     = adminSubmitUser;
window.adminDeleteUser     = adminDeleteUserUI;
window.adminResetPassword  = adminResetPasswordUI;
window.changePasswordUI    = changePasswordUI;
window.adminSearchUsers    = function() {
  const q = document.getElementById('adminUserSearch')?.value || '';
  _renderAdminUsers(q);
};
window.applyHistFilters    = function() {
  setHistFilters(
    document.getElementById('histFilterDateFrom')?.value,
    document.getElementById('histFilterDateTo')?.value,
    document.getElementById('histFilterCompetition')?.value,
    document.getElementById('histSortBy')?.value
  );
};
window.clearHistFilters    = function() {
  const ids = ['histFilterDateFrom', 'histFilterDateTo', 'histFilterCompetition'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const sortEl = document.getElementById('histSortBy');
  if (sortEl) sortEl.value = 'date_desc';
  setHistFilters('', '', '', 'date_desc');
};
window.adminToggleMode     = function() {
  const isInvite = document.getElementById('adminModeInvite')?.checked;
  const pwdField = document.getElementById('adminPwdField');
  const btn      = document.getElementById('adminCreateBtn');
  if (pwdField) pwdField.style.display = isInvite ? 'none' : '';
  if (btn) btn.textContent = isInvite ? 'Inviter' : 'Créer';
};

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
    errEl.textContent = 'Impossible de joindre Supabase. Vérifiez votre connexion.';
    log.error('AUTH', 'login_exception', { message: e.message });
  }
}

/* ── Mot de passe oublié ── */
async function forgotPassword() {
  const email = document.getElementById('authEmail').value.trim();
  const errEl = document.getElementById('authError');
  if (!email) { errEl.textContent = 'Saisissez votre email d\'abord.'; return; }
  errEl.style.color = '';
  errEl.textContent = 'Envoi en cours...';
  const result = await requestPasswordReset(email);
  if (!result.ok) {
    errEl.style.color = '';
    errEl.textContent = result.error || 'Erreur lors de l\'envoi.';
    return;
  }
  errEl.style.color = 'var(--green-text,#2e7d32)';
  errEl.textContent = 'Email envoyé ! Consultez votre boîte mail.';
}

/* ── Overlay reset de mot de passe (depuis lien email) ── */
function _showResetOverlay() {
  document.getElementById('AuthS').style.display = 'none';
  document.getElementById('pwdResetOverlay').style.display = 'flex';
  document.getElementById('pwdResetNew').value = '';
  document.getElementById('pwdResetConfirm').value = '';
  document.getElementById('pwdResetError').textContent = '';
  document.getElementById('pwdResetSuccess').textContent = '';
  buildPwdChecklist('pwdResetChecklist');
  updatePwdChecklist('pwdResetChecklist', '');
}

window.pwdResetInput = function() {
  updatePwdChecklist('pwdResetChecklist', document.getElementById('pwdResetNew').value);
};

function pwdResetCancel() {
  document.getElementById('pwdResetOverlay').style.display = 'none';
  document.getElementById('AuthS').style.display = 'flex';
}

async function pwdResetSubmit() {
  const newPwd  = document.getElementById('pwdResetNew').value;
  const confirm = document.getElementById('pwdResetConfirm').value;
  const errEl   = document.getElementById('pwdResetError');
  const succEl  = document.getElementById('pwdResetSuccess');
  const btn     = document.getElementById('pwdResetBtn');
  errEl.textContent = ''; succEl.textContent = '';
  if (!newPwd || !confirm)       { errEl.textContent = 'Remplissez tous les champs.'; return; }
  if (!validatePassword(newPwd)) { errEl.textContent = 'Le mot de passe ne respecte pas tous les critères.'; return; }
  if (newPwd !== confirm)        { errEl.textContent = 'Les mots de passe ne correspondent pas.'; return; }
  btn.disabled = true; btn.textContent = 'Modification...';
  const result = await handlePasswordReset(newPwd);
  btn.disabled = false; btn.textContent = 'Enregistrer';
  if (!result.ok) { errEl.textContent = result.error || 'Erreur lors de la réinitialisation.'; return; }
  succEl.textContent = 'Mot de passe modifié ! Reconnectez-vous.';
  setTimeout(() => {
    document.getElementById('pwdResetOverlay').style.display = 'none';
    _showLogin();
    /* Nettoyer le hash de l'URL */
    history.replaceState(null, '', window.location.pathname);
  }, 2000);
}

async function doLogout() {
  /* v1.4.8 : overlay de confirmation à la place du confirm() natif */
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:14px;padding:24px 28px;max-width:320px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);text-align:center;">' +
    '<div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Se déconnecter ?</div>' +
    '<div style="font-size:13px;color:var(--text-hint);margin-bottom:20px;">Votre session sera fermée.</div>' +
    '<div style="display:flex;gap:10px;justify-content:center;">' +
    '<button id="_logoutCancel" style="flex:1;padding:10px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-main);font-size:14px;cursor:pointer;">Annuler</button>' +
    '<button id="_logoutConfirm" style="flex:1;padding:10px;border:none;border-radius:10px;background:#C82D2D;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Déconnexion</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#_logoutCancel').onclick  = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#_logoutConfirm').onclick = async () => {
    overlay.remove();
    await logout();
    _showLogin();
  };
}

function _showLogin() {
  document.getElementById('AuthS').style.display  = 'flex';
  document.getElementById('SS').style.display     = 'none';
  document.getElementById('MS').style.display     = 'none';
  document.getElementById('ES').style.display     = 'none';
  document.getElementById('HistS').style.display  = 'none';
  document.getElementById('AdminS').style.display = 'none';
  document.getElementById('authEmail').value       = '';
  document.getElementById('authPassword').value    = '';
  document.getElementById('authError').textContent = '';
}

function _showApp() {
  document.getElementById('AuthS').style.display = 'none';
  document.getElementById('SS').style.display    = 'flex';
  _updateUserBadge();
  _renderLastMatchCard();
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
  const logsBtn  = document.getElementById('btnLogs');
  badge.textContent = getEmail() || '';
  adminBtn.style.display = isAdmin() ? 'inline-block' : 'none';
  /* v1.3.6 : bouton Logs réservé aux admins connectés */
  if (logsBtn) logsBtn.style.display = isAdmin() ? 'inline-block' : 'none';
}

/* ════════════════════════════════════════
   MINI-CARD DERNIER MATCH + SYNC (v1.4.8)
════════════════════════════════════════ */
async function _renderLastMatchCard() {
  const card = document.getElementById('lastMatchCard');
  if (!card) return;

  /* Tenter de récupérer le dernier match depuis Supabase */
  if (isLoggedIn()) {
    try {
      const result = await fetchMatches();
      if (result.ok && result.matches.length) {
        const m = result.matches[0]; // déjà trié created_at desc
        document.getElementById('lastMatchTitle').textContent  = m.equipe_a + ' vs ' + m.equipe_b;
        document.getElementById('lastMatchMeta').textContent   = (m.competition || '') + (m.competition && m.date_match ? ' · ' : '') + (m.date_match || '');
        document.getElementById('lastMatchScore').textContent  = m.score_a + ' : ' + m.score_b;
        /* Indicateur de sync */
        const syncEl = document.getElementById('syncIndicator');
        if (syncEl) {
          syncEl.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#3BA711;display:inline-block;"></span><span style="color:#3BA711;">Synchronisé</span>';
        }
        card.style.display = 'flex';
        return;
      }
    } catch(e) { /* silencieux */ }
  }

  /* Fallback localStorage */
  try {
    const raw = localStorage.getItem('arbitres_hb_history');
    const hist = raw ? JSON.parse(raw) : [];
    if (hist.length) {
      const m = hist[0];
      document.getElementById('lastMatchTitle').textContent  = (m.S?.tA || '') + ' vs ' + (m.S?.tB || '');
      document.getElementById('lastMatchMeta').textContent   = m.S?.mDate || '';
      document.getElementById('lastMatchScore').textContent  = (m.S?.sA ?? '') + ' : ' + (m.S?.sB ?? '');
      const syncEl = document.getElementById('syncIndicator');
      if (syncEl) {
        syncEl.innerHTML = isLoggedIn()
          ? '<span style="width:7px;height:7px;border-radius:50%;background:#EDCF00;display:inline-block;"></span><span style="color:#EDCF00;">Non synchronisé</span>'
          : '<span style="width:7px;height:7px;border-radius:50%;background:#aaa;display:inline-block;"></span><span style="color:#aaa;">Local</span>';
      }
      card.style.display = 'flex';
    }
  } catch(e) { /* silencieux */ }
}

/* ════════════════════════════════════════
   CHANGELOG / BADGE VERSION (v1.4.8)
════════════════════════════════════════ */
const CHANGELOG = [
  { v: '1.4.8', items: ['Mini-card dernier match sur l\'accueil', 'Indicateur de synchronisation', 'Tri et filtres dans l\'historique', 'Déconnexion sans popup natif', 'Badge version avec nouveautés'] },
  { v: '1.4.6', items: ['Invitation utilisateur par email', 'Badge d\'activité utilisateur', 'Rôle modifiable en ligne', 'Toast notifications', 'Recherche dans la liste admin'] },
  { v: '1.4.4', items: ['Mot de passe oublié par email', 'Overlay de réinitialisation sécurisé'] },
];

window.showChangelog = function() {
  const existing = document.getElementById('_changelogOverlay');
  if (existing) { existing.remove(); return; }
  const overlay = document.createElement('div');
  overlay.id = '_changelogOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  const items = CHANGELOG.map(entry =>
    '<div style="margin-bottom:14px;">' +
    '<div style="font-size:13px;font-weight:700;color:var(--blue-main);margin-bottom:5px;">v' + entry.v + '</div>' +
    entry.items.map(i => '<div style="font-size:13px;color:var(--text-main);display:flex;gap:6px;margin-bottom:3px;"><span style="color:var(--green-text,#3BA711);">✓</span>' + i + '</div>').join('') +
    '</div>'
  ).join('');
  overlay.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:14px;padding:24px;max-width:360px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25);">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
    '<div style="font-size:16px;font-weight:700;color:var(--text-main);">Nouveautés</div>' +
    '<button onclick="document.getElementById(\'_changelogOverlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-hint);">✕</button>' +
    '</div>' + items + '</div>';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
};

/* ════════════════════════════════════════
   POLITIQUE DE MOT DE PASSE
════════════════════════════════════════ */
const PWD_RULES = [
  { id: 'len',     test: p => p.length >= 8,          label: '8 caract\u00e8res minimum' },
  { id: 'upper',   test: p => /[A-Z]/.test(p),        label: 'Au moins une majuscule' },
  { id: 'lower',   test: p => /[a-z]/.test(p),        label: 'Au moins une minuscule' },
  { id: 'digit',   test: p => /[0-9]/.test(p),        label: 'Au moins un chiffre' },
  { id: 'special', test: p => /[^A-Za-z0-9]/.test(p), label: 'Au moins un caract\u00e8re sp\u00e9cial' }
];

function validatePassword(pwd) { return PWD_RULES.every(r => r.test(pwd)); }

function buildPwdChecklist(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = PWD_RULES.map(r =>
    '<div id="pwdrule_' + containerId + '_' + r.id + '" style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-hint);transition:color .2s;">' +
    '<span class="pwd-check-icon" style="font-size:14px;">\u25CB</span><span>' + r.label + '</span></div>'
  ).join('');
}

function updatePwdChecklist(containerId, pwd) {
  PWD_RULES.forEach(r => {
    const row = document.getElementById('pwdrule_' + containerId + '_' + r.id);
    if (!row) return;
    const ok = r.test(pwd);
    const icon = row.querySelector('.pwd-check-icon');
    icon.textContent = ok ? '\u2713' : '\u25CB';
    row.style.color  = ok ? 'var(--green-text)' : 'var(--text-hint)';
    icon.style.fontWeight = ok ? '700' : '400';
  });
}

/* ════════════════════════════════════════
   CHANGEMENT DE MOT DE PASSE
════════════════════════════════════════ */
async function changePasswordUI() {
  const overlay = document.getElementById('pwdChangeOverlay');
  overlay.style.display = 'flex';
  document.getElementById('pwdCurrent').value       = '';
  document.getElementById('pwdNew').value           = '';
  document.getElementById('pwdConfirm').value       = '';
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
  const current    = document.getElementById('pwdCurrent').value;
  const newPwd     = document.getElementById('pwdNew').value;
  const confirmPwd = document.getElementById('pwdConfirm').value;
  const errEl      = document.getElementById('pwdError');
  const succEl     = document.getElementById('pwdSuccess');
  const btn        = document.getElementById('pwdSubmitBtn');

  errEl.textContent = ''; succEl.textContent = '';
  if (!current || !newPwd || !confirmPwd) { errEl.textContent = 'Remplissez tous les champs.'; return; }
  if (!validatePassword(newPwd))          { errEl.textContent = 'Le mot de passe ne respecte pas tous les crit\u00e8res.'; return; }
  if (newPwd !== confirmPwd)              { errEl.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
  if (current === newPwd)                 { errEl.textContent = 'Le nouveau mot de passe doit \u00eatre diff\u00e9rent de l\'actuel.'; return; }

  btn.disabled = true; btn.textContent = 'Modification...';
  const result = await changePassword(current, newPwd);
  btn.disabled = false; btn.textContent = 'Modifier';

  if (!result.ok) { errEl.textContent = result.error || 'Erreur lors du changement.'; return; }
  succEl.textContent = 'Mot de passe modifi\u00e9 avec succ\u00e8s.';
  setTimeout(() => { document.getElementById('pwdChangeOverlay').style.display = 'none'; }, 1500);
};

/* ════════════════════════════════════════
   ESPACE ADMIN
════════════════════════════════════════ */
async function openAdmin() {
  document.getElementById('SS').style.display     = 'none';
  document.getElementById('AdminS').style.display = 'flex';
  /* Réinitialiser le formulaire création */
  const searchEl  = document.getElementById('adminUserSearch');
  const inviteEl  = document.getElementById('adminModeInvite');
  if (searchEl)  searchEl.value    = '';
  if (inviteEl) { inviteEl.checked = false; window.adminToggleMode(); }
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

/* \u2500\u2500 Toast notifications \u2500\u2500 */
function _showToast(msg, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'var(--green-bg,#3BA711)' : type === 'error' ? 'var(--red-bg,#C82D2D)' : '#555';
  toast.style.cssText = 'background:' + bg + ';color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.25);opacity:0;transition:opacity .2s;max-width:280px;';
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

/* \u2500\u2500 Chargement des matchs par user (pour compteur) \u2500\u2500 */
let _adminMatchCounts = {};

async function _renderAdminUsers(searchQuery = '') {
  const list  = document.getElementById('adminUserList');
  const errEl = document.getElementById('adminListError');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-hint);">Chargement...</div>';
  errEl.textContent = '';

  const [usersResult, matchesResult] = await Promise.all([adminGetUsers(), fetchMatchesAdmin()]);

  if (!usersResult.ok) { errEl.textContent = usersResult.error; list.innerHTML = ''; return; }

  /* Comptage matchs par user_id */
  if (matchesResult.ok) {
    _adminMatchCounts = {};
    (matchesResult.matches || []).forEach(m => {
      _adminMatchCounts[m.user_id] = (_adminMatchCounts[m.user_id] || 0) + 1;
    });
  }

  let users = usersResult.users;

  /* Filtre recherche */
  const q = searchQuery.toLowerCase().trim();
  if (q) users = users.filter(u => u.email.toLowerCase().includes(q));

  document.getElementById('adminUserCount').textContent = users.length + '/' + usersResult.users.length + ' utilisateur(s)';

  const now = Date.now();
  list.innerHTML = users.map(u => {
    const lastAt  = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
    const lastLogin = lastAt
      ? lastAt.toLocaleDateString('fr-FR') + ' ' + lastAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : 'Jamais';
    /* Badge activit\u00e9 : vert si <7j, orange si <30j, gris sinon */
    const diffDays = lastAt ? (now - lastAt.getTime()) / 86400000 : Infinity;
    const actColor = diffDays < 7 ? '#3BA711' : diffDays < 30 ? '#EDCF00' : '#aaa';
    const actLabel = diffDays < 7 ? 'Actif' : diffDays < 30 ? 'R\u00e9cent' : 'Inactif';
    const isMe   = u.email === getEmail();
    const eEmail = escapeHtml(u.email);
    const eRole  = escapeHtml(u.role || 'user');
    const eId    = escapeHtml(u.id);
    const nbMatchs = _adminMatchCounts[u.id] || 0;
    return '<div class="admin-user-row">' +
      '<div class="admin-user-info">' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
      '<span class="admin-user-email">' + eEmail + '</span>' +
      '<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:' + actColor + ';">' +
        '<span style="width:7px;height:7px;border-radius:50%;background:' + actColor + ';display:inline-block;"></span>' + actLabel +
      '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap;">' +
      /* Dropdown r\u00f4le modifiable */
      (!isMe
        ? '<select onchange="adminChangeRole(\'' + eId + '\',this.value)" style="font-size:12px;padding:2px 6px;border-radius:6px;border:1px solid var(--border-input);background:var(--bg-input);color:var(--text-main);cursor:pointer;">' +
          '<option value="user"' + (eRole === 'user' ? ' selected' : '') + '>Utilisateur</option>' +
          '<option value="admin"' + (eRole === 'admin' ? ' selected' : '') + '>Administrateur</option>' +
          '</select>'
        : '<span class="admin-role-badge role-admin">admin (vous)</span>'
      ) +
      '<span style="font-size:11px;color:var(--text-hint);">' + nbMatchs + ' match(s)</span>' +
      '</div>' +
      '<span class="admin-user-meta">Derni\u00e8re connexion\u00a0: ' + lastLogin + '</span>' +
      '</div>' +
      '<div class="admin-user-actions">' +
      '<button class="btn-act" onclick="adminResetPassword(\'' + eId + '\')" title="R\u00e9initialiser le mot de passe">Mot de passe</button>' +
      (!isMe ? '<button class="btn-act btn-danger" onclick="adminDeleteUser(\'' + eId + '\', \'' + eEmail + '\')">Supprimer</button>' : '') +
      '</div></div>';
  }).join('') || '<div style="text-align:center;padding:20px;color:var(--text-hint);">Aucun r\u00e9sultat.</div>';
}

async function adminChangeRole(userId, newRole) {
  const result = await adminUpdateRole(userId, newRole);
  if (!result.ok) { _showToast('Erreur\u00a0: ' + result.error, 'error'); return; }
  _showToast('R\u00f4le mis \u00e0 jour.', 'success');
}

async function adminSubmitUser() {
  const email    = document.getElementById('newUserEmail').value.trim();
  const role     = document.getElementById('newUserRole').value;
  const errEl    = document.getElementById('adminCreateError');
  const btn      = document.getElementById('adminCreateBtn');
  const modeInvite = document.getElementById('adminModeInvite')?.checked;

  if (!email) { errEl.textContent = 'Saisissez un email.'; return; }
  errEl.textContent = '';

  if (modeInvite) {
    /* Mode invitation : l'utilisateur d\u00e9finit son mot de passe via email */
    btn.disabled = true; btn.textContent = 'Invitation...';
    const result = await adminInviteUser(email, role);
    btn.disabled = false; btn.textContent = 'Inviter / Cr\u00e9er';
    if (!result.ok) { errEl.textContent = result.error; return; }
    document.getElementById('newUserEmail').value = '';
    _showToast('Invitation envoy\u00e9e \u00e0 ' + email, 'success');
  } else {
    const password = document.getElementById('newUserPassword').value;
    if (!password) { errEl.textContent = 'Saisissez un mot de passe.'; return; }
    if (!validatePassword(password)) { errEl.textContent = 'Le mot de passe ne respecte pas la politique de s\u00e9curit\u00e9.'; return; }
    btn.disabled = true; btn.textContent = 'Cr\u00e9ation...';
    const result = await adminCreateUser(email, password, role);
    btn.disabled = false; btn.textContent = 'Inviter / Cr\u00e9er';
    if (!result.ok) { errEl.textContent = result.error; return; }
    document.getElementById('newUserEmail').value    = '';
    document.getElementById('newUserPassword').value = '';
    _showToast('Compte cr\u00e9\u00e9 pour ' + email, 'success');
  }
  await _renderAdminUsers();
}

async function adminDeleteUserUI(id, email) {
  if (!confirm('Supprimer le compte de ' + email + ' ?\nSes matchs seront \u00e9galement supprim\u00e9s.')) return;
  const result = await adminDeleteUser(id);
  if (!result.ok) { _showToast('Erreur\u00a0: ' + result.error, 'error'); return; }
  _showToast('Compte supprim\u00e9.', 'success');
  await _renderAdminUsers();
}

async function adminResetPasswordUI(id) {
  const pwd = prompt('Nouveau mot de passe pour cet utilisateur\u00a0:');
  if (!pwd) return;
  if (!validatePassword(pwd)) {
    _showToast('Mot de passe invalide (8 car., maj., min., chiffre, sp\u00e9cial).', 'error');
    return;
  }
  const result = await adminResetPassword(id, pwd);
  if (!result.ok) { _showToast('Erreur\u00a0: ' + result.error, 'error'); return; }
  _showToast('Mot de passe r\u00e9initialis\u00e9.', 'success');
}

/* ── Erreurs globales ── */
window.addEventListener('error', e => {
  log.error('GLOBAL', 'js_erreur_non_geree', { message: e.message, source: e.filename, ligne: e.lineno });
});
window.addEventListener('unhandledrejection', e => {
  log.error('GLOBAL', 'promise_rejetee_non_geree', { message: e.reason?.message || String(e.reason) });
});

/* ── Filets sécurité fermeture (BUG-2 v0.3.20) ── */
window.App.setMatchActif = function() { S.matchActif = true; };
function _hasMatchData() { return S.matchActif === true; }

window.addEventListener('beforeunload', () => {
  if (!_hasMatchData()) return;
  try { flushAutosave(); } catch (e) {}
  try { autosave(); } catch (e) {}
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (!_hasMatchData()) return;
    try { flushAutosave(); } catch (e) {}
    try { autosave(); } catch (e) {}
  }
});

/* ── Initialisation ── */
window.addEventListener('load', async () => {
  log.info('LIFECYCLE', 'app_initialisee', { version: APP_VERSION });

  document.querySelectorAll('.copyright-bar').forEach(el => {
    /* v1.4.8 : la copyright-bar contient d\u00e9sormais des boutons fixes en HTML.
       On met \u00e0 jour uniquement le span texte si pr\u00e9sent, sinon on reconstruit. */
    const vLabel = el.querySelector('#versionLabel');
    if (vLabel) {
      vLabel.textContent = APP_VERSION;
    } else {
      /* Fallback : reconstruction compl\u00e8te (autres copyright-bar sans boutons) */
      const btn = el.querySelector('button');
      el.innerHTML = '\u00a9 ' + APP_YEAR + ' <strong>' + APP_AUTHOR + '</strong>' +
        ' \u2014 Tous droits r\u00e9serv\u00e9s \u2014 <span style="opacity:.6;font-size:.9em;">v' + APP_VERSION + '</span>';
      if (btn) el.appendChild(btn);
    }
  });
  document.querySelectorAll('.copyright-bar-inline').forEach(el => {
    el.style.cssText = 'font-size:10px;color:#bbb;text-align:center;padding:4px 0;';
    el.innerHTML = '\u00a9 ' + APP_YEAR + ' <strong style="color:#999;">' + APP_AUTHOR + '</strong>' +
      ' \u2014 <span style="opacity:.6;">v' + APP_VERSION + '</span>';
  });

  const saved       = localStorage.getItem('arbitres_hb_theme');
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyTheme(saved === 'dark' || (!saved && prefersDark), false);
  document.documentElement.classList.remove('dark-init');
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('arbitres_hb_theme')) applyTheme(e.matches, false);
  });

  document.getElementById('rMin').addEventListener('input', function () {
    if (this.value.length >= 2) document.getElementById('rSec').focus();
  });
  document.getElementById('detailOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('detailOverlay')) closeDetail();
    if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
  });

  /* v1.4.4 : détecter le token de reset AVANT initAuth (le SDK le consomme) */
  const hash = window.location.hash;
  const isRecovery = hash.includes('type=recovery');

  /* v1.1.0 : restauration de session Supabase avant décision login/app */
  await initAuth();

  if (isRecovery) {
    /* Le SDK a établi une session temporaire avec le token — on peut appeler updateUser */
    _showResetOverlay();
  } else if (isLoggedIn()) {
    _showApp();
  } else {
    _showLogin();
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => log.info('SW', 'service_worker_enregistre'))
    .catch(e  => log.error('SW', 'service_worker_erreur', { message: e.message }));

  let _updateBannerShown = false;
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'APP_UPDATE_AVAILABLE') {
      log.info('SW', 'update_disponible');
      if (_updateBannerShown) return;
      _updateBannerShown = true;
      if (document.getElementById('swUpdateBanner')) return;
      const banner = document.createElement('div');
      banner.id = 'swUpdateBanner';
      banner.className = 'sw-update-banner';
      banner.innerHTML =
        '<span class="sw-update-text">Une nouvelle version de l\'application est disponible.</span>' +
        '<button class="sw-update-btn" id="swUpdateReload">Recharger</button>' +
        '<button class="sw-update-close" id="swUpdateDismiss" title="Plus tard">&times;</button>';
      document.body.appendChild(banner);
      document.getElementById('swUpdateReload').addEventListener('click', () => { log.info('SW','update_reload_demande'); window.location.reload(); });
      document.getElementById('swUpdateDismiss').addEventListener('click', () => { log.info('SW','update_reload_differe'); banner.remove(); });
    }
  });
}
