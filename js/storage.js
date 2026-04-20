/* ═══ STORAGE — Persistance locale + synchronisation backend ════════════ */
import { S, ans, KEY_CURRENT, KEY_HISTORY } from './state.js';
import { fmtDate, escapeHtml } from './utils.js';
import { log } from './logger.js';
import { isLoggedIn, isAdmin, getUserId, saveMatchRemote, fetchMatches, fetchMatchesAdmin, fetchMatchById, deleteMatchRemote } from './auth.js';

/* ─────────────────────────────────────────────────────────────────────────
   v0.3.20 (BUG-2) — Filet de sécurité d'autosave
   ─────────────────────────────────────────────────────────────────────────
   _lastSaveAt   : timestamp (ms) du dernier autosave réussi.
                   Mis à jour à chaque écriture localStorage de KEY_CURRENT.
   _safetyTimer  : handle du setInterval qui vérifie périodiquement si un
                   autosave de secours est nécessaire.
   SAFETY_CHECK_MS : intervalle de vérification (5 s). Léger, ne fait
                     qu'une comparaison de timestamps la plupart du temps.
   SAFETY_THRESHOLD_MS : seuil au-delà duquel on déclenche un autosave de
                         secours faute d'activité (30 s).
   Les autosaves "naturels" (observation, score, TME, contexte, MT2,
   advPeriod) restent inchangés ; ils mettent simplement à jour
   _lastSaveAt et donc réinitialisent le filet sans jamais le déclencher
   tant qu'il y a de l'activité.
═════════════════════════════════════════════════════════════════════════ */
let _lastSaveAt  = 0;
let _safetyTimer = null;
const SAFETY_CHECK_MS     = 5000;
const SAFETY_THRESHOLD_MS = 30000;

export function startSafetyAutosave() {
  if (_safetyTimer) return; // déjà actif
  _lastSaveAt = Date.now(); // baseline : on considère qu'on vient de sauver
  _safetyTimer = setInterval(() => {
    try {
      if (Date.now() - _lastSaveAt >= SAFETY_THRESHOLD_MS) {
        log.info('STORAGE', 'autosave_filet_30s', { depuisDernierMs: Date.now() - _lastSaveAt });
        autosave();
      }
    } catch (e) {
      log.error('STORAGE', 'autosave_filet_erreur', { message: e.message });
    }
  }, SAFETY_CHECK_MS);
  log.info('STORAGE', 'filet_autosave_demarre', { thresholdMs: SAFETY_THRESHOLD_MS });
}

export function stopSafetyAutosave() {
  if (!_safetyTimer) return;
  clearInterval(_safetyTimer);
  _safetyTimer = null;
  log.info('STORAGE', 'filet_autosave_arrete');
}

/* ─────────────────────────────────────────────────────────────────────────
   v0.3.24 (FRAG-6) — Détection du quota localStorage
   ─────────────────────────────────────────────────────────────────────────
   Avant v0.3.24, autosave() attrapait silencieusement les QuotaExceeded
   dans son try/catch et se contentait de logger. L'utilisateur croyait
   sauvegarder, mais rien n'était écrit — et il ne le découvrait qu'au
   moment de rouvrir l'app pour constater qu'il avait tout perdu.
   Désormais :
   - L'erreur de quota est détectée spécifiquement et remonte une alerte
     visible à l'utilisateur (via _quotaAlertShown pour ne pas spammer).
   - L'historique des matchs est limité à MAX_HISTORY entrées avec
     rotation automatique des plus anciens (FIFO) pour éviter que le
     localStorage ne se remplisse indéfiniment.
   - La fonction isQuotaExceededError() détecte les différents noms
     d'erreur selon les navigateurs (Chrome, Firefox, Safari).
═════════════════════════════════════════════════════════════════════════ */
/* ─────────────────────────────────────────────────────────────────────────
   v0.3.25 — Indicateur visuel d'autosave dans la topbar
   ─────────────────────────────────────────────────────────────────────────
   Met à jour les deux points colorés (#autosaveDotMS et #autosaveDotES)
   présents dans les topbars des écrans MS et ES. État OK (vert) appliqué
   à chaque autosave réussi, état ERROR (rouge) appliqué quand le quota
   est dépassé ou qu'une autre erreur localStorage survient.
   Volontairement défensif : si les éléments DOM n'existent pas (parce que
   l'utilisateur est sur un autre écran), la fonction ne fait rien.
═════════════════════════════════════════════════════════════════════════ */
function _updateAutosaveDots(state) {
  /* state: 'ok' | 'error' */
  const ids = ['autosaveDotMS', 'autosaveDotES'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('autosave-ok', 'autosave-error');
    if (state === 'error') {
      el.classList.add('autosave-error');
      el.setAttribute('title', 'Erreur de sauvegarde — voir l\'historique pour libérer de l\'espace');
    } else {
      el.classList.add('autosave-ok');
      el.setAttribute('title', 'Sauvegarde OK');
    }
  });
}

