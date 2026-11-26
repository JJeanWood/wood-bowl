'use strict';
/* ================= WOOD BOWL · GAZETTE, LA FABRIQUE À PHRASES =================
   Les phrases sont assemblées à partir de morceaux interchangeables (début, action, fin).
   Chaque morceau est suivi par la mémoire anti-répétition : sur plusieurs saisons,
   on ne relit pas deux fois la même phrase. */

/* --- morceaux interchangeables, par catégorie --- */
const COMPO={
  but:[
    ["Sur une contre-attaque éclair, ","À la suite d'un cafouillage monumental, ","Profitant d'une bagarre générale, ","Après un rebond capricieux, ","Dans un nuage de poussière, ","Alors que l'arbitre renouait ses lacets, ","Sous une pluie de navets, ","Au terme d'une action confuse, ","Sur un ballon perdu par la défense {da}, ","Pendant que le public réclamait des saucisses, ","Au bout d'une chevauchée de quarante pas, ","Contre toute logique, ","Sans prévenir personne, ","Dans le dos d'une défense {da} occupée à se disputer, ","Au milieu des hurlements, ","Sur une relance hasardeuse {da}, ","Alors que la pluie redoublait, ","À peine la mêlée dispersée, ","Sur une touche jouée trop vite, ","Après trois rebonds sur des casques, ",""],
    ["{j} s'arrache","{j} jaillit de la mêlée","{j} fonce tête baissée","{j} se faufile entre deux colosses","{j} enjambe un défenseur à terre","{j} accélère comme un lièvre poursuivi par un orque","{j} encaisse un coup d'épaule sans broncher","{j} évite un plaquage d'un pas de danse","{j} récupère la balle à la lutte","{j} trottine tranquillement","{j} rebondit sur un adversaire","{j} traverse la défense {da} comme une flèche","{j} écarte un défenseur d'un revers de main","{j} feinte la passe","{j} se jette en avant","{j} déboule à toute vitesse","{j} surgit de nulle part","{j} file le long de la palissade","{j} se débarrasse de deux poursuivants","{j} coupe à travers le terrain"],
    [" et aplatit dans l'en-but."," et dépose la balle derrière la ligne."," et marque sous les hurlements."," et inscrit le point sans trembler."," et termine dans l'en-but, la balle collée au torse."," et marque, avant de saluer la foule d'un geste grossier."," et marque. Même le vendeur de bière applaudit."," et va marquer, à la stupéfaction générale."," et franchit la ligne en roulant sur lui-même."," et conclut d'un plongeon disgracieux mais efficace."," et marque en traînant un défenseur accroché à sa jambe."," et marque, puis embrasse un poteau."," et trouve l'en-but. Simple, brutal, efficace."," et marque avec un calme de moine."," et marque, puis fait trois fois le tour du terrain pour fêter ça."," et marque en tirant la langue à la tribune adverse."," et marque, sous le regard désabusé de la défense {da}."," et marque. Le barde officiel improvise déjà une chanson."," et marque, puis exige qu'on note la date."," et marque en glissant sur le ventre jusqu'aux pieds du public."]
  ],
  butPasse:[
    ["{p} arme le bras et envoie une passe lobée ; ","Passe à ras de terre de {p} ; ","{p} trouve un angle impossible ; ","D'une passe en cloche, {p} lance l'attaque ; ","{p} se débarrasse de la balle juste avant d'être aplati ; ","{p} lance par-dessus la mêlée ; ","{p} glisse la balle entre deux paires de jambes ; ","{p} fixe la défense puis décale ; ","Sur un coup de génie de {p}, la balle file vers l'aile ; ","{p}, sans regarder, balance la balle vers l'avant ; ","{p} enroule une passe que les bardes chanteront longtemps ; ","Passe éclair de {p} ; ","{p} lance de toutes ses forces, en fermant les yeux ; ","{p} attend le dernier moment, puis libère la balle ; ","Transversale de {p} d'un bout à l'autre du terrain ; ","{p} feinte de courir et lance ; "],
    ["{j} la cueille en pleine course et marque.","{j} n'a plus qu'à pousser la balle dans l'en-but.","{j} capte d'une main et file marquer.","{j} plonge, attrape, marque. Tout dans le même geste.","{j} contrôle de la poitrine et conclut.","{j} remercie d'un hochement de tête et aplatit.","{j} s'envole pour la saisir et retombe dans l'en-but.","{j} jongle deux fois, rattrape et marque.","{j} la reçoit sur le casque, puis dans les bras, puis dans l'en-but.","{j} termine le travail sans se poser de questions.","{j} conclut, puis désigne {p} du doigt pour partager la gloire.","{j} n'a qu'à courir. Il court. Il marque.","{j} l'attrape du bout des doigts et marque en équilibre.","{j} s'en saisit avant deux défenseurs {da} et marque.","{j} la bloque contre son ventre et fonce marquer.","{j} la récupère au rebond et va marquer."]
  ],
  occasion:[
    ["{j} se présente seul face à l'en-but","{j} file vers la ligne","{j} arme un tir puissant","{j} part en dribble","{j} récupère une balle en or","{j} s'échappe sur l'aile","{j} a la balle et le champ libre","{j} tente un coup de génie","{j} part à l'abordage","{j} déborde toute la défense","{j} surgit au point de penalty","{j} intercepte une passe {da}"],
    [", mais glisse sur une flaque suspecte.",", mais la balle lui file entre les doigts.",", mais se fait rattraper par un défenseur {da} en sabots.",", mais oublie de lever la tête et percute un poteau.",", mais s'arrête pour discuter avec un supporter.",", mais trébuche sur un casque abandonné.",", mais un défenseur {da} sort de nulle part et l'arrête.",", mais sa passe finit dans les mains de l'arbitre.",", mais tire si fort que la balle sort du stade.",", mais se retourne pour vérifier qu'on le regarde. Trop tard.",", mais la défense {da} referme la porte au dernier moment.",", mais s'emmêle les pieds de façon spectaculaire.",", mais un chien errant lui vole la balle.",", mais célèbre trop tôt et se fait reprendre la balle.",", mais trois défenseurs {da} lui tombent dessus en même temps.",", mais son lacet a d'autres projets."]
  ],
  sonne:[
    ["{j} envoie un coup d'épaule à {v}","{j} percute {v} de plein fouet","{j} décroche une gifle monumentale à {v}","{j} plaque {v} contre la palissade","{j} renverse {v} comme une quille","{j} offre un coup de casque à {v}","{j} s'assoit littéralement sur {v}","{j} cueille {v} au menton","{j} rentre dans {v} à pleine vitesse","{j} attrape {v} par le col et le secoue"],
    [", qui voit des étoiles un bon moment.",", qui reste au sol en fredonnant une berceuse.",", qui se relève en appelant sa mère.",", qui se relève et repart du mauvais côté.",", qui demande à l'arbitre de noter la plaque du chariot.",". Sonné, {v} reste quand même sur le terrain.",", qui met trois minutes à retrouver ses jambes.",", qui jure avoir vu un dragon.",", qui tient debout par pure fierté.",", qui compte les nuages avant de se relever.",", qui salue un poteau en le prenant pour son entraîneur.",", qui continue de jouer avec un regard très lointain."]
  ],
  blesse:[
    ["{j} retombe de tout son poids sur {v}","{j} broie {v} dans un plaquage","{j} fauche {v} à hauteur de genoux","{j} piétine {v}, « sans le faire exprès », dit-il","{j} écrase {v} contre un poteau","{j} tord le bras de {v}","{j} percute {v} en pleine course","{j} envoie {v} dans la tribune"],
    [". Sortie sur civière : {n} d'absence.",". Le guérisseur annonce {n} d'absence.",". {v} est évacué en brouette, absent pour {n}.",". Diagnostic du rebouteux : {n} au repos.",". {v} quitte le terrain en boitant, pour {n}.",". On le reverra dans {n}, avec un bandage.",". Les brancardiers, ravis, l'emportent pour {n}.",". {v} manquera {n}, et une partie de sa dignité."]
  ],
  jaune:[
    ["Carton jaune pour {j}","L'arbitre sort le jaune devant {j}","Avertissement pour {j}","{j} écope d'un jaune","Jaune pour {j}","L'arbitre note {j} dans son petit carnet"],
    [", coupable d'un croc-en-jambe vicieux.",", pour un coup de coude « involontaire ».",", après une morsure bien placée.",", pour avoir contesté avec un gourdin.",", pour avoir tiré un maillot jusqu'à le déchirer.",", pour une simulation digne du théâtre royal.",", qui avait confondu un genou et le ballon.",", pour avoir insulté l'arbitre en trois langues.",", pour un plaquage avec vingt pas d'élan.",", pour avoir chatouillé un adversaire pendant une mêlée.",", pour avoir caché la balle dans le casque d'un adversaire.",", pour un coup de tête qui a résonné jusqu'à la buvette."]
  ],
  ctx_ouvre:[["{e} ouvre le score","Premier sang pour {e}","{e} frappe le premier","Le tableau s'anime pour {e}","{e} prend les devants"],[" : {s}."," : {s}, et le public se réveille."," : {s}, ça y est."," : {s}. Il était temps."]],
  ctx_egalise:[["Tout est à refaire","{e} égalise","Retour à égalité","{e} recolle au score","{e} remet les compteurs à zéro"],[" : {s}."," : {s}, le match est relancé."," : {s}, et ça repart pour un tour."]],
  ctx_avantage:[["{e} repasse devant","{e} prend l'avantage","{e} reprend la main","{e} fait pencher la balance"],[" : {s}."," : {s}, et ça se tend."," : {s}. Rien n'est joué."]],
  ctx_ecart:[["{e} creuse l'écart","Le break pour {e}","{e} enfonce le clou","{e} s'envole"],[" : {s}."," : {s}. Ça sent le sapin pour {a}."," : {s}, et les supporters {da} rangent leurs drapeaux."," : {s}. {a} cherche ses jambes."]],
  ctx_reduit:[["{e} réduit l'écart","{e} relève la tête","{e} y croit encore","{e} revient doucement"],[" : {s}."," : {s}, tout est encore possible."," : {s}. Le match n'est pas mort."]]
};

