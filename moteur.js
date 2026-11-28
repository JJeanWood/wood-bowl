'use strict';
/* ================= WOOD BOWL · MOTEUR (aucun accès à la page) ================= */
let R=Math.random;
/* club dirigé par un humain (en solo : le club 0 ; en ligue : chaque ami) */
const estH=T=>!!T&&(T.humain===true||(T.humain===undefined&&T.id===0));
/* Solo ou ligue. En solo, un seul humain (le club 0) et tout ce qui touche à sa gestion est rangé dans S.
   En ligue (S.multi), chaque club humain range la même chose dans T.gest : choix de match, sponsor, rapport du stratège,
   rebondissement en cours, intersaison, etc. G(S,T) renvoie le bon tiroir dans les deux cas. */
const humains=S=>S.multi?S.teams.filter(estH):[S.teams[0]];
const clubsIA=S=>S.multi?S.teams.filter(T=>!estH(T)):S.teams.slice(1);
const G=(S,T)=>S.multi?(T.gest||(T.gest={})):S;
const moiDe=(S,T)=>T||S.teams[0];
const estHId=(S,id)=>id>=0&&estH(S.teams[id]);
const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
const pick=a=>a[Math.floor(R()*a.length)];
const U=(a,b)=>a+R()*(b-a);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const pl=(n,mot,mots)=>n+' '+(Math.abs(n)>1?(mots||mot+'s'):mot);
function wpick(arr,w){let t=0;const ws=arr.map((x,i)=>{const k=Math.max(.0001,w(x,i));t+=k;return k});let r=R()*t;for(let i=0;i<arr.length;i++){r-=ws[i];if(r<=0)return arr[i]}return arr[arr.length-1]}

/* ---------- Peuples, postes, traits ---------- */
const RACES={
  humain:{nom:'Humain',pl:'Humains',base:{f:50,v:50,t:50,mn:50},atout:"Bosseurs : progressent plus vite à l'entraînement.",faible:"Aucun don particulier : ni très forts, ni très rapides.",pouvoir:"Polyvalents : chaque humain titulaire renforce un peu l'attaque et la défense. Médiateurs : un humain apaise les rivalités entre peuples.",allies:['nain','elfe'],rivaux:[]},
  orque:{nom:'Orque',pl:'Orques',base:{f:70,v:44,t:34,mn:38},atout:'Cogneurs nés : leurs charges blessent plus souvent, et chaque orque titulaire intimide l\'adversaire.',faible:"Indisciplinés : l'arbitre les remarque plus souvent.",pouvoir:'',allies:['gobelin'],rivaux:['nain']},
  nain:{nom:'Nain',pl:'Nains',base:{f:67,v:39,t:52,mn:46},atout:'Coriaces : rarement blessés, récupèrent vite, et chaque nain titulaire renforce la défense.',faible:'Lents, et les mains carrées : peu dangereux ballon en main.',pouvoir:'',allies:['humain'],rivaux:['orque','gobelin']},
  elfe:{nom:'Elfe',pl:'Elfes',base:{f:32,v:61,t:64,mn:61},atout:"Virtuoses : les meilleurs passeurs et coureurs-nés du royaume.",faible:'Délicats : ils se blessent facilement.',pouvoir:'',allies:['humain'],rivaux:['elfenoir']},
  elfenoir:{nom:'Elfe noir',pl:'Elfes noirs',base:{f:42,v:58,t:50,mn:55},atout:'Cruels : leurs coups visent le meilleur joueur adverse.',faible:"Sournois mais repérés : l'arbitre les surveille.",pouvoir:'',allies:['gobelin'],rivaux:['elfe']},
  gobelin:{nom:'Gobelin',pl:'Gobelins',base:{f:31,v:66,t:44,mn:56},atout:'Fourbes : tentent des buts en douce.',faible:'Petits : un coup bien placé les envoie à l\'infirmerie.',pouvoir:'',allies:['orque','elfenoir'],rivaux:['nain']}
};
const RACE_IDS=Object.keys(RACES);
/* ---------- Spécialités de peuple : une 4e jauge qu'on entraîne à part ---------- */
const SPECIALITES={
  humain:{nom:'Touche-à-tout',desc:"S'entraîner en spécialité fait progresser un peu la force, la vitesse, la passe et les mains en même temps. Plus la spécialité est haute, plus ces petits gains sont fréquents."},
  orque:{nom:'Grosse brute',desc:"Charge plus souvent et frappe plus fort. Revers : l'arbitre le repère plus facilement."},
  nain:{nom:'Tête de pioche',desc:"Peut encaisser une blessure comme si de rien n'était : il se relève, s'époussette et continue."},
  elfe:{nom:'Pas de danse',desc:"Peut esquiver complètement une charge adverse, d'une pirouette. Compense sa fragilité."},
  elfenoir:{nom:'Assassinat',desc:"Peut frapper en douce le meilleur joueur adverse, avec des coups bien plus graves. Rare, discret, et parfois mortel."},
  gobelin:{nom:'Arme secrète',desc:"Une fois par match, peut sortir un engin de sa fabrication : ça blesse un adversaire, ça fait pschitt, ou ça lui explose au nez. Aide aussi les buts en douce."}
};
const NIV_SPE=sp=>sp>=75?'Maître':sp>=50?'Expert':sp>=25?'Confirmé':'Novice';
const POSTES={
  Cogneur:{pl:'Cogneurs',court:'COG',mod:{f:13,v:-5,t:-8,mn:-8},role:"Défend, plaque et fait mal. Vit de sa force. Rarement dangereux ballon en main."},
  'Trois-quarts':{pl:'Trois-quarts',court:'3/4',mod:{f:5,v:5,t:-4,mn:0},role:"Le perce-muraille : enfonce la ligne adverse et rattrape les coureurs d'en face. Vit de sa force et de sa vitesse à parts égales. Jamais le meilleur à une place, mais dépanne partout."},
  Coureur:{pl:'Coureurs',court:'COU',mod:{f:-5,v:13,t:-8,mn:6},role:"Reçoit le ballon et marque la plupart des buts. Vit de sa vitesse et de ses mains."},
  Passeur:{pl:'Passeurs',court:'PSR',mod:{f:-8,v:-3,t:13,mn:-3},role:"Lance le jeu : sans lui, l'attaque tourne en rond. Vit de sa passe."}
};
const POSTE_IDS=['Cogneur','Trois-quarts','Coureur','Passeur'];
const AFF={humain:[1,1.3,1,1],orque:[5,3,2,1],nain:[4,2.5,1,3],elfe:[1,1.5,4,5],elfenoir:[2,3,5,3],gobelin:[1,1.2,6,2]};
/* LABO : 7 joueurs sur le terrain, à 7 places fixes ; l'effectif monte à 11 */
const NB_TIT=7,EFF_IA=9;
const MIN_POSTE={Cogneur:2,'Trois-quarts':2,Coureur:2,Passeur:1};
const PLACES=['Passeur','Coureur','Coureur','Trois-quarts','Trois-quarts','Cogneur','Cogneur'];
const TRAITS={
  aucun:{nom:'',desc:'Rien à signaler.'},
  brute:{nom:'Brute',desc:"Cherche la bagarre : frappe plus souvent, et l'arbitre le remarque."},
  fetard:{nom:'Fêtard',desc:'Arrive parfois au match après une nuit à la taverne.'},
  verre:{nom:'En verre',desc:'Se blesse pour un rien.'},
  coriace:{nom:'Coriace',desc:'Encaisse les coups sans broncher.'},
  vedette:{nom:'Vedette',desc:'Très doué : +8 dans toutes les notes, un plafond plus haut et des progrès un quart plus rapides à l\'entraînement. Payé en conséquence.'},
  fourbe:{nom:'Fourbe',desc:'Tente de marquer en douce quand personne ne regarde.'},
  maladroit:{nom:'Maladroit',desc:"Plein de bonne volonté. C'est bien le problème."},
  chanceux:{nom:'Verni',desc:"Né sous une bonne étoile : s'en sort souvent indemne."}
};
const TRAIT_IDS=['brute','fetard','verre','coriace','vedette','fourbe','maladroit','chanceux'];
const NB_TETES=7;
const NOMS={
  humain:[['Gontran','Aldebert','Berthold','Ysengrin','Hubert','Odon','Perrin','Gaspard','Mahieu','Roderic','Firmin','Guillemin','Anselme','Clotaire','Arnoul','Thibaut','Lancelin','Bertrand'],
          ['le Mou','Trois-Doigts','la Tuile','Sans-Peur','Pied-Carré','la Poisse','Longue-Soif','le Bègue','Tête-de-Bois','la Rouille','Bon-Appétit','le Désolé','Gros-Genou','Main-Moite','Belle-Gueule','le Tardif']],
  orque:[['Grak','Morgh','Urzog','Brugdar','Krâsh','Zogbak','Ghorz','Throk','Bolgar','Shagrum','Durbak','Mugra','Ugluk','Gorbag','Snarg','Rukk'],
         ['Casse-Rotule','le Délicat','Mange-Arbitre','Poing-Poli','Sans-Cou','la Tendresse','Brise-Menton','Dent-Seule','le Subtil','Écrase-Orteil','Petit-Cœur','Mâchoire-Folle','le Poète']],
  nain:[['Grumdal','Brokk','Ormund','Skaldi','Barduk','Torvald','Mungo','Rurik','Hildur','Dagnar','Volmar','Kettil','Thrain','Bofur','Grimbald','Durin'],
        ['Enclume','Barbe-en-Feu','Trois-Pintes','Roule-Tonneau','le Têtu','Pied-de-Plomb','Casse-Cailloux','Mâche-Fer','la Rancune','Courte-Paille','Fond-de-Cuve','Nez-Rouge']],
  elfe:[['Aelindor','Sylvaël','Thirandil','Faëlys','Mirevent','Ysmaël','Célandre','Lirian','Évandil','Néryel','Lorwen','Itharion','Galdor','Fëanil','Orophin'],
        ['le Coiffé',"Soupir-d'Automne",'Mèche-Rebelle','qui-ne-sue-pas','Peau-de-Pêche','le Froissé','Dix-Mille-Printemps','Regard-Las','la Brise','Nez-Pincé','Pas-de-Velours']],
  elfenoir:[['Vexaris','Malyth','Zyrael','Nyssar','Ilvar','Sorneth','Velkyn','Xulian','Morvain','Ysildre','Drazel','Kyrnn','Zarek','Mordaith'],
            ['Sans-Pitié','Rire-Jaune',"l'Ombrageux",'Lame-Fine','Mauvais-Œil','Cœur-Sec','le Rancunier','Sourire-en-Coin','Minuit-Passé','Main-Froide']],
  gobelin:[['Snik','Glub','Rikiki','Zip','Moisi','Kroupi','Fizz','Tordu','Gnak','Pustule','Bidule','Crado','Zogzog','Pétard','Grignote'],
           ['la Fouine','Doigts-Gluants','le Recompté','Sac-à-Malices','Mord-Mollet','Demi-Portion','le Glissant','Vide-Poches','Rase-Mottes','Trois-Chaussettes','Pas-Moi']]
};
const NOMS_F={
  humain:[['Berthe','Gudule','Mahaut','Ermengarde','Pernelle','Aliénor','Brunehaut','Clotilde','Isabeau','Jehanne','Margot','Ursule','Héloïse','Frédégonde','Sidonie','Adélaïde'],
          ['la Teigne','Trois-Doigts','Sans-Peur','Pied-Carré','la Poisse','Longue-Soif','Tête-de-Bois','la Rouille','Bon-Appétit','Gros-Genou','Main-Lourde','la Tornade','Belle-Droite','la Terrible']],
  orque:[['Grasha','Mogra','Urzha','Bruga','Krâsha','Zogga','Ghorza','Shagra','Durba','Mugrette','Snarga','Rukka','Gorbha','Ulka'],
         ['Casse-Rotule','la Délicate','Mange-Arbitre','Poing-Poli','Sans-Cou','la Tendresse','Brise-Menton','Dent-Seule','Écrase-Orteil','Petit-Cœur','Mâchoire-Folle','la Poétesse']],
  nain:[['Hilda','Brunna','Dagny','Sigrun','Gudrun','Thyra','Ragna','Helga','Disa','Frida','Ingrid','Ottilia','Borghild','Kettla'],
        ['Enclume','Tresse-en-Feu','Trois-Pintes','Roule-Tonneau','la Têtue','Pied-de-Plomb','Casse-Cailloux','Mâche-Fer','la Rancune','Fond-de-Cuve','Nez-Rouge','Marteau-Doux']],
  elfe:[['Aelira','Sylvaëlle','Thirane','Faëlia','Mirelle','Ysandre','Célanthe','Liriel','Évandra','Néryssa','Lorwyn','Ithildë','Galadrie','Orophelle'],
        ['la Coiffée',"Soupir-d'Automne",'Mèche-Rebelle','qui-ne-sue-pas','Peau-de-Pêche','la Froissée','Dix-Mille-Printemps','Regard-Las','la Brise','Nez-Pincé','Pas-de-Velours']],
  elfenoir:[['Vexara','Malythe','Zyraelle','Nyssa','Ilvara','Sornetha','Velkyra','Xulia','Morvaine','Ysildra','Drazella','Kyrna','Zareka'],
            ['Sans-Pitié','Rire-Jaune',"l'Ombrageuse",'Lame-Fine','Mauvais-Œil','Cœur-Sec','la Rancunière','Sourire-en-Coin','Minuit-Passé','Main-Froide']],
  gobelin:[['Snika','Glubette','Rikika','Zippa','Moisie','Kroupette','Fizza','Tordue','Gnaka','Pustulette','Bidulette','Cradotte','Pétarde','Grignette'],
           ['la Fouine','Doigts-Gluants','la Recomptée','Sac-à-Malices','Mord-Mollet','Demi-Portion','la Glissante','Vide-Poches','Rase-Mottes','Trois-Chaussettes','Pas-Moi']]
};
function nomJoueur(race,pris,sexe){const L=sexe==='f'?NOMS_F:NOMS;for(let k=0;k<40;k++){const a=pick(L[race][0]),b=pick(L[race][1]),n=a+' '+b;if(!pris)return n;if(pris.has(n)||(k<25&&(pris.has('a:'+a)||pris.has('b:'+b))))continue;pris.add(n);pris.add('a:'+a);pris.add('b:'+b);return n}return pick(L[race][0])+(sexe==='f'?' la Seconde':' le Second')}
function nomJoueurM(race,pris){for(let k=0;k<40;k++){const a=pick(NOMS[race][0]),b=pick(NOMS[race][1]),n=a+' '+b;if(!pris)return n;if(pris.has(n)||(k<25&&(pris.has('a:'+a)||pris.has('b:'+b))))continue;pris.add(n);pris.add('a:'+a);pris.add('b:'+b);return n}return pick(NOMS[race][0])+' le Second'}

/* ---------- Valeur, salaire, potentiel ---------- */
const STATS=['f','v','t','mn'];
const somme3=p=>(p.f+p.v+p.t+p.mn)*.75; /* quatre notes ramenées à l'échelle de trois : les prix et les salaires ne bougent pas */
const marge=p=>Math.max(0,Math.round(STATS.reduce((s,k)=>s+(p.cap[k]-p[k]),0)/STATS.length));
const valeurBase=p=>somme3(p)/5+(p.sp||0)/15+(p.trait==='vedette'?4:0)+3*(p.etoiles||0)-2*(p.cicatrices||0);
const valeur=p=>Math.max(5,Math.round(valeurBase(p)+marge(p)/3));
const salaire=p=>Math.max(1,Math.round(valeurBase(p)/9*.76*(p.trait==='vedette'?1.4:1)));
const etoilesPot=m=>m<=3?1:m<=7?2:m<=12?3:m<=17?4:5;

/* tous les noms déjà portés dans la partie : deux joueurs ne doivent jamais s'appeler pareil.
   NOMS_RECENTS retient les derniers créés, pas encore rangés dans une équipe ou au marché (ils naissent souvent par paquets). */
const NOMS_RECENTS=[];
function nomsUtilises(S){
  const pris=new Set(NOMS_RECENTS);const voir=p=>{if(p&&p.nom)pris.add(p.nom)};
  (S.teams||[]).forEach(T=>{T.joueurs.forEach(voir);const I=T.gest&&T.gest.inter;if(I&&I.arrivees)I.arrivees.forEach(a=>voir(a.p))});
  (S.marche||[]).forEach(voir);if(S.coupe&&S.coupe.invites)S.coupe.invites.forEach(T=>T.joueurs.forEach(voir));
  if(S.draft&&S.draft.vivier)S.draft.vivier.forEach(voir);if(S.inter&&S.inter.arrivees)S.inter.arrivees.forEach(a=>voir(a.p));if(S.evt&&S.evt.p)voir(S.evt.p);
  return pris;
}
function nouveauJoueur(S,race,bonus,opts){
  opts=opts||{};
  const poste=opts.poste||wpick(POSTE_IDS,(x,i)=>AFF[race][i]);
  const b=RACES[race].base,m=POSTES[poste].mod;
  const mk=k=>clamp(Math.round(b[k]+m[k]+ri(-9,9)+(bonus||0)),15,92);
  const trait=opts.trait||(R()<.42?'aucun':pick(TRAIT_IDS));
  const typeP=opts.portrait||(opts.jeune&&R()<.5?'jeune':'std');
  const nF=(PORTRAITS_F[race]&&PORTRAITS_F[race].std.length)||0;
  const sexe=opts.sexe||(R()<.42*Math.min(1,nF/4)&&aPortraitF(race,typeP)?'f':'m');
  const p={id:S.nextId++,sexe,nom:nomJoueur(race,S._noms||nomsUtilises(S),sexe),race,poste,f:mk('f'),v:mk('v'),t:mk('t'),mn:mk('mn'),forme:ri(72,90),trait,tete:null,
    blesse:0,suspendu:0,mort:false,cicatrices:0,etoiles:0,titulaire:false,entr:'repos',gain:null,saisons:0,
    buts:0,victimes:0,matchs:0,pd:0,cj:0,cr:0,sb:0,sv:0,sm:0,sj:0,spd:0,sn:0,snb:0};
  if(trait==='vedette'){STATS.forEach(k=>{p[k]=clamp(p[k]+8,15,95)});p.vedV2=1}
  const mg=ri(3,20)+(trait==='vedette'?8:0)+(opts.jeune?6:0);
  p.cap={};STATS.forEach(k=>{p.cap[k]=clamp(p[k]+mg+ri(-3,3),p[k],99)});
  p.sp=clamp(ri(5,25)+Math.round((bonus||0)*1.5),0,90);p.cap.sp=clamp(p.sp+ri(30,65),p.sp,99);
  p.sal=salaire(p);
  p.tete=choisirPortrait(S,race,typeP,sexe);
  (S._sexe||(S._sexe={}))[p.nom]=sexe;
  NOMS_RECENTS.push(p.nom);if(NOMS_RECENTS.length>80)NOMS_RECENTS.shift();
  completerJoueur(p,opts,typeP);
  return p;
}

