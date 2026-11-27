/* =====================================================================
   HAUT NIVEAU : divisions, carrière des joueurs, Coupe du Gourdin,
   profil caché (mental, régularité, robustesse) et cadres de portrait.
   ===================================================================== */

/* ---------- 1. L'échelle des ligues ---------- */
const DIVS={
  4:{en:'en Ligue des Tavernes',nom:'Ligue des Tavernes',court:'Tavernes',ia:[-4,-1],marche:0,argent:1,   staff:[-1,1],legIA:.5},
  3:{en:'en Ligue des Comtés',nom:'Ligue des Comtés',  court:'Comtés',  ia:[2,6],  marche:1,argent:1.15,staff:[0,2], legIA:.6},
  2:{en:'en Ligue des Royaumes',nom:'Ligue des Royaumes',court:'Royaumes',ia:[8,12], marche:3,argent:1.3, staff:[1,3], legIA:.75},
  1:{en:'au Grand Bol de Bois',nom:'Le Grand Bol de Bois',court:'Grand Bol',ia:[14,18],marche:5,argent:1.5,staff:[2,3],legIA:.9}
};
const divDe=S=>DIVS[S.div||4];
/* chaque club de l'ordinateur garde sa personnalité (peuples, style), mais change de nom selon la division */
const CLUBS_DIV={
  4:null,
  3:[['Les Broyeurs de Fangecreuse','Fangecreuse'],['Les Archers de Haute-Futaie','Haute-Futaie'],['La Bande à Grignoux','Grignoux'],['Les Marteaux de Roc-Gris','Roc-Gris'],['Les Ombres de Pique-Lune','Pique-Lune']],
  2:[['Les Crocs de Ventrebrûle','Ventrebrûle'],["Les Lauriers d'Argentselve",'Argentselve'],['Les Fusées de Pétaroche','Pétaroche'],['La Garde de Forgeprofonde','Forgeprofonde'],['Les Dagues de Sombre-Velours','Sombre-Velours']],
  1:[['Les Seigneurs de Krakogre','Krakogre'],["Les Princes de l'Aube",'Aube'],['Les Grands Escrocs de Bricabrac','Bricabrac'],["Les Barons d'Ostbarbe",'Ostbarbe'],['La Cour Écarlate','Cour Écarlate']]
};
const MONTEES=2; /* les 2 premiers montent, le dernier descend */

function nomClubDiv(i,d){const L=CLUBS_DIV[d];return L?{nom:L[i][0],court:L[i][1]}:{nom:CLUBS_IA[i].nom,court:CLUBS_IA[i].court}}
/* reconstruit les 5 clubs de l'ordinateur pour la division d */
function peuplerDivision(S,d){
  const D=DIVS[d];
  S.teams.slice(1).forEach((T,k)=>{
    const c=CLUBS_IA[T.id-1],n=nomClubDiv(T.id-1,d);
    T.nom=n.nom;T.court=n.court;T.pop=40+(4-d)*8;T.liste=[];T.dernier='';
    T.joueurs=c.races.map((r,i)=>nouveauJoueur(S,r,ri(D.ia[0],D.ia[1]),{poste:POSTES_DEPART[i]}));
    T.staff={};ROLE_IDS.forEach(r=>{const nv=ri(D.staff[0],D.staff[1]);if(nv>=0)T.staff[r]=nouveauStaff(r,Math.min(3,nv))});
    remiseAZero(T);
  });
  if(R()<D.legIA)legendeIA(S);
  S.teams.forEach(T=>{varierTetes(T);choisirTitulaires(T)});
}

/* fin de saison : montée, maintien ou descente */
function bilanDivision(S,rang){
  const d=S.div||4;let vers=d,k='reste';
  if(rang<=MONTEES&&d>1){vers=d-1;k='monte'}
  else if(rang===S.teams.length&&d<4){vers=d+1;k='descend'}
  else if(rang===1&&d===1)k='sacre';
  S.mouv={k,de:d,vers};
  return S.mouv;
}