/* --- titres assemblés --- */
const TITRES_COMPO={
  m1:[["Courte victoire {dW}","{W} s'impose d'un rien","{W} gagne sur le fil","{W} passe de justesse","Victoire étriquée {dW}","{W} l'emporte d'un souffle","Un but d'écart, et la joie {dW}","{W} gagne à l'économie"],[" face {aL}"," contre {L}"," devant {L}",""]],
  m2:[["Nette victoire {dW}","{W} s'impose sans trembler","Succès solide {dW}","{W} fait le travail","{W} maîtrise son sujet","Victoire propre {dW}"],[" face {aL}"," contre {L}",", {L} sans réponse",""]],
  m3:[["Démonstration {dW}","{W} sans pitié","Correction en règle","{W} roule sur tout le monde","Leçon de jeu {dW}","{W} déroule","Carnage signé {W}"],[" : {L} en charrette"," face {aL}",", {L} humilié"," : {L} rentre à pied",""]],
  nul:[["{A} et {B} dos à dos","Partage des points","Ni vainqueur ni vaincu","Statu quo","Match nul"],[" entre {A} et {B}",", {s}"," : seuls les guérisseurs ont gagné",""]]
};
const TITRES_PLUS={
  mort:["Le stade pleure {v}","{v} rejoint la grande tribune céleste","Adieu {v}, briseur de lignes","Larmes et chopes levées pour {v}","La ligue en deuil après la chute de {v}","Un dernier plaquage pour {v}"],
  remontada:["{W} revient de l'enfer face {aL}","Le grand retournement {dW}","Mené, {W} renverse tout","{L} se fait remonter, {W} jubile","Personne n'y croyait, sauf {W}","Remontada à la sauce {W}"],
  triple:["{j} signe un triplé","Trois buts pour {j}, la ligue à ses pieds","{j} fait trembler les filets trois fois","Le récital de {j}","Hat-trick et chopes offertes : {j} régale"],
  tardif:["{W} arrache tout au bout du temps","Coup de massue final pour {L}","Le but de la dernière chance pour {W}","{W} y a cru jusqu'au bout","Au bout du suspense, {W}"],
  surprise:["Séisme : {W} fait tomber {L}","Petit poucet, grand cœur : {W} bat {L}","L'exploit {dW}","{L} glisse sur une peau de banane nommée {W}","Personne ne l'avait vu venir : {W} gagne"],
  rouges:["Les cartons pleuvent, {W} s'en sort","Un arbitre, des cartons, une victoire pour {W}","{W} gagne un match d'expulsions","Le rouge est mis, {W} l'emporte"],
  boucherie:["Champ de bataille : {W} reste debout","Les brancardiers ont fait des heures sup","{W} gagne, l'infirmerie déborde","Match de boucherie, victoire {dW}","On a joué au milieu des civières"],
  nul0:["Zéro à zéro, ronflements en tribune","Pas un but, pas un frisson","{A} – {B} : le néant","Les buts ont pris congé"],
  nulFou:["{s} : un match à ne pas montrer aux défenseurs","Feu d'artifice sans vainqueur entre {A} et {B}","But, but, but, et personne ne gagne","Les défenses en vacances, {s}"]
};
const CHAPOS_PLUS=["{n} spectateurs, deux bagarres en tribune et un match : {A} – {B}.","Il y avait {n} curieux, un ciel de plomb et une odeur de friture pour {A} – {B}.","{A} recevait {B} devant {n} spectateurs, dont un tiers à jeun.","Le stade affichait {n} entrées, et autant d'opinions sur l'arbitre, pour {A} – {B}.","Pour {A} – {B}, {n} spectateurs avaient apporté leurs propres légumes à lancer.","{n} spectateurs et une chèvre égarée ont assisté à {A} – {B}.","Ciel menaçant, bière tiède, {n} fidèles : décor planté pour {A} – {B}.","On s'est battu pour les places : {n} spectateurs ont vu {A} – {B}.","{A} – {B}, devant {n} spectateurs et une fanfare qui ne connaissait qu'un air.","{n} braves ont bravé la boue pour {A} – {B}. Ils ne l'ont pas regretté.","Le chroniqueur s'est installé entre deux ivrognes et {n} autres spectateurs pour {A} – {B}.","Le stade sentait la sueur et la soupe aux choux : {n} spectateurs pour {A} – {B}."];
const BREVES_PLUS=["Recherche : bénévoles pour ramasser les dents après les matchs. Gants fournis.","L'école de brancardiers recrute. Bras solides exigés, estomac aussi.","Un nain a déposé une réclamation : la balle est « trop ronde ».","Avis aux supporters : les catapultes restent interdites en tribune.","Le comité rappelle que l'arbitre n'est pas une cible. Officiellement.","Vente aux enchères d'un casque ayant appartenu à une légende. Odeur incluse.","Nouveau à la buvette : la saucisse de troll. Ne demandez pas.","Un elfe a écrit au journal pour se plaindre de la boue. Nous lui avons répondu par écrit, avec de la boue.","Les gobelins de la tribune sud ont volé le panneau de score. Retour espéré d'ici la fin de saison.","Rappel : il est interdit de parier sur son propre carton rouge.","Mariage en tribune samedi dernier. Le marié est reparti sur une civière, comme le veut la tradition.","Le guérisseur de la ligue est en vacances. Évitez de vous blesser jusqu'à mardi.","Concours du plus beau coquard : les inscriptions sont ouvertes.","Le stade va être repeint. En rouge, par économie.","Un ballon a été retrouvé dans la rivière. Personne ne le réclame.","Horoscope des cogneurs : Taureau, frappez. Bélier, frappez aussi.","La taverne du Gourdin Fêlé offre une chope à tout joueur qui marque. Les défenseurs boivent de l'eau.","Erratum : le joueur décédé la semaine dernière allait très bien. Il dormait.","Les bardes de la ligue annoncent un album. Douze chansons sur les genoux brisés.","Petite annonce : arbitre cherche amis. Sérieux s'abstenir.","Un supporter orque a appris à lire grâce à notre gazette. Il demande plus d'images.","Météo des tribunes : averses de bière en fin de match.","La ligue étudie l'interdiction des épées. Les orques étudient la ligue.","On recherche le propriétaire d'une jambe de bois oubliée au vestiaire visiteur.","Le vendeur de soupe propose une nouvelle recette : la soupe. Encore.","Club de lecture : ce mois-ci, « Mille façons de plaquer un elfe ».","Un gobelin a été élu supporter de l'année. Le jury était composé de gobelins.","Un nain réclame la propriété du terrain : son arrière-grand-père y aurait creusé un trou en 112.","Rubrique jardinage : comment faire repousser une pelouse piétinée par six orques.","Les mères des joueurs se sont constituées en association. Les arbitres tremblent."];
const VERDICTS_PLUS={
  victoireDomine:["Vous gagnez sans briller. Retenez le score, oubliez le reste.","Une victoire de voleur, mais les voleurs aussi ont des points.","Le match était à eux, le résultat est à vous. Ça arrive, et ça fait du bien."],
  victoire:["Bonne copie : du sérieux, de l'impact et ce qu'il fallait de réussite.","Victoire construite et méritée. L'entraîneur peut se servir une chope.","Une équipe qui joue juste et cogne au bon moment : c'était vous."],
  victoireLarge:["Écrasant. Même vos remplaçants se sont amusés.","Vous avez joué avec eux comme un chat avec une souris un peu lente."],
  nul:["Ni gloire ni honte. Un nul qui laisse un léger goût de bière tiède.","Chacun son point, chacun ses bleus.","Un nul honnête, ce qui est rare dans ce stade."],
  defaiteDomine:["Le jeu était chez vous, la chance chez eux. Rien à changer, tout à recommencer.","Vous méritiez au moins le nul. Le destin avait d'autres projets."],
  defaite:["Ils étaient meilleurs, il faut le reconnaître en serrant les dents.","Défaite sans appel, mais sans drame. On repart au travail.","Un jour sans. Il y en a dans toutes les saisons."],
  defaiteLarge:["Sévère leçon. Le vestiaire risque d'être silencieux ce soir.","Une soirée à oublier très vite, et à analyser très longtemps."]
};