/* ---------- Staff ---------- */
const NIV=['Médiocre','Correct','Bon','Excellent','Légendaire'];
const STAFF_SAL=[1,2,4,6,9],STAFF_PRIME=[4,10,22,40,70];
const ROLES={
  prep:{nom:'Préparateur-kiné',court:'Préparateur',noms:['Mère Bobote','Gaspard Strapping','Docteur Lacatelle','Brunhilde Massepain','Frère Onguent','Ulric Boyau-Sec','Madame Pommade','Gorm le Rebouteux','Ysolde Cataplasme','Pépin Bandage','Oncle Embrocation','Hilda Genouillère']},
  chin:{nom:'Chineur de talents',court:'Chineur',noms:['Fouinard','Barnabé Œil-de-Lynx','Tante Rumeur','Zizka la Pie','Monsieur Carnet','Gilou Trois-Tavernes','Vieux Rapporteur','Ondine Lorgnette','Krob le Pisteur','Sylvain Longue-Vue','Mamie Potins','Nestor Jumelles']},
  strat:{nom:'Stratège',court:'Stratège',noms:['Professeur Tableau-Noir','Général Ganache','Maître Échiquier','Gédéon Crayon','Bertrand Schéma','Morgane la Calculeuse','Grand-Père Plan-B','Ignace Tactique','Dame Stratagème','Boris Flèches','Colonel Craie','Sire Pronostic']}
};
const ROLE_IDS=['prep','chin','strat'];
// indice 0 = poste vacant, puis Médiocre → Légendaire
const K={
  gain:[.75,.85,1,1.12,1.25,1.4], fatigue:[5,4,4,3,2,1], recup:[0,1,3,5,7,9], guerison:[0,.05,.12,.2,.3,.45], sauvetage:[0,0,0,.1,.2,.35],
  marche:[5,6,7,8,9,10], bruit:[12,10,7,4,2,0], remise:[0,0,0,5,10,15],
  fiab:[0,.55,.7,.8,.9,.97], plan:[0,1,2,3,4,6], marquage:[.88,.86,.83,.8,.77,.72]
};
const niv=(T,role)=>T&&T.staff&&T.staff[role]?T.staff[role].niv:-1;
const kk=(T,role,cle)=>K[cle][niv(T,role)+1];
function nouveauStaff(role,n){if(n===undefined)n=wpick([0,1,2,3,4],x=>[30,30,22,13,5][x]);return{role,niv:n,nom:pick(ROLES[role].noms),sal:STAFF_SAL[n],prime:STAFF_PRIME[n]}}
function candidatsStaff(){const c={};ROLE_IDS.forEach(r=>{const noms=new Set();c[r]=[];while(c[r].length<3){const s=nouveauStaff(r);if(noms.has(s.nom))continue;noms.add(s.nom);c[r].push(s)}c[r].sort((a,b)=>a.niv-b.niv)});return c}
function staffIA(){const s={};ROLE_IDS.forEach(r=>{const n=wpick([-1,0,1,2,3],x=>[2,3,3,2,1][x+1]);if(n>=0)s[r]=nouveauStaff(r,n)});return s}
function effetStaff(role,n){
  const i=n+1;
  if(role==='prep')return'Progrès ×'+String(K.gain[i]).replace('.',',')+' · '+(K.recup[i]?'+'+K.recup[i]+' de forme par semaine · ':'')+(K.guerison[i]?Math.round(K.guerison[i]*100)+' % de chances par semaine d\'écourter chaque blessure':'aucun soin')+(K.sauvetage[i]?' · '+Math.round(K.sauvetage[i]*100)+' % de chances de sauver un joueur mortellement touché':'');
  if(role==='chin')return K.marche[i]+' joueurs proposés par journée · notes estimées à ±'+K.bruit[i]+(K.remise[i]?' · '+K.remise[i]+' % de remise à la signature':'')+(n>=2?' · signale le joueur qui comble vos manques':'');
  return'Rapport d\'avant-match fiable à '+Math.round(K.fiab[i]*100)+' % · +'+K.plan[i]+' % sur le terrain si vous suivez un bon conseil · marquage plus serré'+(n>=1?' · devine les pots-de-vin adverses':'');
}

/* ---------- Sponsors ---------- */
const SPONSORS=[
  {id:'chope',nom:"Brasserie de la Chope-d'Or",fixe:5,desc:"5 po par match, et 30 po en fin de saison si vous finissez dans la première moitié du classement.",fin:(r,n)=>r<=(n||6)/2?30:0},
  {id:'forges',nom:'Forges Barbefer',fixe:3,desc:'3 po par match, et 3 po par adversaire sorti sur civière.',sorti:3},
  {id:'pompes',nom:'Pompes funèbres Lenterre & Fils',fixe:2,desc:'2 po par match, et 20 po pour chaque mort pendant vos matchs, quel que soit le camp.',mort:20},
  {id:'herbo',nom:'Herboristerie de la Mère Grise',fixe:7,desc:'7 po par match, mais 8 po de pénalité par carton rouge reçu.',rouge:-8},
  {id:'gobelin',nom:'Taverne du Gobelin Ivre',fixe:2,desc:'2 po par match, et 3 po par but marqué.',but:3},
  {id:'banque',nom:'Banque Grippesou',fixe:9,desc:'9 po par match, mais 50 po de pénalité si vous finissez dans les deux derniers.',fin:(r,n)=>r>=(n||6)-1?-50:0},
  {id:'bardes',nom:'Guilde des Bardes',fixe:2,desc:'2 po par match, et 6 po par victoire.',victoire:6},
  {id:'cirque',nom:'Cirque Brindezingue',fixe:3,desc:'3 po par match, et 4 po par carton reçu : le public adore les esclandres.',carton:4}
];
const sponsorDe=id=>SPONSORS.find(s=>s.id===id)||null;
function offresSponsor(){const l=SPONSORS.slice().sort(()=>R()-.5);return l.slice(0,3).map(s=>s.id)}

/* ---------- Clubs de l'ordinateur ---------- */
const CLUBS_IA=[
  {nom:'Les Tanneurs de Groslard',court:'Groslard',couleur:'#c8402c',races:['orque','orque','orque','orque','orque','gobelin','orque'],ia:{brutal:.7,prudent:0,pot:.15,focus:'f'},rep:"Cognent d'abord, jouent ensuite. Prévoyez des civières."},
  {nom:'La Cour de Sylvebrune',court:'Sylvebrune',couleur:'#c08a1e',races:['elfe','elfe','elfe','elfe','elfe','humain','elfe'],ia:{brutal:0,prudent:.6,pot:.05,focus:'t'},rep:'Jeu léché, chevilles fragiles. Ils détestent être bousculés.'},
  {nom:'Les Rapineurs de Trouvase',court:'Trouvase',couleur:'#e0782a',races:['gobelin','gobelin','gobelin','gobelin','gobelin','orque','gobelin'],ia:{brutal:.15,prudent:.1,pot:.35,focus:'v'},rep:"Rapides, tricheurs, et très amis avec l'arbitre."},
  {nom:'Les Enclumes de Barbefer',court:'Barbefer',couleur:'#2f6b4a',races:['nain','nain','nain','nain','nain','humain','nain'],ia:{brutal:.25,prudent:.25,pot:.1,focus:'f'},rep:'On ne passe pas. Ils ne courent pas non plus.'},
  {nom:'Les Lames de Nuitamère',court:'Nuitamère',couleur:'#6f2f6c',races:['elfenoir','elfenoir','elfenoir','elfenoir','elfenoir','gobelin','elfenoir'],ia:{brutal:.45,prudent:0,pot:.2,focus:'v'},rep:"Ils choisissent leur victime avant le coup d'envoi."}
];
const POSTES_DEPART=['Cogneur','Cogneur','Trois-quarts','Trois-quarts','Coureur','Coureur','Passeur',null,null];
/* le modèle d'un club de l'ordinateur (en solo : le club n° i suit le modèle i-1 ; en ligue : T.arch) */
const archDe=T=>CLUBS_IA[T.arch!==undefined?T.arch:T.id-1];
const IA_NEUTRE={brutal:.2,prudent:.2,pot:.1,focus:'v'};

/* ---------- Plans de jeu : chacun en contre un autre (cycle) ---------- */
const TACTIQUES={
  equilibre:{nom:'Équilibré',court:'Équilibré',desc:"Aucun risque, aucun bonus. Ne contre rien et n'est contré par rien.",bat:null},
  sol:{nom:'Jeu au sol',court:'Au sol',desc:'+5 % en attaque si vous alignez 2 coureurs ou plus ; les coureurs tirent plus souvent.',att:1.05,cond:x=>x.Coureur>=2,bat:'contre'},
  aerien:{nom:'Jeu aérien',court:'Aérien',desc:'+5 % en attaque si vous alignez un passeur ; plus de passes décisives.',att:1.05,cond:x=>x.Passeur>=1,bat:'mur'},
  pressing:{nom:'Pressing',court:'Pressing',desc:'+4 % en attaque et en défense, mais vos joueurs finissent le match épuisés.',att:1.04,def:1.04,bat:'aerien'},
  mur:{nom:'Mur défensif',court:'Mur',desc:'+10 % en défense, −8 % en attaque. Idéal pour tenir un plus fort que soi.',att:.92,def:1.10,bat:'sol'},
  contre:{nom:'Contre-attaque',court:'Contre',desc:'+3 % en défense, −2 % en attaque : on attend la faute et on file.',att:.98,def:1.03,bat:'pressing'}
};
const TACTIQUE_IDS=Object.keys(TACTIQUES);
const CONTRE_BONUS=1.07;
const contreDe=t=>TACTIQUE_IDS.find(k=>TACTIQUES[k].bat===t)||'equilibre';

/* ---------- États d'équipe ---------- */
const ETATS=[
  {id:'pur',nom:'Sang pur',cond:'7 titulaires du même peuple',effet:'+8 % en attaque et en défense',att:1.08,def:1.08,test:x=>x.max>=7},
  {id:'clan',nom:'Esprit de clan',cond:'5 ou 6 titulaires du même peuple',effet:'+4 % en attaque et en défense',att:1.04,def:1.04,test:x=>x.max===5||x.max===6},
  {id:'bric',nom:'Bric et broc',cond:'5 peuples différents ou plus sur le terrain',effet:"+7 % en attaque : personne ne sait ce qu'ils vont faire",att:1.07,test:x=>x.nb>=5},
  {id:'mur',nom:'Mur de brutes',cond:'3 cogneurs titulaires ou plus',effet:'+8 % en défense, charges plus fréquentes',def:1.08,cast:1.12,test:x=>x.p.Cogneur>=3},
  {id:'feu',nom:'Jambes de feu',cond:'3 coureurs titulaires ou plus',effet:'+7 % en attaque',att:1.07,test:x=>x.p.Coureur>=3},
  {id:'beliers',nom:'Ligne de béliers',cond:'3 trois-quarts titulaires ou plus',effet:'+3 % en attaque et en défense',att:1.03,def:1.03,test:x=>x.p['Trois-quarts']>=3},
  {id:'leche',nom:'Jeu léché',cond:'2 passeurs titulaires ou plus',effet:'+4 % en attaque et en défense',att:1.04,def:1.04,test:x=>x.p.Passeur>=2},
  {id:'soude',nom:'Vestiaire soudé',cond:"les 7 mêmes titulaires qu'au match précédent",effet:'+3 % en attaque et en défense',att:1.03,def:1.03,test:x=>x.memes},
  {id:'horde',nom:'La Horde',cond:'un orque et un gobelin titulaires',effet:'+5 % en attaque : les gobelins filent dans le sillage des charges orques',att:1.05,test:x=>x.r.orque&&x.r.gobelin},
  {id:'alliance',nom:'Vieille alliance',cond:'un humain et un nain titulaires',effet:'+5 % en défense : ils ont déjà tenu des remparts ensemble',def:1.05,test:x=>x.r.humain&&x.r.nain},
  {id:'ouest',nom:"Pacte de l'Ouest",cond:'un humain et un elfe titulaires',effet:'+4 % en attaque : les elfes lancent, les humains suivent',att:1.04,test:x=>x.r.humain&&x.r.elfe},
  {id:'tordus',nom:'Coups tordus',cond:'un elfe noir et un gobelin titulaires',effet:"+3 % en attaque, et l'arbitre voit moins leurs fautes",att:1.03,discret:true,test:x=>x.r.elfenoir&&x.r.gobelin},
  {id:'rancune',nom:'Vieille rancune',cond:'un elfe et un elfe noir alignés ensemble',effet:'−5 % en défense : ils refusent de se couvrir',def:.95,mal:true,rival:true,test:x=>x.r.elfe&&x.r.elfenoir},
  {id:'montagnes',nom:'Guerre des montagnes',cond:'un nain et un orque alignés ensemble',effet:"−5 % en attaque : ils se font des croche-pieds",att:.95,mal:true,rival:true,test:x=>x.r.nain&&x.r.orque},
  {id:'mine',nom:'Dette de la mine',cond:'un nain et un gobelin alignés ensemble',effet:'−4 % en défense : le nain surveille ses poches au lieu du ballon',def:.96,mal:true,rival:true,test:x=>x.r.nain&&x.r.gobelin},
  {id:'mediateur',nom:'Médiateur',cond:'un humain titulaire alors qu\'une rivalité est active',effet:"+3 % partout : l'humain calme les esprits, la rivalité pèse moitié moins",att:1.03,def:1.03,test:x=>x.r.humain&&((x.r.elfe&&x.r.elfenoir)||(x.r.nain&&x.r.orque)||(x.r.nain&&x.r.gobelin))},
  {id:'sanspas',nom:'Sans passeur',cond:'aucun passeur titulaire',effet:"−8 % en attaque : personne pour distribuer",att:.92,mal:true,test:x=>!x.p.Passeur},
  {id:'sanscog',nom:'Sans cogneur',cond:'aucun cogneur titulaire',effet:'−10 % en défense : la porte est ouverte',def:.9,mal:true,test:x=>!x.p.Cogneur},
  {id:'sanstq',nom:'Sans trois-quarts',cond:'aucun trois-quarts titulaire',effet:"−5 % en attaque et en défense : personne pour faire le lien",att:.95,def:.95,mal:true,test:x=>!x.p['Trois-quarts']},
  {id:'sanscou',nom:'Sans coureur',cond:'aucun coureur titulaire',effet:'−8 % en attaque : personne pour finir les actions',att:.92,mal:true,test:x=>!x.p.Coureur}
];
function compterPostes(P){const p={Cogneur:0,'Trois-quarts':0,Coureur:0,Passeur:0};P.forEach(j=>{if(!j.temp)p[j.poste]++});return p}
function etatsDe(T,P){
  const r={};P.forEach(j=>{if(j.temp)return;r[j.race]=(r[j.race]||0)+1});
  const vals=Object.values(r);const ids=P.map(j=>j.id).sort((a,b)=>a-b).join(',');
  const x={r,p:compterPostes(P),max:Math.max(0,...vals),nb:vals.length,memes:P.length===NB_TIT&&!P.some(j=>j.temp)&&T.dernier===ids};
  return ETATS.filter(e=>e.test(x));
}
const dispo=p=>!p.mort&&p.blesse===0&&!p.suspendu;
const puissance=p=>somme3(p)*(.8+.2*p.forme/100);
function onzeDe(T){
  const d=T.joueurs.filter(dispo);
  let tit=d.filter(p=>p.titulaire).sort((a,b)=>puissance(b)-puissance(a)).slice(0,NB_TIT);
  let reste=d.filter(p=>!tit.includes(p));
  if(!estH(T))reste.sort((a,b)=>puissance(b)-puissance(a));
  /* on complète d'abord avec ceux qu'on n'a pas volontairement mis au banc */
  else reste.sort((a,b)=>(a.auBanc?1:0)-(b.auBanc?1:0));
  while(tit.length<NB_TIT&&reste.length)tit.push(reste.shift());
  return{tit,reste};
}
function choisirTitulaires(T){T.joueurs.forEach(p=>{delete p.auBanc}); // l'ordinateur : les meilleurs, en gardant au moins un joueur de chaque poste si possible
  const d=T.joueurs.filter(dispo).sort((a,b)=>puissance(b)-puissance(a));
  T.joueurs.forEach(p=>p.titulaire=false);
  const tit=[];PLACES.forEach(po=>{const x=d.find(p=>p.poste===po&&!tit.includes(p));if(x)tit.push(x)});
  d.forEach(p=>{if(tit.length<NB_TIT&&!tit.includes(p))tit.push(p)});
  tit.forEach(p=>p.titulaire=true);
}
function postesManquants(T){const n=compterPostes(T.joueurs.filter(p=>!p.mort));return POSTE_IDS.filter(po=>n[po]<MIN_POSTE[po])}
/* ---------- Portraits : chaque visage n'est porté que par un seul joueur, tant que la réserve le permet ---------- */
const PORTRAITS={"orque":{"std":["orque0","orque1","orque2","orque3","orque4","orque5","orque6","orque_s0","orque_s1","orque_s2","orque_s3","orque_s4","orque_s5","orque_s6","orque_s7","orque_s8"],"jeune":["orque_j0","orque_j1","orque_j2","orque_j3"],"veteran":["orque_v0","orque_v1","orque_v2","orque_v3","orque_v4"]},"humain":{"std":["humain0","humain1","humain2","humain3","humain4","humain5","humain6","humain_s0","humain_s1","humain_s2","humain_s3","humain_s4","humain_s5","humain_s6"],"jeune":["humain_j0","humain_j2"],"veteran":["humain_v0","humain_v1","humain_v2","humain_v3"]},"nain":{"std":["nain0","nain1","nain2","nain3","nain4","nain5","nain6","nain_s0","nain_s1","nain_s2","nain_s3","nain_s4","nain_s5","nain_s6","nain_s7","nain_s8"],"jeune":["nain_j0","nain_j1","nain_j2","nain_j3"],"veteran":["nain_v0","nain_v1","nain_v2","nain_v3"]},"elfe":{"std":["elfe0","elfe1","elfe2","elfe3","elfe4","elfe5","elfe_s0","elfe_s1","elfe_s2","elfe_s3","elfe_s4","elfe_s5"],"jeune":["elfe_j0","elfe_j1","elfe_j2"],"veteran":["elfe_v0","elfe_v1","elfe_v2","elfe_v3"]},"elfenoir":{"std":["elfenoir0","elfenoir1","elfenoir2","elfenoir3","elfenoir4","elfenoir5","elfenoir6","elfenoir_s0","elfenoir_s1","elfenoir_s2","elfenoir_s3","elfenoir_s4","elfenoir_s5","elfenoir_s6","elfenoir_s7","elfenoir_s8"],"jeune":[],"veteran":["elfenoir_v0"]},"gobelin":{"std":["gobelin0","gobelin1","gobelin2","gobelin3","gobelin4","gobelin5","gobelin6","gobelin_s0","gobelin_s1","gobelin_s2","gobelin_s3","gobelin_s4","gobelin_s5","gobelin_s6","gobelin_s7"],"jeune":["gobelin_j0","gobelin_j1","gobelin_j2","gobelin_j3"],"veteran":["gobelin_v0"]}};
function portraitsPris(S){
  const actifs={},anciens={};
  (S.teams||[]).forEach(T=>T.joueurs.forEach(p=>{if(typeof p.tete==='string')actifs[p.tete]=(actifs[p.tete]||0)+1}));
  (S.marche||[]).forEach(p=>{if(typeof p.tete==='string')actifs[p.tete]=(actifs[p.tete]||0)+1});
  if(S.evt&&S.evt.p&&typeof S.evt.p.tete==='string')actifs[S.evt.p.tete]=1;
  (S._recents||[]).forEach(k=>{actifs[k]=(actifs[k]||0)+1}); /* visages tout juste distribués (joueurs pas encore rangés dans une liste) */
  (S.fame||[]).concat(S.morts||[]).forEach(f=>{if(typeof f.tete==='string')anciens[f.tete]=1});
  const miens={};((S.teams||[])[0]||{joueurs:[]}).joueurs.forEach(p=>{if(typeof p.tete==='string')miens[p.tete]=1});
  return{actifs,anciens,miens};
}
const PORTRAITS_F={"orque":{"std":["orque_fs0","orque_fs1","orque_fs2","orque_fs3","orque_fs4"],"jeune":["orque_fj0"],"veteran":["orque_fv0","orque_fv1","orque_fv2"]},"humain":{"std":["humain_fs0","humain_fs1","humain_fs2","humain_fs3","humain_fs4"],"jeune":["humain_fj0"],"veteran":["humain_fv0","humain_fv1","humain_fv2","humain_fv3"]},"nain":{"std":["nain_fs0","nain_fs1","nain_fs2"],"jeune":["nain_fj0","nain_fj1"],"veteran":["nain_fv0","nain_fv1"]},"elfe":{"std":["elfe_fs0","elfe_fs1","elfe_fs2","elfe_fs3","elfe_fs4"],"jeune":["elfe_fj0"],"veteran":["elfe_fv0","elfe_fv1","elfe_fv2","elfe_fv3"]},"elfenoir":{"std":["elfenoir_fs0","elfenoir_fs1","elfenoir_fs2","elfenoir_fs3","elfenoir_fs4"],"jeune":["elfenoir_fj0"],"veteran":["elfenoir_fv0","elfenoir_fv1","elfenoir_fv2","elfenoir_fv3"]},"gobelin":{"std":["gobelin_fs0","gobelin_fs1","gobelin_fs2","gobelin_fs3","gobelin_fs4"],"jeune":["gobelin_fj0","gobelin_fj1"],"veteran":["gobelin_fv0","gobelin_fv1","gobelin_fv2","gobelin_fv3"]}};
function aPortraitF(race,type){const R0=PORTRAITS_F[race];return!!(R0&&((R0[type]&&R0[type].length)||(type==='std'&&R0.std.length)))}
function choisirPortrait(S,race,type,sexe){
  const R0=(sexe==='f'&&PORTRAITS_F[race]&&PORTRAITS_F[race].std.length?PORTRAITS_F[race]:PORTRAITS[race])||PORTRAITS.humain;let pool=(R0[type]&&R0[type].length)?R0[type]:R0.std;
  const{actifs,anciens,miens}=portraitsPris(S);
  const score=k=>(actifs[k]||0)*10+(miens[k]?5:0)+(anciens[k]?1:0); /* en dernier recours, on évite surtout les visages de VOTRE équipe */
  if(Math.min(...pool.map(score))>=10){const tous=[].concat(R0.std||[],R0.jeune||[],type==='veteran'?(R0.veteran||[]):[]);if(Math.min(...tous.map(score))<10)pool=tous} /* plutôt un visage d'une autre catégorie qu'un doublon */
  const m=Math.min(...pool.map(score));
  const k=pick(pool.filter(k=>score(k)===m));(S._recents||(S._recents=[])).push(k);if(S._recents.length>24)S._recents.shift();return k;
}
function varierTetes(T,p){
  const S=window_S();if(!S)return;
  const autres=j=>{let n=0;const vu=new Set([j]);const c=x=>{if(x&&!vu.has(x)&&x.id!==j.id&&x.tete===j.tete)n++;if(x)vu.add(x)};(S.teams||[]).forEach(T=>T.joueurs.forEach(c));(S.marche||[]).forEach(c);if(S.evt&&S.evt.p)c(S.evt.p);return n};
  /* on ne change le visage d'un joueur que si quelqu'un d'AUTRE le porte déjà (un joueur acheté garde le sien) */
  const tenants=j=>{const out=[];(S.teams||[]).forEach(T=>T.joueurs.forEach(x=>{if(x!==j&&x.id!==j.id&&x.tete===j.tete)out.push([x,T.id])}));(S.marche||[]).forEach(x=>{if(x!==j&&x.id!==j.id&&x.tete===j.tete)out.push([x,-1])});return out};
  if(p&&T&&estH(T)&&typeof p.tete==='string'&&!p.leg){const t=tenants(p);if(t.length&&t.every(([x,id])=>!estHId(S,id)&&!x.leg)){t.forEach(([x])=>{x.tete=null;x.tete=choisirPortrait(S,x.race,x.veteran?'veteran':x.jeune&&x.saisons===0?'jeune':'std',x.sexe)});return}}
  const faire=j=>{if(j.leg)return;if(typeof j.tete==='string'&&autres(j)===0)return;
    const old=j.tete;j.tete=null;j.tete=choisirPortrait(S,j.race,j.veteran?'veteran':j.jeune&&j.saisons===0?'jeune':'std',j.sexe);};
  if(p)faire(p);else T.joueurs.forEach(faire);
}
let _S=null;const window_S=()=>_S;function courant(S){_S=S;return S}


