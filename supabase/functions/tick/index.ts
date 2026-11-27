// « tick » : appelée chaque minute par la base (pg_cron). Fait avancer les ligues dont l'échéance est passée :
// dépouillement de la draft ou du mercato, journée de match, reprise après l'intersaison.
// Elle ne prend aucun paramètre et ne fait rien si aucune ligue n'est à l'heure : l'appeler « pour rien » est sans effet.
import { admin, base, cors, json } from '../_shared/base.ts';
import { Jeu } from '../_shared/jeu.js';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const bilan = await Jeu.tick(base(admin()), Date.now());
    if (bilan.length) console.log('tick', JSON.stringify(bilan));
    return json({ ok: true, ligues: bilan.length });
  } catch (e) {
    console.error('tick', e);
    return json({ erreur: 'Erreur du serveur.' }, 500);
  }
});