/* --- branchement sur la gazette d'origine --- */
Object.keys(TITRES_PLUS).forEach(k=>{TITRES[k]=(TITRES[k]||[]).concat(TITRES_PLUS[k])});
CHAPOS.push(...CHAPOS_PLUS);BREVES.push(...BREVES_PLUS);
Object.keys(VERDICTS_PLUS).forEach(k=>{if(VERDICTS[k])VERDICTS[k].push(...VERDICTS_PLUS[k])});
Object.keys(VERDICTS).forEach(k=>VERDICTS[k]=VERDICTS[k].map(t=>t.replace(/le brutball/g,'le Wood Bowl')));

/* assemble une phrase morceau par morceau, en évitant les morceaux vus récemment */
function composer(S,cat,table){
  const parts=(table||COMPO)[cat];
  return parts.map((pool,k)=>choisir(S,'C'+cat+k+'_',pool)).join('');
}
function variante(S,cat,pool,table,part){
  const T=table||COMPO;
  const p=part||({sonne:.8,ctx_ecart:.8,ctx_ouvre:.8,ctx_egalise:.75,ctx_avantage:.75,ctx_reduit:.75,blesse:.7,jaune:.7}[cat]||.6);
  if(T[cat]&&R()<p)return composer(S,cat,T);
  return choisir(S,cat,pool);
}

