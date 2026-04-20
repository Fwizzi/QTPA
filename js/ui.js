/* ═══ UI — Thème, alertes et questions d'évaluation ════════════════════ */
import { QS, ans } from './state.js';

/* ── Afficher une alerte modale ── */
export function showAlert(msg) {
  document.getElementById('AM').textContent = msg;
  document.getElementById('AO').classList.add('on');
}

/* ── Fermer l'alerte modale ── */
export function closeAlert() {
  document.getElementById('AO').classList.remove('on');
}

/* ── Construire les questions oui/non ── */
export function buildQs() {
  const c = document.getElementById('QC');
  c.innerHTML = '';
  QS.forEach(q => {
    const d = document.createElement('div');
    d.className = 'q-row';
    d.innerHTML =
      '<div class="q-left">' +
        '<span class="q-lbl">' + q.lbl + '</span>' +
        '<span class="q-st pend" id="qst_' + q.id + '">-</span>' +
      '</div>' +
      '<div class="yn-btns">' +
        '<button class="btn-yn" id="qy_' + q.id + '" onclick="window.App.setAns(\'' + q.id + '\',\'oui\')">Oui</button>' +
        '<button class="btn-yn" id="qn_' + q.id + '" onclick="window.App.setAns(\'' + q.id + '\',\'non\')">Non</button>' +
      '</div>';
    c.appendChild(d);
  });
}

/* ── Enregistrer une réponse oui/non ── */
export function setAns(id, val) {
  ans[id] = val;
  const by  = document.getElementById('qy_' + id);
  const bn  = document.getElementById('qn_' + id);
  const st  = document.getElementById('qst_' + id);
  by.className = 'btn-yn' + (val === 'oui' ? ' ysel' : '');
  bn.className = 'btn-yn' + (val === 'non' ? ' nsel' : '');
  const ab = (val === 'oui') ? by : bn;
  ab.classList.remove('fl');
  void ab.offsetWidth;
  ab.classList.add('fl');
  setTimeout(() => ab.classList.remove('fl'), 300);
  st.innerHTML  = val === 'oui' ? '&#10003; Oui' : '&#10007; Non';
  st.className  = 'q-st ' + (val === 'oui' ? 'oui' : 'non');
}

/* ── Appliquer un thème (clair / sombre) ── */
export function applyTheme(dark, save) {
  /* v0.3.29 : labels et icônes de tous les boutons thème sont désormais
     gérés uniquement par CSS via body.dark (règles ::before sur les spans).
     Zéro manipulation JS des labels/icônes : garantit la synchronisation
     de tous les boutons simultanément, y compris ceux dans des écrans
     display:none qui ne déclenchent pas de recalcul de style sous Safari. */
  if (dark) document.body.classList.add('dark');
  else      document.body.classList.remove('dark');

  if (save !== false) {
    localStorage.setItem('arbitres_hb_theme', dark ? 'dark' : 'light');
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#1a0808' : '#1D3A7A';
}

/* ── Basculer le thème ── */
export function toggleTheme() {
  applyTheme(!document.body.classList.contains('dark'), true);
}
