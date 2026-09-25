/* ═══ Edge Function : admin-users v1.4.11 ═══════════════════════════════════
   Actions : getUsers | createUser | inviteUser | updateUser |
             updateRole | deleteUser | resetPassword | listMatches
   Le service_role_key n'est JAMAIS exposé côté client.
═══════════════════════════════════════════════════════════════════════════ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin       = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  /* Vérification JWT de l'appelant */
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers: corsHeaders });

  const { data: { user }, error: jwtErr } = await admin.auth.getUser(jwt);
  if (jwtErr || !user) return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401, headers: corsHeaders });

  /* Vérification rôle admin */
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 403, headers: corsHeaders });

  /* ── GET : liste des utilisateurs OU fetchMatchById ── */
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const matchId = url.searchParams.get('matchId');

    /* fetchMatchById : GET ?matchId=xxx */
    if (matchId) {
      const { data, error } = await admin.from('matches').select('*').eq('id', matchId).single();
      if (error || !data) return new Response(JSON.stringify({ error: 'Match introuvable' }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify({ match: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    /* listUsers */
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    const profileIds = data.users.map(u => u.id);
    const { data: profiles } = await admin.from('profiles').select('id, role').in('id', profileIds);
    const roleMap = Object.fromEntries((profiles || []).map(p => [p.id, p.role]));

    const users = data.users.map(u => ({
      id        : u.id,
      email     : u.email,
      role      : roleMap[u.id] || 'user',
      first_name: u.user_metadata?.first_name || '',
      last_name : u.user_metadata?.last_name  || '',
      created_at: u.created_at,
    }));

    return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  /* ── POST : actions ── */
  if (req.method === 'POST') {
    const body = await req.json();
    const { action } = body;

    /* createUser */
    if (action === 'createUser') {
      const { email, password, role, firstName = '', lastName = '' } = body;
      const { data, error } = await admin.auth.admin.createUser({
        email, password,
        email_confirm : true,
        user_metadata : { first_name: firstName, last_name: lastName },
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      await admin.from('profiles').upsert({ id: data.user.id, role: role || 'user' });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    /* inviteUser */
    if (action === 'inviteUser') {
      const { email, role, firstName = '', lastName = '' } = body;
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { first_name: firstName, last_name: lastName },
      });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      await admin.from('profiles').upsert({ id: data.user.id, role: role || 'user' });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    /* updateUser — prénom, nom, email */
    if (action === 'updateUser') {
      const { userId, firstName, lastName, email } = body;
      const updatePayload: Record<string, unknown> = {
        user_metadata: { first_name: firstName ?? undefined, last_name: lastName ?? undefined },
      };
      if (email) updatePayload.email = email;
      const { error } = await admin.auth.admin.updateUserById(userId, updatePayload);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    /* updateRole */
    if (action === 'updateRole') {
      const { userId, role } = body;
      const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    /* deleteUser */
    if (action === 'deleteUser') {
      const { userId } = body;
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      await admin.from('profiles').delete().eq('id', userId);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    /* resetPassword */
    if (action === 'resetPassword') {
      const { userId, password } = body;
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    /* listMatches */
    if (action === 'listMatches') {
      const { userId } = body;
      const query = userId
        ? admin.from('matches').select('*').eq('user_id', userId)
        : admin.from('matches').select('*');
      const { data, error } = await query.order('created_at', { ascending: false }).limit(200);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

      /* Enrichir avec user_email depuis auth.users */
      const userIds = [...new Set((data || []).map((m: Record<string,unknown>) => m.user_id).filter(Boolean))] as string[];
      const emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: authUsers } = await admin.auth.admin.listUsers();
        (authUsers?.users || []).forEach((u: { id: string; email?: string }) => {
          if (userIds.includes(u.id)) emailMap[u.id] = u.email || '';
        });
      }
      const matches = (data || []).map((m: Record<string,unknown>) => ({
        ...m,
        user_email: emailMap[m.user_id as string] || '',
      }));

      return new Response(JSON.stringify({ matches }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    /* deleteMatch */
    if (action === 'deleteMatch') {
      const { matchId } = body;
      const { error } = await admin.from('matches').delete().eq('id', matchId);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), { status: 400, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: 'Méthode non supportée' }), { status: 405, headers: corsHeaders });
});
