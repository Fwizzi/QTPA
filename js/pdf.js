/* ═══ PDF v0.4.2 — Correctif radar SVG async ════════════════════════════════
   Correctif v0.4.2 (BUG-RADAR) :
   - La capture du radar SVG était asynchrone (Image.onload) mais doc.save()
     était appelé de façon synchrone juste après, avant que l'image soit
     chargée. Le radar n'apparaissait donc jamais dans le PDF.
   - Correction : _generatePDF() devient async et retourne une Promise.
     La section radar utilise await _captureRadar() qui résout quand
     l'image est prête (ou résout null en cas d'échec).
     doc.save() n'est appelé qu'après résolution de toutes les sections.
   - _onExportClick() utilise désormais await _generatePDF(selection).
════════════════════════════════════════════════════════════════════════════ */
import { S, ans, QS } from './state.js';
import { fmt, fmtDate } from './utils.js';
import { log, startTimer, endTimer } from './logger.js';

const JSPDF_URL     = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const AUTOTABLE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

/* ── Chargement lazy jsPDF ───────────────────────────────────────────────── */
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    log.info('PDF', 'jspdf_chargement_debut');
    const t = startTimer('jspdf_load');
    const s1 = document.createElement('script');
    s1.src = JSPDF_URL;
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = AUTOTABLE_URL;
      s2.onload  = () => { endTimer('PDF', 'jspdf_chargement_ok', t); resolve(); };
      s2.onerror = () => { log.error('PDF', 'autotable_chargement_erreur', { url: AUTOTABLE_URL }); reject(new Error('Impossible de charger jspdf-autotable')); };
      document.head.appendChild(s2);
    };
    s1.onerror = () => { log.error('PDF', 'jspdf_chargement_erreur', { url: JSPDF_URL }); reject(new Error('Impossible de charger jsPDF')); };
    document.head.appendChild(s1);
  });
}

