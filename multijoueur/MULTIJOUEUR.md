# Wood Bowl en ligue entre amis : plan technique

## Principe
- L'appli (GitHub Pages) reste la même pour tout le monde. En mode multijoueur, elle lit et écrit dans un serveur **Supabase** (gratuit).
- Le serveur est la seule autorité : c'est lui qui dépouille les enchères et joue les journées. Les joueurs n'envoient que des **ordres**.
- Le moteur de jeu est le même qu'en solo (`moteur.js`, `legendes.js`, `carriere.js`, `gazette*.js`). Le serveur le télécharge depuis le site et l'exécute avec un tirage au sort **à graine** (`graine(seed)`) : une journée rejouée avec la même graine donne exactement le même résultat. On peut donc la vérifier.

## Comptes (aucun compte Claude, aucun e-mail)
- À l'arrivée, on choisit un **pseudo**. L'appli crée un compte Supabase « pseudo + code secret » (adresse fictive `pseudo-xxxx@woodbowl.invalid`, confirmation d'e-mail désactivée).
- Le **code secret** (4 mots, par ex. `gourdin-orque-bière-lune`) est affiché une fois et gardé sur l'appareil. Il permet de se reconnecter sur un autre téléphone ou ordinateur.

## Déroulé d'une ligue
1. **Création** par le commissaire (Juju) : nom, nombre de clubs humains (les places vides sont prises par l'ordinateur), réglages du rythme. Un **code d'invitation** de 6 lettres est généré.
2. **Inscriptions** : chaque ami entre le code, crée son club (nom, couleur, peuple de départ).
3. **Draft** (durée réglable, par ex. 24 h) : vivier commun d'environ 12 joueurs par club. Enchères secrètes. À l'échéance : chaque joueur va au plus offrant, qui paie la **2e offre + 1 po**. Égalité : le club qui a le moins dépensé, puis tirage. Pas de mise au-delà de sa caisse. Deuxième tour court pour les invendus et les clubs à moins de 5 joueurs (sinon jeunes du pays gratuits).
4. **Saison**, pour chaque journée :
   - **Mercato** : marché commun, enchères secrètes jusqu'à la clôture (par ex. la veille à 21 h). Dépouillement, notification.
   - **Préparation** : composition, entraînement, consignes, ordres aux joueurs, propositions d'échange entre amis.
   - **Match** à heure fixe (par ex. 21 h) : le serveur joue la journée pour tous. Absents : pilote automatique (composition auto, entraînement conseillé, consigne normale).
   - **Gazette** : un numéro par club (sa propre une), plus les articles de tous les matchs, avec les portraits des hommes et femmes du match.
5. **Commissaire** : boutons « Lancer la journée maintenant », « Pause », « Reprendre », et réglage du rythme.

## Décisions de jeu (validées par Juju)
- **Pas de légendes au départ** : aucune dans la draft. Elles apparaissent plus tard, rarement, au mercato, pour créer la surprise.
- **Stats cachées** (mental, régularité, robustesse) : toujours cachées en multijoueur (le cadre « brume » reste visible). On pourra un jour prévoir une façon rare de les dévoiler.
- **Une seule division** en multijoueur pour commencer. Poules ou divisions plus tard, si on est plus nombreux.
- **Ordres aux joueurs** (cogneurs : cibler ou protéger ; elfes noirs assassins : choisir leur victime) : font partie des ordres envoyés avant chaque match.

## Formats de partie (même moteur, minuteries différentes)
| Format | Durée | Rythme |
|---|---|---|
| Ligue | 3 à 5 semaines | 3 matchs par semaine à 21 h, mercato la veille |
| Tournoi éclair | une soirée (2 à 3 h) | un match toutes les 10 à 15 min, poules puis élimination directe |
| Grand événement (Coupe du Monde, Jeux du Bol…) | un week-end ou une soirée | voir ci-dessous |

**Grands événements** : chacun joue avec **son propre club**, celui de la ligue. Au début de l'événement, des joueurs « de passage » se présentent (renforts proposés à tous, par exemple aux enchères rapides). Ils jouent l'événement puis **repartent à la fin** : ils ne restent jamais dans l'équipe multijoueur.
Pas d'import de joueurs depuis les parties solo.
En soirée, tout le monde est présent : pas de pilote automatique ni de notifications nécessaires. Le serveur vérifie les échéances chaque minute, et le commissaire peut lancer chaque tour à la main.

## Taille de la ligue
- 6 à 8 amis pour commencer, 10 au maximum. Chaque ami a son club ; si le nombre est impair, l'ordinateur prend une place pour que chacun joue à chaque journée.
- Le moteur doit donc gérer une ligue de 6 à 10 clubs (aujourd'hui : 6 en solo) : calendrier, classement, coupe (tableau à 8 ou 16 avec invités), primes.
- Saison en matchs aller simple (7 à 9 journées) ou aller-retour (14 à 18 journées), au choix du commissaire.

## Rythme (réglable par ligue)
| Réglage | Valeur de départ proposée |
|---|---|
| Durée de la draft | 48 h (le temps que tout le monde passe) |
| Matchs | 3 par semaine : lundi, mercredi et vendredi à 21 h (heure de Paris) |
| Clôture du mercato | la veille du match à 21 h |
| Saison | aller-retour : 14 journées à 8 clubs, soit environ 5 semaines |
| Intersaison | 3 jours |

## Données (Supabase, voir `supabase.sql`)
- `ligues` : réglages, phase, **état public** du jeu (classement, effectifs, calendrier…), prochaine échéance.
- `clubs_ligue` : qui possède quel club (index de club dans l'état du jeu).
- `ordres` : ordres d'un club pour une journée. **Privés** : seul le club et le serveur les lisent.
- `encheres` : mises secrètes (draft et mercato). **Privées**.
- `gazettes` : numéros publiés, lisibles par tous les membres de la ligue.
- `echanges` : propositions entre clubs humains, lisibles par les deux clubs concernés.
- `courrier` : courrier des lecteurs (petits messages publiés dans la gazette).
- `abonnements_push` : pour les notifications.

## Serveur
- Fonction **`tick`** (Edge Function), appelée toutes les 10 minutes par `pg_cron` : pour chaque ligue dont l'échéance est passée, elle fait avancer la phase (dépouillement de la draft ou du mercato, journée, intersaison), écrit le nouvel état et les gazettes, puis envoie les notifications.
- Fonction **`commissaire`** : actions réservées au commissaire (lancer, pause, reprise, réglages).
- La clé « service_role » ne sert qu'au serveur. Elle n'apparaît **jamais** dans l'appli ni dans le dépôt.

## Moteur de ligue : fait (27 nov. 2026)
Le moteur sait jouer une ligue de 6, 8 ou 10 clubs avec plusieurs clubs humains. En solo, rien ne change : à graine égale, les parties sont identiques à l'ancien moteur.

Comment c'est rangé :
- `S.multi = true` en ligue. Chaque club humain a `T.humain = true` et un tiroir de gestion `T.gest` (choix de match, sponsor, candidats au staff, rapport du stratège, rebondissement, intersaison, historique de caisse, deuils). En solo, ces mêmes données restent dans `S`. `G(S,T)` renvoie le bon tiroir dans les deux cas ; `humains(S)` et `clubsIA(S)` donnent les listes de clubs.
- Presque toutes les fonctions du moteur acceptent le club concerné en dernier paramètre (par défaut : le club 0 du solo).
- `ligue.js` (nouveau fichier, utilisé seulement en ligue) :
  - `nouvelleLigue({nom, taille, reglages, clubs:[{nom, couleur, peuple, pseudo}]})` : phase « draft » ;
  - `depouillerDraft(S, mises)` : 1er tour, puis 2e tour, puis la saison démarre ;
  - `depouillerMercato(S, mises)` : clôture du marché commun ;
  - `miseValide(S, T, joueurId, montant)` : pour prévenir le joueur avant l'envoi ;
  - `appliquerOrdres(S, T, ordres)` et `piloteAuto(S, T)` : appelés par `jouerJournee(S, ordres)` ;
  - `appliquerAction(S, T, action)` : stade, staff, sponsor, rebondissement, soins, renvoi, prêt d'urgence, intersaison ;
  - `appliquerEchange(S, e)` : échange entre deux amis, une fois accepté ;
  - `vuePour(S, id)` : la copie de l'état qu'un joueur a le droit de voir.
- `jouerJournee(S, ordres)` renvoie en ligue `{par: {id du club: sa gazette}, commune: l'édition commune}`. Deux amis qui s'affrontent lisent le même récit.
- Une mise : `{club, joueur, montant}`. Les ordres d'un club : `{titulaires, banc, entr, consigne, tactique, pot, marque, ordres, coupeRot}` (détail en tête de `appliquerOrdres`).

Tests : `node multijoueur/test_ligue.js` (ligues de 1 à 10 amis, 2 saisons, enchères, ordres farfelus, absents, déterminisme, secrets) et `node multijoueur/test_non_regression.js . <ancien moteur>`.

### Choix faits dans le moteur, à confirmer par Juju
- **Enchères** : on attribue d'abord le joueur le plus disputé. Une mise ne compte que si le club a encore la somme en caisse à ce moment-là : on peut donc miser sur beaucoup de joueurs, chaque mise étant limitée par sa caisse. Prix plancher = la moitié de la valeur du joueur (c'est le prix payé quand on est seul à miser).
- **Draft** : budget de 260 po, vivier de 12 joueurs par club humain, notes visibles sans erreur, ce qui reste du budget devient la caisse de départ. Après le 2e tour, un club à moins de 5 joueurs (ou sans passeur, etc.) reçoit des jeunes du pays de son peuple.
- **Mercato** : 6 à 12 joueurs par journée selon le nombre d'amis ; chacun voit les notes à travers son propre chineur ; la remise du chineur s'applique au prix payé. Un club à moins de 6 joueurs reçoit automatiquement un jeune de son centre de formation. Les clubs de l'ordinateur ne misent pas.
- **Légendes** : jamais à la draft ; au mercato, 5 % de chances par journée à partir de la mi-saison de la première année ; possibles aussi parmi les arrivées d'intersaison.
- **Stratège face à un ami** : il juge le rapport de forces et désigne la menace, mais ne prédit ni consigne ni plan (les ordres de l'ami ne sont pas encore donnés).
- **Coupe** : tableau à 8 (6 ou 8 clubs) ou à 16 (10 clubs), complété par des invités ; tours répartis sur la saison.
- **Primes** : barème de fin de saison étiré à 8 ou 10 clubs ; sponsors « première moitié » et « deux derniers » adaptés.
- **Secrets** : la vue d'un joueur ne contient ni profil caché (seule la pierre de brume), ni la caisse, la composition, l'entraînement et la gestion des autres amis. Réglage `caissesVisibles` pour montrer les caisses.

## Serveur de ligue : écrit (27 nov. 2026), à mettre en service
- `multijoueur/serveur.js` : toute la logique (calendrier réel à l'heure de Paris, `avancer`, `tick`, `demande`). Elle ne touche la base qu'à travers un objet `db`, ce qui permet de la tester sans Supabase : `node multijoueur/test_serveur.js` (fausse base en mémoire, une ligue complète heure par heure).
- `multijoueur/construire.js` assemble moteur + ligue + serveur dans `supabase/functions/_shared/jeu.js` (fichier fabriqué, non enregistré dans le dépôt).
- `supabase/functions/tick` (horloge) et `supabase/functions/ligue` (demandes des joueurs et du commissaire) ; `_shared/base.ts` traduit `db` en requêtes Supabase. Ces trois fichiers n'ont pas pu être exécutés ici (pas d'accès à Supabase) : première vérification réelle à la mise en service.
- `.github/workflows/serveur.yml` : à chaque publication sur `main`, tests puis déploiement des fonctions. Secret nécessaire dans le dépôt : `SUPABASE_ACCESS_TOKEN`.
- `multijoueur/supabase2.sql` : tables privées `etats_prives` et `reprises`, table `vues_club`, adjoints, enchères verrouillées sur le tour en cours, horloge `pg_cron`. Toujours le recoller après `supabase.sql`.

Où sont les données : `etats_prives.etat` = état complet (serveur seul) ; `ligues.etat` = `vuePour(S,-1)` (tous les membres) ; `vues_club.vue` = `{club, marche}` du propriétaire. `ligues.etat.encheres.tour` donne le nom du tour d'enchères ouvert (`draft-1`, `draft-2`, `mercato-N`, `inter-S`) ; les ordres d'une journée s'écrivent avec `journee = ligues.version + 1`.

Demandes à la fonction `ligue` (`{action, ligue, …}`) : `creer`, `rejoindre` (code d'invitation ou code de reprise), `gestion` (`geste` = action de `appliquerAction`), `echange` (`id`, `oui`), `quitter` ; commissaire et adjoints : `demarrer`, `lancer`, `pause`, `reprendre`, `reglages` (+ `echeance` pour repousser) ; commissaire seul : `adjoint`, `exclure`, `confier` (donne un code de reprise), `happening` (`don`, `joueur` sur mesure, ou un rebondissement du jeu).

Reste à faire côté serveur : notifications push ; légendes sur mesure des premiers testeurs (le happening `joueur` existe, il manque leurs fiches et leurs portraits).

## Ordre de travail
1. Supabase : création du projet par Juju (pas à pas), collage de `supabase.sql`, réglages Auth (« Confirm email » désactivé dans Authentication › Sign In / Providers › bloc User Signups).
2. Moteur multi : **fait** (voir plus haut).
   Supabase : projet créé par Juju le 27 nov. 2026, base collée, « Confirm email » désactivé ; adresse et clé publique dans `multijoueur/config.js`.
3. Fonctions serveur `tick` et `ligue` : **écrites**, mise en service en cours (jeton Supabase dans GitHub, collage de `supabase2.sql`).
4. Écrans de l'appli : créer ou rejoindre une ligue, draft, mercato, gazette de ligue, échanges, réglages du commissaire.
5. Notifications.
6. Ligue d'essai Juju + un compte de test, puis invitation des amis.
