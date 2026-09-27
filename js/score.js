/* ═══ SCORE — Score et gestion des temps morts ═══════════════════════════ */
import { S } from './state.js';
import { fmt } from './utils.js';
import { log } from './logger.js';

/* ── v1.4.23 : TME par période avec quota global ──────────────────────────
   Structure S.tme : { A: { MT1:[v0,v1], MT2:[v0,v1], MT3:[v0,v1] }, B:{...} }
   Règles :
   - Max 2 TME par équipe par MT
   - Max 3 TME par équipe par match (quota global)
   - Dans les 5 dernières min de la dernière MT : 1 seul TME autorisé
     (si quota global restant ≥ 1 mais slot 1 de la période bloqué)
──────────────────────────────────────────────────────────────────────────── */

const TME_MAX_MATCH = 3; /* quota global par équipe */

/* Retourne le tableau de slots [v0, v1] pour l'équipe et la période courante */
function _curSlots(team) {
  const per = S.period;
  if (!S.tme[team][per]) return [null, null];
  return S.tme[team][per];
}

/* Compte le total de TME pris par une équipe sur toutes les MT */
function _totalTme(team) {
  return ['MT1','MT2','MT3'].reduce((acc, per) => {
    const slots = S.tme[team][per] || [];
    return acc + slots.filter(v => v && v !== 'X').length;
  }, 0);
}

export function tmeVal(team, idx) {
  const slots = _curSlots(team);
  const v = slots[idx];
  return (v && v !== 'X') ? v : '-';
}

/* État d'un slot : 'filled' | 'free' | 'red' | 'gray' */
export function tmeState(team, idx) {
  const slots = _curSlots(team);
  const v = slots[idx];
  if (v && v !== 'X') return 'filled';

  /* Pendant les prolongations : TME désactivés */
  if (S.period === 'Prol.1' || S.period === 'Prol.2') return 'gray';

  /* Quota global épuisé */
  if (_totalTme(team) >= TME_MAX_MATCH) return 'gray';

  /* Règle "5 dernières minutes de la dernière MT" :
     Dès que les 5' sont atteintes sans TME pris dans la MT → slot 1 verrouillé
     définitivement (S.tmeLocked[team] = true), même si un TME est pris ensuite. */
  if (idx === 1 && S.tmeLocked[team]) return 'red';

  return 'free';
}

export function refreshTme() {
  /* v1.4.27 : pose le verrou définitif dès que les 5' sont atteintes sans TME pris */
  const lastMT = 'MT' + S.nbMT;
  if (S.period === lastMT) {
    const seuil = Math.max(0, S.dureesMT[S.nbMT - 1] - 5 * 60);
    if (S.elapsed >= seuil) {
      ['A', 'B'].forEach(t => {
        if (!S.tmeLocked[t]) {
          const s0 = S.tme[t][lastMT][0];
          if (!s0 || s0 === 'X') S.tmeLocked[t] = true;
        }
      });
    }
  }

  ['A', 'B'].forEach(team => {
    const slots    = _curSlots(team);
    const quotaRest = TME_MAX_MATCH - _totalTme(team);

    for (let i = 0; i < 2; i++) {
      const cell = document.getElementById('c' + team + i);
      if (!cell) return;
      const td = cell.parentElement;
      const v  = slots[i];

      /* Masquer la 2ème ligne si quota restant ≤ 1 et slot vide
         (on la garde visible si elle contient déjà un TME, pour pouvoir le supprimer) */
      if (i === 1 && quotaRest <= 1 && !(v && v !== 'X')) {
        td.style.visibility = 'hidden';
        continue;
      }
      td.style.visibility = '';

      if (v && v !== 'X') {
        cell.className = 'tme-cell tme-ok';
        cell.removeAttribute('onclick');
        cell.innerHTML =
          '<span style="font-size:12px;font-weight:700;">' + v + '</span>' +
          '<button class="tme-del-btn" onclick="event.stopPropagation();window.App.deleteTme(\'' +
          team + '\',' + i + ')" title="Supprimer ce TME">&#10005;</button>';
      } else {
        const st = tmeState(team, i);
        if (st === 'free') {
          cell.textContent = '+';
          cell.className   = 'tme-cell';
          cell.onclick     = () => window.App.addTme(team, i);
        } else if (st === 'red') {
          cell.textContent = 'Bloqué';
          cell.className   = 'tme-cell tme-red';
        } else {
          cell.textContent = '-';
          cell.className   = 'tme-cell tme-gray';
        }
      }
    }
  });
}

