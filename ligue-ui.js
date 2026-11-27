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
  ordres:null,gaz:null,gazettes:[],statutOrdres:'',envoi:null,dernierEnvoi:'',ecoute:false,
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
    let ordres=null,gaz=null,gazettes=[];
    if(moi&&L.phase!=='inscriptions'){
      const o=await sb.from('ordres').select('contenu').eq('ligue_id',id).eq('club_index',moi.club_index).eq('journee',L.version+1).maybeSingle();ordres=o.data?o.data.contenu:null;
      const g=await sb.from('gazettes').select('club_index,saison,journee,contenu').eq('ligue_id',id).in('club_index',[moi.club_index,-1]).order('saison',{ascending:false}).order('journee',{ascending:false}).limit(30);
      const rows=g.data||[];gazettes=rows.filter(r=>r.club_index>=0).slice(0,14).reverse().map(r=>r.contenu);const c=rows.find(r=>r.club_index===-1);gaz={commune:c?c.contenu:null};
    }
    sb.rpc('passage',{l:id}).then(()=>{},()=>{});
    return{L,clubs,vue:v.data?v.data.vue:null,mises,ordres,gaz,gazettes};
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
const enClub=()=>!!(S&&S.enLigue);
function redessiner(){if((!S&&ecran==='multi')||enClub())rendre()}
async function recharger(silencieux){
  if(!LG.id)return;
  try{const d=await API.charger(LG.id,LG.uid);const sig=JSON.stringify([d.L.phase,d.L.etape,d.L.echeance,d.L.version,d.clubs,d.mises,d.vue&&d.vue.club&&[d.vue.club.or,d.vue.club.joueurs.length],d.L.etat&&d.L.etat.draft&&d.L.etat.draft.vivier.length,d.vue&&d.vue.club&&d.vue.club.gest&&[d.vue.club.gest.evt&&d.vue.club.gest.evt.titre,d.vue.club.gest.sponsor,d.vue.club.staff,d.vue.club.stade],d.vue&&d.vue.marche&&d.vue.marche.length,d.gaz&&d.gaz.commune&&[d.gaz.commune.saison,d.gaz.commune.jour],d.vue&&d.vue.club&&d.vue.club.joueurs.map(p=>[p.id,p.nom,p.blesse,p.forme])]);
    const change=sig!==LG.signature;Object.assign(LG,d);LG.signature=sig;
    if(S&&S.enLigue){if(!silencieux||(change&&!LG.envoi))reconstruire()}
    if(!silencieux||(change&&!saisieEnCours()))redessiner();
  }catch(e){if(!silencieux){informer('Oups',String(e.message||e));redessiner()}}
}
const saisieEnCours=()=>{const a=document.activeElement;return!!(a&&(a.tagName==='INPUT'||a.tagName==='SELECT'))};
setInterval(()=>{if(((!S&&ecran==='multi'&&LG.ecran==='ligue')||enClub())&&LG.id&&!document.hidden&&!LG.occupe)recharger(true)},20000);

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
  else if(LG.onglet==='mercato')h+=vueMercato();
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
function vueSaison(){
  const L=LG.L,E=L.etat,moi=monEquipe(),hq=E.horaires||{},pa=prochainAdv();
  let h='<div class="panneau lg-etat"><b>'+(L.phase==='inter'||E.phase==='inter'?'Intersaison':'Saison '+E.saison+' · journée '+Math.min(E.jour+1,E.calendrier.length)+' sur '+E.calendrier.length)+'</b><p class="note">'
    +(E.phase==='inter'?'Reprise : '+quand(hq.reprise)+'<br>Le marché d\'intersaison est ouvert (onglet Mercato) et chacun choisit son sponsor (onglet Mon club).'
      :(L.etape==='mercato'?'Clôture du mercato : '+quand(hq.mercato)+'<br>':'Mercato clos. ')+'Prochain match : '+quand(hq.match))+'</p>'
    +(pa?'<p style="margin:8px 0 0"><b>'+(pa.dom?'Vous recevez ':'Vous vous déplacez chez ')+esc(pa.adv.nom)+'</b>'+(pa.adv.humain?' ('+esc(pa.adv.pseudo||'un ami')+')':' (ordinateur)')+'</p>':'')+'</div>';
  if(moi&&moi.gest&&moi.gest.evt)h+='<div class="panneau lg-bandeau"><b>'+esc(moi.gest.evt.titre)+'</b><p class="note">Une décision vous attend dans « Mon club ».</p></div>';
  const cl=classement(E);
  h+='<div class="panneau"><b>Classement</b><table class="comptes lg-class">'+cl.map((T,k)=>'<tr'+(moi&&T.id===moi.id?' class="moi"':'')+'><td>'+(k+1)+'. '+esc(T.court)+(T.humain?'':' <small>(ordinateur)</small>')+'</td><td>'+T.j+' j · '+T.g+' v '+T.n+' n '+T.p+' d · '+T.bp+'–'+T.bc+'</td><td><b>'+T.pts+' pts</b></td></tr>').join('')+'</table></div>';
  const C=LG.gaz&&LG.gaz.commune;
  if(C)h+='<div class="panneau"><b>Derniers résultats (journée '+C.jour+')</b><table class="comptes lg-class">'+C.matchs.map(m=>'<tr'+(moi&&(m.dom===moi.id||m.ext===moi.id)?' class="moi"':'')+'><td>'+esc(m.nomDom)+'</td><td><b>'+m.score[0]+' – '+m.score[1]+'</b></td><td>'+esc(m.nomExt)+'</td></tr>').join('')+'</table><p class="note">Le récit des matchs est dans la gazette.</p></div>';
  if(E.coupe&&E.coupe.tours&&E.coupe.tours.length){const t=E.coupe.tours[E.coupe.tours.length-1];h+='<div class="panneau"><b>Coupe du Gourdin · '+esc(t.nom)+'</b><p class="note" style="margin-top:4px">'+t.matchs.map(m=>esc(m.a)+' '+m.score[0]+' – '+m.score[1]+' '+esc(m.b)+(m.tab?' (t.a.b. '+m.tab[0]+'–'+m.tab[1]+')':'')).join('<br>')+(E.coupe.vainqueurNom?'<br><b>Vainqueur : '+esc(E.coupe.vainqueurNom)+'</b>':'')+'</p></div>'}
  return h;
}
const sel=(cle,options,val,extra)=>'<select data-sel="'+cle+'"'+(extra||'')+'>'+options.map(([v,l])=>'<option value="'+esc(String(v))+'"'+(String(v)===String(val===null||val===undefined?'':val)?' selected':'')+'>'+esc(l)+'</option>').join('')+'</select>';
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
/* ---------- « Comme en solo » : en ligue, mon club s'affiche avec tous les écrans du jeu solo ----------
   On fabrique un état de la même forme qu'une partie solo (mon club en n° 0, ma gestion rangée dans S) à partir de ce que
   le serveur me montre. Les écrans de jeu.js fonctionnent alors tels quels. Ce qui change :
   - mes réglages de match (composition, entraînement, consigne…) sont envoyés au serveur à chaque changement ;
   - ce qui touche à la caisse ou à l'effectif (stade, staff, sponsor, soins, renvoi…) est demandé au serveur ;
   - le marché est remplacé par les enchères ; le match se joue à l'heure prévue, pas au bouton. */