const MAX_HISTORY = 50;
let _quotaAlertShown = false;

function isQuotaExceededError(e) {
  return e && (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014
  );
}

function _notifyQuotaExceeded(context) {
  log.error('STORAGE', 'quota_depasse', { context });
  /* v0.3.25 : indicateur visuel rouge dans la topbar */
  _updateAutosaveDots('error');
  if (_quotaAlertShown) return; // une seule alerte par session
  _quotaAlertShown = true;
  try {
    window.App.showAlert(
      'Stockage local plein ! Les dernières modifications n\'ont pas pu être sauvegardées.\n\n' +
      'Allez dans l\'Historique pour supprimer les anciens matchs, ou exportez vos données avant qu\'il ne soit trop tard.'
    );
  } catch (e) { /* si showAlert échoue, on a au moins le log */ }
}

export function autosave() {
  try {
    const snap = {
      S:       JSON.parse(JSON.stringify(S)),
      ans:     JSON.parse(JSON.stringify(ans)),
      ctx:     document.getElementById('ctxTA') ? document.getElementById('ctxTA').value : '',
      savedAt: Date.now(),
      period:  S.period
    };
    const payload = JSON.stringify(snap);
    localStorage.setItem(KEY_CURRENT, payload);
    _lastSaveAt = Date.now(); // v0.3.20 (BUG-2) : reset du filet 30s
    /* v0.3.25 : indicateur visuel vert dans la topbar */
    _updateAutosaveDots('ok');
    log.info('STORAGE', 'autosave_ok', { nbObs: S.obs.length, periode: S.period, tailleOctets: payload.length });
  } catch (e) {
    if (isQuotaExceededError(e)) {
      _notifyQuotaExceeded('autosave');
    } else {
      /* v0.3.25 : indicateur visuel rouge en cas d'erreur non-quota aussi */
      _updateAutosaveDots('error');
      log.error('STORAGE', 'autosave_erreur', { message: e.message, name: e.name });
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   v0.3.22 (FRAG-1) — Autosave debouncé pour la frappe libre
   ─────────────────────────────────────────────────────────────────────────
   Avant v0.3.22, les textareas de contexte (ctxTA et ECtxEdit) appelaient
   autosave() à CHAQUE caractère tapé via oninput. Sur un long contexte
   sérialisé en parallèle d'un état lourd (50 obs), cela produisait un lag
   perceptible et saturait les logs.
   Le debounce attend DEBOUNCE_MS d'inactivité avant de flusher l'autosave.
   La fonction flushAutosave() permet de forcer immédiatement un flush en
   attente — utilisée par les écouteurs beforeunload et visibilitychange
   pour ne pas perdre les caractères tapés dans les 500 dernières ms.
   IMPORTANT : autosave() reste synchrone et immédiat pour tous ses autres
   appelants (observations, score, TME, advPeriod, filet 30s, fermeture).
   Seuls les oninput des textareas passent par la version debouncée.
═════════════════════════════════════════════════════════════════════════ */
const DEBOUNCE_MS = 500;
let _debounceTimer = null;

export function autosaveDebounced() {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    autosave();
  }, DEBOUNCE_MS);
}

export function flushAutosave() {
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
    autosave();
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   v0.3.24 (FRAG-5) — Validation de snapshot
   ─────────────────────────────────────────────────────────────────────────
   Avant v0.3.24, resumeMatch() copiait aveuglément le contenu du
   localStorage dans l'état global S sans valider sa structure. Si un
   snapshot était corrompu (champ manquant, type inattendu, période
   invalide, tableau de mauvaise longueur), l'app rentrait dans un état
   incohérent qui produisait des bugs en cascade plus tard, sans alerte
   visible. Le BUG-3 est un exemple : la corruption était en fait juste
   une référence DOM morte, mais comme aucune validation n'existait, on
   plantait au mauvais endroit.
   La fonction validateSnapshot() vérifie la cohérence structurelle de
   manière défensive et retourne soit { ok: true, snap } pour un snapshot
   valide ou réparable, soit { ok: false, errors: [...] } pour un
   snapshot vraiment irrécupérable.
   En cas d'échec, le snapshot corrompu est sauvegardé sous une clé
   dédiée (KEY_CURRENT_BACKUP_<timestamp>) pour analyse ultérieure, puis
   la reprise est abandonnée proprement avec une alerte utilisateur.
═════════════════════════════════════════════════════════════════════════ */
const VALID_PERIODS = ['MT1', 'MT2', 'Prol.1', 'Prol.2'];

export function validateSnapshot(snap) {
  const errors = [];
  if (!snap || typeof snap !== 'object') {
    return { ok: false, errors: ['snapshot non-objet ou null'] };
  }
  if (!snap.S || typeof snap.S !== 'object') {
    return { ok: false, errors: ['snap.S manquant ou non-objet'] };
  }
  const S = snap.S;

  // Champs string critiques
  ['tA', 'tB', 'a1', 'a2'].forEach(k => {
    if (typeof S[k] !== 'string') {
      errors.push(`S.${k} doit être une string (reçu : ${typeof S[k]})`);
    }
  });

  // Période valide
  if (!VALID_PERIODS.includes(S.period)) {
    errors.push(`S.period invalide : ${S.period} (attendu : ${VALID_PERIODS.join(', ')})`);
  }

  // Scores numériques positifs
  ['sA', 'sB'].forEach(k => {
    if (typeof S[k] !== 'number' || S[k] < 0 || !Number.isFinite(S[k])) {
      errors.push(`S.${k} doit être un nombre >= 0 (reçu : ${S[k]})`);
    }
  });

  // Temps écoulé numérique
  if (typeof S.elapsed !== 'number' || S.elapsed < 0 || !Number.isFinite(S.elapsed)) {
    errors.push(`S.elapsed doit être un nombre >= 0 (reçu : ${S.elapsed})`);
  }

  // Observations : tableau (réparable si null/undefined → tableau vide)
  if (S.obs === null || S.obs === undefined) {
    S.obs = [];
  } else if (!Array.isArray(S.obs)) {
    errors.push(`S.obs doit être un tableau (reçu : ${typeof S.obs})`);
  }

  // TME : structure { A: [3 cases], B: [3 cases] }
  if (!S.tme || typeof S.tme !== 'object') {
    errors.push('S.tme manquant ou non-objet');
  } else {
    ['A', 'B'].forEach(team => {
      if (!Array.isArray(S.tme[team]) || S.tme[team].length !== 3) {
        // Réparable : on remplace par [null, null, null]
        S.tme[team] = [null, null, null];
      }
    });
  }

  // ans : objet avec esprit/engage/niveau (réparable si manquant)
  if (!snap.ans || typeof snap.ans !== 'object') {
    snap.ans = { esprit: null, engage: null, niveau: null };
  }

  // savedAt : timestamp (réparable si manquant)
  if (typeof snap.savedAt !== 'number' || !Number.isFinite(snap.savedAt)) {
    snap.savedAt = Date.now();
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, snap };
}

function _backupCorruptedSnapshot(rawPayload, errors) {
  try {
    const backupKey = 'arbitres_hb_current_BACKUP_' + Date.now();
    localStorage.setItem(backupKey, rawPayload);
    log.warn('STORAGE', 'snapshot_corrompu_backup', { backupKey, errors });
    return backupKey;
  } catch (e) {
    log.error('STORAGE', 'snapshot_corrompu_backup_erreur', { message: e.message });
    return null;
  }
}

export function checkResume() {
  try {
    const raw = localStorage.getItem(KEY_CURRENT);
    if (!raw) return;
    const snap = JSON.parse(raw);
    if (!snap?.S) return;
    const ageMs = Date.now() - (snap.savedAt || 0);
    log.info('STORAGE', 'match_interrompu_detecte', {
      equipeA: snap.S.tA, equipeB: snap.S.tB,
      nbObs: (snap.S.obs || []).length,
      periode: snap.S.period,
      ageMinutes: Math.round(ageMs / 60000)
    });
    const d       = new Date(snap.savedAt);
    const dateStr = d.toLocaleDateString('fr-FR') + ' à ' +
                    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const title   = (snap.S.tA || '?') + ' vs ' + (snap.S.tB || '?');
    document.getElementById('resumeTitle').textContent = title;
    document.getElementById('resumeDesc').textContent  =
      'Interrompu le ' + dateStr + ' — ' + (snap.S.obs || []).length + ' observation(s), ' + snap.S.period;
    document.getElementById('resumeBanner').classList.add('on');
  } catch (e) {
    log.error('STORAGE', 'check_resume_erreur', { message: e.message });
  }
}

export function resumeMatch() {
  try {
    const raw = localStorage.getItem(KEY_CURRENT);
    if (!raw) return;
    let snap;
    try {
      snap = JSON.parse(raw);
    } catch (parseErr) {
      /* v0.3.24 (FRAG-5) : JSON cassé → backup + abandon propre */
      log.error('LIFECYCLE', 'resume_match_json_invalide', { message: parseErr.message });
      _backupCorruptedSnapshot(raw, ['JSON.parse a échoué: ' + parseErr.message]);
      localStorage.removeItem(KEY_CURRENT);
      document.getElementById('resumeBanner').classList.remove('on');
      window.App.showAlert('Le suivi interrompu était corrompu (JSON invalide) et a été archivé. Impossible de le reprendre.');
      return;
    }

    /* v0.3.24 (FRAG-5) : validation structurelle du snapshot avant copie.
       Sans validation, un snapshot corrompu (champ manquant, type
       inattendu, période invalide) était copié aveuglément dans S et
       produisait des bugs en cascade au fil des interactions. La
       validation échoue proprement avec backup et alerte utilisateur. */
    const validation = validateSnapshot(snap);
    if (!validation.ok) {
      log.error('LIFECYCLE', 'resume_match_snapshot_invalide', { errors: validation.errors });
      const backupKey = _backupCorruptedSnapshot(raw, validation.errors);
      localStorage.removeItem(KEY_CURRENT);
      document.getElementById('resumeBanner').classList.remove('on');
      const errSummary = validation.errors.slice(0, 3).join(' ; ');
      window.App.showAlert(
        'Le suivi interrompu était corrompu et a été archivé (clé : ' +
        (backupKey || 'backup échoué') + '). Impossible de le reprendre.\n\n' +
        'Erreurs détectées : ' + errSummary +
        (validation.errors.length > 3 ? ' (+ autres)' : '')
      );
      return;
    }

    log.info('LIFECYCLE', 'match_repris', { equipeA: snap.S.tA, equipeB: snap.S.tB });
    Object.keys(snap.S).forEach(k => { S[k] = snap.S[k]; });
    Object.keys(snap.ans).forEach(k => { ans[k] = snap.ans[k]; });

    /* v0.3.22 (FRAG-7) : suppression de la compat selArb/selCat (code mort).
       Ces champs étaient des scalaires avant v0.3.0 puis sont devenus des
       tableaux. Mais ils ne sont plus utilisés nulle part dans le code
       depuis la migration vers Quick Notes — ni dans state.js, ni dans
       observations.js, ni ailleurs. Les lignes de compat créaient un
       champ orphelin sur S pour rien. */
    // Compatibilité arrière : observations avec arb/cats scalaires
    S.obs.forEach(o => {
      if (!Array.isArray(o.arb)) o.arb = o.arb ? [o.arb] : [];
      if (!o.cats) o.cats = [o.cat];
    });

    document.getElementById('sTA').textContent = S.tA;
    document.getElementById('sTB').textContent = S.tB;
    document.getElementById('thA').textContent = S.tA;
    document.getElementById('thB').textContent = S.tB;
    /* ── Fix v0.3.21 (BUG-3) : suppression de AN1/AN2 ──
       Ces éléments DOM n'existent plus dans index.html depuis la migration
       vers Quick Notes. L'appel produisait "null is not an object" qui
       interrompait resumeMatch et affichait l'alerte d'erreur de reprise.
       Les noms d'arbitres sont déjà restaurés via topInfo (ligne suivante)
       et via buildQuickNotes() qui construit les en-têtes A1/A2 à partir
       de S.a1/S.a2. */
    /* v0.3.24 (FRAG-3) : noms d'équipes et d'arbitres échappés avant injection HTML */
    document.getElementById('topInfo').innerHTML =
      '<strong>' + escapeHtml(S.tA) + '</strong> vs <strong>' + escapeHtml(S.tB) + '</strong> | ' + escapeHtml(S.a1) + ' & ' + escapeHtml(S.a2);
    const mp = [];
    if (S.mDate) mp.push(fmtDate(S.mDate));
    if (S.mTime) mp.push(S.mTime);
    if (S.mComp) mp.push(S.mComp);
    document.getElementById('topMeta').textContent = mp.join(' · ');
    const pb = document.getElementById('PBadge');
    pb.textContent = S.period;
    if      (S.period === 'MT1') pb.className = 'period-badge p-mt1';
    else if (S.period === 'MT2') pb.className = 'period-badge p-mt2';
    else                          pb.className = 'period-badge p-prol';
    S.run = false;
    document.getElementById('BSS').textContent = 'Reprendre';
    document.getElementById('BSS').className   = 'bc go';
    window.App.updateCD();
    document.getElementById('sA').textContent = S.sA;
    document.getElementById('sB').textContent = S.sB;
    if (snap.ctx) document.getElementById('ctxTA').value = snap.ctx;
    window.App.buildTme();
    window.App.buildQs();
    Object.keys(ans).forEach(id => { if (ans[id]) window.App.setAns(id, ans[id]); });
    /* ── Fix v0.3.20 (BUG-1) : buildCats() n'existe plus depuis la migration ──
       vers Quick Notes (vbeta.3). L'appel produisait un TypeError qui
       interrompait resumeMatch en plein milieu et laissait l'utilisateur
       bloqué sur l'écran d'accueil sans bascule vers MS.
       Remplacé par buildQuickNotes() qui reconstruit la grille d'observations
       rapides à partir des noms d'arbitres restaurés depuis le snapshot. */
    window.App.buildQuickNotes();
    window.App.renderTable();
    document.getElementById('resumeBanner').classList.remove('on');
    document.getElementById('SS').style.display = 'none';
    document.getElementById('MS').style.display = 'flex';
    /* v0.3.20 (BUG-2) : démarre le filet de sécurité d'autosave 30 s */
    startSafetyAutosave();
  } catch (e) {
    log.error('LIFECYCLE', 'resume_match_erreur', { message: e.message });
    window.App.showAlert('Erreur lors de la reprise : ' + e.message);
  }
}

export function discardMatch() {
  if (!confirm('Supprimer le suivi interrompu ?')) return;
  log.warn('LIFECYCLE', 'match_interrompu_supprime');
  localStorage.removeItem(KEY_CURRENT);
  document.getElementById('resumeBanner').classList.remove('on');
}

/* ── Sauvegarder dans l'historique local + backend si connecté ── */
export async function saveToHistory() {
  try {
    const ctx = document.getElementById('ctxTA')?.value || '';
    const gc  = document.getElementById('GC')?.value    || '';
    const entry = {
      id:      Date.now(),
      savedAt: Date.now(),
      S:       JSON.parse(JSON.stringify(S)),
      ans:     JSON.parse(JSON.stringify(ans)),
      ctx, gc
    };

    // Sauvegarde locale
    const history = _loadHistory();
    history.unshift(entry);
    /* v0.3.24 (FRAG-6) : rotation FIFO pour limiter la taille de l'historique.
       Au-delà de MAX_HISTORY matchs, les plus anciens sont supprimés
       automatiquement. Évite que le localStorage ne se remplisse
       indéfiniment au fil des saisons. */
    if (history.length > MAX_HISTORY) {
      const removed = history.length - MAX_HISTORY;
      history.length = MAX_HISTORY;
      log.warn('STORAGE', 'historique_rotation', { removed, max: MAX_HISTORY });
    }
    try {
      localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    } catch (quotaErr) {
      if (isQuotaExceededError(quotaErr)) {
        _notifyQuotaExceeded('saveToHistory');
        return;
      }
      throw quotaErr;
    }
    localStorage.removeItem(KEY_CURRENT);
    log.info('STORAGE', 'match_sauvegarde_local', { nbObs: S.obs.length, historyCount: history.length });

    // Sauvegarde distante si admin connecté (Supabase)
    /* v1.1.0 : uniquement pour les admins — les utilisateurs non-admin
       travaillent exclusivement avec l'historique local. */
    if (isLoggedIn() && isAdmin()) {
      const matchData = {
        arbitre1: S.a1, arbitre2: S.a2,
        equipe_a: S.tA, equipe_b: S.tB,
        date_match: S.mDate, heure_match: S.mTime, competition: S.mComp,
        score_a: S.sA, score_b: S.sB,
        observations: S.obs,
        evaluation: ans,
        contexte: ctx,
        commentaire_global: gc
      };
      const result = await saveMatchRemote(matchData);
      if (result.ok) {
        history[0].remoteId = result.id;
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
        log.info('STORAGE', 'match_sauvegarde_remote_ok', { remoteId: result.id });
      }
    }


  } catch (e) {
    log.error('STORAGE', 'save_history_erreur', { message: e.message });
  }
}

export function openHistory() {
  log.info('LIFECYCLE', 'historique_ouvert');
  renderHistory();
  document.getElementById('SS').style.display    = 'none';
  document.getElementById('HistS').style.display = 'flex';
}

export function closeHistory() {
  log.info('LIFECYCLE', 'historique_ferme');
  document.getElementById('HistS').style.display = 'none';
  document.getElementById('SS').style.display    = 'flex';
}

/* ── État interne du filtre admin ── */
let _adminFilterUser = '';

export function setAdminFilter(email) {
  /* v1.3.0 : filtre admin par utilisateur */
  _adminFilterUser = email;
  renderHistory();
}

function _buildAdminFilter(matches) {
  const emails = [...new Set(matches.map(m => m.user_email).filter(Boolean))].sort();
  const options = ['<option value="">Tous les utilisateurs</option>']
    .concat(emails.map(e =>
      '<option value="' + escapeHtml(e) + '"' + (_adminFilterUser === e ? ' selected' : '') + '>' + escapeHtml(e) + '</option>'
    ));
  return '<div style="padding:0 0 12px 0;">' +
    '<select onchange="window.App.setAdminFilter(this.value)" style="width:100%;padding:8px 12px;border:1px solid var(--border-input);border-radius:8px;background:var(--bg-input);color:var(--text-main);font-size:13px;font-family:inherit;cursor:pointer;">' +
    options.join('') + '</select>' +
    (_adminFilterUser ? '<div style="font-size:11px;color:var(--blue-main);margin-top:4px;">Filtre actif\u00a0: ' + escapeHtml(_adminFilterUser) + '</div>' : '') +
    '</div>';
}

function _buildRemoteCard(m, admin) {
  return '<div class="hist-card">' +
    '<div class="hist-card-info">' +
    '<div class="hist-card-title">' + escapeHtml(m.equipe_a) + ' vs ' + escapeHtml(m.equipe_b) + '</div>' +
    '<div class="hist-card-meta">' + escapeHtml(m.arbitre1) + ' &amp; ' + escapeHtml(m.arbitre2) + ' \u00b7 ' + escapeHtml(m.date_match || '') + ' \u00b7 ' + escapeHtml(m.competition || '') + '</div>' +
    '<div class="hist-card-score">' + escapeHtml(String(m.score_a)) + ' : ' + escapeHtml(String(m.score_b)) + '</div>' +
    (admin && m.user_email ? '<div style="font-size:11px;color:var(--text-hint);margin-top:3px;">Saisi par\u00a0: <span style="color:var(--text-sub);">' + escapeHtml(m.user_email) + '</span></div>' : '') +
    '</div>' +
    '<div class="hist-card-actions">' +
    '<button class="btn-act prim" onclick="window.App.reexportPDFRemote(\'' + escapeHtml(String(m.id)) + '\')">PDF</button>' +
    '<button class="btn-act" onclick="window.App.deleteHistoryRemote(\'' + escapeHtml(String(m.id)) + '\')">Supprimer</button>' +
    '</div></div>';
}

export async function renderHistory() {
  const list    = document.getElementById('histList');
  const countEl = document.getElementById('histCount');

  /* v1.3.0 : admin → fetchMatchesAdmin (enrichi user_email, bypass RLS)
              user  → fetchMatches (RLS, ses propres matchs)
              Supabase KO → fallback localStorage */
  if (isLoggedIn()) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-hint);">Chargement...</div>';

    const result = isAdmin() ? await fetchMatchesAdmin() : await fetchMatches();

    if (result.ok) {
      let matches = result.matches;
      if (isAdmin() && _adminFilterUser) {
        matches = matches.filter(m => m.user_email === _adminFilterUser);
      }
      const filter = isAdmin() ? _buildAdminFilter(result.matches) : '';
      if (matches.length) {
        countEl.textContent = matches.length + ' match(s) sauvegardé(s)';
        list.innerHTML = filter + matches.map(m => _buildRemoteCard(m, isAdmin())).join('');
      } else {
        countEl.textContent = '0 match(s) sauvegardé(s)';
        list.innerHTML = filter + '<div class="hist-empty">Aucun match sauvegardé.<br>Les matchs apparaissent ici après export PDF.</div>';
      }
      return;
    }

    /* Supabase KO */
    log.warn('STORAGE', 'supabase_indisponible_fallback_local');
    countEl.textContent = '\u26a0\ufe0f Supabase indisponible \u2014 historique local';
  }

  /* Fallback local */
  _adminFilterUser = '';
  const history = _loadHistory();
  let sizeKb = 0;
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    sizeKb = raw ? Math.round(raw.length / 1024) : 0;
  } catch (e) { /* ignore */ }
  if (!isLoggedIn()) {
    countEl.textContent = history.length + ' / ' + MAX_HISTORY + ' match(s) \u00b7 ' + sizeKb + ' Ko';
  }
  if (!history.length) {
    list.innerHTML = '<div class="hist-empty">Aucun match dans l\'historique.<br>Les matchs apparaissent ici après export PDF.</div>';
    return;
  }
  list.innerHTML = history.map((m, i) => `
    <div class="hist-card">
      <div class="hist-card-info">
        <div class="hist-card-title">${escapeHtml(m.S.tA)} vs ${escapeHtml(m.S.tB)}</div>
        <div class="hist-card-meta">${escapeHtml(m.S.a1)} & ${escapeHtml(m.S.a2)} · ${escapeHtml(fmtDate(m.S.mDate) || '')}</div>
        <div class="hist-card-score">${escapeHtml(m.S.sA)} : ${escapeHtml(m.S.sB)}</div>
      </div>
      <div class="hist-card-actions">
        <button class="btn-act prim" onclick="window.App.reexportPDF(${i})">PDF</button>
        <button class="btn-act" onclick="window.App.deleteHistory(${m.id})">Supprimer</button>
      </div>
    </div>
  `).join('');
}