/* ── Sanitize nom de fichier ─────────────────────────────────────────────── */
function sanitize(str) {
  return (str || '').trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/* ── Définition des cards disponibles ───────────────────────────────────────
   Ordre = ordre d'apparition dans le PDF.
─────────────────────────────────────────────────────────────────────────── */
const CARDS_DEF = [
  { id: 'score',        label: 'Score final + mi-temps',   checked: true  },
  { id: 'context',      label: 'Contexte du match',        checked: true  },
  { id: 'eval',         label: '\u00c9valuation g\u00e9n\u00e9rale',         checked: true  },
  { id: 'synthesis',    label: 'Synth\u00e8se par cat\u00e9gorie',      checked: true  },
  { id: 'radar',        label: 'Radar SVG de synth\u00e8se',       checked: false },
  { id: 'observations', label: 'Tableau des observations', checked: true  },
  { id: 'comment',      label: 'Commentaire global',       checked: true  },
];

const APP_BLUE     = '#1D3A7A';
const APP_BLUE_RGB = [29, 58, 122];

/* ── Point d'entrée public ───────────────────────────────────────────────── */
/* v1.3.2 : flag _reexportMode — quand true, saveToHistory n'est pas appelé
   après génération du PDF (évite la duplication dans l'historique). */
let _reexportMode = false;

export function exportPDF(reexport = false) {
  _reexportMode = reexport;
  _showCardSelectionModal();
}

/* ── Modal de sélection — style app ─────────────────────────────────────── */
function _showCardSelectionModal() {
  if (document.getElementById('pdfModalOverlay')) return;

  const state = _getModalState();

  const overlay = document.createElement('div');
  overlay.id = 'pdfModalOverlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'background:rgba(0,0,0,0.45)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'font-family:var(--font,system-ui,sans-serif)',
  ].join(';');
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeModal(); });

  const modal = document.createElement('div');
  modal.style.cssText = [
    'background:var(--bg-card,#fff)',
    'border-radius:12px',
    'width:340px', 'max-width:94vw',
    'overflow:hidden',
    'box-shadow:0 6px 28px rgba(0,0,0,0.18)',
    'border:1px solid var(--border,#ddd)',
  ].join(';');

  const header = document.createElement('div');
  header.style.cssText = 'background:' + APP_BLUE + ';padding:14px 18px;display:flex;align-items:center;justify-content:space-between;';
  header.innerHTML =
    '<div>' +
      '<div style="color:#fff;font-size:14px;font-weight:700;letter-spacing:0.01em;">Exporter en PDF</div>' +
      '<div style="color:rgba(255,255,255,0.65);font-size:11px;margin-top:2px;">S\u00e9lectionnez les sections \u00e0 inclure</div>' +
    '</div>' +
    '<button id="pdfModalClose" style="background:none;border:none;color:rgba(255,255,255,0.7);font-size:20px;cursor:pointer;padding:2px 6px;line-height:1;" title="Fermer">\u00d7</button>';

  const body = document.createElement('div');
  body.style.cssText = 'padding:14px 18px;';

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:10px;';
  const allBtn = document.createElement('button');
  allBtn.id = 'pdfSelectAll';
  allBtn.style.cssText = [
    'background:none',
    'border:1px solid var(--border,#ccc)',
    'border-radius:6px', 'padding:4px 10px',
    'font-size:11px', 'cursor:pointer',
    'color:var(--text-secondary,#555)',
    'font-family:inherit',
  ].join(';');
  topRow.appendChild(allBtn);
  body.appendChild(topRow);

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

  CARDS_DEF.forEach(card => {
    const row = document.createElement('label');
    row.style.cssText = [
      'display:flex', 'align-items:center', 'gap:10px',
      'cursor:pointer', 'padding:7px 10px',
      'border-radius:7px',
      'border:1px solid var(--border,#e5e5e5)',
      'background:var(--bg-input,#f7f7f9)',
    ].join(';');
    row.addEventListener('mouseenter', () => { row.style.background = 'var(--bg-hover,#eef2fb)'; });
    row.addEventListener('mouseleave', () => { row.style.background = 'var(--bg-input,#f7f7f9)'; });

    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.id      = 'pdfCard_' + card.id;
    cb.checked = state[card.id] !== undefined ? state[card.id] : card.checked;
    cb.style.cssText = 'width:15px;height:15px;cursor:pointer;flex-shrink:0;accent-color:' + APP_BLUE + ';';

    const lbl = document.createElement('span');
    lbl.textContent = card.label;
    lbl.style.cssText = 'font-size:13px;color:var(--text,#1a1a2e);font-family:inherit;';

    row.appendChild(cb);
    row.appendChild(lbl);
    list.appendChild(row);
  });
  body.appendChild(list);

  const footer = document.createElement('div');
  footer.style.cssText = [
    'padding:10px 18px 14px',
    'display:flex', 'gap:8px', 'justify-content:flex-end',
    'border-top:1px solid var(--border,#e5e5e5)',
  ].join(';');

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annuler';
  cancelBtn.style.cssText = [
    'padding:7px 15px', 'border-radius:8px',
    'border:1px solid var(--border,#ccc)',
    'background:var(--bg-card,#fff)',
    'cursor:pointer', 'font-size:13px',
    'color:var(--text,#1a1a2e)',
    'font-family:inherit', 'font-weight:600',
  ].join(';');
  cancelBtn.addEventListener('click', _closeModal);

  const exportBtn = document.createElement('button');
  exportBtn.id = 'pdfExportBtn';
  exportBtn.textContent = 'Exporter PDF';
  exportBtn.style.cssText = [
    'padding:7px 16px', 'border-radius:8px',
    'border:1px solid ' + APP_BLUE,
    'background:' + APP_BLUE,
    'color:#fff', 'cursor:pointer',
    'font-size:13px', 'font-weight:700',
    'font-family:inherit',
  ].join(';');
  exportBtn.addEventListener('click', _onExportClick);

  footer.appendChild(cancelBtn);
  footer.appendChild(exportBtn);
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('pdfModalClose').addEventListener('click', _closeModal);

  allBtn.addEventListener('click', () => {
    const allChecked = CARDS_DEF.every(c => {
      const el = document.getElementById('pdfCard_' + c.id);
      return el && el.checked;
    });
    CARDS_DEF.forEach(c => {
      const el = document.getElementById('pdfCard_' + c.id);
      if (el) el.checked = !allChecked;
    });
    _updateAllBtnLabel(allBtn);
  });
  list.addEventListener('change', () => _updateAllBtnLabel(allBtn));
  _updateAllBtnLabel(allBtn);
}

function _updateAllBtnLabel(btn) {
  const allChecked = CARDS_DEF.every(c => {
    const el = document.getElementById('pdfCard_' + c.id);
    return el && el.checked;
  });
  btn.textContent = allChecked ? 'Tout d\u00e9s\u00e9lectionner' : 'Tout s\u00e9lectionner';
}

