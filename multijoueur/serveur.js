/* ================= WOOD BOWL · SERVEUR DE LIGUE (logique pure) =================
   Ce fichier est assemblé avec le moteur (voir construire.js) et tourne dans les fonctions Supabase « tick » et « ligue ».
   Il ne parle jamais directement à la base : il passe par un objet « db » (voir supabase/functions/_shared/base.ts),
   ce qui permet de le tester en entier sans Supabase (multijoueur/test_serveur.js).

   L'état complet de la partie (S) est rangé dans la table privée etats_prives. Le serveur en tire :
   - ligues.etat : ce que tout membre peut voir ; - vues_club.vue : ce que seul le propriétaire du club peut voir.
   S.srv = {phase, etape, echeance (ms), version, graine, n, pause} : où en est la ligue, côté serveur. */

const RYTHME={draftH:48,draft2H:12,jours:[1,3,5],heure:21,minute:0,mercatoAvantH:24,interJ:3,rythmeMin:0,fuseau:'Europe/Paris'};
const HEURE=3600000;

/* ---------- Le calendrier réel (heure de Paris, changements d'heure compris) ---------- */
function partiesLocales(ms,tz){
  const f=new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const o={};f.formatToParts(new Date(ms)).forEach(p=>{o[p.type]=p.value});
  return{y:+o.year,m:+o.month,d:+o.day,h:+o.hour,mi:+o.minute};
}
function instantLocal(y,m,d,h,mi,tz){
  const voulu=Date.UTC(y,m-1,d,h,mi);let t=voulu;
  for(let k=0;k<3;k++){const p=partiesLocales(t,tz);t+=voulu-Date.UTC(p.y,p.m-1,p.d,p.h,p.mi)}
  return t;
}
/* premier créneau de match (un des jours choisis, à l'heure choisie) strictement après « apres » */
function prochainCreneau(apres,reg){
  const tz=reg.fuseau||'Europe/Paris';const p=partiesLocales(apres,tz);
  const jours=Array.isArray(reg.jours)&&reg.jours.length?reg.jours:RYTHME.jours;
  for(let k=0;k<15;k++){
    const j=new Date(Date.UTC(p.y,p.m-1,p.d+k,12));if(!jours.includes(j.getUTCDay()))continue;
    const t=instantLocal(j.getUTCFullYear(),j.getUTCMonth()+1,j.getUTCDate(),reg.heure,reg.minute||0,tz);
    if(t>apres)return t;
  }
  return apres+48*HEURE;
}
/* fixe la clôture du mercato et l'heure du prochain match */
function planifier(S,now){
  const reg=Object.assign({},RYTHME,S.reglages||{});let mercato,match;
  if(reg.rythmeMin>0){match=now+reg.rythmeMin*60000;mercato=now+Math.round(reg.rythmeMin*30000)}
  else{const avant=Math.max(0,reg.mercatoAvantH)*HEURE;match=prochainCreneau(now+avant+HEURE,reg);mercato=match-avant}
  S.horaires={mercato:new Date(mercato).toISOString(),match:new Date(match).toISOString()};
  return{mercato,match};
}
const iso=ms=>ms===null||ms===undefined?null:new Date(ms).toISOString();
function semer(S){const s=S.srv;R=graine((s.graine+(s.n++)*7919)|0)}

/* ---------- Publication : ce que les joueurs peuvent lire ---------- */
async function publier(db,id,S){
  const s=S.srv;
  await db.majLigue(id,{phase:s.pause?'pause':s.phase,etape:s.etape,echeance:s.pause?null:iso(s.echeance),version:s.version,etat:vuePour(S,-1)});
  await db.majVues(id,humains(S).map(T=>({club_index:T.id,vue:vueClub(S,T.id)})));
}

