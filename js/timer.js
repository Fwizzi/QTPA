/* ═══ TIMER — Chronomètre et gestion des périodes ════════════════════════ */
import { S, PL, PLR } from './state.js';
import { fmt } from './utils.js';
import { log } from './logger.js';

/* ── Affichage du chrono ── */
export function updateCD() {
  document.getElementById('CD').textContent = fmt(S.elapsed);
}

/* ── Recalage manuel du temps ── */
export function applyRecal() {
  const m   = Math.min(parseInt(document.getElementById('rMin').value) || 0, 30);
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
    if (S.period === 'MT2' && S.htA === null) {
      S.htA = S.sA;
      S.htB = S.sB;
      window.App.autosave();
    }
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

  const lim = (S.period === 'Prol.1' || S.period === 'Prol.2') ? PLR : PL;
  if (S.elapsed >= lim) {
    S.elapsed = lim;
    clearInterval(S.timer);
    S.run = false;
    document.getElementById('BSS').textContent = 'Demarrer';
    document.getElementById('BSS').className = 'bc go';
    advPeriod();
  }

  if (S.period === 'MT2') window.App.refreshTme();
  updateCD();
}

/* ── Avancer à la période suivante ── */
export function advPeriod() {
  const periodeAvant = S.period;
  if (S.period === 'MT1') {
    S.period  = 'MT2';
    S.elapsed = 0;
    document.getElementById('PBadge').textContent = 'MT2';
    document.getElementById('PBadge').className   = 'period-badge p-mt2';
    window.App.showAlert('Mi-temps ! Debut de la 2eme periode.');
  } else if (S.period === 'MT2') {
    document.getElementById('PB').classList.add('on');
    window.App.showAlert('Fin du temps reglementaire.');
  } else if (S.period === 'Prol.1') {
    S.period  = 'Prol.2';
    S.elapsed = 0;
    document.getElementById('PBadge').textContent = 'Prol.2';
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
  window.App.showAlert('Prolongation 1 activee (5 min) !');
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