/* ---------- 2. Carrière : âge, progrès, déclin, retraite, parrainage ---------- */
const AGE_ETAPES=[[22,'Jeune pousse','progresse plus vite'],[27,"Force de l'âge",'au sommet'],[29,'Expérimenté','progresse moins'],[31,'Vétéran','commence à décliner'],[99,'Fin de carrière','décline chaque saison']];
const etapeAge=a=>AGE_ETAPES.find(e=>a<=e[0]);
function ageInitial(opts,typeP){
  if(opts&&opts.leg)return ri(26,31);
  if(typeP==='veteran')return ri(31,34);
  if(typeP==='jeune')return ri(17,20);
  if(opts&&opts.jeune)return ri(19,22);
  return wpick([21,22,23,24,25,26,27,28,29],(x,i)=>[2,3,4,4,4,3,3,2,1][i]);
}
/* profil caché : trois notes de 20 à 95, autour de 57 */
const gauss=(m,s)=>m+s*((R()+R()+R()-1.5)/.5);
function profilCache(p,opts){
  const g=()=>clamp(Math.round(gauss(57,15)),20,95);
  const h={m:g(),r:g(),c:g()};
  if(p.trait==='verre')h.c=ri(20,38);if(p.trait==='coriace')h.c=ri(72,92);
  if(p.trait==='fetard')h.r=Math.min(h.r,ri(25,48));if(p.trait==='vedette')h.m=Math.max(h.m,ri(55,80));
  if(opts&&opts.leg){h.m=ri(76,95);h.r=ri(66,90);h.c=ri(60,88);if(p.pv==='roc')h.c=95;if(p.pv==='sangfroid')h.m=95}
  return h;
}
/* appelé à la création de tout joueur (moteur.js et legendes.js) */
function completerJoueur(p,opts,typeP){
  if(p.age===undefined)p.age=ageInitial(opts,typeP);
  if(!p.h)p.h=profilCache(p,opts);
  return p;
}
/* anciennes sauvegardes : on invente un âge plausible */
function assurerCarriere(p){
  if(!p)return;
  if(p.age===undefined)p.age=p.leg?ri(26,31):p.veteran?ri(31,34):(p.jeune&&!p.saisons?ri(17,20):ri(21,27)+Math.min(p.saisons||0,4));
  if(!p.h)p.h=profilCache(p,p.leg?{leg:true}:{});
}

/* à l'entraînement : l'âge module les progrès, un vétéran parraine un jeune du même poste */
function progresAge(T,p,gain,reste){
  let mentor=null;
  if(!gain)return{gain,mentor};
  const a=p.age||25;
  if(a<=22&&R()<.4)gain++;
  else if(a>=30&&R()<.6)gain--;
  else if(a>=28&&R()<.3)gain--;
  if(a<=22){const m=T.joueurs.find(x=>x!==p&&!x.mort&&x.blesse===0&&(x.age||0)>=29&&x.poste===p.poste);if(m&&R()<.45){gain++;mentor=m.nom}}
  return{gain:Math.max(0,Math.min(gain,reste)),mentor};
}