function _getModalState() {
  const s = {};
  CARDS_DEF.forEach(c => {
    const el = document.getElementById('pdfCard_' + c.id);
    if (el) s[c.id] = el.checked;
  });
  return s;
}

function _closeModal() {
  const overlay = document.getElementById('pdfModalOverlay');
  if (overlay) overlay.remove();
}

/* ── Clic export — async pour attendre la capture radar ─────────────────── */
async function _onExportClick() {
  const selection = _readSelection();
  if (!selection.length) {
    window.App.showAlert('S\u00e9lectionnez au moins une section \u00e0 exporter.');
    return;
  }

  const exportBtn = document.getElementById('pdfExportBtn');
  if (exportBtn) { exportBtn.textContent = 'Chargement\u2026'; exportBtn.disabled = true; }

  log.info('PDF', 'export_debut', {
    equipeA: S.tA, equipeB: S.tB, scoreA: S.sA, scoreB: S.sB,
    nbObs: S.obs.length, cards: selection,
  });
  const t = startTimer('pdf_export');

  try {
    await loadJsPDF();
    /* v0.4.2 (BUG-RADAR) : _generatePDF est désormais async,
       on attend sa résolution avant de considérer l'export terminé */
    await _generatePDF(selection);
    endTimer('PDF', 'export_ok', t, { nbObs: S.obs.length, cards: selection });
    /* v1.3.2 : ne sauvegarder que lors d'un vrai export, pas d'un réexport */
    if (!_reexportMode) { window.App.saveToHistory(); }
    _reexportMode = false;
    _closeModal();
  } catch (err) {
    log.error('PDF', 'export_erreur', { message: err.message });
    window.App.showAlert('Erreur PDF : ' + err.message + '\n\nUne connexion internet est n\u00e9cessaire au premier export pour charger la librairie PDF. Les exports suivants fonctionneront hors-ligne.');
  } finally {
    const btn = document.getElementById('pdfExportBtn');
    if (btn) { btn.textContent = 'Exporter PDF'; btn.disabled = false; }
  }
}

function _readSelection() {
  return CARDS_DEF
    .filter(c => {
      const el = document.getElementById('pdfCard_' + c.id);
      return el && el.checked;
    })
    .map(c => c.id);
}

/* ══════════════════════════════════════════════════════════════════════════
   CAPTURE RADAR SVG — retourne une Promise<string|null>
   v0.4.2 (BUG-RADAR)    : capture async avec Promise + timeout.
   v0.4.3 (QUALITE-RADAR): résolution canvas portée à 1500×1500.
   v0.4.4 (FIX-ECRASEMENT) : le SVG a width="100%" dans un conteneur
   rectangulaire. En v0.4.3, forcer width=height=1500 sur le clone causait
   une déformation (le navigateur rasterisait selon les dimensions affichées
   du conteneur, pas le viewBox carré 500×500). Correction : le clone reçoit
   width="500" height="500" (= dimensions exactes du viewBox natif), ce qui
   garantit un rendu carré sans déformation. Le canvas reçoit ensuite ces
   dimensions × SCALE (3×) et drawImage upscale proprement de 500→1500 côté
   canvas uniquement, sans jamais toucher au rendu navigateur du SVG.
══════════════════════════════════════════════════════════════════════════ */
const RADAR_NATIVE_SIZE = 500;   /* viewBox natif du SVG synthesis.js : 0 0 500 500 */
const RADAR_SCALE       = 3;     /* facteur d'upscale canvas (500×3 = 1500px)        */
const RADAR_CANVAS_SIZE = RADAR_NATIVE_SIZE * RADAR_SCALE;  /* 1500px               */
const RADAR_PDF_MM      = 110;   /* largeur d'insertion dans le PDF en mm            */

