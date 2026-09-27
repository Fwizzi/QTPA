/* ═══ TIMER — Chronomètre et gestion des périodes ════════════════════════ */
import { S } from './state.js';
import { fmt } from './utils.js';
import { log } from './logger.js';

/* ── Affichage du chrono ── */
export function updateCD() {
  document.getElementById('CD').textContent = fmt(S.elapsed);
}

/* v1.4.19 : durée dynamique de la période courante */
function _getPeriodDuration() {
  if (S.period === 'Prol.1' || S.period === 'Prol.2') return S.dureeProl;
  const idx = parseInt(S.period.replace('MT', ''), 10) - 1;
  return (S.dureesMT[idx] !== undefined) ? S.dureesMT[idx] : S.dureesMT[S.dureesMT.length - 1];
}

/* ── Recalage manuel du temps ── */
export function applyRecal() {
  /* v1.4.19 : limite selon la durée réelle de la période */
  const maxMin = Math.floor(_getPeriodDuration() / 60);
  const m   = Math.min(parseInt(document.getElementById('rMin').value) || 0, maxMin);
  const s   = Math.min(parseInt(document.getElementById('rSec').value) || 0, 59);
  const old = S.elapsed;
  S.elapsed = m * 60 + s;
  log.info('CHRONO', 'recalage', {
    ancien: fmt(old), nouveau: fmt(S.elapsed), periode: S.period
  });
  document.getElementById('rMin').value = '';
  document.getElementById('rSec').value = '';
  updateCD();
  window.App.refreshTme();
}

/* ── Démarrer / Mettre en pause ── */
export function toggleChrono() {
  S.matchActif = true; /* v0.3.31 (BUG-5) */
  if (S.run) {
    clearInterval(S.timer);
    S.run = false;
    S.pauseTme = false;
    document.getElementById('tmeP').classList.remove('on');
    document.getElementById('BSS').textContent = 'Reprendre';
    document.getElementById('BSS').className = 'bc go';
    log.info('CHRONO', 'pause', { temps: fmt(S.elapsed), periode: S.period });
  } else {
    S.tick  = Date.now();
    S.timer = setInterval(tickC, 200);
    S.run   = true;
    S.pauseTme = false;
    document.getElementById('tmeP').classList.remove('on');
    document.getElementById('BSS').textContent = 'Pause';
    document.getElementById('BSS').className = 'bc stop';
    log.info('CHRONO', 'start', { temps: fmt(S.elapsed), periode: S.period });
  }
}

/* ── Reprendre après un temps mort ── */
export function resumeTme() {
  document.getElementById('tmeP').classList.remove('on');
  S.pauseTme = false;
  S.tick  = Date.now();
  S.timer = setInterval(tickC, 200);
  S.run   = true;
  document.getElementById('BSS').textContent = 'Pause';
  document.getElementById('BSS').className = 'bc stop';
  log.info('CHRONO', 'reprise_apres_tme', { temps: fmt(S.elapsed), periode: S.period });
}

/* ── Tick toutes les 200 ms ── */
export function tickC() {
  const now = Date.now();
  const d = (now - S.tick) / 1000;
  S.tick = now;
  S.elapsed += d;

  const lim = _getPeriodDuration();
  if (S.elapsed >= lim) {
    S.elapsed = lim;
    clearInterval(S.timer);
    S.run = false;
    document.getElementById('BSS').textContent = 'Demarrer';
    document.getElementById('BSS').className = 'bc go';
    advPeriod();
  }

  /* v1.4.19 : refresh TME en dernière MT régulière (blocage dynamique) */
  if (S.period === 'MT' + S.nbMT) window.App.refreshTme();
  updateCD();
}

/* ── Avancer à la période suivante ── */
export function advPeriod() {
  const periodeAvant = S.period;
  if (S.period === 'MT1') {
    S.htA = S.sA; S.htB = S.sB; /* score fin MT1 */
    S.period  = 'MT2';
    S.elapsed = 0;
    document.getElementById('PBadge').textContent = 'MT2';
    document.getElementById('PBadge').className   = 'period-badge p-mt2';
    window.App.showAlert('Mi-temps ! Debut de la 2eme periode.');
  } else if (S.period === 'MT2') {
    if (S.nbMT === 3) {
      S.ht2A = S.sA; S.ht2B = S.sB; /* score fin MT2 */
      S.period  = 'MT3';
      S.elapsed = 0;
      document.getElementById('PBadge').textContent = 'MT3';
      document.getElementById('PBadge').className   = 'period-badge p-mt3';
      window.App.showAlert('Mi-temps ! Debut de la 3eme periode.');
    } else {
      document.getElementById('PB').classList.add('on');
      window.App.showAlert('Fin du temps reglementaire.');
    }
  } else if (S.period === 'MT3') {
    document.getElementById('PB').classList.add('on');
    window.App.showAlert('Fin du temps reglementaire.');
  } else if (S.period === 'Prol.1') {
    S.period  = 'Prol.2';
    S.elapsed = 0;
    document.getElementById('PBadge').textContent = 'Prol.2';
    document.getElementById('PBadge').className   = 'period-badge p-prol';
    window.App.showAlert('Prolongation 2 !');
  } else {
    window.App.showAlert('Fin du match !');
  }
  log.info('CHRONO', 'periode_changement', {
    de: periodeAvant, vers: S.period,
    scoreA: S.sA, scoreB: S.sB
  });
  /* v0.3.20 (BUG-2) : sauvegarde immédiate à chaque changement de période */
  window.App.autosave();
  updateCD();
  window.App.refreshTme();
}

/* ── Activer les prolongations ── */
export function activerProlong() {
  S.period  = 'Prol.1';
  S.elapsed = 0;
  document.getElementById('PBadge').textContent = 'Prol.1';
  document.getElementById('PBadge').className   = 'period-badge p-prol';
  document.getElementById('PB').classList.remove('on');
  window.App.showAlert('Prolongation 1 activee (' + Math.round(S.dureeProl / 60) + ' min) !');
  log.info('CHRONO', 'prolongations_activees', { scoreA: S.sA, scoreB: S.sB });
  updateCD();
}

/* ── Remettre le chrono à zéro ── */
export function resetChrono() {
  log.warn('CHRONO', 'reset', { tempsAvant: fmt(S.elapsed), periode: S.period });
  clearInterval(S.timer);
  S.run     = false;
  S.elapsed = 0;
  S.pauseTme = false;
  document.getElementById('tmeP').classList.remove('on');
  document.getElementById('BSS').textContent = 'Demarrer';
  document.getElementById('BSS').className   = 'bc go';
  updateCD();
}