/* ---------- Faire avancer une ligue d'une étape ---------- */
async function avancer(db,id,now,force){
  for(let essai=0;essai<3;essai++){
    const{etat:S,rev}=await db.etat(id);
    if(!S)return{rien:true};
    const s=S.srv;
    if(s.pause)return{pause:true};
    if(!force&&(s.echeance===null||s.echeance>now)){await publier(db,id,S);return{republie:true}}
    courant(S);semer(S);
    const reg=Object.assign({},RYTHME,S.reglages||{});
    const bilan={quoi:null,gazettes:null,tour:null,courrier:false};
    if(S.phase==='draft'){
      bilan.tour='draft-'+S.draft.tour;bilan.quoi=bilan.tour;
      const r=depouillerDraft(S,await db.encheres(id,bilan.tour));bilan.ventes=r.ventes.length;
      if(r.fin){const h=planifier(S,now);s.phase='saison';s.etape='mercato';s.echeance=h.mercato;S.encheres={tour:'mercato-'+(s.version+1)}}
      else{s.echeance=now+reg.draft2H*HEURE;S.encheres={tour:'draft-2'}}
    }else if(S.phase==='saison'&&s.etape==='mercato'){
      bilan.tour='mercato-'+(s.version+1);bilan.quoi='mercato';
      const r=depouillerMercato(S,await db.encheres(id,bilan.tour));bilan.ventes=r.ventes.length;
      s.etape='preparation';s.echeance=Math.max(now,Date.parse((S.horaires||{}).match)||now);S.encheres=null;
    }else if(S.phase==='saison'){
      bilan.quoi='journee';
      const out=jouerJournee(S,await db.ordres(id,s.version+1));s.version++;
      const lettres=await db.courrier(id);if(lettres.length){out.commune.courrier=lettres.slice(0,12);bilan.courrier=true}
      bilan.gazettes=Object.keys(out.par).map(k=>({saison:out.par[k].saison,journee:out.par[k].jour,club_index:+k,contenu:out.par[k]}))
        .concat([{saison:out.commune.saison,journee:out.commune.jour,club_index:-1,contenu:out.commune}]);
      if(S.phase==='inter'){s.phase='inter';s.etape=null;s.echeance=now+(reg.rythmeMin>0?reg.rythmeMin*60000:reg.interJ*24*HEURE);S.horaires={reprise:iso(s.echeance)};S.encheres={tour:'inter-'+S.saison}}
      else{const h=planifier(S,now);s.etape='mercato';s.echeance=h.mercato;S.encheres={tour:'mercato-'+(s.version+1)}}
    }else if(S.phase==='inter'){
      bilan.tour='inter-'+S.saison;bilan.quoi='reprise';
      depouillerMercato(S,await db.encheres(id,bilan.tour));
      nouvelleSaison(S);
      const h=planifier(S,now);s.phase='saison';s.etape='mercato';s.echeance=h.mercato;S.encheres={tour:'mercato-'+(s.version+1)};
    }else return{rien:true};
    if(!(await db.sauverEtat(id,S,rev)))continue; /* quelqu'un d'autre a écrit entre-temps : on recommence sur l'état à jour */
    if(bilan.gazettes)await db.publierGazettes(id,bilan.gazettes);
    await publier(db,id,S);
    if(bilan.tour)await db.viderEncheres(id,bilan.tour);
    if(bilan.courrier)await db.viderCourrier(id);
    return{fait:bilan.quoi,ventes:bilan.ventes||0,phase:s.phase,etape:s.etape,echeance:iso(s.echeance)};
  }
  return{erreur:'La ligue est très sollicitée, réessayez dans un instant.'};
}
/* appelé chaque minute : fait avancer toutes les ligues dont l'échéance est passée */
async function tick(db,now){
  const dues=await db.liguesDues(iso(now));const out=[];
  for(const L of dues){try{out.push(Object.assign({ligue:L.id},await avancer(db,L.id,now,false)))}catch(e){out.push({ligue:L.id,erreur:String(e&&e.message||e)})}}
  return out;
}

/* ---------- Demandes des joueurs et du commissaire ---------- */
const propre=(x,n)=>String(x===undefined||x===null?'':x).replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n);
const couleurOk=c=>/^#[0-9a-fA-F]{6}$/.test(c||'')?c:'#2f5fa8';
function codeAleatoire(n){const A='ABCDEFGHJKLMNPQRSTUVWXYZ';let s='';for(let i=0;i<n;i++)s+=A[Math.floor(Math.random()*A.length)];return s}
function reglagesPropres(src,avantDepart){
  const o={},r=src||{};
  const ent=(k,a,b)=>{if(r[k]!==undefined&&Number.isFinite(+r[k]))o[k]=clamp(Math.round(+r[k]),a,b)};
  ent('draftH',0,240);ent('draft2H',0,120);ent('heure',0,23);ent('minute',0,59);ent('mercatoAvantH',0,72);ent('interJ',0,21);ent('rythmeMin',0,240);
  if(Array.isArray(r.jours)){const j=[...new Set(r.jours.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=6))];if(j.length)o.jours=j}
  if(r.allerSimple!==undefined)o.allerSimple=!!r.allerSimple;
  if(r.caissesVisibles!==undefined)o.caissesVisibles=!!r.caissesVisibles;
  if(r.legendes!==undefined)o.legendes=!!r.legendes;
  if(avantDepart){ent('budget',100,1000);ent('vivierParClub',9,16);if(r.taille!==undefined&&[6,8,10].includes(+r.taille))o.taille=+r.taille}
  return o;
}
/* modifie l'état d'une ligue en cours, en recommençant si quelqu'un d'autre a écrit entre-temps */
async function modifier(db,id,fn){
  for(let essai=0;essai<3;essai++){
    const{etat:S,rev}=await db.etat(id);if(!S)return{erreur:'La partie n\'a pas encore commencé.'};
    courant(S);semer(S);
    const r=await fn(S);if(r&&r.erreur)return r;
    if(await db.sauverEtat(id,S,rev)){await publier(db,id,S);return r||{ok:true}}
  }
  return{erreur:'La ligue est très sollicitée, réessayez dans un instant.'};
}