export function deleteHistory(id) {
  if (!confirm('Supprimer ce match de l\'historique ?')) return;
  const history = _loadHistory().filter(e => e.id !== id);
  log.warn('STORAGE', 'historique_match_supprime_local', { id });
  localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
  renderHistory();
}



export async function deleteHistoryRemote(id) {
  if (!confirm('Supprimer ce match ?')) return;
  const result = await deleteMatchRemote(id);
  if (result.ok) {
    renderHistory();
  } else {
    window.App.showAlert('Erreur lors de la suppression : ' + result.error);
  }
}
export async function reexportPDFRemote(id) {
  /* v1.3.0 : réexport PDF depuis l'historique Supabase.
     Admin     → fetchMatchById via Edge Function (bypass RLS, accès à tous les matchs).
     Utilisateur → fetchMatches puis recherche par id (ses propres matchs via RLS).
     Restaure l'état courant après génération. */
  log.info('PDF', 'reexport_depuis_supabase', { id });

  let match = null;

  if (isAdmin()) {
    /* Admin : charger le match directement par id via Edge Function */
    const result = await fetchMatchById(id);
    if (!result.ok) {
      window.App.showAlert('Impossible de charger les données depuis Supabase.');
      return;
    }
    match = result.match;
  } else {
    /* Utilisateur : chercher dans ses propres matchs */
    const result = await fetchMatches();
    if (!result.ok) {
      window.App.showAlert('Impossible de charger les données depuis Supabase.');
      return;
    }
    match = result.matches.find(m => m.id === id);
  }

  if (!match) {
    window.App.showAlert('Match introuvable.');
    return;
  }

  // Sauvegarder l'état courant de l'app
  const savedS   = JSON.parse(JSON.stringify(S));
  const savedAns = JSON.parse(JSON.stringify(ans));
  const savedCtx = document.getElementById('ctxTA')?.value || '';
  const savedGC  = document.getElementById('GC')?.value    || '';

  // Reconstruire S depuis les données Supabase
  S.a1    = match.arbitre1    || '';
  S.a2    = match.arbitre2    || '';
  S.tA    = match.equipe_a    || '';
  S.tB    = match.equipe_b    || '';
  S.mDate = match.date_match  || '';
  S.mTime = match.heure_match || '';
  S.mComp = match.competition || '';
  S.sA    = match.score_a     || 0;
  S.sB    = match.score_b     || 0;
  S.obs   = Array.isArray(match.observations) ? match.observations : [];

  // Compatibilité arrière observations (migration snapshots anciens format)
  S.obs.forEach(o => {
    if (!Array.isArray(o.arb)) o.arb = o.arb ? [o.arb] : [];
    if (!o.cats) o.cats = [o.cat];
  });

  // Reconstruire ans depuis le champ evaluation
  const evalData = match.evaluation || {};
  Object.keys(evalData).forEach(k => { ans[k] = evalData[k]; });

  if (document.getElementById('ctxTA')) document.getElementById('ctxTA').value = match.contexte            || '';
  if (document.getElementById('GC'))    document.getElementById('GC').value    = match.commentaire_global  || '';

  // Générer le PDF
  window.App.exportPDF();

  // Restaurer l'état de l'app après génération (délai pour laisser exportPDF démarrer)
  setTimeout(() => {
    Object.keys(savedS).forEach(k   => { S[k]   = savedS[k];   });
    Object.keys(savedAns).forEach(k => { ans[k]  = savedAns[k]; });
    if (document.getElementById('ctxTA')) document.getElementById('ctxTA').value = savedCtx;
    if (document.getElementById('GC'))    document.getElementById('GC').value    = savedGC;
  }, 500);
}


