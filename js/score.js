/* ═══ SCORE — Score et gestion des temps morts ═══════════════════════════ */
import { S } from './state.js';
import { fmt } from './utils.js';
import { log } from './logger.js';

export function tmeVal(t, i) {
  const v = S.tme[t][i];
  return (v && v !== 'X') ? v : '-';
}

export function tmeState(team, idx) {
  const v = S.tme[team][idx];
  if (v && v !== 'X') return 'filled';
  return 'free';
}

export function refreshTme() {
  ['A', 'B'].forEach(team => {
    for (let i = 0; i < 3; i++) {
      const cell = document.getElementById('c' + team + i);
      if (!cell) return;
      const v = S.tme[team][i];
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
          cell.textContent = 'Bloque';
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
  for (let i = 0; i < 3; i++) {
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
    window.App.showAlert('Impossible : cet equipe a deja pris un TME en 2e MT, les TME sont bloques apres 25:00.');
    return;
  }
  if (st === 'gray') return;

  if (S.run) {
    clearInterval(S.timer);
    S.run      = false;
    S.pauseTme = true;
    document.getElementById('BSS').textContent = 'Reprendre';
    document.getElementById('BSS').className   = 'bc go';
    document.getElementById('tmeP').classList.add('on');
  }

  S.tme[team][idx] = fmt(S.elapsed);
  log.info('TME', 'tme_ajoute', {
    equipe: team === 'A' ? S.tA : S.tB, index: idx + 1,
    temps: fmt(S.elapsed), periode: S.period
  });
  refreshTme();
  window.App.autosave();
}

export function deleteTme(team, idx) {
  const v = S.tme[team][idx];
  if (!v || v === 'X') return;
  if (!confirm('Supprimer le temps mort de ' + (team === 'A' ? S.tA : S.tB) + ' (' + v + ') ?')) return;
  log.warn('TME', 'tme_supprime', {
    equipe: team === 'A' ? S.tA : S.tB, index: idx + 1, valeur: v
  });
  S.tme[team][idx] = null;
  refreshTme();
  window.App.autosave();
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