/* ---------- Calendrier ---------- */
function calendrier(n){
  const ids=[...Array(n).keys()];const fixe=ids.shift();for(let i=ids.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}
  const aller=[];
  for(let r=0;r<n-1;r++){const tour=[fixe,...ids];const m=[];for(let i=0;i<n/2;i++){const a=tour[i],b=tour[n-1-i];m.push(r%2?[b,a]:[a,b])}aller.push(m);ids.unshift(ids.pop())}
  return aller.concat(aller.map(m=>m.map(([a,b])=>[b,a])));
}
/* en ligue, le commissaire peut choisir une saison en matchs aller simples */
function calendrierSaison(S){const c=calendrier(S.teams.length);return S.multi&&S.reglages&&S.reglages.allerSimple?c.slice(0,S.teams.length-1):c}
function remiseAZero(T){Object.assign(T,{pts:0,j:0,g:0,n:0,p:0,bp:0,bc:0})}
function classement(S){return S.teams.slice().sort((a,b)=>b.pts-a.pts||(b.bp-b.bc)-(a.bp-a.bc)||b.bp-a.bp||a.id-b.id)}
const rangDe=(S,id)=>classement(S).findIndex(T=>T.id===id)+1;
function tousLesJoueurs(S){return S.teams.flatMap(T=>T.joueurs.map(p=>({p,T})))}

/* ---------- Nouvelle partie ---------- */
/* un club de l'ordinateur recrute une légende : elle remplace son joueur le plus faible au même poste */
function legendeIA(S){
  const T=pick(clubsIA(S));const p=tirerLegende(S,l=>archDe(T).races.includes(l.race));if(!p)return null;
  const meme=T.joueurs.filter(x=>x.poste===p.poste&&!x.leg).sort((a,b)=>puissance(a)-puissance(b))[0];
  if(meme&&T.joueurs.length>=EFF_IA-1)T.joueurs.splice(T.joueurs.indexOf(meme),1);
  T.joueurs.push(p);return{T,p};
}
/* un club de l'ordinateur démarre avec 9 joueurs : ses 7 peuples d'origine, placés pour que ses peuples favoris tiennent leurs postes de prédilection */
function racesDepart(c){const r=c.races;return[r[0],r[1],r[5%r.length],r[6%r.length],r[2],r[3],r[4],r[0],r[2]]}
function nouvellePartie(nomClub,race){
  const S={v:3,nextId:1,saison:1,jour:0,fini:false,phase:'saison',teams:[],gazettes:[],marche:[],morts:[],fame:[],vus:[],histOr:[],
    choix:{consigne:'normal',pot:false,marque:null,tactique:'equilibre'},sponsor:null,offresSponsor:offresSponsor(),candidats:candidatsStaff(),inter:null,opts:null,rapport:null};
  S._noms=new Set();
  const moi={id:0,nom:nomClub,court:nomClub,couleur:'#2f5fa8',or:50,pop:35,joueurs:[],dernier:'',staff:{},liste:[]};
  const autres=RACE_IDS.filter(r=>r!==race);
  [race,race,race,race,race,race,race,pick(autres),pick(autres)].forEach((r,i)=>moi.joueurs.push(nouveauJoueur(S,r,0,{poste:POSTES_DEPART[i]})));
  remiseAZero(moi);S.teams.push(moi);
  CLUBS_IA.forEach((c,i)=>{
    const T={id:i+1,nom:c.nom,court:c.court,couleur:c.couleur,ia:c.ia,rep:c.rep,or:0,pop:40,joueurs:[],dernier:'',staff:staffIA(),liste:[]};
    racesDepart(c).forEach((r,k)=>T.joueurs.push(nouveauJoueur(S,r,ri(-4,-1),{poste:POSTES_DEPART[k]})));
    remiseAZero(T);S.teams.push(T);
  });
  courant(S);if(R()<.5)legendeIA(S);S.teams.forEach(T=>{varierTetes(T);choisirTitulaires(T)});
  S.calendrier=calendrier(6);S.div=4;S.divMax=4;
  nouvelleCoupe(S);
  S.marche=nouveauMarche(S);
  delete S._noms;
  preparerJournee(S);
  return S;
}

/* ---------- Marché des agents libres ---------- */
function jeuneDuPays(S,race){
  const p=nouveauJoueur(S,race||pick(RACE_IDS),-9,{jeune:true,portrait:'jeune'});
  STATS.forEach(k=>{p.cap[k]=clamp(p.cap[k]+8,p[k],95)});p.jeune=true;p.sal=1;p.gratuit=true;return p;
}
function nouveauMarche(S){
  const T=S.teams[0];const n=kk(T,'chin','marche');const nv=niv(T,'chin');const manque=postesManquants(T);const out=[];
  for(let i=0;i<n;i++){
    const poste=i<4?POSTE_IDS[i]:(nv>=1&&manque.length&&R()<.6?pick(manque):pick(POSTE_IDS));
    out.push(nouveauJoueur(S,pick(RACE_IDS),ri(-3,3)+Math.max(0,nv)+divDe(S).marche,{poste,jeune:R()<.25}));
  }
  /* rarement, une légende se présente au marché */
  if(R()<.06+.02*Math.max(0,nv)){const L=tirerLegende(S);if(L)out.push(L)}
  const b=kk(T,'chin','bruit');
  out.forEach(p=>{p.vu={};STATS.forEach(k=>{p.vu[k]=clamp(p[k]+ri(-b,b),10,99)});p.vu.m=Math.max(0,marge(p)+ri(-Math.ceil(b/2),Math.ceil(b/2)))});
  /* le centre de formation propose toujours un jeune gratuit quand l'effectif est court */
  if(T.joueurs.length<EFF_IA){const y=jeuneDuPays(S,T.joueurs.length?pick(T.joueurs).race:null);y.vu={f:y.f,v:y.v,t:y.t,mn:y.mn,m:marge(y)};out.unshift(y)}
  if(nv>=1){
    const cible=manque.length?out.filter(p=>manque.includes(p.poste)):out;
    const best=cible.filter(p=>!p.gratuit).sort((a,b)=>(b.f+b.v+b.t+marge(b)*2)/valeur(b)-(a.f+a.v+a.t+marge(a)*2)/valeur(a))[0];
    if(best)best.coeur=true;
  }
  return out;
}
const prixMarche=(S,p)=>p.gratuit?0:Math.max(5,Math.round(valeur(p)*(p.leg?1.6:1)*(1-kk(S.teams[0],'chin','remise')/100)));

/* ---------- Entraînement ---------- */
const ENTR={repos:{nom:'Repos',court:'Repos'},f:{nom:'Force',court:'FOR'},v:{nom:'Vitesse',court:'VIT'},t:{nom:'Passe',court:'PAS'},mn:{nom:'Mains',court:'MAI'},sp:{nom:'Spécialité',court:'SPÉ'}};
function entrainer(T){
  const g=kk(T,'prep','gain')*[1,1.06,1.12,1.2][nivStade(T,'terrain')],fat=kk(T,'prep','fatigue'),rec=kk(T,'prep','recup'),gue=Math.min(.8,kk(T,'prep','guerison')+[0,.1,.2,.3][nivStade(T,'infirmerie')]);
  T.joueurs.forEach(p=>{
    if(p.mort)return;
    p.gain=null;
    p.forme=clamp(p.forme+10+rec,5,100);
    if(p.blesse>0){if(gue&&R()<gue){p.blesse--;p.soigne=true}return}
    const e=estH(T)?p.entr:(p.forme<58?'repos':iaEntrPour(p));
    if(e==='repos'||!e){p.forme=clamp(p.forme+18,5,100);return}
    p.forme=clamp(p.forme-fat,5,100);
    const reste=p.cap[e]-p[e];
    let gain=reste>0?Math.max(1,Math.min(5,Math.round(reste/4*U(.6,1.2)*g))):0;
    if(gain&&p.trait==='vedette')gain=Math.round(gain*1.25+(R()<.25?1:0));
    if(gain&&p.race==='humain'&&R()<.5)gain++;
    gain=Math.min(gain,reste);
    const pa=progresAge(T,p,gain,reste);gain=pa.gain;
    p[e]+=gain;p.gain={k:e,n:gain};if(pa.mentor)p.gain.mentor=pa.mentor;
    if(estH(T)&&p[e]>=p.cap[e]){const n=conseilEntr(p);p.gain.max={de:e,vers:n};p.entr=n}
    if(e==='sp'&&p.race==='humain'){let n=0;STATS.forEach(k=>{if(p[k]<p.cap[k]&&R()<.35+p.sp/200){p[k]++;n++}});if(n)p.gain.tout=n}
  });
}
const STAT_POSTE={Cogneur:'f','Trois-quarts':'f',Coureur:'v',Passeur:'t'};
function iaEntrPour(p){const r=R();const k=r<.5?STAT_POSTE[p.poste]:r<.75?'sp':pick(STATS);return p[k]>=p.cap[k]?pick(STATS.filter(x=>p[x]<p.cap[x]).concat(['sp'])):k}
function iaEntrainement(T){const r=R();return r<.5?T.ia.focus:r<.75?'sp':pick(STATS)}

