// « ligue » : toutes les demandes des joueurs et du commissaire (créer, rejoindre, gérer son club, répondre à un échange,
// démarrer, lancer la journée, pause, réglages, adjoints, exclusion, happenings). Voir demande() dans multijoueur/serveur.js.
// Les mises et les ordres de match, eux, s'écrivent directement dans les tables (protégées par les règles de la base).
import { admin, base, cors, json } from '../_shared/base.ts';
import { Jeu } from '../_shared/jeu.js';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erreur: 'Méthode non prise en charge.' }, 405);
  try {
    const sb = admin();
    const jeton = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    let uid: string | null = null;
    if (jeton) { const { data, error } = await sb.auth.getUser(jeton); if (!error && data && data.user) uid = data.user.id; }
    const q = await req.json().catch(() => ({}));
    const r = await Jeu.demande(base(sb), uid, q, Date.now());
    if (uid && q && q.ligue && !r.erreur) {
      await sb.from('clubs_ligue').update({ dernier_passage: new Date().toISOString() }).eq('ligue_id', q.ligue).eq('user_id', uid);
    }
    return json(r); // toujours 200 : une demande refusée renvoie { erreur: "…" }, à afficher telle quelle au joueur
  } catch (e) {
    console.error('ligue', e);
    return json({ erreur: 'Erreur du serveur. Réessayez dans un instant.' });
  }
});
