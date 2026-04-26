/* ═══ OBSERVATIONS — Mode Quick Notes vbeta.3 ════════════════════════════
   • Tap = ouvre obligatoirement la popup tags (plus de tap court)
   • Layout compact 7 colonnes : [cat ✘ ✔] [cat ✘ ✔] ...
   • Tags spécifiques par catégorie + tags généraux
   • Gestion du sifflet dans Positionnement
════════════════════════════════════════════════════════════════════════════ */
import { S, CA, CP, CAU, CAT_TAGS, TAGS_GENERAUX } from './state.js';
import { fmt, escapeHtml } from './utils.js';
import { log } from './logger.js';

/* ── Abréviations pour les boutons de l'écran de saisie des abréviations en mode match (supprimées le 19/04/2026) ── */
const SHORT = { 'Exécution du Jet' : 'Exécution Jet', 'Reprise de dribble' : 'Reprise dribb.', 
   'Passage en Force' : 'Passage Force', 'Communication' : 'Comm.', 
   'Gestion du sifflet' : 'Gestion Sifflet', "Zone d'influence" : "Zone Influence"
   
};
function shortName(cat) { return SHORT[cat] || cat; }

/* ═══ Construction de la grille Quick Notes (layout compact 7 col) ═════ */
export function buildQuickNotes() {
  const wrap = document.getElementById('quickNotesWrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  ['A1', 'A2'].forEach(arb => {
    const zone = document.createElement('div');
    zone.className = 'qn-zone qn-' + arb.toLowerCase();
    zone.id = 'qnZone_' + arb;

    const nameLabel = arb === 'A1' ? S.a1 : S.a2;

    /* En-tête de zone — v0.3.24 (FRAG-3) : nom d'arbitre échappé */
    zone.innerHTML =
      '<div class="qn-header">' +
        '<span class="qn-name">' + arb + ' — ' + escapeHtml(nameLabel) + '</span>' +
        '<span class="qn-stats" id="qnStats_' + arb + '">0R · 0V</span>' +
      '</div>' +
      '<div class="qn-grid" id="qnGrid_' + arb + '"></div>';
    wrap.appendChild(zone);

    const grid = document.getElementById('qnGrid_' + arb);

    /* Décisions techniques — grille compacte 7 colonnes :
       [catName] [✘] [✔]  [catName] [✘] [✔]  (+ 1 col vide si impair)
       On regroupe les catégories par paires sur une même ligne */
    _addSectionLabel(grid, 'Décisions techniques');
    _addCompactRows(grid, arb, CA);

    /* Positionnement */
    _addSectionLabel(grid, 'Positionnement');
    _addCompactRows(grid, arb, CP);

    /* Autre — toujours sur sa propre ligne */
    const autreRow = document.createElement('div');
    autreRow.className = 'qn-compact-row';

    const autreNameEl = document.createElement('div');
    autreNameEl.className = 'qn-cname';
    autreNameEl.style.fontStyle = 'italic';
    autreNameEl.style.color = '#999';
    autreNameEl.textContent = 'Autre';

    const btnAutreR = _makeTapBtn(arb, 'Autre', 'red');
    btnAutreR.style.borderStyle = 'dashed';
    btnAutreR.style.background = 'transparent';
    btnAutreR.style.color = '#aaa';

    const btnAutreG = _makeTapBtn(arb, 'Autre', 'green');
    btnAutreG.style.borderStyle = 'dashed';
    btnAutreG.style.background = 'transparent';
    btnAutreG.style.color = '#aaa';

    autreRow.appendChild(autreNameEl);
    autreRow.appendChild(btnAutreR);
    autreRow.appendChild(btnAutreG);
    /* Remplir les 3 colonnes restantes */
    for (let i = 0; i < 3; i++) {
      const spacer = document.createElement('div');
      autreRow.appendChild(spacer);
    }
    grid.appendChild(autreRow);
  });

  refreshCounters();
}

/* ── Ajoute un label de section (occupe toute la largeur) ── */
function _addSectionLabel(grid, text) {
  const lbl = document.createElement('div');
  lbl.className = 'qn-section-label';
  lbl.textContent = text;
  grid.appendChild(lbl);
}

