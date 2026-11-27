/* Simulation d'une ligue entre « faux amis » : node multijoueur/test_ligue.js [dossier du jeu]
   Vérifie que le moteur de ligue tourne sans erreur de 6 à 10 clubs, qu'il est déterministe (même graine = même résultat),
   que les comptes sont justes, et que la vue envoyée à chaque joueur ne contient rien de secret. */
const fs=require('fs');
const dir=process.argv[2]||'.';
const FICHIERS=['moteur.js','legendes.js','carriere.js','gazette.js','gazette2.js','ligue.js'];
function moteur(){return new Function(FICHIERS.map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('\n')+
  '\nreturn {nouvelleLigue,depouillerDraft,depouillerMercato,jouerJournee,nouvelleSaison,appliquerAction,appliquerEchange,miseValide,vuePour,plancherDe,valeur,classement,humains,estH,G,dispo,prochainMatch,conseilEntr,toursCoupe,graine,MAX_EFFECTIF,MIN_EFFECTIF,STADE_IDS,ROLE_IDS,TACTIQUE_IDS,setR:f=>{R=f}};')()}
let erreurs=0;const verifier=(c,msg)=>{if(!c){erreurs++;if(erreurs<=25)console.log('  ✗',msg)}};
const NOMS=['Juju','Hugo','Léa','Sam','Inès','Tom','Zoé','Max','Nina','Paul'];
const PEUPLES=['humain','orque','nain','elfe','elfenoir','gobelin'];

