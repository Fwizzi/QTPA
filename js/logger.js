/* ═══ LOGGER — Journal structuré JSON, exportable en fichier ══════════════
   Niveaux : INFO | WARN | ERROR | PERF
   Catégories : LIFECYCLE | CHRONO | SCORE | TME | OBS | STORAGE | PDF | SW | UI
   Chaque entrée : { ts, level, cat, event, data? }
   Export : fichier .json téléchargeable via exportLogs()
════════════════════════════════════════════════════════════════════════════ */

const MAX_ENTRIES = 2000; // sécurité mémoire

const _logs = [];

/* ── Entrée de base ── */
function _write(level, cat, event, data) {
  const entry = {
    ts:    new Date().toISOString(),
    level,
    cat,
    event,
    ...(data !== undefined && { data })
  };
  _logs.push(entry);
  if (_logs.length > MAX_ENTRIES) _logs.shift();

  // Miroir console avec couleur par niveau
  const style = {
    INFO:  'color:#4A90D9',
    WARN:  'color:#E6A817',
    ERROR: 'color:#E05252;font-weight:bold',
    PERF:  'color:#7CB87C'
  }[level] || '';
  console.log('%c[%s][%s] %s', style, level, cat, event, data !== undefined ? data : '');
}

/* ── API publique ── */
export const log = {
  info:  (cat, event, data) => _write('INFO',  cat, event, data),
  warn:  (cat, event, data) => _write('WARN',  cat, event, data),
  error: (cat, event, data) => _write('ERROR', cat, event, data),
  perf:  (cat, event, data) => _write('PERF',  cat, event, data),
};

/* ── Minuterie de performance ── */
export function startTimer(label) {
  return { label, t0: performance.now() };
}
export function endTimer(cat, event, handle, extraData) {
  const ms = +(performance.now() - handle.t0).toFixed(1);
  log.perf(cat, event, { ms, ...extraData });
  return ms;
}

/* ── Export JSON téléchargeable ── */
export function exportLogs() {
  try {
    const blob = new Blob([JSON.stringify(_logs, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'arbitres_hb_logs_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    log.info('STORAGE', 'logs_exported', { entries: _logs.length });
  } catch (e) {
    console.error('[LOGGER] Erreur export :', e);
  }
}

/* ── Accès lecture (pour debug in-app si besoin) ── */
export function getLogs() { return [..._logs]; }