/* ── Ajoute les catégories par paires dans une grille 7 colonnes ── */
function _addCompactRows(grid, arb, cats) {
  for (let i = 0; i < cats.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'qn-compact-row';

    /* Première catégorie de la paire */
    const name1 = document.createElement('div');
    name1.className = 'qn-cname';
    name1.textContent = shortName(cats[i]);
    row.appendChild(name1);
    row.appendChild(_makeTapBtn(arb, cats[i], 'red'));
    row.appendChild(_makeTapBtn(arb, cats[i], 'green'));

    /* Deuxième catégorie (si elle existe) */
    if (i + 1 < cats.length) {
      const name2 = document.createElement('div');
      name2.className = 'qn-cname';
      name2.textContent = shortName(cats[i + 1]);
      row.appendChild(name2);
      row.appendChild(_makeTapBtn(arb, cats[i + 1], 'red'));
      row.appendChild(_makeTapBtn(arb, cats[i + 1], 'green'));
    } else {
      /* Impair : remplir les colonnes vides */
      for (let j = 0; j < 3; j++) {
        const spacer = document.createElement('div');
        row.appendChild(spacer);
      }
    }

    grid.appendChild(row);
  }
}

/* ═══ Bouton tap — ouvre TOUJOURS la popup (plus de tap court) ═════════ */
function _makeTapBtn(arb, cat, col) {
  const btn = document.createElement('button');
  btn.className = 'qn-tap ' + col;
  const safeId = 'qnCnt_' + arb + '_' + cat.replace(/[^a-zA-Z0-9]/g, '') + '_' + col;
  btn.innerHTML = (col === 'red' ? '✘' : '✔') +
    '<span class="qn-count" id="' + safeId + '"></span>';

  /* Simple tap → ouvre la popup obligatoirement */
  btn.addEventListener('touchstart', e => { e.preventDefault(); }, { passive: false });
  btn.addEventListener('touchend', e => {
    e.preventDefault();
    _flashBtn(btn);
    _openDetail(arb, cat, col);
  });

  /* Fallback souris (desktop) */
  btn.addEventListener('click', e => {
    e.preventDefault();
    _flashBtn(btn);
    _openDetail(arb, cat, col);
  });

  return btn;
}

function _flashBtn(btn) {
  btn.classList.remove('qn-flash');
  void btn.offsetWidth;
  btn.classList.add('qn-flash');
  if (navigator.vibrate) navigator.vibrate(15);
}

/* ═══ Popup détail (obligatoire à chaque tap) ══════════════════════════ */

/**
 * Reconstruit la zone de tags dans la popup.
 * @param {string}   cat       catégorie de l'observation
 * @param {string}   col       'red' | 'green' — type courant
 * @param {string[]} keepTags  tags à pré-sélectionner (vide = aucun)
 * @param {string}   primaryArb  'A1' | 'A2' — arbitre principal courant
 */
function _rebuildTags(cat, col, keepTags, primaryArb) {
  const tagsWrap = document.getElementById('detailTags');
  tagsWrap.innerHTML = '';

  /* ── Tag "Autre arbitre aussi" ── */
  const otherArb = primaryArb === 'A1' ? 'A2' : 'A1';
  const tagBoth = document.createElement('button');
  tagBoth.id = 'tagBothArb';
  tagBoth.className = 'qn-tag';
  tagBoth.textContent = '+ ' + otherArb + ' aussi';
  tagBoth.style.borderStyle = 'dashed';
  if (S.detailPending.arb.includes(otherArb)) tagBoth.classList.add('selected');
  tagBoth.onclick = () => {
    tagBoth.classList.toggle('selected');
    S.detailPending.arb = tagBoth.classList.contains('selected')
      ? [primaryArb, otherArb]
      : [primaryArb];
  };
  tagsWrap.appendChild(tagBoth);

  /* ── Tags spécifiques à la catégorie (filtrés par couleur) ── */
  const catDef = CAT_TAGS[cat];
  if (catDef) {
    const specific = [
      ...(col === 'red' ? catDef.red : catDef.green),
      ...catDef.both
    ];
    specific.forEach(t => {
      const tag = document.createElement('button');
      tag.className = 'qn-tag';
      tag.textContent = t;
      if (keepTags.includes(t)) tag.classList.add('selected');
      tag.onclick = () => tag.classList.toggle('selected');
      tagsWrap.appendChild(tag);
    });
  }

  /* ── Séparateur ── */
  if (catDef && (catDef.both.length || catDef.red.length || catDef.green.length)) {
    const sep = document.createElement('div');
    sep.style.cssText = 'width:100%;height:0;border-top:1px dashed var(--border-input);margin:4px 0;';
    tagsWrap.appendChild(sep);
  }

  /* ── Tags généraux (équipes + généraux) ── */
  const tagsGenerauxDyn = [S.tA, S.tB].filter(Boolean).concat(TAGS_GENERAUX);
  tagsGenerauxDyn.forEach(t => {
    const tag = document.createElement('button');
    tag.className = 'qn-tag';
    tag.textContent = t;
    if (keepTags.includes(t)) tag.classList.add('selected');
    tag.onclick = () => tag.classList.toggle('selected');
    tagsWrap.appendChild(tag);
  });
}

