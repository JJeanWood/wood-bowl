'use strict';
/* ================= WOOD BOWL · LIGUE ENTRE AMIS =================
   Ce fichier s'ajoute au moteur (moteur.js, legendes.js, carriere.js, gazette.js, gazette2.js) : il ne sert qu'en ligue.
   Le serveur est le seul à s'en servir pour faire avancer la partie ; l'appli s'en sert pour vérifier un ordre avant de l'envoyer.

   Vie d'une ligue :
     nouvelleLigue(cfg)                 -> phase « draft », vivier commun, même budget pour tous
     depouillerDraft(S,mises)           -> 1er tour, puis 2e tour court, puis la saison démarre
     depouillerMercato(S,mises)         -> clôture du marché commun avant chaque match
     jouerJournee(S,ordres)             -> (dans moteur.js) joue la journée pour tout le monde
     nouvelleSaison(S)                  -> (dans moteur.js) après l'intersaison
   Entre-temps : appliquerAction(S,T,action) pour la gestion (stade, staff, sponsor…), appliquerEchange(S,e) entre amis.
   Une mise : {club: index du club, joueur: id du joueur, montant: po}. */

const BUDGET_DRAFT=260,VIVIER_PAR_CLUB=12,EFFECTIF_MIN_DRAFT=5,SEUIL_JEUNE=6;
const REGLAGES_LIGUE={budget:BUDGET_DRAFT,vivierParClub:VIVIER_PAR_CLUB,allerSimple:false,legendes:true,caissesVisibles:false};

/* le tiroir de gestion d'un club humain (en solo, tout cela est rangé directement dans S) */
function nouvelleGestion(){
  return{choix:{consigne:'normal',pot:false,marque:null,tactique:'equilibre'},sponsor:null,offresSponsor:offresSponsor(),candidats:candidatsStaff(),
    inter:null,rapport:null,evt:null,histOr:[],deuils:[],dep:0,auto:0};
}

/* ---------- Création ---------- */
/* cfg = {nom, taille (6, 8 ou 10 ; facultatif), reglages, clubs:[{nom, court, couleur, peuple, pseudo}]}
   Les places que les amis n'occupent pas sont prises par l'ordinateur (toujours un nombre pair de clubs, 6 au minimum). */
function nouvelleLigue(cfg){
  cfg=cfg||{};const clubs=cfg.clubs||[];const nH=clubs.length;
  if(nH<1||nH>10)throw new Error('Une ligue compte de 1 à 10 clubs humains.');
  let n=Math.max(6,nH,cfg.taille||0);if(n%2)n++;n=Math.min(10,n);
  const reg=Object.assign({},REGLAGES_LIGUE,cfg.reglages||{});
  const S={v:3,multi:true,nom:cfg.nom||'Ligue des copains',nextId:1,saison:1,jour:0,fini:false,phase:'draft',teams:[],marche:[],morts:[],fame:[],vus:[],opts:{},
    reglages:reg,div:4,divMax:4,calendrier:[],coupe:null,draft:null,mercato:null};
  S._noms=new Set();courant(S);
  const pris=new Set();
  const unique=nom=>{let x=String(nom||'Club').trim().slice(0,28)||'Club',k=2;const b=x;while(pris.has(x.toLowerCase()))x=b+' '+(k++);pris.add(x.toLowerCase());return x};
  CLUBS_IA.forEach(c=>pris.add(c.court.toLowerCase()));
  clubs.forEach((c,i)=>{
    const nom=unique(c.nom);
    const T={id:i,humain:true,nom,court:c.court?String(c.court).slice(0,16):nom,couleur:c.couleur||'#2f5fa8',peuple:RACES[c.peuple]?c.peuple:'humain',pseudo:c.pseudo||'',
      or:reg.budget,pop:35,joueurs:[],dernier:'',staff:{},liste:[],gest:nouvelleGestion()};
    remiseAZero(T);S.teams.push(T);
  });
  const modeles=[0,1,2,3,4].sort(()=>R()-.5);
  for(let i=nH;i<n;i++){
    const arch=modeles[(i-nH)%5],c=CLUBS_IA[arch];
    const T={id:i,humain:false,arch,nom:c.nom,court:c.court,couleur:c.couleur,ia:c.ia,rep:c.rep,or:0,pop:40,joueurs:[],dernier:'',staff:staffIA(),liste:[]};
    /* un peu plus forts qu'en solo : en face, les amis ont choisi leurs joueurs à la draft */
    c.races.forEach((r,k)=>T.joueurs.push(nouveauJoueur(S,r,ri(0,5),{poste:POSTES_DEPART[k]})));
    remiseAZero(T);S.teams.push(T);
  }
  S.teams.forEach(T=>{if(!estH(T)){varierTetes(T);choisirTitulaires(T)}});
  S.draft={tour:1,vivier:vivierDraft(S,nH,reg.vivierParClub),ventes:[]};
  return S;
}

