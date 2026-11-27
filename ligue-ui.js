'use strict';
/* ================= WOOD BOWL · ÉCRANS DE LA LIGUE ENTRE AMIS =================
   Chargé après jeu.js. Tout passe par l'écran « multi » de l'écran titre.
   - Les boutons de ces écrans portent data-l="…" (et non data-act) : ils sont traités ici, pas dans jeu.js.
   - API : la seule partie qui parle à Supabase. Les tests la remplacent par window.__API_LIGUE (faux serveur en mémoire). */
(function(){
const MOTS='gourdin orque biere lune nain elfe gobelin taverne arbitre civiere casque crampon ballon pelouse tribune buvette trophee coupe bouclier hache marteau enclume forge dragon troll ogre fee lutin sorcier chaudron potion grimoire donjon rempart tour pont douve foret clairiere riviere colline montagne caverne mine pioche lanterne torche bougie tonneau chope pichet jambon saucisse fromage miche brioche galette soupe ragout navet chou poireau oignon carotte pomme poire prune cerise noisette chataigne champignon ortie fougere mousse lierre chene sapin bouleau saule roseau caillou galet rocher falaise sable boue flaque orage tonnerre eclair brume givre neige grele soleil etoile comete nuage vent tempete aurore crepuscule minuit midi matin soir hiver printemps automne moisson vendange foire marche cirque fanfare tambour trompette cornemuse flute luth violon cloche carillon barde menestrel jongleur acrobate bouffon chevalier ecuyer page baron comte duchesse reine roi prince abbe moine ermite pelerin marchand forgeron meunier boulanger tanneur tisserand potier berger bucheron pecheur chasseur braconnier brigand pirate corsaire capitaine matelot navire radeau barque ancre voile boussole tresor coffre piece ecu bourse rancon butin dette banquier huissier notaire sceau parchemin plume encre gazette potin rumeur secret enigme devise blason banniere fanion ecusson maillot chausse botte gant cape capuche chapeau plumet moustache barbe tresse cicatrice bosse genou coude epaule menton oreille molaire orteil mollet poing baffe torgnole croche plaquage melee charge esquive feinte passe course sprint cavalcade remontee triple penalty carton sifflet chrono prolongation vestiaire infirmerie pommade bandage attelle bequille tisane cataplasme rebouteux mascotte supporter klaxon confetti hourra victoire defaite revanche derby classique legende idole vedette recrue veteran stagiaire mercenaire transfuge mecene sponsor chaussette lacet semelle crotte chevre cochon poule dindon corbeau hibou renard blaireau herisson sanglier'.split(' ');
const COULEURS=['#2f5fa8','#c8402c','#2f6b4a','#c08a1e','#6f2f6c','#e0782a','#1f8a8a','#7a6650','#b03060','#444c9c'];
const CLE_CODE='woodbowl-code';
const LG={etat:'debut',erreur:null,uid:null,code:null,ligues:null,ecran:'accueil',onglet:'ligue',occupe:false,
  form:{nomLigue:'',pseudo:'',club:'',couleur:COULEURS[0],peuple:'humain',code:'',codeSecret:''},
  id:null,L:null,clubs:[],vue:null,mises:{},saisie:{},filtre:'tous',montrerCode:false,signature:'',
  ordres:null,ed:null,edCle:'',gaz:null,pageG:0,statutOrdres:'',
  hap:{club:'',k:'don',po:'30',titre:'',texte:'',nom:'',sexe:'m',race:'humain',poste:'Coureur',f:'60',v:'60',t:'60',sp:'30',prime:'0'}};
window.LG=LG;

/* ---------- Accès au serveur ---------- */
let sb=null;
function chargerScript(src){return new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>ko(new Error('script'));document.head.appendChild(s)})}
const vraiAPI={
  async init(){
    if(!window.supabase)await chargerScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_CLE);
    let s=(await sb.auth.getSession()).data.session;
    if(!s){const r=await sb.auth.signInAnonymously();if(r.error)throw new Error(r.error.message);s=r.data.session}
    return s.user.id;
  },
  async demande(q){const r=await sb.functions.invoke('ligue',{body:q});if(r.error||!r.data)return{erreur:'Le serveur ne répond pas. Vérifiez votre connexion et réessayez.'};return r.data},
  async ligues(uid){
    const c=await sb.from('clubs_ligue').select('ligue_id,club_index,pseudo,nom_club,couleur,adjoint').eq('user_id',uid);if(c.error)throw new Error(c.error.message);
    const ids=(c.data||[]).map(x=>x.ligue_id);if(!ids.length)return[];
    const l=await sb.from('ligues').select('id,code,nom,commissaire,phase,etape,echeance,version').in('id',ids);if(l.error)throw new Error(l.error.message);
    return(l.data||[]).map(L=>({L,club:c.data.find(x=>x.ligue_id===L.id)}));
  },
  async charger(id,uid){
    const[l,c,v]=await Promise.all([
      sb.from('ligues').select('id,code,nom,commissaire,reglages,phase,etape,echeance,version,etat').eq('id',id).maybeSingle(),
      sb.from('clubs_ligue').select('ligue_id,club_index,user_id,pseudo,nom_club,couleur,peuple,adjoint,dernier_passage').eq('ligue_id',id).order('club_index'),
      sb.from('vues_club').select('club_index,vue').eq('ligue_id',id).maybeSingle()]);
    if(l.error||!l.data)throw new Error(l.error?l.error.message:'Ligue introuvable.');
    const L=l.data,clubs=c.data||[],moi=clubs.find(x=>x.user_id===uid)||null;const mises={};
    const tour=L.etat&&L.etat.encheres&&L.etat.encheres.tour;
    if(tour&&moi){const e=await sb.from('encheres').select('joueur_id,montant').eq('ligue_id',id).eq('club_index',moi.club_index).eq('tour',tour);(e.data||[]).forEach(x=>{mises[x.joueur_id]=x.montant})}
    let ordres=null,gaz=null;
    if(moi&&L.phase!=='inscriptions'){
      const o=await sb.from('ordres').select('contenu').eq('ligue_id',id).eq('club_index',moi.club_index).eq('journee',L.version+1).maybeSingle();ordres=o.data?o.data.contenu:null;
      const g=await sb.from('gazettes').select('club_index,saison,journee,contenu').eq('ligue_id',id).in('club_index',[moi.club_index,-1]).order('saison',{ascending:false}).order('journee',{ascending:false}).limit(2);
      const rows=g.data||[];if(rows.length){const m=rows.find(r=>r.club_index>=0),c=rows.find(r=>r.club_index===-1);gaz={mienne:m?m.contenu:null,commune:c?c.contenu:null}}
    }
    sb.rpc('passage',{l:id}).then(()=>{},()=>{});
    return{L,clubs,vue:v.data?v.data.vue:null,mises,ordres,gaz};
  },
  async miser(id,club,tour,joueur,montant){const r=await sb.from('encheres').upsert({ligue_id:id,club_index:club,tour,joueur_id:joueur,montant,maj:new Date().toISOString()});return r.error?{erreur:'La mise n\'a pas été enregistrée (le tour est peut-être clos).'}:{ok:true}},
  async envoyerOrdres(id,club,journee,contenu){const r=await sb.from('ordres').upsert({ligue_id:id,club_index:club,journee,contenu,maj:new Date().toISOString()});return r.error?{erreur:'Les ordres n\'ont pas été enregistrés.'}:{ok:true}},
  async retirer(id,club,tour,joueur){const r=await sb.from('encheres').delete().eq('ligue_id',id).eq('club_index',club).eq('tour',tour).eq('joueur_id',joueur);return r.error?{erreur:'Impossible de retirer la mise.'}:{ok:true}}
};
const API=window.__API_LIGUE||vraiAPI;

/* ---------- Compte : anonyme, avec un code secret de 4 mots pour le retrouver ailleurs ---------- */
async function empreinte(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('woodbowl:'+t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const nettoyerCode=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]+/g,'-').replace(/^-+|-+$/g,'');
function nouveauCode(){const a=new Uint32Array(4);crypto.getRandomValues(a);return[...a].map(x=>MOTS[x%MOTS.length]).join('-')}
async function connecter(){
  LG.etat='connexion';LG.erreur=null;
  try{
    LG.uid=await API.init();
    try{LG.code=localStorage.getItem(CLE_CODE)}catch(e){}
    if(!LG.code){const c=nouveauCode();const r=await API.demande({action:'code',hash:await empreinte(c)});if(r&&r.ok){LG.code=c;try{localStorage.setItem(CLE_CODE,c)}catch(e){}}}
    LG.ligues=await API.ligues(LG.uid);LG.etat='pret';
  }catch(e){LG.etat='erreur';LG.erreur='Impossible de joindre le serveur de la ligue. Vérifiez votre connexion, puis réessayez.'}
  redessiner();
}
function redessiner(){if(!S&&ecran==='multi')rendre()}
async function recharger(silencieux){
  if(!LG.id)return;
  try{const d=await API.charger(LG.id,LG.uid);const sig=JSON.stringify([d.L.phase,d.L.etape,d.L.echeance,d.L.version,d.clubs,d.mises,d.vue&&d.vue.club&&[d.vue.club.or,d.vue.club.joueurs.length],d.L.etat&&d.L.etat.draft&&d.L.etat.draft.vivier.length,d.vue&&d.vue.club&&d.vue.club.gest&&[d.vue.club.gest.evt&&d.vue.club.gest.evt.titre,d.vue.club.gest.sponsor,d.vue.club.staff,d.vue.club.stade],d.vue&&d.vue.marche&&d.vue.marche.length,d.gaz&&d.gaz.commune&&[d.gaz.commune.saison,d.gaz.commune.jour]]);
    const change=sig!==LG.signature;Object.assign(LG,d);LG.signature=sig;preparerOrdres();
    if(!silencieux||(change&&!saisieEnCours()))redessiner();
  }catch(e){if(!silencieux){informer('Oups',String(e.message||e));redessiner()}}
}
const saisieEnCours=()=>{const a=document.activeElement;return!!(a&&(a.tagName==='INPUT'||a.tagName==='SELECT'))};
setInterval(()=>{if(!S&&ecran==='multi'&&LG.ecran==='ligue'&&LG.id&&!document.hidden&&!LG.occupe)recharger(true)},20000);