/* ---------- Préparation d'une journée : intentions adverses et rapport du stratège ---------- */
function prochainMatch(S,T){
  if(S.fini||S.phase!=='saison')return null;
  const id=T?T.id:0;
  const m=S.calendrier[S.jour].find(([h,a])=>h===id||a===id);const dom=m[0]===id;
  return{adv:S.teams[dom?m[1]:m[0]],dom};
}
function optsIA(S,id){
  const ia=S.teams[id].ia||IA_NEUTRE;const r=R();
  const cp=compterPostes(onzeDe(S.teams[id]).tit);
  const w={equilibre:2,sol:cp.Coureur>=2?2.5:.3,aerien:cp.Passeur>=1?2:.3,pressing:1.2,mur:cp.Cogneur>=3?2:1,contre:1.2};
  return{consigne:r<ia.brutal?'brutal':r<ia.brutal+ia.prudent?'prudent':'normal',pot:R()<ia.pot,marqueAuto:R()<.35,tactique:wpick(TACTIQUE_IDS,k=>w[k])};
}
function menaceDe(T){const{tit}=onzeDe(T);return tit.filter(p=>p.poste!=='Cogneur').sort((a,b)=>(b.v+2*b.mn)-(a.v+2*a.mn))[0]||tit[0]||null}
function conseilIdeal(S,adv,o,T){
  const moi=moiDe(S,T);const a=onzeDe(moi).tit,b=onzeDe(adv).tit;
  const pm=a.reduce((s,p)=>s+puissance(p),0),pa=b.reduce((s,p)=>s+puissance(p),0)||1;
  const fragiles=a.filter(p=>p.race==='elfe'||p.trait==='verre').length;
  if(o.consigne==='brutal'&&fragiles>=2)return'prudent';
  if(pm<pa*.93)return'brutal';
  if(pm>pa*1.07)return'normal';
  return o.consigne==='prudent'?'brutal':'normal';
}
/* ---------- Prêt d'urgence : quand il vous reste moins de 7 joueurs valides ---------- */
const PRIX_PRET=6;
function besoinPret(S,M){const moi=moiDe(S,M);return Math.max(0,NB_TIT-moi.joueurs.filter(dispo).length)}
function offresPret(S,M){
  if(S.phase!=='saison'||S.fini)return[];
  const g=G(S,moiDe(S,M));
  if(g.prets&&g.prets.jour===S.jour&&g.prets.saison===S.saison)return g.prets.liste;
  let adv=null;try{adv=prochainMatch(S,M).adv}catch(e){}
  let clubs=clubsIA(S).filter(T=>T!==adv);const D=typeof divDe==='function'?divDe(S):{ia:[-4,-1],argent:1};
  /* en ligue, il peut ne rester aucun club de l'ordinateur : les prêtés viennent alors des clubs des tavernes */
  if(!clubs.length)clubs=CLUBS_IA.map((c,i)=>({court:c.court,nom:c.nom,couleur:c.couleur,arch:i}));
  const liste=POSTE_IDS.map(po=>{const T=pick(clubs);const p=nouveauJoueur(S,pick(archDe(T).races),Math.round((D.ia[0]+D.ia[1])/2)-3,{poste:po});
    p.pret={club:T.court,clubNom:T.nom,couleur:T.couleur};p.prix=Math.round(PRIX_PRET*(D.argent||1));p.sal=0;return p});
  g.prets={jour:S.jour,saison:S.saison,liste};return liste;
}
function emprunterJoueur(S,id,M){
  const moi=moiDe(S,M);const L=offresPret(S,moi);const p=L.find(x=>x.id===id);
  if(!p)return'Ce joueur n\'est plus disponible.';
  if(!besoinPret(S,moi))return'Vous avez déjà 7 joueurs valides : pas de prêt d\'urgence.';
  if(moi.or<p.prix)return'Il vous faut '+p.prix+' po.';
  moi.or-=p.prix;p.titulaire=true;moi.joueurs.push(p);varierTetes(moi,p);G(S,moi).prets.liste=L.filter(x=>x!==p);
  return null;
}
function preparerJournee(S){
  const H=humains(S);
  S.opts={};H.forEach(T=>{G(S,T).rapport=null});
  if(S.fini||S.phase!=='saison')return;
  H.forEach(T=>tirerEvenement(S,T));
  S.calendrier[S.jour].forEach(m=>m.forEach(id=>{if(!estH(S.teams[id]))S.opts[id]=optsIA(S,id)}));
  S.teams.forEach(T=>{if(!estH(T))T.iaEntr=iaEntrainement(T)});
  H.forEach(T=>preparerRapport(S,T));
}
/* le rapport du stratège d'un club humain sur son prochain adversaire */
function preparerRapport(S,T){
  const g=G(S,T);
  const pm=prochainMatch(S,T);if(g.choix.marque&&!pm.adv.joueurs.some(p=>p.id===g.choix.marque))g.choix.marque=null;
  const n=niv(T,'strat');if(n<0)return;
  const adv=pm.adv,o=S.opts[adv.id];const fiable=R()<K.fiab[n+1];
  const autres=['prudent','normal','brutal'];
  if(!o){/* adversaire humain : ses choix ne sont pas encore faits. Le stratège juge le rapport de forces et désigne la menace, sans rien prédire. */
    const vrai=conseilIdeal(S,adv,{consigne:'normal'},T);const menace=menaceDe(adv);
    g.rapport={adv:adv.id,niv:n,fiable,conseil:fiable?vrai:pick(autres.filter(x=>x!==vrai)),prediction:null,pot:null,menace:menace?menace.id:null,humain:true,tacPrediction:null,tacConseil:null};
    return;
  }
  const vrai=conseilIdeal(S,adv,o,T);
  const menace=menaceDe(adv);
  g.rapport={adv:adv.id,niv:n,fiable,conseil:fiable?vrai:pick(autres.filter(x=>x!==vrai)),prediction:fiable?o.consigne:pick(autres.filter(x=>x!==o.consigne)),
    pot:n>=1?(fiable?o.pot:!o.pot):null,menace:menace?menace.id:null};
  const tacP=fiable?o.tactique:pick(TACTIQUE_IDS.filter(x=>x!==o.tactique&&x!=='equilibre'));
  g.rapport.tacPrediction=tacP;g.rapport.tacConseil=contreDe(tacP);
}

/* ---------- Match ---------- */
const eff=(p,k)=>p[k]*(.8+.2*p.forme/100)*(p._marque||1)*(p._jour||1);
/* la place occupée pendant le match (sinon, le poste du joueur) */
const pj=p=>p._pl||p.poste;
function apport(p,place){
  const f=eff(p,'f'),v=eff(p,'v'),t=eff(p,'t'),mn=eff(p,'mn');place=place||pj(p);
  if(place==='Cogneur')return{a:(v+mn)/2*.55,d:(2*f+v)/3};
  if(place==='Coureur')return{a:(2*v+mn)/3,d:(f+2*v)/3*.7};
  if(place==='Trois-quarts')return{a:(f+v+mn)/3*.8,d:(f+v)/2*.85};
  return{a:(v+3*t)/4,d:(f+v)/2*.7};
}
/* qui joue où : on essaie toutes les répartitions des 7 places et on garde celle où l'équipe est la plus forte */
function placer(tit){
  /* à valeur presque égale, chacun reste à son poste : ce petit coup de pouce ne sert qu'à choisir les places, il ne change rien aux notes en match */
  const n=tit.length,val=tit.map(p=>{const o={};POSTE_IDS.forEach(po=>{const x=apport(p,po);o[po]=x.a+x.d+(po===p.poste?4:0)});return o});
  const libre={};PLACES.forEach(po=>{libre[po]=(libre[po]||0)+1});
  let best=-1,sol=[];const cur=[];
  (function aller(i,tot){
    if(i===n){if(tot>best+1e-9){best=tot;sol=cur.slice()}return}
    let pose=false;
    for(const po of POSTE_IDS){if(!libre[po])continue;pose=true;libre[po]--;cur[i]=po;aller(i+1,tot+val[i][po]);libre[po]++}
    if(!pose){cur[i]=tit[i].poste;aller(i+1,tot)}
  })(0,0);
  return sol;
}
/* la place prévue de chaque titulaire, pour l'afficher au vestiaire */
function placesPrevues(T){const{tit}=onzeDe(T);const sol=placer(tit);const out={};tit.forEach((p,i)=>{out[p.id]=sol[i]});return out}
/* ---------- Ce qui compte pour chaque poste (tiré directement des formules ci-dessus) ---------- */
const POIDS_POSTE={Cogneur:{f:.667,v:.608,mn:.275,t:0},'Trois-quarts':{f:.692,v:.692,mn:.267,t:0},Coureur:{v:1.133,mn:.333,f:.233,t:0},Passeur:{t:.75,v:.6,f:.35,mn:0}};
const ORDRE_POSTE={Cogneur:['f','v','mn','t'],'Trois-quarts':['f','v','mn','t'],Coureur:['v','mn','f','t'],Passeur:['t','v','f','mn']};
const rangStat=(p,k)=>{const w=POIDS_POSTE[p.poste],o=ORDRE_POSTE[p.poste];return!w[k]?4:w[k]>=w[o[0]]-.001?1:o.indexOf(k)+1}; /* 1 principale, 2 secondaire, 3 moins importante, 4 ne sert pas à ce poste */
function notePoste(p,vu,place){const w=POIDS_POSTE[place||p.poste],s=vu||p;let n=0,d=0;STATS.forEach(k=>{n+=w[k]*s[k];d+=w[k]});return Math.round(n/d)}
function conseilEntr(p){
  const w=POIDS_POSTE[p.poste];let best=null,sc=0;
  STATS.forEach(k=>{const reste=p.cap[k]-p[k];const v=w[k]*Math.min(reste,8);if(reste>0&&v>sc){sc=v;best=k}});
  if(best&&sc>=.6)return best;
  if((p.sp||0)<(p.cap.sp||0))return 'sp';
  return best||'repos';
}
function stagiaire(){return{id:-ri(1,1e6),nom:'un stagiaire',race:'humain',poste:'Coureur',f:26,v:26,t:26,mn:26,forme:80,trait:'aucun',blesse:0,mort:false,temp:true,cicatrices:0,buts:0,victimes:0,matchs:0}}
function camp(T,opt,dom){
  const{tit,reste}=onzeDe(T);
  tit.concat(reste).forEach(p=>{p._jour=formeDuJour(p)});
  let stag=0;while(tit.length<NB_TIT){tit.push(stagiaire());stag++}
  const sol=placer(tit);tit.forEach((p,i)=>{p._pl=sol[i]});
  const et=etatsDe(T,tit);
  const m=k=>et.reduce((x,e)=>x*(e[k]||1),1);
  const tac=TACTIQUES[opt.tactique]?opt.tactique:'equilibre';
  return{T,dom,ordres:{},libres:[],pression:!!opt.pression,tactique:tac,tacMult:1,consigne:opt.consigne,pot:opt.pot,plan:opt.plan||1,discret:et.some(e=>e.discret),marqueur:opt.marque?.97:1,terrain:tit,banc:reste,joue:new Set(tit),avertis:new Set(),score:0,stag,
    etats:et.map(e=>e.nom),etatsMal:et.filter(e=>e.mal).map(e=>e.nom),mAtt:m('att'),mDef:m('def'),mCast:m('cast'),depart:tit.map(p=>p.id).sort((a,b)=>a-b).join(','),
    st:{occ:0,tirs:0,coups:0,blInfl:0,blSubies:0,expuls:0,jaunes:0,aveugle:0,scandale:false,penalty:0,formeMoy:Math.round(tit.reduce((s,p)=>s+p.forme,0)/NB_TIT),postes:compterPostes(tit)}};
}
function notes(c){
  const P=c.terrain,n=P.length;if(!n)return{att:1,def:1,cast:1};
  let A=0,D=0,F=0;P.forEach(p=>{const x=apport(p);const mm=mentalMult(p,c);A+=x.a*mm;D+=x.d*mm;F+=eff(p,'f')*({Cogneur:1.4,'Trois-quarts':1}[pj(p)]||.6)});
  const comp=n<NB_TIT?Math.pow(NB_TIT/n,.35):1;
  let att=A/NB_TIT*1.08*comp*c.mAtt*c.plan*c.marqueur,def=D/NB_TIT*comp*c.mDef*c.plan;
  const tc=TACTIQUES[c.tactique]||TACTIQUES.equilibre;const cp=compterPostes(P);const actif=!tc.cond||tc.cond(cp);
  if(actif){att*=tc.att||1;def*=tc.def||1}
  att*=c.tacMult;def*=c.tacMult;
  const nb=r=>Math.min(3,P.filter(p=>p.race===r).length);
  def*=1+.02*nb('nain');att*=1+.015*nb('orque');def*=1+.015*nb('orque');att*=1+.012*nb('humain');def*=1+.012*nb('humain');
  const nL=P.filter(p=>p.leg).length;if(nL){att*=1+.02*nL;def*=1+.02*nL} /* une légende inspire toute l'équipe */
  if(aPouvoir(P,'rempart'))def*=1.10;if(aPouvoir(P,'eclair'))att*=1.08;if(aPouvoir(P,'capitaine')){att*=1.05;def*=1.05}
  if(aPouvoir(P,'sangfroid')&&(c.phase||0)>=5)att*=1.15;if(c.adv&&aPouvoir(c.adv.terrain,'terreur'))att*=.93;
  if(c.dom){att*=1.05;def*=1.05}
  if(c.consigne==='prudent'){att*=.94;def*=1.07}
  if(c.consigne==='brutal'){def*=.97}
  att*=1-.03*P.filter(p=>p.trait==='maladroit').length;
  return{att,def,cast:F/NB_TIT*.976*comp*c.mCast};
}
function simMatch(S,TA,TB,opts){
  const C=[camp(TA,opts[0],true),camp(TB,opts[1],false)];C[0].adv=C[1];C[1].adv=C[0];
  const ev=[],pre=[],perf={};
  const P=p=>{if(p.temp)return{};return perf[p.id]||(perf[p.id]={b:0,pd:0,occ:0,sort:0,cj:0,cr:0,bl:0,mort:0})};
  // marquages
  const marques=[];
  C.forEach((c,i)=>{const o=1-i;let cible=null;const op=opts[i];
    if(op.marque)cible=C[o].terrain.find(p=>p.id===op.marque);
    else if(op.marqueAuto)cible=C[o].terrain.filter(p=>!p.temp).sort((a,b)=>puissance(b)-puissance(a))[0];
    if(cible){cible._marque=kk(c.T,'strat','marquage');marques.push({c:i,id:cible.id,nom:cible.nom});c.marqueur=.97}else c.marqueur=1});
  /* ordres spéciaux : cibler un adversaire, ou protéger un coéquipier (garde du corps) */
  C.forEach((c,i)=>{const op=opts[i]||{},o=C[1-i];
    if(op.ordres)Object.entries(op.ordres).forEach(([id,x])=>{const p=c.terrain.find(q=>q.id===+id);if(!p||!x)return;
      if(x.k==='cible'&&o.terrain.some(q=>q.id===x.id))c.ordres[p.id]=x;
      if(x.k==='garde'&&p.poste==='Cogneur'&&c.terrain.some(q=>q.id===x.id&&q!==p))c.ordres[p.id]=x});
    else if(!estH(c.T)||op.ordresAuto){/* l'ordinateur donne parfois des ordres à ses cogneurs */
      const star=o.terrain.filter(q=>!q.temp).sort((a,b)=>puissance(b)-puissance(a))[0],maStar=c.terrain.filter(q=>!q.temp&&q.poste!=='Cogneur').sort((a,b)=>puissance(b)-puissance(a))[0];
      c.terrain.filter(p=>!p.temp&&(p.poste==='Cogneur'||(p.race==='elfenoir'&&(p.sp||0)>=20))).forEach(p=>{const r=R();
        if(star&&r<.22)c.ordres[p.id]={k:'cible',id:star.id};else if(maStar&&p.poste==='Cogneur'&&r<.36)c.ordres[p.id]={k:'garde',id:maStar.id}})}
  });
  C.forEach((c,i)=>{
    c.terrain.forEach(p=>{if(p.trait==='fetard'&&R()<.3){p.forme=clamp(p.forme-16,5,100);pre.push({k:'fetard',c:i,j:p.nom})}});
    if(c.pot&&R()<.12){c.pot=false;c.st.scandale=true;pre.push({k:'scandale',c:i})}
  });
  /* duel de plans de jeu */
  const duel=[0,0];
  C.forEach((c,i)=>{const o=C[1-i];if(TACTIQUES[c.tactique].bat===o.tactique){c.tacMult=CONTRE_BONUS;duel[i]=1}});
  const n0=[notes(C[0]),notes(C[1])];
  const rapport=[n0[0].att/n0[1].def,n0[1].att/n0[0].def];
  const minutes=[];for(let i=0;i<8;i++)minutes.push(ri(i*10+1,i*10+10));
  const penaltyPhase=[C[0].pot&&R()<.35?ri(0,7):-1,C[1].pot&&R()<.35?ri(0,7):-1];
  const sc=()=>[C[0].score,C[1].score];
  const sortir=(c,p)=>{c.terrain=c.terrain.filter(x=>x!==p);c.libres.push(pj(p))};
  /* le remplaçant qui convient le mieux à la place laissée libre */
  const remplacer=c=>{if(c.banc.length){const pl=c.libres.pop()||null;const r=pl?c.banc.slice().sort((a,b)=>{const x=apport(a,pl),y=apport(b,pl);return(y.a+y.d)-(x.a+x.d)})[0]:c.banc[0];c.banc=c.banc.filter(x=>x!==r);r._pl=pl||r.poste;c.terrain.push(r);c.joue.add(r);return r.nom}return null};
  const rouge=(c,i,p,m,k)=>{c.st.expuls++;sortir(c,p);P(p).cr++;if(!p.temp){p.cr++;p.suspendu=1;p.frais2=true}ev.push({m,k,c:i,j:p.nom})};
  const jaune=(c,i,p,m)=>{
    if(c.avertis.has(p)){P(p).cj++;rouge(c,i,p,m,'rouge2');return}
    c.avertis.add(p);c.st.jaunes++;P(p).cj++;const e={m,k:'jaune',c:i,j:p.nom};
    if(!p.temp){p.cj++;p.sj++;if(p.sj%3===0){p.suspendu=1;p.frais2=true;e.susp=true}}
    ev.push(e);
  };
  const infliger=(h,o,fr,vi,sev,e)=>{
    fr.victimes++;if(!fr.temp)fr.sv++;P(fr).sort++;P(vi).bl++;if(sev==='mort')P(vi).mort=1;C[h].st.blInfl++;C[o].st.blSubies++;
    if(!vi.temp){
      if(sev==='blesse'){vi.blesse=ri(1,2)}
      else if(sev==='grave'){vi.blesse=ri(3,4);vi.cicatrices++;const k=pick(STATS);vi[k]=Math.max(10,vi[k]-ri(3,6));vi.cap[k]=Math.max(vi[k],vi.cap[k]-ri(2,5))}
      else vi.mort=true;
      vi.frais=true;e.n=vi.blesse;
    }else e.n=sev==='grave'?ri(3,4):ri(1,2);
    e.sev=sev;sortir(C[o],vi);e.r=remplacer(C[o]);
  };
  const butDe=(i,p,m,k,extra)=>{
    const c=C[i];c.score++;c.st.occ++;P(p).b++;if(!p.temp){p.buts++;p.sb++}
    const e=Object.assign({m,k,c:i,j:p.nom,poste:p.poste,s:sc()},extra||{});
    if(k==='but'){const pas=c.terrain.filter(x=>x!==p&&pj(x)==='Passeur'&&!x.temp);
      if(pas.length&&R()<(c.tactique==='aerien'?.8:.6)){const q=wpick(pas,x=>x.t);e.p=q.nom;P(q).pd++;q.pd++;q.spd++}}
    ev.push(e);
  };
  for(let ph=0;ph<8;ph++){
    const m=minutes[ph];C[0].phase=C[1].phase=ph;const N=[notes(C[0]),notes(C[1])];
    const pA=clamp((N[0].att+N[0].def)/(N[0].att+N[0].def+N[1].att+N[1].def)+(aPouvoir(C[0].terrain,'meneur')?.045:0)-(aPouvoir(C[1].terrain,'meneur')?.045:0),.05,.95);
    const a=R()<pA?0:1,d=1-a;
    if(C[a].terrain.length){
      const chance=C[a].terrain.some(p=>p.trait==='chanceux')?1.04:1;
      const xa=N[a].att*U(.55,1.45)*chance,xd=N[d].def*U(.55,1.45);
      const tireur=wpick(C[a].terrain,p=>Math.pow((p.v+2*p.mn)/3,2)*({Coureur:3,'Trois-quarts':1.5,Passeur:1.1,Cogneur:.45}[pj(p)])*(p.trait==='chanceux'?1.3:1)*(C[a].tactique==='sol'&&pj(p)==='Coureur'?1.4:1)*(p._marque?p._marque*p._marque:1)*(p.pv==='finisseur'?1.8:1));
      C[a].st.tirs++;
      if(xa>xd*(tireur.pv==='finisseur'?1.05:1.18))butDe(a,tireur,m,'but');
      else if(xa>xd*.95){C[a].st.occ++;P(tireur).occ++;ev.push({m,k:'occasion',c:a,j:tireur.nom})}
    }
    for(const i of[0,1]){
      if(penaltyPhase[i]===ph&&C[i].terrain.length){
        const t=wpick(C[i].terrain,p=>p.t);C[i].st.aveugle++;C[i].st.penalty++;
        if(R()<.7)butDe(i,t,m+1,'penalty');else{C[i].st.occ++;ev.push({m:m+1,k:'penaltyRate',c:i,j:t.nom})}
      }
    }
    for(const h of[0,1]){
      const o=1-h;if(!C[h].terrain.length||!C[o].terrain.length)continue;
      const base={prudent:.08,normal:.16,brutal:.3}[C[h].consigne]+(aPouvoir(C[h].terrain,'boucher')?.10:0);
      /* spécialité elfe noir : l'assassinat */
      let asn=null;C[h].terrain.forEach(p=>{if(!asn&&!p.temp&&p.race==='elfenoir'&&(p.sp||0)>=20&&R()<p.sp/3000)asn=p});
      if(!asn){const o=C[h].terrain.find(p=>p.pv==='ombre');if(o&&R()<.11)asn=o}
      if(asn||R()<base*Math.pow(notes(C[h]).cast/45,.8)){
        const ord=p=>C[h].ordres[p.id]&&C[h].ordres[p.id].k;
        const fr=asn||wpick(C[h].terrain,p=>p.f*({Cogneur:2.2,'Trois-quarts':1.3}[pj(p)]||.7)*(p.trait==='brute'?2:1)*(p.race==='orque'?1+(p.sp||0)/100:1)*(p.pv==='boucher'?2.5:1)*(ord(p)==='garde'?.5:ord(p)==='cible'?1.25:1));
        let vi=(asn||fr.race==='elfenoir')?wpick(C[o].terrain,p=>Math.pow(puissance(p)/100,3)):pick(C[o].terrain);
        let vise=false,garde=false;
        const oc=C[h].ordres[fr.id];
        if(oc&&oc.k==='cible'){const t=C[o].terrain.find(p=>p.id===oc.id);if(t&&(asn||R()<.65)){vi=t;vise=true}}
        /* le garde du corps s'interpose */
        const g=C[o].terrain.find(p=>p!==vi&&C[o].ordres[p.id]&&C[o].ordres[p.id].k==='garde'&&C[o].ordres[p.id].id===vi.id);
        if(g&&R()<(asn?.25:.45+g.f/400)){ev.push({m,k:'garde',c:o,j:g.nom,v:vi.nom,f:fr.nom});vi=g;garde=true}
        C[h].st.coups++;
        /* spécialité elfe : le pas de danse */
        if((vi.race==='elfe'&&!vi.temp&&R()<(vi.sp||0)/260)||(vi.pv==='esquive'&&R()<.5)){ev.push({m,k:'esquive',c:o,j:vi.nom,f:fr.nom});continue}
        let mult=1;
        if(fr.race==='orque')mult*=1.25*(1+(fr.sp||0)/160);if(fr.trait==='brute')mult*=1.2;if(fr.pv==='boucher')mult*=1.6;if(aPouvoir(C[o].terrain,'roc'))mult*=.7;
        if(asn)mult*=1.4+asn.sp/60;
        if(garde)mult*=.75;if(vise)mult*=1.1;
        if(vi.race==='elfe')mult*=1.3;if(vi.race==='gobelin')mult*=1.15;if(vi.race==='nain')mult*=.6;if(vi.trait==='verre')mult*=1.5;if(vi.trait==='coriace')mult*=.55;
        if(vi.forme<30)mult*=1.9;else if(vi.forme<50)mult*=1.4;
        if(C[h].consigne==='brutal')mult*=1.35;if(C[o].consigne==='prudent')mult*=.65;
        mult*=clamp(eff(fr,'f')/Math.max(15,eff(vi,'f')),.6,1.6);
        mult*=robMult(vi);
        const x=R()/mult;
        let sev=x<.008?'mort':x<.03?'grave':x<.11?'blesse':x<.5?'sonne':null;
        if(sev==='mort'&&!vi.temp&&R()<kk(C[o].T,'prep','sauvetage')){sev='grave';ev.push({m,k:'sauvetage',c:o,j:vi.nom})}
        /* spécialité nain : tête de pioche */
        if(sev&&sev!=='sonne'&&((vi.race==='nain'&&!vi.temp&&R()<(vi.sp||0)/90)||(vi.pv==='roc'&&R()<.85))){ev.push({m,k:'increvable',c:o,j:vi.nom,f:fr.nom});sev=null}
        if(sev&&sev!=='sonne'&&vi.trait==='chanceux'&&R()<.45){sev='sonne';ev.push({m,k:'miracle',c:o,j:vi.nom,f:fr.nom})}
        else if(sev){
          const e={m,k:sev,c:h,j:fr.nom,v:vi.nom,vposte:vi.poste,asn:!!asn,vise};
          if(sev==='mort')vi.mortInfo={par:fr.nom,parPoste:fr.poste,parRace:fr.race,club:C[h].T.court,clubNom:C[h].T.nom,m,forme:Math.round(vi.forme),brutal:C[h].consigne==='brutal',prudent:C[o].consigne==='prudent',asn:!!asn,rapport:Math.round(100*eff(fr,'f')/Math.max(15,eff(vi,'f')))/100,rob:vi.h?vi.h.c:57,boucher:fr.pv==='boucher'};
          if(sev!=='sonne')infliger(h,o,fr,vi,sev,e);
          ev.push(e);
        }
        const grave=sev==='grave'||sev==='mort';
        let vu={prudent:.07,normal:.15,brutal:.28}[C[h].consigne]+(fr.trait==='brute'?.08:0)+(sev&&sev!=='sonne'?.1:0)+(fr.race==='elfenoir'?.04:0)+(fr.race==='orque'?.03+(fr.sp||0)/700:0);
        if(asn)vu=.25-asn.sp/800;
        if(fr.pv==='charmeur')vu=0;
        const vu2=C[h].discret?vu*.8:vu;
        if(sev&&R()<vu2){
          if(C[h].pot){C[h].st.aveugle++;ev.push({m,k:'aveugle',c:h,j:fr.nom})}
          else if(sev==='mort'||(grave&&R()<.5)||R()<.06)rouge(C[h],h,fr,m,'rouge');
          else jaune(C[h],h,fr,m);
        }
      }
    }
    /* spécialité gobelin : l'arme secrète, une fois par match */
    for(const i of[0,1]){
      const o=1-i;const art=C[i].terrain.find(p=>p.pv==='artificier');if((C[i].arme||0)>=(art?2:1)||!C[o].terrain.length)continue;
      const g=(art&&R()<.14)?art:C[i].terrain.find(p=>!p.temp&&p.race==='gobelin'&&(p.sp||0)>=20&&R()<p.sp/2600);if(!g)continue;
      C[i].arme=(C[i].arme||0)+1;const r=g.pv==='artificier'?R()*.85:R();
      if(r<.5){const vi=pick(C[o].terrain);const sev=R()<.22?'grave':'blesse';const e={m:m+1,k:'armeOk',c:i,j:g.nom,v:vi.nom,vposte:vi.poste};infliger(i,o,g,vi,sev,e);ev.push(e);
        if(R()<.35){if(C[i].pot){C[i].st.aveugle++;ev.push({m:m+1,k:'aveugle',c:i,j:g.nom})}else jaune(C[i],i,g,m+1)}}
      else if(r<.78)ev.push({m:m+1,k:'armeRate',c:i,j:g.nom});
      else{const e={m:m+1,k:'armeBoum',c:i,j:g.nom};g.blesse=ri(1,2);g.frais=true;P(g).bl++;C[i].st.blSubies++;e.n=g.blesse;sortir(C[i],g);e.r=remplacer(C[i]);ev.push(e)}
    }
    for(const i of[0,1]){
      const rb=C[i].terrain.find(p=>p.pv==='roublard');
      if(rb&&R()<.06){if(C[i].pot||R()<.5){if(C[i].pot)C[i].st.aveugle++;butDe(i,rb,m+2,'douce')}else ev.push({m:m+2,k:'douceAnnule',c:i,j:rb.nom});continue}
      const F=C[i].terrain.filter(p=>p.trait==='fourbe'||(p.race==='gobelin'&&R()<.25+(p.sp||0)/400));
      if(F.length&&R()<Math.min(.07,.025*F.length)){
        const p=pick(F);
        if(C[i].pot||R()<.5){if(C[i].pot)C[i].st.aveugle++;butDe(i,p,m+2,'douce')}
        else{ev.push({m:m+2,k:'douceAnnule',c:i,j:p.nom});jaune(C[i],i,p,m+2)}
      }
    }
    for(const i of[0,1]){const M=C[i].terrain.filter(p=>p.trait==='maladroit');if(M.length&&R()<.07)ev.push({m:m+3,k:'maladroit',c:i,j:pick(M).nom})}
  }
  ev.sort((x,y)=>x.m-y.m);
  // marquage : bilan avant de retirer l'effet
  const bilanMarq=marques.map(x=>{const pf=perf[x.id]||{};return Object.assign(x,{b:pf.b||0,pd:pf.pd||0,occ:pf.occ||0})});
  C.forEach(c=>c.terrain.concat(c.banc,[...c.joue]).forEach(p=>{delete p._marque;delete p._jour}));
  const placeDe={};C.forEach(c=>c.terrain.concat(c.banc,[...c.joue]).forEach(p=>{if(p._pl)placeDe[p.id]=p._pl;delete p._pl}));
  // notes de la rédaction
  const res=[C[0].score,C[1].score];const notesM={};
  C.forEach((c,i)=>{const o=1-i;const r=res[i]>res[o]?.5:res[i]<res[o]?-.4:0;
    c.joue.forEach(p=>{if(p.temp)return;const x=P(p);
      let n=5.5+1.5*x.b+.9*x.pd+.25*x.occ+.6*x.sort-.7*x.cj-2*x.cr+r+((placeDe[p.id]||p.poste)==='Cogneur'&&res[o]<=1?.5:0)+(p.forme-60)/50+U(-.5,.5)-(x.bl?.4:0);
      n=Math.round(clamp(n,2,10)*2)/2;notesM[p.id]=n;p.sn+=n;p.snb++})});
  C.forEach(c=>{c.T.dernier=c.depart;const souf=[...c.joue].some(p=>p.pv==='souffle');c.idole=[...c.joue].some(p=>p.pv==='idole');c.T.joueurs.forEach(p=>{if(p.mort)return;if(c.joue.has(p)){p.matchs++;p.sm++;p.forme=clamp(p.forme-(p.race==='nain'?11:16)-(c.tactique==='pressing'?8:0)+(souf&&p.pv!=='souffle'?5:0),5,100)}else p.forme=clamp(p.forme+8,5,100)})});
  const joueursDe=i=>[...C[i].joue].filter(p=>!p.temp).map(p=>({id:p.id,nom:p.nom,poste:p.poste,place:placeDe[p.id]||p.poste,race:p.race,tete:p.tete,sexe:p.sexe,leg:p.leg,note:notesM[p.id],perf:perf[p.id]||{}}));
  return{dom:TA.id,ext:TB.id,score:res,ev,pre,rapport,etats:[C[0].etats,C[1].etats],etatsMal:[C[0].etatsMal,C[1].etatsMal],
    st:[C[0].st,C[1].st],stag:[C[0].stag,C[1].stag],consigne:[C[0].consigne,C[1].consigne],pot:[opts[0].pot,opts[1].pot],plan:[C[0].plan,C[1].plan],tactique:[C[0].tactique,C[1].tactique],duel,
    marques:bilanMarq,idole:[!!C[0].idole,!!C[1].idole],joueurs:[joueursDe(0),joueursDe(1)],rangs:[rangDe(S,TA.id),rangDe(S,TB.id)],public:300+(TA.pop||40)*55+ri(0,600)};
}