/* ---------- Draft d'ouverture ---------- */
/* prix plancher d'un joueur aux enchères : celui qui est seul à miser paie ce prix */
const plancherDe=p=>p.gratuit?0:Math.max(1,Math.round(valeur(p)*.5*(p.leg?1.6:1)));
/* vivier commun : environ 12 joueurs par club humain, assez de monde à chaque poste, peuples mélangés, aucune légende */
function vivierDraft(S,nH,parClub){
  const gabarit=['Cogneur','Coureur','Passeur','Cogneur','Coureur','Cogneur','Coureur','Passeur','Cogneur','Coureur','Passeur',null];
  const compte={};RACE_IDS.forEach(r=>compte[r]=0);const out=[];
  for(let c=0;c<nH;c++)for(let k=0;k<parClub;k++){
    const poste=gabarit[k%gabarit.length]||pick(POSTE_IDS);const ip=POSTE_IDS.indexOf(poste);
    const race=wpick(RACE_IDS,r=>(AFF[r][ip]/(AFF[r][0]+AFF[r][1]+AFF[r][2]))/(1+compte[r]));compte[race]++;
    const p=nouveauJoueur(S,race,ri(-5,6),{poste,jeune:R()<.2});
    p.plancher=plancherDe(p);out.push(p);
  }
  return out;
}

/* Une mise est-elle recevable ? Renvoie null si oui, sinon la raison (pour l'afficher au joueur avant l'envoi). */
function miseValide(S,T,joueurId,montant){
  const lot=S.phase==='draft'?(S.draft&&S.draft.vivier)||[]:S.marche||[];
  const p=lot.find(x=>x.id===joueurId);
  if(!T||!estH(T))return'Club inconnu.';
  if(!p)return'Ce joueur n\'est plus proposé.';
  if(!Number.isInteger(montant)||montant<0)return'La mise doit être un nombre entier de po.';
  if(montant<plancherDe(p))return'Mise minimale pour ce joueur : '+plancherDe(p)+' po.';
  if(montant>T.or)return'Vous ne pouvez pas miser plus que votre caisse ('+T.or+' po).';
  if(T.joueurs.length>=MAX_EFFECTIF)return'Effectif complet ('+MAX_EFFECTIF+' joueurs) : libérez une place d\'abord.';
  if(S.phase!=='draft'&&huissiers(S,T))return'Les huissiers bloquent vos recrutements.';
  return null;
}

/* Dépouillement d'enchères secrètes.
   - On attribue d'abord le joueur le plus disputé (la plus haute mise), puis le suivant, etc.
   - Une mise ne compte que si, à ce moment-là, le club a encore la somme en caisse et une place dans l'effectif.
   - Le gagnant paie la 2e meilleure offre + 1 po (jamais plus que sa propre mise) ; s'il est seul, le prix plancher.
   - Égalité : le club qui a le moins dépensé l'emporte, puis tirage au sort. */
