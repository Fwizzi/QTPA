/* ═══ UTILS — Fonctions utilitaires pures ════════════════════════════════ */

export function pad(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

export function fmt(s) {
  return pad(s / 60) + ':' + pad(s % 60);
}

export function fmtDate(d) {
  if (!d) return '';
  // Format déjà lisible jj/mm/aaaa — retourner tel quel
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
  // Format ISO aaaa-mm-jj → jj/mm/aaaa
  const p = d.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d;
}

/* ─────────────────────────────────────────────────────────────────────────
   v0.3.24 (FRAG-3) — Échappement HTML
   ─────────────────────────────────────────────────────────────────────────
   À utiliser obligatoirement quand on injecte une donnée utilisateur (nom
   d'équipe, nom d'arbitre, contexte, commentaire d'observation, tag, email)
   dans un innerHTML ou une chaîne HTML construite par concaténation.
   Risque XSS : un nom d'équipe contenant <img src=x onerror=alert(1)>
   exécuterait du code arbitraire si injecté brut. Cette fonction échappe
   les 5 caractères dangereux du HTML.
   ⚠️ NE PAS utiliser pour échapper du HTML qu'on souhaite réellement
   rendre (mais on n'en a pas dans ce projet, donc tout passe par
   escapeHtml).
═════════════════════════════════════════════════════════════════════════ */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