/* ---------- Une journée ---------- */
const COUT_POT=15,COUT_SOIN=10,DETTE_MAX=-60,MAX_EFFECTIF=11,MIN_EFFECTIF=7,MAX_ECHANGES=3;
const PRIX_FIN=[60,45,35,28,24,22];
/* prime de fin de saison selon le rang ; à 8 ou 10 clubs, on étire le même barème du premier au dernier */
function prixFin(rang,n){if(!n||n===6)return PRIX_FIN[rang-1]||0;if(rang<1||rang>n)return 0;const x=(rang-1)*5/(n-1),i=Math.floor(x),f=x-i;return Math.round(PRIX_FIN[i]+(i<5?(PRIX_FIN[i+1]-PRIX_FIN[i])*f:0))}
const DROITS_TV=4; /* versés à chaque club à chaque journée */
const PRET={montant:40,parMatch:5,nb:10};
const huissiers=(S,T)=>moiDe(S,T).or<0;
/* ---------- Le stade : investissements durables ---------- */
const STADE={
  tribunes:{nom:'Tribunes',niv:['Talus en terre battue','Gradins en bois','Tribune couverte','Arène de pierre'],cout:[45,95,170],effet:n=>n?'+'+[0,3,7,12][n]+' po de billetterie à domicile':'Aucun bonus pour l\'instant'},
  buvette:{nom:'Buvette',niv:['Tonneau sur tréteaux','Comptoir de planches','Taverne du stade','Brasserie royale'],cout:[35,75,140],effet:n=>n?'+'+[0,1,2,4][n]+' po par match'+(n>=2?', et la ferveur baisse moins après une défaite':''):'Aucun bonus pour l\'instant'},
  infirmerie:{nom:'Infirmerie',niv:['Seau et éponge','Cabane du rebouteux','Infirmerie','Hospice des champions'],cout:[40,90,160],effet:n=>!n?'Aucun bonus pour l\'instant':[0,10,20,30][n]+' % de chances par semaine d\'écourter chaque blessure (en plus du préparateur)'},
  terrain:{nom:"Terrain d'entraînement",niv:['Champ de patates','Pré clôturé','Terrain damé','Centre de formation'],cout:[50,110,190],effet:n=>n?'Progrès ×'+[1,1.06,1.12,1.2][n].toString().replace('.',',')+' à l\'entraînement':'Aucun bonus pour l\'instant'}
};
const STADE_IDS=Object.keys(STADE);
const nivStade=(T,k)=>(T.stade&&T.stade[k])||0;
function ameliorerStade(S,k,M){const T=moiDe(S,M);T.stade=T.stade||{};const n=nivStade(T,k);if(n>=3)return'Niveau maximum atteint.';const c=STADE[k].cout[n];if(T.or<c)return'Il vous faut '+c+' po.';if(huissiers(S,T))return'Les huissiers bloquent les travaux.';T.or-=c;T.stade[k]=n+1;return null}
function billetterie(T,dom,buts){return Math.round(dom?12+T.pop*.3+[0,3,7,12][nivStade(T,'tribunes')]:6+T.pop*.12)+2*buts}
function masseSalariale(T){return T.joueurs.filter(p=>!p.mort).reduce((s,p)=>s+p.sal,0)}
function coutStaff(T){return ROLE_IDS.reduce((s,r)=>s+(T.staff[r]?T.staff[r].sal:0),0)}
function previsionParMatch(S,M){
  const T=moiDe(S,M);const sp=sponsorDe(G(S,T).sponsor);
  const bil=Math.round((billetterie(T,true,1.5)+billetterie(T,false,1.5))/2);
  const pr=T.pret?-PRET.parMatch:0;const bv=[0,1,2,4][nivStade(T,'buvette')];return{buvette:bv,billetterie:bil,tv:DROITS_TV,sponsor:sp?sp.fixe:0,salaires:-masseSalariale(T),staff:-coutStaff(T),pret:pr,solde:bil+bv+DROITS_TV+(sp?sp.fixe:0)-masseSalariale(T)-coutStaff(T)+pr};
}
let mortsDeLaJournee=0;
/* un de vos joueurs est mort : on garde tout ce qu'il faut pour lui rendre hommage et comprendre */
function noterDeuil(S,p,jour,coupe,M){
  const i=p.mortInfo||{};const g=G(S,moiDe(S,M));
  (g.deuils||(g.deuils=[])).push({nom:p.nom,race:p.race,tete:p.tete,poste:p.poste,sexe:p.sexe,age:p.age,saisons:p.saisons||0,matchs:p.matchs||0,buts:p.buts||0,sb:p.sb||0,leg:p.leg,etoiles:p.etoiles||0,saison:S.saison,jour,coupe,info:i,vu:false});
  if(g.deuils.length>20)g.deuils.shift();
}
/* ordres spéciaux du joueur : on ne garde que ceux qui ont encore un sens pour le prochain match */
function ordresValides(S,M){
  const moi=moiDe(S,M);const O=G(S,moi).choix.ordres||{},out={};let adv=null;try{adv=prochainMatch(S,moi).adv}catch(e){}
  Object.entries(O).forEach(([id,x])=>{const p=moi.joueurs.find(q=>q.id===+id);if(!p||!x)return;
    if(x.k==='cible'&&adv&&adv.joueurs.some(q=>q.id===x.id))out[id]=x;
    if(x.k==='garde'&&moi.joueurs.some(q=>q.id===x.id&&q!==p))out[id]=x});
  return out;
}
/* les réglages de match d'un club humain, tels qu'il les a choisis */
function optsHumain(S,T,pr){
  const g=G(S,T),rap=g.rapport;
  const o={consigne:g.choix.consigne,pot:g.choix.pot&&T.or>=COUT_POT,marque:g.choix.marque,plan:1,tactique:g.choix.tactique||'equilibre',pression:pr,ordres:ordresValides(S,T)};
  if(rap&&rap.fiable&&g.choix.consigne===rap.conseil)o.plan=1+K.plan[rap.niv+1]/100;
  if(S.multi&&g.auto){o.ordres=null;o.ordresAuto=true} /* pilote automatique : les cogneurs reçoivent parfois des ordres, comme chez l'ordinateur */
  return o;
}
/* ce qu'un tour de coupe a donné pour un club humain précis */
function vueCoupe(S,cup,T){
  const p=cup.par[T.id]||{};const mien=p.mien||null;
  return{tour:cup.tour,matchs:S.multi?cup.matchs.map(m=>Object.assign({},m,{moi:m.ida===T.id||m.idb===T.id})):cup.matchs,mien,gain:p.gain||0,libelle:cup.libelle,
    fin:cup.fin?{vainqueur:cup.fin.vainqueur,moi:cup.fin.id===T.id}:null,elimine:!!(mien&&!mien.gagne)};
}
/* En solo : jouerJournee(S). En ligue : jouerJournee(S,ordres), où ordres[id du club] contient les ordres de ce club
   (voir appliquerOrdres dans ligue.js) ; un club sans ordres passe en pilote automatique. */