function depouiller(S,lot,mises){
  const offres={};
  (mises||[]).forEach(m=>{
    if(!m)return;const T=S.teams[m.club],p=lot.find(x=>x.id===m.joueur),montant=Math.floor(Number(m.montant));
    if(!T||!estH(T)||!p||!(montant>=plancherDe(p)))return;
    (offres[p.id]||(offres[p.id]={}))[T.id]=montant; /* une seule mise par club et par joueur : la dernière reçue */
  });
  const restants=lot.slice(),ventes=[];
  const valables=p=>Object.entries(offres[p.id]||{}).map(([id,montant])=>({T:S.teams[+id],montant}))
    .filter(o=>o.T.or>=o.montant&&o.T.joueurs.length<MAX_EFFECTIF&&(S.phase==='draft'||!huissiers(S,o.T)));
  for(;;){
    let best=null;
    restants.forEach(p=>{const v=valables(p);if(!v.length)return;const top=Math.max(...v.map(o=>o.montant));
      if(!best||top>best.top||(top===best.top&&(valeur(p)>valeur(best.p)||(valeur(p)===valeur(best.p)&&p.id<best.p.id))))best={p,v,top}});
    if(!best)break;
    const p=best.p;
    const ordre=best.v.map(o=>Object.assign(o,{dep:G(S,o.T).dep||0,sort:R()})).sort((a,b)=>b.montant-a.montant||a.dep-b.dep||a.sort-b.sort);
    const g=ordre[0],second=ordre[1]||null;
    let prix=Math.min(g.montant,second?second.montant+1:plancherDe(p));
    const remise=kk(g.T,'chin','remise');if(remise&&prix>1)prix=Math.max(1,Math.round(prix*(1-remise/100)));
    const T=g.T;T.or-=prix;G(S,T).dep=(G(S,T).dep||0)+prix;
    delete p.vuPar;delete p.plancher;delete p.vu;delete p.coeur;p.titulaire=false;p.entr='repos';if(!p.gratuit)p.sal=salaire(p);
    T.joueurs.push(p);varierTetes(T,p);
    restants.splice(restants.indexOf(p),1);
    ventes.push({id:p.id,nom:p.nom,race:p.race,poste:p.poste,tete:p.tete,club:T.id,clubNom:T.court,prix,mise:g.montant,nb:ordre.length,second:second?{club:second.T.id,clubNom:second.T.court}:null});
  }
  return{ventes,invendus:restants.map(p=>p.id)};
}

/* Clôture d'un tour de draft. Après le 2e tour : les clubs trop courts reçoivent des jeunes du pays, puis la saison démarre. */
function depouillerDraft(S,mises){
  if(S.phase!=='draft'||!S.draft)return null;
  courant(S);const D=S.draft;
  const r=depouiller(S,D.vivier,mises);r.tour=D.tour;
  D.vivier=D.vivier.filter(p=>r.invendus.includes(p.id));
  D.ventes=D.ventes.concat(r.ventes.map(v=>({id:v.id,nom:v.nom,club:v.club,prix:v.prix,tour:D.tour})));
  if(D.tour===1){D.tour=2;r.fin=false;return r}
  r.jeunes=[];
  humains(S).forEach(T=>{
    let garde=0;
    while((T.joueurs.length<EFFECTIF_MIN_DRAFT||postesManquants(T).length)&&T.joueurs.length<MAX_EFFECTIF&&garde++<8){
      const y=jeuneDuPays(S,T.peuple);const manque=postesManquants(T);if(manque.length)y.poste=manque[0];
      delete y.gratuit;y.titulaire=false;T.joueurs.push(y);varierTetes(T,y);r.jeunes.push({id:y.id,nom:y.nom,club:T.id});
    }
  });
  demarrerSaison(S);r.fin=true;return r;
}
function demarrerSaison(S){
  S.phase='saison';S.jour=0;S.fini=false;S.draft=null;
  S.calendrier=calendrierSaison(S);
  humains(S).forEach(T=>{G(S,T).dep=0;choisirTitulaires(T);T.joueurs.forEach(p=>{p.entr=conseilEntr(p)})});
  nouvelleCoupe(S);
  S.marche=marcheCommun(S);
  delete S._noms;
  preparerJournee(S);
}