function _openDetail(arb, cat, col, prefill) {
  /* prefill : objet { arb, tags, cmt, editIndex, time, el, period }
     pour le mode édition, undefined pour une nouvelle observation. */
  const isEdit = prefill !== undefined;

  S.detailPending = {
    arb:       isEdit ? [...prefill.arb] : [arb],
    cat, col,
    time:      isEdit ? prefill.time   : fmt(S.elapsed),
    el:        isEdit ? prefill.el     : S.elapsed,
    period:    isEdit ? prefill.period : S.period,
    editIndex: isEdit ? prefill.editIndex : undefined
  };

  /* ── Titre ── */
  const colLabel = col === 'red' ? 'Non conforme' : 'Conforme';
  document.getElementById('detailTitle').textContent =
    (isEdit ? '✎ Modifier — ' : '') + cat + ' — ' + colLabel;
  document.getElementById('detailMeta').textContent =
    S.detailPending.time + ' · ' + S.detailPending.period;

  /* ── Bouton save ── */
  const btnSave = document.getElementById('detailBtnSave');
  if (btnSave) btnSave.textContent = isEdit ? 'Mettre à jour' : 'Enregistrer';

  /* ══ Contrôles édition : Arbitre + Type (mode édition uniquement) ══ */
  const editControls = document.getElementById('detailEditControls');
  if (editControls) {
    if (isEdit) {
      editControls.style.display = 'flex';

      /* ── Toggle Arbitre ── */
      const primaryArb = S.detailPending.arb[0];
      ['A1', 'A2'].forEach(a => {
        const btn = document.getElementById('detailArb_' + a);
        if (!btn) return;
        btn.textContent = a === 'A1' ? (S.a1 || 'A1') : (S.a2 || 'A2');
        btn.classList.toggle('edit-ctrl-active', a === primaryArb);
        btn.onclick = () => {
          /* Changer l'arbitre principal, réinitialiser "autre aussi" */
          S.detailPending.arb = [a];
          document.querySelectorAll('.edit-ctrl-arb').forEach(b =>
            b.classList.toggle('edit-ctrl-active', b.dataset.arb === a));
          /* Reconstruire les tags pour mettre à jour le label "+ Autre aussi" */
          const currentTags = _getSelectedTags();
          _rebuildTags(cat, S.detailPending.col, currentTags, a);
        };
      });

      /* ── Toggle Type ── */
      ['red', 'green'].forEach(c => {
        const btn = document.getElementById('detailCol_' + c);
        if (!btn) return;
        btn.classList.toggle('edit-ctrl-active', c === col);
        btn.onclick = () => {
          if (S.detailPending.col === c) return; /* pas de changement */
          S.detailPending.col = c;

          /* Mettre à jour le titre */
          document.getElementById('detailTitle').textContent =
            '✎ Modifier — ' + cat + ' — ' + (c === 'red' ? 'Non conforme' : 'Conforme');

          /* Conserver uniquement les tags both + généraux sélectionnés */
          const catDef = CAT_TAGS[cat];
          const bothTags  = catDef ? catDef.both : [];
          const genTags   = [S.tA, S.tB].filter(Boolean).concat(TAGS_GENERAUX);
          const keepable  = [...bothTags, ...genTags];
          const currentSelected = _getSelectedTags();
          const keepTags  = currentSelected.filter(t => keepable.includes(t));

          document.querySelectorAll('.edit-ctrl-type').forEach(b =>
            b.classList.toggle('edit-ctrl-active', b.dataset.col === c));

          _rebuildTags(cat, c, keepTags, S.detailPending.arb[0]);
        };
      });

    } else {
      editControls.style.display = 'none';
    }
  }

  /* ── Tags initiaux ── */
  const initialTags = isEdit ? (prefill.tags || []) : [];
  const primaryArb  = isEdit ? prefill.arb[0] : arb;
  _rebuildTags(cat, col, initialTags, primaryArb);

  /* ── Note libre ── */
  document.getElementById('detailNote').value = isEdit ? (prefill.cmt || '') : '';
  document.getElementById('detailOverlay').classList.add('on');
}