function jouerJournee(S,ordres){
  courant(S);
  if(S.fini||S.phase!=='saison')return null;
  const H=humains(S);const jour=S.jour;
  if(S.multi)H.forEach(T=>appliquerOrdres(S,T,ordres&&ordres[T.id]));
  S.teams.forEach(T=>entrainer(T));
  S.teams.forEach(T=>{if(!estH(T))choisirTitulaires(T)});
  const pr=jour>=S.calendrier.length-2; /* les deux dernières journées se jouent sous pression */
  const mes={};H.forEach(T=>{mes[T.id]=optsHumain(S,T,pr)});
  const optsDe=id=>mes[id]||Object.assign({},S.opts[id],{pression:pr});
  const resultats=S.calendrier[jour].map(([h,a])=>simMatch(S,S.teams[h],S.teams[a],[optsDe(h),optsDe(a)]));
  const matchDe={};
  resultats.forEach(res=>{
    const A=S.teams[res.dom],B=S.teams[res.ext];const[a,b]=res.score;
    A.j++;B.j++;A.bp+=a;A.bc+=b;B.bp+=b;B.bc+=a;
    if(a>b){A.g++;A.pts+=3;B.p++}else if(a<b){B.g++;B.pts+=3;A.p++}else{A.n++;B.n++;A.pts++;B.pts++}
    matchDe[res.dom]=res;matchDe[res.ext]=res;
  });
  const infPar={};
  S.teams.forEach(T=>{
    const infirmerie=infPar[T.id]=[];
    T.joueurs.filter(p=>p.mort).forEach(p=>{const m={nom:p.nom,club:T.court,saison:S.saison,jour:jour+1,buts:p.buts,race:p.race,tete:p.tete,leg:p.leg,par:p.mortInfo&&p.mortInfo.par,moi:estH(T)};if(S.multi)m.cid=T.id;S.morts.push(m);if(estH(T))noterDeuil(S,p,jour+1,false,T)});
    T.joueurs=T.joueurs.filter(p=>!p.mort&&!p.mercenaire&&!p.pret);
    T.joueurs.forEach(p=>{
      if(p.frais)delete p.frais;else if(p.blesse>0)p.blesse--;
      if(p.frais2)delete p.frais2;else if(p.suspendu>0)p.suspendu--;
      delete p.soigne;
    });
    if(!estH(T)){while(T.joueurs.length<EFF_IA-1){const manque=postesManquants(T);const n=jeuneDuPays(S,pick(archDe(T).races));if(manque.length){n.poste=manque[0]}T.joueurs.push(n);varierTetes(T,n)}}
    else T.joueurs.forEach(p=>{
      if(p.blesse>0){p.titulaire=false;infirmerie.push(p.nom+' : blessé, encore '+pl(p.blesse,'match'))}
      else if(p.suspendu){p.titulaire=false;infirmerie.push(p.nom+' : suspendu au prochain match')}
    });
  });
  const cup=jouerCoupe(S,jour,mes);
  const cache=S.multi?{}:null;const nums={},vueCoupeDe={};
  H.forEach(T=>{vueCoupeDe[T.id]=cup?vueCoupe(S,cup,T):null;nums[T.id]=bilanClub(S,T,{jour,res:matchDe[T.id],ailleurs:resultats.filter(r=>r!==matchDe[T.id]),infirmerie:infPar[T.id],cup:vueCoupeDe[T.id],potPaye:mes[T.id].pot,cache})});
  S.jour++;H.forEach(T=>{const g=G(S,T);g.choix.pot=false;g.choix.marque=null});
  if(S.jour>=S.calendrier.length){
    S.fini=true;const cl=classement(S);const nT=S.teams.length;const AR=divDe(S).argent;let tro=null;
    H.forEach(T=>{
      const g=G(S,T),num=nums[T.id];const sp=sponsorDe(g.sponsor);
      const rang=cl.indexOf(T)+1;
      const prix=Math.round(prixFin(rang,nT)*AR);T.or+=prix;
      /* en ligue entre amis : une seule division, personne ne monte ni ne descend */
      const mouv=S.multi?{k:rang===1?'sacre':'reste',de:S.div||4,vers:S.div||4}:bilanDivision(S,rang);let primeMontee=0;if(mouv.k==='monte'){primeMontee=Math.round(30*DIVS[mouv.vers].argent);T.or+=primeMontee}
      const bonusSp=sp&&sp.fin?sp.fin(rang,nT):0;T.or+=bonusSp;
      if(rang===1)g.titres=(g.titres||0)+1;
      if(!tro)tro=trophees(S);
      num.final={champion:cl[0].nom,rang,prix,mouv,primeMontee,division:divDe(S).nom,vers:DIVS[mouv.vers].nom,bonusSp,sponsor:sp?sp.nom:null,podium:cl.slice(0,3).map(T=>T.nom),trophees:tro};num.solde=T.or;
    });
    passerIntersaison(S);
  }
  H.forEach(T=>{
    const g=G(S,T),num=nums[T.id];
    if(cup)num.coupe=vueCoupeDe[T.id];
    const deuils=(g.deuils||[]).filter(d=>d.saison===S.saison&&d.jour===jour+1);if(deuils.length){num.deuils=deuils;mortsDeLaJournee=deuils.length}
    if(!S.multi){S.gazettes.push(num);if(S.gazettes.length>14)S.gazettes.shift()}
  });
  let commune=null;
  if(S.multi){commune=editionCommune(S,resultats,cache,jour+1);if(cup)commune.coupe={tour:cup.tour,matchs:cup.matchs,fin:cup.fin};if(S.fini)commune.final=true}
  S.marche=S.multi?marcheCommun(S):nouveauMarche(S);
  preparerJournee(S);
  if(S.multi)preparerPrets(S);
  return S.multi?{par:nums,commune}:nums[H[0].id];
}
/* comptes, ferveur, dettes et gazette d'un club humain après sa journée */
function bilanClub(S,moi,x){
  const g=G(S,moi);const jour=x.jour,monMatch=x.res,cup=x.cup,infirmerie=x.infirmerie;
  const i=monMatch.dom===moi.id?0:1,bm=monMatch.score[i],be=monMatch.score[1-i];
  const mortsMatch=monMatch.ev.filter(e=>e.k==='mort').length;
  if(g.plumes){infirmerie.push('Toute l\'équipe a joué coiffée de chapeaux à plumes, offerts par le baron de Moisy-sur-Fange. Les adversaires ont ri. Pas longtemps.');g.plumes=false}
  // comptes du club
  const sp=sponsorDe(g.sponsor);const comptes=[];
  const AR=divDe(S).argent;
  comptes.push(['Billetterie'+(i===0?' (à domicile)':' (part visiteur)'),Math.round(billetterie(moi,i===0,bm)*AR)]);
  const prime=Math.round((bm>be?10:bm===be?4:0)*AR);if(prime)comptes.push([bm>be?'Prime de victoire':'Prime de match nul',prime]);
  if(sp){let s=sp.fixe;const det=[];
    if(sp.sorti){s+=sp.sorti*monMatch.st[i].blInfl}
    if(sp.mort){s+=sp.mort*mortsMatch}
    if(sp.rouge){s+=sp.rouge*monMatch.st[i].expuls}
    if(sp.but){s+=sp.but*bm}
    if(sp.victoire&&bm>be){s+=sp.victoire}
    if(sp.carton){s+=sp.carton*(monMatch.st[i].jaunes+monMatch.st[i].expuls)}
    comptes.push(['Sponsor : '+sp.nom,s])}
  comptes.push(['Droits de retransmission (tous les clubs)',Math.round(DROITS_TV*AR)]);
  if(cup&&cup.gain)comptes.push([cup.libelle,cup.gain]);
  if(nivStade(moi,'buvette'))comptes.push(['Buvette',[0,1,2,4][nivStade(moi,'buvette')]]);
  if(monMatch.idole&&monMatch.idole[i])comptes.push(['Produits dérivés de votre idole',4]);
  comptes.push(['Salaires des joueurs',-masseSalariale(moi)]);
  if(moi.pret&&moi.pret.reste>0){comptes.push(['Remboursement du prêt ('+moi.pret.reste+' restants)',-PRET.parMatch]);moi.pret.reste--;if(!moi.pret.reste)moi.pret=null}
  const cs=coutStaff(moi);if(cs)comptes.push(['Salaires du staff',-cs]);
  if(x.potPaye)comptes.push(['Pot-de-vin',-COUT_POT]);
  if(monMatch.st[i].scandale)comptes.push(['Amende pour corruption',-20]);
  const exp=monMatch.st[i].expuls;if(exp)comptes.push(['Amendes pour carton rouge',-5*exp]);
  moi.or+=comptes.reduce((s,c)=>s+c[1],0);
  // ferveur du public
  const avant=moi.pop;let dp=bm>be?3:bm===be?1:-2;if(bm>=3)dp++;if(monMatch.st[i].blInfl>=2)dp++;if(mortsMatch)dp+=2;if(monMatch.st[i].scandale)dp-=4;
  if(dp<0&&nivStade(moi,'buvette')>=2)dp+=1;if(monMatch.idole&&monMatch.idole[i])dp+=1;
  moi.pop=clamp(moi.pop+dp,5,100);
  // dettes
  let vente=null;
  if(moi.or<DETTE_MAX&&moi.joueurs.length>MIN_EFFECTIF){
    const{tit}=onzeDe(moi);const cand=moi.joueurs.filter(p=>!tit.includes(p)).sort((a,b)=>valeur(b)-valeur(a));
    const p=cand[0]||moi.joueurs.slice().sort((a,b)=>valeur(b)-valeur(a))[0];
    const prix=Math.round(valeur(p)*.6);moi.joueurs=moi.joueurs.filter(x=>x!==p);moi.or+=prix;
    vente={nom:p.nom,prix};comptes.push(['Vente forcée de '+p.nom+' par les huissiers',prix]);
  }
  (g.histOr||(g.histOr=[])).push({s:S.saison,j:jour+1,or:moi.or});if(g.histOr.length>60)g.histOr.shift();
  const rap=g.rapport;
  const rapStrat=rap?Object.assign({},rap,{tacReel:monMatch.tactique[1-i],suivi:g.choix.consigne===rap.conseil,reel:monMatch.consigne[1-i],potReel:monMatch.pot[1-i]}):null;
  const o={infirmerie,comptes,solde:moi.or,pop:[avant,moi.pop],vente,rapStrat,marque:g.choix.marque,jour:jour+1};
  if(S.multi){o.moi=moi.id;o.cache=x.cache}
  return gazette(S,monMatch,x.ailleurs,o);
}

/* ---------- Rebondissements : plus fréquents et plus généreux quand le club va mal ---------- */
function detresse(S,M){const T=moiDe(S,M);let d=0;if(T.or<20)d++;if(T.or<0)d++;if(T.joueurs.length<NB_TIT+1)d++;if(T.joueurs.filter(dispo).length<NB_TIT)d++;return d}
const EVTS={
  veteran:{titre:'Un vétéran sort de sa retraite',poids:(d,S,T)=>T.joueurs.length<MAX_EFFECTIF?1+d:0,cree(S,T){const p=nouveauJoueur(S,pick(RACE_IDS),4,{portrait:'veteran'});STATS.forEach(k=>p.cap[k]=p[k]);p.sal=2;p.veteran=true;
    return{p,texte:p.nom+", "+(p.sexe==='f'?'ancienne gloire des tavernes, s\'ennuie à la retraite. Elle':'ancienne gloire des tavernes, s\'ennuie à la retraite. Il')+" jouera pour vous jusqu'à la fin de la saison pour 2 po par match, sans prime d'arrivée. "+(p.sexe==='f'?'Elle':'Il')+" ne progressera plus et raccrochera à l'intersaison.",oui:'Signer le vétéran',non:'Non merci'}}},
  mercenaire:{titre:'Un mercenaire à louer',poids:(d,S,T)=>T.joueurs.length>=MAX_EFFECTIF?0:d>=1?1+d:.4,cree(S,T){const p=nouveauJoueur(S,pick(['orque','humain','nain']),6,{poste:'Cogneur'});p.sal=0;p.mercenaire=true;
    return{p,cout:8,texte:p.nom+" propose ses poings pour le prochain match seulement : 8 po, payés d'avance. "+(p.sexe==='f'?'Elle':'Il')+" repart ensuite vers d'autres bagarres.",oui:'Louer pour 8 po',non:'Pas besoin'}}},
  collecte:{titre:'Les supporters font la quête',poids:d=>d>=1?2+d:0,cree(S,T){const po=10+Math.round(T.pop/4)+ri(0,8);
    return{po,texte:'Émus par vos malheurs, vos supporters ont fait passer le casque à la buvette. Ils vous offrent '+po+" po, en échange d'une tournée générale de remerciements.",oui:'Accepter les '+po+' po',non:'Refuser par fierté'}}},
  guerisseur:{titre:'Un guérisseur ambulant',poids:(d,S,T)=>T.joueurs.some(p=>p.blesse>0)?1.5+d*.5:0,cree(S,T){const p=T.joueurs.filter(p=>p.blesse>0).sort((a,b)=>b.blesse-a.blesse)[0];
    if(!p)return null;
    return{cible:p.id,texte:'Un vieux rebouteux de passage propose de remettre '+p.nom+' sur pied, gratuitement, pour tester une pommade « révolutionnaire ». Il pourra jouer tout de suite, un peu fatigué. Seul risque : la pommade sent très fort.',oui:'Tenter la pommade',non:'Non, trop louche'}}},
  transfuge:{titre:'Un joueur adverse veut changer de camp',poids:(d,S,M)=>clubsIA(S).length&&M.joueurs.length<MAX_EFFECTIF?.6+d*.5:0,cree(S,M){const T=pick(clubsIA(S));const p=T.joueurs.slice().sort((a,b)=>valeur(a)-valeur(b))[ri(0,2)];if(!p)return null;
    return{p:p.id,de:T.id,texte:p.nom+' ('+p.poste.toLowerCase()+', '+T.court+") ne supporte plus son entraîneur et veut vous rejoindre. Pas d'indemnité : vous reprenez juste son contrat à "+p.sal+' po par match.',oui:"L'accueillir",non:'Refuser'}}},
  mecene:{titre:'Un mécène excentrique',poids:d=>.5+d*.6,cree(S,T){const po=ri(20,35);
    return{po,texte:'Le baron de Moisy-sur-Fange vous offre '+po+' po à une condition : que votre équipe joue le prochain match avec des chapeaux à plumes. Aucun effet sur le jeu, mais la gazette en parlera.',oui:'Accepter (et les plumes)',non:'Garder sa dignité'}}},
  banquier:{titre:'Le banquier gobelin frappe à la porte',poids:(d,S,T)=>T.pret?0:(T.or<25?2+d:0),cree(S,T){
    return{texte:'Grinkle, banquier gobelin, vous prête '+PRET.montant+' po tout de suite. Vous rembourserez '+PRET.parMatch+' po par match pendant '+PRET.nb+' matchs, soit '+PRET.parMatch*PRET.nb+' po au total.',oui:'Emprunter '+PRET.montant+' po',non:'Pas de dettes'}}}
};
function tirerEvenement(S,M){
  const T=moiDe(S,M),g=G(S,T);
  if(g.evt&&g.evt.perso)return; /* un happening du créateur attend sa réponse : il ne s'efface pas */
  g.evt=null;const d=detresse(S,T);
  if(R()>(.22+d*.14))return;
  const ids=Object.keys(EVTS);const poids=ids.map(k=>Math.max(0,EVTS[k].poids(d,S,T)));
  if(!poids.some(x=>x>0))return;
  const k=wpick(ids,(x,i)=>poids[i]);const e=EVTS[k].cree(S,T);if(!e)return;
  g.evt=Object.assign({k,titre:EVTS[k].titre},e);
}
function resoudreEvenement(S,oui,M){
  const T=moiDe(S,M),g=G(S,T);
  const e=g.evt;if(!e)return null;g.evt=null;if(!oui)return null;
  if(e.k==='veteran'){if(T.joueurs.length>=MAX_EFFECTIF)return"Effectif complet : renvoyez quelqu'un d'abord.";e.p.titulaire=false;T.joueurs.push(e.p);varierTetes(T,e.p);return e.p.nom+' rejoint le club.'}
  if(e.k==='mercenaire'){if(T.or<e.cout)return'Il vous faut '+e.cout+' po.';if(T.joueurs.length>=MAX_EFFECTIF)return'Effectif complet.';T.or-=e.cout;e.p.titulaire=true;T.joueurs.push(e.p);varierTetes(T,e.p);return e.p.nom+' jouera le prochain match, puis repartira.'}
  if(e.k==='collecte'||e.k==='mecene'){T.or+=e.po;if(e.k==='mecene')g.plumes=true;return'+'+e.po+' po dans la caisse.'}
  if(e.k==='guerisseur'){const p=T.joueurs.find(x=>x.id===e.cible);if(p){p.blesse=0;p.forme=Math.max(40,p.forme-10)}return p?p.nom+' est guéri (et sent la pommade).':null}
  if(e.k==='transfuge'){const A=S.teams[e.de];const p=A&&A.joueurs.find(x=>x.id===e.p);if(!p)return"Il a changé d'avis.";if(T.joueurs.length>=MAX_EFFECTIF)return'Effectif complet.';A.joueurs=A.joueurs.filter(x=>x!==p);p.titulaire=false;T.joueurs.push(p);varierTetes(T,p);return p.nom+' rejoint le club.'}
  if(e.k==='invite'){if(T.joueurs.length>=MAX_EFFECTIF){g.evt=e;return"Effectif complet : libérez une place, il attend à la porte."}if(T.or<(e.cout||0)){g.evt=e;return'Il vous faut '+e.cout+' po.'}T.or-=(e.cout||0);e.p.titulaire=false;T.joueurs.push(e.p);return e.p.nom+' rejoint le club.'}
  if(e.k==='banquier'){return emprunter(S,T)?'+'+PRET.montant+' po. Remboursement : '+PRET.parMatch+' po par match.':null}
  return null;
}
function emprunter(S,M){const T=moiDe(S,M);if(T.pret)return false;T.or+=PRET.montant;T.pret={reste:PRET.nb};return true}

