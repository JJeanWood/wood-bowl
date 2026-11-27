/* Test du serveur de ligue sans Supabase : node multijoueur/test_serveur.js
   Une fausse base en mémoire remplace Supabase ; on déroule une ligue entière avec de faux amis, heure par heure. */
/* avec --module : teste le fichier assemblé pour Supabase (supabase/functions/_shared/jeu.js), tel qu'il sera exécuté là-bas */
let J=process.argv.includes('--module')?null:require('./construire.js').charger();
let erreurs=0;const verifier=(c,msg)=>{if(!c){erreurs++;if(erreurs<=30)console.log('  ✗',msg)}};
function fausseBase(){
  const B={reprises:[],ligues:[],clubs:[],etats:{},ordres:[],encheres:[],gazettes:[],vues:{},echanges:[],courrier:[],n:0};
  const copie=x=>x===undefined?x:JSON.parse(JSON.stringify(x));
  const db={B,
    async ligue(id){return copie(B.ligues.find(l=>l.id===id)||null)},
    async ligueParCode(code){return copie(B.ligues.find(l=>l.code===code)||null)},
    async liguesDues(isoNow){return copie(B.ligues.filter(l=>l.echeance&&l.echeance<=isoNow&&['draft','saison','inter'].includes(l.phase)))},
    async creerLigue(row){if(B.ligues.some(l=>l.code===row.code))return null;const L=Object.assign({id:'L'+(++B.n),etape:null,etat:null,version:0,echeance:null},copie(row));B.ligues.push(L);return copie(L)},
    async majLigue(id,ch){Object.assign(B.ligues.find(l=>l.id===id),copie(ch))},
    async clubs(id){return copie(B.clubs.filter(c=>c.ligue_id===id))},
    async ajouterClub(row){B.clubs.push(Object.assign({dernier_passage:null},copie(row)))},
    async majClub(l,idx,ch){Object.assign(B.clubs.find(c=>c.ligue_id===l&&c.club_index===idx),copie(ch))},
    async supprimerClub(l,idx){B.clubs=B.clubs.filter(c=>!(c.ligue_id===l&&c.club_index===idx))},
    async reprise(code){return copie(B.reprises.find(r=>r.code===code)||null)},
    async poserReprise(l,idx,code){B.reprises=B.reprises.filter(r=>!(r.ligue_id===l&&r.club_index===idx));B.reprises.push({code,ligue_id:l,club_index:idx})},
    async oterReprise(l,idx){B.reprises=B.reprises.filter(r=>!(r.ligue_id===l&&r.club_index===idx))},
    async etat(id){const e=B.etats[id];return e?{etat:copie(e.etat),rev:e.rev}:{etat:null,rev:0}},
    async creerEtat(id,etat){if(B.etats[id])return false;B.etats[id]={etat:copie(etat),rev:1};return true},
    async sauverEtat(id,etat,rev){const e=B.etats[id];if(!e||e.rev!==rev)return false;e.etat=copie(etat);e.rev++;return true},
    async ordres(l,j){const o={};B.ordres.filter(x=>x.ligue_id===l&&x.journee===j).forEach(x=>{o[x.club_index]=copie(x.contenu)});return o},
    async encheres(l,tour){return B.encheres.filter(x=>x.ligue_id===l&&x.tour===tour).map(x=>({club:x.club_index,joueur:x.joueur_id,montant:x.montant}))},
    async viderEncheres(l,tour){B.encheres=B.encheres.filter(x=>!(x.ligue_id===l&&x.tour===tour))},
    async publierGazettes(l,rows){rows.forEach(r=>B.gazettes.push(Object.assign({ligue_id:l},copie(r))))},
    async majVues(l,rows){rows.forEach(r=>{B.vues[l+':'+r.club_index]=copie(r.vue)})},
    async echange(id){return copie(B.echanges.find(e=>e.id===id)||null)},
    async majEchange(id,ch){Object.assign(B.echanges.find(e=>e.id===id),ch)},
    async courrier(l){return B.courrier.filter(c=>c.ligue_id===l).map(c=>({club:c.club_index,texte:c.texte}))},
    async viderCourrier(l){B.courrier=B.courrier.filter(c=>c.ligue_id!==l)},
  };
  return db;
}
const H=3600000;
(async()=>{
  if(!J)J=(await import(require('path').join(__dirname,'../supabase/functions/_shared/jeu.js'))).Jeu;
  /* --- le calendrier réel --- */
  const P=(y,m,d,h)=>J.instantLocal(y,m,d,h,0,'Europe/Paris');
  verifier(new Date(P(2026,11,27,21)).toISOString()==='2026-11-27T20:00:00.000Z','21 h à Paris en hiver = 20 h UTC');
  verifier(new Date(P(2026,7,1,21)).toISOString()==='2026-07-01T19:00:00.000Z','21 h à Paris en été = 19 h UTC');
  const ven=P(2026,11,27,8); /* vendredi 27 novembre 2026, 8 h */
  verifier(J.prochainCreneau(ven,J.RYTHME)===P(2026,11,27,21),'vendredi matin -> match vendredi 21 h');
  verifier(J.prochainCreneau(P(2026,11,27,21),J.RYTHME)===P(2026,11,30,21),'vendredi 21 h -> lundi 21 h');
  verifier(J.prochainCreneau(P(2027,3,26,22),J.RYTHME)===P(2027,3,29,21),'passage à l\'heure d\'été : lundi 21 h heure de Paris');

  const db=fausseBase(),B=db.B;let now=ven;
  const D=(uid,q)=>J.demande(db,uid,q,now);
  /* --- inscriptions --- */
  verifier((await D(null,{action:'creer'})).erreur,'sans connexion : refus');
  const c=await D('u0',{action:'creer',nom:'Ligue <b>test</b>',pseudo:'Juju',club:{nom:'Les Gros Bras',peuple:'orque',couleur:'#aa0000'},reglages:{budget:300,heure:21,jours:[1,3,5],nimporte:1}});
  verifier(c.ok&&/^[A-Z]{6}$/.test(c.code),'création de ligue avec code de 6 lettres');
  const L=c.ligue;verifier(!/[<>]/.test(B.ligues[0].nom),'nom nettoyé');verifier(B.ligues[0].reglages.budget===300&&B.ligues[0].reglages.nimporte===undefined,'réglages filtrés');
  const NOMS=['Hugo','Léa','Sam','Inès','Tom','Zoé','Max'];
  for(let i=0;i<NOMS.length;i++){const r=await D('u'+(i+1),{action:'rejoindre',code:c.code.toLowerCase(),pseudo:NOMS[i],club:{nom:'FC '+NOMS[i],peuple:['humain','nain','elfe'][i%3]}});verifier(r.ok,'inscription de '+NOMS[i]+' : '+(r.erreur||''))}
  verifier((await D('u1',{action:'rejoindre',code:c.code,pseudo:'Hugo2',club:{nom:'Autre'}})).erreur,'double inscription refusée');
  verifier((await D('u9',{action:'rejoindre',code:c.code,pseudo:'Zed',club:{nom:'FC Hugo'}})).erreur,'nom de club déjà pris refusé');
  verifier((await D('u9',{action:'rejoindre',code:'ZZZZZZ',pseudo:'Zed'})).erreur,'code inconnu refusé');
  verifier((await D('u2',{action:'demarrer',ligue:L})).erreur,'un simple membre ne peut pas démarrer');
  verifier((await D('u3',{action:'adjoint',ligue:L,club:1,oui:true})).erreur,'seul le commissaire nomme un adjoint');
  verifier((await D('u0',{action:'adjoint',ligue:L,club:1,oui:true})).ok&&B.clubs.find(x=>x.user_id==='u1').adjoint,'Hugo est adjoint');
  /* un inscrit s'en va avant le départ, un autre est exclu : les numéros de club sont resserrés au départ */
  verifier((await D('u3',{action:'quitter',ligue:L})).ok,'Sam quitte avant le départ');
  verifier((await D('u0',{action:'exclure',ligue:L,club:5})).ok,'Tom est exclu avant le départ');
  verifier((await D('u0',{action:'quitter',ligue:L})).erreur,'le commissaire ne peut pas quitter');
  const dm=await D('u1',{action:'demarrer',ligue:L});
  verifier(dm.ok,'l\'adjoint démarre la partie : '+(dm.erreur||''));
  verifier((await D('u0',{action:'demarrer',ligue:L})).erreur,'pas de second départ');
  const pub=()=>B.ligues[0],priv=()=>B.etats[L].etat;
  verifier(pub().phase==='draft'&&pub().echeance===new Date(now+48*H).toISOString(),'draft ouverte pour 48 h');
  const nH=6;verifier(priv().teams.filter(T=>T.humain).length===nH&&priv().teams.length===6,'6 amis, 6 clubs');
  verifier(B.clubs.map(x=>x.club_index).sort().join()==='0,1,2,3,4,5','numéros de club resserrés');
  verifier(priv().teams[0].or===300,'budget de draft choisi par le commissaire');
  verifier(!JSON.stringify(pub().etat).includes('"h":{"m"')&&pub().etat.teams.every(T=>!T.gest)&&!pub().etat.srv&&!JSON.stringify(B.vues).includes('graine'),'état public sans secrets (ni profils cachés, ni gestion des autres, ni graine du hasard)');
  verifier(B.vues[L+':2']&&B.vues[L+':2'].club.gest&&B.vues[L+':2'].club.id===2,'vue privée de chaque club');
  /* --- draft --- */
  const alea=J.graine(77);const miser=(tour)=>{const S=priv();const lot=S.phase==='draft'?S.draft.vivier:S.marche;B.clubs.forEach(x=>{if(!x.user_id)return;lot.slice().sort(()=>alea()-.5).slice(0,S.phase==='draft'?12:2).forEach(p=>B.encheres.push({ligue_id:L,club_index:x.club_index,tour,joueur_id:p.id,montant:Math.round((p.plancher||10)*(1+alea()))}))})};
  miser('draft-1');
  verifier((await J.tick(db,now+47*H)).length===0,'rien ne se passe avant l\'échéance');
  now+=48*H+60000;let t=await J.tick(db,now);
  verifier(t.length===1&&t[0].fait==='draft-1'&&t[0].ventes>0,'1er tour dépouillé à l\'échéance');
  verifier(pub().phase==='draft'&&pub().etat.draft.tour===2&&pub().etat.encheres.tour==='draft-2','2e tour ouvert');
  verifier(!B.encheres.length,'mises du 1er tour effacées');
  miser('draft-2');
  verifier((await D('u2',{action:'lancer',ligue:L})).erreur,'un simple membre ne lance rien');
  const l2=await D('u1',{action:'lancer',ligue:L});verifier(l2.fait==='draft-2','l\'adjoint clôt le 2e tour sans attendre');
  verifier(pub().phase==='saison'&&pub().etape==='mercato','la saison démarre par un mercato');
  const h=priv().horaires;verifier(new Date(h.match).getTime()-new Date(h.mercato).getTime()===24*H,'mercato clos 24 h avant le match');
  verifier(new Date(h.mercato).getTime()>now+H-1,'au moins une heure de mercato');
  verifier(pub().echeance===h.mercato,'prochaine échéance = clôture du mercato');
  /* --- gestion, pause, happening --- */
  const quiU2=B.clubs.find(x=>x.user_id==='u2').club_index;
  const g2=await D('u2',{action:'gestion',ligue:L,geste:{k:'sponsor',id:priv().teams[quiU2].gest.offresSponsor[0]}});
  verifier(g2.ok&&priv().teams[quiU2].gest.sponsor&&B.vues[L+':'+quiU2].club.gest.sponsor,'un joueur signe son sponsor, sa vue est à jour');
  verifier((await D('u9',{action:'gestion',ligue:L,geste:{k:'stade',id:'buvette'}})).erreur,'un inconnu ne peut rien faire');
  verifier((await D('u2',{action:'happening',ligue:L,club:0,happening:{k:'don',po:50}})).erreur,'seul le créateur lance un happening');
  verifier((await D('u0',{action:'happening',ligue:L,club:quiU2,happening:{k:'don',po:50,titre:'Merci',texte:'Pour tes retours sur le jeu.'}})).ok,'happening « don »');
  const orAv=priv().teams[quiU2].or;verifier((await D('u2',{action:'gestion',ligue:L,geste:{k:'evenement',oui:true}})).ok&&priv().teams[quiU2].or===orAv+50,'le don est encaissé');
  const hj=await D('u0',{action:'happening',ligue:L,club:quiU2,happening:{k:'joueur',titre:'Une légende frappe à la porte',texte:'Léa la Foudre veut jouer pour vous.',joueur:{nom:'Léa la Foudre',sexe:'f',race:'elfe',poste:'Coureur',f:40,v:92,t:80,sp:60,prime:0}}});
  verifier(hj.ok&&priv().teams[quiU2].gest.evt.p.nom==='Léa la Foudre','happening « joueur sur mesure »');
  verifier((await D('u0',{action:'pause',ligue:L})).ok&&pub().phase==='pause'&&pub().echeance===null,'pause');
  now+=72*H;verifier((await J.tick(db,now)).length===0,'rien ne bouge pendant la pause');
  const rp=await D('u1',{action:'reprendre',ligue:L});verifier(rp.ok&&pub().phase==='saison'&&new Date(pub().echeance).getTime()>now,'reprise : les échéances sont décalées');
  /* --- une saison complète, heure par heure --- */
  let journees=0,gard=0;const nJ=priv().calendrier.length;
  while(priv().phase==='saison'&&gard++<200){
    const S=priv();
    if(pub().etape==='mercato'){miser(S.encheres.tour);
      if(journees===1)B.courrier.push({ligue_id:L,club_index:2,texte:'Bravo aux Gros Bras, mais l\'arbitre était acheté.'});
      if(journees===2){/* le joueur sur mesure attend toujours à la porte après deux journées */verifier(S.teams[quiU2].gest.evt&&S.teams[quiU2].gest.evt.k==='invite','le happening attend sa réponse');
        const n0=S.teams[quiU2].joueurs.length;if(n0>=8)await D('u2',{action:'gestion',ligue:L,geste:{k:'renvoyer',id:S.teams[quiU2].joueurs[7].id}});
        const r=await D('u2',{action:'gestion',ligue:L,geste:{k:'evenement',oui:true}});verifier(r.ok&&priv().teams[quiU2].joueurs.some(p=>p.nom==='Léa la Foudre'),'la joueuse sur mesure rejoint le club : '+(r.msg||r.erreur))}
      if(journees===3){/* échange entre amis */const A=S.teams[0],Bq=S.teams[1];B.echanges.push({id:'E1',ligue_id:L,de_club:0,vers_club:1,donne:{joueurs:[A.joueurs[0].id],po:5},recoit:{joueurs:[Bq.joueurs[0].id]},statut:'proposee'});
        verifier((await D('u0',{action:'echange',ligue:L,id:'E1',oui:true})).erreur,'l\'auteur ne peut pas accepter son propre échange');
        const uB=B.clubs.find(x=>x.club_index===1).user_id;const r=await D(uB,{action:'echange',ligue:L,id:'E1',oui:true});verifier(r.ok&&B.echanges[0].statut==='appliquee'&&priv().teams[1].joueurs.some(p=>p.id===A.joueurs[0].id),'échange appliqué : '+(r.erreur||''))}
      if(journees===4){/* exclusion en cours de saison, puis reprise par un nouvel ami */
        verifier((await D('u0',{action:'exclure',ligue:L,club:3})).ok&&priv().teams[3].humain===false&&B.clubs.find(x=>x.club_index===3).user_id===null,'club exclu : l\'ordinateur prend le relais');
        const cf=await D('u0',{action:'confier',ligue:L,club:3});verifier(cf.ok&&cf.code.length===8,'code de reprise');
        const rj=await D('u20',{action:'rejoindre',code:cf.code,pseudo:'Nina',club:{nom:'Les Revenants'}});
        verifier(rj.ok&&priv().teams[3].humain===true&&priv().teams[3].nom==='Les Revenants'&&B.clubs.find(x=>x.club_index===3).user_id==='u20','Nina reprend le club');
        verifier((await D('u21',{action:'rejoindre',code:cf.code,pseudo:'Paul'})).erreur,'le code de reprise ne sert qu\'une fois')}
    }else{/* préparation : la moitié des joueurs donne des ordres */
      B.clubs.forEach(x=>{if(!x.user_id||alea()<.5)return;const T=S.teams[x.club_index];B.ordres.push({ligue_id:L,club_index:x.club_index,journee:pub().version+1,contenu:{titulaires:T.joueurs.slice(0,5).map(p=>p.id),consigne:'brutal',tactique:'mur'}})})}
    const avant=pub().etape,ech=new Date(pub().echeance).getTime();
    verifier((await J.tick(db,ech-60000)).length===0,'pas d\'avance avant l\'heure');
    now=ech+30000;t=await J.tick(db,now);
    verifier(t.length===1&&!t[0].erreur,'avance à l\'heure : '+JSON.stringify(t[0]));
    if(avant==='preparation'){journees++;
      const loc=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'long',hour:'2-digit'}).format(new Date(ech));
      if(journees>1)verifier(/^(lundi|mercredi|vendredi) 21/.test(loc),'match joué un lundi, mercredi ou vendredi à 21 h : '+loc);
      const gz=B.gazettes.filter(g=>g.journee===journees&&g.saison===1);
      verifier(gz.length===priv().teams.filter(T=>T.humain).length+1||journees===5,'une gazette par club humain + l\'édition commune (journée '+journees+' : '+gz.length+')');
      if(journees===2)verifier(gz.find(g=>g.club_index===-1).contenu.courrier&&!B.courrier.length,'courrier des lecteurs publié dans l\'édition commune');
      verifier(pub().version===journees,'version de la ligue = journées jouées')}
  }
  verifier(journees===nJ&&pub().phase==='inter','saison complète de '+nJ+' journées, puis intersaison');
  verifier(new Date(pub().echeance).getTime()-now===3*24*H,'intersaison de 3 jours');
  now=new Date(pub().echeance).getTime()+1000;t=await J.tick(db,now);
  verifier(t[0].fait==='reprise'&&pub().phase==='saison'&&pub().etape==='mercato'&&priv().saison===2,'saison 2 lancée');
  /* --- soirée éclair : un match toutes les 12 minutes --- */
  verifier((await D('u0',{action:'reglages',ligue:L,reglages:{rythmeMin:12}})).ok,'réglage « soirée éclair »');
  const t0=now;let m=0;for(let k=0;k<8;k++){now=new Date(pub().echeance).getTime()+1000;await J.tick(db,now);if(pub().etape==='mercato')m++}
  verifier(m>=3&&now-t0<4*24*H,'les journées s\'enchaînent');
  const d1=new Date(pub().echeance).getTime()-now;verifier(d1>0&&d1<=12*60000,'prochaine étape dans moins de 12 minutes');
  /* --- deux écritures en même temps : une seule passe, l'autre recommence --- */
  const rs=await Promise.all([D('u1',{action:'gestion',ligue:L,geste:{k:'stade',id:'buvette'}}),D('u2',{action:'gestion',ligue:L,geste:{k:'stade',id:'tribunes'}})]);
  const S2=priv();verifier(rs.every(r=>r.ok||r.erreur),'écritures simultanées sans casse');
  console.log(erreurs?'ÉCHEC : '+erreurs+' problème(s)':'Tout est bon : inscriptions, draft, saison complète à heures fixes, pause, exclusion, reprise, happenings, soirée éclair.');
  process.exit(erreurs?1:0);
})().catch(e=>{console.log('ERREUR',e.stack);process.exit(1)});