export function buildTme() {
  const tb = document.getElementById('tmeBody');
  tb.innerHTML = '';
  /* v1.4.22 : 2 slots par MT uniquement */
  for (let i = 0; i < 2; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="font-size:12px;color:#888;text-align:center;">' + (i + 1) + '</td>' +
      '<td><div class="tme-cell" id="cA' + i + '" onclick="window.App.addTme(\'A\',' + i + ')">+</div></td>' +
      '<td><div class="tme-cell" id="cB' + i + '" onclick="window.App.addTme(\'B\',' + i + ')">+</div></td>';
    tb.appendChild(tr);
  }
  refreshTme();
}

export function addTme(team, idx) {
  S.matchActif = true; /* v0.3.31 (BUG-5) */
  const st = tmeState(team, idx);
  if (st === 'filled') return;
  if (st === 'red') {
    log.warn('TME', 'tme_bloque', { equipe: team, index: idx, temps: fmt(S.elapsed), periode: S.period });
    window.App.showAlert('Impossible : 1 seul TME autorisé dans les 5 dernières minutes de la dernière mi-temps.');
    return;
  }
  if (st === 'gray') {
    if (_totalTme(team) >= TME_MAX_MATCH) {
      window.App.showAlert('Quota de ' + TME_MAX_MATCH + ' TME par match atteint pour cette équipe.');
    }
    return;
  }

  if (S.run) {
    clearInterval(S.timer);
    S.run      = false;
    S.pauseTme = true;
    document.getElementById('BSS').textContent = 'Reprendre';
    document.getElementById('BSS').className   = 'bc go';
    document.getElementById('tmeP').classList.add('on');
  }

  S.tme[team][S.period][idx] = fmt(S.elapsed);
  log.info('TME', 'tme_ajoute', {
    equipe: team === 'A' ? S.tA : S.tB, index: idx + 1,
    temps: fmt(S.elapsed), periode: S.period
  });
  refreshTme();
  window.App.autosave();
}

export function deleteTme(team, idx) {
  const slots = _curSlots(team);
  const v = slots[idx];
  if (!v || v === 'X') return;
  const teamName = team === 'A' ? S.tA : S.tB;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:14px;padding:24px 28px;max-width:320px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2);text-align:center;">' +
    '<div style="font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text-main);">Supprimer ce temps mort ?</div>' +
    '<div style="font-size:13px;color:var(--text-hint);margin-bottom:20px;">' + teamName + ' — ' + v + '</div>' +
    '<div style="display:flex;gap:10px;justify-content:center;">' +
    '<button id="_tmCancel" style="flex:1;padding:10px;border:1px solid var(--border-input);border-radius:10px;background:var(--bg-input);color:var(--text-main);font-size:14px;cursor:pointer;">Annuler</button>' +
    '<button id="_tmConfirm" style="flex:1;padding:10px;border:none;border-radius:10px;background:#C82D2D;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Supprimer</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#_tmCancel').onclick  = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#_tmConfirm').onclick = () => {
    overlay.remove();
    log.warn('TME', 'tme_supprime', { equipe: teamName, index: idx + 1, valeur: v, periode: S.period });
    S.tme[team][S.period][idx] = null;
    refreshTme();
    window.App.autosave();
  };
}

export function chgScore(t, d) {
  S.matchActif = true; /* v0.3.31 (BUG-5) */
  const avant = t === 'A' ? S.sA : S.sB;
  if (t === 'A') S.sA = Math.max(0, S.sA + d);
  else           S.sB = Math.max(0, S.sB + d);
  const apres = t === 'A' ? S.sA : S.sB;
  log.info('SCORE', 'score_change', {
    equipe: t === 'A' ? S.tA : S.tB,
    avant, apres, delta: d,
    temps: fmt(S.elapsed), periode: S.period
  });
  document.getElementById('sA').textContent = S.sA;
  document.getElementById('sB').textContent = S.sB;
  window.App.autosave();
}