function partie(E,seed,nH,taille,o){
  o=o||{};
  E.setR(E.graine(seed));
  const alea=E.graine(seed*977+5); /* le hasard des « faux amis », séparé de celui du jeu */
  const ri=(a,b)=>a+Math.floor(alea()*(b-a+1)),pick=a=>a[Math.floor(alea()*a.length)];
  const S=E.nouvelleLigue({nom:'Test',taille,reglages:{allerSimple:!!o.allerSimple},clubs:NOMS.slice(0,nH).map((n,i)=>({nom:'FC '+n,pseudo:n,peuple:PEUPLES[i%6],couleur:'#123456'}))});
  const H=E.humains(S);
  verifier(S.teams.length%2===0&&S.teams.length>=6&&S.teams.length<=10,'nombre de clubs pair entre 6 et 10 : '+S.teams.length);
  verifier(S.draft.vivier.length===nH*12,'vivier de 12 joueurs par club');
  verifier(!S.draft.vivier.some(p=>p.leg),'pas de légende dans la draft');
  const budget=S.reglages.budget;
  /* --- draft : chaque faux ami mise sur une douzaine de joueurs, parfois trop --- */
  const misesDraft=tour=>{const M=[];H.forEach(T=>{const lot=S.draft.vivier.slice().sort(()=>alea()-.5).slice(0,tour===1?ri(8,14):ri(2,6));
    lot.forEach(p=>{const m=Math.round(E.plancherDe(p)*(1+alea()*1.6));M.push({club:T.id,joueur:p.id,montant:m})})});
    M.push({club:99,joueur:1,montant:50},{club:0,joueur:-4,montant:50},{club:0,joueur:S.draft.vivier[0].id,montant:'abc'},{club:S.teams.length-1,joueur:S.draft.vivier[0].id,montant:1e9});return M};
  const orAvant=H.map(T=>T.or);
  const r1=E.depouillerDraft(S,misesDraft(1));
  verifier(r1&&r1.fin===false&&S.phase==='draft'&&S.draft.tour===2,'après le 1er tour, on passe au 2e');
  r1.ventes.forEach(v=>verifier(v.prix<=v.mise&&v.prix>=1,'prix payé ≤ mise ('+v.prix+' / '+v.mise+')'));
  const r2=E.depouillerDraft(S,misesDraft(2));
  verifier(r2.fin===true&&S.phase==='saison','la saison démarre après le 2e tour');
  H.forEach((T,i)=>{
    verifier(T.or>=0&&T.or<=budget,'caisse après draft entre 0 et le budget : '+T.or);
    verifier(T.joueurs.length>=5&&T.joueurs.length<=E.MAX_EFFECTIF,'effectif après draft entre 5 et 8 : '+T.joueurs.length);
    const paye=r1.ventes.concat(r2.ventes).filter(v=>v.club===T.id).reduce((s,v)=>s+v.prix,0);
    verifier(orAvant[i]-paye===T.or,'comptes de la draft justes pour '+T.nom);
  });
  const nJ=S.calendrier.length,nT=S.teams.length;
  verifier(nJ===(o.allerSimple?nT-1:2*(nT-1)),'nombre de journées : '+nJ);
  const plan=E.toursCoupe(S);verifier(plan[plan.length-1].apres<nJ&&plan.every((t,k)=>!k||t.apres>plan[k-1].apres),'tours de coupe placés dans la saison : '+plan.map(t=>t.apres).join(','));
  verifier(S.coupe.tableau[0].length===(nT<=8?8:16),'tableau de coupe à 8 ou 16');
  /* --- saisons --- */
  let nbAuto=0,nbVentes=0,nbEchanges=0,nbActions=0;
  for(let saison=0;saison<(o.saisons||2);saison++){
    while(S.phase==='saison'&&!S.fini){
      /* mercato */
      const M=[];H.forEach(T=>{if(alea()<.6)S.marche.slice().sort(()=>alea()-.5).slice(0,ri(1,3)).forEach(p=>{const m=Math.round(E.plancherDe(p)*(1+alea()*.8));const e=E.miseValide(S,T,p.id,m);if(!e||alea()<.2)M.push({club:T.id,joueur:p.id,montant:m})})});
      const av=H.map(T=>T.or);const rm=E.depouillerMercato(S,M);nbVentes+=rm.ventes.length;
      H.forEach((T,i)=>{const paye=rm.ventes.filter(v=>v.club===T.id).reduce((s,v)=>s+v.prix,0);verifier(av[i]-paye===T.or,'comptes du mercato justes');verifier(T.joueurs.length<=E.MAX_EFFECTIF,'effectif ≤ 8 après mercato')});
      verifier(S.marche.length===0,'marché fermé après dépouillement');
      /* gestion */
      H.forEach(T=>{const g=E.G(S,T);
        if(!g.sponsor&&g.offresSponsor.length){const r=E.appliquerAction(S,T,{k:'sponsor',id:pick(g.offresSponsor)});verifier(r.ok,'signature du sponsor');nbActions++}
        if(g.evt&&alea()<.7){E.appliquerAction(S,T,{k:'evenement',oui:alea()<.7});nbActions++}
        if(alea()<.15){E.appliquerAction(S,T,{k:'stade',id:pick(E.STADE_IDS)});nbActions++}
        if(alea()<.12){E.appliquerAction(S,T,{k:'embaucher',role:pick(E.ROLE_IDS),i:ri(0,2)});nbActions++}
        if(alea()<.05){const p=pick(T.joueurs);E.appliquerAction(S,T,{k:'renvoyer',id:p.id});nbActions++}
        const bl=T.joueurs.find(p=>p.blesse>0);if(bl&&alea()<.3)E.appliquerAction(S,T,{k:'soigner',id:bl.id});
        if(T.joueurs.filter(E.dispo).length<5){E.appliquerAction(S,T,{k:'pret',id:(g.prets&&g.prets.liste[0]||{}).id});const L=E.G(S,T).prets;if(L&&L.liste[0])E.appliquerAction(S,T,{k:'pret',id:L.liste[0].id})}
        verifier(E.appliquerAction(S,T,{k:'nimporte'}).erreur,'action inconnue refusée');
      });
      /* un échange entre amis de temps en temps */
      if(H.length>=2&&alea()<.15){const A=pick(H),B=pick(H.filter(x=>x!==A));const e=E.appliquerEchange(S,{de:A.id,vers:B.id,donne:{joueurs:[pick(A.joueurs).id],po:ri(0,5)},recoit:{joueurs:[pick(B.joueurs).id],po:0}});if(!e)nbEchanges++}
      /* ordres : certains absents, certains avec des ordres farfelus */
      const O={};H.forEach(T=>{const x=alea();if(x<.2)return;nbAuto+=0;
        const d=T.joueurs.filter(E.dispo).sort(()=>alea()-.5);const pm=E.prochainMatch(S,T);
        O[T.id]={titulaires:d.slice(0,5).map(p=>p.id).concat(x>.9?[12345,-1]:[]),banc:d.slice(5).map(p=>p.id),
          entr:Object.fromEntries(T.joueurs.map(p=>[p.id,p.forme<55?'repos':pick(['f','v','t','sp',E.conseilEntr(p)])])),
          consigne:pick(['prudent','normal','brutal','nawak']),tactique:pick(E.TACTIQUE_IDS.concat(['bidon'])),pot:alea()<.15,marque:alea()<.3?pick(pm.adv.joueurs).id:null,
          ordres:alea()<.3&&d[0]?{[d[0].id]:{k:'cible',id:pick(pm.adv.joueurs).id},999:{k:'garde',id:1}}:{},coupeRot:alea()<.2}});
      const jourAvant=S.jour,ptsAvant=S.teams.reduce((s,T)=>s+T.j,0);
      const out=E.jouerJournee(S,O);
      verifier(out&&out.par&&out.commune,'la journée renvoie les gazettes');
      verifier(S.teams.reduce((s,T)=>s+T.j,0)===ptsAvant+nT||S.phase==='inter','chaque club a joué un match');
      H.forEach(T=>{const g=out.par[T.id];verifier(g&&g.article&&g.article.paras.length&&g.analyse.length&&Array.isArray(g.comptes),'gazette complète pour '+T.nom);
        verifier(Number.isFinite(T.or)&&Number.isFinite(T.pop),'caisse et ferveur valides');
        verifier(g.solde===T.or||!!g.final,'solde de la gazette = caisse');
        verifier(g.mini.some(m=>m.moi),'le club se voit au classement de sa gazette');
        if(!O[T.id])nbAuto++;
        T.joueurs.forEach(p=>['f','v','t','forme','sal'].forEach(k=>verifier(Number.isFinite(p[k]),'note valide '+k)))});
      verifier(out.commune.matchs.length===nT/2&&out.commune.matchs.every(m=>m.titre&&m.paras.length),'édition commune : un article par match');
      /* deux amis qui s'affrontent lisent le même récit */
      const duel=S.calendrier[jourAvant].find(([h,a])=>E.estH(S.teams[h])&&E.estH(S.teams[a]));
      if(duel)verifier(out.par[duel[0]].article.titre===out.par[duel[1]].article.titre&&out.par[duel[0]].article.paras.map(p=>p.t).join()===out.par[duel[1]].article.paras.map(p=>p.t).join(),'même article pour les deux adversaires');
      verifier(S.phase!=='saison'||S.jour===jourAvant+1,'la journée avance');
    }
    verifier(S.phase==='inter','intersaison atteinte');
    H.forEach(T=>{const I=E.G(S,T).inter;verifier(I&&Array.isArray(I.arrivees)&&I.carriere&&Array.isArray(I.carriere.retraites),'intersaison prête pour '+T.nom);
      for(let k=0;k<3&&I.arrivees.length;k++)E.appliquerAction(S,T,{k:'arrivee',i:0,oui:alea()<.5});
      if(T.joueurs.length>5){E.appliquerAction(S,T,{k:'lister',id:T.joueurs[T.joueurs.length-1].id});E.appliquerAction(S,T,{k:'offres'});if(I.recues.length&&alea()<.5)E.appliquerAction(S,T,{k:'offre',i:0})}
      const ia=S.teams.find(X=>!E.estH(X));if(ia&&alea()<.5)E.appliquerAction(S,T,{k:'echangeIA',cible:ia.joueurs[0].id,donne:[T.joueurs[0].id],po:ri(0,20)});
      const g=E.G(S,T);if(g.offresSponsor.length)E.appliquerAction(S,T,{k:'sponsor',id:g.offresSponsor[0]})});
    E.depouillerMercato(S,H.map(T=>({club:T.id,joueur:(S.marche[T.id%Math.max(1,S.marche.length)]||{}).id,montant:30})));
    H.forEach(T=>verifier(T.joueurs.length>=E.MIN_EFFECTIF&&T.joueurs.length<=E.MAX_EFFECTIF,'effectif entre 5 et 8 à l\'intersaison : '+T.joueurs.length+' ('+T.nom+')'));
    E.nouvelleSaison(S);
    verifier(S.phase==='saison'&&S.jour===0&&S.teams.every(T=>T.j===0),'nouvelle saison lancée');
  }
  /* --- secret : la vue d'un joueur ne contient ni profil caché, ni ordres, ni gestion des autres --- */
  const V=E.vuePour(S,0),txt=JSON.stringify(V);
  verifier(!/"h":\{"m":/.test(txt),'aucun profil caché dans la vue');
  verifier(!('opts' in V),'intentions de l\'ordinateur absentes de la vue');
  verifier(V.teams.every(T=>!T.humain||T.id===0||(!T.gest&&T.or===undefined&&T.joueurs.every(p=>p.entr===undefined&&p.titulaire===undefined))),'gestion, caisse et composition des autres amis absentes de la vue');
  verifier(V.teams[0].gest&&V.teams[0].or!==undefined,'ma propre gestion est bien dans ma vue');
  verifier(V.marche.every(p=>p.vuPar===undefined&&(p.leg||p.f===undefined)),'au marché, seulement l\'estimation de mon chineur');
  return{json:JSON.stringify(S),nbAuto,nbVentes,nbEchanges,nbActions,S};
}

const E=moteur();
const CAS=[[6,6],[8,8],[10,10],[7,0],[5,0],[3,6],[9,0],[2,8],[8,8,{allerSimple:true}],[10,10,{allerSimple:true}],[1,6]];
CAS.forEach(([nH,taille,o],k)=>{
  const avant=erreurs;let a,b;
  try{a=partie(E,100+k,nH,taille,o);b=partie(E,100+k,nH,taille,o)}catch(e){erreurs++;console.log('  ✗ ERREUR',e.stack.split('\n').slice(0,9).join(' | '));}
  if(a&&b)verifier(a.json===b.json,'déterminisme : même graine, même partie');
  const S=a&&a.S;
  console.log((erreurs===avant?'✓':'✗')+' '+nH+' amis'+(S?' dans une ligue de '+S.teams.length+' clubs, '+S.calendrier.length+' journées'+(o&&o.allerSimple?' (aller simple)':'')+' : '+a.nbVentes+' recrues au mercato, '+a.nbEchanges+' échanges, '+a.nbActions+' actions de gestion, '+a.nbAuto+' pilotages automatiques':''));
});
console.log(erreurs?'ÉCHEC : '+erreurs+' problème(s)':'Tout est bon : ligues de 6 à 10 clubs, 2 saisons chacune.');
process.exit(erreurs?1:0);