/* ---------- Marché commun ---------- */
/* Chaque club voit les notes à travers son propre chineur (p.vuPar[id du club]) ; les vraies notes ne sortent pas du serveur. */
function marcheCommun(S){
  const H=humains(S);let n=clamp(H.length+3,6,12);if(S.phase==='inter')n=Math.min(16,n+Math.ceil(H.length/2));
  const out=[];
  for(let i=0;i<n;i++)out.push(nouveauJoueur(S,pick(RACE_IDS),ri(-3,3)+divDe(S).marche,{poste:i<3?POSTE_IDS[i]:pick(POSTE_IDS),jeune:R()<.25}));
  /* pas de légende au départ : elles n'apparaissent, rarement, qu'à partir de la mi-saison de la première année */
  const tard=S.saison>1||S.phase==='inter'||S.jour>=Math.ceil((S.calendrier||[]).length/2);
  if(S.reglages&&S.reglages.legendes!==false&&tard&&R()<.05){const L=tirerLegende(S);if(L)out.push(L)}
  out.forEach(p=>{
    p.plancher=plancherDe(p);p.vuPar={};
    H.forEach(T=>{const b=kk(T,'chin','bruit');const v={};STATS.forEach(k=>{v[k]=clamp(p[k]+ri(-b,b),10,99)});v.m=Math.max(0,marge(p)+ri(-Math.ceil(b/2),Math.ceil(b/2)));p.vuPar[T.id]=v});
  });
  return out;
}
/* Clôture du mercato : dépouillement, puis le centre de formation dépanne les clubs trop courts. Le marché rouvre après le match. */
function depouillerMercato(S,mises){
  if(S.phase!=='saison'&&S.phase!=='inter')return null;
  courant(S);
  const r=depouiller(S,S.marche||[],mises);r.jeunes=[];
  humains(S).forEach(T=>{
    if(T.joueurs.filter(p=>!p.mort).length<SEUIL_JEUNE){
      const y=jeuneDuPays(S,T.peuple);const manque=postesManquants(T);if(manque.length)y.poste=manque[0];
      delete y.gratuit;y.titulaire=false;y.entr=conseilEntr(y);T.joueurs.push(y);varierTetes(T,y);r.jeunes.push({id:y.id,nom:y.nom,club:T.id});
    }
  });
  S.marche=[];
  S.mercato={saison:S.saison,jour:S.jour,ventes:r.ventes,jeunes:r.jeunes};
  return r;
}

/* ---------- Ordres d'avant-match ---------- */
/* Absent : composition automatique, entraînement conseillé, consigne normale. */
function piloteAuto(S,T){
  const g=G(S,T);choisirTitulaires(T);
  T.joueurs.forEach(p=>{p.entr=p.forme<55?'repos':conseilEntr(p)});
  Object.assign(g.choix,{consigne:'normal',tactique:'equilibre',pot:false,marque:null,ordres:{},coupeRot:false});
  g.auto=(g.auto||0)+1;
}
/* o = {titulaires:[ids], banc:[ids dans l'ordre d'entrée], entr:{id:'f'|'v'|'t'|'sp'|'repos'}, consigne, tactique, pot, marque,
        ordres:{id du joueur:{k:'cible'|'garde', id}}, coupeRot}
   Tout est vérifié : un ordre impossible est ignoré, jamais bloquant. Sans ordres du tout : pilote automatique. */
function appliquerOrdres(S,T,o){
  const g=G(S,T);
  if(!o||typeof o!=='object'){piloteAuto(S,T);return{auto:true}}
  g.auto=0;
  const ids=new Set(T.joueurs.map(p=>p.id));
  if(Array.isArray(o.titulaires)){
    const tit=o.titulaires.filter(id=>ids.has(id)).slice(0,5);
    const banc=Array.isArray(o.banc)?o.banc.filter(id=>ids.has(id)&&!tit.includes(id)):null;
    T.joueurs.forEach(p=>{p.titulaire=tit.includes(p.id);delete p.auBanc;if(banc&&!p.titulaire&&!banc.includes(p.id))p.auBanc=true});
    if(banc){const rang=p=>p.titulaire?-1:(banc.indexOf(p.id)<0?99:banc.indexOf(p.id));
      T.joueurs=T.joueurs.map((p,i)=>[p,i]).sort((a,b)=>rang(a[0])-rang(b[0])||a[1]-b[1]).map(x=>x[0])}
  }else choisirTitulairesSiVide(T);
  if(o.entr&&typeof o.entr==='object')T.joueurs.forEach(p=>{const e=o.entr[p.id];if(e&&ENTR[e])p.entr=(e!=='repos'&&p[e]>=p.cap[e])?conseilEntr(p):e});
  const c=g.choix;
  if(['prudent','normal','brutal'].includes(o.consigne))c.consigne=o.consigne;
  if(o.tactique&&TACTIQUES[o.tactique])c.tactique=o.tactique;
  c.pot=!!o.pot&&T.or>=COUT_POT&&!huissiers(S,T);
  const pm=prochainMatch(S,T);
  c.marque=(o.marque&&pm&&pm.adv.joueurs.some(p=>p.id===o.marque))?o.marque:null;
  c.ordres={};
  if(o.ordres&&typeof o.ordres==='object')Object.entries(o.ordres).forEach(([id,x])=>{if(x&&(x.k==='cible'||x.k==='garde')&&ids.has(+id)&&Number.isInteger(x.id))c.ordres[id]={k:x.k,id:x.id}});
  c.coupeRot=!!o.coupeRot;
  return{auto:false};
}