/* --- renforts pour les petites réserves de phrases (ajoutés au moment du tirage) --- */
const ANA={
  maladroit:["{j} tente une roulade de célébration et s'assomme sur le poteau.","{j} lance la balle à l'arbitre, par habitude.","{j} oublie dans quel sens il attaque, pendant dix bonnes minutes.","{j} se plaque lui-même. Les spécialistes cherchent encore comment.","{j} s'arrête net pour refaire son lacet au milieu d'une action.","{j} confond le ballon avec le casque d'un adversaire. Il marque presque.","{j} rate son entrée sur le terrain et finit dans la tribune.","{j} glisse sur une peau de banane lancée par ses propres supporters.","{j} prend un temps mort que personne ne lui a accordé.","{j} fait une passe parfaite. À un adversaire.","{j} perd son casque, puis sa chaussure, puis le fil du match.","{j} salue la foule au mauvais moment et se fait aplatir."],
  fetard:["{j} ({e}) a passé la nuit à chanter sous les fenêtres du maire. Il a joué en baillant.","{j} ({e}) s'est présenté avec un chapeau de paille et une chope. On lui a retiré la chope.","{j} ({e}) a fêté son anniversaire. Trois jours durant.","{j} ({e}) a perdu un pari à la taverne et joué avec une perruque.","{j} ({e}) sentait la bière à trente pas. Les adversaires l'évitaient.","{j} ({e}) a confondu le coup d'envoi avec le dernier verre."],
  grave:["{j} retourne {v} comme une crêpe. Le guérisseur sort sa grosse trousse : longue absence.","{v} rencontre {j} à pleine vitesse. Le choc s'entend jusqu'au village. Plusieurs semaines d'arrêt.","{j} ne laisse rien de {v}, ou presque. Cicatrice garantie, absence prolongée.","Collision effroyable entre {j} et {v}. Seul {j} se relève."],
  miracle:["{f} écrase {j}, qui se relève en demandant si c'était tout.","{j} reçoit {f} en pleine poitrine et ne bouge pas d'un pouce. {f} rebondit.","Le public grimace en voyant {f} percuter {j}. {j} sourit."],
  rouge:["{j} est expulsé pour avoir tenté de vendre l'arbitre à un marchand d'esclaves. Rouge, suspendu.","Rouge direct pour {j}, qui a mordu un adversaire, puis l'arbitre, puis un poteau.","{j} prend le rouge et part bouder en tribune, au milieu des supporters adverses.","Exclusion de {j}, qui a confondu plaquage et étranglement. Suspendu au prochain match."],
  rouge2:["{j} collectionne : deuxième jaune, donc rouge. Il sera suspendu au prochain match.","Deuxième avertissement pour {j}. L'arbitre sort le rouge avec un plaisir non dissimulé."],
  aveugle:["L'arbitre éternue au moment précis où {j} assomme un adversaire. Pas vu.","{j} commet une agression en pleine lumière. L'arbitre consulte ses comptes.","L'arbitre fixe intensément un nuage pendant le coup de {j}."],
  douce:["{j} marque pendant que l'arbitre signe des autographes.","Personne ne surveillait {j}. Personne. But.","{j} profite d'un lâcher de pigeons pour marquer."],
  penalty:["L'arbitre accorde un penalty pour « intention de faute ». {j} remercie et marque.","Penalty pour {e} après une chute de {j} digne d'un saltimbanque. Transformé."],
  sauvetage:["Le kiné de {e} réanime {j} avec une potion qui sent le marécage. Il survivra, mais la saison est finie pour lui."],
  scandale:["Coup de théâtre : l'arbitre est surpris avec une bourse marquée aux armes {de}. Remplacé sur-le-champ, et 20 po d'amende."],
  'att+':["Devant, vous avez fait mal : {o}.","Votre attaque a joué juste et vite, {o} à la clé.","Leur défense a passé l'après-midi à courir derrière vous ({o}).","Vos coureurs ont trouvé l'espace : {o}."],
  'att-':["Rien ne passait : {o} seulement.","Votre attaque s'est cassé les dents sur leur défense ({o}).","Vos porteurs de balle ont fini le match sous un tas de cogneurs : {o}.","Panne sèche devant : {o}, et beaucoup de frustration."],
  'att=':["Votre attaque a fait jeu égal avec leur défense ({o}).","Attaque correcte, sans éclat : {o}.","Ni brillant ni ridicule devant : {o}."],
  'def-':["Votre défense a ressemblé à une passoire : {o}.","Ils sont passés comme ils voulaient : {o}.","Derrière, il manquait du muscle : {o}.","Votre arrière-garde a pris l'eau de toutes parts ({o})."],
  'def+':["Votre défense a fait un mur : {o}.","Derrière, personne ne passait ({o}).","Vos cogneurs ont fait le ménage : {o} seulement.","Solide comme une porte de forteresse : {o}."],
  'def=':["Défense honnête : {o}.","Votre défense a plié sans rompre : {o}.","Ni passoire ni forteresse : {o}."],
  etats:["Composition alignée : {c}. Bonus actifs : {e}.","{c} au coup d'envoi, avec ces bonus pour vous porter : {e}.","Vous avez aligné {c}, et profité de ces bonus : {e}.","Avec {c} sur le terrain, l'équipe tournait avec {e}."],
  fat:["Vos titulaires arrivaient rincés (forme {f}). L'entraînement a été trop dur.","Forme moyenne de {f} : vos joueurs ont fini le match à genoux.","Fatigue visible (forme {f}) : pensez au repos cette semaine."],
  brut:["Consigne brutale : {b} sorti(s) en face, contre {c} pour vous.","Vous avez cogné fort : {b} en face, et {c} récoltés.","Le plan « genoux » : {b} chez eux, {c} pour vous."],
  marqOk:["{n} n'a pas vu le jour, tant votre marquage était serré.","Bien joué : {n} n'a pas touché un ballon utile.","{n} a passé le match à se plaindre d'être suivi. Pas un but."]
};
const COMPO_BREVE=[
  ["Un supporter orque","La grand-mère d'un défenseur","Le mage de la ligue","Un troll de passage","Le cuisinier de la buvette","Un nain du comité","Le président d'un club rival","Un barde ivre","Une délégation de gobelins","Le gardien du stade","Un elfe noir en vacances","L'ancien arbitre de la ligue","Le vendeur de saucisses","Un sorcier à la retraite","La fanfare municipale","Un chevalier errant"],
  [" a été surpris à dévorer le ballon de rechange."," réclame l'interdiction des elfes le mardi."," propose un match en armure complète."," a volé la mascotte d'un club rival."," exige un stade couvert, « pour la soupe »."," milite pour un dragon comme arbitre."," voudrait des remises en jeu au trébuchet."," a parié sa maison sur le prochain match nul."," a écrit au journal pour se plaindre des cris."," jure avoir vu un ballon pondre un œuf."," a été retrouvé endormi dans l'en-but."," vend des morceaux de poteau « authentiques »."," a demandé la main de la mascotte."," lance une école de plaquage pour poneys."," a été élu « supporter le plus bruyant » par ses voisins."," propose de remplacer la balle par un chat. Refusé."," a perdu son dentier en tribune. Le premier qui le rapporte gagne une soupe."," a peint la ligne d'en-but en rose. Enquête en cours."," réclame une minute de silence pour sa chèvre."," a déposé une plainte contre la boue."]
];
const COMPO_CHAPO=[
  ["Sous un ciel bas,","Par un froid de canard,","Dans une odeur de saucisse grillée,","Sous une bruine tenace,","Au son d'une fanfare désaccordée,","Entre deux averses,","Par un soleil de plomb,","Dans un vacarme de cornemuses,","Sous les croassements des corbeaux,","Dans une brume à couper au couteau,","Par un vent à décorner les orques,","Dans la lumière rasante du soir,"],
  [" {n} spectateurs ont vu"," {n} braves ont assisté à"," {n} curieux se sont pressés pour"," les {n} fidèles du stade ont suivi"," {n} spectateurs, chope en main, ont suivi"," {n} supporters ont donné de la voix pour"],
  [" {A} – {B}."," le choc {A} – {B}."," l'affrontement entre {A} et {B}."," la rencontre {A} – {B}, sans regretter le voyage."," un {A} – {B} qui fera parler."," {A} – {B}, et quelques bagarres en prime."]
];
/* le tirage puise aussi dans les renforts, et la brève ou le chapeau sont parfois assemblés */
(function(){
  const base=choisir;
  choisir=function(S,cat,pool){
    if(cat==='breve'&&R()<.55)return COMPO_BREVE.map((p,k)=>base(S,'Cbr'+k+'_',p)).join('');
    if(cat==='chapo'&&R()<.55)return COMPO_CHAPO.map((p,k)=>base(S,'Cch'+k+'_',p)).join('');
    const extra=ANA[cat];return base(S,cat,extra?pool.concat(extra):pool);
  };
})();