/* intersaison : chacun prend un an. Les jeunes gagnent du potentiel, les anciens déclinent, certains raccrochent. */
const PROBA_RETRAITE=a=>a<=31?0:a===32?.15:a===33?.35:a===34?.55:a===35?.8:1;
function vieillir(S){
  /* un bilan par club humain (en solo : celui du club 0) */
  const par={};const bilanDe=T=>par[T.id]||(par[T.id]={retraites:[],annonces:[],declins:[],croissances:[]});
  humains(S).forEach(bilanDe);
  S.teams.forEach(T=>{
    const partent=[];
    T.joueurs.forEach(p=>{
      if(p.mort)return;assurerCarriere(p);
      /* ceux qui avaient annoncé leur dernière saison s'en vont */
      if(p.retraite){partent.push(p);return}
      p.age++;
      const a=p.age,rob=(p.h&&p.h.c)||57;
      if(a<=22){STATS.forEach(k=>{p.cap[k]=clamp(p.cap[k]+ri(0,2),p[k],99)});if(estH(T))bilanDe(T).croissances.push(p.nom)}
      if(a>=30){
        const perte={};let tot=0;
        STATS.forEach(k=>{let n=ri(0,2)+(k==='v'?1:0)+(a>=32?ri(1,2):0)+(a>=34?ri(1,2):0);
          if(rob>=75&&R()<.5)n=Math.max(0,n-1);if(rob<=35)n++;
          n=Math.min(n,p[k]-10);if(n>0){p[k]-=n;p.cap[k]=Math.max(p[k],p.cap[k]-n);perte[k]=n;tot+=n}});
        if(tot&&estH(T))bilanDe(T).declins.push({nom:p.nom,age:a,perte});
      }
      /* annonce de la dernière saison */
      if(!p.leg||a>=34){const pr=PROBA_RETRAITE(p.leg?a-2:a);if(pr&&R()<pr){p.retraite=true;if(estH(T))bilanDe(T).annonces.push({nom:p.nom,age:a})}}
    });
    partent.forEach(p=>{
      T.joueurs=T.joueurs.filter(x=>x!==p);
      if(estH(T)){
        const e={titre:'Jubilé',grand:false,nom:p.nom,race:p.race,tete:p.tete,poste:p.poste,club:T.court,couleur:T.couleur,moi:true,saison:S.saison,
          detail:p.age+' ans, '+pl(p.saisons+1,'saison')+' au club, '+pl(p.buts,'but')+', '+pl(p.matchs,'match')};
        if(S.multi)e.cid=T.id;S.fame.push(e);bilanDe(T).retraites.push({nom:p.nom,age:p.age,buts:p.buts,matchs:p.matchs});T.pop=clamp(T.pop+2,5,100);
      }
    });
    if(!estH(T)){const D=divDe(S);while(T.joueurs.length<6){const n=nouveauJoueur(S,pick(archDe(T).races),ri(D.ia[0]-2,D.ia[1]-2),{poste:postesManquants(T)[0]||null,jeune:true});T.joueurs.push(n);varierTetes(T,n)}}
  });
  return S.multi?{par}:par[S.teams[0].id];
}

/* ---------- 3. Profil caché : ce que l'on découvre en montant ---------- */
const CACHE={
  m:{nom:'Mental',div:3,mots:['Friable','Nerveux','Correct','Solide',"D'acier"],
     desc:"Garde la tête froide dans les matchs à enjeu (coupe, dernières journées) et en fin de match. Un mental d'acier peut valoir jusqu'à +12 % ; un mental friable, autant en moins.",
     rev:'Les psychologues de la Ligue des Comtés savent le lire.'},
  r:{nom:'Régularité',div:2,mots:['Imprévisible','Irrégulier','Correct','Régulier','Métronome'],
     desc:"Un joueur régulier rend toujours à peu près sa valeur. Un imprévisible peut faire le match de sa vie… ou passer à côté (écarts jusqu'à ±14 % d'un match à l'autre).",
     rev:'Les statisticiens de la Ligue des Royaumes la mesurent.'},
  c:{nom:'Robustesse',div:1,mots:['Fragile','Délicat','Correct','Robuste','Increvable'],
     desc:'Résiste aux coups (blessures jusqu\'à 35 % plus ou moins fréquentes) et vieillit mieux : un joueur robuste décline moins vite.',
     rev:'Les médecins du Grand Bol de Bois savent l\'évaluer.'}
};
const CACHE_IDS=['m','r','c'];
const motCache=(k,v)=>CACHE[k].mots[v<=30?0:v<=45?1:v<=60?2:v<=75?3:4];
const niveauCache=v=>v<=30?0:v<=45?1:v<=60?2:v<=75?3:4;
const revele=(S,k)=>(S.divMax||S.div||4)<=CACHE[k].div;
/* effets en match */
function mentalMult(p,c){
  if(!p.h||p.temp)return 1;
  const enjeu=c.pression||(c.phase||0)>=6;
  return enjeu?1+(p.h.m-57)/320:1;
}
function formeDuJour(p){if(!p.h||p.temp)return 1;const ampl=.02+.12*(95-p.h.r)/75;return 1+U(-ampl,ampl)}
const robMult=p=>(!p.h||p.temp)?1:1.35-.7*(p.h.c-20)/75;