async function demande(db,uid,q,now){
  q=q||{};const ko=m=>({erreur:m});
  if(!uid)return ko('Vous n\'êtes pas connecté.');
  /* --- le compte : un code secret de 4 mots permet de retrouver ses clubs sur un autre appareil --- */
  if(q.action==='code'){const h=propre(q.hash,64);if(!/^[0-9a-f]{64}$/.test(h))return ko('Code invalide.');
    const deja=await db.compteParHash(h);if(deja&&deja!==uid)return ko('Ce code est déjà utilisé : générez-en un autre.');
    await db.poserCompte(uid,h);return{ok:true}}
  if(q.action==='retrouver'){const h=propre(q.hash,64);if(!/^[0-9a-f]{64}$/.test(h))return ko('Code invalide.');
    const ancien=await db.compteParHash(h);if(!ancien)return ko('Code inconnu. Vérifiez les quatre mots.');
    if(ancien===uid)return{ok:true,deja:true};
    if(!(await db.transfererCompte(ancien,uid)))return ko('Impossible de réunir les deux comptes : cet appareil a déjà un club dans une des mêmes ligues.');
    return{ok:true}}
  /* --- sans ligue : créer ou rejoindre --- */
  if(q.action==='creer'){
    const nom=propre(q.nom,40)||'Ligue des copains',pseudo=propre(q.pseudo,20),c=q.club||{};
    if(!pseudo)return ko('Choisissez un pseudo.');
    const reglages=Object.assign({},RYTHME,REGLAGES_LIGUE,reglagesPropres(q.reglages,true));
    let L=null;for(let k=0;k<5&&!L;k++)L=await db.creerLigue({code:codeAleatoire(6),nom,commissaire:uid,reglages,phase:'inscriptions'});
    if(!L)return ko('Impossible de créer la ligue, réessayez.');
    await db.ajouterClub({ligue_id:L.id,club_index:0,user_id:uid,pseudo,nom_club:propre(c.nom,28)||('Club de '+pseudo),couleur:couleurOk(c.couleur),peuple:RACES[c.peuple]?c.peuple:'humain',adjoint:false});
    return{ok:true,ligue:L.id,code:L.code};
  }
  if(q.action==='rejoindre'){
    const code=propre(q.code,12).toUpperCase(),pseudo=propre(q.pseudo,20),c=q.club||{};
    if(!pseudo)return ko('Choisissez un pseudo.');
    /* code de reprise d'un club dont le propriétaire est parti */
    if(!code)return ko('Entrez un code.');
    const libre=await db.reprise(code);
    if(libre){
      const clubs=await db.clubs(libre.ligue_id);if(clubs.some(x=>x.user_id===uid))return ko('Vous avez déjà un club dans cette ligue.');
      const nomClub=propre(c.nom,28);
      const r=await modifier(db,libre.ligue_id,S=>{const T=S.teams[libre.club_index];const e=clubVersHumain(S,T,pseudo);if(e)return{erreur:e};
        if(nomClub&&!S.teams.some(X=>X!==T&&X.nom.toLowerCase()===nomClub.toLowerCase())){T.nom=nomClub;T.court=nomClub}if(c.couleur)T.couleur=couleurOk(c.couleur);return{ok:true,nom:T.nom,couleur:T.couleur}});
      if(r.erreur)return r;
      await db.majClub(libre.ligue_id,libre.club_index,{user_id:uid,pseudo,nom_club:r.nom,couleur:r.couleur,adjoint:false});
      await db.oterReprise(libre.ligue_id,libre.club_index);
      return{ok:true,ligue:libre.ligue_id,club:libre.club_index};
    }
    const L=await db.ligueParCode(code);if(!L)return ko('Code inconnu.');
    if(L.phase!=='inscriptions')return ko('Cette ligue a déjà commencé : demandez un code de reprise à son commissaire.');
    const clubs=await db.clubs(L.id);
    if(clubs.some(x=>x.user_id===uid))return ko('Vous êtes déjà inscrit dans cette ligue.');
    if(clubs.length>=10)return ko('Cette ligue est complète (10 clubs).');
    const nomClub=propre(c.nom,28)||('Club de '+pseudo);
    if(clubs.some(x=>x.nom_club.toLowerCase()===nomClub.toLowerCase()))return ko('Ce nom de club est déjà pris.');
    let idx=0;while(clubs.some(x=>x.club_index===idx))idx++;
    await db.ajouterClub({ligue_id:L.id,club_index:idx,user_id:uid,pseudo,nom_club:nomClub,couleur:couleurOk(c.couleur),peuple:RACES[c.peuple]?c.peuple:'humain',adjoint:false});
    return{ok:true,ligue:L.id,club:idx};
  }
  /* --- dans une ligue --- */
  const L=await db.ligue(q.ligue);if(!L)return ko('Ligue introuvable.');
  const clubs=await db.clubs(L.id);const moi=clubs.find(x=>x.user_id===uid)||null;
  const chef=L.commissaire===uid,adjoint=chef||!!(moi&&moi.adjoint);
  if(!moi&&!chef)return ko('Vous ne faites pas partie de cette ligue.');
  const enCours=L.phase!=='inscriptions';
  switch(q.action){
    case'gestion':{if(!moi)return ko('Vous n\'avez pas de club.');if(!enCours)return ko('La partie n\'a pas encore commencé.');
      return modifier(db,L.id,S=>appliquerAction(S,S.teams[moi.club_index],q.geste))}
    case'echange':{if(!moi)return ko('Vous n\'avez pas de club.');
      const e=await db.echange(q.id);if(!e||e.ligue_id!==L.id||e.vers_club!==moi.club_index||e.statut!=='proposee')return ko('Cette proposition n\'est plus valable.');
      if(!q.oui){await db.majEchange(e.id,{statut:'refusee'});return{ok:true}}
      const r=await modifier(db,L.id,S=>{const m=appliquerEchange(S,{de:e.de_club,vers:e.vers_club,donne:e.donne,recoit:e.recoit});return m?{erreur:m}:{ok:true}});
      if(r.erreur)return r;await db.majEchange(e.id,{statut:'appliquee'});return r}
    case'quitter':{if(!moi)return ko('Vous n\'avez pas de club.');if(chef)return ko('Le commissaire ne peut pas quitter sa ligue.');
      return retirer(db,L,moi,enCours)}
    /* --- commissaire et adjoints --- */
    case'demarrer':{if(!adjoint)return ko('Réservé au commissaire.');if(enCours)return ko('La partie a déjà commencé.');
      const rangs=clubs.slice().sort((a,b)=>a.club_index-b.club_index);
      for(let k=0;k<rangs.length;k++)if(rangs[k].club_index!==k){await db.majClub(L.id,rangs[k].club_index,{club_index:k});rangs[k].club_index=k}
      const reg=Object.assign({},RYTHME,REGLAGES_LIGUE,L.reglages||{});
      const g0=Math.floor(Math.random()*2147483647);R=graine(g0);
      const S=nouvelleLigue({nom:L.nom,taille:reg.taille,reglages:reg,clubs:rangs.map(x=>({nom:x.nom_club,couleur:x.couleur,peuple:x.peuple,pseudo:x.pseudo}))});
      delete S._noms;
      S.srv={phase:'draft',etape:null,echeance:now+reg.draftH*HEURE,version:0,graine:g0,n:1,pause:null};S.encheres={tour:'draft-1'};
      if(!(await db.creerEtat(L.id,S)))return ko('La partie a déjà commencé.');
      for(const x of rangs){const T=S.teams[x.club_index];if(T.nom!==x.nom_club)await db.majClub(L.id,x.club_index,{nom_club:T.nom})}
      await publier(db,L.id,S);return{ok:true,echeance:iso(S.srv.echeance)}}
    case'lancer':{if(!adjoint)return ko('Réservé au commissaire.');if(!enCours)return ko('La partie n\'a pas encore commencé.');
      const r=await avancer(db,L.id,now,true);return r.pause?ko('La ligue est en pause : reprenez d\'abord.'):r}
    case'pause':{if(!adjoint)return ko('Réservé au commissaire.');
      return modifier(db,L.id,S=>{const s=S.srv;if(s.pause)return{erreur:'La ligue est déjà en pause.'};s.pause={reste:Math.max(0,(s.echeance||now)-now)};return{ok:true}})}
    case'reprendre':{if(!adjoint)return ko('Réservé au commissaire.');
      return modifier(db,L.id,S=>{const s=S.srv;if(!s.pause)return{erreur:'La ligue n\'est pas en pause.'};
        /* on décale tout de la durée de la pause */
        const decal=now+s.pause.reste-(s.echeance||now);s.echeance=now+s.pause.reste;s.pause=null;
        if(S.horaires){Object.keys(S.horaires).forEach(k=>{const t=Date.parse(S.horaires[k]);if(t)S.horaires[k]=iso(t+decal)})}
        return{ok:true,echeance:iso(s.echeance)}})}
    case'reglages':{if(!adjoint)return ko('Réservé au commissaire.');
      const neuf=reglagesPropres(q.reglages,!enCours);const reglages=Object.assign({},L.reglages||{},neuf);
      await db.majLigue(L.id,{reglages});
      if(!enCours)return{ok:true,reglages};
      return modifier(db,L.id,S=>{Object.assign(S.reglages,neuf);
        /* une échéance précise peut aussi être imposée (« le match de ce soir est repoussé à demain 21 h ») */
        if(q.echeance){const t=Date.parse(q.echeance);if(!t||t<now-60000)return{erreur:'Échéance invalide.'};const s=S.srv;const decal=t-(s.echeance||now);
          if(s.pause)s.pause.reste=Math.max(0,t-now);else s.echeance=t;
          if(S.horaires&&S.phase==='saison'){if(s.etape==='mercato'){S.horaires.mercato=iso(t);const m=Date.parse(S.horaires.match);if(m)S.horaires.match=iso(Math.max(t,m+decal))}else S.horaires.match=iso(t)}}
        return{ok:true,reglages:S.reglages}})}
    /* --- commissaire seul --- */
    case'adjoint':{if(!chef)return ko('Réservé au commissaire.');const x=clubs.find(c=>c.club_index===q.club);if(!x||!x.user_id)return ko('Club introuvable.');
      if(x.user_id===uid)return ko('Vous êtes déjà le commissaire.');await db.majClub(L.id,x.club_index,{adjoint:!!q.oui});return{ok:true}}
    case'exclure':{if(!chef)return ko('Réservé au commissaire.');const x=clubs.find(c=>c.club_index===q.club);if(!x||!x.user_id)return ko('Club introuvable.');
      if(x.user_id===uid)return ko('Vous ne pouvez pas vous exclure vous-même.');return retirer(db,L,x,enCours)}
    case'confier':{if(!chef)return ko('Réservé au commissaire.');if(!enCours)return ko('Avant le départ, donnez simplement le code d\'invitation de la ligue.');
      const{etat:S}=await db.etat(L.id);const T=S&&S.teams[q.club];if(!T)return ko('Club introuvable.');if(estH(T))return ko('Ce club a déjà un propriétaire.');
      const code=codeAleatoire(8);const x=clubs.find(c=>c.club_index===q.club);
      if(!x)await db.ajouterClub({ligue_id:L.id,club_index:T.id,user_id:null,pseudo:'',nom_club:T.nom,couleur:T.couleur,peuple:T.peuple||'humain',adjoint:false});
      await db.poserReprise(L.id,T.id,code);
      return{ok:true,code}}
    case'happening':{if(!chef)return ko('Réservé au créateur de la ligue.');if(!enCours)return ko('La partie n\'a pas encore commencé.');
      return modifier(db,L.id,S=>{const m=happening(S,S.teams[q.club],q.happening);return m?{erreur:m}:{ok:true}})}
  }
  return ko('Demande inconnue.');
}
/* un club perd son propriétaire : avant le départ on libère la place, ensuite l'ordinateur prend le relais */
async function retirer(db,L,club,enCours){
  if(!enCours){await db.supprimerClub(L.id,club.club_index);return{ok:true}}
  const r=await modifier(db,L.id,S=>{const m=clubVersIA(S,S.teams[club.club_index]);return m?{erreur:m}:{ok:true}});
  if(r.erreur)return r;
  await db.majClub(L.id,club.club_index,{user_id:null,adjoint:false});
  await db.oterReprise(L.id,club.club_index);
  return r;
}
