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
import { startMatch, endMatch, backMatch, goHome, goHomeFromEnd } from './match.js';
import { pad, escapeHtml } from './utils.js';
import { S } from './state.js';
import { log, exportLogs } from './logger.js';
import { APP_VERSION, APP_YEAR, APP_AUTHOR } from './version.js';
import { initAuth, isLoggedIn, isAdmin, getEmail, getRole, getDisplayName, login, logout,
         changePassword, requestPasswordReset, handlePasswordReset,
         adminGetUsers, adminCreateUser, adminInviteUser, adminUpdateRole, adminUpdateUser,
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
  startMatch, endMatch, backMatch, goHome, goHomeFromEnd,
  exportLogs, isLoggedIn, isAdmin, getEmail, getRole, getDisplayName, logout,
  getCurrentUserId: () => { try { return window._supabaseSession?.user?.id || null; } catch(e) { return null; } }
};

/* ── Exposition window ── */
window.startMatch          = startMatch;
window.endMatch            = endMatch;
window.backMatch           = backMatch;
window.goHome              = goHome;
window.goHomeFromEnd       = goHomeFromEnd;
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
  document.getElementById('HomeS').style.display  = 'none';
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
  document.getElementById('AuthS').style.display  = 'none';
  document.getElementById('HomeS').style.display  = 'flex';
  _updateUserBadge();
  checkResume();
  renderHomeScreen();
}

/* ════════════════════════════════════════
   PAGE DE GARDE (v1.4.9)
════════════════════════════════════════ */

/* Filtres internes pour la page de garde */
let _homeFilterComp = '';
let _homeSortBy = 'date_desc';

window.applyHomeFilters = function() {
  _homeFilterComp = (document.getElementById('homeFilterComp')?.value || '').toLowerCase().trim();
  _homeSortBy = document.getElementById('homeSortBy')?.value || 'date_desc';
  renderHomeScreen();
};

window.clearHomeFilters = function() {
  const compEl = document.getElementById('homeFilterComp');
  const sortEl = document.getElementById('homeSortBy');
  if (compEl) compEl.value = '';
  if (sortEl) sortEl.value = 'date_desc';
  _homeFilterComp = '';
  _homeSortBy = 'date_desc';
  renderHomeScreen();
};