/* ---------- 4. Cadres de portrait ---------- */
const CADRES=[
  {k:'bois',  nom:'Bois',   min:0, desc:'joueur modeste à son poste'},
  {k:'fer',   nom:'Fer',    min:48,desc:'joueur correct'},
  {k:'bronze',nom:'Bronze', min:56,desc:'bon joueur'},
  {k:'argent',nom:'Argent', min:64,desc:'très bon joueur'},
  {k:'or',    nom:'Or',     min:72,desc:'parmi les meilleurs de la ligue'},
  {k:'mythril',nom:'Mythril',min:80,desc:'un phénomène'}
];
const CADRES_SPE={
  leg:{nom:'Légende',desc:'joueur légendaire, unique dans tout le Wood Bowl'},
  spe:{nom:'Pierre améthyste',desc:'spécialiste : sa spécialité de peuple est au niveau Expert ou Maître. Sa valeur tient à ce talent, plus qu\'à ses notes'},
  atout:{nom:'Pierre émeraude',desc:'atout caché révélé : une note du profil caché est exceptionnelle'},
  brume:{nom:'Pierre de brume',desc:'mystère : ce joueur cache quelque chose d\'exceptionnel, que vous découvrirez en montant de division'}
};
function rangCadre(v){let c=CADRES[0];CADRES.forEach(x=>{if(v>=x.min)c=x});return c}
function cadreDe(S,p,vu){
  const t=rangCadre(notePoste(p,vu||null));
  let s=null;
  if(p.leg)s='leg';
  else if((p.sp||0)>=50)s='spe';
  else if(p.h){const ex=CACHE_IDS.filter(k=>p.h[k]>=85);if(ex.length)s=ex.some(k=>revele(S,k))?'atout':'brume'}
  /* le cadre montre TOUJOURS le niveau ; une pierre au coin signale le reste (la légende garde son cadre doré) */
  return{tier:t,spe:s,cls:s==='leg'?'cad-leg':'cad-'+t.k+(s?' pierre pierre-'+s:'')};
}

/* ---------- 5. La Coupe du Gourdin ---------- */
const TOURS_COUPE=[{apres:2,nom:'Quarts de finale',gain:6},{apres:5,nom:'Demi-finales',gain:12},{apres:8,nom:'Finale',gain:25}];
const COUPE_VICTOIRE=30;
function equipeInvitee(S,id,d,archChoisi){
  const D=DIVS[d],arch=archChoisi!==undefined?archChoisi:ri(0,4),c=CLUBS_IA[arch],n=nomClubDiv(arch,d);
  const T={id,nom:n.nom,court:n.court,couleur:c.couleur,ia:c.ia,rep:c.rep,or:0,pop:40,joueurs:[],dernier:'',staff:{},liste:[],invite:true,div:d};
  c.races.forEach((r,i)=>T.joueurs.push(nouveauJoueur(S,r,ri(D.ia[0],D.ia[1]),{poste:POSTES_DEPART[i]})));
  ROLE_IDS.forEach(r=>{const nv=ri(D.staff[0],D.staff[1]);if(nv>=0)T.staff[r]=nouveauStaff(r,Math.min(3,nv))});
  remiseAZero(T);choisirTitulaires(T);return T;
}
function nouvelleCoupe(S){
  const d=S.div||4;
  const dHaut=Math.max(1,d-1),dBas=d===4?3:Math.min(4,d+1);
  let inv;
  if(S.multi){/* ligue entre amis : tableau à 8 (6 ou 8 clubs) ou à 16 (10 clubs), complété par des invités tous différents */
    const n=S.teams.length,taille=n<=8?8:16;
    const modeles=[];[d,dHaut].forEach(dd=>{for(let a=0;a<5;a++)modeles.push([a,dd])});modeles.sort(()=>R()-.5);
    inv=[];for(let k=0;k<taille-n;k++){const m=modeles[k%modeles.length];inv.push(equipeInvitee(S,101+k,m[1],m[0]))}
  }else inv=[equipeInvitee(S,101,dHaut),equipeInvitee(S,102,dBas===d?dHaut:dBas)];
  /* l'invité ne doit pas porter le nom d'un club de la ligue */
  inv.forEach(T=>{if(S.teams.some(x=>x.court===T.court)){T.nom+=' (réserve)'}});
  const ids=S.teams.map(T=>T.id).concat(inv.map(T=>T.id)).sort(()=>R()-.5);
  S.coupe={invites:inv,tableau:[ids],tours:[],vivant:true,vainqueur:null};
  if(S.multi)S.coupe.plan=planCoupe(ids.length,S.calendrier.length);
  inv.forEach(T=>varierTetes(T));
}
/* les tours de coupe : en solo, toujours quarts, demies, finale après les journées 3, 6 et 9.
   En ligue, on les répartit sur la saison selon sa longueur. */