export function reexportPDF(idx) {
  const history = _loadHistory();
  if (!history[idx]) return;
  log.info('PDF', 'reexport_depuis_historique', { index: idx });
  const entry = history[idx];
  const savedS   = JSON.parse(JSON.stringify(S));
  const savedAns = JSON.parse(JSON.stringify(ans));
  const savedCtx = document.getElementById('ctxTA')?.value || '';
  const savedGC  = document.getElementById('GC')?.value    || '';
  Object.keys(entry.S).forEach(k   => { S[k]   = entry.S[k];   });
  Object.keys(entry.ans).forEach(k => { ans[k]  = entry.ans[k]; });

  // v0.3.22 (FRAG-7) : compat selArb/selCat retirée (code mort, cf. resumeMatch).
  // Compatibilité arrière observations
  S.obs.forEach(o => {
    if (!Array.isArray(o.arb)) o.arb = o.arb ? [o.arb] : [];
    if (!o.cats) o.cats = [o.cat];
  });

  if (document.getElementById('ctxTA')) document.getElementById('ctxTA').value = entry.ctx || '';
  if (document.getElementById('GC'))    document.getElementById('GC').value    = entry.gc  || '';
  window.App.exportPDF();
  setTimeout(() => {
    Object.keys(savedS).forEach(k   => { S[k]  = savedS[k];   });
    Object.keys(savedAns).forEach(k => { ans[k] = savedAns[k]; });
    if (document.getElementById('ctxTA')) document.getElementById('ctxTA').value = savedCtx;
    if (document.getElementById('GC'))    document.getElementById('GC').value    = savedGC;
  }, 500);
}

function _loadHistory() {
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    log.error('STORAGE', 'load_history_erreur', { message: e.message });
    return [];
  }
}