function _captureRadar() {
  return new Promise(resolve => {
    const svgEl = document.getElementById('synRadar') && document.getElementById('synRadar').querySelector('svg');
    if (!svgEl) {
      log.warn('PDF', 'radar_svg_introuvable');
      resolve(null);
      return;
    }
    try {
      /* Cloner le SVG pour ne pas modifier le DOM en place.
         On fixe width et height aux dimensions NATIVES du viewBox (500×500),
         pas aux dimensions d'affichage (width:100% dans un conteneur large).
         Cela garantit que le navigateur rasterise un carré sans déformation,
         quelle que soit la forme du conteneur parent. */
      const svgClone = svgEl.cloneNode(true);
      svgClone.setAttribute('width',   RADAR_NATIVE_SIZE);
      svgClone.setAttribute('height',  RADAR_NATIVE_SIZE);
      svgClone.setAttribute('viewBox', '0 0 ' + RADAR_NATIVE_SIZE + ' ' + RADAR_NATIVE_SIZE);
      /* Supprimer le style inline qui pourrait imposer max-width ou width:100% */
      svgClone.removeAttribute('style');

      const svgStr  = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url     = URL.createObjectURL(svgBlob);
      const img     = new Image();
      /* Forcer les dimensions de l'image chargée pour s'assurer que le
         navigateur ne sur-interprète pas la taille */
      img.width  = RADAR_NATIVE_SIZE;
      img.height = RADAR_NATIVE_SIZE;

      /* Timeout de sécurité 3s */
      const timeout = setTimeout(() => {
        log.warn('PDF', 'radar_capture_timeout');
        URL.revokeObjectURL(url);
        resolve(null);
      }, 3000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas  = document.createElement('canvas');
          canvas.width  = RADAR_CANVAS_SIZE;  /* 1500 */
          canvas.height = RADAR_CANVAS_SIZE;  /* 1500 */
          const ctx2d   = canvas.getContext('2d');
          ctx2d.fillStyle = '#ffffff';
          ctx2d.fillRect(0, 0, RADAR_CANVAS_SIZE, RADAR_CANVAS_SIZE);
          /* drawImage upscale 500→1500 : interpolation bilinéaire du canvas,
             bien meilleure qualité qu'un SVG forcé à 1500px côté navigateur */
          ctx2d.drawImage(img, 0, 0, RADAR_CANVAS_SIZE, RADAR_CANVAS_SIZE);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        } catch (canvasErr) {
          log.warn('PDF', 'radar_canvas_erreur', { message: canvasErr.message });
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        log.warn('PDF', 'radar_image_erreur');
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch (err) {
      log.warn('PDF', 'radar_capture_erreur', { message: err.message });
      resolve(null);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   GÉNÉRATION DU PDF — Design A « Officiel » — async
   v0.4.2 (BUG-RADAR) : fonction désormais async pour pouvoir await
   _captureRadar() avant d'appeler doc.save().
══════════════════════════════════════════════════════════════════════════ */
async function _generatePDF(selection) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W  = 210;
  const M  = 14;
  const CW = W - 2 * M;

  const C = {
    navy    : APP_BLUE_RGB,
    white   : [255, 255, 255],
    black   : [30,  30,  30],
    darkGray: [60,  60,  60],
    gray    : [100, 100, 100],
    lightBg : [245, 245, 245],
    ruleLine: [200, 200, 200],
    green   : [29,  158, 117],
    greenBg : [230, 250, 244],
    red     : [226,  75,  74],
    redBg   : [255, 235, 235],
    amber   : [200, 120,  10],
    tableHd : APP_BLUE_RGB,
  };

  let y = M;

  function checkPage(needed) {
    if (y + needed > 282) { doc.addPage(); y = M; }
  }

  function drawSectionTitle(title) {
    checkPage(10);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.navy);
    doc.text(title, M, y);
    y += 2;
    doc.setDrawColor(...C.ruleLine);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y);
    y += 4;
  }

  function drawRule() {
    doc.setDrawColor(...C.ruleLine);
    doc.setLineWidth(0.2);
    doc.line(M, y, M + CW, y);
    y += 4;
  }

  /* ── En-tête ─────────────────────────────────────────────────────────── */
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Suivi Arbitres Handball', M, 11);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  const meta = [];
  if (S.mDate) meta.push(fmtDate(S.mDate));
  if (S.mTime) meta.push(S.mTime);
  if (S.mComp) meta.push(S.mComp);
  if (meta.length) doc.text(meta.join(' \u00b7 '), M, 18);
  doc.text(S.a1 + '  &  ' + S.a2, W - M, 18, { align: 'right' });
  y = 32;

  /* ── Score ───────────────────────────────────────────────────────────── */
  if (selection.includes('score')) {
    checkPage(20);
    doc.setFillColor(...C.lightBg);
    doc.rect(M, y, CW, 18, 'F');
    doc.setDrawColor(...C.ruleLine);
    doc.setLineWidth(0.2);
    doc.rect(M, y, CW, 18, 'S');
    const midX = M + CW / 2;
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.navy);
    doc.text(S.tA + '  ' + S.sA + ' : ' + S.sB + '  ' + S.tB, midX, y + 10, { align: 'center' });
    if (S.htA !== null && S.htA !== undefined) {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.gray);
      doc.text('Mi-temps : ' + S.htA + ' : ' + S.htB, midX, y + 15.5, { align: 'center' });
    }
    y += 22;
  }

  /* ── Contexte ────────────────────────────────────────────────────────── */
  if (selection.includes('context')) {
    const ctxEl = document.getElementById('ECtxEdit') || document.getElementById('ctxTA');
    const ctx   = ctxEl && ctxEl.value && ctxEl.value.trim();
    if (ctx) {
      drawSectionTitle('Contexte du match');
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.darkGray);
      const lines = doc.splitTextToSize(ctx, CW - 4);
      checkPage(lines.length * 4.5 + 4);
      doc.text(lines, M + 2, y);
      y += lines.length * 4.5 + 6;
    }
  }

  /* ── Évaluation générale ─────────────────────────────────────────────── */
  if (selection.includes('eval')) {
    const yesNo = id => ans[id] === 'oui' ? 'Oui' : ans[id] === 'non' ? 'Non' : '\u2014';
    drawSectionTitle('\u00c9valuation g\u00e9n\u00e9rale');
    checkPage(QS.length * 6 + 4);
    QS.forEach(q => {
      const v = yesNo(q.id);
      checkPage(7);
      doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.darkGray);
      doc.text(q.lbl + ' :', M + 2, y);
      doc.setFont('helvetica', 'bold');
      if      (v === 'Oui') doc.setTextColor(...C.green);
      else if (v === 'Non') doc.setTextColor(...C.red);
      else                  doc.setTextColor(...C.gray);
      doc.text(v, M + CW - 2, y, { align: 'right' });
      doc.setDrawColor(...C.ruleLine);
      doc.setLineWidth(0.15);
      const lblW = doc.getTextWidth(q.lbl + ' :') + 4;
      const valW = doc.getTextWidth(v) + 4;
      doc.line(M + 2 + lblW, y - 0.5, M + CW - 2 - valW, y - 0.5);
      y += 6;
    });
    y += 2;
    drawRule();
  }

  /* ── Synthèse par catégorie ──────────────────────────────────────────── */
  if (selection.includes('synthesis')) {
    const synStats = _buildSynData();
    if (synStats.length) {
      const totalG  = S.obs.filter(o => o.col === 'green').length;
      const gPct    = S.obs.length > 0 ? Math.round(totalG / S.obs.length * 100) : null;
      const title   = 'Synth\u00e8se par cat\u00e9gorie' + (gPct !== null ? '  \u2014  Score global : ' + gPct + '%' : '');
      drawSectionTitle(title);
      checkPage(10);
      doc.autoTable({
        startY: y,
        margin: { left: M, right: M },
        headStyles: { fillColor: C.tableHd, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: C.black },
        alternateRowStyles: { fillColor: C.lightBg },
        head: [['#', 'Cat\u00e9gorie', 'Non conf.', 'Conf.', 'Conformit\u00e9']],
        body: synStats.map((s, i) => [i + 1, s.cat, s.r, s.g, s.pct !== null ? s.pct + '%' : '\u2014']),
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 24, halign: 'center' },
          3: { cellWidth: 24, halign: 'center' },
          4: { cellWidth: 28, halign: 'center' },
        },
        didParseCell: function(data) {
          if (data.section !== 'body') return;
          const s = synStats[data.row.index];
          if (!s) return;
          if (data.column.index === 2 && s.r > 0) { data.cell.styles.textColor = C.red;   data.cell.styles.fontStyle = 'bold'; }
          if (data.column.index === 3 && s.g > 0) { data.cell.styles.textColor = C.green; data.cell.styles.fontStyle = 'bold'; }
          if (data.column.index === 4 && s.pct !== null) {
            data.cell.styles.fontStyle = 'bold';
            if      (s.pct >= 70) data.cell.styles.textColor = C.green;
            else if (s.pct >= 40) data.cell.styles.textColor = C.amber;
            else                  data.cell.styles.textColor = C.red;
          }
        },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
  }

  /* ── Radar SVG ───────────────────────────────────────────────────────────
     v0.4.2 (BUG-RADAR) : await _captureRadar() — on attend que l'image
     soit prête avant de l'insérer et avant d'appeler doc.save().
  ─────────────────────────────────────────────────────────────────────── */
  if (selection.includes('radar')) {
    const radarDataUrl = await _captureRadar();
    if (radarDataUrl) {
      drawSectionTitle('Radar de synth\u00e8se');
      checkPage(RADAR_PDF_MM + 6);
      doc.addImage(radarDataUrl, 'PNG', M + (CW - RADAR_PDF_MM) / 2, y, RADAR_PDF_MM, RADAR_PDF_MM);
      y += RADAR_PDF_MM + 6;
    } else {
      log.warn('PDF', 'radar_non_inclus_echec_capture');
    }
  }

  /* ── Observations ────────────────────────────────────────────────────── */
  if (selection.includes('observations') && S.obs.length) {
    checkPage(16);
    drawSectionTitle('Observations (' + S.obs.length + ')');
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      headStyles: { fillColor: C.tableHd, textColor: C.white, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: C.black },
      head: [['Heure', 'MT', 'Arbitre', 'Cat\u00e9gorie', 'Type', 'Commentaire']],
      body: S.obs.map(function(o) {
        var parts = [];
        if (o.tags && o.tags.length) parts.push(o.tags.join(', '));
        if (o.cmt) parts.push(o.cmt);
        var arbLabel = o.an || (Array.isArray(o.arb)
          ? o.arb.map(function(a) { return a === 'A1' ? S.a1 : S.a2; }).join(' + ')
          : o.arb);
        return [o.time, o.period, arbLabel, o.cat, o.col === 'red' ? 'Non conf.' : 'Conforme', parts.join(' \u00b7 ')];
      }),
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 10 },
        2: { cellWidth: 24 },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: 'auto' },
      },
      didParseCell: function(data) {
        if (data.section !== 'body') return;
        const isRed = S.obs[data.row.index] && S.obs[data.row.index].col === 'red';
        data.cell.styles.fillColor = isRed ? C.redBg : C.greenBg;
        if (data.column.index === 4) {
          data.cell.styles.textColor = isRed ? C.red : C.green;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  /* ── Commentaire global ──────────────────────────────────────────────── */
  if (selection.includes('comment')) {
    const gcEl = document.getElementById('GC');
    const gc   = gcEl && gcEl.value && gcEl.value.trim();
    if (gc) {
      drawSectionTitle('Commentaire global');
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.darkGray);
      const lines = doc.splitTextToSize(gc, CW - 4);
      checkPage(lines.length * 4.5 + 4);
      doc.text(lines, M + 2, y);
      y += lines.length * 4.5 + 4;
    }
  }

  /* ── Pied de page ────────────────────────────────────────────────────── */
  const nbPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= nbPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.gray);
    doc.text('\u00a9 Vincent Guerlach \u2014 Tous droits r\u00e9serv\u00e9s', M, 293);
    doc.text(i + ' / ' + nbPages, W - M, 293, { align: 'right' });
  }

  /* ── Sauvegarde ──────────────────────────────────────────────────────── */
  const datePart = sanitize(S.mDate || new Date().toLocaleDateString('fr-FR'));
  const filename = 'Suivi_' + sanitize(S.a1) + '_' + sanitize(S.a2) +
                   '_' + sanitize(S.tA) + '_' + sanitize(S.tB) +
                   '_' + datePart + '.pdf';
  doc.save(filename);
  log.info('PDF', 'fichier_genere', { filename, pages: nbPages, nbObs: S.obs.length, cards: selection });
}

/* ── Calcul des statistiques par catégorie ───────────────────────────────── */
function _buildSynData() {
  const catMap = {};
  S.obs.forEach(function(o) {
    const cats = Array.isArray(o.cats) ? o.cats : [o.cat];
    cats.forEach(function(c) {
      if (!catMap[c]) catMap[c] = { r: 0, g: 0 };
      if (o.col === 'red') catMap[c].r++;
      else                 catMap[c].g++;
    });
  });
  return Object.keys(catMap).map(function(c) {
    const s     = catMap[c];
    const total = s.r + s.g;
    const pct   = total > 0 ? Math.round(s.g / total * 100) : null;
    return { cat: c, r: s.r, g: s.g, total, pct };
  }).sort(function(a, b) {
    if (a.pct === null && b.pct === null) return a.cat.localeCompare(b.cat);
    if (a.pct === null) return 1;
    if (b.pct === null) return -1;
    return a.pct - b.pct;
  });
}
