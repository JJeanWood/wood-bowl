// deno-lint-ignore-file no-explicit-any
// Accès à la base pour le serveur de ligue. Toute la logique est dans multijoueur/serveur.js ;
// ici, seulement la traduction « demande du serveur » -> « requête Supabase ».
import { createClient } from 'npm:@supabase/supabase-js@2';

export const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...cors, 'Content-Type': 'application/json' } });

// Client « serveur » : il passe outre les règles de lecture, donc il ne sort jamais d'ici.
export function admin(): any {
  const url = Deno.env.get('SUPABASE_URL')!;
  let cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); if (k && k.default) cle = k.default; } catch (_) { /* anciennes clés */ }
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
}

const ok = (r: any) => { if (r.error) throw new Error(r.error.message || String(r.error)); return r.data; };
const doublon = (r: any) => r.error && r.error.code === '23505';
const LIGUE = 'id,code,nom,commissaire,reglages,phase,etape,version,echeance';
const CLUB = 'ligue_id,club_index,user_id,pseudo,nom_club,couleur,peuple,adjoint';

export function base(sb: any) {
  return {
    async ligue(id: string) { return ok(await sb.from('ligues').select(LIGUE).eq('id', id).maybeSingle()); },
    async ligueParCode(code: string) { return ok(await sb.from('ligues').select(LIGUE).eq('code', code).maybeSingle()); },
    async liguesDues(iso: string) { return ok(await sb.from('ligues').select('id').lte('echeance', iso).in('phase', ['draft', 'saison', 'inter'])) || []; },
    async creerLigue(row: any) { const r = await sb.from('ligues').insert(row).select(LIGUE).maybeSingle(); if (doublon(r)) return null; return ok(r); },
    async majLigue(id: string, ch: any) { ok(await sb.from('ligues').update(ch).eq('id', id)); },

    async clubs(id: string) { return ok(await sb.from('clubs_ligue').select(CLUB).eq('ligue_id', id).order('club_index')) || []; },
    async ajouterClub(row: any) { ok(await sb.from('clubs_ligue').insert(row)); },
    async majClub(l: string, idx: number, ch: any) { ok(await sb.from('clubs_ligue').update(ch).eq('ligue_id', l).eq('club_index', idx)); },
    async supprimerClub(l: string, idx: number) { ok(await sb.from('clubs_ligue').delete().eq('ligue_id', l).eq('club_index', idx)); },
    async reprise(code: string) { return ok(await sb.from('reprises').select('code,ligue_id,club_index').eq('code', code).maybeSingle()); },
    async poserReprise(l: string, idx: number, code: string) { ok(await sb.from('reprises').upsert({ ligue_id: l, club_index: idx, code })); },
    async oterReprise(l: string, idx: number) { ok(await sb.from('reprises').delete().eq('ligue_id', l).eq('club_index', idx)); },

    async etat(id: string) { const r = ok(await sb.from('etats_prives').select('etat,rev').eq('ligue_id', id).maybeSingle()); return r ? { etat: r.etat, rev: r.rev } : { etat: null, rev: 0 }; },
    async creerEtat(id: string, etat: any) { const r = await sb.from('etats_prives').insert({ ligue_id: id, etat, rev: 1 }); if (doublon(r)) return false; ok(r); return true; },
    async sauverEtat(id: string, etat: any, rev: number) {
      const r = ok(await sb.from('etats_prives').update({ etat, rev: rev + 1, maj: new Date().toISOString() }).eq('ligue_id', id).eq('rev', rev).select('ligue_id'));
      return !!(r && r.length === 1);
    },

    async ordres(l: string, journee: number) {
      const o: Record<number, any> = {};
      (ok(await sb.from('ordres').select('club_index,contenu').eq('ligue_id', l).eq('journee', journee)) || []).forEach((x: any) => { o[x.club_index] = x.contenu; });
      return o;
    },
    async encheres(l: string, tour: string) {
      return (ok(await sb.from('encheres').select('club_index,joueur_id,montant,maj').eq('ligue_id', l).eq('tour', tour).order('maj')) || [])
        .map((x: any) => ({ club: x.club_index, joueur: x.joueur_id, montant: x.montant }));
    },
    async viderEncheres(l: string, tour: string) { ok(await sb.from('encheres').delete().eq('ligue_id', l).eq('tour', tour)); },

    async publierGazettes(l: string, rows: any[]) { ok(await sb.from('gazettes').upsert(rows.map((r) => ({ ligue_id: l, ...r })))); },
    async majVues(l: string, rows: any[]) { if (rows.length) ok(await sb.from('vues_club').upsert(rows.map((r) => ({ ligue_id: l, club_index: r.club_index, vue: r.vue, maj: new Date().toISOString() })))); },

    async echange(id: string) { return ok(await sb.from('echanges').select('id,ligue_id,de_club,vers_club,donne,recoit,statut').eq('id', id).maybeSingle()); },
    async majEchange(id: string, ch: any) { ok(await sb.from('echanges').update(ch).eq('id', id)); },
    async courrier(l: string) {
      return (ok(await sb.from('courrier').select('club_index,texte,cree_le').eq('ligue_id', l).order('cree_le')) || []).map((x: any) => ({ club: x.club_index, texte: x.texte }));
    },
    async viderCourrier(l: string) { ok(await sb.from('courrier').delete().eq('ligue_id', l)); },

    async compteParHash(h: string) { const r = ok(await sb.from('comptes').select('user_id').eq('code_hash', h).maybeSingle()); return r ? r.user_id : null; },
    async poserCompte(uid: string, h: string) { ok(await sb.from('comptes').upsert({ user_id: uid, code_hash: h })); },
    async transfererCompte(ancien: string, nouveau: string) { return !!ok(await sb.rpc('transferer_compte', { ancien, nouveau })); },
  };
}