async function renderHomeScreen() {
  const list    = document.getElementById('homeHistList');
  const countEl = document.getElementById('homeHistCount');
  const statsEl = document.getElementById('homeStats');
  if (!list) return;

  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-hint);font-size:13px;">Chargement...</div>';

  let matches = [];
  let remote  = false;
  let syncLabel = '';

  if (isLoggedIn()) {
    try {
      const result = await fetchMatches();
      if (result.ok) {
        matches = result.matches || [];
        remote  = true;
        syncLabel = '<span style="width:7px;height:7px;border-radius:50%;background:#3BA711;display:inline-block;margin-right:4px;"></span>Synchronisé';
      }
    } catch(e) { /* silencieux */ }
  }

  if (!remote) {
    /* Fallback localStorage */
    try {
      const raw = localStorage.getItem('arbitres_hb_history');
      const hist = raw ? JSON.parse(raw) : [];
      matches = hist.map(h => ({
        id:          h.id,
        equipe_a:    h.S?.tA || '',
        equipe_b:    h.S?.tB || '',
        score_a:     h.S?.sA ?? 0,
        score_b:     h.S?.sB ?? 0,
        date_match:  h.S?.mDate || '',
        competition: h.S?.mComp || '',
        arbitre1:    h.S?.a1 || '',
        arbitre2:    h.S?.a2 || '',
        _local:      true
      }));
      syncLabel = '<span style="width:7px;height:7px;border-radius:50%;background:#aaa;display:inline-block;margin-right:4px;"></span>Local';
    } catch(e) { /* silencieux */ }
  }

  /* Filtre compétition */
  let filtered = matches;
  if (_homeFilterComp) {
    filtered = matches.filter(m => {
      const q = _homeFilterComp;
      return (m.competition || '').toLowerCase().includes(q) ||
             (m.arbitre1   || '').toLowerCase().includes(q) ||
             (m.arbitre2   || '').toLowerCase().includes(q) ||
             (m.equipe_a   || '').toLowerCase().includes(q) ||
             (m.equipe_b   || '').toLowerCase().includes(q);
    });
  }

  /* Tri */
  if (_homeSortBy === 'date_asc')    filtered = [...filtered].sort((a,b) => (a.date_match||'').localeCompare(b.date_match||''));
  else if (_homeSortBy === 'date_desc')   filtered = [...filtered].sort((a,b) => (b.date_match||'').localeCompare(a.date_match||''));
  else if (_homeSortBy === 'score_desc')  filtered = [...filtered].sort((a,b) => ((b.score_a||0)+(b.score_b||0)) - ((a.score_a||0)+(a.score_b||0)));
  else if (_homeSortBy === 'competition') filtered = [...filtered].sort((a,b) => (a.competition||'').localeCompare(b.competition||''));

  /* Stats */
  if (statsEl && matches.length) {
    const totalGoals = matches.reduce((s, m) => s + (m.score_a||0) + (m.score_b||0), 0);
    const comps = [...new Set(matches.map(m => m.competition).filter(Boolean))];
    statsEl.innerHTML =
      '<div class="home-stat-card"><div class="home-stat-val">' + matches.length + '</div><div class="home-stat-lbl">matchs</div></div>' +
      '<div class="home-stat-card"><div class="home-stat-val">' + (matches.length ? Math.round(totalGoals / matches.length) : 0) + '</div><div class="home-stat-lbl">buts moy.</div></div>' +
      '<div class="home-stat-card"><div class="home-stat-val">' + comps.length + '</div><div class="home-stat-lbl">compétition(s)</div></div>' +
      (syncLabel ? '<div class="home-stat-card home-stat-sync">' + syncLabel + '</div>' : '');
  } else if (statsEl) {
    statsEl.innerHTML = '';
  }

  /* Compteur */
  if (countEl) {
    countEl.textContent = filtered.length + (filtered.length !== matches.length ? ' / ' + matches.length : '') + ' match(s)';
  }

  /* Rendu liste */
  if (!filtered.length) {
    list.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--text-hint);font-size:13px;">Aucun match enregistré.<br>Cliquez sur <strong>+ Nouveau match</strong> pour commencer.</div>';
    return;
  }

  list.innerHTML = filtered.map(m => {
    const id    = String(m.id || '');
    const isLoc = !!m._local;
    const eA    = escapeHtml(m.equipe_a || '');
    const eB    = escapeHtml(m.equipe_b || '');
    const date  = m.date_match ? m.date_match.split('-').reverse().join('/') : '';
    const comp  = escapeHtml(m.competition || '');
    const arbs  = [m.arbitre1, m.arbitre2].filter(Boolean).map(escapeHtml).join(' & ');
    return '<div class="home-match-card">' +
      '<div class="home-match-main">' +
        '<div class="home-match-teams">' + eA + ' <span style="color:var(--text-hint);">vs</span> ' + eB + '</div>' +
        '<div class="home-match-score">' + (m.score_a||0) + ' : ' + (m.score_b||0) + '</div>' +
      '</div>' +
      '<div class="home-match-meta">' +
        (date ? '<span>' + date + '</span>' : '') +
        (comp ? '<span>' + comp + '</span>' : '') +
        (arbs ? '<span style="color:var(--text-hint);">' + arbs + '</span>' : '') +
      '</div>' +
      '<div class="home-match-actions">' +
        '<button class="btn-act prim" onclick="' + (isLoc ? 'window.App.reexportPDF(' + id + ')' : 'window.App.reexportPDFRemote(\'' + id + '\')') + '">PDF</button>' +
        '<button class="btn-act" onclick="' + (isLoc ? 'window.App.deleteHistory(' + id + ')' : 'window.App.deleteHistoryRemote(\'' + id + '\')') + '">Supprimer</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* Ouvrir le formulaire nouveau match */
function openNewMatch() {
  document.getElementById('HomeS').style.display = 'none';
  document.getElementById('SS').style.display    = 'flex';
  /* Pré-remplir date/heure courante */
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
window.openNewMatch = openNewMatch;
window._renderHomeScreenFn = renderHomeScreen;

function _updateUserBadge() {
  const display  = getDisplayName() || getEmail() || '';
  const admin    = isAdmin();

  /* Badge HomeS */
  const homeBadge    = document.getElementById('homeUserBadge');
  const homeBtnAdmin = document.getElementById('homeBtnAdmin');
  const homeBtnLogs  = document.getElementById('homeBtnLogs');
  if (homeBadge)    homeBadge.textContent = display;
  if (homeBtnAdmin) homeBtnAdmin.style.display = admin ? 'inline-block' : 'none';
  if (homeBtnLogs)  homeBtnLogs.style.display  = admin ? 'inline-block' : 'none';

  /* Badge SS (garde pour compatibilité) */
  const badge = document.getElementById('userBadge');
  if (badge) badge.textContent = display;
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
  { v: '1.4.11', items: [
    'Overlay de confirmation pour retour accueil depuis le suivi (plus de popup natif)',
    'Alerte non-bloquante si champs équipes/arbitres vides avant démarrage',
    'Bouton "← Accueil" sur l\'écran de fin — sauvegarde automatique dans l\'historique',
    'Timestamp de la dernière sauvegarde automatique (info-bulle sur le point vert)',
    'Recherche multi-champs dans l\'historique (arbitre, équipe, compétition)',
    'Nom et prénom des arbitres dans le badge et la liste admin',
    'Édition inline des utilisateurs depuis l\'espace admin (nom, prénom, email)',
    'Raccourcis clavier : Entrée pour se connecter, Échap pour fermer les overlays',
    'Gestes de swipe gauche/droite pour naviguer entre les écrans',
    'Toast de confirmation après export PDF réussi ou erreur',
  ]},
  { v: '1.4.10', items: ['Recherche multi-champs sur la page d\'accueil (compétition, arbitres, équipes)', 'Suppression des icônes loupe dans les champs de recherche'] },
  { v: '1.4.9', items: ['Page de garde avec historique et statistiques', 'Bouton "+ Nouveau match" depuis l\'accueil', 'Filtres et tri sur la page de garde', 'Navigation simplifiée entre les écrans'] },
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
  document.getElementById('HomeS').style.display  = 'none';
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
  document.getElementById('HomeS').style.display  = 'flex';
  if (typeof window._renderHomeScreenFn === 'function') window._renderHomeScreenFn();
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

  /* Filtre recherche — email + nom + prénom */
  const q = searchQuery.toLowerCase().trim();
  if (q) users = users.filter(u =>
    u.email.toLowerCase().includes(q) ||
    (u.first_name || '').toLowerCase().includes(q) ||
    (u.last_name  || '').toLowerCase().includes(q)
  );

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
    const isMe      = u.email === getEmail();
    const eEmail    = escapeHtml(u.email);
    const eRole     = escapeHtml(u.role || 'user');
    const eId       = escapeHtml(u.id);
    const eFn       = escapeHtml(u.first_name || '');
    const eLn       = escapeHtml(u.last_name  || '');
    const fullName  = (eFn + ' ' + eLn).trim();
    const nbMatchs  = _adminMatchCounts[u.id] || 0;
    const editId    = 'adminEdit_' + eId;
    return '<div class="admin-user-row" id="row_' + eId + '">' +
      '<div class="admin-user-info">' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
      (fullName ? '<span style="font-size:13px;font-weight:600;color:var(--text-main);">' + fullName + '</span>' : '') +
      '<span class="admin-user-email" style="font-size:12px;color:var(--text-hint);">' + eEmail + '</span>' +
      '<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:' + actColor + ';">' +
        '<span style="width:7px;height:7px;border-radius:50%;background:' + actColor + ';display:inline-block;"></span>' + actLabel +
      '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap;">' +
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
      /* Formulaire \u00e9dition inline (cach\u00e9 par d\u00e9faut) */
      '<div id="' + editId + '" style="display:none;margin-top:10px;background:var(--bg-input);border-radius:10px;padding:12px;display:none;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
          '<div><label style="font-size:11px;color:var(--text-hint);display:block;margin-bottom:3px;">Pr\u00e9nom</label>' +
          '<input id="' + editId + '_fn" type="text" value="' + eFn + '" style="width:100%;padding:7px 10px;border:1px solid var(--border-input);border-radius:8px;background:var(--bg-card);color:var(--text-main);font-size:13px;font-family:inherit;box-sizing:border-box;"></div>' +
          '<div><label style="font-size:11px;color:var(--text-hint);display:block;margin-bottom:3px;">Nom</label>' +
          '<input id="' + editId + '_ln" type="text" value="' + eLn + '" style="width:100%;padding:7px 10px;border:1px solid var(--border-input);border-radius:8px;background:var(--bg-card);color:var(--text-main);font-size:13px;font-family:inherit;box-sizing:border-box;"></div>' +
        '</div>' +
        '<div style="margin-bottom:8px;"><label style="font-size:11px;color:var(--text-hint);display:block;margin-bottom:3px;">Email</label>' +
        '<input id="' + editId + '_email" type="text" value="' + eEmail + '" style="width:100%;padding:7px 10px;border:1px solid var(--border-input);border-radius:8px;background:var(--bg-card);color:var(--text-main);font-size:13px;font-family:inherit;box-sizing:border-box;"></div>' +
        '<div id="' + editId + '_err" style="font-size:12px;color:var(--red-text);min-height:14px;margin-bottom:6px;"></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
          '<button onclick="adminCancelEdit(\'' + eId + '\')" style="padding:7px 14px;border:1px solid var(--border-input);border-radius:8px;background:transparent;color:var(--text-sub);font-size:13px;cursor:pointer;">Annuler</button>' +
          '<button onclick="adminSaveUser(\'' + eId + '\')" style="padding:7px 14px;border:none;border-radius:8px;background:var(--blue-main,#1D3A7A);color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Enregistrer</button>' +
        '</div>' +
      '</div>' +
      '</div>' +
      '<div class="admin-user-actions">' +
      '<button class="btn-act" onclick="adminToggleEdit(\'' + eId + '\')" title="Modifier">Modifier</button>' +
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

/* v1.4.11 \u2014 \u00e9dition inline utilisateur */
window.adminToggleEdit = function(userId) {
  const editDiv = document.getElementById('adminEdit_' + userId);
  if (!editDiv) return;
  const isHidden = editDiv.style.display === 'none' || !editDiv.style.display;
  editDiv.style.display = isHidden ? 'block' : 'none';
};

window.adminCancelEdit = function(userId) {
  const editDiv = document.getElementById('adminEdit_' + userId);
  if (editDiv) editDiv.style.display = 'none';
};

window.adminSaveUser = async function(userId) {
  const editId  = 'adminEdit_' + userId;
  const fn      = (document.getElementById(editId + '_fn')?.value    || '').trim();
  const ln      = (document.getElementById(editId + '_ln')?.value    || '').trim();
  const email   = (document.getElementById(editId + '_email')?.value || '').trim();
  const errEl   = document.getElementById(editId + '_err');
  if (!email) { if (errEl) errEl.textContent = 'L\'email est requis.'; return; }
  if (errEl) errEl.textContent = '';
  const result = await adminUpdateUser(userId, { firstName: fn, lastName: ln, email });
  if (!result.ok) { if (errEl) errEl.textContent = result.error; _showToast('Erreur\u00a0: ' + result.error, 'error'); return; }
  _showToast('Utilisateur mis \u00e0 jour.', 'success');
  await _renderAdminUsers(document.getElementById('adminUserSearch')?.value || '');
};

async function adminSubmitUser() {
  const email     = document.getElementById('newUserEmail').value.trim();
  const role      = document.getElementById('newUserRole').value;
  const firstName = (document.getElementById('newUserFirstName')?.value || '').trim();
  const lastName  = (document.getElementById('newUserLastName')?.value  || '').trim();
  const errEl     = document.getElementById('adminCreateError');
  const btn       = document.getElementById('adminCreateBtn');
  const modeInvite = document.getElementById('adminModeInvite')?.checked;

  if (!email) { errEl.textContent = 'Saisissez un email.'; return; }
  errEl.textContent = '';

  if (modeInvite) {
    /* Mode invitation : l'utilisateur d\u00e9finit son mot de passe via email */
    btn.disabled = true; btn.textContent = 'Invitation...';
    const result = await adminInviteUser(email, role, firstName, lastName);
    btn.disabled = false; btn.textContent = 'Inviter / Cr\u00e9er';
    if (!result.ok) { errEl.textContent = result.error; return; }
    document.getElementById('newUserEmail').value = '';
    if (document.getElementById('newUserFirstName')) document.getElementById('newUserFirstName').value = '';
    if (document.getElementById('newUserLastName'))  document.getElementById('newUserLastName').value  = '';
    _showToast('Invitation envoy\u00e9e \u00e0 ' + email, 'success');
  } else {
    const password = document.getElementById('newUserPassword').value;
    if (!password) { errEl.textContent = 'Saisissez un mot de passe.'; return; }
    if (!validatePassword(password)) { errEl.textContent = 'Le mot de passe ne respecte pas la politique de s\u00e9curit\u00e9.'; return; }
    btn.disabled = true; btn.textContent = 'Cr\u00e9ation...';
    const result = await adminCreateUser(email, password, role, firstName, lastName);
    btn.disabled = false; btn.textContent = 'Inviter / Cr\u00e9er';
    if (!result.ok) { errEl.textContent = result.error; return; }
    document.getElementById('newUserEmail').value    = '';
    document.getElementById('newUserPassword').value = '';
    if (document.getElementById('newUserFirstName')) document.getElementById('newUserFirstName').value = '';
    if (document.getElementById('newUserLastName'))  document.getElementById('newUserLastName').value  = '';
    _showToast('Compte cr\u00e9\u00e9 pour ' + email, 'success');
  }
  await _renderAdminUsers();
}

async function adminDeleteUserUI(id, email) {
  /* v1.4.17 : overlay custom (confirm() natif bloqu\u00e9 sur PWA iOS/Android) */
  await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:14px;padding:24px 28px;max-width:340px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);text-align:center;">' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Supprimer ce compte ?</div>' +
      '<div style="font-size:13px;color:var(--text-hint);margin-bottom:20px;">' + escapeHtml(email) + '<br>Ses matchs seront \u00e9galement supprim\u00e9s.</div>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button id="_adCancel" style="flex:1;padding:10px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-main);font-size:14px;cursor:pointer;">Annuler</button>' +
      '<button id="_adConfirm" style="flex:1;padding:10px;border:none;border-radius:10px;background:#C82D2D;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Supprimer</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#_adCancel').onclick  = () => { overlay.remove(); resolve(false); };
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    overlay.querySelector('#_adConfirm').onclick = () => { overlay.remove(); resolve(true); };
  }).then(async confirmed => {
    if (!confirmed) return;
    const result = await adminDeleteUser(id);
    if (!result.ok) { _showToast('Erreur\u00a0: ' + result.error, 'error'); return; }
    _showToast('Compte supprim\u00e9.', 'success');
    await _renderAdminUsers();
  });
}

