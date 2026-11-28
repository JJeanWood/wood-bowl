/* ================= WOOD BOWL · LES LÉGENDES =================
   36 joueurs et joueuses uniques : deux par peuple et par poste. Chacun n'existe qu'une fois
   par partie, porte une carte dorée et un pouvoir qui n'appartient qu'à lui. */
const POUVOIRS={
  rempart:{nom:'Rempart',desc:"+10 % en défense pour toute l'équipe tant qu'il ou elle est sur le terrain."},
  terreur:{nom:'Terreur',desc:"Fait trembler l'adversaire : son attaque perd 7 %."},
  eclair:{nom:'Éclair',desc:"Entraîne toute l'équipe dans sa course : +8 % en attaque."},
  finisseur:{nom:'Finisseur',desc:"Ne rate rien : tente sa chance plus souvent, et il lui suffit de dépasser la défense de 5 % pour marquer (au lieu de 18 %)."},
  meneur:{nom:'Meneur de jeu',desc:"Confisque le ballon : votre équipe a la possession plus souvent (+4,5 points)."},
  capitaine:{nom:'Capitaine',desc:"Galvanise les siens : +5 % en attaque et en défense pour toute l'équipe."},
  boucher:{nom:'Boucher',desc:"Son équipe frappe plus souvent (+10 %), et ses propres coups font bien plus mal."},
  roc:{nom:'Roc',desc:"Presque impossible à blesser (85 % de ses blessures deviennent un simple sonné), et il couvre ses coéquipiers : les coups adverses font 30 % moins mal."},
  sangfroid:{nom:'Sang-froid',desc:"Grand dans les fins de match : +15 % en attaque pour l'équipe dans les trois derniers temps forts."},
  souffle:{nom:'Second souffle',desc:"Ses coéquipiers se fatiguent moins : 5 points de forme en moins perdus par match."},
  idole:{nom:'Idole des foules',desc:"Le public l'adore : +4 po à chaque match joué et la ferveur grimpe plus vite."},
  esquive:{nom:'Insaisissable',desc:"Esquive un coup sur deux."},
  charmeur:{nom:'Charmeur',desc:"L'arbitre ne lui met jamais de carton."},
  ombre:{nom:"Lame dans l'ombre",desc:"À chaque temps fort, 11 % de chances d'éliminer discrètement un adversaire."},
  roublard:{nom:'Roublard',desc:"Marque en douce : 6 % de chances à chaque temps fort, et l'arbitre ne voit rien une fois sur deux."},
  artificier:{nom:'Artificier',desc:"Arme secrète deux fois par match, et elle rate rarement."}
};
/* bf, bv, bt : bonus de force, vitesse, balle par rapport à un joueur moyen de son peuple et de son poste */
const LEGENDES=[
 {id:'L01',nom:'Sire Gontran le Mur',sexe:'m',race:'humain',poste:'Cogneur',b:[24,8,14],pv:'rempart',bio:"Ancien chevalier, il a tenu seul un pont pendant trois jours. Le pont, depuis, porte son nom."},
 {id:'L02',nom:'Mathilde Brise-Lance',sexe:'f',race:'humain',poste:'Cogneur',b:[22,14,10],pv:'terreur',bio:"A brisé onze lances en tournoi, puis les chevaliers qui les tenaient."},
 {id:'L03',nom:'Lancelin Pied-Léger',sexe:'m',race:'humain',poste:'Coureur',b:[8,24,14],pv:'eclair',bio:"Personne ne l'a jamais vu courir : on le voit seulement arriver."},
 {id:'L04',nom:'Aliénor la Flèche',sexe:'f',race:'humain',poste:'Coureur',b:[10,22,16],pv:'finisseur',bio:"Archère reconvertie. Elle vise toujours le cœur de l'en-but."},
 {id:'L05',nom:"Maître Anselme Main-d'Or",sexe:'m',race:'humain',poste:'Passeur',b:[8,12,24],pv:'meneur',bio:"Sa main gauche est en or massif depuis un pari perdu contre un dragon. Elle lance mieux qu'avant."},
 {id:'L06',nom:'Dame Ysolde la Stratège',sexe:'f',race:'humain',poste:'Passeur',b:[10,12,22],pv:'capitaine',bio:"A gagné trois guerres sur le papier, et une vraie avec un ballon."},
 {id:'L07',nom:'Grakkus Brise-Tout',sexe:'m',race:'orque',poste:'Cogneur',b:[22,6,8],pv:'boucher',bio:"Sa mâchoire de fer lui a été posée par un forgeron nain. Le forgeron ne s'en est jamais remis."},
 {id:'L08',nom:'Mama Ghorza',sexe:'f',race:'orque',poste:'Cogneur',b:[20,8,10],pv:'terreur',bio:"Matriarche de dix-sept fils, tous joueurs, tous terrifiés par elle."},
 {id:'L09',nom:'Throk le Bélier',sexe:'m',race:'orque',poste:'Coureur',b:[16,20,8],pv:'finisseur',bio:"Il ne contourne pas les défenseurs. Il passe au travers."},
 {id:'L10',nom:'Urzha Sabot-de-Fer',sexe:'f',race:'orque',poste:'Coureur',b:[12,22,10],pv:'eclair',bio:"Ses bottes ferrées laissent des sillons fumants sur la pelouse."},
 {id:'L11',nom:'Krâsh Lance-Crâne',sexe:'m',race:'orque',poste:'Passeur',b:[14,10,22],pv:'meneur',bio:"Son ballon porte-bonheur a une forme de crâne. Personne n'ose demander pourquoi."},
 {id:'L12',nom:'Shagra la Hurleuse',sexe:'f',race:'orque',poste:'Passeur',b:[14,12,20],pv:'capitaine',bio:"Sa voix porte à trois lieues. Ses consignes aussi."},
 {id:'L13',nom:'Thrain Enclume-de-Fer',sexe:'m',race:'nain',poste:'Cogneur',b:[22,6,10],pv:'roc',bio:"Un troll lui est tombé dessus en 1412. Le troll a eu mal."},
 {id:'L14',nom:"Hildur Barbe-d'Acier",sexe:'f',race:'nain',poste:'Cogneur',b:[20,8,12],pv:'rempart',bio:"Ses tresses cerclées d'acier ont déjà assommé deux arbitres. Par accident, jure-t-elle."},
 {id:'L15',nom:'Brokk Tonnerre-Court',sexe:'m',race:'nain',poste:'Coureur',b:[10,24,10],pv:'sangfroid',bio:"Le nain le plus rapide de l'histoire. Il l'est surtout dans les dernières minutes."},
 {id:'L16',nom:'Dagna Roule-Tonneau',sexe:'f',race:'nain',poste:'Coureur',b:[12,22,12],pv:'eclair',bio:"Elle s'entraîne en poussant des tonneaux pleins dans les galeries. En montée."},
 {id:'L17',nom:'Ormund le Vieux Renard',sexe:'m',race:'nain',poste:'Passeur',b:[10,8,24],pv:'souffle',bio:"Quatre-vingt-dix saisons au compteur. Il connaît toutes les ruses, il en a inventé la moitié."},
 {id:'L18',nom:'Skalda Trois-Pintes',sexe:'f',race:'nain',poste:'Passeur',b:[12,10,22],pv:'idole',bio:"Chante, boit, passe, gagne. Le public la suit de taverne en taverne."},
 {id:'L19',nom:'Thirandil Gant-de-Soie',sexe:'m',race:'elfe',poste:'Cogneur',b:[22,14,12],pv:'esquive',bio:"N'a jamais taché ses gants blancs. Ni pris un coup."},
 {id:'L20',nom:'Faëlys Ronce',sexe:'f',race:'elfe',poste:'Cogneur',b:[22,12,14],pv:'charmeur',bio:"Douce comme une rose, piquante comme sa tige. Les arbitres ne voient que la rose."},
 {id:'L21',nom:'Aelindor Vent-du-Nord',sexe:'m',race:'elfe',poste:'Coureur',b:[8,22,16],pv:'finisseur',bio:"On dit qu'il a dépassé une tempête. La tempête conteste."},
 {id:'L22',nom:"Sylvaël l'Insaisissable",sexe:'f',race:'elfe',poste:'Coureur',b:[8,24,14],pv:'esquive',bio:"Cent matchs, zéro plaquage subi. Une feuille dans le vent, avec un ballon."},
 {id:'L23',nom:'Célandre Œil-de-Faucon',sexe:'f',race:'elfe',poste:'Passeur',b:[8,14,24],pv:'meneur',bio:"Voit une ouverture avant qu'elle n'existe. Et la passe y arrive."},
 {id:'L24',nom:'Lirian Mille-Printemps',sexe:'m',race:'elfe',poste:'Passeur',b:[8,12,24],pv:'sangfroid',bio:"Mille ans de calme. Il a vu passer trois empires et autant de défenses."},
 {id:'L25',nom:'Vhaëris la Veuve',sexe:'f',race:'elfenoir',poste:'Cogneur',b:[20,14,12],pv:'ombre',bio:"Sept maris, sept accidents. Ses adversaires évitent de lui serrer la main."},
 {id:'L26',nom:'Malzhor Lame-Grise',sexe:'m',race:'elfenoir',poste:'Cogneur',b:[22,12,10],pv:'boucher',bio:"Chaque cicatrice rituelle de son visage raconte un match. Aucun ne finit bien pour l'adversaire."},
 {id:'L27',nom:'Nyx Sans-Bruit',sexe:'f',race:'elfenoir',poste:'Coureur',b:[8,22,16],pv:'roublard',bio:"Elle marque, et l'arbitre cherche encore le ballon."},
 {id:'L28',nom:"Zaeryn l'Éclipse",sexe:'m',race:'elfenoir',poste:'Coureur',b:[10,24,12],pv:'finisseur',bio:"Passe dans l'ombre des défenseurs comme la lune devant le soleil."},
 {id:'L29',nom:'Ilvara Langue-de-Vipère',sexe:'f',race:'elfenoir',poste:'Passeur',b:[8,12,24],pv:'charmeur',bio:"Elle convainc l'arbitre, ses adversaires et parfois ses propres coéquipiers."},
 {id:'L30',nom:'Kaelith le Tisseur',sexe:'m',race:'elfenoir',poste:'Passeur',b:[10,12,22],pv:'terreur',bio:"Tisse ses passes comme une araignée sa toile. On s'y prend, on n'en sort plus."},
 {id:'L31',nom:'Snikkit Gros-Bras',sexe:'m',race:'gobelin',poste:'Cogneur',b:[24,10,10],pv:'artificier',bio:"Son bras mécanique a été bricolé dans une baratte. Il cogne, il fume, parfois il explose."},
 {id:'L32',nom:'Mère Grizzla',sexe:'f',race:'gobelin',poste:'Cogneur',b:[20,8,12],pv:'boucher',bio:"Armée de son rouleau à pâtisserie, elle a mis à terre une ligne entière d'orques."},
 {id:'L33',nom:'Zip le Fusé',sexe:'m',race:'gobelin',poste:'Coureur',b:[8,26,10],pv:'eclair',bio:"Attaché à une fusée de feu d'artifice. Il sait démarrer, pas encore s'arrêter."},
 {id:'L34',nom:'Nakka Doigts-Collants',sexe:'f',race:'gobelin',poste:'Coureur',b:[10,22,14],pv:'roublard',bio:"Le ballon colle à ses gants. Les montres des spectateurs aussi."},
 {id:'L35',nom:"Grotz l'Inventeur",sexe:'m',race:'gobelin',poste:'Passeur',b:[8,12,22],pv:'artificier',bio:"Son sac à dos fume, siffle et lance des ballons tout seul. Il prétend le contrôler."},
 {id:'L36',nom:"Pipka Bouche-d'Or",sexe:'f',race:'gobelin',poste:'Passeur',b:[10,14,20],pv:'idole',bio:"Sa dent en or brille sous les projecteurs. La foule chante son nom à chaque passe."}
];
const legendeDe=id=>LEGENDES.find(l=>l.id===id);
function legendesLibres(S){const pris=new Set();(S.teams||[]).forEach(T=>T.joueurs.forEach(p=>{if(p.leg&&!p.mort)pris.add(p.leg)}));(S.marche||[]).forEach(p=>{if(p.leg)pris.add(p.leg)});
  (S.fame||[]).concat(S.morts||[]).forEach(f=>{if(f.leg)pris.add(f.leg)});const inters=S.multi?S.teams.map(T=>T.gest&&T.gest.inter):[S.inter];inters.forEach(I=>{if(I&&I.arrivees)I.arrivees.forEach(a=>{if(a.p&&a.p.leg)pris.add(a.p.leg)})});if(S.draft&&S.draft.vivier)S.draft.vivier.forEach(p=>{if(p.leg)pris.add(p.leg)});
  return LEGENDES.filter(l=>!pris.has(l.id))}