/* une demande au serveur, avec message d'erreur et rafraîchissement */
async function faire(q,apres){
  if(LG.occupe)return;LG.occupe=true;redessiner();
  let r;try{r=await API.demande(q)}catch(e){r={erreur:'Le serveur ne répond pas.'}}
  LG.occupe=false;
  if(!r||r.erreur){informer('Impossible',(r&&r.erreur)||'Erreur inconnue.');redessiner();return}
  if(apres)await apres(r);
  if(LG.id)await recharger(false);else redessiner();
}

/* ---------- Petits outils d'affichage ---------- */
const moiClub=()=>LG.clubs.find(c=>c.user_id===LG.uid)||null;
const estChef=()=>!!(LG.L&&LG.L.commissaire===LG.uid);
const estAdjoint=()=>estChef()||!!(moiClub()&&moiClub().adjoint);
function quand(isoT){
  if(!isoT)return'';const t=new Date(isoT),d=t-Date.now();
  const j=t.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})+' à '+t.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  if(d<=0)return j+' (d\'une minute à l\'autre)';
  const m=Math.round(d/60000),h=Math.floor(m/60),jj=Math.floor(h/24);
  return j+' (dans '+(jj?jj+' j '+(h%24)+' h':h?h+' h '+String(m%60).padStart(2,'0'):m+' min')+')';
}
const retour=(t,vers)=>'<div class="barre-retour"><button class="discret" data-l="aller" data-v="'+vers+'">‹ '+(vers==='accueil'?'Mes ligues':'Retour')+'</button><h2>'+esc(t)+'</h2></div>';
const champ=(id,lab,val,max,ph)=>'<label for="lg-'+id+'">'+lab+'</label><input type="text" id="lg-'+id+'" data-champ="'+id+'" maxlength="'+max+'" placeholder="'+esc(ph||'')+'" value="'+esc(val||'')+'" autocomplete="off">';
const PHASES={inscriptions:'Inscriptions ouvertes',draft:'Draft en cours',saison:'Saison en cours',inter:'Intersaison',pause:'En pause',terminee:'Terminée'};
function choixClub(){
  const f=LG.form;
  return champ('pseudo','Votre pseudo',f.pseudo,20,'Juju')+champ('club','Nom de votre club',f.club,28,'Les Gros Bras de Varoque')
    +'<span class="lab">Couleur du club</span><div class="lg-couleurs">'+COULEURS.map(c=>'<button data-l="couleur" data-v="'+c+'" aria-pressed="'+(f.couleur===c)+'" style="--c:'+c+'" aria-label="Couleur '+c+'"></button>').join('')+'</div>'
    +'<span class="lab">Peuple de votre centre de formation</span><div class="peuples">'+RACE_IDS.map(k=>'<button data-l="peuple" data-v="'+k+'" aria-pressed="'+(f.peuple===k)+'"><img alt="" src="'+img(k,0)+'"><span><b>'+RACES[k].pl+'</b><small>'+RACES[k].atout+'</small></span></button>').join('')+'</div>'
    +'<p class="note">Tous les joueurs se recrutent aux enchères, parmi tous les peuples. Votre peuple ne sert qu\'aux jeunes que votre centre de formation vous envoie quand l\'effectif est trop court.</p>';
}

/* ---------- Écrans hors ligue ---------- */
function vueAccueilLigue(){
  let h='<section class="ecran-menu">'+retourTitre('Ligue entre amis');
  if(LG.etat==='debut'||LG.etat==='connexion')return h+'<div class="panneau"><p style="margin:0">Connexion au serveur de la ligue…</p></div></section>';
  if(LG.etat==='erreur')return h+'<div class="panneau"><p style="margin:0 0 10px">'+esc(LG.erreur)+'</p><button class="discret or" data-l="reessayer">Réessayer</button></div></section>';
  const L=LG.ligues||[];
  if(L.length){h+='<h3 class="soustitre">Vos ligues</h3>'+L.map(x=>'<button class="menu-btn lg-ligue" data-l="ouvrir" data-v="'+x.L.id+'" style="--c:'+esc(x.club.couleur||'#7a6650')+'"><b>'+esc(x.L.nom)+'</b><small>'+esc(x.club.nom_club)+' · '+(PHASES[x.L.phase]||'')+(x.L.echeance?' · prochaine étape '+quand(x.L.echeance):'')+'</small></button>').join('')}
  else h+='<div class="panneau"><p style="margin:0">Vous n\'êtes dans aucune ligue pour l\'instant. Créez-en une et invitez vos amis, ou rejoignez celle d\'un ami avec son code.</p></div>';
  h+='<button class="gros" data-l="aller" data-v="rejoindre">Rejoindre une ligue avec un code</button>'
    +'<button class="menu-btn" data-l="aller" data-v="creer" style="margin-top:12px"><b>Créer une ligue</b><small>Vous en serez le commissaire : vous invitez, vous réglez le rythme, vous lancez les matchs</small></button>'
    +'<div class="panneau lg-compte"><b>Votre code secret</b><p class="note">Il n\'y a ni e-mail ni mot de passe. Ce code de quatre mots est la clé de vos clubs : notez-le, il permet de les retrouver sur un autre téléphone ou un ordinateur. Ne le donnez à personne.</p>'
    +(LG.code?(LG.montrerCode?'<p class="lg-code">'+esc(LG.code)+'</p><button class="discret" data-l="copier" data-v="'+esc(LG.code)+'">Copier</button> <button class="discret" data-l="montrer">Cacher</button>':'<button class="discret or" data-l="montrer">Afficher mon code secret</button>'):'<p class="note alerte">Le code n\'a pas pu être créé. Revenez sur cet écran dans un instant.</p>')
    +'<hr><b>Déjà un club sur un autre appareil ?</b>'+champ('codeSecret','Entrez votre code secret de quatre mots',LG.form.codeSecret,80,'gourdin-orque-biere-lune')
    +'<button class="discret" data-l="retrouver" style="margin-top:8px">Retrouver mes clubs</button></div>';
  return h+'</section>';
}
function vueCreer(){
  return'<section class="ecran-menu accueil">'+retour('Créer une ligue','accueil')+champ('nomLigue','Nom de la ligue',LG.form.nomLigue,40,'La Ligue des Copains')+choixClub()
    +'<button class="gros" data-l="creer"'+(LG.occupe?' disabled':'')+'>Créer la ligue</button>'
    +'<p class="note">Vous recevrez un code d\'invitation à donner à vos amis (6 à 10 clubs ; l\'ordinateur complète les places vides). Rythme de départ : draft de 48 h, puis matchs les lundi, mercredi et vendredi à 21 h. Tout se règle ensuite.</p></section>';
}
function vueRejoindre(){
  return'<section class="ecran-menu accueil">'+retour('Rejoindre une ligue','accueil')+champ('code','Code donné par votre ami',LG.form.code,12,'ABCDEF')+choixClub()
    +'<button class="gros" data-l="rejoindre"'+(LG.occupe?' disabled':'')+'>Rejoindre</button></section>';
}