/* ---------- Gestion du club ---------- */
/* Une action de gestion d'un club humain. Renvoie {ok:true,msg} ou {erreur:'…'}.
   stade {id} · embaucher {role,i} · licencier {role} · sponsor {id} · evenement {oui} · soigner {id} · renvoyer {id}
   pret {id} (prêt d'urgence) · funerailles {i} · arrivee {i,oui} · lister {id} · offres · offre {i}
   echangeIA {cible,donne:[ids],po} (avec un club de l'ordinateur, à l'intersaison) */
function appliquerAction(S,T,a){
  if(!T||!estH(T)||!a)return{erreur:'Action inconnue.'};
  courant(S);const g=G(S,T);const ko=m=>({erreur:m}),ok=m=>({ok:true,msg:m||null});
  switch(a.k){
    case'stade':{if(!STADE[a.id])return ko('Installation inconnue.');const e=ameliorerStade(S,a.id,T);return e?ko(e):ok()}
    case'embaucher':{const c=g.candidats&&g.candidats[a.role]&&g.candidats[a.role][a.i];if(!c)return ko('Ce candidat n\'est plus disponible.');
      if(T.or<c.prime)return ko('Il vous faut '+c.prime+' po.');if(huissiers(S,T))return ko('Les huissiers bloquent les embauches.');
      T.or-=c.prime;T.staff[a.role]=c;g.candidats[a.role]=g.candidats[a.role].filter(x=>x!==c);
      if(a.role==='strat'&&S.phase==='saison'&&!S.fini)preparerRapport(S,T);
      return ok(c.nom+' rejoint le staff.')}
    case'licencier':{if(!T.staff[a.role])return ko('Ce poste est déjà vacant.');delete T.staff[a.role];if(a.role==='strat')g.rapport=null;return ok()}
    case'sponsor':{if(g.sponsor)return ko('Vous avez déjà un sponsor pour cette saison.');if(!(g.offresSponsor||[]).includes(a.id))return ko('Cette offre n\'existe plus.');g.sponsor=a.id;return ok()}
    case'evenement':{if(!g.evt)return ko('Rien à décider pour l\'instant.');const m=resoudreEvenement(S,!!a.oui,T);return ok(m)}
    case'soigner':{const p=T.joueurs.find(x=>x.id===a.id);if(!p||!(p.blesse>0))return ko('Ce joueur n\'est pas blessé.');if(T.or<COUT_SOIN)return ko('Il vous faut '+COUT_SOIN+' po.');T.or-=COUT_SOIN;p.blesse--;return ok()}
    case'renvoyer':{const p=T.joueurs.find(x=>x.id===a.id);if(!p||p.pret)return ko('Joueur introuvable.');if(T.joueurs.length<=MIN_EFFECTIF)return ko('Il vous faut au moins '+MIN_EFFECTIF+' joueurs.');
      const po=Math.round(valeur(p)*.4);T.or+=po;T.joueurs=T.joueurs.filter(x=>x!==p);T.liste=(T.liste||[]).filter(i=>i!==p.id);return ok(p.nom+' quitte le club (+'+po+' po).')}
    case'pret':{const e=emprunterJoueur(S,a.id,T);return e?ko(e):ok()}
    case'funerailles':{const d=(g.deuils||[])[a.i];if(!d||d.fun)return ko('Hommage déjà rendu.');if(T.or<10)return ko('Il vous faut 10 po.');T.or-=10;T.pop=clamp(T.pop+3,5,100);d.vu=true;d.fun=true;return ok()}
    case'arrivee':{if(S.phase!=='inter'||!g.inter)return ko('Ce n\'est pas l\'intersaison.');const m=reponseArrivee(S,a.i,!!a.oui,T);return ok(m)}
    case'lister':{if(S.phase!=='inter'||!g.inter)return ko('Ce n\'est pas l\'intersaison.');if(!T.joueurs.some(p=>p.id===a.id))return ko('Joueur introuvable.');
      const i=T.liste.indexOf(a.id);if(i>=0)T.liste.splice(i,1);else T.liste.push(a.id);g.inter.recues=g.inter.recues.filter(o=>o.veut!==a.id);return ok()}
    case'offres':{if(S.phase!=='inter'||!g.inter)return ko('Ce n\'est pas l\'intersaison.');offresRecues(S,T);return ok()}
    case'offre':{if(S.phase!=='inter'||!g.inter)return ko('Ce n\'est pas l\'intersaison.');const e=accepterOffre(S,a.i,T);return e?ko(e):ok()}
    case'echangeIA':{if(S.phase!=='inter'||!g.inter)return ko('Ce n\'est pas l\'intersaison.');
      const donne=Array.isArray(a.donne)?a.donne.filter(id=>T.joueurs.some(p=>p.id===id)):[];const po=Math.max(0,Math.floor(Number(a.po)||0));
      const r=proposerEchange(S,a.cible,donne,po,T);if(r.statut!=='oui')return{erreur:r.msg,reponse:r};
      executerEchange(S,a.cible,donne,po,T);return ok(r.msg)}
  }
  return ko('Action inconnue.');
}