function vueLegende(S,id){S.legVues=S.legVues||[];if(!S.legVues.includes(id))S.legVues.push(id)}
function creerLegende(S,L){
  const b=RACES[L.race].base,m=POSTES[L.poste].mod;
  const st=(k,i)=>clamp(Math.round(b[k]+m[k]+(typeof i==='number'?L.b[i]:0)+(L.poste==='Cogneur'&&k==='f'?5:0)),40,97);
  /* les mains d'une légende : celles d'un grand coureur, correctes pour un passeur, ordinaires pour un cogneur */
  const mains=clamp(Math.round(b.mn+m.mn+(L.poste==='Coureur'?Math.max(L.b[1],L.b[2])-2:L.poste==='Passeur'?L.b[2]-8:L.b[2])),40,97);
  const p={id:S.nextId++,sexe:L.sexe,nom:L.nom,race:L.race,poste:L.poste,f:st('f',0),v:st('v',1),t:st('t',2),mn:mains,forme:ri(80,95),trait:'aucun',tete:'leg/'+L.id,
    blesse:0,suspendu:0,mort:false,cicatrices:0,etoiles:0,titulaire:false,entr:'repos',gain:null,saisons:3,
    buts:0,victimes:0,matchs:0,pd:0,cj:0,cr:0,sb:0,sv:0,sm:0,sj:0,spd:0,sn:0,snb:0,leg:L.id,pv:L.pv};
  p.cap={};STATS.forEach(k=>{p.cap[k]=clamp(p[k]+ri(2,5),p[k],99)});
  p.sp=ri(70,85);p.cap.sp=clamp(p.sp+ri(5,10),p.sp,99);
  p.sal=Math.round(salaire(p)*1.5);
  (S._sexe||(S._sexe={}))[p.nom]=p.sexe;S._noms&&S._noms.add(p.nom);
  vueLegende(S,L.id);
  completerJoueur(p,{leg:true});
  return p;
}
/* une légende libre, au hasard (on peut filtrer par peuple ou par poste) */
function tirerLegende(S,filtre){const L=legendesLibres(S).filter(l=>!filtre||filtre(l));return L.length?creerLegende(S,pick(L)):null}
const aPouvoir=(liste,pv)=>liste.some(p=>p.pv===pv&&!p.temp);
