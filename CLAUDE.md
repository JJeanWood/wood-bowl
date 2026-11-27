# Wood Bowl : consignes pour Claude

Jeu privé et non commercial de Juju (JJeanWood) : team manager médiéval-fantastique humoristique façon « Bol de Bois », entre amis.
Matchs simulés, gazette « L'Écho du Gourdin », portraits façon cartes de baseball des années 80, équipement de football américain. Joueurs et joueuses.

## Communication
- Juju écrit en français : répondre en français, accents écrits directement (jamais de codes d'échappement).
- Il n'est pas développeur : guider pas à pas, tout expliciter (où cliquer, quoi coller), donner les textes complets à copier.

## Mise en ligne
- Appli installable (PWA) servie par GitHub Pages : https://jjeanwood.github.io/wood-bowl/ (branche `main`, racine).
- Chaque push sur `main` met l'appli à jour en une à deux minutes.
- Le service worker (`sw.js`) charge le code réseau d'abord et les médias cache d'abord. Changer `VERSION` dans `sw.js` pour forcer le renouvellement du cache des images/musiques.
- Une copie de test existe aussi comme artefact Claude (slug c334b891-b0fb-4f92-ae2b-a14971b98965, public : republier avec `shared_live:"public"` et `artifact_title:"Wood Bowl"`).

## Architecture
- `moteur.js` : règles, création des joueurs, simulation (`simMatch`), journée (`jouerJournee`), intersaison, marché, prêt d'urgence, ordres (cibler / garde du corps).
- `legendes.js` : 36 joueurs légendaires et leurs pouvoirs.
- `carriere.js` : divisions (4 → 1), âge, déclin, retraite, parrainage, profil caché (mental, régularité, robustesse), cadres de portrait, Coupe du Gourdin.
- `gazette.js`, `gazette2.js` : textes de la gazette.
- `son.js` : musiques (mus/*.mp3 avec 1 s de marge en boucle) et bruitages synthétisés.
- `jeu.js`, `style.css` : interface. La sauvegarde est en localStorage (plusieurs parties, export/import).
- Les anciennes sauvegardes doivent toujours se charger : toute nouvelle donnée passe par `migrer()`.

## Projet en cours : multijoueur
Ligue entre amis, sans compte Claude : appli + serveur Supabase (gratuit).
Décisions prises avec Juju :
- draft d'ouverture aux enchères secrètes, même budget pour tous, pas de mise au-delà de sa caisse, le gagnant paie la 2e offre + 1 po, égalité à l'avantage du club qui a le moins dépensé, deuxième tour court ;
- marché commun en enchères secrètes, clôture du mercato avant le match (par ex. la veille), puis temps de composition ;
- matchs lancés automatiquement à heure fixe par le serveur, plus un bouton « Lancer la journée » et « Pause » pour le commissaire (Juju) ;
- pilote automatique pour les absents ; notifications web push ;
- échanges entre amis, courrier des lecteurs dans la gazette.
Taille : 6 à 8 amis au départ, 10 au maximum (ligue de 6 à 10 clubs, l'ordinateur complète si impair). Rythme de départ proposé : voir MULTIJOUEUR.md.

Plan détaillé, base de données et suivi du chantier : `multijoueur/MULTIJOUEUR.md` et `multijoueur/supabase.sql`.
Le moteur est déterministe avec `R=graine(seed)` ; `estH(T)` distingue un club humain (`T.humain`) d'un club de l'ordinateur.
Test de non-régression du solo : `node multijoueur/test_non_regression.js <nouveau> <ancien>` (mêmes graines, même résultat).

## Vérifier avant de livrer
- Tests moteur en Node (concaténer moteur.js, legendes.js, carriere.js, gazette.js, gazette2.js dans `new Function`) : simuler plusieurs saisons sans erreur.
- Tests d'interface avec Playwright sur un serveur local (`python3 -m http.server`).