const cleDeuil=d=>LG.id+':'+d.saison+':'+d.jour+':'+d.nom;
function deuilsVus(){try{return JSON.parse(localStorage.getItem('woodbowl-deuils')||'[]')}catch(e){return[]}}
function noterDeuilVu(d){const v=deuilsVus();const k=cleDeuil(d);if(!v.includes(k)){v.push(k);try{localStorage.setItem('woodbowl-deuils',JSON.stringify(v.slice(-80)))}catch(e){}}}
function construireSolo(){
  const L=LG.L,club0=monEquipe();if(!L||!club0||!L.etat||L.etat.draft)return null;
  const E=JSON.parse(JSON.stringify(L.etat)),club=JSON.parse(JSON.stringify(club0)),k=club.id,g=club.gest||{};
  const perm=id=>id===k?0:id===0?k:id;
  E.teams[k]=club;
  E.teams.forEach(T=>{if(T.id!==k){T.enLigueHumain=!!T.humain;if(T.humain)T.rep='Le club de '+(T.pseudo||'un ami')+'.';T.humain=false;if(!T.ia)T.ia={brutal:.2,prudent:.2,pot:.1,focus:'v'};if(T.or===undefined)T.or=0;if(!T.rep)T.rep='';T.joueurs.forEach(p=>{if(p.titulaire===undefined)p.titulaire=false})}});
  const t0=E.teams[0];E.teams[0]=E.teams[k];E.teams[k]=t0;E.teams.forEach((T,i)=>{T.id=i});
  E.calendrier=(E.calendrier||[]).map(j=>j.map(m=>m.map(perm)));
  if(E.classFinal)E.classFinal=E.classFinal.map(perm);
  if(E.coupe){E.coupe.tableau=E.coupe.tableau.map(t=>t.map(perm));E.coupe.tours.forEach(t=>t.matchs.forEach(m=>{m.ida=perm(m.ida);m.idb=perm(m.idb);m.v=perm(m.v);m.moi=m.ida===0||m.idb===0}))}
  (E.fame||[]).forEach(f=>{if(f.cid!==undefined)f.moi=f.cid===k});(E.morts||[]).forEach(m=>{if(m.cid!==undefined)m.moi=m.cid===k});
  /* ma gestion, rangée comme en solo */
  const c=g.choix||{},o=LG.ordres;
  E.choix={consigne:(o&&o.consigne)||c.consigne||'normal',tactique:(o&&o.tactique)||c.tactique||'equilibre',pot:!!(o&&o.pot),marque:(o&&o.marque)||null,ordres:Object.assign({},(o&&o.ordres)||{}),coupeRot:!!(o&&o.coupeRot)};
  E.rapport=g.rapport?Object.assign({},g.rapport,{adv:perm(g.rapport.adv)}):null;
  E.evt=g.evt?Object.assign({},g.evt):null;if(E.evt&&E.evt.de!==undefined)E.evt.de=perm(E.evt.de);
  E.sponsor=g.sponsor||null;E.offresSponsor=g.offresSponsor||[];E.candidats=g.candidats||{prep:[],chin:[],strat:[]};
  E.histOr=g.histOr||[];E.plumes=!!g.plumes;E.titres=g.titres||0;E.coupes=g.coupes||0;E.prets=g.prets||null;
  const vus=deuilsVus();E.deuils=(g.deuils||[]).map(d=>Object.assign({},d,{vu:d.vu||d.fun||vus.includes(cleDeuil(d))}));
  E.inter=g.inter?JSON.parse(JSON.stringify(g.inter)):null;
  if(E.inter){(E.inter.recues||[]).forEach(x=>{if(x.de!==undefined)x.de=perm(x.de)});(E.inter.arrivees||[]).forEach(a=>{if(a.de!==undefined)a.de=perm(a.de)});if(LG.ecoute)E.inter.ecoute=true}
  const moi=E.teams[0];delete moi.gest;moi.liste=moi.liste||[];
  /* mes ordres déjà envoyés pour cette journée : composition, ordre du banc, entraînement */
  if(o&&Array.isArray(o.titulaires)){
    const banc=Array.isArray(o.banc)?o.banc:[];const rang=p=>o.titulaires.includes(p.id)?-1:(banc.indexOf(p.id)<0?99:banc.indexOf(p.id));
    moi.joueurs.forEach(p=>{p.titulaire=o.titulaires.includes(p.id);delete p.auBanc;if(!p.titulaire&&!banc.includes(p.id))p.auBanc=true;if(o.entr&&o.entr[p.id]&&ENTR[o.entr[p.id]])p.entr=o.entr[p.id]});
    moi.joueurs=moi.joueurs.map((p,i)=>[p,i]).sort((a,b)=>rang(a[0])-rang(b[0])||a[1]-b[1]).map(x=>x[0]);
  }
  E.gazettes=(LG.gazettes||[]).slice();E.marche=[];E.opts={};E.multi=false;E.enLigue=true;E.monIndex=k;E.div=4;E.divMax=4;E.v=3;
  E.vus=E.vus||[];E.morts=E.morts||[];E.fame=E.fame||[];
  return E;
}
function contenuDepuisSolo(){
  const moi=S.teams[0],c=S.choix,entr={};moi.joueurs.forEach(p=>{entr[p.id]=p.entr});
  return{titulaires:moi.joueurs.filter(p=>p.titulaire).map(p=>p.id),banc:moi.joueurs.filter(p=>!p.titulaire&&!p.auBanc).map(p=>p.id),entr,
    consigne:c.consigne,tactique:c.tactique||'equilibre',pot:!!c.pot,marque:c.marque||null,ordres:c.ordres||{},coupeRot:!!c.coupeRot};
}
function reconstruire(){
  const E=construireSolo();if(!E){if(enClub())sortirClub();return}
  S=courant(E);partieId=null;
  if(deuil&&!(S.deuils||[]).some(d=>!d.vu))deuil=null;
  if(!deuil&&(S.deuils||[]).some(d=>!d.vu))deuilSuivant();
  if(LG.L.phase==='saison'&&!LG.ordres)synchroniser(true); /* ouvrir son club vaut présence : sinon, pilote automatique complet */
}
function entrerClub(v){
  LG.ecoute=false;reconstruire();if(!enClub())return;
  vue=v||'vestiaire';numero=-1;fiche=null;clubVu=null;offre=null;prono=false;guide=false;tuto=-1;tiroir=false;pretVu=false;legVue=null;
  window.scrollTo(0,0);try{Son.ambiance(AMB[vue])}catch(e){}
  rendre();
}
function sortirClub(){S=null;partieId=null;ecran='multi';LG.ecran='ligue';LG.onglet='ligue';fiche=null;clubVu=null;offre=null;prono=false;guide=false;deuil=null;tiroir=false;pretVu=false;legVue=null;window.scrollTo(0,0)}
/* envoie mes réglages de match au serveur (un court instant après le dernier changement) */
function synchroniser(tout){
  if(!enClub()||LG.L.phase!=='saison')return;
  clearTimeout(LG.envoi);
  LG.envoi=setTimeout(async()=>{
    LG.envoi=null;if(!enClub())return;
    const c=contenuDepuisSolo(),j=JSON.stringify(c);if(!tout&&j===LG.dernierEnvoi)return;
    const r=await API.envoyerOrdres(LG.L.id,S.monIndex,LG.L.version+1,c);
    if(r.erreur){LG.statutOrdres='erreur';informer('Ordres non enregistrés','Vérifiez votre connexion : vos derniers réglages n\'ont pas été transmis au serveur.','refus');redessiner()}
    else{LG.ordres=c;LG.dernierEnvoi=j;LG.statutOrdres='ok'}
  },tout?0:350);
}
/* une action de gestion demandée au serveur, puis l'écran est reconstruit avec la réponse */
async function geste(g,apres){
  if(LG.occupe)return;LG.occupe=true;
  let r;try{r=await API.demande({action:'gestion',ligue:LG.L.id,geste:g})}catch(e){r={erreur:'Le serveur ne répond pas.'}}
  LG.occupe=false;
  if(!r||r.erreur){informer('Impossible',esc((r&&r.erreur)||'Erreur inconnue.'),'refus');if(apres)apres(r||{},false);rendre();return}
  if(apres)apres(r,true);
  await recharger(false);
}
const horaire=()=>{const h=(LG.L.etat.horaires)||{};return LG.L.phase==='pause'?'la ligue est en pause':LG.L.phase==='inter'?'reprise '+quand(h.reprise):'coup d\'envoi '+quand(h.match)};
window.LigueSolo={
  marche:()=>'<section class="bloc lg">'+vueMercato()+'</section>',
  bandeau(){const L=LG.L,h=(L.etat.horaires)||{};
    return'<div class="lg-bandeau-solo"><button class="discret" data-l="sortirClub">‹ '+esc(L.nom)+'</button><span>'
      +(L.phase==='pause'?'Ligue en pause':L.phase==='inter'?'Intersaison · reprise '+quand(h.reprise):L.etape==='mercato'?'Mercato jusqu\'à '+quand(h.mercato):'Match '+quand(h.match))+'</span></div>'},
  /* le match ne se lance pas au bouton : on le remplace par l'heure du coup d'envoi */
  habiller(html){
    return html.replace(/<button class="gros" data-act="jouer">[^<]*<\/button>/g,'<div class="panneau lg-prochain"><b>'+(LG.L.phase==='pause'?'Ligue en pause':'Coup d\'envoi : '+quand((LG.L.etat.horaires||{}).match))+'</b><p class="note">Vos réglages sont enregistrés à chaque changement. Le match se joue tout seul à l\'heure dite, pour tout le monde en même temps.</p></div>')
      .replace(/<button class="gros" data-act="lancer"[^>]*>[^<]*<\/button>/g,'<div class="panneau lg-prochain"><b>Reprise : '+quand((LG.L.etat.horaires||{}).reprise)+'</b><p class="note">La nouvelle saison démarre toute seule à cette date, pour tout le monde.</p></div>');
  },
  synchroniser:()=>synchroniser(false),
  /* renvoie undefined pour laisser faire le solo, autre chose quand la ligue s'en occupe */
  action(act,v,id,b){
    const moi=S.teams[0];
    switch(act){
      case'titre':sortirClub();return true;
      case'jouer':informer('Le match se joue à l\'heure prévue','Vos réglages sont enregistrés. '+horaire().charAt(0).toUpperCase()+horaire().slice(1)+'.');return true;
      case'lancer':informer('La saison reprend toute seule',horaire().charAt(0).toUpperCase()+horaire().slice(1)+'.');return true;
      case'acheter':return true;
      case'evt':geste({k:'evenement',oui:v==='1'},(r,ok)=>{if(ok&&r.msg)informer('Rebondissement',esc(r.msg))});return true;
      case'sponsor':geste({k:'sponsor',id:v},(r,ok)=>{if(ok)Son.jouer('piece')});return true;
      case'stade':geste({k:'stade',id:v},(r,ok)=>{if(ok)Son.jouer('piece')});return true;
      case'embaucher':geste({k:'embaucher',role:v,i:id},(r,ok)=>{if(ok)Son.jouer('piece')});return true;
      case'licencier':{const c=moi.staff[v];if(c)demander('Remercier '+c.nom+' ?','Le poste sera vacant. La prime versée n\'est pas rendue.','Remercier',()=>{geste({k:'licencier',role:v})});return true}
      case'soigner':{const p=moi.joueurs.find(p=>p.id===fiche);if(p)demander('Payer le guérisseur ?',esc(p.nom)+' reviendra un match plus tôt. Coût : '+COUT_SOIN+' po.','Payer '+COUT_SOIN+' po',()=>{geste({k:'soigner',id:p.id},(r,ok)=>{if(ok)Son.jouer('piece')})});return true}
      case'renvoyer':{const p=moi.joueurs.find(p=>p.id===fiche);if(p&&!p.pret)demander('Renvoyer '+p.nom+' ?',(p.sexe==='f'?'Elle':'Il')+' quitte le club définitivement. Vous récupérez '+Math.round(valeur(p)*.4)+' po et économisez '+p.sal+' po par match.','Renvoyer',()=>{geste({k:'renvoyer',id:p.id},(r,ok)=>{if(ok)fiche=null})});return true}
      case'renommer':{const p=moi.joueurs.find(p=>p.id===fiche);const n=(document.getElementById('renom').value||'').trim();fiche=null;if(p&&n&&n!==p.nom)geste({k:'renommer',id:p.id,nom:n});return true}
      case'emprunter':geste({k:'pret',id},(r,ok)=>{if(ok){Son.jouer('carte');pretVu=false}});return true;
      case'banque':demander('Emprunter '+PRET.montant+' po ?','Vous recevez '+PRET.montant+' po tout de suite, puis '+PRET.parMatch+' po sont prélevés à chaque match pendant '+PRET.nb+' matchs. Total remboursé : '+PRET.parMatch*PRET.nb+' po.','Emprunter',()=>{geste({k:'emprunt'},(r,ok)=>{if(ok)Son.jouer('piece')})});return true;
      case'deuil-ok':if(deuil)noterDeuilVu(deuil);return undefined;
      case'deuil-fun':{if(!deuil)return true;const i=(S.deuils||[]).indexOf(deuil),d=deuil;noterDeuilVu(d);d.vu=true;deuilSuivant();
        geste({k:'funerailles',i},(r,ok)=>{if(ok)informer('Funérailles','Tout le club suit le cortège. Les supporters ont apprécié le geste : +3 de ferveur.','triste')});return true}
      case'arrivee':geste({k:'arrivee',i:id,oui:v==='1'},(r,ok)=>{if(ok&&r.msg)informer('Intersaison',esc(r.msg))});return true;
      case'lister':geste({k:'lister',id});return true;
      case'ecouter':LG.ecoute=true;geste({k:'offres'});return true;
      case'accepter-offre':geste({k:'offre',i:Number(v)},(r,ok)=>{if(ok)Son.jouer('piece')});return true;
      case'offre-proposer':{const rep=proposerEchange(S,offre.cible,offre.donne,offre.po);offre.rep=rep;
        if(rep.statut==='oui'){const o=offre;const cible=trouver(o.cible).p;demander('Conclure l\'échange ?','Vous recevez <b>'+esc(cible.nom)+'</b> contre '+(o.donne.length?o.donne.map(i=>esc(trouver(i).p.nom)).join(' et '):'rien')+(o.po?(o.po>0?' et '+o.po+' po':', en recevant '+(-o.po)+' po'):'')+'. C\'est définitif.','Conclure',()=>{geste({k:'echangeIA',cible:o.cible,donne:o.donne,po:o.po},(r,ok)=>{if(ok){offre=null;Son.jouer('piece')}})})}
        else Son.jouer(rep.statut==='contre'?'carte':'refus');return true}
      case'offre-contre':{const o=offre;const po=o.rep.po;const cible=trouver(o.cible).p;
        if(po>moi.or){informer('Caisse insuffisante','Il vous faudrait '+po+' po.','refus');return true}
        demander('Accepter la contre-offre ?','Vous recevez <b>'+esc(cible.nom)+'</b> contre '+(o.donne.length?o.donne.map(i=>esc(trouver(i).p.nom)).join(' et ')+' et ':'')+po+' po. C\'est définitif.','Conclure',()=>{geste({k:'echangeIA',cible:o.cible,donne:o.donne,po},(r,ok)=>{if(ok){offre=null;Son.jouer('piece')}})});return true}
    }
    return undefined;
  }
};
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
  const b=ev.target;if(!b||!b.dataset||(S&&!S.enLigue))return;
  if(b.dataset.champ)LG.form[b.dataset.champ]=b.value;
  if(b.dataset.mise)LG.saisie[b.dataset.mise]=b.value;
  if(b.dataset.hap&&b.tagName==='INPUT')LG.hap[b.dataset.hap]=b.value;
});
document.addEventListener('change',ev=>{
  const b=ev.target;if(!b||!b.dataset||(S&&!S.enLigue)||(!S&&ecran!=='multi'))return;
  const c=b.dataset.sel;if(!c)return;const v=b.value,L=LG.L;
  if(c.startsWith('hap:')){LG.hap[c.slice(4)]=v;rendre();return}
  if(c.startsWith('reg:')){faire({action:'reglages',ligue:L.id,reglages:{[c.slice(4)]:Number(v)}});return}
});
function clubSaisi(){const f=LG.form;return{nom:f.club.trim(),couleur:f.couleur,peuple:f.peuple}}
async function ouvrir(id){LG.id=id;LG.L=null;LG.clubs=[];LG.vue=null;LG.mises={};LG.saisie={};LG.signature='';LG.ordres=null;LG.gaz=null;LG.gazettes=[];LG.dernierEnvoi='';LG.ecran='ligue';LG.onglet='ligue';redessiner();await recharger(false)}
document.addEventListener('click',ev=>{
  const b=ev.target.closest&&ev.target.closest('[data-l]');if(!b||(S&&!S.enLigue)||(!S&&ecran!=='multi'))return;
  if(b.disabled)return;
  const a=b.dataset.l,v=b.dataset.v,id=Number(b.dataset.id),f=LG.form,L=LG.L;
  Son.toucher();Son.jouer('clic');
  switch(a){
    case'reessayer':connecter();break;
    case'aller':LG.ecran=v;if(v==='accueil'){LG.id=null;LG.L=null;if(LG.uid)API.ligues(LG.uid).then(x=>{LG.ligues=x;redessiner()},()=>{})}break;
    case'onglet':if(v==='club'||v==='gazette'){entrerClub(v==='club'?'vestiaire':'gazette');return}LG.onglet=v;break;
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
    case'sortirClub':sortirClub();break;
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