/* ---------- Trophées et mur des légendes ---------- */
const CRITERES=[
  {titre:'Joueur de la saison',crit:"meilleure moyenne de notes de la rédaction, avec au moins 5 matchs joués. Il gagne une étoile et 3 points dans chaque note.",grand:true},
  {titre:"Gourdin d'or",crit:'meilleur buteur de la saison (à égalité, celui qui a joué le moins de matchs).'},
  {titre:"Plume d'or",crit:'meilleur passeur décisif de la saison.'},
  {titre:'Boucher de la saison',crit:"plus grand nombre d'adversaires sortis sur civière."}
];
function trophees(S){
  const tous=tousLesJoueurs(S);const out=[];
  const moy=p=>p.snb?p.sn/p.snb:0;
  const regles=[
    [x=>x.p.snb>=5?moy(x.p):0,x=>'moyenne '+moy(x.p).toFixed(1).replace('.',',')+' sur '+pl(x.p.snb,'match')],
    [x=>x.p.sb,x=>pl(x.p.sb,'but')],
    [x=>x.p.spd,x=>pl(x.p.spd,'passe décisive','passes décisives')],
    [x=>x.p.sv,x=>pl(x.p.sv,'adversaire sorti','adversaires sortis')]
  ];
  regles.forEach(([f,txt],k)=>{
    const o=tous.slice().sort((a,b)=>f(b)-f(a)||a.p.sm-b.p.sm)[0];if(!o||f(o)<=0)return;
    const e={titre:CRITERES[k].titre,grand:!!CRITERES[k].grand,nom:o.p.nom,race:o.p.race,tete:o.p.tete,poste:o.p.poste,club:o.T.court,couleur:o.T.couleur,moi:estH(o.T),saison:S.saison,detail:txt(o)};if(S.multi)e.cid=o.T.id;
    if(k===0){o.p.etoiles=(o.p.etoiles||0)+1;STATS.forEach(x=>{o.p[x]=clamp(o.p[x]+3,10,99);o.p.cap[x]=Math.max(o.p.cap[x],o.p[x])})}
    S.fame.push(e);out.push(e);
  });
  return out;
}

/* ---------- Intersaison : contrats, listes, échanges ---------- */
function passerIntersaison(S){
  S.phase='inter';
  S.classFinal=classement(S).map(T=>({id:T.id,nom:T.nom,court:T.court,couleur:T.couleur,j:T.j,g:T.g,n:T.n,p:T.p,bp:T.bp,bc:T.bc,pts:T.pts}));S.classFinalDiv=divDe(S).nom;
  /* les cartons et suspensions s'effacent dès la fin de la saison */
  S.teams.forEach(T=>T.joueurs.forEach(p=>{p.sj=0;p.suspendu=0;p.frais2=false}));
  const H=humains(S);const partisDe={},haussesDe={};
  H.forEach(moi=>{
  const partis=partisDe[moi.id]=moi.joueurs.filter(p=>p.veteran).map(p=>p.nom);moi.joueurs=moi.joueurs.filter(p=>!p.veteran);
  const hausses=haussesDe[moi.id]=[];
  moi.joueurs.forEach(p=>{const n=p.jeune&&p.saisons===0?Math.min(salaire(p),3):salaire(p);if(n!==p.sal){hausses.push({nom:p.nom,avant:p.sal,apres:n})}p.sal=n;p.saisons++;delete p.gratuit});
  });
  S.teams.forEach(T=>{
    T.pop=Math.round(T.pop+(40-T.pop)*.2);
    if(!estH(T)){
      T.joueurs.forEach(p=>{p.sal=salaire(p);p.saisons++});
      if(T.joueurs.length>EFF_IA-1&&R()<.6){const p=T.joueurs.slice().sort((a,b)=>valeur(a)-valeur(b))[0];T.joueurs=T.joueurs.filter(x=>x!==p)}
      while(T.joueurs.length<EFF_IA){const n=nouveauJoueur(S,pick(archDe(T).races),ri(divDe(S).ia[0]-1,divDe(S).ia[1]-1),{poste:postesManquants(T)[0]||null,jeune:true});T.joueurs.push(n);varierTetes(T,n)}
      if(R()<.4){const r=pick(ROLE_IDS);T.staff[r]=nouveauStaff(r,clamp(niv(T,r)+ri(-1,1),0,3))}
      T.liste=T.joueurs.slice().sort((a,b)=>valeur(a)-valeur(b)).slice(0,ri(1,3)).sort(()=>R()-.5).slice(0,2).map(p=>p.id);
      T.gourmandise=U(1.05,1.25);
    }
  });
  H.forEach(moi=>{moi.liste=[]});
  const carriere=vieillir(S);
  if(S.multi)S.mouv=null;
  const mv=S.mouv;if(mv&&mv.vers!==(S.div||4)){S.div=mv.vers;S.divMax=Math.min(S.divMax||4,mv.vers);peuplerDivision(S,mv.vers)}
  H.forEach(moi=>{G(S,moi).inter={hausses:haussesDe[moi.id],partis:partisDe[moi.id],recues:[],faits:0,journal:[],carriere:S.multi?carriere.par[moi.id]:carriere,mouv:mv||null}});
  H.forEach(moi=>{const g=G(S,moi);
  g.inter.arrivees=genererArrivees(S,moi);
  g.sponsor=null;g.offresSponsor=offresSponsor();
  g.candidats=candidatsStaff();
  g.rapport=null;if(S.multi)g.dep=0});
  S.opts={};
}
/* ---------- Intersaison : ça bouge au club ---------- */
const RAISONS={
  legende:["a lu dans la gazette le récit de votre saison et veut finir sa carrière « là où ça cogne pour de vrai »","a perdu un pari contre votre mascotte et doit jouer une saison chez vous","fuit un créancier gobelin et cherche un club discret, loin de sa banque","dit avoir reçu en rêve la visite de son grand-père, qui lui a montré votre écusson","veut prouver à son ancien entraîneur qu'il n'est pas « fini »","a été chassé de son village pour avoir mangé le gâteau du mariage, et a besoin d'un nouveau foyer","prétend que votre buvette sert la meilleure bière du royaume","veut battre le record de buts de son père avant ses vieux jours","a été banni de sa ligue pour avoir mordu un arbitre, et la vôtre est moins regardante","s'ennuie dans son château et cherche un peu d'animation","a entendu vos supporters chanter depuis l'autre bout de la vallée et veut savoir d'où vient ce boucan","doit de l'argent à votre président, et propose de rembourser en buts","a été viré de son club pour avoir peint le terrain en rose, et vous trouve « ouverts d'esprit »","cherche un dernier défi avant d'ouvrir une taverne","s'est fâché avec sa fanfare officielle et en veut une nouvelle","dit que les étoiles se sont alignées sur votre stade. Il est très sérieux."],
  migrant:["n'a presque pas joué cette saison et ronge son frein sur le banc","dit que son entraîneur ne connaît même pas son prénom","veut jouer dans un club où l'on parle sa langue au vestiaire","a vu vos {r} et pense qu'il y sera mieux compris","se dispute avec le capitaine de son équipe depuis l'histoire du casque volé","veut se rapprocher de sa vieille mère, qui habite près de votre stade","trouve que le maillot de son club gratte","a été surpris à chanter l'hymne de votre club dans les douches de son équipe","réclame du temps de jeu, et une chambre avec vue","jure qu'il vaut mieux qu'un remplaçant, et veut le prouver chez vous"],
  curieux:["a répondu à une annonce placardée sur la porte de la taverne","s'est présenté au stade avec ses crampons et une lettre de sa grand-mère","sort de l'école de brutball de la vallée, diplômé de justesse","était marchand de navets ; il a reçu trop de navets lancés et veut changer de camp","a gagné un concours de lancer de troncs à la foire","a suivi votre bus de supporters à pied pendant trois jours","est le neveu du cuisinier de la buvette, qui insiste beaucoup","a été recommandé par un barde qui lui devait de l'argent","veut une place dans l'équipe en échange de son silence sur « l'affaire de la chèvre »","a été trouvé endormi dans le vestiaire. Il dit qu'il fait partie de l'équipe depuis toujours"],
  depart:["n'a joué que {m} cette saison et veut un club qui lui fasse confiance","trouve qu'il chauffe le banc mieux que quiconque, et ça le vexe","a reçu une offre d'un club rival qui lui promet du temps de jeu","dit que le vestiaire sent trop la soupe et qu'il étouffe","veut rejoindre un club où jouent plus de {r}","a besoin de changer d'air après une saison passée en tribune"]
};
function genererArrivees(S,M){
  const moi=moiDe(S,M);const L=[];const rang=rangDe(S,moi.id);
  const races=onzeDe(moi).tit.map(p=>p.race);const raceMaj=races.sort((a,b)=>races.filter(x=>x===b).length-races.filter(x=>x===a).length)[0]||'humain';
  const raison=(k,o)=>remplir(pick(RAISONS[k]),o||{});
  /* une légende, rarement : plus probable si le club brille */
  if(R()<.15+(rang<=2?.1:0)+Math.min(.08,(moi.pop-40)/400)){
    const p=tirerLegende(S);
    if(p)L.push({k:'legende',p,prime:ri(35,55),texte:p.nom+(p.sexe==='f'?', joueuse légendaire, ':', joueur légendaire, ')+raison('legende')+'.'});
  }
  /* un joueur adverse en mal de temps de jeu */
  const candidats=[];clubsIA(S).forEach(T=>T.joueurs.forEach(p=>{if(!p.mort&&p.sm<=4&&T.joueurs.length>NB_TIT)candidats.push({p,T})}));
  if(candidats.length&&R()<.75){
    const o=wpick(candidats,x=>x.p.race===raceMaj?3:1);
    L.push({k:'migrant',p:o.p,de:o.T.id,prime:ri(0,8),texte:o.p.nom+' ('+o.T.court+') '+raison('migrant',{r:RACES[o.p.race].pl.toLowerCase()})+'.'});
  }
  /* un curieux qui se présente */
  if(R()<.8){const p=nouveauJoueur(S,pick(RACE_IDS),ri(-4,4),{});L.push({k:'curieux',p,prime:0,texte:p.nom+' '+raison('curieux')+'.'})}
  /* vos joueurs sous-utilisés qui demandent à partir */
  moi.joueurs.filter(p=>!p.mort&&p.sm<=3&&p.saisons>=1&&!p.etoiles).forEach(p=>{if(R()<.6){const autre=RACE_IDS.filter(r=>r!==p.race&&r!==raceMaj);
    L.push({k:'depart',p,indem:Math.round(valeur(p)*.5),texte:p.nom+' '+raison('depart',{m:p.sm?pl(p.sm,'match'):'quelques minutes',r:RACES[p.race].pl.toLowerCase()})+'.'})}});
  return L;
}
function reponseArrivee(S,idx,oui,M){
  const moi=moiDe(S,M);const I=G(S,moi).inter,a=I.arrivees[idx];if(!a)return null;
  if(a.k==='depart'){
    I.arrivees.splice(idx,1);
    if(oui&&!clubsIA(S).length){/* ligue sans club de l'ordinateur : le joueur quitte la ligue */moi.joueurs=moi.joueurs.filter(x=>x!==a.p);moi.or+=a.indem;I.journal.push(a.p.nom+' quitte la ligue (+'+a.indem+' po)');return a.p.nom+' part tenter sa chance ailleurs. Vous touchez '+a.indem+' po.'}
    if(oui){moi.joueurs=moi.joueurs.filter(x=>x!==a.p);moi.or+=a.indem;const T=pick(clubsIA(S));a.p.titulaire=false;T.joueurs.push(a.p);I.journal.push(a.p.nom+' part chez '+T.court+' (+'+a.indem+' po)');return a.p.nom+' rejoint '+T.court+'. Vous touchez '+a.indem+' po.'}
    a.p.forme=Math.max(30,a.p.forme-25);a.p.boude=true;const il=a.p.sexe==='f'?'elle':'il';return a.p.nom+' reste, mais '+il+' boude : '+il+' commencera la saison sans entrain.';
  }
  if(!oui){I.arrivees.splice(idx,1);return null}
  if(moi.joueurs.length>=MAX_EFFECTIF)return'Effectif complet : libérez une place d\'abord.';
  if(moi.or<a.prime)return'Il vous faut '+a.prime+' po.';
  if(a.k==='migrant'){const T=S.teams[a.de];if(!T||!T.joueurs.includes(a.p)){I.arrivees.splice(idx,1);return'Il a déjà signé ailleurs.'}T.joueurs=T.joueurs.filter(x=>x!==a.p)}
  moi.or-=a.prime;a.p.titulaire=false;a.p.entr='repos';if(a.k!=='migrant')a.p.sal=salaire(a.p);
  moi.joueurs.push(a.p);varierTetes(moi,a.p);I.arrivees.splice(idx,1);I.journal.push(a.p.nom+' rejoint le club');
  return a.p.nom+' rejoint le club !';
}
function equipeDe(S,id){return S.teams.find(T=>T.joueurs.some(p=>p.id===id))||null}
function evalIA(T,donnes,recus,po){
  const manque=postesManquants({joueurs:T.joueurs.filter(p=>!donnes.includes(p)).concat(recus)});
  const avantManque=postesManquants(T);
  const vR=recus.reduce((s,p)=>s+valeur(p)+(avantManque.includes(p.poste)?5:0),0)+po;
  const vD=donnes.reduce((s,p)=>s+valeur(p)*(p.etoiles?1.2:1),0)*(T.gourmandise||1.15)+manque.filter(x=>!avantManque.includes(x)).length*6;
  return{score:vR-vD,vD};
}
const REPONSES={
  oui:["Marché conclu. Ne venez pas pleurer après.","Topez là ! Le notaire est déjà ivre, signons vite.","Ça nous va. On vous l'emballe dans du papier journal."],
  contre:["Pas mal, mais ajoutez {po} po et on signe.","Votre offre nous fait sourire. Avec {po} po de plus, on rirait franchement.","Pour {po} po de plus, on vous tient la porte."],
  non:["Vous voulez nous voler ? On est des voleurs, pas des pigeons.","Notre président a ri si fort qu'il s'est démis la mâchoire. C'est non.","Revenez avec une offre sérieuse, ou avec un meilleur joueur."]
};
function proposerEchange(S,cibleId,donneIds,po,M){
  const moi=moiDe(S,M);const I=G(S,moi).inter;const T=equipeDe(S,cibleId);if(!T||estH(T))return{statut:'erreur',msg:'Ce joueur n\'est plus disponible.'};
  if(I.faits>=MAX_ECHANGES)return{statut:'erreur',msg:'Vous avez déjà fait '+MAX_ECHANGES+' échanges cette intersaison.'};
  const cible=T.joueurs.find(p=>p.id===cibleId);const donnes=moi.joueurs.filter(p=>donneIds.includes(p.id));
  if(po>0&&po>moi.or)return{statut:'erreur',msg:'Votre caisse ne contient pas '+po+' po.'};
  const effMoi=moi.joueurs.length-donnes.length+1,effIA=T.joueurs.length-1+donnes.length;
  if(effMoi>MAX_EFFECTIF)return{statut:'erreur',msg:'Votre effectif dépasserait 8 joueurs.'};
  if(effMoi<MIN_EFFECTIF)return{statut:'erreur',msg:'Votre effectif tomberait sous 5 joueurs.'};
  if(effIA>9||effIA<6)return{statut:'non',club:T.court,msg:T.court+' : « Nous n\'avons pas la place pour autant de monde. »'};
  const{score,vD}=evalIA(T,[cible],donnes,po);
  if(score>=0)return{statut:'oui',club:T.court,msg:pick(REPONSES.oui)};
  if(-score<=vD*.3){const manque=Math.ceil(-score)+ri(0,3);return{statut:'contre',club:T.court,po:po+manque,msg:pick(REPONSES.contre).replace('{po}',manque)}}
  return{statut:'non',club:T.court,msg:pick(REPONSES.non)};
}
function executerEchange(S,cibleId,donneIds,po,M){
  const moi=moiDe(S,M);const I=G(S,moi).inter;const T=equipeDe(S,cibleId);const cible=T.joueurs.find(p=>p.id===cibleId);
  const donnes=moi.joueurs.filter(p=>donneIds.includes(p.id));
  T.joueurs=T.joueurs.filter(p=>p!==cible).concat(donnes);moi.joueurs=moi.joueurs.filter(p=>!donnes.includes(p)).concat([cible]);
  donnes.forEach(p=>{p.titulaire=false;p.entr='repos'});cible.titulaire=false;cible.entr='repos';cible.sal=salaire(cible);
  moi.or-=po;T.liste=T.liste.filter(id=>id!==cibleId);moi.liste=moi.liste.filter(id=>!donneIds.includes(id));
  I.recues=I.recues.filter(o=>!donneIds.includes(o.veut)&&o.donne!==cibleId);
  varierTetes(moi,cible);donnes.forEach(p=>varierTetes(T,p));
  I.faits++;I.journal.push(cible.nom+' arrive de '+T.court+(donnes.length?' contre '+donnes.map(p=>p.nom).join(' et '):'')+(po>0?(donnes.length?' et ':' contre ')+po+' po':po<0?', avec '+(-po)+' po en plus':''));
}
function offresRecues(S,M){
  const moi=moiDe(S,M);const I=G(S,moi).inter;const out=[];
  moi.liste.forEach(id=>{const p=moi.joueurs.find(x=>x.id===id);if(!p)return;
    clubsIA(S).forEach(T=>{
      if(R()>.4)return;
      const manque=postesManquants(T).includes(p.poste);const v=valeur(p)*(manque?1.1:.92)/(T.gourmandise||1.15);
      const leur=T.liste.map(i=>T.joueurs.find(x=>x.id===i)).filter(Boolean).filter(x=>valeur(x)<=v+4);
      if(leur.length&&R()<.5){const q=pick(leur);out.push({de:T.id,club:T.court,veut:p.id,donne:q.id,po:Math.max(0,Math.round(v-valeur(q)))})}
      else out.push({de:T.id,club:T.court,veut:p.id,donne:null,po:Math.max(5,Math.round(v))});
    })});
  I.recues=out.slice(0,6);
  return I.recues;
}
function accepterOffre(S,k,M){
  const moi=moiDe(S,M);const I=G(S,moi).inter;
  const o=I.recues[k];if(!o)return'Offre introuvable.';
  const T=S.teams[o.de];const p=moi.joueurs.find(x=>x.id===o.veut);if(!p)return'Joueur introuvable.';
  const q=o.donne?T.joueurs.find(x=>x.id===o.donne):null;
  /* le joueur promis en échange a quitté ce club entre-temps : l'offre ne tient plus (sinon on céderait son joueur contre rien) */
  if(o.donne&&!q){I.recues=I.recues.filter(x=>x!==o);return'Le joueur proposé en échange n\'est plus dans ce club : l\'offre est annulée.'}
  if(moi.joueurs.length-1+(q?1:0)<MIN_EFFECTIF)return'Votre effectif tomberait sous 5 joueurs.';
  if(I.faits>=MAX_ECHANGES)return'Vous avez déjà fait '+MAX_ECHANGES+' échanges cette intersaison.';
  moi.joueurs=moi.joueurs.filter(x=>x!==p);T.joueurs.push(p);p.titulaire=false;
  if(q){T.joueurs=T.joueurs.filter(x=>x!==q);moi.joueurs.push(q);q.titulaire=false;q.entr='repos';q.sal=salaire(q);varierTetes(moi,q);T.liste=T.liste.filter(i=>i!==q.id)}
  moi.or+=o.po;moi.liste=moi.liste.filter(i=>i!==p.id);I.recues=I.recues.filter(x=>x.veut!==p.id);I.faits++;
  I.journal.push(p.nom+' part à '+T.court+(q?' contre '+q.nom:'')+(o.po?(q?' et ':' contre ')+o.po+' po':''));
  return null;
}
function nouvelleSaison(S){
  const H=humains(S);
  S.saison++;S.jour=0;S.fini=false;S.phase='saison';S.calendrier=S.multi?calendrierSaison(S):calendrier(6);H.forEach(T=>{G(S,T).inter=null});S.mouv=null;S.classFinal=null;
  S.teams.forEach(T=>{remiseAZero(T);T.dernier='';T.liste=[];T.joueurs.forEach(p=>{p.forme=clamp(p.forme+40,5,90);p.sb=0;p.sv=0;p.sm=0;p.sj=0;p.spd=0;p.sn=0;p.snb=0;p.suspendu=0})});
  H.forEach(T=>{G(S,T).choix={consigne:'normal',pot:false,marque:null,tactique:'equilibre'}});
  /* en ligue entre amis, les clubs de l'ordinateur ne recrutent pas de légende */
  if(!S.multi&&R()<.35){const r=legendeIA(S);if(r)choisirTitulaires(r.T)}
  H.forEach(T=>choisirTitulairesSiVide(T));
  nouvelleCoupe(S);H.forEach(T=>{G(S,T).choix.coupeRot=false});
  S.marche=S.multi?marcheCommun(S):nouveauMarche(S);
  preparerJournee(S);
}
function choisirTitulairesSiVide(T){if(T.joueurs.filter(p=>p.titulaire&&dispo(p)).length<NB_TIT)choisirTitulaires(T)}