/* ---------- Échange entre deux amis ---------- */
/* e = {de, vers, donne:{joueurs:[ids], po}, recoit:{joueurs:[ids], po}} : « de » donne, « vers » donne en retour.
   À appeler quand « vers » a accepté. Renvoie null si l'échange est fait, sinon la raison du refus. */
function appliquerEchange(S,e){
  const A=S.teams[e.de],B=S.teams[e.vers];
  if(!A||!B||A===B||!estH(A)||!estH(B))return'Échange impossible entre ces clubs.';
  const liste=(T,x)=>{const ids=(x&&Array.isArray(x.joueurs)?x.joueurs:[]);const L=T.joueurs.filter(p=>ids.includes(p.id)&&!p.pret&&!p.mercenaire);return L.length===new Set(ids).size?L:null};
  const dA=liste(A,e.donne),dB=liste(B,e.recoit);
  if(!dA||!dB)return'Un des joueurs n\'est plus dans son club.';
  const poA=Math.max(0,Math.floor(Number(e.donne&&e.donne.po)||0)),poB=Math.max(0,Math.floor(Number(e.recoit&&e.recoit.po)||0));
  if(!dA.length&&!dB.length)return'Il faut au moins un joueur dans l\'échange.';
  if(poA>Math.max(0,A.or)||poB>Math.max(0,B.or))return'La caisse ne suffit pas.';
  const nA=A.joueurs.length-dA.length+dB.length,nB=B.joueurs.length-dB.length+dA.length;
  if(nA>MAX_EFFECTIF||nB>MAX_EFFECTIF)return'Un effectif dépasserait '+MAX_EFFECTIF+' joueurs.';
  if(nA<MIN_EFFECTIF||nB<MIN_EFFECTIF)return'Un effectif tomberait sous '+MIN_EFFECTIF+' joueurs.';
  courant(S);
  A.joueurs=A.joueurs.filter(p=>!dA.includes(p)).concat(dB);B.joueurs=B.joueurs.filter(p=>!dB.includes(p)).concat(dA);
  dA.concat(dB).forEach(p=>{p.titulaire=false;delete p.auBanc;p.entr='repos';p.sal=salaire(p)});
  A.or+=poB-poA;B.or+=poA-poB;
  [A,B].forEach(T=>{T.liste=(T.liste||[]).filter(id=>T.joueurs.some(p=>p.id===id));const c=G(S,T).choix;if(c.ordres)c.ordres={};choisirTitulairesSiVide(T)});
  dB.forEach(p=>varierTetes(A,p));dA.forEach(p=>varierTetes(B,p));
  (S.echanges||(S.echanges=[])).push({saison:S.saison,jour:S.jour,de:A.id,vers:B.id,donne:dA.map(p=>p.nom),recoit:dB.map(p=>p.nom),po:poA-poB});
  if(S.echanges.length>30)S.echanges.shift();
  return null;
}