/* ---------- Dans une ligue ---------- */
function vueLigueOuverte(){
  const L=LG.L;if(!L)return'<section class="ecran-menu">'+retour('Ligue','accueil')+'<div class="panneau"><p style="margin:0">Chargement…</p></div></section>';
  const enJeu=!!(L.etat&&!L.etat.draft&&L.phase!=='inscriptions');
  const onglets=[['ligue',L.phase==='inscriptions'?'Salle d\'attente':!enJeu?'Draft':'Ligue']];
  if(enJeu&&moiClub())onglets.push(['club','Mon club'],['mercato','Mercato'],['gazette','Gazette']);
  onglets.push(['membres','Membres']);if(estAdjoint())onglets.push(['commissaire','Commissaire']);
  if(!onglets.some(o=>o[0]===LG.onglet))LG.onglet='ligue';
  let h='<section class="ecran-menu lg">'+retour(L.nom,'accueil')
    +'<div class="sous" role="tablist">'+onglets.map(([k,l])=>'<button role="tab" data-l="onglet" data-v="'+k+'" aria-selected="'+(LG.onglet===k)+'">'+l+'</button>').join('')+'</div>';
  if(L.phase==='pause')h+='<div class="panneau lg-bandeau"><b>Ligue en pause.</b> Le commissaire reprendra quand tout le monde sera prêt.</div>';
  if(LG.onglet==='membres')h+=vueMembres();
  else if(LG.onglet==='commissaire'&&estAdjoint())h+=vueCommissaire();
  else if(L.phase==='inscriptions')h+=vueAttente();
  else if(L.etat&&L.etat.draft)h+=vueDraft();
  else if(LG.onglet==='club')h+=vueMonClub();
  else if(LG.onglet==='mercato')h+=vueMercato();
  else if(LG.onglet==='gazette')h+=vueGazetteLigue();
  else h+=vueSaison();
  return h+'</section>';
}
function vueAttente(){
  const L=LG.L,n=LG.clubs.length;
  return'<div class="panneau lg-invite"><span class="t">Code d\'invitation</span><p class="lg-code grand">'+esc(L.code)+'</p><button class="discret or" data-l="copier" data-v="'+esc(L.code)+'">Copier le code</button>'
    +'<p class="note">Donnez ce code à vos amis. Dans Wood Bowl : écran titre, « Multijoueur », puis « Rejoindre une ligue avec un code ».</p></div>'
    +'<div class="panneau"><b>'+pl(n,'club inscrit','clubs inscrits')+'</b><p class="note">'+(n<6?'À moins de 6, l\'ordinateur complète jusqu\'à 6 clubs.':n%2?'Nombre impair : l\'ordinateur prendra une place pour que tout le monde joue à chaque journée.':'Le compte est bon : aucun club de l\'ordinateur.')+' Maximum : 10 clubs.</p>'
    +'<p class="note">'+(estAdjoint()?'Quand tout le monde est là, lancez la draft depuis l\'onglet « Commissaire ».':'Le commissaire lancera la draft quand tout le monde sera inscrit.')+'</p></div>'
    +(estChef()?'':'<button class="discret danger" data-l="quitter" style="margin-top:12px">Quitter cette ligue</button>');
}
function vueMembres(){
  const L=LG.L,T=(L.etat&&L.etat.teams)||[];let h='<div class="lg-liste">';
  LG.clubs.forEach(c=>{
    const chef=c.user_id&&c.user_id===L.commissaire,moi=c.user_id===LG.uid,vide=!c.user_id;
    h+='<div class="panneau lg-membre" style="--c:'+esc(c.couleur)+'"><div><b>'+esc(c.nom_club)+'</b><span>'+(vide?'Club sans propriétaire (dirigé par l\'ordinateur)':esc(c.pseudo)+(moi?' (vous)':''))+'</span>'
      +'<small>'+(chef?'Commissaire':c.adjoint?'Adjoint du commissaire':vide?'':'Membre')+(c.dernier_passage&&!vide?' · vu '+dateCourte(new Date(c.dernier_passage).getTime()):'')+'</small></div>';
    if(estChef()&&!moi){h+='<div class="lg-actions">';
      if(!vide)h+='<button class="discret" data-l="adjoint" data-id="'+c.club_index+'" data-v="'+(c.adjoint?'0':'1')+'">'+(c.adjoint?'Retirer le rôle d\'adjoint':'Nommer adjoint')+'</button><button class="discret danger" data-l="exclure" data-id="'+c.club_index+'">Exclure</button>';
      else if(L.phase!=='inscriptions')h+='<button class="discret or" data-l="confier" data-id="'+c.club_index+'">Confier à un ami</button>';
      h+='</div>'}
    h+='</div>'});
  T.filter(t=>!t.humain&&!LG.clubs.some(c=>c.club_index===t.id)).forEach(t=>{h+='<div class="panneau lg-membre" style="--c:'+esc(t.couleur)+'"><div><b>'+esc(t.nom)+'</b><span>Club de l\'ordinateur</span></div>'
    +(estChef()?'<div class="lg-actions"><button class="discret or" data-l="confier" data-id="'+t.id+'">Confier à un ami</button></div>':'')+'</div>'});
  return h+'</div><p class="note">Un adjoint peut lancer la draft, clôturer une étape, mettre la ligue en pause et la reprendre. Un club exclu continue de jouer, dirigé par l\'ordinateur ; le commissaire peut le confier plus tard à un nouvel ami.</p>';
}
function vueCommissaire(){
  const L=LG.L;let h='';
  if(L.phase==='inscriptions'){
    const r=L.reglages||{};
    h+='<div class="panneau"><b>Lancer la draft</b><p class="note">La draft dure '+(r.draftH||48)+' h pour le premier tour, puis '+(r.draft2H||12)+' h pour le second. Chacun reçoit '+(r.budget||260)+' po. Plus personne ne pourra s\'inscrire ensuite (sauf en reprenant un club).</p>'
      +'<button class="gros" data-l="demarrer"'+(LG.occupe?' disabled':'')+'>Lancer la draft ('+pl(LG.clubs.length,'club inscrit','clubs inscrits')+')</button></div>';
  }else{
    const etapes={draft:'Clôturer ce tour de draft maintenant',saison:L.etape==='mercato'?'Clôturer le mercato maintenant':'Jouer la journée maintenant',inter:'Lancer la nouvelle saison maintenant'};
    h+='<div class="panneau"><b>Où en est la ligue</b><p class="note">'+(PHASES[L.phase]||'')+(L.phase==='saison'?' · '+(L.etape==='mercato'?'mercato ouvert':'préparation du match'):'')+(L.echeance?'<br>Prochaine étape automatique : '+quand(L.echeance):'')+'</p>';
    if(L.phase==='pause')h+='<button class="gros" data-l="reprendre"'+(LG.occupe?' disabled':'')+'>Reprendre la ligue</button>';
    else h+='<button class="gros" data-l="lancer"'+(LG.occupe?' disabled':'')+'>'+(etapes[L.phase]||'Passer à l\'étape suivante')+'</button><button class="discret" data-l="pause" style="margin-top:10px">Mettre la ligue en pause</button>';
    h+='<p class="note">Sans rien toucher, tout avance tout seul aux heures prévues. Ces boutons servent à ne pas attendre quand tout le monde est prêt.</p></div>';
  }
  h+=vueRythme();if(estChef()&&L.phase!=='inscriptions')h+=vueCreateur();
  return h;
}
/* une carte de joueur aux enchères (draft : notes exactes ; mercato : notes estimées par votre chineur) */
function carteEnchere(p,moi){
  const mise=LG.mises[p.id],min=p.plancher||1,val=LG.saisie[p.id]!==undefined?LG.saisie[p.id]:(mise!==undefined?mise:'');
  const vu=p.vu||null,b=vu&&!p.leg?kk(moi,'chin','bruit'):0;
  const q=vu&&!p.leg?Object.assign({},p,{f:vu.f,v:vu.v,t:vu.t,cap:{f:vu.f,v:vu.v,t:vu.t,sp:p.sp||0}}):p;
  return'<div class="carte lg-carte'+(mise!==undefined?' misee':'')+(p.leg?' leg':'')+'">'+(p.leg?'<div class="bandeau-leg">✦ Légende de passage au marché ✦</div>':'')+vignette(q,'#7a6650')+'<div style="min-width:0"><span class="lg-nom">'+esc(p.nom)+'</span>'
    +'<div class="puces"><span class="puce">'+p.poste+'</span><span class="puce">'+RACES[p.race].nom+'</span>'+(p.trait&&p.trait!=='aucun'&&TRAITS[p.trait]?'<span class="puce"'+aide(TRAITS[p.trait].desc)+'>'+TRAITS[p.trait].nom+'</span>':'')+'<span class="puce">'+p.age+' ans</span>'+(p.brume?'<span class="puce"'+aide(CADRES_SPE.brume.desc)+'>Pierre de brume</span>':'')+'</div>'
    +(vu&&!p.leg?jaugesJoueur(q,vu,b):jaugesJoueur(q))+'<div style="font-size:12.5px;color:var(--creme-sourde);margin-top:3px">Potentiel '+etoiles(etoilesPot(vu&&!p.leg?vu.m:marge(p)))+(b?' (estimé)':'')+' · environ '+salaire(q)+' po par match</div></div>'
    +'<div class="achat"><div style="font-size:12px;color:var(--creme-sourde);text-align:center">mise minimale</div><div class="prix-po num">'+min+' po</div>'
    +'<input type="number" inputmode="numeric" class="lg-mise" data-mise="'+p.id+'" min="'+min+'" max="'+(moi?moi.or:999)+'" value="'+val+'" placeholder="'+min+'" aria-label="Votre mise pour '+esc(p.nom)+'">'
    +'<button class="discret or" data-l="miser" data-id="'+p.id+'">'+(mise!==undefined?'Modifier':'Miser')+'</button>'+(mise!==undefined?'<button class="discret" data-l="retirer" data-id="'+p.id+'">Retirer</button>':'')+'</div></div>';
}
const carteDraft=carteEnchere;
function vueDraft(){
  const L=LG.L,D=L.etat.draft,moi=LG.vue&&LG.vue.club;const nb=Object.keys(LG.mises).length,total=Object.values(LG.mises).reduce((s,x)=>s+x,0);
  let h='<div class="panneau lg-etat"><b>Draft · '+(D.tour===1?'premier tour':'second tour')+'</b><p class="note">Clôture : '+(L.phase==='pause'?'en pause':quand(L.echeance))+'</p>';
  if(moi)h+='<div class="lg-chiffres"><span><b class="num">'+moi.or+' po</b>en caisse</span><span><b class="num">'+moi.joueurs.length+' / '+MAX_EFFECTIF+'</b>joueurs</span><span><b class="num">'+nb+'</b>'+(nb>1?'mises':'mise')+' ('+total+' po)</span></div>';
  h+='<p class="note">Enchères secrètes : personne ne voit vos mises. À la clôture, chaque joueur va au plus offrant, qui paie <b>la deuxième offre + 1 po</b> (ou la mise minimale s\'il est seul). Les joueurs les plus disputés sont attribués d\'abord ; une mise ne compte que si la somme est encore dans votre caisse à ce moment-là. Vous pouvez donc miser sur plus de joueurs que vous n\'en voulez.</p></div>';
  if(!moi)return h+'<div class="panneau">Vous n\'avez pas de club dans cette ligue.</div>';
  if(moi.joueurs.length)h+='<div class="panneau"><b>Déjà dans votre club</b><p class="note" style="margin-top:4px">'+moi.joueurs.map(p=>esc(p.nom)+' ('+POSTES[p.poste].court+')').join(' · ')+'</p></div>';
  const F=[['tous','Tous'],['Cogneur','Cogneurs'],['Coureur','Coureurs'],['Passeur','Passeurs'],['mises','Mes mises']];
  h+='<div class="seg lg-filtres">'+F.map(([k,l])=>'<button data-l="filtre" data-v="'+k+'" aria-pressed="'+(LG.filtre===k)+'">'+l+'</button>').join('')+'</div>';
  const liste=D.vivier.filter(p=>LG.filtre==='tous'||(LG.filtre==='mises'?LG.mises[p.id]!==undefined:p.poste===LG.filtre)).sort((a,b)=>valeur(b)-valeur(a)||a.id-b.id);
  h+='<div class="effectif lg-vivier">'+(liste.length?liste.map(p=>carteDraft(p,moi)).join(''):'<div class="panneau">'+(LG.filtre==='mises'?'Vous n\'avez encore misé sur personne.':'Plus personne à ce poste.')+'</div>')+'</div>';
  if(D.ventes&&D.ventes.length)h+='<div class="panneau" style="margin-top:12px"><b>Résultats du premier tour</b><p class="note" style="margin-top:4px">'+D.ventes.map(v=>esc(v.nom)+' → '+esc((L.etat.teams[v.club]||{}).court||'?')+' ('+v.prix+' po)').join('<br>')+'</p></div>';
  return h;
}
/* ---------- La saison ---------- */
const monEquipe=()=>(LG.vue&&LG.vue.club)||null;
function prochainAdv(){const E=LG.L.etat,moi=monEquipe();if(!moi||E.phase!=='saison'||E.fini||!E.calendrier[E.jour])return null;
  const m=E.calendrier[E.jour].find(x=>x.includes(moi.id));if(!m)return null;return{adv:E.teams[m[0]===moi.id?m[1]:m[0]],dom:m[0]===moi.id}}
