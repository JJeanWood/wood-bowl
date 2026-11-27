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
  id:null,L:null,clubs:[],vue:null,mises:{},saisie:{},filtre:'tous',montrerCode:false,signature:''};
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
    sb.rpc('passage',{l:id}).then(()=>{},()=>{});
    return{L,clubs,vue:v.data?v.data.vue:null,mises};
  },
  async miser(id,club,tour,joueur,montant){const r=await sb.from('encheres').upsert({ligue_id:id,club_index:club,tour,joueur_id:joueur,montant,maj:new Date().toISOString()});return r.error?{erreur:'La mise n\'a pas été enregistrée (le tour est peut-être clos).'}:{ok:true}},
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
  try{const d=await API.charger(LG.id,LG.uid);const sig=JSON.stringify([d.L.phase,d.L.etape,d.L.echeance,d.L.version,d.clubs,d.mises,d.vue&&d.vue.club&&[d.vue.club.or,d.vue.club.joueurs.length],d.L.etat&&d.L.etat.draft&&d.L.etat.draft.vivier.length]);
    const change=sig!==LG.signature;Object.assign(LG,d);LG.signature=sig;
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
  const onglets=[['ligue',L.phase==='inscriptions'?'Salle d\'attente':L.phase==='draft'||(L.phase==='pause'&&L.etat&&L.etat.draft)?'Draft':'Ligue'],['membres','Membres']];if(estAdjoint())onglets.push(['commissaire','Commissaire']);
  let h='<section class="ecran-menu lg">'+retour(L.nom,'accueil')
    +'<div class="sous" role="tablist">'+onglets.map(([k,l])=>'<button role="tab" data-l="onglet" data-v="'+k+'" aria-selected="'+(LG.onglet===k)+'">'+l+'</button>').join('')+'</div>';
  if(L.phase==='pause')h+='<div class="panneau lg-bandeau"><b>Ligue en pause.</b> Le commissaire reprendra quand tout le monde sera prêt.</div>';
  if(LG.onglet==='membres')h+=vueMembres();
  else if(LG.onglet==='commissaire'&&estAdjoint())h+=vueCommissaire();
  else if(L.phase==='inscriptions')h+=vueAttente();
  else if(L.etat&&L.etat.draft)h+=vueDraft();
  else h+=vueSaisonProvisoire();
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
  const L=LG.L,T=(L.etat&&L.etat.teams)||[];let h='<div class="effectif">';
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
  return h+'<p class="note">Les réglages du rythme et les happenings arrivent dans la prochaine mise à jour.</p>';
}
function carteDraft(p,moi){
  const mise=LG.mises[p.id],min=p.plancher||1,val=LG.saisie[p.id]!==undefined?LG.saisie[p.id]:(mise!==undefined?mise:'');
  return'<div class="carte lg-carte'+(mise!==undefined?' misee':'')+'">'+vignette(p,'#7a6650')+'<div style="min-width:0"><span class="lg-nom">'+esc(p.nom)+'</span>'
    +'<div class="puces"><span class="puce">'+p.poste+'</span><span class="puce">'+RACES[p.race].nom+'</span>'+(p.trait&&p.trait!=='aucun'?'<span class="puce"'+aide(TRAITS[p.trait].desc)+'>'+TRAITS[p.trait].nom+'</span>':'')+'<span class="puce">'+p.age+' ans</span>'+(p.brume?'<span class="puce"'+aide(CADRES_SPE.brume.desc)+'>Pierre de brume</span>':'')+'</div>'
    +jaugesJoueur(p)+'<div style="font-size:12.5px;color:var(--creme-sourde);margin-top:3px">Potentiel '+etoiles(etoilesPot(marge(p)))+' · '+salaire(p)+' po par match</div></div>'
    +'<div class="achat"><div style="font-size:12px;color:var(--creme-sourde);text-align:center">mise minimale</div><div class="prix-po num">'+min+' po</div>'
    +'<input type="number" inputmode="numeric" class="lg-mise" data-mise="'+p.id+'" min="'+min+'" max="'+(moi?moi.or:999)+'" value="'+val+'" placeholder="'+min+'" aria-label="Votre mise pour '+esc(p.nom)+'">'
    +'<button class="discret or" data-l="miser" data-id="'+p.id+'">'+(mise!==undefined?'Modifier':'Miser')+'</button>'+(mise!==undefined?'<button class="discret" data-l="retirer" data-id="'+p.id+'">Retirer</button>':'')+'</div></div>';
}
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
  h+='<div class="effectif">'+(liste.length?liste.map(p=>carteDraft(p,moi)).join(''):'<div class="panneau">'+(LG.filtre==='mises'?'Vous n\'avez encore misé sur personne.':'Plus personne à ce poste.')+'</div>')+'</div>';
  if(D.ventes&&D.ventes.length)h+='<div class="panneau" style="margin-top:12px"><b>Résultats du premier tour</b><p class="note" style="margin-top:4px">'+D.ventes.map(v=>esc(v.nom)+' → '+esc((L.etat.teams[v.club]||{}).court||'?')+' ('+v.prix+' po)').join('<br>')+'</p></div>';
  return h;
}
function vueSaisonProvisoire(){
  const L=LG.L,E=L.etat,moi=LG.vue&&LG.vue.club,hq=E.horaires||{};
  let h='<div class="panneau lg-etat"><b>'+(L.phase==='inter'?'Intersaison':'Saison '+E.saison+' · journée '+Math.min(E.jour+1,E.calendrier.length)+' sur '+E.calendrier.length)+'</b><p class="note">'
    +(L.phase==='inter'?'Reprise : '+quand(hq.reprise):(L.etape==='mercato'?'Clôture du mercato : '+quand(hq.mercato)+'<br>':'')+'Prochain match : '+quand(hq.match))+'</p>'
    +'<p class="note">La draft est terminée, la saison tourne. Les écrans de saison (vestiaire, mercato, gazette) arrivent dans la prochaine mise à jour : d\'ici là, votre club joue en pilote automatique.</p></div>';
  const cl=classement(E);
  h+='<div class="panneau"><b>Classement</b><table class="comptes lg-class">'+cl.map((T,k)=>'<tr'+(moi&&T.id===moi.id?' class="moi"':'')+'><td>'+(k+1)+'. '+esc(T.court)+(T.humain?'':' <small>(ordinateur)</small>')+'</td><td>'+T.j+' j · '+T.bp+'–'+T.bc+'</td><td><b>'+T.pts+' pts</b></td></tr>').join('')+'</table></div>';
  if(moi)h+='<div class="panneau"><b>'+esc(moi.nom)+' · '+moi.or+' po</b><p class="note" style="margin-top:4px">'+moi.joueurs.map(p=>esc(p.nom)+' ('+POSTES[p.poste].court+', '+notePoste(p)+')').join(' · ')+'</p></div>';
  return h;
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
});
function clubSaisi(){const f=LG.form;return{nom:f.club.trim(),couleur:f.couleur,peuple:f.peuple}}
async function ouvrir(id){LG.id=id;LG.L=null;LG.clubs=[];LG.vue=null;LG.mises={};LG.saisie={};LG.signature='';LG.ecran='ligue';LG.onglet='ligue';redessiner();await recharger(false)}
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
    case'miser':{const p=L.etat.draft.vivier.find(x=>x.id===id),moi=LG.vue&&LG.vue.club,m=Math.floor(Number(LG.saisie[id]!==undefined?LG.saisie[id]:LG.mises[id]));if(!p||!moi)break;
      const min=p.plancher||1;
      if(!(m>=min)){informer('Mise trop basse','La mise minimale pour '+p.nom+' est de '+min+' po.');break}
      if(m>moi.or){informer('Mise trop haute','Vous ne pouvez pas miser plus que votre caisse ('+moi.or+' po).');break}
      if(moi.joueurs.length>=MAX_EFFECTIF){informer('Effectif complet','Vous avez déjà '+MAX_EFFECTIF+' joueurs.');break}
      API.miser(L.id,moi.id,L.etat.encheres.tour,id,m).then(r=>{if(r.erreur)informer('Impossible',r.erreur);else{LG.mises[id]=m;delete LG.saisie[id];Son.jouer('piece')}redessiner()});return}
    case'retirer':{const moi=LG.vue&&LG.vue.club;if(!moi)break;API.retirer(L.id,moi.id,L.etat.encheres.tour,id).then(r=>{if(r.erreur)informer('Impossible',r.erreur);else{delete LG.mises[id];delete LG.saisie[id]}redessiner()});return}
  }
  rendre();
});
})();