/** Lit les tags actuellement sélectionnés dans la popup (hors tag "autre arbitre"). */
function _getSelectedTags() {
  const tags = [];
  document.querySelectorAll('#detailTags .qn-tag.selected').forEach(t => {
    if (!t.textContent.startsWith('+')) tags.push(t.textContent);
  });
  return tags;
}

export function closeDetail() {
  document.getElementById('detailOverlay').classList.remove('on');
  S.detailPending = null;
}

export function saveDetail() {
  S.matchActif = true; /* v0.3.31 (BUG-5) */
  if (!S.detailPending) return;

  const selectedTags = [];
  document.querySelectorAll('#detailTags .qn-tag.selected').forEach(t => {
    if (!t.textContent.startsWith('+')) selectedTags.push(t.textContent);
  });
  const cmt = document.getElementById('detailNote').value.trim();

  const d = S.detailPending;
  const arbNames = d.arb.map(a => a === 'A1' ? S.a1 : S.a2);

  const obsEntry = {
    time: d.time, el: d.el, period: d.period,
    arb: [...d.arb],
    an: arbNames.join(' + '),
    cat: d.cat,
    cats: [d.cat],
    col: d.col,
    tags: selectedTags,
    cmt: cmt
  };

  const isEdit = d.editIndex !== undefined;

  if (isEdit) {
    /* ── Mode édition : remplacement en place ── */
    S.obs.splice(d.editIndex, 1, obsEntry);
    log.info('OBS', 'observation_modifiee', {
      index: d.editIndex,
      arbitres: arbNames.join(' + '), categorie: d.cat,
      type: d.col === 'red' ? 'non_conforme' : 'conforme',
      tags: selectedTags.join(', '),
      totalObservations: S.obs.length
    });
  } else {
    /* ── Mode création : ajout ── */
    S.obs.push(obsEntry);
    log.info('OBS', 'observation_enregistree', {
      arbitres: arbNames.join(' + '), categorie: d.cat,
      type: d.col === 'red' ? 'non_conforme' : 'conforme',
      tags: selectedTags.join(', '),
      temps: d.time, periode: d.period,
      totalObservations: S.obs.length
    });
  }

  closeDetail();
  refreshCounters();
  renderTable();
  renderEndTable();
  _refreshSynthesisIfVisible(); /* v0.4.10 */
  window.App.autosave();
}

/* ═══ Édition d'une observation existante — v0.4.9 ═════════════════════
   Retrouve l'observation par index dans S.obs et rouvre la popup
   avec toutes les données pré-remplies.                                  */
export function editObservation(idx) {
  const o = S.obs[idx];
  if (!o) return;
  /* L'arbitre principal est le premier de la liste */
  const primaryArb = o.arb[0];
  _openDetail(primaryArb, o.cat, o.col, {
    arb:       o.arb,
    tags:      o.tags || [],
    cmt:       o.cmt  || '',
    time:      o.time,
    el:        o.el,
    period:    o.period,
    editIndex: idx
  });
}

/* ═══ Suppression d'une observation — v0.4.9 ═══════════════════════════
   Stocke l'index candidat et ouvre la modale de confirmation.            */
let _pendingDeleteIdx = null;

export function deleteObservation(idx) {
  if (idx < 0 || idx >= S.obs.length) return;
  _pendingDeleteIdx = idx;

  /* Alimenter la modale avec un résumé de l'observation */
  const o = S.obs[idx];
  const cmtParts = [];
  if (o.tags && o.tags.length) cmtParts.push(o.tags.join(', '));
  if (o.cmt) cmtParts.push(o.cmt);
  const resume = o.time + ' · ' + o.period + ' · ' + o.an + ' · ' + o.cat +
    (cmtParts.length ? ' · ' + cmtParts.join(' / ') : '');

  const summaryEl = document.getElementById('confirmObsSummary');
  if (summaryEl) summaryEl.textContent = resume;

  document.getElementById('confirmOverlay').classList.add('on');
}