/* ---------- Ancienne sauvegarde (Brutball) ---------- */
function convertirPortraits(o){
  /* tous les portraits connus, joueurs ET joueuses (oublier les joueuses leur faisait perdre leur visage à chaque ouverture de la partie) */
  const tous=new Set();[PORTRAITS,PORTRAITS_F].forEach(P=>Object.values(P).forEach(d=>Object.values(d).forEach(l=>l.forEach(k=>tous.add(k)))));
  const conv=(race,t)=>{const k=typeof t==='string'?t:race+((race==='elfe'&&t===6)?2:(t||0));return tous.has(k)||k.startsWith('leg/')?k:race+'0'};
  o.teams.forEach(T=>T.joueurs.forEach(p=>{p.tete=conv(p.race,p.tete)}));
  (o.marche||[]).forEach(p=>{p.tete=conv(p.race,p.tete)});
  (o.fame||[]).forEach(f=>{f.tete=conv(f.race,f.tete)});(o.morts||[]).forEach(f=>{if(f.race)f.tete=conv(f.race,f.tete)});
  /* doublons : on redistribue les visages */
  /* règle d'or : le visage d'un joueur d'un club humain ne change JAMAIS. Seuls les clubs de l'ordinateur cèdent le leur en cas de doublon. */
  const vus={};o.teams.forEach(T=>{if(estH(T))T.joueurs.forEach(p=>{vus[p.tete]=1})});
  o.teams.forEach(T=>{if(estH(T))return;T.joueurs.forEach(p=>{if(vus[p.tete]&&!p.leg){p.tete=null;p.tete=choisirPortrait(o,p.race,p.veteran?'veteran':'std',p.sexe)}vus[p.tete]=1})});
  /* réparation des parties abîmées par l'ancien défaut : une joueuse retrouve un portrait de joueuse (et un joueur, de joueur) */
  const estF=k=>/_f[sjv]\d+$/.test(k);
  const reparer=p=>{if(!p||p.leg||typeof p.tete!=='string'||!tous.has(p.tete))return;const f=p.sexe==='f';
    if(f!==estF(p.tete)&&(!f||aPortraitF(p.race,'std'))){p.tete=null;p.tete=choisirPortrait(o,p.race,p.veteran?'veteran':p.jeune&&!p.saisons?'jeune':'std',p.sexe)}};
  o.teams.forEach(T=>T.joueurs.forEach(reparer));(o.marche||[]).forEach(reparer);
}
function vedettesV2(o){const f=p=>{if(p&&p.trait==='vedette'&&!p.vedV2&&!p.leg){p.vedV2=1;p.f=clamp(p.f+8,10,99);p.v=clamp(p.v+2,10,99);p.t=clamp(p.t+2,10,99);if(typeof p.mn==='number')p.mn=clamp(p.mn+2,10,99);STATS.forEach(k=>{p.cap[k]=clamp(Math.max(p.cap[k]+8,p[k]),p[k],99)})}};(o.teams||[]).forEach(T=>T.joueurs.forEach(f));(o.marche||[]).forEach(f);if(o.inter&&o.inter.arrivees)o.inter.arrivees.forEach(a=>f(a&&a.p?a.p:a))}
function migrerCarriere(o){if(!o.teams)return;if(!o.div){o.div=4;o.divMax=4}(o.teams||[]).forEach(T=>T.joueurs.forEach(assurerCarriere));(o.marche||[]).forEach(assurerCarriere);if(o.inter&&o.inter.arrivees)o.inter.arrivees.forEach(a=>assurerCarriere(a.p));if(o.coupe===undefined){if(o.phase==='saison'&&(o.jour||0)<=2)nouvelleCoupe(o);else o.coupe=null}if(o.coupe&&o.coupe.invites)o.coupe.invites.forEach(T=>T.joueurs.forEach(assurerCarriere))}
/* LABO : les sauvegardes d'avant les 7 joueurs. La note Balle devient la Passe ; les Mains en sont déduites selon le poste et le peuple.
   Les clubs de l'ordinateur recrutent de quoi aligner 7 joueurs, dont des trois-quarts. */
const MN_POSTE={Cogneur:0,'Trois-quarts':0,Coureur:6,Passeur:-8},MN_RACE={humain:0,orque:2,nain:-3,elfe:-1,elfenoir:3,gobelin:6};
function mainsDe(p){if(!p||typeof p.t!=='number'||typeof p.mn==='number')return;const d=(MN_POSTE[p.poste]||0)+(MN_RACE[p.race]||0);p.mn=clamp(p.t+d,10,95);
  if(p.cap&&typeof p.cap.t==='number')p.cap.mn=clamp(p.cap.t+d,p.mn,99);if(p.vu&&typeof p.vu.t==='number')p.vu.mn=clamp(p.vu.t+d,10,99);if(p.entr==='t'&&p.poste!=='Passeur')p.entr='mn'}
function migrerLabo(o){
  if(!o.teams)return;const tous=p=>mainsDe(p);
  o.teams.forEach(T=>{T.joueurs.forEach(tous);const g=T.gest||{};[g.marche,g.prets&&g.prets.liste].forEach(L=>(L||[]).forEach(tous));if(g.inter&&g.inter.arrivees)g.inter.arrivees.forEach(a=>tous(a.p))});
  (o.marche||[]).forEach(tous);if(o.prets&&o.prets.liste)o.prets.liste.forEach(tous);if(o.inter&&o.inter.arrivees)o.inter.arrivees.forEach(a=>tous(a.p));
  if(o.coupe&&o.coupe.invites)o.coupe.invites.forEach(T=>(T.joueurs||[]).forEach(tous));if(o.evt&&o.evt.p)tous(o.evt.p);
  (o.fame||[]).concat(o.morts||[]).forEach(tous);
  if(!o.labo7){o.labo7=1;
    o.teams.forEach(T=>{if(estH(T))return;const a=archDe(T);if(!a)return;
      while(T.joueurs.filter(p=>!p.mort).length<EFF_IA){const manque=postesManquants(T);const moy=T.joueurs.length?Math.round(T.joueurs.reduce((s,p)=>s+somme3(p)/3,0)/T.joueurs.length-50):0;
        const n=nouveauJoueur(o,pick(a.races),clamp(moy,-8,25),{poste:manque.includes('Trois-quarts')?'Trois-quarts':manque[0]||null});T.joueurs.push(n);varierTetes(T,n)}
      choisirTitulaires(T)})}
}
function migrer(o){
  if(!o)return null;courant(o);migrerLabo(o);vedettesV2(o);migrerCarriere(o);if(o.teams&&o.teams[0])o.teams[0].joueurs.forEach(p=>{if(p.entr&&p.entr!=='repos'&&p.cap&&p[p.entr]>=p.cap[p.entr])p.entr=conseilEntr(p)});if(o.v===3){o._sexe=o._sexe||{};o.teams.forEach(T=>T.joueurs.forEach(p=>{if(!p.sexe)p.sexe='m';o._sexe[p.nom]=p.sexe}));convertirPortraits(o);o.teams.forEach(T=>T.joueurs.forEach(p=>{if(p.sp===undefined){p.sp=ri(5,25);p.cap.sp=clamp(p.sp+ri(30,65),p.sp,99)}}));(o.marche||[]).forEach(p=>{if(p.sp===undefined){p.sp=ri(5,25);p.cap.sp=p.sp+40}});if(o.inter&&!o.inter.arrivees)o.inter.arrivees=genererArrivees(o);if(o.choix&&!o.choix.tactique)o.choix.tactique='equilibre';if(o.phase==='inter')o.teams.forEach(T=>T.joueurs.forEach(p=>{p.sj=0;p.suspendu=0}));return o}if(o.v!==2)return null;
  o.v=3;o.phase='saison';o.vus=[];o.histOr=[];o.inter=null;o.sponsor=null;o.offresSponsor=offresSponsor();o.candidats=candidatsStaff();
  o.choix={consigne:(o.choix&&o.choix.consigne)||'normal',pot:false,marque:null};
  const up=p=>{
    if(!p.poste){const a=p.f,b=p.v,c=p.t;p.poste=a>=b&&a>=c?'Cogneur':(b>=c?'Coureur':'Passeur')}
    if(!p.cap){p.cap={};STATS.forEach(k=>{p.cap[k]=clamp(p[k]+ri(2,9),p[k],99)})}
    if(p.tete===undefined)p.tete=0;
    ['pd','spd','sn','snb','saisons'].forEach(k=>{if(p[k]===undefined)p[k]=0});
    if(!p.entr)p.entr='repos';p.sal=salaire(p);
  };
  o.teams.forEach(T=>{T.pop=T.id===0?35:40;T.staff=T.id===0?{}:staffIA();T.liste=[];T.joueurs.forEach(up)});
  (o.marche||[]).forEach(up);
  (o.fame||[]).forEach(f=>{if(f.tete===undefined)f.tete=0;if(!f.detail)f.detail=''});
  if(o.fini)passerIntersaison(o);
  o.marche=nouveauMarche(o);
  preparerJournee(o);
  return o;
}
if(typeof module!=='undefined')module.exports={};

/* ================= PRONOSTIC : simulation du prochain match =================
   On rejoue le prochain match des centaines de fois sur des copies des deux équipes,
   avec exactement le moteur du vrai match. Les choix secrets de l'adversaire sont tirés
   au sort comme le ferait l'ordinateur ; un stratège rend ce tirage plus précis. */
function optsAdvPronostic(S,adv,M){
  const rap=G(S,moiDe(S,M)).rapport;const o=optsIA(S,adv.id);
  if(rap&&!rap.humain&&rap.adv===adv.id&&R()<K.fiab[rap.niv+1]){o.tactique=rap.tacPrediction;o.consigne=rap.prediction;if(rap.pot!==null&&rap.pot!==undefined)o.pot=rap.pot}
  return o;
}
function graine(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function pronostic(S,choix,N,modif,M){
  const moi=moiDe(S,M);
  const pm=prochainMatch(S,moi);if(!pm)return null;
  const adv=pm.adv,dom=pm.dom;
  const gelMoi=JSON.stringify(moi),gelAdv=JSON.stringify(adv),rap=G(S,moi).rapport;
  const potOk=moi.or>=COUT_POT&&!huissiers(S,moi);
  let v=0,n=0,d=0,bp=0,bc=0,bl=0;
  const vraiR=R;
  try{for(let k=0;k<N;k++){
    R=graine(7919*k+13); /* mêmes tirages d'un réglage à l'autre : on compare à hasard égal */
    const A=JSON.parse(gelMoi),B=JSON.parse(gelAdv);
    entrainer(A);entrainer(B);if(!estH(B))choisirTitulaires(B);if(modif)modif(A,B);
    const mo={consigne:choix.consigne,pot:!!choix.pot&&potOk,marque:choix.marque,plan:1,tactique:choix.tactique||'equilibre',pression:S.jour>=S.calendrier.length-2,ordres:ordresValides(S,moi)};
    if(rap&&rap.adv===adv.id&&choix.consigne===rap.conseil&&R()<K.fiab[rap.niv+1])mo.plan=1+K.plan[rap.niv+1]/100;
    if(mo.marque&&!B.joueurs.some(p=>p.id===mo.marque))mo.marque=null;
    const oa=Object.assign({},optsAdvPronostic(S,adv,moi),{pression:S.jour>=S.calendrier.length-2});
    const r=dom?simMatch(S,A,B,[mo,oa]):simMatch(S,B,A,[oa,mo]);
    const a=dom?r.score[0]:r.score[1],b=dom?r.score[1]:r.score[0];
    bp+=a;bc+=b;if(a>b)v++;else if(a<b)d++;else n++;
    bl+=r.st[dom?0:1].blSubies;
  }}finally{R=vraiR}
  return{v:v/N,n:n/N,d:d/N,bp:bp/N,bc:bc/N,bl:bl/N,N};
}
/* Rapport de forces : attaque et défense moyennes de chaque camp, avec et sans bonus */
function rapportForces(S,choix,M){
  const moi=moiDe(S,M);
  const pm=prochainMatch(S,moi);if(!pm)return null;
  const adv=pm.adv;
  const c1=camp(moi,{consigne:choix.consigne,tactique:choix.tactique||'equilibre',marque:choix.marque},pm.dom);
  const c2=camp(adv,{consigne:'normal',tactique:'equilibre'},!pm.dom);
  const n1=notes(c1),n2=notes(c2);
  return{moi:{att:n1.att,def:n1.def,etats:c1.etats,mal:c1.etatsMal},adv:{att:n2.att,def:n2.def,etats:c2.etats,mal:c2.etatsMal}};
}
/* Leviers : on change un seul réglage à la fois et on mesure l'effet sur les chances de gagner */
function leviersPronostic(S,choix,N,M){
  const moi=moiDe(S,M);
  const pm=prochainMatch(S,moi);if(!pm)return null;
  const base=pronostic(S,choix,N,null,moi);const L=[];
  const essai=(groupe,nom,ch,modif,app)=>{const r=pronostic(S,ch,N,modif,moi);L.push({groupe,nom,app,v:r.v,n:r.n,d:r.d,bp:r.bp,bc:r.bc,bl:r.bl,dv:r.v-base.v,dbl:r.bl-base.bl})};
  ['prudent','normal','brutal'].forEach(c=>{if(c!==choix.consigne)essai('Consigne','Consigne '+c,Object.assign({},choix,{consigne:c}),null,{consigne:c})});
  TACTIQUE_IDS.forEach(t=>{if(t!==(choix.tactique||'equilibre'))essai('Plan de jeu',TACTIQUES[t].nom,Object.assign({},choix,{tactique:t}),null,{tactique:t})});
  if(moi.or>=COUT_POT&&!huissiers(S,moi))essai('Arbitre',choix.pot?'Arbitre honnête':'Pot-de-vin ('+COUT_POT+' po)',Object.assign({},choix,{pot:!choix.pot}),null,{pot:!choix.pot});
  const men=menaceDe(pm.adv);
  if(choix.marque)essai('Marquage','Aucun marquage',Object.assign({},choix,{marque:null}),null,{marque:null});
  else if(men)essai('Marquage','Marquer '+men.nom,Object.assign({},choix,{marque:men.id}),null,{marque:men.id});
  const avant=onzeDe(moi).tit.map(p=>p.id).sort().join(',');
  const copie=JSON.parse(JSON.stringify(moi));choisirTitulaires(copie);
  if(onzeDe(copie).tit.map(p=>p.id).sort().join(',')!==avant)essai('Composition','Composition auto',choix,A=>choisirTitulaires(A),{compo:true});
  L.sort((a,b)=>b.dv-a.dv);
  return{base,leviers:L};
}
