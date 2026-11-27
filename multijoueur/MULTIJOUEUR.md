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

## Rythme (réglable par ligue)
| Réglage | Valeur de départ proposée |
|---|---|
| Durée de la draft | 24 h |
| Jours entre deux matchs | 2 |
| Heure des matchs | 21 h (heure de Paris) |
| Clôture du mercato | 24 h avant le match |
| Durée de l'intersaison | 48 h |

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

## Ce que le moteur doit encore savoir faire (chantier « moteur multi »)
Aujourd'hui, le moteur suppose un seul humain : le club n° 0 (`S.teams[0]`). À faire :
1. `S.humains` : liste des index de clubs humains. `estHumain(S,T)` remplace les tests `T.id===0` qui distinguent humain et ordinateur.
2. `jouerJournee(S, ordres)` : options de match, composition et entraînement de **chaque** club humain à partir de ses ordres (ou du pilote automatique).
3. Finances, événements, stade, staff et sponsor **par club** humain (aujourd'hui rangés dans `S` pour le seul club 0).
4. Gazette générée **pour chaque club humain** (sa une, son récit, ses comptes).
5. Marché commun et enchères : `ouvrirMercato`, `deposerMise`, `depouiller`.
6. En solo, rien ne change (`S.humains = [0]`). Test de non-régression : à graine égale, une saison solo doit donner exactement le même résultat avant et après.

## Ordre de travail
1. Supabase : création du projet par Juju (pas à pas), collage de `supabase.sql`, réglages Auth.
2. Moteur multi (points 1 à 6 ci-dessus), testé en simulation avec 3 ou 4 « faux amis ».
3. Fonctions serveur `tick` et `commissaire`.
4. Écrans de l'appli : créer ou rejoindre une ligue, draft, mercato, gazette de ligue, échanges, réglages du commissaire.
5. Notifications.
6. Ligue d'essai Juju + un compte de test, puis invitation des amis.