/* ── Rafraîchit la synthèse si l'écran ES est visible — v0.4.10 ──────
   Appelé après toute modification ou suppression d'observation pour que
   la card "Synthèse par catégorie" reste synchronisée en temps réel.    */
function _refreshSynthesisIfVisible() {
  const es = document.getElementById('ES');
  if (es && es.style.display !== 'none') {
    if (window.App && typeof window.App.buildSynTable === 'function') {
      window.App.buildSynTable();
    }
  }
}

export function confirmDelete() {
  if (_pendingDeleteIdx === null) return;
  const o = S.obs[_pendingDeleteIdx];
  S.obs.splice(_pendingDeleteIdx, 1);
  log.info('OBS', 'observation_supprimee', {
    index: _pendingDeleteIdx,
    categorie: o ? o.cat : '?',
    totalObservations: S.obs.length
  });
  _pendingDeleteIdx = null;
  closeConfirm();
  refreshCounters();
  renderTable();
  renderEndTable();
  _refreshSynthesisIfVisible(); /* v0.4.10 */
  window.App.autosave();
}

export function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('on');
  _pendingDeleteIdx = null;
}

/* ═══ Compteurs ════════════════════════════════════════════════════════ */
export function refreshCounters() {
  ['A1', 'A2'].forEach(arb => {
    let totalR = 0, totalG = 0;
    [...CA, ...CP, CAU].forEach(cat => {
      const safeKey = arb + '_' + cat.replace(/[^a-zA-Z0-9]/g, '') + '_';
      const cR = S.obs.filter(o => o.arb.includes(arb) && o.cat === cat && o.col === 'red').length;
      const cG = S.obs.filter(o => o.arb.includes(arb) && o.cat === cat && o.col === 'green').length;
      totalR += cR; totalG += cG;
      const elR = document.getElementById('qnCnt_' + safeKey + 'red');
      const elG = document.getElementById('qnCnt_' + safeKey + 'green');
      if (elR) elR.textContent = cR || '';
      if (elG) elG.textContent = cG || '';
    });
    const stats = document.getElementById('qnStats_' + arb);
    if (stats) stats.textContent = totalR + 'R · ' + totalG + 'V';
  });

  const oc = document.getElementById('OC');
  if (oc) oc.textContent = S.obs.length + ' obs.';
}

/* ═══ Tableau des observations ═════════════════════════════════════════ */
const PERIOD_WEIGHT = { 'MT1': 0, 'MT2': 1, 'Prol.1': 2, 'Prol.2': 3 };

function chronoKey(obs) {
  const pw = (PERIOD_WEIGHT[obs.period] ?? 0) * 10000;
  return pw + (obs.el || 0);
}

export function sorted(by) {
  const o = [...S.obs];
  if      (by === 'cat')      o.sort((a, b) => a.cat.localeCompare(b.cat));
  else if (by === 'arb')      o.sort((a, b) => a.an.localeCompare(b.an));
  else if (by === 'col')      o.sort((a, b) => a.col.localeCompare(b.col));
  else if (by === 'time_asc') o.sort((a, b) => chronoKey(a) - chronoKey(b));
  else                        o.sort((a, b) => chronoKey(b) - chronoKey(a));
  return o;
}

/* ═══ Filtres par colonne — v0.3.32 ════════════════════════════════════
   Deux états indépendants : F pour l'écran MS, FE pour l'écran ES.
   Structure : { cat, col, period, arb } — valeur 'all' = pas de filtrage.
   Les filtres sont cumulables et appliqués sur les données sources.      */

/** @type {{ cat: string, col: string, period: string, arb: string }} */
const F  = { cat: 'all', col: 'all', period: 'all', arb: 'all' }; /* écran MS */
/** @type {{ cat: string, col: string, period: string, arb: string }} */
const FE = { cat: 'all', col: 'all', period: 'all', arb: 'all' }; /* écran ES */

/**
 * Fonction de filtrage pure — aucun effet de bord.
 * @param {Array} obs   tableau source (S.obs ou sous-ensemble)
 * @param {{ cat:string, col:string, period:string, arb:string }} f  état des filtres
 * @returns {Array} sous-tableau filtré
 */