/* --- spécialités de peuple --- */
Object.assign(GAB,{
  garde:["{f} fonce sur {v}, mais {j} s'interpose et encaisse le choc à sa place.","{j} se jette devant {v} : la charge de {f} finit dans ses côtes. Garde du corps exemplaire.","« Pas lui ! » hurle {j}, qui prend le coup de {f} destiné à {v}.","{j} colle {v} comme une ombre. Quand {f} arrive, c'est {j} qui ramasse."],
  assassinat:["Dans l'ombre d'une mêlée, une lame brille un instant.","Personne n'a rien vu venir, et c'était tout l'intérêt.","Un sourire, une ombre, un geste bref :","{j} s'éclipse quelques secondes de l'action. Quand il revient,","Profitant d'un nuage de poussière,","Avec l'élégance d'un notaire qui signe un testament,","Un murmure dans le dos de {v}, puis plus rien :","Le public regarde le ballon. {j}, lui, regarde {v}."],
  esquive:["{f} charge {j}, qui fait un petit pas de côté. {f} finit dans la palissade.","{j} esquive la charge de {f} d'une pirouette, et salue la tribune.","{f} plonge sur {j}, qui n'est déjà plus là. Le public applaudit le ballet.","{j} se dérobe sous le bras de {f} comme une feuille au vent.","{f} fonce sur {j} et ne trouve que de l'air. Beaucoup d'air.","{j} évite {f} avec un entrechat que l'opéra royal lui envierait.","{f} frappe là où était {j} il y a une demi-seconde. Raté, et vexé.","{j} se baisse au dernier moment ; {f} plaque un spectateur."],
  increvable:["{f} démolit {j}, qui se relève, crache un caillou et reprend sa place.","{j} encaisse la charge de {f} sans un mot. Il demande juste qu'on recommence, pour vérifier.","{f} rebondit sur {j} comme sur une enclume.","{j} se fait aplatir par {f}, se redresse et réajuste sa barbe. Rien de cassé.","« C'était tout ? » demande {j} à {f}, qui se tient l'épaule.","{f} percute {j} de toutes ses forces. Seul {f} grimace.","Les brancardiers accourent pour {j}, qui les renvoie d'un geste agacé.","{j} prend le coup de {f} sur le casque. Le casque est mort, pas {j}."],
  armeOk:["{j} sort de son maillot une catapulte de poche. {v} reçoit une marmite en pleine tête : {n} d'absence.","{j} lâche un furet enragé dans les jambières de {v}. Évacuation, et {n} d'arrêt.","{j} allume une mèche et s'enfuit en ricanant. {v} n'a pas eu le temps : {n} à l'infirmerie.","Un piège à ours, posé par {j} pendant la mi-temps, se referme sur {v}. Absent {n}.","{j} actionne un soufflet à poivre géant au visage de {v}, qui sort en pleurant pour {n}.","Une pierre lancée par la fronde à ressort de {j} assomme {v} : {n} d'absence.","{j} fait rouler un tonneau de clous vers {v}. Le tonneau gagne : {n} d'arrêt."],
  armeRate:["{j} sort une machine pleine de ressorts. Elle fait « pschitt », puis un petit drapeau sort. Tout le monde attend. Rien.","La bombe de {j} fait long feu. Il la secoue, souffle dessus, et finit par la manger.","{j} brandit un engin terrifiant qui se transforme en parapluie. Il pleuvait, au moins.","L'arme secrète de {j} libère une nuée de papillons. Le public est ému.","{j} active son invention, qui joue une petite musique et s'arrête. L'arbitre applaudit poliment.","Le lance-pétard de {j} part dans la buvette. Le vendeur de soupe porte plainte."],
  armeBoum:["{j} allume sa bombe à l'envers. Un grand boum, et il sort pour {n}, les sourcils en moins.","L'arme secrète de {j} lui explose au nez. Il quitte le terrain en fumant, pour {n}.","{j} se prend dans son propre piège. Les brancardiers rient en l'emportant pour {n}.","La catapulte de {j} se retourne contre lui : {n} d'absence et une leçon de mécanique.","{j} tire sur la mauvaise ficelle. Boum. Absent {n}."]
});
(function(){
  const base=phraseEvt;
  phraseEvt=function(S,res,e,prev){
    let t=base(S,res,e,prev);
    if(e.asn){const A=S.teams[res.dom],B=S.teams[res.ext];t=elide(remplir(choisir(S,'assassinat',GAB.assassinat),{j:e.j,v:e.v}))+' '+t}
    if((e.k==='armeOk'||e.k==='armeBoum')&&e.r===null)t+=' Personne sur le banc pour le remplacer.';
    else if((e.k==='armeOk'||e.k==='armeBoum')&&e.r)t+=' '+e.r+' entre à sa place.';
    return t;
  };
})();