/* les ordres en cours d'édition : repris des ordres déjà envoyés pour cette journée, sinon de l'état actuel du club */
function preparerOrdres(){
  const L=LG.L,moi=monEquipe();if(!L||!moi||!L.etat||L.etat.draft||L.phase==='inscriptions'){LG.ed=null;return}
  const cle=L.id+':'+(L.version+1);if(LG.ed&&LG.edCle===cle){const ids=moi.joueurs.map(p=>p.id);LG.ed.tit=LG.ed.tit.filter(i=>ids.includes(i));return}
  const o=LG.ordres,c=(moi.gest&&moi.gest.choix)||{};LG.edCle=cle;LG.statutOrdres=o?'ok':'';
  LG.ed={ordre:o&&Array.isArray(o.titulaires)?o.titulaires.concat(o.banc||[]):moi.joueurs.map(p=>p.id),
    tit:o&&Array.isArray(o.titulaires)?o.titulaires.slice():moi.joueurs.filter(p=>p.titulaire).map(p=>p.id),
    entr:Object.assign(Object.fromEntries(moi.joueurs.map(p=>[p.id,p.entr||'repos'])),(o&&o.entr)||{}),
    consigne:(o&&o.consigne)||c.consigne||'normal',tactique:(o&&o.tactique)||c.tactique||'equilibre',pot:!!(o&&o.pot),marque:(o&&o.marque)||null,ordres:Object.assign({},(o&&o.ordres)||{}),coupeRot:!!(o&&o.coupeRot)};
  /* ouvrir la ligue vaut présence : sans cela, le club passerait en pilote automatique complet */
  if(!o&&L.phase==='saison')envoyerOrdres(true);
}
/* mon équipe telle que je suis en train de la régler (composition, ordre du banc, entraînement), pour l'afficher comme en solo */
function equipeEditee(){
  const e=LG.ed,T=JSON.parse(JSON.stringify(monEquipe()));const rang=id=>{const i=e.ordre.indexOf(id);return i<0?99:i};
  T.joueurs=T.joueurs.map((p,i)=>[p,i]).sort((a,b)=>rang(a[0].id)-rang(b[0].id)||a[1]-b[1]).map(x=>x[0]);
  T.joueurs.forEach(p=>{p.titulaire=e.tit.includes(p.id);delete p.auBanc;if(e.entr[p.id])p.entr=e.entr[p.id]});
  return T;
}
function contenuOrdres(){const e=LG.ed,T=equipeEditee();const tit=T.joueurs.filter(p=>p.titulaire).map(p=>p.id);
  return{titulaires:tit,banc:T.joueurs.filter(p=>!p.titulaire).map(p=>p.id),entr:e.entr,consigne:e.consigne,tactique:e.tactique,pot:e.pot,marque:e.marque,ordres:e.ordres,coupeRot:e.coupeRot}}