/* ---------- Ce que chacun a le droit de voir ---------- */
/* L'état complet ne quitte jamais le serveur. vuePour(S,id) en fait la copie destinée au club n° id (ou à un simple spectateur : id = -1) :
   - le profil caché (mental, régularité, robustesse) disparaît partout ; seule reste la pierre de brume ;
   - les intentions de l'ordinateur, la gestion, la composition et l'entraînement des autres clubs humains sont retirés ;
   - au marché, chacun ne voit que l'estimation de son propre chineur. */
function vuePour(S,id){
  const V=JSON.parse(JSON.stringify(S));
  const cacher=p=>{if(!p)return;if(p.h){if(CACHE_IDS.some(k=>p.h[k]>=85))p.brume=true;delete p.h}if(p.mortInfo)delete p.mortInfo.rob};
  delete V.opts;delete V.memo;delete V._recents;delete V.srv; /* srv contient la graine du hasard : elle ne sort pas du serveur */
  V.teams.forEach(T=>{
    T.joueurs.forEach(cacher);
    if(T.humain&&T.id!==id){
      delete T.gest;if(!(V.reglages&&V.reglages.caissesVisibles))delete T.or;
      T.joueurs.forEach(p=>{delete p.entr;delete p.titulaire;delete p.auBanc;delete p.gain});
    }
    if(T.gest){const g=T.gest;if(g.evt&&g.evt.p&&typeof g.evt.p==='object')cacher(g.evt.p);
      if(g.inter&&g.inter.arrivees)g.inter.arrivees.forEach(a=>{if(a.p&&typeof a.p==='object')cacher(a.p)});
      if(g.prets&&g.prets.liste)g.prets.liste.forEach(cacher);(g.deuils||[]).forEach(d=>{if(d.info)delete d.info.rob})}
  });
  if(V.coupe&&V.coupe.invites)V.coupe.invites.forEach(T=>T.joueurs.forEach(cacher));
  if(V.draft&&V.draft.vivier)V.draft.vivier.forEach(cacher);
  V.marche=(V.marche||[]).map(p=>{
    const vu=(p.vuPar&&p.vuPar[id])||null;cacher(p);
    const q={id:p.id,nom:p.nom,sexe:p.sexe,race:p.race,poste:p.poste,trait:p.trait,tete:p.tete,age:p.age,jeune:p.jeune,leg:p.leg,pv:p.pv,brume:p.brume,sp:p.sp,forme:p.forme,plancher:p.plancher,vu};
    if(p.leg){q.f=p.f;q.v=p.v;q.t=p.t} /* une légende est connue de tous */
    return q;
  });
  V.moi=id;
  return V;
}

/* ce que le serveur range pour un club : sa propre équipe (avec sa gestion) et le marché vu par son chineur */
function vueClub(S,id){const V=vuePour(S,id);return{club:V.teams[id]||null,marche:V.marche}}