function applyFilters(obs, f) {
  return obs.filter(o => {
    /* Filtre catégorie : correspondance exacte */
    if (f.cat !== 'all' && o.cat !== f.cat) return false;
    /* Filtre type : 'red' = Non conforme, 'green' = Conforme */
    if (f.col !== 'all' && o.col !== f.col) return false;
    /* Filtre période (MT) : correspondance exacte */
    if (f.period !== 'all' && o.period !== f.period) return false;
    /* Filtre arbitre : l'observation doit inclure l'arbitre sélectionné.
       o.arb est un tableau (['A1'] ou ['A1','A2']).
       On compare via le code arbitre (A1/A2), pas le nom, pour robustesse. */
    if (f.arb !== 'all' && !o.arb.includes(f.arb)) return false;
    return true;
  });
}

/**
 * Compte les filtres actifs (valeur ≠ 'all') dans un état de filtre.
 * @param {{ cat:string, col:string, period:string, arb:string }} f
 * @returns {number}
 */
function countActiveFilters(f) {
  return Object.values(f).filter(v => v !== 'all').length;
}

/**
 * Recalcule les options dynamiques (Catégorie, Arbitre) en fonction de S.obs,
 * puis met à jour les selects du tableau ciblé (MS ou ES).
 * Les options fixes (Type, MT) ne sont jamais recalculées.
 * @param {'ms'|'es'} screen
 */
function _syncFilterOptions(screen) {
  const suffix = screen === 'es' ? 'E' : '';

  /* Options Catégorie : toutes les catégories présentes dans S.obs */
  const cats = [...new Set(S.obs.map(o => o.cat))].sort((a, b) => a.localeCompare(b));
  const selCat = document.getElementById('fltCat' + suffix);
  if (selCat) {
    const prev = selCat.value;
    selCat.innerHTML = '<option value="all">Toutes</option>' +
      cats.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
    /* Réappliquer la valeur précédente si elle existe encore */
    if (cats.includes(prev)) selCat.value = prev;
  }

  /* Options Arbitre : A1 / A2 avec leurs noms réels */
  const selArb = document.getElementById('fltArb' + suffix);
  if (selArb) {
    const prev = selArb.value;
    selArb.innerHTML =
      '<option value="all">Tous</option>' +
      '<option value="A1">' + escapeHtml(S.a1 || 'Arbitre 1') + '</option>' +
      '<option value="A2">' + escapeHtml(S.a2 || 'Arbitre 2') + '</option>';
    if (prev === 'A1' || prev === 'A2') selArb.value = prev;
  }
}

/**
 * Met à jour le badge "N filtre(s) actif(s)" et l'état du bouton reset.
 * Met aussi en évidence les selects dont la valeur est active (≠ 'all').
 * @param {'ms'|'es'} screen
 */
function _syncFilterBadge(screen) {
  const f      = screen === 'es' ? FE : F;
  const suffix = screen === 'es' ? 'E' : '';
  const n      = countActiveFilters(f);

  const badge = document.getElementById('fltBadge' + suffix);
  const btnR  = document.getElementById('fltReset' + suffix);

  if (badge) {
    badge.textContent = n > 0 ? n + ' filtre' + (n > 1 ? 's' : '') + ' actif' + (n > 1 ? 's' : '') : '';
    badge.style.display = n > 0 ? 'inline-block' : 'none';
  }
  if (btnR) {
    btnR.disabled = n === 0;
    btnR.classList.toggle('flt-reset-active', n > 0);
  }

  /* Mise en évidence visuelle des selects actifs */
  [
    ['fltCat'    + suffix, f.cat],
    ['fltCol'    + suffix, f.col],
    ['fltMT'     + (screen === 'es' ? 'E' : ''), f.period],
    ['fltArb'    + suffix, f.arb],
  ].forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('flt-on', val !== 'all');
  });
}

/** Appelé par les onchange des selects de filtre — écran MS */
export function onFilterChange() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : 'all'; };
  F.cat    = g('fltCat');
  F.col    = g('fltCol');
  F.period = g('fltMT');
  F.arb    = g('fltArb');
  log.info('FILTERS', 'filtre_ms_change', { ...F });
  renderTable();
}