async function envoyerOrdres(silencieux){
  const L=LG.L,moi=monEquipe();if(!L||!moi||!LG.ed||L.phase!=='saison')return;
  const c=contenuOrdres();LG.statutOrdres='envoi';
  const r=await API.envoyerOrdres(L.id,moi.id,L.version+1,c);
  if(r.erreur){LG.statutOrdres='erreur';if(!silencieux)informer('Impossible',r.erreur)}else{LG.ordres=c;LG.statutOrdres='ok'}
  if(!silencieux||LG.onglet==='club')redessiner();
}
function vueSaison(){
  const L=LG.L,E=L.etat,moi=monEquipe(),hq=E.horaires||{},pa=prochainAdv();
  let h='<div class="panneau lg-etat"><b>'+(L.phase==='inter'||E.phase==='inter'?'Intersaison':'Saison '+E.saison+' · journée '+Math.min(E.jour+1,E.calendrier.length)+' sur '+E.calendrier.length)+'</b><p class="note">'
    +(E.phase==='inter'?'Reprise : '+quand(hq.reprise)+'<br>Le marché d\'intersaison est ouvert (onglet Mercato) et chacun choisit son sponsor (onglet Mon club).'
      :(L.etape==='mercato'?'Clôture du mercato : '+quand(hq.mercato)+'<br>':'Mercato clos. ')+'Prochain match : '+quand(hq.match))+'</p>'
    +(pa?'<p style="margin:8px 0 0"><b>'+(pa.dom?'Vous recevez ':'Vous vous déplacez chez ')+esc(pa.adv.nom)+'</b>'+(pa.adv.humain?' ('+esc(pa.adv.pseudo||'un ami')+')':' (ordinateur)')+'</p>':'')+'</div>';
  if(moi&&moi.gest&&moi.gest.evt)h+='<div class="panneau lg-bandeau"><b>'+esc(moi.gest.evt.titre)+'</b><p class="note">Une décision vous attend dans l\'onglet « Mon club ».</p></div>';
  const cl=classement(E);
  h+='<div class="panneau"><b>Classement</b><table class="comptes lg-class">'+cl.map((T,k)=>'<tr'+(moi&&T.id===moi.id?' class="moi"':'')+'><td>'+(k+1)+'. '+esc(T.court)+(T.humain?'':' <small>(ordinateur)</small>')+'</td><td>'+T.j+' j · '+T.g+' v '+T.n+' n '+T.p+' d · '+T.bp+'–'+T.bc+'</td><td><b>'+T.pts+' pts</b></td></tr>').join('')+'</table></div>';
  const C=LG.gaz&&LG.gaz.commune;
  if(C)h+='<div class="panneau"><b>Derniers résultats (journée '+C.jour+')</b><table class="comptes lg-class">'+C.matchs.map(m=>'<tr'+(moi&&(m.dom===moi.id||m.ext===moi.id)?' class="moi"':'')+'><td>'+esc(m.nomDom)+'</td><td><b>'+m.score[0]+' – '+m.score[1]+'</b></td><td>'+esc(m.nomExt)+'</td></tr>').join('')+'</table><p class="note">Le récit des matchs est dans l\'onglet Gazette.</p></div>';
  if(E.coupe&&E.coupe.tours&&E.coupe.tours.length){const t=E.coupe.tours[E.coupe.tours.length-1];h+='<div class="panneau"><b>Coupe du Gourdin · '+esc(t.nom)+'</b><p class="note" style="margin-top:4px">'+t.matchs.map(m=>esc(m.a)+' '+m.score[0]+' – '+m.score[1]+' '+esc(m.b)+(m.tab?' (t.a.b. '+m.tab[0]+'–'+m.tab[1]+')':'')).join('<br>')+(E.coupe.vainqueurNom?'<br><b>Vainqueur : '+esc(E.coupe.vainqueurNom)+'</b>':'')+'</p></div>'}
  return h;
}
const sel=(cle,options,val,extra)=>'<select data-sel="'+cle+'"'+(extra||'')+'>'+options.map(([v,l])=>'<option value="'+esc(String(v))+'"'+(String(v)===String(val===null||val===undefined?'':val)?' selected':'')+'>'+esc(l)+'</option>').join('')+'</select>';
/* les cartes de joueurs du solo, avec leurs boutons branchés sur la ligue */
const carteSolo=(p,T,rang,nb,ent)=>carteJoueur(p,T,rang,nb,ent).replace(/data-act="(titulaire|monter|descendre|entr)"/g,'data-l="$1"').replace(/data-act="fiche"/g,'data-l="rien"');
function vueMonClub(){
  const L=LG.L,E=L.etat,vrai=monEquipe(),e=LG.ed;if(!vrai||!e)return'<div class="panneau">Chargement…</div>';
  const moi=equipeEditee(),g=vrai.gest||{},pa=prochainAdv(),ent=L.phase==='saison';
  let h='<div class="panneau lg-etat" style="border-left:6px solid '+esc(moi.couleur)+'"><b>'+esc(moi.nom)+'</b><div class="lg-chiffres"><span><b class="num">'+moi.or+' po</b>en caisse</span><span><b class="num">'+moi.joueurs.length+' / '+MAX_EFFECTIF+'</b>joueurs</span><span><b class="num">'+Math.round(moi.pop)+'</b>ferveur</span></div>'
    +'<p class="note">Par match : '+masseSalariale(moi)+' po de salaires'+(coutStaff(moi)?' + '+coutStaff(moi)+' po de staff':'')+'.</p></div>';
  /* rebondissement ou happening : même présentation qu'en solo */
  if(g.evt){const ev=g.evt;h+='<section class="bloc"><h2>Rebondissement</h2><div class="panneau affiche evt"><div class="duel" style="font-size:20px">'+esc(ev.titre)+'</div>'
    +(ev.p&&ev.p.nom?'<div class="carte" style="margin-top:10px;box-shadow:none">'+vignette(ev.p,'#7a6650')+'<div style="min-width:0"><span class="lg-nom">'+esc(ev.p.nom)+'</span><div class="puces"><span class="puce">'+ev.p.poste+'</span><span class="puce">'+RACES[ev.p.race].nom+'</span></div>'+jaugesJoueur(ev.p)+'</div></div>':'')
    +'<p style="margin-top:10px">'+esc(ev.texte)+'</p><div class="seg" style="margin-top:10px"><button data-l="evt" data-v="1">'+esc(ev.oui||'Accepter')+'</button><button data-l="evt" data-v="0">'+esc(ev.non||'Refuser')+'</button></div></div></section>'}
  if(!g.sponsor&&g.offresSponsor&&g.offresSponsor.length)h+='<section class="bloc"><h2>Sponsor <small>à choisir pour la saison</small></h2><div class="panneau">'+g.offresSponsor.map(id=>{const sp=sponsorDe(id);return sp?'<div class="lg-ligne"><div><b>'+esc(sp.nom)+'</b><p class="note" style="margin:2px 0 0">'+esc(sp.desc)+'</p></div><button class="discret or" data-l="sponsor" data-v="'+id+'">Signer</button></div>':''}).join('')+'</div></section>';
  if(ent&&pa){
    const r=g.rapport,adv=pa.adv,tac=e.tactique||'equilibre',potOk=moi.or>=COUT_POT;
    const men=r&&r.menace?adv.joueurs.find(p=>p.id===r.menace):null;
    h+='<section class="bloc"><h2>Prochain match</h2><div class="panneau affiche"><div class="duel" style="font-size:20px">'+(pa.dom?esc(moi.court)+' – '+esc(adv.court):esc(adv.court)+' – '+esc(moi.court))+'</div>'
      +'<p><b>'+esc(adv.nom)+'</b>'+(adv.humain?', le club de '+esc(adv.pseudo||'un ami'):', club de l\'ordinateur')+'. '+(pa.dom?'Vous recevez.':'Vous vous déplacez.')+' Coup d\'envoi : '+quand((E.horaires||{}).match)+'.</p>'
      +(r?'<p class="note" style="margin-top:6px"><b>Votre stratège :</b> consigne conseillée <b>'+NOM_CONSIGNE[r.conseil]+'</b>'+(r.prediction?' ; il les attend en consigne '+NOM_CONSIGNE[r.prediction]:'')+(r.tacConseil?' ; plan conseillé : '+TACTIQUES[r.tacConseil].nom.toLowerCase():'')+(men?' ; joueur à surveiller : '+esc(men.nom):'')+'.</p>':'')+'</div></section>';
    /* Vos ordres : exactement les mêmes réglages qu'en solo */
    h+='<section class="bloc"><h2>Vos ordres</h2><div class="panneau choix">'
      +'<div><span class="t">Consigne de match</span><div class="seg">'+['prudent','normal','brutal'].map(k=>'<button data-l="consigne" data-v="'+k+'" aria-pressed="'+(e.consigne===k)+'">'+k.charAt(0).toUpperCase()+k.slice(1)+(r&&r.conseil===k?' ★':'')+'</button>').join('')+'</div><p class="effet">'+CONSIGNES[e.consigne]+(r?' ★ = conseil du stratège.':'')+'</p></div>'
      +'<div><span class="t">Plan de jeu</span><div class="seg tactiques">'+TACTIQUE_IDS.map(k=>'<button data-l="tactique" data-v="'+k+'" aria-pressed="'+(tac===k)+'" title="'+esc(TACTIQUES[k].desc)+'">'+TACTIQUES[k].court+(r&&r.tacConseil===k?' ★':'')+'</button>').join('')+'</div><p class="effet">'+esc(TACTIQUES[tac].desc)+(TACTIQUES[tac].bat?' Contre le '+TACTIQUES[TACTIQUES[tac].bat].nom.toLowerCase()+', mais se fait contrer par le '+TACTIQUES[contreDe(tac)].nom.toLowerCase()+'.':'')+'</p>'
        +'<details class="regles"><summary>Qui bat qui ?</summary><p class="note" style="margin:6px 0 0">Chaque plan en contre un autre, et celui qui contre gagne +7 % en attaque et en défense. Le cycle : Jeu au sol → bat la Contre-attaque → qui bat le Pressing → qui bat le Jeu aérien → qui bat le Mur défensif → qui bat le Jeu au sol. « Équilibré » ne gagne ni ne perd ce duel.</p></details></div>'
      +'<div><span class="t">Marquage individuel</span><select data-sel="marque" aria-label="Joueur adverse à marquer"><option value="">Personne</option>'+adv.joueurs.map(p=>'<option value="'+p.id+'"'+(e.marque===p.id?' selected':'')+'>'+esc(p.nom)+' · '+p.poste.toLowerCase()+' · '+pl(p.sb,'but')+(r&&r.menace===p.id?' ★':'')+'</option>').join('')+'</select><p class="effet">'+(e.marque?'Le joueur marqué perd environ '+Math.round((1-kk(moi,'strat','marquage'))*100)+' % d\'efficacité ; votre attaque perd 3 %.':'Collez un joueur aux basques du meilleur adversaire. Plus votre stratège est bon, plus le marquage est serré.')+'</p></div>'
      +'<div><span class="t">Arbitre</span><div class="seg"><button data-l="pot" data-v="0" aria-pressed="'+(!e.pot)+'">Honnête</button><button data-l="pot" data-v="1" aria-pressed="'+(!!e.pot)+'" '+(potOk?'':'disabled')+'>Pot-de-vin ('+COUT_POT+' po)</button></div><p class="effet">'+(e.pot?"L'arbitre gardera ses cartons en poche, et sifflera peut-être en votre faveur. Petit risque de scandale.":potOk?'Vos fautes seront jugées normalement.':'Caisse trop maigre pour corrompre qui que ce soit.')+'</p></div>'
      +'<div><span class="t">Coupe du Gourdin</span><div class="seg"><button data-l="coupeRot" data-v="0" aria-pressed="'+(!e.coupeRot)+'">Titulaires</button><button data-l="coupeRot" data-v="1" aria-pressed="'+(!!e.coupeRot)+'">Remplaçants</button></div><p class="effet">'+(e.coupeRot?'En coupe, vos remplaçants débutent : les titulaires restent frais pour le championnat.':'En coupe, vous alignez la même équipe qu\'en championnat.')+'</p></div>';
    const speciaux=moi.joueurs.filter(p=>dispo(p)&&(p.poste==='Cogneur'||p.race==='elfenoir'));
    if(speciaux.length)h+='<div><span class="t">Ordres individuels</span>'+speciaux.map(p=>{const o=e.ordres[p.id];const opts=[['','Aucun ordre']].concat(adv.joueurs.map(a=>['cible:'+a.id,'Cibler '+a.nom]));
      if(p.poste==='Cogneur')moi.joueurs.filter(x=>x.id!==p.id).forEach(x=>opts.push(['garde:'+x.id,'Protéger '+x.nom]));
      return'<label class="lg-mini large">'+esc(p.nom)+sel('ordre:'+p.id,opts,o?o.k+':'+o.id:'')+'</label>'}).join('')+'<p class="effet">Un cogneur ou un elfe noir peut s\'acharner sur un adversaire ; un cogneur peut aussi servir de garde du corps à un coéquipier.</p></div>';
    h+='</div><p class="note">'+(LG.statutOrdres==='ok'?'Vos ordres sont enregistrés à chaque changement. Vous pouvez les modifier jusqu\'au coup d\'envoi.':LG.statutOrdres==='erreur'?'<span class="alerte">Vos ordres n\'ont pas pu être enregistrés. Vérifiez votre connexion.</span>':'Enregistrement…')+'</p></section>';
  }
  h+='<section class="bloc"><h2>Composition <small>selon vos 5 titulaires</small></h2><div class="panneau">'+blocEtats(moi)+'</div></section>';
  /* effectif : mêmes cartes et mêmes boutons qu'en solo */
  const{tit,reste}=onzeDe(moi);const marques=moi.joueurs.filter(p=>dispo(p)&&p.titulaire).length,valides=moi.joueurs.filter(dispo).length;const out=moi.joueurs.filter(p=>!dispo(p));
  h+='<section class="bloc"><h2>Effectif <small>'+moi.joueurs.length+' joueurs · '+Math.min(5,tit.length)+' titulaires</small></h2>';
  if(ent)h+='<div class="tous"><button class="discret or" data-l="auto" title="Choisit 5 titulaires équilibrés : au moins un joueur par poste, les plus en forme et les plus forts.">Composition automatique</button></div>'
    +'<div class="tous"><span>Entraînement de tous :</span>'+Object.keys(ENTR).map(k=>'<button data-l="entr-tous" data-v="'+k+'">'+ENTR[k].nom+'</button>').join('')+'</div>';
  h+='<div class="effectif">'+tit.slice().sort((a,b)=>POSTE_IDS.indexOf(a.poste)-POSTE_IDS.indexOf(b.poste)||puissance(b)-puissance(a)).map(p=>carteSolo(p,moi,0,0,ent)).join('')
    +(reste.length?'<p class="soustitre">Banc, dans l\'ordre d\'entrée en jeu</p>'+reste.map((p,i)=>carteSolo(p,moi,i+1,reste.length,ent)).join(''):'')
    +(out.length?'<p class="soustitre">Indisponibles</p>'+out.map(p=>carteSolo(p,moi,0,0,ent)).join(''):'')+'</div>';
  if(ent){
    if(marques<5&&valides>=5)h+='<p class="note alerte">Vous n\'avez désigné que '+pl(marques,'titulaire')+' : les premiers du banc complètent l\'équipe.</p>';
    if(valides<5)h+='<p class="note alerte">Moins de 5 joueurs disponibles : des stagiaires compléteront l\'équipe. Passez au mercato.</p>';
    h+='<p class="note">L\'entraînement de chaque joueur est gardé d\'une journée à l\'autre. La barre claire derrière chaque note montre son plafond : plus on s\'en approche, plus les progrès ralentissent.</p>';
  }
  h+='</section><section class="bloc"><h2>Infirmerie et départs</h2><div class="panneau">'+moi.joueurs.map(p=>'<div class="lg-ligne"><div><b>'+esc(p.nom)+'</b><p class="note" style="margin:2px 0 0">'+(p.blesse>0?'Blessé, encore '+pl(p.blesse,'match'):p.suspendu?'Suspendu au prochain match':'En état de jouer')+' · '+p.sal+' po par match</p></div><div class="lg-actions">'
    +(p.blesse>0?'<button class="discret" data-l="soigner" data-id="'+p.id+'"'+(moi.or<COUT_SOIN?' disabled':'')+'>Soigner ('+COUT_SOIN+' po)</button>':'')+'<button class="discret danger lg-petit" data-l="renvoyer" data-id="'+p.id+'">Renvoyer</button></div></div>').join('')+'</div></section>';
  if(g.sponsor){const sp=sponsorDe(g.sponsor);h+='<section class="bloc"><h2>Sponsor</h2><div class="panneau"><b>'+esc(sp.nom)+'</b><p class="note" style="margin-top:2px">'+esc(sp.desc)+'</p></div></section>'}
  h+='<section class="bloc"><h2>Stade</h2><div class="panneau">'+STADE_IDS.map(k=>{const n=nivStade(moi,k),c=STADE[k].cout[n];return'<div class="lg-ligne"><div><b>'+STADE[k].nom+' : '+STADE[k].niv[n]+'</b><p class="note" style="margin:2px 0 0">'+STADE[k].effet(n)+'</p></div>'+(n<3?'<button class="discret or" data-l="stade" data-v="'+k+'"'+(moi.or<c?' disabled':'')+'>Améliorer ('+c+' po)</button>':'<span class="note">Maximum</span>')+'</div>'}).join('')+'</div></section>';
  h+='<section class="bloc"><h2>Staff</h2><div class="panneau">'+ROLE_IDS.map(r=>{const st=moi.staff[r];let x='<div class="lg-ligne"><div><b>'+ROLES[r].nom+'</b><p class="note" style="margin:2px 0 0">'+(st?esc(st.nom)+' · niveau '+(st.niv+1)+' sur 5 · '+st.sal+' po par match':'Poste vacant')+'</p></div>'+(st?'<button class="discret danger lg-petit" data-l="licencier" data-v="'+r+'">Licencier</button>':'')+'</div>';
    ((g.candidats&&g.candidats[r])||[]).forEach((c,i)=>{x+='<div class="lg-ligne lg-cand"><div><span>'+esc(c.nom)+' · niveau '+(c.niv+1)+' sur 5</span><p class="note" style="margin:2px 0 0">Prime '+c.prime+' po, puis '+c.sal+' po par match'+(st?' (remplace '+esc(st.nom)+')':'')+'</p></div><button class="discret" data-l="embaucher" data-v="'+r+'" data-id="'+i+'"'+(moi.or<c.prime?' disabled':'')+'>Embaucher</button></div>'});return x}).join('')+'</div></section>';
  return h;
}
function vueMercato(){
  const L=LG.L,E=L.etat,moi=monEquipe();if(!moi)return'';
  const lot=(LG.vue&&LG.vue.marche)||[],ouvert=!!(E.encheres&&E.encheres.tour)&&lot.length>0;
  const nb=Object.keys(LG.mises).length,total=Object.values(LG.mises).reduce((s,x)=>s+x,0);
  let h='<div class="panneau lg-etat"><b>'+(ouvert?'Mercato ouvert':'Mercato fermé')+'</b><p class="note">'+(ouvert?'Clôture : '+quand(L.echeance):'Le marché rouvre après le prochain match, avec de nouveaux joueurs.')+'</p>'
    +'<div class="lg-chiffres"><span><b class="num">'+moi.or+' po</b>en caisse</span><span><b class="num">'+moi.joueurs.length+' / '+MAX_EFFECTIF+'</b>joueurs</span><span><b class="num">'+nb+'</b>'+(nb>1?'mises':'mise')+' ('+total+' po)</span></div>'
    +(ouvert?'<p class="note">Mêmes règles qu\'à la draft : mises secrètes, le plus offrant paie la deuxième offre + 1 po. Les notes sont celles que voit votre chineur : sans chineur, elles sont approximatives. Un club à moins de 6 joueurs reçoit en plus un jeune de son centre de formation.</p>':'')+'</div>';
  if(ouvert)h+='<div class="effectif lg-vivier">'+lot.slice().sort((a,b)=>(b.plancher||0)-(a.plancher||0)).map(p=>carteEnchere(p,moi)).join('')+'</div>';
  const M=E.mercato;
  if(M&&(M.ventes.length||M.jeunes.length))h+='<div class="panneau" style="margin-top:12px"><b>Dernier mercato</b><p class="note" style="margin-top:4px">'+M.ventes.map(v=>esc(v.nom)+' ('+POSTES[v.poste].court+') → '+esc(v.clubNom)+' pour '+v.prix+' po'+(v.second?' <small>(devant '+esc(v.second.clubNom)+')</small>':'')).concat(M.jeunes.map(j=>esc(j.nom)+' rejoint '+esc((E.teams[j.club]||{}).court||'')+' (centre de formation)')).join('<br>')+'</p></div>';
  else if(!ouvert)h+='<div class="panneau">Aucune recrue au dernier mercato.</div>';
  return h;
}
function vueGazetteLigue(){
  const G=LG.gaz;if(!G||(!G.mienne&&!G.commune))return'<div class="panneau"><p style="margin:0">Aucun numéro pour l\'instant. La gazette paraît après chaque journée.</p></div>';
  let h='';
  if(G.mienne){const P=pagesGazette(G.mienne);LG.pageG=Math.max(0,Math.min(P.length-1,LG.pageG));
    h+='<div class="gz-haut"><div class="sommaire" role="tablist" aria-label="Sommaire">'+P.map((x,i)=>'<button role="tab" data-l="pageG" data-v="'+i+'" aria-selected="'+(i===LG.pageG)+'">'+x.court+'</button>').join('')+'</div></div>'
      +'<article class="gazette pages" aria-live="polite">'+P[LG.pageG].html+'<div class="folio">— '+(LG.pageG+1)+' / '+P.length+' —</div></article>'}
  const C=G.commune;
  if(C){h+='<h3 class="soustitre">Tous les matchs de la journée '+C.jour+'</h3>'+C.matchs.map(m=>'<details class="panneau lg-match"><summary><b>'+esc(m.nomDom)+' '+m.score[0]+' – '+m.score[1]+' '+esc(m.nomExt)+'</b><span>'+esc(m.titre)+'</span></summary><p class="note"><i>'+esc(m.chapo)+'</i></p>'
      +m.paras.map(p=>'<p class="lg-para'+(p.but?' but':'')+'">'+(p.m?'<b>'+esc(p.m)+'</b> ':'')+esc(p.t)+'</p>').join('')+(m.homme?'<p class="note">Homme du match : '+esc(m.homme.nom)+' ('+esc(m.homme.club)+')</p>':'')+'</details>').join('');
    if(C.courrier&&C.courrier.length)h+='<h3 class="soustitre">Courrier des lecteurs</h3><div class="panneau">'+C.courrier.map(c=>'<p style="margin:0 0 8px">« '+esc(c.texte)+' »<br><small class="note">'+esc((LG.L.etat.teams[c.club]||{}).court||'Un lecteur')+'</small></p>').join('')+'</div>'}
  return h;
}
/* ---------- Commissaire : rythme et happenings ---------- */
const JOURS=['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
function vueRythme(){
  const L=LG.L,r=Object.assign({jours:[1,3,5],heure:21,mercatoAvantH:24,interJ:3,rythmeMin:0,draftH:48,draft2H:12},L.reglages||{},(L.etat&&L.etat.reglages)||{});
  let h='<div class="panneau"><b>Rythme de la ligue</b><span class="lab">Jours de match</span><div class="seg lg-jours">'+JOURS.map((j,i)=>'<button data-l="jour" data-v="'+i+'" aria-pressed="'+r.jours.includes(i)+'">'+j+'</button>').join('')+'</div>'
    +'<label class="lg-mini large">Heure du coup d\'envoi'+sel('reg:heure',Array.from({length:24},(_,i)=>[i,i+' h']),r.heure)+'</label>'
    +'<label class="lg-mini large">Clôture du mercato'+sel('reg:mercatoAvantH',[[0,'au coup d\'envoi'],[2,'2 h avant le match'],[6,'6 h avant'],[12,'12 h avant'],[24,'la veille (24 h avant)'],[48,'48 h avant']],r.mercatoAvantH)+'</label>'
    +'<label class="lg-mini large">Durée de l\'intersaison'+sel('reg:interJ',[[1,'1 jour'],[2,'2 jours'],[3,'3 jours'],[5,'5 jours'],[7,'7 jours']],r.interJ)+'</label>';
  if(L.phase==='inscriptions')h+='<label class="lg-mini large">Premier tour de draft'+sel('reg:draftH',[[1,'1 h'],[12,'12 h'],[24,'24 h'],[48,'48 h'],[72,'72 h']],r.draftH)+'</label><label class="lg-mini large">Second tour de draft'+sel('reg:draft2H',[[1,'1 h'],[6,'6 h'],[12,'12 h'],[24,'24 h']],r.draft2H)+'</label>';
  h+='<label class="lg-mini large">Soirée éclair'+sel('reg:rythmeMin',[[0,'non : jours et heure ci-dessus'],[5,'un match toutes les 5 minutes'],[10,'toutes les 10 minutes'],[15,'toutes les 15 minutes'],[30,'toutes les 30 minutes'],[60,'toutes les heures']],r.rythmeMin)+'</label>'
    +'<p class="note">Un changement s\'applique à partir de la prochaine étape programmée. La soirée éclair enchaîne les journées sans attendre les jours de match : pensez à la remettre sur « non » à la fin.</p>';
  if(L.phase!=='inscriptions'&&L.phase!=='pause'&&L.echeance)h+='<span class="lab">Repousser la prochaine étape</span><div class="seg"><button data-l="repousser" data-v="1">d\'une heure</button><button data-l="repousser" data-v="24">d\'un jour</button></div>';
  return h+'</div>';
}
function vueCreateur(){
  const L=LG.L,f=LG.hap,T=L.etat.teams.filter(t=>t.humain);if(!f.club&&T.length)f.club=String(T[0].id);
  const ch=(k,lab,max,ph)=>'<label for="lg-hap-'+k+'">'+lab+'</label><input type="text" id="lg-hap-'+k+'" data-hap="'+k+'" maxlength="'+max+'" placeholder="'+esc(ph||'')+'" value="'+esc(f[k]||'')+'" autocomplete="off">';
  const nb=(k,lab,a,b)=>'<label class="lg-mini">'+lab+'<input type="number" inputmode="numeric" data-hap="'+k+'" min="'+a+'" max="'+b+'" value="'+esc(f[k])+'"></label>';
  const TYPES=[['don','Un cadeau en po, avec votre texte'],['joueur','Un joueur sur mesure frappe à la porte'],['veteran','Rebondissement : un vétéran propose ses services'],['mercenaire','Rebondissement : un mercenaire pour un match'],['collecte','Rebondissement : les supporters font la quête'],['guerisseur','Rebondissement : le guérisseur'],['transfuge','Rebondissement : un transfuge'],['mecene','Rebondissement : le mécène aux chapeaux à plumes'],['banquier','Rebondissement : le banquier']];
  let h='<div class="panneau lg-createur"><b>Créateur : envoyer un happening</b><p class="note">Réservé à vous. Le club choisi reçoit une proposition dans son onglet « Mon club » et décide d\'accepter ou non. Personne d\'autre n\'est prévenu.</p>'
    +'<label class="lg-mini large">Pour quel club'+sel('hap:club',T.map(t=>[t.id,t.nom+(t.pseudo?' ('+t.pseudo+')':'')]),f.club)+'</label>'
    +'<label class="lg-mini large">Quoi'+sel('hap:k',TYPES,f.k)+'</label>';
  if(f.k==='don')h+=nb('po','Montant (po)',1,500)+ch('titre','Titre',80,'Un cadeau tombé du ciel')+ch('texte','Votre texte',600,'Merci pour tes retours sur le jeu !');
  if(f.k==='joueur')h+=ch('nom','Nom du joueur',40,'Hugo le Terrible')+'<div class="lg-grille">'
    +'<label class="lg-mini">Joueur ou joueuse'+sel('hap:sexe',[['m','Joueur'],['f','Joueuse']],f.sexe)+'</label><label class="lg-mini">Peuple'+sel('hap:race',RACE_IDS.map(k=>[k,RACES[k].nom]),f.race)+'</label><label class="lg-mini">Poste'+sel('hap:poste',POSTE_IDS.map(k=>[k,k]),f.poste)+'</label>'
    +nb('f','Force',15,97)+nb('v','Vitesse',15,97)+nb('t','Balle',15,97)+nb('sp','Spécialité',0,95)+nb('prime','Prime à payer (po)',0,500)+'</div>'
    +ch('titre','Titre',80,'Une légende frappe à la porte')+ch('texte','Votre texte',600,'Il a entendu parler de votre club et veut en être.')
    +'<p class="note">Repères : un bon joueur de départ a environ 60 à 70 dans sa note principale ; au-delà de 85, c\'est une vedette. Le portrait est tiré parmi ceux de son peuple ; les portraits sur mesure viendront plus tard.</p>';
  return h+'<button class="gros" data-l="happening"'+(LG.occupe?' disabled':'')+'>Envoyer le happening</button></div>';
}

/* l'écran « multi » de jeu.js nous passe la main */
window.vueLigueAmis=function(){
  if(LG.etat==='debut'){LG.etat='connexion';connecter()}
  return LG.ecran==='creer'?vueCreer():LG.ecran==='rejoindre'?vueRejoindre():LG.ecran==='ligue'?vueLigueOuverte():vueAccueilLigue();
};

/* ---------- Saisies et clics ---------- */
document.addEventListener('input',ev=>{
  const b=ev.target;if(!b||!b.dataset)return;
  if(b.dataset.champ)LG.form[b.dataset.champ]=b.value;
  if(b.dataset.mise)LG.saisie[b.dataset.mise]=b.value;
  if(b.dataset.hap&&b.tagName==='INPUT')LG.hap[b.dataset.hap]=b.value;
});
document.addEventListener('change',ev=>{
  const b=ev.target;if(!b||!b.dataset||S||ecran!=='multi')return;
  const e=LG.ed,L=LG.L;
  if(b.dataset.case&&e){e[b.dataset.case]=b.checked;envoyerOrdres();return}
  const c=b.dataset.sel;if(!c)return;const v=b.value;
  if(c.startsWith('hap:')){LG.hap[c.slice(4)]=v;rendre();return}
  if(c.startsWith('reg:')){const k=c.slice(4);faire({action:'reglages',ligue:L.id,reglages:{[k]:Number(v)}});return}
  if(!e)return;
  if(c.startsWith('entr:'))e.entr[c.slice(5)]=v;
  else if(c.startsWith('ordre:')){const id=c.slice(6);if(!v)delete e.ordres[id];else{const[k,x]=v.split(':');e.ordres[id]={k,id:Number(x)}}}
  else if(c==='tactique')e.tactique=v;
  else if(c==='marque')e.marque=v?Number(v):null;
  envoyerOrdres();
});
function clubSaisi(){const f=LG.form;return{nom:f.club.trim(),couleur:f.couleur,peuple:f.peuple}}
async function ouvrir(id){LG.id=id;LG.L=null;LG.clubs=[];LG.vue=null;LG.mises={};LG.saisie={};LG.signature='';LG.ed=null;LG.edCle='';LG.ordres=null;LG.gaz=null;LG.pageG=0;LG.ecran='ligue';LG.onglet='ligue';redessiner();await recharger(false)}
document.addEventListener('click',ev=>{
  const b=ev.target.closest&&ev.target.closest('[data-l]');if(!b||S||ecran!=='multi')return;
  if(b.disabled)return;
  const a=b.dataset.l,v=b.dataset.v,id=Number(b.dataset.id),f=LG.form,L=LG.L;
  Son.toucher();Son.jouer('clic');
  switch(a){
    case'reessayer':connecter();break;
    case'aller':LG.ecran=v;if(v==='accueil'){LG.id=null;LG.L=null;if(LG.uid)API.ligues(LG.uid).then(x=>{LG.ligues=x;redessiner()},()=>{})}break;
    case'onglet':LG.onglet=v;break;
    case'couleur':f.couleur=v;break;
    case'peuple':f.peuple=v;break;
    case'filtre':LG.filtre=v;break;
    case'montrer':LG.montrerCode=!LG.montrerCode;break;
    case'copier':if(navigator.clipboard)navigator.clipboard.writeText(v).then(()=>{informer('Copié','Le code est dans le presse-papiers.');redessiner()},()=>{});return;
    case'ouvrir':ouvrir(v);return;
    case'creer':if(!f.pseudo.trim()){informer('Il manque votre pseudo','Choisissez le nom sous lequel vos amis vous verront.');break}
      faire({action:'creer',nom:f.nomLigue,pseudo:f.pseudo,club:clubSaisi()},async r=>{LG.ligues=await API.ligues(LG.uid);await ouvrir(r.ligue)});return;
    case'rejoindre':if(!f.code.trim()){informer('Il manque le code','Demandez le code d\'invitation à votre ami.');break}if(!f.pseudo.trim()){informer('Il manque votre pseudo','Choisissez le nom sous lequel vos amis vous verront.');break}
      faire({action:'rejoindre',code:f.code,pseudo:f.pseudo,club:clubSaisi()},async r=>{f.code='';LG.ligues=await API.ligues(LG.uid);await ouvrir(r.ligue)});return;
    case'retrouver':{const c=nettoyerCode(f.codeSecret);if(c.split('-').length<4){informer('Code incomplet','Le code secret compte quatre mots, par exemple : gourdin-orque-biere-lune.');break}
      empreinte(c).then(h=>faire({action:'retrouver',hash:h},async()=>{LG.code=c;try{localStorage.setItem(CLE_CODE,c)}catch(e){}f.codeSecret='';LG.ligues=await API.ligues(LG.uid);informer('Clubs retrouvés','Vos clubs sont maintenant aussi sur cet appareil.')}));return}
    case'quitter':demander('Quitter cette ligue ?','Votre inscription sera annulée.','Quitter',()=>{faire({action:'quitter',ligue:L.id},async()=>{LG.id=null;LG.L=null;LG.ecran='accueil';LG.ligues=await API.ligues(LG.uid)})});break;
    case'demarrer':demander('Lancer la draft ?','Les inscriptions seront closes et le premier tour d\'enchères commencera tout de suite pour tout le monde.','Lancer la draft',()=>{LG.onglet='ligue';faire({action:'demarrer',ligue:L.id})});break;
    case'lancer':demander('Passer à l\'étape suivante ?','Tout ce qui n\'a pas été réglé par les joueurs absents sera joué en pilote automatique. C\'est irréversible.','Oui, maintenant',()=>{faire({action:'lancer',ligue:L.id})});break;
    case'pause':faire({action:'pause',ligue:L.id});return;
    case'reprendre':faire({action:'reprendre',ligue:L.id});return;
    case'adjoint':faire({action:'adjoint',ligue:L.id,club:id,oui:v==='1'});return;
    case'exclure':{const c=LG.clubs.find(x=>x.club_index===id);demander('Exclure '+(c?c.pseudo:'ce membre')+' ?',L.phase==='inscriptions'?'Son inscription sera annulée.':'Son club continuera de jouer, dirigé par l\'ordinateur. Vous pourrez le confier à un autre ami.','Exclure',()=>{faire({action:'exclure',ligue:L.id,club:id})});break}
    case'confier':faire({action:'confier',ligue:L.id,club:id},async r=>{informer('Code de reprise : '+r.code,'Donnez ce code à votre ami. Il le saisit dans « Rejoindre une ligue avec un code » et reprend le club tel qu\'il est. Le code ne sert qu\'une fois.')});return;
    case'miser':{const lot=L.etat.draft?L.etat.draft.vivier:(LG.vue&&LG.vue.marche)||[];const p=lot.find(x=>x.id===id),moi=LG.vue&&LG.vue.club,m=Math.floor(Number(LG.saisie[id]!==undefined?LG.saisie[id]:LG.mises[id]));if(!p||!moi)break;
      const min=p.plancher||1;
      if(!(m>=min)){informer('Mise trop basse','La mise minimale pour '+p.nom+' est de '+min+' po.');break}
      if(m>moi.or){informer('Mise trop haute','Vous ne pouvez pas miser plus que votre caisse ('+moi.or+' po).');break}
      if(moi.joueurs.length>=MAX_EFFECTIF){informer('Effectif complet','Vous avez déjà '+MAX_EFFECTIF+' joueurs.');break}
      API.miser(L.id,moi.id,L.etat.encheres.tour,id,m).then(r=>{if(r.erreur)informer('Impossible',r.erreur);else{LG.mises[id]=m;delete LG.saisie[id];Son.jouer('piece')}redessiner()});return}
    case'pageG':LG.pageG=Number(v);break;
    case'rien':return;
    case'titulaire':{const e=LG.ed;if(!e)break;const T=equipeEditee(),p=T.joueurs.find(x=>x.id===id);if(!p||!dispo(p))break;
      if(p.titulaire)e.tit=e.tit.filter(x=>x!==id);
      else{if(T.joueurs.filter(x=>dispo(x)&&x.titulaire).length>=5){informer('Déjà 5 titulaires','Retirez d\'abord un titulaire (touchez son bouton « Titulaire »), puis choisissez qui le remplace.');break}e.tit.push(id)}
      Son.jouer('bascule');envoyerOrdres();break}
    case'monter':case'descendre':{const e=LG.ed;if(!e)break;const T=equipeEditee();deplacer(T,id,a==='monter'?-1:1);e.ordre=T.joueurs.map(p=>p.id);envoyerOrdres();break}
    case'entr':if(LG.ed){LG.ed.entr[id]=v;envoyerOrdres()}break;
    case'entr-tous':if(LG.ed){monEquipe().joueurs.forEach(p=>{LG.ed.entr[p.id]=(v!=='repos'&&p[v]>=p.cap[v])?conseilEntr(p):v});envoyerOrdres()}break;
    case'auto':if(LG.ed){const T=equipeEditee();choisirTitulaires(T);LG.ed.tit=T.joueurs.filter(p=>p.titulaire).map(p=>p.id);Son.jouer('bascule');envoyerOrdres()}break;
    case'consigne':if(LG.ed){LG.ed.consigne=v;envoyerOrdres()}break;
    case'tactique':if(LG.ed){LG.ed.tactique=v;envoyerOrdres()}break;
    case'pot':if(LG.ed){LG.ed.pot=v==='1';envoyerOrdres()}break;
    case'coupeRot':if(LG.ed){LG.ed.coupeRot=v==='1';envoyerOrdres()}break;
    case'evt':faire({action:'gestion',ligue:L.id,geste:{k:'evenement',oui:v==='1'}},async r=>{if(r.msg)informer('C\'est fait',r.msg)});return;
    case'sponsor':faire({action:'gestion',ligue:L.id,geste:{k:'sponsor',id:v}});return;
    case'stade':faire({action:'gestion',ligue:L.id,geste:{k:'stade',id:v}});return;
    case'embaucher':faire({action:'gestion',ligue:L.id,geste:{k:'embaucher',role:v,i:id}});return;
    case'licencier':demander('Licencier ?','Le poste sera vacant et vous ne récupérez pas la prime versée.','Licencier',()=>{faire({action:'gestion',ligue:L.id,geste:{k:'licencier',role:v}})});break;
    case'soigner':faire({action:'gestion',ligue:L.id,geste:{k:'soigner',id}});return;
    case'renvoyer':{const p=monEquipe().joueurs.find(x=>x.id===id);demander('Renvoyer '+(p?p.nom:'ce joueur')+' ?','Il quitte le club pour de bon. Vous touchez '+(p?Math.round(valeur(p)*.4):0)+' po d\'indemnité.','Renvoyer',()=>{faire({action:'gestion',ligue:L.id,geste:{k:'renvoyer',id}})});break}
    case'jour':{const r=Object.assign({jours:[1,3,5]},L.reglages||{},(L.etat&&L.etat.reglages)||{});const j=r.jours.slice(),n=Number(v),i=j.indexOf(n);if(i>=0){if(j.length<=1){informer('Il faut au moins un jour de match','');break}j.splice(i,1)}else j.push(n);faire({action:'reglages',ligue:L.id,reglages:{jours:j.sort()}});return}
    case'repousser':faire({action:'reglages',ligue:L.id,reglages:{},echeance:new Date(new Date(L.echeance).getTime()+Number(v)*3600000).toISOString()});return;
    case'happening':{const f=LG.hap;let hp;
      if(f.k==='don')hp={k:'don',po:Number(f.po),titre:f.titre,texte:f.texte};
      else if(f.k==='joueur'){if(!f.nom.trim()){informer('Il manque le nom du joueur','');break}hp={k:'joueur',titre:f.titre,texte:f.texte,joueur:{nom:f.nom.trim(),sexe:f.sexe,race:f.race,poste:f.poste,f:Number(f.f),v:Number(f.v),t:Number(f.t),sp:Number(f.sp),prime:Number(f.prime)}}}
      else hp={k:f.k};
      faire({action:'happening',ligue:L.id,club:Number(f.club),happening:hp},async()=>{informer('Happening envoyé','Le club le découvrira dans son onglet « Mon club ».')});return}
    case'retirer':{const moi=LG.vue&&LG.vue.club;if(!moi)break;API.retirer(L.id,moi.id,L.etat.encheres.tour,id).then(r=>{if(r.erreur)informer('Impossible',r.erreur);else{delete LG.mises[id];delete LG.saisie[id]}redessiner()});return}
  }
  rendre();
});
})();
