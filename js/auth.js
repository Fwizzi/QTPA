/* ═══ AUTH — Authentification Supabase v1.1.0 ═══════════════════════════
   Remplace l'ancien module auth backend (api.suiviarbitres.omnelya.fr).
   SDK Supabase chargé depuis CDN (même pattern que jsPDF).

   CONFIGURATION — remplacer les deux placeholders ci-dessous :
     SUPABASE_URL      → votre Project URL  (ex: https://xxx.supabase.co)
     SUPABASE_ANON_KEY → votre anon/public key (Project Settings → API)

   La service_role_key n'est PAS ici — elle est dans l'Edge Function.
════════════════════════════════════════════════════════════════════════════ */
import { log } from './logger.js';

const SUPABASE_URL      = 'https://izzwdgtwzmtlhiqkgewv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6endkZ3R3em10bGhpcWtnZXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTk0ODgsImV4cCI6MjA5MjE5NTQ4OH0._dPISbDb6lcPXCgUdKxToKlFpoYul4Tals1wPFUJ5as';

/* URL de l'Edge Function (déployée dans votre projet Supabase).
   Remplacer si le nom de la fonction change. */
const EDGE_ADMIN_URL = SUPABASE_URL + '/functions/v1/admin-users';

/* ── Chargement lazy du SDK Supabase ── */
let _supabase = null;

async function _getClient() {
  if (_supabase) return _supabase;
  if (!window.__supabaseLib) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload  = resolve;
      s.onerror = () => reject(new Error('Impossible de charger le SDK Supabase'));
      document.head.appendChild(s);
    });
  }
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  log.info('AUTH', 'supabase_client_initialise');
  return _supabase;
}

/* ── Cache de session en mémoire ── */
let _session  = null; // objet session Supabase
let _profile  = null; // { id, email, role }

/* ── Getters publics ── */
export function getEmail()   { return _profile?.email  || null; }
export function getUserId()  { return _session?.user?.id || null; }
export function getRole()    { return _profile?.role   || null; }
export function isLoggedIn() { return !!_session; }
export function isAdmin()    { return _profile?.role === 'admin'; }

/* ── Initialisation au démarrage — restaure la session existante ── */
export async function initAuth() {
  try {
    const client = await _getClient();
    const { data } = await client.auth.getSession();
    if (data?.session) {
      _session = data.session;
      await _loadProfile(data.session.user.id, data.session.user.email);
      log.info('AUTH', 'session_restauree', { email: _profile?.email, role: _profile?.role });
    }
    /* Écoute les changements de session (expiration token auto-refresh) */
    client.auth.onAuthStateChange((_event, session) => {
      _session = session;
      if (!session) { _profile = null; }
    });
  } catch (e) {
    log.warn('AUTH', 'init_auth_erreur', { message: e.message });
  }
}

/* ── Chargement du profil depuis la table profiles ── */
async function _loadProfile(userId, email) {
  try {
    const client = await _getClient();
    const { data, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error) throw error;
    _profile = { id: userId, email, role: data.role || 'user' };
  } catch (e) {
    /* Profil absent ou erreur — fallback rôle user */
    _profile = { id: userId, email, role: 'user' };
    log.warn('AUTH', 'profil_chargement_erreur', { message: e.message });
  }
}

/* ── Login ── */
export async function login(email, password) {
  try {
    const client = await _getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    _session = data.session;
    await _loadProfile(data.user.id, data.user.email);
    log.info('AUTH', 'connexion_ok', { email, role: _profile.role });
    return { ok: true, role: _profile.role };
  } catch (e) {
    log.error('AUTH', 'connexion_erreur', { message: e.message });
    const msg = e.message?.includes('Invalid login') ? 'Identifiants incorrects.' : e.message;
    return { ok: false, error: msg };
  }
}

/* ── Logout ── */
export async function logout() {
  try {
    const client = await _getClient();
    await client.auth.signOut();
  } catch (e) { /* silencieux */ }
  _session = null;
  _profile = null;
  log.info('AUTH', 'deconnexion');
}