async function adminResetPasswordUI(id) {
  /* v1.4.17 : overlay custom avec champ input (prompt() natif bloqu\u00e9 sur PWA iOS/Android) */
  const pwd = await new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:14px;padding:24px 28px;max-width:340px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);">' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:16px;color:var(--text-main);">Nouveau mot de passe</div>' +
      '<input id="_rpwdInput" type="password" placeholder="Minimum 8 caract\u00e8res..." style="width:100%;padding:10px 12px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-main);font-size:15px;font-family:inherit;box-sizing:border-box;margin-bottom:16px;" autocomplete="new-password">' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
      '<button id="_rpCancel" style="padding:10px 18px;border:1px solid var(--border-input);border-radius:10px;background:transparent;color:var(--text-sub);font-size:14px;cursor:pointer;font-family:inherit;">Annuler</button>' +
      '<button id="_rpConfirm" style="padding:10px 18px;border:none;border-radius:10px;background:var(--blue-main,#3799fb);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Valider</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#_rpwdInput');
    setTimeout(() => input.focus(), 50);
    overlay.querySelector('#_rpCancel').onclick  = () => { overlay.remove(); resolve(null); };
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
    overlay.querySelector('#_rpConfirm').onclick = () => { overlay.remove(); resolve(input.value); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { overlay.remove(); resolve(input.value); } });
  });
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

  /* v1.4.9 : versionLabel sur HomeS + fallback autres copyright-bar */
  ['versionLabel', 'homeVersionLabel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = APP_VERSION;
  });
  document.querySelectorAll('.copyright-bar').forEach(el => {
    const vLabel = el.querySelector('#versionLabel, #homeVersionLabel');
    if (vLabel) return; /* d\u00e9j\u00e0 g\u00e9r\u00e9 ci-dessus */
    /* Reconstruction pour les copyright-bar sans boutons (MS, ES) */
    el.innerHTML = '\u00a9 ' + APP_YEAR + ' <strong>' + APP_AUTHOR + '</strong>' +
      ' \u2014 Tous droits r\u00e9serv\u00e9s \u2014 <span style="opacity:.6;font-size:.9em;">v' + APP_VERSION + '</span>';
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
  });
  /* v1.4.17 : listener séparé — confirmOverlay est frère, pas enfant */
  document.getElementById('confirmOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
  });

  /* v1.4.11 : raccourcis clavier */
  document.addEventListener('keydown', e => {
    /* Entrée sur l'écran de connexion → soumettre */
    const authS = document.getElementById('AuthS');
    if (e.key === 'Enter' && authS && authS.style.display !== 'none') {
      const active = document.activeElement;
      if (!active || active.tagName === 'INPUT') { submitLogin(); return; }
    }
    /* Échap → fermer n'importe quel overlay */
    if (e.key === 'Escape') {
      /* Overlays dynamiques */
      const dynOverlays = ['_changelogOverlay', '_matchPreviewOverlay'];
      for (const id of dynOverlays) {
        const el = document.getElementById(id);
        if (el) { el.remove(); return; }
      }
      /* Overlay modale mot de passe */
      const pwdOv = document.getElementById('pwdChangeOverlay');
      if (pwdOv && pwdOv.style.display !== 'none') { pwdOv.style.display = 'none'; return; }
      const pwdReset = document.getElementById('pwdResetOverlay');
      if (pwdReset && pwdReset.style.display !== 'none') { pwdResetCancel(); return; }
      /* Overlay détail observation */
      const detailOv = document.getElementById('detailOverlay');
      if (detailOv && detailOv.classList.contains('open')) { closeDetail(); return; }
    }
  });

  /* v1.4.11 : swipe gauche/droite pour naviguer entre les écrans */
  (function _initSwipe() {
    const SCREENS = ['HomeS', 'SS', 'MS', 'ES', 'HistS'];
    let _startX = 0;
    let _startY = 0;
    document.addEventListener('touchstart', e => {
      _startX = e.changedTouches[0].clientX;
      _startY = e.changedTouches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - _startX;
      const dy = e.changedTouches[0].clientY - _startY;
      /* Ignorer si geste plus vertical qu'horizontal */
      if (Math.abs(dy) > Math.abs(dx) * 0.8) return;
      if (Math.abs(dx) < 60) return; /* seuil minimal 60px */
      /* Trouver l'écran actif */
      const activeId = SCREENS.find(id => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none';
      });
      if (!activeId) return;
      const idx = SCREENS.indexOf(activeId);
      /* Swipe droite → écran précédent */
      if (dx > 0 && idx > 0) {
        const prev = SCREENS[idx - 1];
        if (prev === 'HomeS') goHome();
      }
      /* Swipe gauche → pas de navigation automatique vers un écran suivant
         (évite navigation accidentelle), mais possibilité future */
    });
  })();

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

/* v1.4.11 : expose _showToast pour pdf.js */
window._showToastPDF = _showToast;