/* ---------- Vie de la ligue : départs, reprises, happenings ---------- */
/* un ami quitte la ligue (ou en est exclu) : son club continue, dirigé par l'ordinateur */
function clubVersIA(S,T){
  if(!T||!estH(T))return'Ce club est déjà dirigé par l\'ordinateur.';
  const n={};T.joueurs.forEach(p=>{n[p.race]=(n[p.race]||0)+1});
  const race=Object.keys(n).sort((a,b)=>n[b]-n[a])[0]||T.peuple||'humain';
  let arch=CLUBS_IA.findIndex(c=>c.races[0]===race);if(arch<0)arch=3;
  T.humain=false;T.arch=arch;T.ia=IA_NEUTRE;T.ancienPseudo=T.pseudo||'';T.pseudo='';delete T.gest;T.liste=[];
  choisirTitulaires(T);
  if(S.phase==='saison'&&!S.fini){const pm=S.calendrier[S.jour].some(m=>m.includes(T.id));if(pm)S.opts[T.id]=optsIA(S,T.id);T.iaEntr=iaEntrainement(T)}
  return null;
}
/* un nouvel ami reprend un club dirigé par l'ordinateur (seulement un ancien club d'ami, ou n'importe lequel si le commissaire le veut) */
function clubVersHumain(S,T,pseudo){
  if(!T||estH(T))return'Ce club a déjà un propriétaire.';
  T.humain=true;T.pseudo=pseudo||'';if(!T.peuple){const c=archDe(T);T.peuple=c?c.races[0]:'humain'}
  delete T.arch;delete T.ia;delete T.iaEntr;T.gest=nouvelleGestion();if(T.or<30)T.or=30;
  if(S.opts)delete S.opts[T.id];
  if(S.phase==='saison'&&!S.fini)preparerRapport(S,T);
  return null;
}
/* Happening lancé par le créateur du jeu pour un club précis. Il remplace le rebondissement en attente de ce club.
   h = {k:'veteran'|'mercenaire'|'collecte'|'guerisseur'|'transfuge'|'mecene'|'banquier'}  (un rebondissement du jeu, forcé)
   ou {k:'don', po, titre, texte}  (un cadeau, avec votre texte)
   ou {k:'joueur', titre, texte, joueur:{nom, sexe, race, poste, f, v, t, sp, trait, age, tete, prime}}  (un joueur sur mesure frappe à la porte) */
function happening(S,T,h){
  if(!T||!estH(T)||!h)return'Club inconnu.';
  if(S.phase!=='saison'||S.fini)return'Les happenings se déclenchent pendant la saison.';
  courant(S);const g=G(S,T);
  if(h.k==='don'){const po=clamp(Math.floor(Number(h.po)||0),1,500);
    g.evt={k:'collecte',titre:String(h.titre||'Un cadeau tombé du ciel').slice(0,80),po,texte:String(h.texte||('Un bienfaiteur anonyme vous offre '+po+' po.')).slice(0,600),oui:'Accepter les '+po+' po',non:'Refuser',perso:true};return null}
  if(h.k==='joueur'){const j=h.joueur||{};if(!RACES[j.race]||!POSTES[j.poste]||!j.nom)return'Il faut au moins un nom, un peuple et un poste.';
    const p=nouveauJoueur(S,j.race,6,{poste:j.poste,sexe:j.sexe==='f'?'f':'m',trait:TRAITS[j.trait]?j.trait:'aucun'});
    p.nom=String(j.nom).slice(0,40);(S._sexe||(S._sexe={}))[p.nom]=p.sexe;
    STATS.forEach(k=>{if(Number.isFinite(j[k])){p[k]=clamp(Math.round(j[k]),15,97);p.cap[k]=clamp(Math.max(p.cap[k],p[k]+3),p[k],99)}});
    if(Number.isFinite(j.sp)){p.sp=clamp(Math.round(j.sp),0,95);p.cap.sp=clamp(Math.max(p.cap.sp,p.sp+5),p.sp,99)}
    if(Number.isFinite(j.age))p.age=clamp(Math.round(j.age),16,40);if(typeof j.tete==='string')p.tete=j.tete;
    p.perso=true;p.sal=salaire(p);const prime=clamp(Math.floor(Number(j.prime)||0),0,500);
    g.evt={k:'invite',titre:String(h.titre||'On frappe à la porte du club').slice(0,80),p,cout:prime,texte:String(h.texte||(p.nom+' veut jouer pour vous.')).slice(0,600),oui:prime?'Signer pour '+prime+' po':'L\'accueillir',non:'Refuser',perso:true};return null}
  if(!EVTS[h.k])return'Happening inconnu.';
  const e=EVTS[h.k].cree(S,T);if(!e)return'Ce happening n\'a pas de sens pour ce club en ce moment.';
  g.evt=Object.assign({k:h.k,titre:EVTS[h.k].titre},e);return null;
}
if(typeof module!=='undefined')module.exports={};