/** Appelé par les onchange des selects de filtre — écran ES */
export function onFilterChangeE() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : 'all'; };
  FE.cat    = g('fltCatE');
  FE.col    = g('fltColE');
  FE.period = g('fltMTE');
  FE.arb    = g('fltArbE');
  log.info('FILTERS', 'filtre_es_change', { ...FE });
  renderEndTable();
}

/** Reset complet des filtres — écran MS */
export function resetFilters() {
  F.cat = F.col = F.period = F.arb = 'all';
  ['fltCat','fltCol','fltMT','fltArb'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  log.info('FILTERS', 'filtre_ms_reset');
  renderTable();
}

/** Reset complet des filtres — écran ES */
export function resetFiltersE() {
  FE.cat = FE.col = FE.period = FE.arb = 'all';
  ['fltCatE','fltColE','fltMTE','fltArbE'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 'all';
  });
  log.info('FILTERS', 'filtre_es_reset');
  renderEndTable();
}

export function oRow(o, idx) {
  const rc = o.col === 'red' ? 'rr' : 'rg';
  const tl = o.col === 'red' ? 'Non conf./manquante' : 'Conforme';
  const cmtParts = [];
  if (o.tags && o.tags.length) cmtParts.push(o.tags.join(', '));
  if (o.cmt) cmtParts.push(o.cmt);
  const cmtText = cmtParts.join(' · ') || '';

  /* v0.3.24 (FRAG-3) : échappement HTML des champs utilisateur */
  /* v0.4.9 : ajout colonne Actions (crayon + croix) avec data-idx */
  return '<tr class="' + rc + '" data-idx="' + idx + '">' +
    '<td style="white-space:nowrap;font-variant-numeric:tabular-nums;">' + o.time + '</td>' +
    '<td style="white-space:nowrap;">' + o.period + '</td>' +
    '<td><span class="badge ba">' + escapeHtml(o.an) + '</span></td>' +
    '<td style="font-weight:700;white-space:nowrap;">' + escapeHtml(o.cat) + '</td>' +
    '<td><span class="lc">' + tl + '</span></td>' +
    '<td>' + escapeHtml(cmtText) + '</td>' +
    '<td class="obs-actions" style="white-space:nowrap;">' +
      '<button class="obs-btn-edit" onclick="editObservation(' + idx + ')" title="Modifier">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>' +
        '</svg>' +
      '</button>' +
      '<button class="obs-btn-del" onclick="deleteObservation(' + idx + ')" title="Supprimer">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<line x1="18" y1="6" x2="6" y2="18"/>' +
          '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '</svg>' +
      '</button>' +
    '</td></tr>';
}

export function renderTable() {
  _syncFilterOptions('ms');

  const sel = document.getElementById('sortSel');
  const all = sorted(sel ? sel.value : 'time_desc');
  const filtered = applyFilters(all, F);

  const tb = document.getElementById('OTB');
  if (tb) {
    if (S.obs.length === 0) {
      tb.innerHTML = '<tr><td colspan="7" class="empty">Aucune observation</td></tr>';
    } else if (filtered.length === 0) {
      tb.innerHTML = '<tr><td colspan="7" class="empty">Aucun résultat pour ces filtres</td></tr>';
    } else {
      /* Passer l'index réel dans S.obs (pas l'index dans filtered) */
      tb.innerHTML = filtered.map(o => oRow(o, S.obs.indexOf(o))).join('');
    }
  }

  const oc = document.getElementById('OC');
  if (oc) {
    oc.textContent = countActiveFilters(F) > 0
      ? filtered.length + '/' + S.obs.length + ' obs.'
      : S.obs.length + ' obs.';
  }

  _syncFilterBadge('ms');
  refreshCounters();
}

export function renderEndTable() {
  _syncFilterOptions('es');

  const sel = document.getElementById('sortSelE');
  const all = sorted(sel ? sel.value : 'time_desc');
  const filtered = applyFilters(all, FE);

  const etb = document.getElementById('EETB');
  if (etb) {
    if (S.obs.length === 0) {
      etb.innerHTML = '<tr><td colspan="7" class="empty">Aucune observation</td></tr>';
    } else if (filtered.length === 0) {
      etb.innerHTML = '<tr><td colspan="7" class="empty">Aucun résultat pour ces filtres</td></tr>';
    } else {
      etb.innerHTML = filtered.map(o => oRow(o, S.obs.indexOf(o))).join('');
    }
  }

  _syncFilterBadge('es');
}