/* --- accords au féminin : quand le joueur principal est une joueuse --- */
const PART_F=['évacué','sonné','suspendu','expulsé','renvoyé','averti','aplati','plié','piétiné','surpris','blessé','guéri','vexé','désolé','assommé','démoli','retourné','fracassé','cueilli','remarqué','marqué de près','sorti','parti','reparti','arrivé','aperçu','déguisé','épuisé','rincé','privé','seul','condamné','étendu','couché','retrouvé','resté','tombé','coiffé','fatigué','furieux','heureux','prêt'];
const FEM_IRR={furieux:'furieuse',heureux:'heureuse'};
function sexeDe(S,nom){if(!nom)return null;if(S._sexe&&S._sexe[nom])return S._sexe[nom];for(const T of S.teams){const p=T.joueurs.find(x=>x.nom===nom);if(p)return p.sexe||'m'}return 'm'}
const IMPERS=/\b([Ii]l)( (?:était temps|est temps|faisait|fait (?:froid|chaud|beau|nuit)|pleuvait|pleut|neigeait|y a|y avait|y eut|faut|fallait|faudra|reste|restait|paraît|semble que|s'agit|vaut mieux|suffit))/g;
function auFeminin(t){
  t=t.replace(IMPERS,(m,a,b)=>(a==='Il'?'§I':'§i')+b);
  t=t.replace(/s'il\b/g,'§S');
  t=t.replace(/\bIl\b/g,'Elle').replace(/\bil\b/g,'elle').replace(/\blui-même\b/g,'elle-même').replace(/\bSeul\b/g,'Seule');
  PART_F.forEach(w=>{const f=FEM_IRR[w]||(w.endsWith('é')||w.endsWith('i')||w.endsWith('u')||w.endsWith('t')||w.endsWith('l')?w+'e':w.endsWith('s')?w+'e':w);t=t.replace(new RegExp('\\b'+w+'(?=[ .,!;:]|$)','g'),f)});
  t=t.replace(/§I/g,'Il').replace(/§i/g,'il').replace(/§S/g,"s'il");
  return t.replace(/\bce joueur\b/g,'cette joueuse').replace(/\bun joueur\b/g,'une joueuse');
}
(function(){
  const base=phraseEvt;
  phraseEvt=function(S,res,e,prev){
    const t=base(S,res,e,prev);
    const sj=sexeDe(S,e.j),autres=[e.v,e.f].filter(Boolean).map(n=>sexeDe(S,n));
    /* on n'accorde que si toutes les personnes nommées sont des joueuses, pour ne pas fausser un « il » qui désigne l'autre */
    if(sj==='f'&&autres.every(x=>x==='f'))return auFeminin(t);
    if(!e.j&&e.v&&sexeDe(S,e.v)==='f')return auFeminin(t);
    return t;
  };
})();