/* ── Sauvegarde d'un match (table matches) ── */
export async function saveMatchRemote(matchData) {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    const client = await _getClient();
    const { data, error } = await client
      .from('matches')
      .insert({
        user_id:        _session.user.id,
        arbitre1:       matchData.arbitre1,
        arbitre2:       matchData.arbitre2,
        equipe_a:       matchData.equipe_a,
        equipe_b:       matchData.equipe_b,
        date_match:     matchData.date_match,
        heure_match:    matchData.heure_match,
        competition:    matchData.competition,
        score_a:        matchData.score_a,
        score_b:        matchData.score_b,
        observations:   matchData.observations,
        evaluation:     matchData.evaluation,
        contexte:       matchData.contexte,
        commentaire_global: matchData.commentaire_global
      })
      .select('id')
      .single();
    if (error) throw error;
    log.info('AUTH', 'match_sauvegarde_remote', { id: data.id });
    return { ok: true, id: data.id };
  } catch (e) {
    log.error('AUTH', 'match_sauvegarde_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ── Récupération de l'historique distant (admin uniquement) ── */
export async function fetchMatches() {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    const client = await _getClient();
    /* v1.2.0 : sélection de toutes les colonnes pour permettre le réexport PDF.
       Admin → tous les matchs. Utilisateur → uniquement ses propres matchs (RLS). */
    const query = client
      .from('matches')
      .select('id, user_id, arbitre1, arbitre2, equipe_a, equipe_b, date_match, heure_match, competition, score_a, score_b, observations, evaluation, contexte, commentaire_global, created_at')
      .order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    log.info('AUTH', 'fetch_matches_ok', { count: data.length });
    return { ok: true, matches: data };
  } catch (e) {
    log.error('AUTH', 'fetch_matches_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ── Récupération d'un match par id via Edge Function (admin — bypass RLS) ── */
export async function fetchMatchById(id) {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    const res = await fetch(EDGE_ADMIN_URL + '?matchId=' + encodeURIComponent(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + _session.access_token
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur Edge Function');
    log.info('AUTH', 'fetch_match_by_id_ok', { id });
    return { ok: true, match: data.match };
  } catch (e) {
    log.error('AUTH', 'fetch_match_by_id_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ── Récupération de tous les matchs avec email utilisateur (admin) ── */
export async function fetchMatchesAdmin() {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    const data = await _edgeCall('POST', '', { action: 'listMatches' });
    log.info('AUTH', 'fetch_matches_admin_ok', { count: data.matches?.length });
    return { ok: true, matches: data.matches };
  } catch (e) {
    log.error('AUTH', 'fetch_matches_admin_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ── Suppression d'un match distant ── */
export async function deleteMatchRemote(id) {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    const client = await _getClient();
    const { error } = await client
      .from('matches')
      .delete()
      .eq('id', id);
    if (error) throw error;
    log.info('AUTH', 'match_supprime_remote', { id });
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'match_supprime_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ── Changement de mot de passe (utilisateur connecté) ── */
export async function changePassword(currentPassword, newPassword) {
  /* Supabase updateUser ne vérifie pas l'ancien mot de passe.
     On re-authentifie d'abord pour vérifier currentPassword. */
  try {
    const client = await _getClient();
    const { error: reAuthErr } = await client.auth.signInWithPassword({
      email: _profile.email,
      password: currentPassword
    });
    if (reAuthErr) return { ok: false, error: 'Mot de passe actuel incorrect.' };

    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    log.info('AUTH', 'password_change_ok');
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'password_change_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

/* ════════════════════════════════════════════════════════════════════════
   FONCTIONS ADMIN — passent par l'Edge Function (service_role_key protégée)
   L'Edge Function `admin-users` est déployée dans le projet Supabase.
════════════════════════════════════════════════════════════════════════════ */

async function _edgeCall(method, path, body) {
  const res = await fetch(EDGE_ADMIN_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + _session.access_token
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur Edge Function');
  return data;
}

export async function adminGetUsers() {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    const data = await _edgeCall('GET', '', null);
    return { ok: true, users: data.users };
  } catch (e) {
    log.error('AUTH', 'admin_get_users_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

export async function adminCreateUser(email, password, role) {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    await _edgeCall('POST', '', { action: 'create', email, password, role });
    log.info('AUTH', 'admin_user_cree', { email, role });
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'admin_user_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

export async function adminDeleteUser(id) {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    await _edgeCall('POST', '', { action: 'delete', userId: id });
    log.info('AUTH', 'admin_user_supprime', { id });
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'admin_delete_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}

export async function adminResetPassword(id, password) {
  if (!_session) return { ok: false, error: 'Non connecté' };
  try {
    await _edgeCall('POST', '', { action: 'resetPassword', userId: id, password });
    log.info('AUTH', 'admin_password_reset', { id });
    return { ok: true };
  } catch (e) {
    log.error('AUTH', 'admin_password_erreur', { message: e.message });
    return { ok: false, error: e.message };
  }
}
