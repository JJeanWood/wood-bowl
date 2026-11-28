# Le Labo

Le Labo est le brouillon de Wood Bowl : une copie du jeu, en solo, publiée comme artefact Claude privé, où Juju essaie ses idées avant de les mettre dans l'appli.

- Artefact : « Wood Bowl · Le Labo », slug `8120da6d-f7a7-44d5-b5ff-27a0ba3b7c29` (privé). Republier avec `publish_files` (slug + base_version) les seuls fichiers modifiés. Les tableaux du mur des légendes (`img/tableau/`) n'y sont pas : repli automatique sur les portraits.
- Branche git : `labo` (jamais déployée : GitHub Pages ne sert que `main`).
- Différences voulues avec l'appli : étiquette « LABO », pas de ligue entre amis (ni `ligue-ui.js` ni `multijoueur/config.js`), pas de manifeste d'installation.
- Méthode : une idée est d'abord formulée et discutée, puis mise dans le Labo si Juju le demande, puis reportée sur `main` s'il l'adopte (avec tous les tests), ou retirée.
- Remettre le Labo à niveau de l'appli de temps en temps : `git merge main` sur la branche `labo`.

## Idées

| Idée | État |
|---|---|
| 7 joueurs sur le terrain, effectif maximum 11 (minimum 7) | **dans le Labo** (28/11/2026) |
| Poste de trois-quarts (3/4), polyvalent : force et vitesse à parts égales | **dans le Labo** |
| Note « Balle » coupée en Passe (`t`) et Mains (`mn`) | **dans le Labo** |
| 7 places fixes (1 passeur, 2 coureurs, 2 trois-quarts, 2 cogneurs), pas de malus hors poste : chaque place se sert de ses notes, l'entraîneur place les titulaires au mieux (`placer`) | **dans le Labo** |
| Chaque peuple joue chaque poste à sa façon | en discussion |
| Compétence cachée « esprit d'équipe » (le Liant) | en discussion |
| Nouveaux peuples (Ratiers, morts-vivants, ogres…) | en discussion |

## Étape 1 : ce qui a changé dans le code (pour le report sur `main`)

- `moteur.js` : `NB_TIT=7`, `EFF_IA=9`, `PLACES`, `STATS=['f','v','t','mn']`, `somme3` (prix et salaires gardent leur échelle), `apport(p,place)`, `placer`, `placesPrevues`, `pj(p)` (place jouée pendant le match, `p._pl`), remplaçant choisi selon la place libérée, états d'équipe revus (sang pur à 7, clan à 5-6, bric et broc à 5 peuples, « Ligne de béliers », « Sans trois-quarts »), `migrerLabo` (déduit les Mains des anciennes sauvegardes, complète les clubs de l'ordinateur à 9).
- Réglages trouvés par simulation (60 parties de 3 saisons, comparées à `main`) : attaque ×1,08 pour garder environ 1,45 but par équipe et par match ; salaires ×0,76 pour garder la même caisse en fin de saison ; blessures par équipe inchangées, donc environ un quart de blessures en moins par joueur.
- `legendes.js` (Mains des légendes), `carriere.js` (effectifs de l'ordinateur, tirs au but), `gazette.js`, `jeu.js`, `style.css`.
- **Pas encore fait** : `ligue.js`, `ligue-ui.js` et le serveur ne connaissent pas les 7 joueurs (le Labo n'a pas de ligue) ; budget de draft et vivier à revoir au moment du report. Aucune légende n'est trois-quarts. Les tests `multijoueur/` ne passent donc plus sur cette branche.