function planCoupe(taille,nbJournees){
  const noms=taille>8?['Huitièmes de finale','Quarts de finale','Demi-finales','Finale']:['Quarts de finale','Demi-finales','Finale'];
  const gains=taille>8?[4,6,12,25]:[6,12,25];const n=noms.length;let prec=-1;
  return noms.map((nom,k)=>{let ap=Math.floor((k+1)*nbJournees/(n+1));ap=Math.max(prec+1,Math.min(ap,nbJournees-(n-k)));prec=ap;return{apres:ap,nom,gain:gains[k]}});
}
const toursCoupe=S=>(S.coupe&&S.coupe.plan)||TOURS_COUPE;
const equipeCoupe=(S,id)=>id>=100?S.coupe.invites.find(T=>T.id===id):S.teams[id];
function optsCoupe(T){
  const ia=T.ia||{brutal:.2,prudent:.2};const r=R();
  return{consigne:r<ia.brutal?'brutal':r<ia.brutal+ia.prudent?'prudent':'normal',pot:false,marqueAuto:R()<.35,tactique:pick(['equilibre','equilibre','sol','pressing','mur','contre']),pression:true,plan:1,ordresAuto:true};
}
/* prochain tour de coupe pour l'interface (null si rien à venir) */
function prochainTourCoupe(S,M){
  if(!S.coupe||S.phase!=='saison')return null;
  const PLAN=toursCoupe(S),id=M?M.id:0;
  const n=S.coupe.tours.length;if(n>=PLAN.length)return null;
  const t=PLAN[n];const paires=S.coupe.tableau[n];
  const enCourse=paires.includes(id);
  let adv=null;if(enCourse){const i=paires.indexOf(id);adv=equipeCoupe(S,paires[i%2?i-1:i+1])}
  return{tour:t,num:n,journee:t.apres+1,adv,enCourse,maintenant:S.jour===t.apres};
}
/* joue un tour de coupe si la journée le prévoit. Renvoie le résumé pour la gazette. */
function jouerCoupe(S,jour,mes){
  if(!S.coupe)return null;
  const PLAN=toursCoupe(S);
  const n=S.coupe.tours.length;const t=PLAN[n];if(!t||t.apres!==jour)return null;
  const paires=S.coupe.tableau[n],vainqueurs=[],matchs=[];const par={};
  const H=humains(S);
  /* faire tourner l'effectif : les remplaçants démarrent le match de coupe */
  const rots=H.map(moi=>{
    const rot=G(S,moi).choix.coupeRot;const sauve=moi.joueurs.map(p=>p.titulaire);
    if(rot){const d=moi.joueurs.filter(dispo);const bancs=d.filter(p=>!p.titulaire);if(bancs.length){d.forEach(p=>p.titulaire=false);bancs.forEach(p=>p.titulaire=true)}}
    return{moi,rot,sauve};
  });
  const optsDe=T=>estH(T)?Object.assign({},mes[T.id],{pot:false,marque:null,pression:true}):optsCoupe(T);
  for(let i=0;i<paires.length;i+=2){
    const A=equipeCoupe(S,paires[i]),B=equipeCoupe(S,paires[i+1]);
    [A,B].forEach(T=>{if(!estH(T))choisirTitulaires(T)});
    const oA=optsDe(A),oB=optsDe(B);
    let res=simMatch(S,A,B,[oA,oB]);let tab=null;
    let g=res.score[0]>res.score[1]?0:res.score[0]<res.score[1]?1:-1;
    if(g<0){/* séance de tirs au but : la balle et le mental décident */
      const tir=T=>{const{tit}=onzeDe(T);return tit.reduce((s,p)=>s+p.t*(.7+.6*((p.h&&p.h.m)||57)/95),0)};
      let a=0,b=0;for(let k=0;k<5;k++){if(R()<.55+tir(A)/9000)a++;if(R()<.55+tir(B)/9000)b++}
      while(a===b){if(R()<.7)a++;if(R()<.7)b++}
      tab=[a,b];g=a>b?0:1}
    const W=g===0?A:B;vainqueurs.push(W.id);
    const m={a:A.court,b:B.court,ida:A.id,idb:B.id,score:res.score,tab,v:W.id,moi:estH(A)||estH(B)};
    matchs.push(m);
    [A,B].forEach((T,i0)=>{
      if(!estH(T))return;
      const mien=Object.assign({},m,{adv:(i0?A:B).nom,gagne:W===T,
        buts:res.ev.filter(e=>(e.k==='but'||e.k==='penalty'||e.k==='douce')&&e.c===i0).map(e=>e.j),
        blesses:res.ev.filter(e=>(e.k==='blesse'||e.k==='grave'||e.k==='mort')&&e.c!==i0).map(e=>e.v+(e.k==='mort'?' (mort)':e.k==='grave'?' (gravement)':'')),
        rot:!!G(S,T).choix.coupeRot});
      par[T.id]={mien,gain:W===T?Math.round(t.gain*divDe(S).argent):0};
    });
  }
  rots.forEach(({moi,rot,sauve})=>{if(rot)moi.joueurs.forEach((p,i)=>{p.titulaire=sauve[i]})});
  /* les blessures et cartons de coupe comptent dès la prochaine journée de championnat */
  const toutes=S.teams.concat(S.coupe.invites);
  toutes.forEach(T=>{
    T.joueurs.filter(p=>p.mort).forEach(p=>{if(!T.invite){const m={nom:p.nom,club:T.court,saison:S.saison,jour:jour+1,buts:p.buts,race:p.race,tete:p.tete,leg:p.leg,par:p.mortInfo&&p.mortInfo.par,moi:estH(T)};if(S.multi)m.cid=T.id;S.morts.push(m)}if(estH(T))noterDeuil(S,p,jour+1,true,T)});
    T.joueurs=T.joueurs.filter(p=>!p.mort);
    T.joueurs.forEach(p=>{delete p.frais;delete p.frais2});
  });
  S.coupe.tours.push({nom:t.nom,matchs});
  let fin=null;
  if(vainqueurs.length>1)S.coupe.tableau.push(vainqueurs);
  else{
    const W=equipeCoupe(S,vainqueurs[0]);S.coupe.vainqueur=W.court;S.coupe.vainqueurNom=W.nom;
    if(estH(W)){const moi=W,gw=G(S,W);gw.coupes=(gw.coupes||0)+1;par[W.id].gain+=Math.round(COUPE_VICTOIRE*divDe(S).argent);moi.pop=clamp(moi.pop+6,5,100);
      const cap=moi.joueurs.slice().sort((a,b)=>b.sb-a.sb||b.matchs-a.matchs)[0]||{};const e={titre:'Coupe du Gourdin',grand:true,nom:cap.nom||moi.nom,race:cap.race||'humain',tete:cap.tete,poste:cap.poste||'',club:moi.court,couleur:moi.couleur,moi:true,saison:S.saison,detail:'capitaine de l\'équipe victorieuse de la Coupe du Gourdin'};if(S.multi)e.cid=moi.id;S.fame.push(e)}
    fin={vainqueur:W.nom,id:W.id};
  }
  S.teams.forEach(T=>{if(!estH(T)&&!T.invite)choisirTitulaires(T)});
  return{tour:t.nom,matchs,par,libelle:'Coupe du Gourdin : '+(n===PLAN.length-1?'victoire finale':'qualification'),fin};
}
