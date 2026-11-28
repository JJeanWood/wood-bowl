'use strict';
/* ================= WOOD BOWL · INTERFACE ================= */
const CLE='woodbowl-v3',ANCIENNE='brutball-v2';
let filtreR='tous',S=null,vue='vestiaire',numero=-1,fiche=null,clubVu=null,offre=null,confirmation=null,message=null,filtre='tous',accueil={nom:'',race:'humain'},tombe=false,finJournee=0;
const $app=document.getElementById('app');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* ---------- Sauvegardes : plusieurs équipes, chacune dans son emplacement ---------- */
const INDEX='woodbowl-parties',PFX='woodbowl-p-',DERN='woodbowl-derniere';
let partieId=null,ecran='titre',importErreur='';
function lireIndex(){try{const L=JSON.parse(localStorage.getItem(INDEX)||'null');return Array.isArray(L)?L:null}catch(e){return null}}
function ecrireIndex(L){try{localStorage.setItem(INDEX,JSON.stringify(L))}catch(e){}}
const nouvelId=()=>Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36);
function peupleDe(T){const n={};T.joueurs.forEach(p=>{if(!p.mort)n[p.race]=(n[p.race]||0)+1});return Object.keys(n).sort((a,b)=>n[b]-n[a])[0]||'humain'}
function resumePartie(id,X){const T=X.teams[0];const vedette=T.joueurs.filter(p=>!p.mort).sort((a,b)=>(b.f+b.v+b.t)-(a.f+a.v+a.t))[0];
  return{id,nom:T.nom,couleur:T.couleur,peuple:peupleDe(T),saison:X.saison,jour:X.jour,nbJours:X.calendrier?X.calendrier.length:10,phase:X.phase,fini:!!X.fini,rang:rangDe(X,0),or:T.or,
    titres:X.titres||0,div:X.div||4,coupes:X.coupes||0,tete:vedette?[vedette.race,vedette.tete]:null,maj:Date.now()}}
function sauver(){if(S&&S.enLigue){if(window.LigueSolo)LigueSolo.synchroniser();return}if(!S||!partieId)return;try{localStorage.setItem(PFX+partieId,JSON.stringify(S));const L=lireIndex()||[];const r=resumePartie(partieId,S);const i=L.findIndex(x=>x.id===partieId);if(i>=0)L[i]=r;else L.push(r);ecrireIndex(L);localStorage.setItem(DERN,partieId)}catch(e){}programmerEnvoi(partieId)}
function preparerSauvegardes(){ /* l'ancienne partie unique devient le premier emplacement */
  if(lireIndex())return;const L=[];const old=charger();
  if(old){const id=nouvelId();try{localStorage.setItem(PFX+id,JSON.stringify(old));localStorage.setItem(DERN,id)}catch(e){}courant(old);L.push(resumePartie(id,old))}
  ecrireIndex(L);
}
function ouvrirPartie(id){try{const t=localStorage.getItem(PFX+id);if(!t)return false;const o=migrer(JSON.parse(t));if(!o)return false;S=courant(o);partieId=id;vue='vestiaire';numero=-1;fiche=null;clubVu=null;offre=null;pageG=0;prono=false;guide=false;localStorage.setItem(DERN,id);return true}catch(e){return false}}
function quitterPartie(){sauver();S=null;partieId=null;ecran='titre';vue='vestiaire';fiche=null;clubVu=null;offre=null;prono=false;guide=false;tuto=-1}
function supprimerPartie(id){if(NUAGE){aEnvoyer.delete(id);NUAGE.doc('p-'+id).delete().catch(()=>{})}try{localStorage.removeItem(PFX+id);if(localStorage.getItem(DERN)===id)localStorage.removeItem(DERN)}catch(e){}ecrireIndex((lireIndex()||[]).filter(x=>x.id!==id))}
async function exporterPartie(id){try{const t=localStorage.getItem(PFX+id);const r=(lireIndex()||[]).find(x=>x.id===id);if(!t||!r)return;
  const nom='WoodBowl - '+r.nom.replace(/[\\/:*?"<>|]/g,'')+' - S'+r.saison+'J'+(r.jour+1)+'.json',data=JSON.stringify({jeu:'Wood Bowl',format:1,partie:JSON.parse(t)});
  let dl=null;try{dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null}catch(e){}
  if(dl){try{await dl.save({filename:nom,data});return}catch(e){}}
  const blob=new Blob([data],{type:'application/json'});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=nom;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}catch(e){}}
/* ---------- Sauvegarde en ligne : le stockage de l'artifact, privé à chaque joueur ---------- */
let NUAGE=null,nuageEtat='local',aEnvoyer=new Set(),envoi=null;
async function brancherNuage(){
  try{if(!window.claude||!window.claude.use)return;const db=await window.claude.use('db'),user=await window.claude.use('user');if(!db||!user)return;
    const uid=await user.id();if(!uid)return;const col=db.collection('data/users/'+uid);
    const snap=await Promise.race([col.get(),new Promise((_,ko)=>setTimeout(()=>ko('lent'),10000))]);
    NUAGE=col;nuageEtat='nuage';const L=lireIndex()||[];
    snap.docs.forEach(d=>{const b=d.data();if(!b||!b.resume||typeof b.partie!=='string'||!d.id.startsWith('p-'))return;const id=d.id.slice(2);const loc=L.find(x=>x.id===id);
      if(!loc||(b.resume.maj||0)>(loc.maj||0)){try{localStorage.setItem(PFX+id,b.partie)}catch(e){}if(loc)Object.assign(loc,b.resume);else L.push(Object.assign({},b.resume,{id}))}});
    ecrireIndex(L);
    const distants=new Set(snap.docs.map(d=>d.id));L.forEach(r=>{const d=snap.docs.find(x=>x.id==='p-'+r.id);if(!distants.has('p-'+r.id)||(d&&(d.data().resume.maj||0)<(r.maj||0)))aEnvoyer.add(r.id)});
    envoyer();if(!S)rendre();
  }catch(e){NUAGE=null;nuageEtat='local'}
}
function programmerEnvoi(id){if(!NUAGE)return;aEnvoyer.add(id);clearTimeout(envoi);envoi=setTimeout(envoyer,1500)}
let envoiEnCours=false;
async function envoyer(){if(!NUAGE||envoiEnCours)return;envoiEnCours=true;
  try{for(const id of[...aEnvoyer]){aEnvoyer.delete(id);const t=localStorage.getItem(PFX+id);const r=(lireIndex()||[]).find(x=>x.id===id);if(!t||!r)continue;
      if(t.length>250000)continue;
      try{await NUAGE.doc('p-'+id).set({resume:r,partie:t})}catch(e){if(e&&e.code==='unavailable'){aEnvoyer.add(id);setTimeout(envoyer,4000)}else if(e&&(e.code==='invalid_argument'||e.code==='revoked'||e.code==='not_granted')){NUAGE=null;nuageEtat='local'}}}}
  finally{envoiEnCours=false}}
function importerFichier(f){const lr=new FileReader();lr.onload=()=>{try{let o=JSON.parse(lr.result);if(o&&o.partie)o=o.partie;o=migrer(o);if(!o||!o.teams)throw 0;
    const id=nouvelId();localStorage.setItem(PFX+id,JSON.stringify(o));courant(o);const L=lireIndex()||[];L.push(resumePartie(id,o));ecrireIndex(L);programmerEnvoi(id);importErreur='';S=null;informer('Équipe importée',esc(o.teams[0].nom)+' a rejoint vos sauvegardes.','fanfare')}
  catch(e){importErreur='Ce fichier n\'est pas une sauvegarde de Wood Bowl.';Son.jouer('refus')}rendre()};lr.readAsText(f)}
function charger(){
  try{let t=localStorage.getItem(CLE);if(t)return migrer(JSON.parse(t));t=localStorage.getItem(ANCIENNE);if(t){const o=migrer(JSON.parse(t));if(o)localStorage.setItem(CLE,JSON.stringify(o));return o}}catch(e){}
  return null;
}
const teteOk=(race,t)=>typeof t==='string'?t:race+((race==='elfe'&&t===6)?2:(t||0));
const img=(race,tete)=>'img/'+teteOk(race,tete)+'.jpg';
const tableau=(race,tete)=>'img/tableau/'+teteOk(race,tete)+'.jpg';
const moiT=()=>S.teams[0];
const fr=x=>String(x).replace('.',',');

/* ---------- Dessins ---------- */
const LOGOS=[['patine','Nuit patinée'],['nuit','Nuit de match'],['affiche','Vieille affiche'],['cuir','Cuir et clous'],['1','Le nain casqué']];
function logoActuel(){let v=null;try{if(!localStorage.getItem('woodbowl-logo-v2')){localStorage.setItem('woodbowl-logo','patine');localStorage.setItem('woodbowl-logo-v2','1')}v=localStorage.getItem('woodbowl-logo')}catch(e){}return LOGOS.some(l=>l[0]===v)?v:'patine'}
const srcLogo=k=>k==='1'?'img/logo1.png':'img/logo_'+k+'.png';
function logo(cls){return cls==='grand'?'<img class="logo-img grand" alt="Wood Bowl" src="'+srcLogo(logoActuel())+'">':'<img class="logo-img" alt="Wood Bowl" src="img/titre.png">'}
const ICO={
  vestiaire:'<path d="M3 15a9 9 0 0 1 18 0v2H3z"/><path d="M12 15h9M15 15v4h6"/>',
  gazette:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  ligue:'<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
  marche:'<path d="M8 7l1-3h6l1 3"/><path d="M5 9h14l-1 11H6z"/><path d="M10 13h4"/>',
  legendes:'<rect x="4" y="3" width="16" height="18" rx="1"/><rect x="7" y="6" width="10" height="9"/><path d="M9 18h6M12 8.5a1.6 1.6 0 1 0 0 .1M9.5 14c.5-1.6 4.5-1.6 5 0"/>',
  club:'<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M12 7v10M8 11h8"/>',
  musique:'<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  sons:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'
};
const svg=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICO[k]+'</svg>';

/* ---------- Aide contextuelle ---------- */
const listeP=a=>a.length?a.map(r=>RACES[r].pl.toLowerCase()).join(' et '):'personne';
function ficheRace(r){const R0=RACES[r];return R0.pl+'. Atout : '+R0.atout+' Faiblesse : '+R0.faible+(R0.pouvoir?' '+R0.pouvoir:'')+' Spécialité : '+SPECIALITES[r].nom+', '+SPECIALITES[r].desc.charAt(0).toLowerCase()+SPECIALITES[r].desc.slice(1)+' Alliés : '+listeP(R0.allies)+'. Rivaux : '+listeP(R0.rivaux)+'.'}
const aide=t=>' data-aide="'+esc(t)+'" tabindex="0"';
const NOM_STAT={f:'Force',v:'Vitesse',t:'Passe',mn:'Mains',sp:'Spécialité',repos:'Repos'};const RANG_NOM=['','principale','secondaire','moins importante','qui ne sert pas à ce poste'];const RANG_MARQ=['','▲▲','▲','',''];
const AIDE={
  poste:"Valeur au poste : ce que le joueur apporte vraiment à son poste. Elle mélange ses notes selon leur importance pour ce poste : ▲▲ la note principale, ▲ la secondaire, et les notes grisées comptent peu ou pas du tout. Un coureur à 99 en vitesse a une excellente valeur même avec peu de force.",
  FOR:'Force : cogner, encaisser les coups et protéger le porteur. Essentielle pour un cogneur et un trois-quarts.',
  VIT:'Vitesse : percer la défense, filer au but, rattraper les fuyards. Essentielle pour un coureur et un trois-quarts.',
  PAS:'Passe : lancer le ballon et voir le jeu. Essentielle pour un passeur, inutile aux autres places.',
  MAI:'Mains : recevoir le ballon et ne pas le lâcher. Elles font le buteur : précieuses pour un coureur, utiles à tous sauf au passeur.',
  Forme:"Forme : l'énergie du joueur. Elle baisse à chaque match et à l'entraînement, remonte au repos. Sous 40, il joue nettement moins bien et se blesse plus.",
  plafond:"La barre claire derrière la note est le plafond du joueur : il ne pourra pas monter au-delà, et plus il s'en approche, plus ses progrès ralentissent.",
  potentiel:"Potentiel : la marge de progression qui lui reste avant ses plafonds. 5 étoiles = beaucoup à gagner à l'entraînement.",
  repos:"Repos : pas de progrès, mais la forme remonte nettement. Idéal pour un joueur fatigué (forme sous 60) ou avant un gros match.",
  sp:'Entraînement de la spécialité de peuple (voir la jauge SPÉ). Fatigue comme les autres entraînements.',
  f:"Musculation : la force progresse, mais le joueur se fatigue.",v:"Sprints : la vitesse progresse, mais le joueur se fatigue.",t:"Ateliers de lancer : la passe progresse, mais le joueur se fatigue.",mn:"Ateliers de réception : les mains progressent, mais le joueur se fatigue.",
  titulaire:"Touchez pour faire passer le joueur de titulaire à remplaçant. Sept titulaires commencent le match, et l'entraîneur les place au mieux sur les 7 places du terrain ; le banc entre, dans l'ordre, quand quelqu'un sort blessé ou expulsé.",
};
function aidePuce(k,p){
  if(k==='blesse')return'Blessé : il manquera encore '+pl(p.blesse,'match')+' (le chiffre baisse de 1 à chaque journée). Il ne joue pas et ne s\'entraîne pas. Un guérisseur (10 po, dans sa fiche) peut le faire revenir un match plus tôt.';
  if(k==='susp')return'Suspendu : il purge un match de suspension (carton rouge, ou 3 jaunes accumulés). Il revient au match suivant.';
  if(k==='jaune')return pl(p.sj%3,'carton jaune')+' accumulé'+(p.sj%3>1?'s':'')+' cette saison. Au 3e, il est suspendu un match. Le compteur repart à zéro à chaque nouvelle saison.';
  if(k==='legende')return'Élu '+pl(p.etoiles,'fois')+' joueur de la saison. Chaque titre lui a donné +3 dans toutes les notes. Il demande un salaire de vedette.';
  if(k==='max')return'Plafond atteint en '+ENTR[p.gain.max.de].nom.toLowerCase()+' : impossible de progresser plus dans cette note. Son entraînement est passé automatiquement '+(p.gain.max.vers==='repos'?'au repos':'en '+ENTR[p.gain.max.vers].nom.toLowerCase())+'.';
  if(k==='gain')return'Progrès de la dernière semaine d\'entraînement : +'+p.gain.n+' en '+ENTR[p.gain.k].nom.toLowerCase()+(p.gain.tout?', et +1 dans '+pl(p.gain.tout,'autre note','autres notes')+' grâce au touche-à-tout':'')+'.';
  if(k==='veteran')return(p.sexe==='f'?auFemininUI:x=>x)('Vétéran sorti de sa retraite : solide tout de suite, mais il ne progressera plus et raccrochera à la fin de la saison.');
  if(k==='jeune')return'Recrue du centre de formation : faible pour l\'instant, mais avec beaucoup de marge de progression. Petit salaire pendant sa première saison.';
  if(k==='mercenaire')return(p.sexe==='f'?auFemininUI:x=>x)('Mercenaire loué pour un seul match. Il repart juste après.');
  if(k==='poste')return p.poste+' : '+POSTES[p.poste].role;
  if(k==='race')return ficheRace(p.race);
  if(k==='trait')return TRAITS[p.trait].nom+' : '+TRAITS[p.trait].desc;
  return'';
}
const auFemininUI=t=>t.replace(/\bIl\b/g,'Elle').replace(/\bil\b/g,'elle').replace(/Vétéran sorti/,'Vétérane sortie').replace(/Mercenaire loué/,'Mercenaire louée');
let bulle=null;
function montrerBulle(el){
  cacherBulle();const t=el.getAttribute('data-aide');if(!t)return;
  bulle=document.createElement('div');bulle.className='bulle';bulle.textContent=t;document.body.appendChild(bulle);
  const r=el.getBoundingClientRect(),w=Math.min(290,innerWidth-16);bulle.style.width=w+'px';
  let x=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8);bulle.style.left=x+'px';
  const h=bulle.offsetHeight;let y=r.top-h-8;if(y<8){y=r.bottom+8;bulle.classList.add('bas')}bulle.style.top=(y+scrollY)+'px';
  bulle.style.setProperty('--fl',(r.left+r.width/2-x)+'px');
}
function cacherBulle(){if(bulle){bulle.remove();bulle=null}}

/* ---------- Morceaux d'écran ---------- */
function jauge(v,cl,cap){return'<div class="jauge '+(cl||'')+'">'+(cap?'<b style="width:'+Math.round(cap)+'%"></b>':'')+'<i class="'+(cl==='forme'?(v>=65?'b':v>=40?'m':'f'):'')+'" style="width:'+Math.round(v)+'%"></i></div>'}
const etoiles=n=>'<span class="etoiles" aria-label="'+n+' sur 5"'+aide(AIDE.potentiel)+'>'+'★'.repeat(n)+'<span style="opacity:.3">'+'★'.repeat(5-n)+'</span></span>';
function puces(p,opt){
  const P=(cl,k,txt)=>'<span class="puce '+cl+'"'+aide(aidePuce(k,p))+'>'+txt+'</span>';
  let h=P('poste','poste',p.poste)+P('','race',RACES[p.race].nom)+((p.sp||0)>=25?'<span class="puce spe"'+aide(SPECIALITES[p.race].nom+' niveau '+NIV_SPE(p.sp)+' : '+SPECIALITES[p.race].desc)+'>'+SPECIALITES[p.race].nom+' · '+NIV_SPE(p.sp)+'</span>':'');
  if(p.trait!=='aucun')h+=P('trait','trait',TRAITS[p.trait].nom);
  if(p.leg){const L=legendeDe(p.leg);h+='<span class="puce leg"'+aide('Légende du Wood Bowl. Pouvoir « '+POUVOIRS[L.pv].nom+' » : '+POUVOIRS[L.pv].desc+' Une légende inspire aussi toute son équipe (+2 % en attaque et en défense).')+'>✦ '+POUVOIRS[L.pv].nom+'</span>'}
  else if(p.etoiles)h+=P('trait','legende','★'.repeat(p.etoiles)+' Légende');
  if(p.pret)h+='<span class="puce alerte"'+aide('Prêté par '+p.pret.clubNom+' pour un seul match. Il repart juste après.')+'>Prêté · 1 match</span>';
  if(p.veteran)h+=P('trait','veteran','Vétéran');
  if(p.jeune&&!p.saisons)h+=P('gain','jeune','Recrue');
  if(p.mercenaire)h+=P('alerte','mercenaire','Mercenaire');
  if(p.sj%3)h+=P('jaune','jaune','🟨 '+pl(p.sj%3,'jaune'));
  if(p.blesse>0)h+=P('alerte','blesse','✚ Blessé · '+(p.blesse>1?'absent '+p.blesse+' matchs':'absent 1 match'));
  if(p.suspendu)h+=P('alerte','susp','Suspendu 1 match');
  if(opt&&opt.gain&&p.gain&&p.gain.n)h+=P('gain','gain','+'+p.gain.n+' '+ENTR[p.gain.k].court);if(opt&&opt.gain&&p.gain&&p.gain.max)h+=P('maxi','max',ENTR[p.gain.max.de].court+' au max');
  if(p.age)h+='<span class="puce"'+aide(etapeAge(p.age)[1]+' : '+etapeAge(p.age)[2]+'.')+'>'+p.age+' ans</span>';
  h+=pucesCarriere(p)+pucesCache(p);
  return h;
}
function jaugesJoueur(p,vu,bruit){
  const ligne=(lab,k)=>{if(vu&&bruit){const a=clamp(vu[k]-bruit,10,99),b=clamp(vu[k]+bruit,10,99);const r=rangStat(p,k);return'<span class="r'+r+'"'+aide(AIDE[lab]+' Pour un '+p.poste.toLowerCase()+', c\'est la note '+RANG_NOM[r]+'. Note estimée par votre chineur : la vraie valeur est quelque part entre '+a+' et '+b+'.')+'>'+lab+(RANG_MARQ[r]?'<i>'+RANG_MARQ[r]+'</i>':'')+'</span>'+jauge(vu[k],'flou')+'<span>'+a+'–'+b+'</span>'}
    const v=vu?vu[k]:p[k];const r=rangStat(p,k);return'<span class="r'+r+'"'+aide(AIDE[lab]+' Pour un '+p.poste.toLowerCase()+', c\'est la note '+RANG_NOM[r]+'.'+(vu?'':' Plafond de ce joueur : '+p.cap[k]+'. '+AIDE.plafond))+'>'+lab+(RANG_MARQ[r]?'<i>'+RANG_MARQ[r]+'</i>':'')+'</span>'+jauge(v,'',vu?0:p.cap[k])+'<span>'+v+'</span>'};
  return'<div class="jauges num">'+ligne('FOR','f')+ligne('VIT','v')+ligne('PAS','t')+ligne('MAI','mn')+'<span'+aide('Spécialité de peuple : '+SPECIALITES[p.race].nom+' ('+NIV_SPE(p.sp||0)+'). '+SPECIALITES[p.race].desc+' Elle se développe avec l\'entraînement SPÉ.')+'>SPÉ</span>'+jauge(p.sp||0,'spe',vu?0:(p.cap.sp||0))+'<span>'+(p.sp||0)+'</span><span'+aide(AIDE.Forme)+'>Forme</span>'+jauge(p.forme,'forme')+'<span>'+Math.round(p.forme)+'</span><span class="vp"'+aide(AIDE.poste)+'>Poste</span>'+jauge(notePoste(p,vu),'poste')+'<span class="vp">'+(vu&&bruit?'~':'')+notePoste(p,vu)+'</span></div>';
}
/* LABO : la place que le joueur occupera sur le terrain, d'après la composition du moment */
function pastillePlace(p,mode){if(mode!=='equipe'||!dispo(p))return'';const pl=placesPrevues(moiT())[p.id];if(!pl||pl===p.poste)return'';const hors=true;
  return'<span class="place'+(hors?' hors':'')+'"'+aide(hors?'Il jouera à une place de '+pl.toLowerCase()+', pas à son poste de '+p.poste.toLowerCase()+' : il y vaut '+notePoste(p,null,pl)+' (contre '+notePoste(p)+' à son poste). Aucune pénalité : seules ses notes comptent. L\'entraîneur répartit les 7 titulaires pour que l\'équipe soit la plus forte possible.':'Il jouera à son poste : une place de '+pl.toLowerCase()+'.')+'>'+(hors?'joue ':'')+POSTES[pl].court+(hors?' · '+notePoste(p,null,pl):'')+'</span>'}
function hierarchie(p){return ORDRE_POSTE[p.poste].map(k=>{const r=rangStat(p,k);return NOM_STAT[k]+(r===1?' ▲▲ (principale)':r===2?' ▲ (secondaire)':r===3?' (compte peu)':' (ne sert pas)')}).join(' · ')}
function texteConseil(p){const k=conseilEntr(p);if(k==='repos')return'toutes ses notes sont au plafond : du repos lui suffit.';if(k==='sp')return'ses notes utiles sont presque au plafond : travaillez sa spécialité.';const r=rangStat(p,k);return'travaillez la '+NOM_STAT[k].toLowerCase()+' (note '+RANG_NOM[r]+', encore '+(p.cap[k]-p[k])+' points à gagner).'}
const tamponDe=p=>p.blesse>0?'Blessé':p.suspendu?'Suspendu':'';
function vignette(p,couleur){const t=tamponDe(p);return'<div class="vignette '+cad(p,p.vu)+(t?' gris':'')+(p.leg?' leg':'')+'" style="--c:'+couleur+'"><img alt="" src="'+img(p.race,p.tete)+'"><span class="pp">'+POSTES[p.poste].court+'</span>'+(t?'<span class="tampon">'+t+'</span>':'')+'</div>'}
function carteJoueur(p,T,rang,nb,entrainement){
  const out=!dispo(p);const tit=p.titulaire&&!out;
  let cmd='<button class="poste-btn" data-act="titulaire" data-id="'+p.id+'" aria-pressed="'+tit+'" title="'+esc(AIDE.titulaire)+'" '+(out?'disabled':'')+'>'+(out?(p.blesse>0?'Infirmerie':'Tribune'):tit?'Titulaire':rang===0?'Titulaire (auto)':'Banc '+rang)+'</button>';
  if(!out&&!tit&&rang>0)cmd+='<div class="ordre"><button data-act="monter" data-id="'+p.id+'" aria-label="Faire entrer plus tôt" '+(rang<=1?'disabled':'')+'>▲</button><button data-act="descendre" data-id="'+p.id+'" aria-label="Faire entrer plus tard" '+(rang>=nb?'disabled':'')+'>▼</button></div>';
  let entr='';
  if(entrainement){
    if(p.blesse>0)entr='<div class="entr"><span>Entraîn.</span><span style="grid-column:2/-1;text-transform:none;letter-spacing:0;font-weight:500">Aux soins'+(niv(T,'prep')>=0?' du préparateur':'')+'</span></div>';
    else entr='<div class="entr"><span>Entraîn.</span>'+Object.keys(ENTR).map(k=>'<button data-act="entr" data-id="'+p.id+'" data-v="'+k+'" aria-pressed="'+(p.entr===k)+'"'+(k===conseilEntr(p)?' class="conseil"':'')+' title="'+esc((k===conseilEntr(p)?'Conseillé. ':'')+AIDE[k]+(k!=='repos'&&p[k]>=p.cap[k]?' Plafond atteint : plus de progrès possible ici.':''))+'"'+(k!=='repos'&&p[k]>=p.cap[k]?' disabled data-max="1"':'')+'>'+ENTR[k].court+(k!=='repos'&&p[k]>=p.cap[k]?'<small>MAX</small>':'')+'</button>').join('')+'</div>';
  }
  return'<div class="carte '+(out?'out':'')+'">'+vignette(p,T.couleur)
    +'<div style="min-width:0"><button class="nom" data-act="fiche" data-id="'+p.id+'">'+esc(p.nom)+'</button><div class="puces">'+puces(p,{gain:true})+'</div>'+jaugesJoueur(p)+'</div>'
    +'<div class="cmd">'+cmd+'</div>'+entr+'</div>';
}
function entete(){
  const moi=moiT();const rang=rangDe(S,0);
  const etat=S.phase==='inter'?'Intersaison':'Journée '+(S.jour+1)+' sur '+S.calendrier.length;
  return'<header class="entete"><div class="l1"><button class="logo-btn" data-act="titre" aria-label="Écran titre">'+logo()+'</button><div class="droite"><div class="bourse'+(moi.or<0?' dette':'')+'"><b class="num">'+moi.or+' po</b><small>dans la caisse</small></div>'
    +'<button class="icone" data-act="guide" aria-label="Guide des règles"><b style="font:800 18px var(--etroit)">?</b></button><button class="icone" data-act="son" data-v="musique" aria-label="Musique" aria-pressed="'+Son.reg.musique+'">'+svg('musique')+'</button><button class="icone" data-act="son" data-v="sons" aria-label="Bruitages" aria-pressed="'+Son.reg.sons+'">'+svg('sons')+'</button></div></div>'
    +'<div><h1>'+esc(moi.nom)+'</h1><div class="sous">Saison '+S.saison+' · '+etat+' · '+rang+(rang===1?'er':'e')+' · '+divDe(S).court+'</div></div></header>';
}
const CONSIGNES={prudent:'On protège ses joueurs : moins de blessés et de cartons chez vous, attaque plus timide.',normal:'On joue, on cogne un peu. Ni fou ni sage.',brutal:"On vise les genoux : plus de blessés en face, mais des cartons si l'arbitre regarde."};
const NOM_CONSIGNE={prudent:'prudente',normal:'normale',brutal:'brutale'};
const CITATIONS=[["« J'ai rêvé de ce match cette nuit. Faites-moi confiance. »","« Mon petit doigt me dit des choses. Il se trompe parfois. »"],["« J'ai jeté un œil à leurs derniers matchs, entre deux chopes. »","« Rien de sûr, mais je sens quelque chose. »"],["« J'ai mes informateurs à la buvette adverse. »","« Le vent tourne, et je sais dans quel sens. »"],["« J'ai lu leurs carnets d'entraînement. Ne me demandez pas comment. »","« Tout est écrit. Il suffit de savoir lire les bleus. »"],["« Je connais ce match. Je l'ai déjà gagné trois fois dans ma tête. »","« Ils ne le savent pas encore, mais ils ont déjà perdu. »"]];
function rapportHTML(adv){
  const r=S.rapport;const moi=moiT();
  if(!r)return'<div class="rapport"><span class="qui">Aucun stratège</span><p class="note" style="margin-top:4px">Embauchez un stratège dans l\'onglet Club pour connaître les intentions adverses et recevoir des conseils.</p></div>';
  const st=moi.staff.strat;const men=adv.joueurs.find(p=>p.id===r.menace);
  return'<div class="rapport"><span class="qui">Rapport de '+esc(st.nom)+' · '+NIV[st.niv]+'</span><p class="note" style="margin:3px 0 0;font-style:italic">'+pick(CITATIONS[st.niv])+'</p><ul>'
    +'<li>Ils devraient jouer de façon <b>'+NOM_CONSIGNE[r.prediction]+'</b>.</li>'
    +(r.pot!==null?'<li>Pot-de-vin adverse : <b>'+(r.pot?'probable':'peu probable')+'</b>.</li>':'')
    +(men?'<li>Homme à surveiller : <b>'+esc(men.nom)+'</b> ('+men.poste.toLowerCase()+', '+pl(men.sb,'but')+' cette saison).</li>':'')
    +(r.tacPrediction?'<li>Plan de jeu adverse attendu : <b>'+TACTIQUES[r.tacPrediction].nom.toLowerCase()+'</b>.</li>':'')
    +'<li>Conseil : consigne <b>'+NOM_CONSIGNE[r.conseil]+'</b>'+(r.tacConseil?', plan <b>'+TACTIQUES[r.tacConseil].nom.toLowerCase()+'</b>':'')+(men?', marquer '+esc(men.nom):'')+'.</li></ul>'
    +'<p class="note" style="margin-top:4px">Fiabilité de ce stratège : environ '+Math.round(K.fiab[st.niv+1]*100)+' %. S\'il a vu juste et que vous suivez sa consigne : +'+K.plan[st.niv+1]+' % sur le terrain.</p></div>';
}
function blocEtats(T){
  const{tit}=onzeDe(T);const actifs=etatsDe(T,tit);const ids=new Set(actifs.map(e=>e.id));const n=compterPostes(tit);
  return'<div class="equilibre">'+POSTE_IDS.map(po=>'<div class="'+(n[po]?'':'manque')+'"><b>'+n[po]+'</b><span>'+POSTES[po].pl+'</span></div>').join('')+'</div>'
    +'<div class="etats">'+(actifs.length?actifs.map(e=>'<span class="etat'+(e.mal?' mal':'')+'"'+aide(e.nom+' : '+e.effet+'. Condition : '+e.cond+'.')+'>'+e.nom+'</span>').join(''):'<span class="note" style="margin:0">Aucun état actif avec ces titulaires.</span>')+'</div>'
    +'<details class="regles"><summary>Tous les états d\'équipe et leurs conditions</summary><ul>'+ETATS.map(e=>'<li class="'+(ids.has(e.id)?'actif':'')+'"><b>'+e.nom+(ids.has(e.id)?' · actif':'')+'</b><span>'+e.cond+' : '+e.effet+'.</span></li>').join('')+'</ul></details>'
    +'<details class="regles"><summary>Peuples : atouts, faiblesses, alliés et rivaux</summary><ul>'+RACE_IDS.map(k=>'<li><b>'+RACES[k].pl+'</b><span>'+esc(ficheRace(k).replace(RACES[k].pl+'. ',''))+'</span></li>').join('')+'</ul></details>'
    +'<details class="regles"><summary>Conseils de composition</summary><ul>'
    +'<li><b>La base</b><span>2 cogneurs, 2 coureurs, 1 passeur. Sans l\'un des trois postes, vous prenez un malus de 8 à 10 %.</span></li>'
    +'<li><b>Le pari du sang pur</b><span>7 titulaires du même peuple : +8 % partout. Simple et fort, mais vous héritez de toutes les faiblesses du peuple (des elfes purs se cassent vite, des nains purs n\'avancent pas).</span></li>'
    +'<li><b>Le jeu des alliances</b><span>Mélangez des alliés pour cumuler les petits bonus : un humain avec un nain et un elfe active la Vieille alliance et le Pacte de l\'Ouest. Un orque, un gobelin et un elfe noir activent la Horde et les Coups tordus.</span></li>'
    +'<li><b>Le joyeux bazar</b><span>4 peuples différents : +7 % en attaque. Pensez à glisser un humain pour calmer une éventuelle rivalité.</span></li>'
    +'<li><b>Les rivalités</b><span>Elfe et elfe noir, nain et orque, nain et gobelin se gênent sur le terrain. Évitez-les, ou alignez un humain médiateur.</span></li>'
    +'<li><b>Les formations</b><span>3 cogneurs (Mur de brutes) pour un plan Mur défensif ; 3 coureurs (Jambes de feu) pour le Jeu au sol ; 2 passeurs (Jeu léché) pour le Jeu aérien ; 3 trois-quarts (Ligne de béliers) pour un peu de tout. Attention : le terrain n\'a qu\'une place de passeur et deux de chaque autre poste, le joueur en trop jouera donc à une place qui n\'est pas la sienne.</span></li></ul></details>'
    +'<details class="regles"><summary>Le rôle de chaque poste</summary><ul>'+POSTE_IDS.map(po=>'<li><b>'+po+'</b><span>'+POSTES[po].role+'</span></li>').join('')+'</ul></details>';
}
function blocInter(){
  const moi=moiT();const I=S.inter||{hausses:[],faits:0,journal:[]};
  const lu=S.gazettes.length&&S.gazettes[S.gazettes.length-1].final;
  let h=boutonTiroir()+'<section class="bloc"><h2>Intersaison <small>avant la saison '+(S.saison+1)+'</small></h2><div class="panneau clous"><p style="margin:0 0 4px">La saison est finie. Avant de relancer, préparez le club :</p><ol class="etapes">'
    +'<li class="'+(lu?'fait':'')+'"><div>Lire le bilan et les trophées dans la gazette.<br><button class="discret" data-act="vue" data-v="gazette">Ouvrir la gazette</button></div></li>'
    +'<li class="'+(I.faits?'fait':'')+'"><div>Échanger des joueurs avec les autres clubs : '+I.faits+' sur '+MAX_ECHANGES+' possibles.<br><button class="discret" data-act="vue" data-v="marche">Bourse aux échanges</button></div></li>'
    +'<li class="'+(S.sponsor?'fait':'')+'"><div>Choisir le sponsor de la saison'+(S.sponsor?' : '+esc(sponsorDe(S.sponsor).nom):'')+'.<br><button class="discret" data-act="vue" data-v="club">Sponsors et staff</button></div></li>'
    +'<li><div>Revoir votre staff : de nouveaux candidats se présentent.</div></li></ol>';
  if(I.mouv&&I.mouv.k!=='reste'){const mv=I.mouv;h+='<div class="encadre mouv '+mv.k+'" style="margin-top:12px"><b>'+({monte:'Montée en '+DIVS[mv.vers].nom+' !',descend:'Descente en '+DIVS[mv.vers].nom,sacre:'Champions du Grand Bol de Bois !'}[mv.k])+'</b><p class="note" style="margin:4px 0 0">'+(mv.k==='monte'?'Nouveaux adversaires, plus forts. Le marché propose de meilleurs joueurs et les recettes augmentent.':mv.k==='descend'?'Des adversaires plus abordables pour reprendre confiance.':'Le trophée suprême est à vous.')+'</p>'
    +(mv.k==='monte'?CACHE_IDS.filter(k=>CACHE[k].div===mv.vers&&(S.divMax||4)===mv.vers).map(k=>'<p class="note revele"><b>Nouveau : le '+CACHE[k].nom.toLowerCase()+' de chaque joueur est révélé.</b> '+CACHE[k].desc+' Regardez la fiche de vos joueurs.</p>').join(''):'')+'</div>'}
  const ca=I.carriere;
  if(ca){
    if(ca.retraites.length)h+='<div class="encadre jubile"><b>Jubilé</b>'+ca.retraites.map(r=>'<p style="margin:4px 0 0"><b>'+esc(r.nom)+'</b> raccroche les crampons à '+r.age+' ans, après '+pl(r.matchs,'match')+' et '+pl(r.buts,'but')+'. Le public l\'ovationne (+2 de ferveur). Son portrait rejoint le mur des légendes.</p>').join('')+'</div>';
    if(ca.annonces.length)h+='<p class="note"><b>Dernière saison annoncée</b> : '+ca.annonces.map(a=>esc(a.nom)+' ('+a.age+' ans)').join(', ')+'. Ils partiront à la fin de la saison prochaine : préparez la relève.</p>';
    if(ca.declins.length)h+='<details class="regles" open><summary>Le poids des ans</summary><ul>'+ca.declins.map(d=>'<li><b>'+esc(d.nom)+' ('+d.age+' ans)</b><span>'+Object.entries(d.perte).map(([k,n])=>ENTR[k].court+' −'+n).join(', ')+'</span></li>').join('')+'</ul></details>';
  }
  if(I.partis&&I.partis.length)h+='<p class="note">Fin de contrat : '+I.partis.map(esc).join(', ')+'.</p>';
  if(I.arrivees&&I.arrivees.length)h+='<h3 style="margin:14px 0 6px">Ça bouge au club</h3>'+I.arrivees.map((a,k)=>{const dep=a.k==='depart';const tag={legende:'Légende',migrant:'Transfuge',curieux:'Candidat spontané',depart:'Demande de départ'}[a.k];
    return'<div class="carte arrivee '+a.k+'" style="margin-bottom:8px">'+vignette(a.p,dep?moiT().couleur:'#7a6650')+'<div style="min-width:0"><span class="puce '+(a.k==='legende'?'trait':dep?'alerte':'gain')+'">'+tag+'</span> <button class="nom" data-act="fiche" data-id="'+a.p.id+'">'+esc(a.p.nom)+'</button><div class="puces">'+puces(a.p)+'</div>'+jaugesJoueur(a.p)+(dep?'':chezVous(a.p))+'<p style="font-size:14px;margin:6px 0 0">'+esc(a.texte)+'</p>'
      +'<p class="note" style="margin:4px 0 0">'+(dep?'Le laisser partir vous rapporte '+a.indem+' po. Le retenir le fera bouder un moment.':(a.prime?'Prime de signature : '+a.prime+' po, puis ':'Sans prime, puis ')+(a.k==='migrant'?a.p.sal:salaire(a.p))+' po par match.')+'</p>'
      +'<div class="seg" style="margin-top:8px"><button data-act="arrivee" data-v="1" data-id="'+k+'">'+(dep?(a.p.sexe==='f'?'La laisser partir':'Le laisser partir'):(a.p.sexe==='f'?'L\'engager':'L\'engager'))+'</button><button data-act="arrivee" data-v="0" data-id="'+k+'">'+(dep?(a.p.sexe==='f'?'La retenir':'Le retenir'):'Refuser')+'</button></div></div></div>'}).join('');
  if(I.hausses.length)h+='<details class="regles" open><summary>Contrats revus pour la saison prochaine</summary><ul>'+I.hausses.map(x=>'<li><b>'+esc(x.nom)+'</b><span>'+x.avant+' → '+x.apres+' po par match</span></li>').join('')+'</ul></details>';
  if(I.journal.length)h+='<details class="regles"><summary>Échanges réalisés</summary><ul>'+I.journal.map(x=>'<li><span>'+esc(x)+'</span></li>').join('')+'</ul></details>';
  h+='<button class="gros" data-act="lancer"'+(moi.joueurs.length<MIN_EFFECTIF?' disabled':'')+'>Lancer la saison '+(S.saison+1)+'</button>';
  if(moi.joueurs.length<MIN_EFFECTIF)h+='<p class="note alerte">Il vous faut au moins 7 joueurs : recrutez au marché.</p>';
  return h+'</div></section>';
}
function vueVestiaireAncien(){
  const moi=moiT();let h='';
  if(S.evt)h+='<section class="bloc"><h2>Rebondissement</h2><div class="panneau affiche evt"><div class="duel" style="font-size:20px">'+esc(S.evt.titre)+'</div>'+(S.evt.p&&S.evt.p.nom?'<div class="carte" style="margin-top:10px;box-shadow:none">'+vignette(S.evt.p,'#7a6650')+'<div style="min-width:0"><b>'+esc(S.evt.p.nom)+'</b><div class="puces">'+puces(S.evt.p)+'</div>'+jaugesJoueur(S.evt.p)+'</div></div>':'')+'<p style="margin-top:10px">'+esc(S.evt.texte)+'</p><div class="seg" style="margin-top:10px"><button data-act="evt" data-v="1">'+esc(S.evt.oui)+'</button><button data-act="evt" data-v="0">'+esc(S.evt.non)+'</button></div></div></section>';
  if(moi.or<0||moi.joueurs.length<6){const cs=[];
    if(moi.joueurs.length<7)cs.push('Signez un <b>jeune du pays</b> au marché : gratuit, 1 po par match, et il progresse vite.');
    if(!moi.pret)cs.push('Le <b>banquier</b> (onglet Club) prête '+PRET.montant+' po, remboursés '+PRET.parMatch+' po par match.');
    if(coutStaff(moi)>=8)cs.push('Votre staff coûte '+coutStaff(moi)+' po par match : un membre moins cher, ou aucun, soulagera la caisse.');
    const cher=moi.joueurs.slice().sort((a,b)=>b.sal-a.sal)[0];if(cher&&cher.sal>=6&&moi.joueurs.length>NB_TIT)cs.push('<b>'+esc(cher.nom)+'</b> coûte '+cher.sal+' po par match : le renvoyer rapporte '+Math.round(valeur(cher)*.4)+' po.');
    cs.push('Jouez « Prudent » : moins de blessés et de cartons chez vous.');
    h+='<section class="bloc"><div class="alerte-bloc"><b>Plan de survie</b><ul style="margin:6px 0 0;padding-left:18px">'+cs.map(c=>'<li>'+c+'</li>').join('')+'</ul></div></section>'}
  if(moi.or<0)h+='<section class="bloc"><div class="alerte-bloc"><b>Les huissiers sont à la porte.</b> Caisse dans le rouge : plus de recrutement, d\'embauche ni de pot-de-vin (les jeunes du pays restent possibles). Sous '+DETTE_MAX+' po, ils vendent un joueur d\'office.</div></section>';
  if(S.phase==='inter')h+=blocInter();
  else{
    const{adv,dom}=prochainMatch(S);const rang=rangDe(S,adv.id);
    h+='<section class="bloc"><h2>Prochain match <small>'+(dom?'à domicile':"à l'extérieur")+'</small></h2><div class="panneau affiche"><div class="duel">'+(dom?esc(moi.court)+' – '+adv.court:adv.court+' – '+esc(moi.court))+'</div>'
      +'<p><b>'+adv.nom+'</b>, '+rang+(rang===1?'er':'e')+' de la ligue. '+adv.rep+'</p><button class="discret" data-act="club" data-id="'+adv.id+'" style="margin-top:8px">Observer cette équipe</button>'+rapportHTML(adv)+'</div></section>';
    const c=S.choix;const potOk=moi.or>=COUT_POT&&!huissiers(S);const r=S.rapport;
    const cible=onzeDe(adv).tit;
    h+='<section class="bloc"><h2>Vos ordres</h2><div class="panneau choix">'+blocChances()
      +'<div><span class="t">Consigne de match</span><div class="seg">'+['prudent','normal','brutal'].map(k=>'<button data-act="consigne" data-v="'+k+'" aria-pressed="'+(c.consigne===k)+'">'+k.charAt(0).toUpperCase()+k.slice(1)+(r&&r.conseil===k?' ★':'')+'</button>').join('')+'</div><p class="effet">'+CONSIGNES[c.consigne]+(r?' ★ = conseil du stratège.':'')+'</p></div>'
      +'<div><span class="t">Plan de jeu</span><div class="seg tactiques">'+TACTIQUE_IDS.map(k=>'<button data-act="tactique" data-v="'+k+'" aria-pressed="'+((c.tactique||'equilibre')===k)+'" title="'+esc(TACTIQUES[k].desc)+'">'+TACTIQUES[k].court+(r&&r.tacConseil===k?' ★':'')+'</button>').join('')+'</div><p class="effet">'+esc(TACTIQUES[c.tactique||'equilibre'].desc)+(TACTIQUES[c.tactique||'equilibre'].bat?' Contre le '+TACTIQUES[TACTIQUES[c.tactique||'equilibre'].bat].nom.toLowerCase()+', mais se fait contrer par le '+TACTIQUES[contreDe(c.tactique||'equilibre')].nom.toLowerCase()+'.':'')+'</p>'
        +'<details class="regles"><summary>Qui bat qui ?</summary><p class="note" style="margin:6px 0 0">Chaque plan en contre un autre, et celui qui contre gagne +7 % en attaque et en défense. Le cycle : Jeu au sol → bat la Contre-attaque → qui bat le Pressing → qui bat le Jeu aérien → qui bat le Mur défensif → qui bat le Jeu au sol. « Équilibré » ne gagne ni ne perd ce duel. Votre stratège peut deviner le plan adverse.</p></details></div>'
      +'<div><span class="t">Marquage individuel</span><select data-act="marque" aria-label="Joueur adverse à marquer"><option value="">Personne</option>'+cible.map(p=>'<option value="'+p.id+'"'+(c.marque===p.id?' selected':'')+'>'+esc(p.nom)+' · '+p.poste.toLowerCase()+' · '+pl(p.sb,'but')+(r&&r.menace===p.id?' ★':'')+'</option>').join('')+'</select><p class="effet">'+(c.marque?'Le joueur marqué perd environ '+Math.round((1-kk(moi,'strat','marquage'))*100)+' % d\'efficacité ; votre attaque perd 3 %.':'Collez un joueur aux basques du meilleur adversaire. Plus votre stratège est bon, plus le marquage est serré.')+'</p></div>'
      +'<div><span class="t">Arbitre</span><div class="seg"><button data-act="pot" data-v="0" aria-pressed="'+(!c.pot)+'">Honnête</button><button data-act="pot" data-v="1" aria-pressed="'+(!!c.pot)+'" '+(potOk?'':'disabled')+'>Pot-de-vin ('+COUT_POT+' po)</button></div><p class="effet">'+(c.pot?"L'arbitre gardera ses cartons en poche, et sifflera peut-être en votre faveur. Petit risque de scandale.":potOk?'Vos fautes seront jugées normalement.':huissiers(S)?'Les huissiers surveillent votre caisse : pas de pot-de-vin.':'Caisse trop maigre pour corrompre qui que ce soit.')+'</p></div>'
      +'</div></section>';
  }
  h+='<section class="bloc"><h2>Composition <small>selon vos 7 titulaires</small></h2><div class="panneau">'+blocEtats(moi)+'</div></section>';
  const{tit,reste}=onzeDe(moi);const marques=moi.joueurs.filter(p=>dispo(p)&&p.titulaire).length;const valides=moi.joueurs.filter(dispo).length;
  const out=moi.joueurs.filter(p=>!dispo(p));const ent=S.phase==='saison';
  h+='<section class="bloc"><h2>Effectif <small>'+moi.joueurs.length+' joueurs · '+Math.min(5,tit.length)+' titulaires</small></h2>';
  h+='<div class="tous"><button class="discret or" data-act="auto" title="Choisit 7 titulaires équilibrés : un joueur de métier à chaque place si possible, les plus en forme et les plus forts.">Composition automatique</button></div>';
  if(ent)h+='<div class="tous"><span>Entraînement de tous :</span>'+Object.keys(ENTR).map(k=>'<button data-act="entr-tous" data-v="'+k+'">'+ENTR[k].nom+'</button>').join('')+'</div>';
  h+='<div class="effectif">'+tit.slice().sort((a,b)=>POSTE_IDS.indexOf(a.poste)-POSTE_IDS.indexOf(b.poste)||puissance(b)-puissance(a)).map(p=>carteJoueur(p,moi,0,0,ent)).join('')
    +(reste.length?'<p class="soustitre">Banc, dans l\'ordre d\'entrée en jeu</p>'+reste.map((p,i)=>carteJoueur(p,moi,i+1,reste.length,ent)).join(''):'')
    +(out.length?'<p class="soustitre">Indisponibles</p>'+out.map(p=>carteJoueur(p,moi,0,0,ent)).join(''):'')+'</div>';
  if(ent){
    if(marques<5&&valides>=5)h+='<p class="note alerte">Vous n\'avez désigné que '+pl(marques,'titulaire')+' : les premiers du banc complètent l\'équipe.</p>';
    if(valides<NB_TIT)h+='<p class="note alerte">Moins de 7 joueurs disponibles : des stagiaires compléteront l\'équipe. Passez au marché.</p>';
    if(marques>NB_TIT)h+='<p class="note alerte">Trop de titulaires désignés : seuls les 5 plus en forme débuteront.</p>';
    h+='<p class="note">L\'entraînement de chaque joueur est gardé d\'une semaine à l\'autre. La barre claire derrière chaque note montre son plafond : plus on s\'en approche, plus les progrès ralentissent.</p>';
    h+='<button class="gros" data-act="jouer">Jouer la journée '+(S.jour+1)+'</button>';
  }
  return h+'</section>';
}
/* ================= GAZETTE : un journal qu'on feuillette, page par page ================= */
let pageG=0,sensG=0;
/* la carte de l'homme ou de la femme du match, façon vignette de journal */
function carteHomme(h){
  if(!h)return'';const p=h.perf||{};const faits=[];if(p.b)faits.push(pl(p.b,'but'));if(p.pd)faits.push(pl(p.pd,'passe décisive','passes décisives'));if(p.sort)faits.push(pl(p.sort,'adversaire sorti','adversaires sortis'));
  return'<div class="homme-carte'+(h.moi?' moi':'')+'"><div class="hc-photo" style="--c:'+(h.couleur||'#333')+'">'+(h.tete||h.race?'<img alt="" src="'+img(h.race,h.tete)+'">':'')+'</div>'
    +'<div class="hc-txt"><small>'+(h.f?'Femme':'Homme')+' du match</small><b>'+esc(h.nom)+'</b><span>'+(h.poste?h.poste.toLowerCase()+' · ':'')+esc(h.club)+'</span><span class="hc-note">'+fr(h.note)+' / 10'+(faits.length?' · '+faits.join(', '):'')+'</span></div></div>';
}
function pagesGazette(g){
  const a=g.article,P=[];
  const tete=(rub)=>'<div class="tete-page"><span>L\'Écho du Gourdin</span><span>'+rub+'</span></div>';
  /* 1. La une */
  let une='<div class="manchette"><div class="titre">L\'Écho du Gourdin</div><div class="devise">Le journal officiel du Wood Bowl, qui frappe avant de poser les questions</div></div>'
    +'<div class="dateline"><span>Saison '+g.saison+' · Journée '+g.jour+'</span><span>Prix : 2 sous</span></div>';
  if(g.final)une+='<p class="surtitre">Numéro spécial fin de saison</p>';
  une+='<h2>'+esc(a.titre)+'</h2><p class="score">'+esc(a.score)+'</p><p class="chapo">'+esc(a.chapo)+'</p>';
  if(g.homme)une+=g.homme.race?carteHomme(g.homme):'<p class="homme">'+(g.homme.f?'Femme':'Homme')+' du match : <b>'+esc(g.homme.nom)+'</b> ('+esc(g.homme.club)+'), '+fr(g.homme.note)+' sur 10.</p>';
  P.push({id:'une',court:'La une',html:une});
  /* 2. Fin de saison */
  if(g.final){let h=tete('Le palmarès')+'<h2>Le Bol de Bois pour '+esc(g.final.champion)+'</h2><p class="chapo">Le rideau tombe sur la saison. Podium : '+g.final.podium.map(esc).join(', ')+'. Votre club termine à la '+g.final.rang+(g.final.rang===1?'re':'e')+' place'+(g.final.prix?' et empoche '+g.final.prix+' po de prime.':'.')+(g.final.bonusSp?' Le sponsor '+(g.final.bonusSp>0?'verse '+g.final.bonusSp:'réclame '+(-g.final.bonusSp))+' po.':'')+'</p>';
    if(g.final.trophees&&g.final.trophees.length)h+='<h3>Les trophées de la saison</h3><ul>'+g.final.trophees.map(t=>'<li><b>'+esc(t.titre)+'</b> : '+esc(t.nom)+' ('+esc(t.club)+'), '+esc(t.detail)+'.</li>').join('')+'</ul><p class="petit">Les lauréats entrent au mur des légendes.</p>';
    if(g.final.mouv){const mv=g.final.mouv;h+='<div class="encadre mouv '+mv.k+'"><h3>'+({monte:'Promus !',descend:'Relégués',reste:'Maintien',sacre:'Champions de l\'élite !'}[mv.k])+'</h3><p>'+({monte:'Votre club quitte la '+esc(g.final.division)+' pour la <b>'+esc(g.final.vers)+'</b>. Adversaires plus forts, recettes plus grosses'+(g.final.primeMontee?', et une prime de montée de '+g.final.primeMontee+' po':'')+'.',descend:'Dernier de la '+esc(g.final.division)+', votre club redescend en <b>'+esc(g.final.vers)+'</b>. On se refait la cerise, et on remonte.',reste:'Votre club reste en '+esc(g.final.division)+'. Il faut finir dans les 2 premiers pour monter.',sacre:'Vous dominez le Grand Bol de Bois, le sommet du Wood Bowl. Restez-y.'}[mv.k])+'</p></div>'}
    P.push({id:'saison',court:'Palmarès',html:h})}
  /* 1 bis. Le carnet noir */
  if(g.deuils&&g.deuils.length)P.push({id:'necro',court:'† Carnet noir',html:pageNecro(g)});
  /* 2 bis. La Coupe du Gourdin */
  if(g.coupe){const c=g.coupe,m=c.mien;let h=tete('La coupe')+'<h3 class="rub">Coupe du Gourdin · '+esc(c.tour)+'</h3>';
    if(m)h+='<h2>'+(m.gagne?(c.fin?'Vous remportez la Coupe du Gourdin !':'Qualifiés !'):'Éliminés de la coupe')+'</h2><p class="chapo">'+esc(m.a)+' '+m.score[0]+' – '+m.score[1]+' '+esc(m.b)+(m.tab?' (tirs au but '+m.tab[0]+'-'+m.tab[1]+')':'')+'.'+(m.buts.length?' Buts : '+m.buts.map(esc).join(', ')+'.':'')+(m.blesses.length?' Touchés chez vous : '+m.blesses.map(esc).join(', ')+'.':'')+(m.rot?' L\'équipe bis a démarré la rencontre.':'')+'</p>';
    else h+='<p class="chapo">Vous n\'êtes plus en course. Les résultats du tour :</p>';
    h+='<ul>'+c.matchs.filter(x=>!x.moi).map(x=>'<li>'+esc(x.a)+' '+x.score[0]+' – '+x.score[1]+' '+esc(x.b)+(x.tab?' (t.a.b. '+x.tab[0]+'-'+x.tab[1]+')':'')+'</li>').join('')+'</ul>';
    if(c.fin)h+='<p class="homme">🏆 '+esc(c.fin.vainqueur)+' remporte la Coupe du Gourdin.</p>';
    if(c.gain)h+='<p class="petit">Prime de coupe : +'+c.gain+' po.</p>';
    P.push({id:'coupe',court:'La coupe',html:h})}
  /* 3. Le récit, coupé en deux mi-temps s'il est long */
  const para=p=>'<p class="'+(p.but?'but':'')+'">'+(p.m?'<span class="min">'+p.m+'</span>':'')+esc(p.t)+'</p>';
  /* récit long : coupé en deux pages de longueur voisine */
  const ps=a.paras,tot=ps.reduce((x,p)=>x+p.t.length,0);let coupe=-1;
  if(tot>900&&ps.length>3){let c=0;coupe=ps.findIndex(p=>(c+=p.t.length)>=tot/2);coupe=Math.min(ps.length-1,Math.max(1,coupe+1))}
  if(coupe>0&&coupe<ps.length){
    P.push({id:'r1',court:'Le récit',html:tete('Le récit · 1')+'<h3 class="rub">Le récit du match</h3>'+ps.slice(0,coupe).map(para).join('')+'<p class="suite">Suite page suivante ›</p>'});
    P.push({id:'r2',court:'Récit, suite',html:tete('Le récit · 2')+'<h3 class="rub">Le récit, suite et fin</h3>'+ps.slice(coupe).map(para).join('')});
  }else P.push({id:'recit',court:'Le récit',html:tete('Le récit')+'<h3 class="rub">Le récit du match</h3>'+ps.map(para).join('')});
  /* 4. L'analyse et les notes */
  let an='';
  if(g.analyse)an+='<div class="encadre"><h3>L\'analyse de notre expert, qui était à la buvette</h3><ul>'+g.analyse.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul></div>';
  if(an)P.push({id:'analyse',court:'L\'analyse',html:tete('L\'analyse')+an});
  if(g.notes&&g.notes.length){let h=tete('Les notes')+'<h3 class="rub">Les notes de la rédaction</h3><table class="notes">'+g.notes.map(n=>'<tr><td>'+esc(n.nom)+'<small>'+n.poste+'</small></td><td class="c">'+esc(n.com)+'</td><td class="n">'+fr(n.note)+'</td></tr>').join('')+'</table>';
    if(g.homme)h+=g.homme.race?carteHomme(g.homme):'<p class="homme">'+(g.homme.f?'Femme':'Homme')+' du match : <b>'+esc(g.homme.nom)+'</b> ('+esc(g.homme.club)+'), '+fr(g.homme.note)+' sur 10.</p>';
    P.push({id:'notes',court:'Les notes',html:h})}
  /* 5. La vie du club */
  let cl=tete('La vie du club');
  if(g.vente)cl+='<h3>Huissiers</h3><p>Les huissiers ont vendu <b>'+esc(g.vente.nom)+'</b> pour '+g.vente.prix+' po afin de renflouer la caisse.</p>';
  if(g.infirmerie.length)cl+='<h3>Infirmerie et tribune du club</h3><ul>'+g.infirmerie.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>';
  cl+='<h3>Les comptes du club</h3><table class="comptes">'+g.comptes.map(c=>'<tr><td>'+esc(c[0])+'</td><td>'+(c[1]>0?'+':'')+c[1]+' po</td></tr>').join('')+(g.final&&g.final.prix?'<tr><td>Prime de fin de saison</td><td>+'+g.final.prix+' po</td></tr>':'')+(g.final&&g.final.bonusSp?'<tr><td>Sponsor, fin de saison</td><td>'+(g.final.bonusSp>0?'+':'')+g.final.bonusSp+' po</td></tr>':'')+'<tr class="total"><td>En caisse</td><td>'+g.solde+' po</td></tr></table>';
  if(g.pop)cl+='<p class="petit">Ferveur du public : '+g.pop[0]+' → <b>'+g.pop[1]+'</b> sur 100.</p>';
  P.push({id:'club',court:'Le club',html:cl});
  /* 6. La ligue */
  let lg=tete('La ligue')+'<h3 class="rub">Ailleurs dans la ligue</h3>'+(g.matchs?g.matchs.map(m=>'<article class="autre-match"><h4>'+esc(m.titre)+'</h4><p class="am-score"><span style="--c:'+m.cd+'">'+esc(m.dom)+'</span> '+m.score[0]+' – '+m.score[1]+' <span style="--c:'+m.ce+'">'+esc(m.ext)+'</span></p>'+(m.texte?'<p class="am-txt">'+esc(m.texte)+'</p>':'')+carteHomme(m.homme)+'</article>').join(''):'<ul>'+g.ailleurs.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>');
  if(g.mini)lg+='<h3>Le classement</h3><table class="classt">'+g.mini.map(t=>'<tr class="'+(t.moi?'moi':'')+'"><td>'+t.rang+'. '+esc(t.nom)+'</td><td>'+pl(t.pts,'pt')+'</td></tr>').join('')+'</table>';
  if(g.prochain)lg+='<p class="petit"><b>Prochain match :</b> '+esc(g.prochain)+'</p>';
  lg+='<p class="breve">'+esc(g.breve)+'</p>';
  P.push({id:'ligue',court:'La ligue',html:lg});
  return P;
}
function vueGazette(){
  if(!S.gazettes.length)return'<section class="bloc"><div class="panneau"><p style="margin:0">Aucun numéro pour l\'instant. La gazette paraît après chaque journée.</p></div></section>';
  const idx=numero<0||numero>=S.gazettes.length?S.gazettes.length-1:numero;const g=S.gazettes[idx];
  const P=pagesGazette(g);pageG=Math.max(0,Math.min(P.length-1,pageG));const pg=P[pageG];
  let h='<div class="gz-haut"><div class="sommaire" role="tablist" aria-label="Sommaire">'+P.map((x,i)=>'<button role="tab" data-act="pageG" data-v="'+i+'" aria-selected="'+(i===pageG)+'">'+x.court+'</button>').join('')+'</div>'
    +'</div>';
  if(pageG===0&&S.gazettes.length>1)pg.html+='<label class="archives-l">Lire un ancien numéro <select class="archives" data-act="numeroSel">'+S.gazettes.map((x,i)=>'<option value="'+i+'"'+(i===idx?' selected':'')+'>Saison '+x.saison+', journée '+x.jour+(i===S.gazettes.length-1?' (dernier)':'')+'</option>').slice().reverse().join('')+'</select></label>';
  h+='<article class="gazette pages'+(tombe?' tombe':'')+(sensG>0?' tourne-g':sensG<0?' tourne-d':'')+'" aria-live="polite">'+pg.html
    +'<div class="folio">— '+(pageG+1)+' / '+P.length+' —</div></article>';
  const der=pageG===P.length-1;
  h+='<div class="gz-nav"><button class="discret" data-act="pageG" data-v="'+(pageG-1)+'" '+(pageG?'':'disabled')+' aria-label="Page précédente">‹ Préc.</button>'
    +'<div class="points" aria-hidden="true">'+P.map((x,i)=>'<i class="'+(i===pageG?'on':'')+'"></i>').join('')+'</div>'
    +(der&&S.phase==='saison'&&!S.fini&&idx===S.gazettes.length-1?'<button class="discret or" data-act="vue" data-v="vestiaire">Au vestiaire ›</button>':'<button class="discret or" data-act="pageG" data-v="'+(pageG+1)+'" '+(der?'disabled':'')+' aria-label="Page suivante">Suiv. ›</button>')+'</div>';
  sensG=0;
  return h;
}
function tournerPage(n,seul){const g=S.gazettes[numero<0?S.gazettes.length-1:numero];if(!g)return;const N=pagesGazette(g).length;if(n<0||n>=N||n===pageG)return;sensG=n>pageG?1:-1;pageG=n;Son.toucher();Son.jouer('journal');if(seul)rendre();window.scrollTo(0,0)}
function podium(titre,f,unite,min){
  const L=tousLesJoueurs(S).filter(o=>f(o.p)>0&&(!min||o.p.snb>=min)).sort((a,b)=>f(b.p)-f(a.p)).slice(0,5);
  return'<div><h3>'+titre+'</h3>'+(L.length?'<ol>'+L.map(o=>'<li><button class="lien" data-act="fiche" data-id="'+o.p.id+'">'+esc(o.p.nom)+'</button> ('+esc(o.T.court)+') : '+unite(f(o.p))+'</li>').join('')+'</ol>':'<p class="note" style="margin:0">Personne pour l\'instant.</p>')+'</div>';
}
function albumLegendes(){
  const vus=new Set(S.legVues||[]);const ou={};S.teams.forEach(T=>T.joueurs.forEach(p=>{if(p.leg)ou[p.leg]=T}));
  let h='<section class="bloc"><h2>Les légendes du Wood Bowl <small>'+vus.size+' sur '+LEGENDES.length+' rencontrées</small></h2><p class="note" style="margin-top:0">Trente-six joueurs et joueuses de légende, uniques, chacun avec son pouvoir. On les croise au marché, à l\'intersaison ou chez un adversaire. Chacun n\'existe qu\'une fois par partie.</p><div class="album">';
  RACE_IDS.forEach(r=>{h+='<h3 class="album-r">'+RACES[r].pl+'</h3><div class="album-l">'+LEGENDES.filter(l=>l.race===r).map(L=>{
    if(!vus.has(L.id))return'<div class="leg-carte cachee"><div class="sil">?</div><b>???</b><small>'+L.poste+'</small></div>';
    const T=ou[L.id];return'<button class="leg-carte" data-act="legende" data-v="'+L.id+'"><img alt="" src="img/leg/'+L.id+'.jpg"><b>'+esc(L.nom)+'</b><small>'+L.poste+' · '+POUVOIRS[L.pv].nom+'</small><small class="ou">'+(T?(T.id===0?'Dans votre club':esc(T.court)):'Libre')+'</small></button>'}).join('')+'</div>'});
  return h+'</div></section>';
}
function vueFicheLegende(){
  const L=legendeDe(legVue);if(!L){legVue=null;return''}
  return'<div class="voile" data-act="voile"><div class="fiche" role="dialog" aria-label="Légende"><div class="c80 legendaire" style="--c:#c99a2e"><div class="haut"><span class="marque">✦ LÉGENDE ✦</span><span class="peuple">'+RACES[L.race].nom+'</span></div><div class="photo"><img alt="Portrait de '+esc(L.nom)+'" src="img/leg/'+L.id+'.jpg"><div class="rond">'+L.poste+'</div></div><div class="bandeau-nom"><b>'+esc(L.nom)+'</b></div><div class="club"><span>'+RACES[L.race].nom+'</span><span>'+L.id+'</span></div></div>'
    +'<div class="dos"><div class="pouvoir"><small>Pouvoir légendaire</small><b>'+POUVOIRS[L.pv].nom+'</b> : '+POUVOIRS[L.pv].desc+'<p class="bio">'+L.bio+'</p></div></div><div class="actions"><button class="discret" data-act="fermer">Fermer</button></div></div></div>';
}
function vueLegendes(){
  let h=albumLegendes()+'<section class="bloc"><p class="note" style="margin-top:0">Chaque fin de saison, les meilleurs joueurs de la ligue entrent au mur, avec leur portrait peint. Le joueur de la saison a droit au grand cadre doré.</p></section>';
  h+='<section class="bloc"><h2>Mur des légendes</h2>'+(S.fame.length?'<div class="mur">'+S.fame.slice().sort((x,y)=>(y.saison-x.saison)||((y.grand?1:0)-(x.grand?1:0))).map(f=>'<figure class="tableau'+(f.grand?' grand':'')+'" style="margin:0"><div class="cadre'+(f.grand?'':' bois')+'"><img alt="Portrait peint de '+esc(f.nom)+'" src="'+tableau(f.race,f.tete)+'"></div><figcaption class="plaque"><div class="prix">'+esc(f.titre)+' · saison '+f.saison+'</div><div class="qui">'+esc(f.nom)+'</div><div class="ou">'+esc(f.club)+(f.detail?' · '+esc(f.detail):'')+'</div></figcaption></figure>').join('')+'</div>':'<div class="panneau"><p class="note" style="margin:0">Le mur attend ses premières légendes. Leurs portraits peints y seront accrochés à la fin de chaque saison.</p></div>')
    +'<ul class="criteres">'+CRITERES.map(c=>'<li><b>'+c.titre+'</b> : '+c.crit+'</li>').join('')+'</ul></section>';
  if(S.morts.length)h+='<section class="bloc"><h2>Tombés au champ d\'honneur</h2><div class="panneau"><ul style="margin:0;padding-left:18px">'+S.morts.slice().reverse().map(m=>'<li'+(m.moi?' class="mien"':'')+'>'+(m.moi?'† <b>'+esc(m.nom)+'</b>':esc(m.nom))+' ('+esc(m.club)+'), saison '+m.saison+', journée '+m.jour+(m.par?', sous les coups de '+esc(m.par):'')+'</li>').join('')+'</ul></div></section>';
  return h;
}
function vueLigueComplet(){
  const fige=S.phase==='inter'&&S.classFinal;const cl=fige?S.classFinal:classement(S);const d=S.div||4;const nT=cl.length;
  const zone=i=>{if(fige&&S.inter&&S.inter.mouv){const dd=S.inter.mouv.de;return i<MONTEES&&dd>1?' monte':i===nT-1&&dd<4?' descend':''}return i<MONTEES&&d>1?' monte':i===nT-1&&d<4?' descend':''};
  let h='<section class="bloc"><h2>Classement <small>'+(fige?'final · '+esc(S.classFinalDiv||''):'touchez un club pour l\'observer')+'</small></h2>'+(fige?'':bandeauDivision())+'<div class="panneau" style="padding:6px 10px"><table class="classement"><thead><tr><th></th><th>Club</th><th>J</th><th>G</th><th>N</th><th>P</th><th>Diff</th><th>Pts</th></tr></thead><tbody>'
    +cl.map((T,i)=>'<tr class="'+(T.id===0?'moi':'')+zone(i)+'"><td>'+(i+1)+'</td><td><span class="pastille" style="background:'+T.couleur+'"></span>'+(fige?esc(T.court):'<button class="lien" data-act="club" data-id="'+T.id+'">'+esc(T.court)+'</button>')+'</td><td>'+T.j+'</td><td>'+T.g+'</td><td>'+T.n+'</td><td>'+T.p+'</td><td>'+(T.bp-T.bc>0?'+':'')+(T.bp-T.bc)+'</td><td class="pts">'+T.pts+'</td></tr>').join('')+'</tbody></table></div></section>';
  h+='<section class="bloc"><h2>De qui se méfier <small>cette saison</small></h2><div class="panneau palmares">'
    +podium('Meilleures notes',p=>p.snb?Math.round(p.sn/p.snb*10)/10:0,x=>fr(x)+' de moyenne',3)
    +podium('Buteurs',p=>p.sb,x=>pl(x,'but'))+podium('Passeurs décisifs',p=>p.spd,x=>pl(x,'passe','passes'))
    +podium('Bouchers',p=>p.sv,x=>pl(x,'adversaire sorti','adversaires sortis'))+podium('Abonnés aux cartons',p=>p.sj,x=>pl(x,'jaune'))+'</div></section>';
  h+=blocCoupe();
  if(S.phase==='saison')h+='<section class="bloc"><h2>Votre calendrier</h2><div class="panneau calendrier">'+S.calendrier.map((m,j)=>{const x=m.find(([a,b])=>a===0||b===0);const adv=S.teams[x[0]===0?x[1]:x[0]];
    return'<div class="jr"><b>J'+(j+1)+'</b><span class="'+(j===S.jour&&!S.fini?'moi':'')+'">'+(x[0]===0?'Domicile':'Extérieur')+' · '+adv.nom+(j<S.jour?' (joué)':'')+'</span></div>'}).join('')+'</div></section>';
  
  return h;
}
function relationMarche(p){const moi=moiT();const races=new Set(onzeDe(moi).tit.map(x=>x.race));let h='';
  const al=RACES[p.race].allies.filter(r=>races.has(r)),ri2=RACES[p.race].rivaux.filter(r=>races.has(r));
  if(al.length)h+='<span class="puce gain"'+aide('Ce joueur est l\'allié de vos titulaires '+listeP(al)+' : le titulariser avec eux active un bonus d\'équipe.')+'>Allié de vos '+listeP(al)+'</span>';
  if(ri2.length)h+='<span class="puce alerte"'+aide('Rival de vos titulaires '+listeP(ri2)+' : les aligner ensemble déclenche un malus, sauf si un humain fait le médiateur.')+'>Rival de vos '+listeP(ri2)+'</span>';
  return h}
function carteMarche(p,T){
  const moi=moiT();const b=kk(moi,'chin','bruit');const prix=prixMarche(S,p);const plein=moi.joueurs.length>=MAX_EFFECTIF;const bloque=huissiers(S)&&!p.gratuit;
  return'<div class="carte'+(p.coeur?' coeur':'')+(p.leg?' leg':'')+'">'+(p.leg?'<div class="bandeau-leg">✦ Légende de passage au marché ✦</div>':'')+vignette(p,'#7a6650')+'<div style="min-width:0"><button class="nom" data-act="fiche" data-id="'+p.id+'">'+esc(p.nom)+'</button>'+(p.coeur?'<div class="coeur-txt">Coup de cœur de votre chineur</div>':'')+(p.gratuit?'<div class="coeur-txt" style="color:var(--bon)"'+aide('Jeune du pays : le centre de formation vous le propose gratuitement tant que votre effectif compte moins de 7 joueurs, même si la caisse est dans le rouge. Il est faible au départ mais a un gros potentiel, et ne coûte que 1 po par match pendant sa première saison.')+'>Jeune du pays · gratuit</div>':'')+'<div class="puces">'+puces(p)+relationMarche(p)+'</div>'+jaugesJoueur(p,p.vu,p.gratuit?0:b)
    +'<div style="font-size:12.5px;color:var(--creme-sourde);margin-top:3px">Potentiel '+etoiles(etoilesPot(p.vu.m))+(b?' <span style="opacity:.8">(estimé)</span>':'')+' · '+ageCourt(p)+'</div>'+chezVous(p,p.vu)+'</div>'
    +'<div class="achat"><div class="prix-po num">'+(prix?prix+' po':'Gratuit')+'</div><div style="font-size:12px;color:var(--creme-sourde);text-align:center">'+(p.gratuit?p.sal:salaire(p))+' po/match</div><button class="discret" data-act="acheter" data-id="'+p.id+'" '+((prix>0&&moi.or<prix)||plein||bloque?'disabled':'')+'>Recruter</button></div></div>';
}
function vueMarche(){
  const moi=moiT();let h=boutonTiroir();
  if(S.phase==='inter')h+=vueEchanges();
  const manque=postesManquants(moi);const n=niv(moi,'chin');
  h+='<section class="bloc"><h2>Agents libres <small>renouvelés à chaque journée</small></h2>';
  h+='<div class="panneau" style="margin-bottom:10px"><p style="margin:0;font-size:14.5px">'+(manque.length?'Il vous manque : <b>'+manque.map(x=>x.toLowerCase()).join(', ')+'</b> (repère : 2 cogneurs, 2 coureurs, 1 passeur).':'Votre effectif couvre tous les postes.')+'</p>'
    +'<p class="note">'+(n>=0?esc(moi.staff.chin.nom)+' ('+NIV[n].toLowerCase()+') vous propose '+K.marche[n+1]+' joueurs, notes estimées à ±'+K.bruit[n+1]+'.':'Sans chineur, vous voyez peu de joueurs et leurs notes sont très approximatives (±'+K.bruit[0]+'). Embauchez-en un dans l\'onglet Club.')+'</p></div>';
  h+='<div class="filtres"><label>Poste <select data-act="filtreSel" data-v="poste">'+[['tous','Tous les postes']].concat(POSTE_IDS.map(x=>[x,POSTES[x].pl])).map(([k,l])=>'<option value="'+k+'"'+(filtre===k?' selected':'')+'>'+l+'</option>').join('')+'</select></label>'
    +'<label>Peuple <select data-act="filtreSel" data-v="race">'+[['tous','Tous les peuples']].concat(RACE_IDS.map(r=>[r,RACES[r].pl])).map(([k,l])=>'<option value="'+k+'"'+(filtreR===k?' selected':'')+'>'+l+'</option>').join('')+'</select></label></div>';
  const liste=S.marche.filter(p=>(filtre==='tous'||p.poste===filtre)&&(filtreR==='tous'||p.race===filtreR));
  h+='<div class="effectif">'+(liste.length?liste.map(p=>carteMarche(p)).join(''):'<div class="panneau">Personne à ce poste cette semaine. Revenez après la prochaine journée.</div>')+'</div>';
  h+='<p class="note">'+(huissiers(S)?'Les huissiers bloquent les recrutements payants tant que la caisse est dans le rouge. Les jeunes du pays restent possibles.':moi.joueurs.length>=MAX_EFFECTIF?'Effectif complet ('+MAX_EFFECTIF+' joueurs) : renvoyez quelqu\'un avant de recruter.':'Une recrue arrive tout de suite : elle participe à l\'entraînement et peut jouer dès le prochain match. Ses notes réelles se révèlent à la signature.')+'</p></section>';
  return h;
}
function vueEchanges(){
  const moi=moiT();const I=S.inter;
  let h='<section class="bloc"><h2>Bourse aux échanges <small>'+I.faits+' sur '+MAX_ECHANGES+' échanges</small></h2>';
  h+='<div class="panneau" style="margin-bottom:10px"><span class="t">1. Vos joueurs à l\'échange</span><p class="note" style="margin:0 0 8px">Cochez ceux que vous êtes prêt à céder. Eux seuls peuvent entrer dans une offre, et les autres clubs peuvent faire des offres dessus.</p><div class="cases">'
    +moi.joueurs.map(p=>'<label><input type="checkbox" data-act="lister" data-id="'+p.id+'"'+(moi.liste.includes(p.id)?' checked':'')+'> '+esc(p.nom)+' <span style="color:var(--creme-sourde);font-size:13px">· '+p.poste.toLowerCase()+' · '+p.age+' ans · au poste '+notePoste(p)+' · FOR '+p.f+' VIT '+p.v+' PAS '+p.t+' MAI '+p.mn+'</span></label>').join('')+'</div>'
    +'<button class="discret or" data-act="ecouter" style="margin-top:10px"'+(moi.liste.length?'':' disabled')+'>Écouter les offres des autres clubs</button>';
  if(I.recues.length)h+='<div class="cases" style="margin-top:10px">'+I.recues.map((o,k)=>{const p=moi.joueurs.find(x=>x.id===o.veut);const q=o.donne?S.teams[o.de].joueurs.find(x=>x.id===o.donne):null;if(!p)return'';
      return'<div class="offre"><div><b>'+esc(o.club)+'</b> veut <b>'+esc(p.nom)+'</b> contre '+(q?'<button class="lien" data-act="fiche" data-id="'+q.id+'">'+esc(q.nom)+'</button> ('+q.poste.toLowerCase()+')'+(o.po?' et '+o.po+' po':''):o.po+' po')+'.</div><div class="boutons"><button class="discret or" data-act="accepter-offre" data-v="'+k+'">Accepter</button><button class="discret" data-act="refuser-offre" data-v="'+k+'">Refuser</button></div></div>'}).join('')+'</div>';
  else if(I.ecoute)h+='<p class="note">Aucune offre pour l\'instant. Ajoutez des joueurs ou réessayez.</p>';
  h+='</div>';
  h+='<div class="panneau"><span class="t">2. Joueurs proposés par les autres clubs</span><div class="effectif" style="margin-top:6px">';
  S.teams.slice(1).forEach(T=>T.liste.forEach(id=>{const p=T.joueurs.find(x=>x.id===id);if(!p)return;
    h+='<div class="carte">'+vignette(p,T.couleur)+'<div style="min-width:0"><button class="nom" data-act="fiche" data-id="'+p.id+'">'+esc(p.nom)+'</button><div style="font-size:13px;color:var(--creme-sourde)"><span class="pastille" style="background:'+T.couleur+'"></span>'+esc(T.court)+' · valeur '+valeur(p)+'</div><div class="puces">'+puces(p)+'</div>'+jaugesJoueur(p)+chezVous(p)+'</div>'
      +'<div class="cmd"><button class="discret or" data-act="offre" data-id="'+p.id+'"'+(I.faits>=MAX_ECHANGES?' disabled':'')+'>Faire une offre</button></div></div>'}));
  h+='</div></div></section>';
  return h;
}
function courbe(){
  const d=S.histOr.map(x=>x.or);if(d.length<2)return'';
  const w=300,hh=70,mn=Math.min(0,...d),mx=Math.max(10,...d);const X=i=>i/(d.length-1)*w,Y=v=>hh-6-(v-mn)/(mx-mn||1)*(hh-12);
  const pts=d.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
  return'<svg class="courbe" viewBox="0 0 '+w+' '+hh+'" preserveAspectRatio="none" role="img" aria-label="Évolution de la caisse sur les dernières journées"><line x1="0" x2="'+w+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="#e8735c" stroke-dasharray="4 4" stroke-width="1"/><polyline points="0,'+hh+' '+pts+' '+w+','+hh+'" fill="rgba(232,184,78,.15)" stroke="none"/><polyline points="'+pts+'" fill="none" stroke="#e8b84e" stroke-width="2.5" vector-effect="non-scaling-stroke"/><circle cx="'+X(d.length-1)+'" cy="'+Y(d[d.length-1])+'" r="4" fill="#e8b84e"/></svg><p class="note" style="margin-top:2px">Caisse sur les '+d.length+' dernières journées (pointillés : zéro).</p>';
}
const POURQUOI_STAFF={prep:'Vos joueurs récupèrent plus vite, progressent plus et guérissent plus tôt.',chin:'Le marché vous propose plus de joueurs, avec des notes plus précises.',strat:'Il devine le plan adverse, conseille vos ordres et rend le pronostic plus sûr.'};
function effetSimple(r,n){const f=['un peu','correctement','bien','très bien','remarquablement'][n];
  if(r==='prep')return'Soigne et fait progresser '+f+(n>=2?', peut sauver un joueur mortellement touché':'');
  if(r==='chin')return K.marche[n+1]+' joueurs au marché, notes à ±'+K.bruit[n+1]+(K.remise[n+1]?', '+K.remise[n+1]+' % de remise':'');
  return'Voit juste '+Math.round(K.fiab[n+1]*100)+' fois sur 100, +'+K.plan[n+1]+' % si vous suivez son conseil';}
function vueClubComplet(){
  const moi=moiT();const pr=previsionParMatch(S);const sp=sponsorDe(S.sponsor);
  const lig=(l,v)=>'<tr><td>'+l+'</td><td class="'+(v>0?'pos':v<0?'neg':'')+'">'+(v>0?'+':'')+v+' po</td></tr>';
  let h='<section class="bloc"><h2>Trésorerie</h2><div class="panneau clous"><div class="caisse"><div><span class="t" style="margin:0">Caisse</span><b class="num'+(moi.or<0?' dette':'')+'">'+moi.or+' po</b></div><div style="text-align:right;font-size:14px;color:var(--creme-sourde)">Masse salariale : '+masseSalariale(moi)+' po/match<br>Staff : '+coutStaff(moi)+' po/match</div></div>';
  if(moi.or<0)h+='<div class="alerte-bloc" style="margin-top:10px"><b>Huissiers.</b> Tant que la caisse est négative : pas de recrutement, d\'embauche ni de pot-de-vin. Sous '+DETTE_MAX+' po, ils vendent d\'office votre meilleur remplaçant à 60 % de sa valeur.</div>';
  h+='<table class="prev"><tbody>'+lig('Billetterie moyenne (selon la ferveur)',pr.billetterie)+lig('Droits de retransmission',pr.tv)+(pr.buvette?lig('Buvette',pr.buvette):'')+lig('Sponsor, part fixe',pr.sponsor)+(pr.pret?lig('Remboursement du prêt',pr.pret):'')+lig('Salaires des joueurs',pr.salaires)+lig('Salaires du staff',pr.staff)+'<tr class="total"><td>Solde prévu par match, hors primes</td><td class="'+(pr.solde>=0?'pos':'neg')+'">'+(pr.solde>0?'+':'')+pr.solde+' po</td></tr></tbody></table>'
    +'<p class="note">En plus : victoire +10, nul +4, 2 po par but à la billetterie, primes du sponsor. Fin de saison : '+PRIX_FIN.join(', ')+' po selon le rang.</p>'+courbe()
    +'<div class="sponsor" style="margin-top:12px"><div><b>Banque Grinkle & Fils</b><p>'+(moi.pret?'Prêt en cours : encore '+pl(moi.pret.reste,'remboursement')+' de '+PRET.parMatch+' po.':'Prêt de '+PRET.montant+' po tout de suite, remboursé '+PRET.parMatch+' po par match pendant '+PRET.nb+' matchs ('+PRET.parMatch*PRET.nb+' po au total). Un seul prêt à la fois, même en dette.')+'</p></div>'+(moi.pret?'':'<button class="discret or" data-act="banque">Emprunter</button>')+'</div>'
    +'<details class="regles"><summary>Comment gérer son argent</summary><ul>'
    +'<li><b>Ce qui rapporte</b><span>Les droits de retransmission ('+DROITS_TV+' po par journée pour tous), la billetterie (surtout à domicile, et d\'autant plus que le public est fervent), les primes de match, le sponsor, la prime de fin de saison, et les ventes de joueurs à l\'intersaison.</span></li>'
    +'<li><b>Ce qui coûte</b><span>Les salaires, fixés à la signature et revus à chaque intersaison selon les progrès du joueur ; le staff ; les recrues ; les pots-de-vin, soins et amendes.</span></li>'
    +'<li><b>Le piège</b><span>Un joueur qui progresse demandera plus à la fin de la saison. Un effectif de 8 coûte cher : 6 ou 7 joueurs suffisent souvent.</span></li>'
    +'<li><b>Pour s\'en sortir</b><span>Jeunes du pays gratuits au marché, prêt du banquier, rebondissements (supporters, vétérans, mécènes) plus fréquents quand le club va mal. Les clubs de l\'ordinateur suivent les mêmes règles : eux aussi ne reçoivent que des jeunes quand ils perdent des joueurs.</span></li><li><b>La dette</b><span>Caisse négative : les huissiers bloquent recrutements payants, embauches et pots-de-vin. Sous '+DETTE_MAX+' po, ils vendent un joueur.</span></li></ul></details></div></section>';
  h+='<section class="bloc"><h2>Le stade <small>investissements durables</small></h2><div class="panneau stade">'+STADE_IDS.map(k=>{const B=STADE[k],n=nivStade(moi,k);
    return'<div class="batiment"><div class="niveaux">'+[0,1,2,3].map(x=>'<i class="'+(x<=n?'ok':'')+'"></i>').join('')+'</div><div><b>'+B.nom+'</b> <span class="niv niv'+Math.min(4,n+1)+'">'+esc(B.niv[n])+'</span><p>'+esc(B.effet(n))+'</p>'+(n<3?'<p class="note" style="margin:2px 0 0">Prochain niveau, '+esc(B.niv[n+1])+' : '+esc(B.effet(n+1))+'</p>':'<p class="note" style="margin:2px 0 0">Niveau maximum.</p>')+'</div>'
      +(n<3?'<button class="discret or" data-act="stade" data-v="'+k+'"'+(moi.or<B.cout[n]||huissiers(S)?' disabled':'')+'>'+B.cout[n]+' po</button>':'')+'</div>'}).join('')+'<p class="note" style="margin:6px 0 0">Les travaux sont définitifs et ne coûtent rien à l\'entretien : c\'est là que va l\'argent des bonnes saisons.</p></div></section>';
  h+='<section class="bloc"><h2>Ferveur du public <small>'+moi.pop+' sur 100</small></h2><div class="panneau"><div class="ferveur"><i style="width:'+moi.pop+'%"></i></div><p class="note" style="margin:0">Monte avec les victoires (+3), les gros scores, les adversaires sortis sur civière et les drames ; baisse avec les défaites (−2) et les scandales. Chaque point rapporte environ 0,3 po par match à domicile.</p></div></section>';
  h+='<section class="bloc"><h2>Sponsor <small>'+(sp?'sous contrat':'à choisir')+'</small></h2><div class="panneau"><div class="sponsors">';
  if(sp)h+='<div class="sponsor actif"><div><b>'+esc(sp.nom)+'</b><p>'+esc(sp.desc)+'</p></div><span class="niv niv2">Signé</span></div><p class="note" style="margin:0">Le contrat court jusqu\'à la fin de la saison.</p>';
  else h+='<p class="note" style="margin:0 0 4px">Trois maisons vous proposent un contrat pour la saison. Un seul choix, sans retour.</p>'+S.offresSponsor.map(id=>{const s=sponsorDe(id);return'<div class="sponsor"><div><b>'+esc(s.nom)+'</b><p>'+esc(s.desc)+'</p></div><button class="discret or" data-act="sponsor" data-v="'+id+'">Signer</button></div>'}).join('');
  h+='</div></div></section>';
  h+='<section class="bloc"><h2>Apparence <small>au choix</small></h2><div class="panneau"><div class="themes">'+THEMES.map(([k,n,d])=>'<button data-act="theme" data-v="'+k+'" aria-pressed="'+(themeActuel()===k)+'">'+n+'<small>'+d+'</small></button>').join('')+'</div></div></section>';
  h+='<section class="bloc"><h2>Staff</h2><div class="panneau staff">'+ROLE_IDS.map(r=>{
    const cur=moi.staff[r];const cand=S.candidats[r]||[];
    let x='<div class="role"><h3>'+ROLES[r].nom+'</h3><p class="pitch">'+POURQUOI_STAFF[r]+'</p>';
    x+=cur?'<div class="ligne-staff"><div><b>'+esc(cur.nom)+'</b> <span class="niv niv'+cur.niv+'"'+aide('Niveau '+NIV[cur.niv].toLowerCase()+' sur 5 (de médiocre à légendaire). Plus il est haut, plus l\'effet est fort, et plus le salaire aussi.')+'>'+NIV[cur.niv]+'</span><p'+aide(effetStaff(r,cur.niv))+'>'+effetSimple(r,cur.niv)+' · '+cur.sal+' po/match</p></div><button class="discret" data-act="licencier" data-v="'+r+'">Renvoyer</button></div>'
      :'<p class="note" style="margin:4px 0">Poste vacant. '+(r==='prep'?'Vos joueurs progressent moins vite et ne reçoivent aucun soin.':r==='chin'?'Vous voyez peu d\'agents libres, et leurs notes sont floues.':'Pas de rapport d\'avant-match ni de conseil.')+'</p>';
    if(cand.length)x+='<details class="regles"'+(cur?'':' open')+'><summary>'+pl(cand.length,'candidat')+' disponibles</summary>'+cand.map((c,k)=>'<div class="ligne-staff"><div><b>'+esc(c.nom)+'</b> <span class="niv niv'+c.niv+'"'+aide('Niveau '+NIV[c.niv].toLowerCase()+' sur 5 (de médiocre à légendaire). Plus il est haut, plus l\'effet est fort, et plus le salaire aussi.')+'>'+NIV[c.niv]+'</span><p'+aide(effetStaff(r,c.niv))+'>'+effetSimple(r,c.niv)+'</p><p class="prix">'+c.prime+' po à l\'embauche, puis '+c.sal+' po par match</p></div><button class="discret or" data-act="embaucher" data-v="'+r+'" data-id="'+k+'"'+(moi.or<c.prime||huissiers(S)?' disabled':'')+'>Embaucher</button></div>').join('')+'</details>';
    return x+'</div>'}).join('')+'</div></section>';
  return h;
}
function trouver(id){for(const T of S.teams){const p=T.joueurs.find(p=>p.id===id);if(p)return{p,T}}const p=S.marche.find(p=>p.id===id);return p?{p,T:null}:null}
function vueFiche(){
  const moi=moiT();const o=trouver(fiche);if(!o){fiche=null;return''}
  const p=o.p,T=o.T,mien=T&&T.id===0;const c=T?T.couleur:'#7a6650';const t=tamponDe(p);
  const vu=!T?p.vu:null;const b=!T?kk(moi,'chin','bruit'):0;
  const note4=(lab,k)=>'<div class="r'+rangStat(p,k)+'">'+lab+(RANG_MARQ[rangStat(p,k)]?' '+RANG_MARQ[rangStat(p,k)]:'')+'<b>'+(vu&&b?'~'+vu[k]:p[k])+'</b>'+(mien?(p[k]>=p.cap[k]?'<small>max atteint</small>':'<small>max '+p.cap[k]+'</small>'):'')+'</div>';
  let h='<div class="voile" data-act="voile"><div class="fiche" role="dialog" aria-label="Carte du joueur">'
    +'<div class="c80'+(p.leg?' legendaire':'')+'" style="--c:'+(p.leg?'#c99a2e':c)+'"><div class="haut"><span class="marque">'+(p.leg?'✦ LÉGENDE ✦':'WOOD BOWL')+'</span><span class="peuple">'+RACES[p.race].nom+' · Saison '+S.saison+'</span></div>'
    +'<div class="photo '+cad(p,vu)+(t?' gris':'')+'"><img alt="Portrait de '+esc(p.nom)+'" src="'+img(p.race,p.tete)+'"><div class="rond">'+p.poste+'</div>'+(t?'<span class="tampon">'+t+'</span>':'')+'</div>'
    +'<div class="bandeau-nom"><b>'+esc(p.nom)+'</b></div><div class="club"><span>'+(T?esc(T.court):'Agent libre')+'</span><span>N° '+p.id+'</span></div></div>'
    +'<div class="dos">'+(p.leg?(()=>{const L=legendeDe(p.leg);return'<div class="pouvoir"><small>Pouvoir légendaire</small><b>'+POUVOIRS[L.pv].nom+'</b> : '+POUVOIRS[L.pv].desc+'<p class="bio">'+L.bio+'</p></div>'})():'')+'<p>'+POSTES[p.poste].role+'<br>'+RACES[p.race].atout+' '+RACES[p.race].faible+'<br>'+(p.trait!=='aucun'?TRAITS[p.trait].nom+' : '+TRAITS[p.trait].desc+'<br>':'')+(T?'Contrat : '+p.sal+' po par match':'Prix : '+prixMarche(S,p)+' po, puis '+salaire(p)+' po par match')+(p.etoiles?' · '+pl(p.etoiles,'titre')+' de joueur de la saison':'')+'</p>'
    +'<p><b>'+p.age+' ans</b> · '+etapeAge(p.age||25)[1]+' ('+etapeAge(p.age||25)[2]+')'+(p.retraite?' · <b>dernière saison</b>':'')+'</p><p>Potentiel : '+etoiles(etoilesPot(vu?vu.m:marge(p)))+(vu&&b?' (estimé par votre chineur)':'')+(p.snb?' · Moyenne de notes : '+fr((p.sn/p.snb).toFixed(1)):'')+'</p>'
    +'<table><thead><tr><th></th><th>Matchs</th><th>Buts</th><th>Passes</th><th>Sortis</th><th>Cartons</th></tr></thead><tbody>'
    +'<tr><td>Saison</td><td>'+p.sm+'</td><td>'+p.sb+'</td><td>'+p.spd+'</td><td>'+p.sv+'</td><td>'+p.sj+'</td></tr>'
    +'<tr><td>Carrière</td><td>'+p.matchs+'</td><td>'+p.buts+'</td><td>'+p.pd+'</td><td>'+p.victimes+'</td><td>'+(p.cj+p.cr)+'</td></tr></tbody></table>'
    +'<div class="savoir poste"><small>Au poste de '+p.poste.toLowerCase()+' · valeur '+(vu&&b?'~':'')+notePoste(p,vu)+'</small>'+hierarchie(p)+(mien&&p.blesse<=0?'<br><b>Conseil d\'entraînement :</b> '+texteConseil(p):'')+'</div>'+'<div class="notes4">'+note4('FORCE','f')+note4('VITESSE','v')+note4('PASSE','t')+note4('MAINS','mn')+'<div>FORME<b>'+Math.round(p.forme)+'</b></div></div><div class="savoir"><small>Spécialité · '+NIV_SPE(p.sp||0)+'</small>'+SPECIALITES[p.race].nom+' ('+(p.sp||0)+(mien?' / max '+(p.cap.sp||0):'')+') : '+SPECIALITES[p.race].desc+'</div>'
    +'<div class="savoir cadre-txt"><small>Son cadre</small>'+texteCadre(p,vu&&b?vu:null)+'</div>'+profilCacheHTML(p)+(!T?'<div class="savoir"><small>Comparé à votre effectif</small>'+chezVous(p,vu)+'</div>':'')+(p.cicatrices?'<div class="savoir"><small>Le saviez-vous ?</small>'+pl(p.cicatrices,'cicatrice')+' de guerre, et une note abîmée à chaque fois.</div>':'')+'</div>';
  if(mien){
    h+='<label for="renom" style="display:block;margin-top:14px;font-weight:700;font-size:14px">Renommer le joueur</label><input type="text" id="renom" maxlength="28" value="'+esc(p.nom)+'">'
      +'<div class="actions"><button class="discret" data-act="renommer">Enregistrer le nom</button>'
      +(p.blesse>0?'<button class="discret" data-act="soigner" '+(moi.or<COUT_SOIN?'disabled':'')+'>Guérisseur ('+COUT_SOIN+' po, 1 match de moins)</button>':'')
      +(p.pret?'<span class="note">Prêté pour un match : il repartira tout seul.</span></div>':'<button class="discret" data-act="renvoyer" '+(moi.joueurs.length<=MIN_EFFECTIF?'disabled':'')+'>Renvoyer (+'+Math.round(valeur(p)*.4)+' po)</button></div>');
  }
  return h+'<div class="actions"><button class="discret" data-act="fermer">Fermer</button></div></div></div>';
}
function vueClubAdv(){
  const T=S.teams[clubVu];if(!T){clubVu=null;return''}
  const rang=rangDe(S,T.id);const{tit}=onzeDe(T);const et=etatsDe(T,tit);const setTit=new Set(tit);
  let h='<div class="voile" data-act="voile"><div class="fiche" role="dialog" aria-label="Fiche du club"><h2><span class="pastille" style="background:'+T.couleur+'"></span>'+esc(T.nom)+'</h2>'
    +'<p class="note" style="margin:4px 0 0">'+rang+(rang===1?'er':'e')+' · '+pl(T.g,'victoire')+', '+pl(T.n,'nul')+', '+pl(T.p,'défaite')+' · '+T.bp+' buts marqués, '+T.bc+' encaissés'+(T.rep?'<br>'+T.rep:'')+'</p>'
    +'<div class="etats" style="margin-top:10px">'+(et.length?et.map(e=>'<span class="etat'+(e.mal?' mal':'')+'"'+aide(e.nom+' : '+e.effet+'.')+'>'+e.nom+'</span>').join(''):'<span class="note" style="margin:0">Aucun état d\'équipe actif.</span>')+'</div><div style="margin-top:10px">';
  h+=T.joueurs.slice().sort((a,b)=>(setTit.has(b)-setTit.has(a))||puissance(b)-puissance(a)).map(p=>'<div class="ligne-joueur" style="--c:'+T.couleur+'"><img class="'+cad(p)+'" alt="" src="'+img(p.race,p.tete)+'"><div><button data-act="fiche" data-id="'+p.id+'">'+(p.leg?'✦ ':'')+esc(p.nom)+'</button><small>'+(p.leg?'Légende · '+POUVOIRS[p.pv].nom+' · ':'')+p.poste+' · '+RACES[p.race].nom+(p.trait!=='aucun'?' · '+TRAITS[p.trait].nom:'')+' · '+(p.blesse>0?'blessé':p.suspendu?'suspendu':setTit.has(p)?'titulaire probable':'banc')+(T.liste&&T.liste.includes(p.id)&&S.phase==='inter'?' · à l\'échange':'')+'</small></div>'
    +'<div class="chiffres">'+p.f+' · '+p.v+' · '+p.t+(typeof p.mn==='number'?' · '+p.mn:'')+'<br>'+pl(p.sb,'but')+', '+p.sv+' sortis</div></div>').join('');
  return h+'</div><p class="note">Les nombres sont la force, la vitesse, la passe et les mains.</p><div class="actions"><button class="discret" data-act="fermer">Fermer</button></div></div></div>';
}
function vueOffre(){
  const moi=moiT();const o=trouver(offre.cible);if(!o){offre=null;return''}
  const p=o.p,T=o.T;const mes=moi.joueurs.filter(x=>moi.liste.includes(x.id));
  let h='<div class="voile haut" data-act="voile"><div class="fiche" role="dialog" aria-label="Faire une offre"><h2>Offre pour '+esc(p.nom)+'</h2><p class="note">'+esc(T.court)+' · '+p.poste.toLowerCase()+' · '+p.age+' ans · au poste '+notePoste(p)+' · FOR '+p.f+' VIT '+p.v+' PAS '+p.t+' MAI '+p.mn+'</p>'+chezVous(p);
  h+='<span class="t" style="margin-top:12px">Vous donnez</span>'+(mes.length?'<div class="cases">'+mes.map(x=>'<label><input type="checkbox" data-act="offre-donne" data-id="'+x.id+'"'+(offre.donne.includes(x.id)?' checked':'')+'> '+esc(x.nom)+' <span style="color:var(--creme-sourde);font-size:13px">· '+x.poste.toLowerCase()+' · au poste '+notePoste(x)+' · '+x.age+' ans</span></label>').join('')+'</div>':'<p class="note">Aucun joueur sur votre liste d\'échange : l\'offre se fera en pièces d\'or seulement.</p>');
  h+='<span class="t" style="margin-top:12px">Et en pièces d\'or</span><div class="seg"><button data-act="offre-po" data-v="-5">−5</button><button disabled style="opacity:1">'+offre.po+' po</button><button data-act="offre-po" data-v="5">+5</button></div>';
  if(offre.rep)h+='<p style="margin-top:12px;font-size:15px"><b>'+esc(offre.rep.club||'')+' :</b> « '+esc(offre.rep.msg)+' »</p>';
  h+='<div class="actions">';
  if(offre.rep&&offre.rep.statut==='contre')h+='<button class="gros" data-act="offre-contre">Accepter : '+offre.rep.po+' po</button>';
  h+='<button class="gros" data-act="offre-proposer"'+(huissiers(S)&&offre.po>0?' disabled':'')+'>Proposer</button><button class="discret" data-act="fermer">Annuler</button></div></div></div>';
  return h;
}
function vueConfirm(){return'<div class="voile haut"><div class="fiche" role="alertdialog" aria-label="Confirmation"><h2>'+esc(confirmation.titre)+'</h2><p>'+confirmation.texte+'</p><div class="actions"><button class="gros" data-act="oui">'+esc(confirmation.ok||'Confirmer')+'</button><button class="discret" data-act="non">Annuler</button></div></div></div>'}
function vueMessage(){return'<div class="voile haut"><div class="fiche" role="alertdialog" aria-label="Message"><h2>'+esc(message.titre)+'</h2><p>'+message.texte+'</p><div class="actions"><button class="gros" data-act="ok">D\'accord</button></div></div></div>'}
function dateCourte(t){const d=new Date(t),j=Math.round((Date.now()-t)/864e5);return j<=0?'aujourd\'hui':j===1?'hier':j<7?'il y a '+j+' jours':d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
function etatPartie(r){return r.phase==='inter'?'Saison '+r.saison+' · intersaison':r.fini?'Saison '+r.saison+' terminée':'Saison '+r.saison+' · journée '+(r.jour+1)+' sur '+r.nbJours}
function vueTitre(){
  const L=(lireIndex()||[]).slice().sort((a,b)=>b.maj-a.maj);let der=null;try{der=localStorage.getItem(DERN)}catch(e){}
  const r=L.find(x=>x.id===der)||L[0];
  const cartes=['orque_s3','nain_v1','elfe_fs1'].map((k,i)=>'<img class="carte-fond c'+i+'" alt="" src="img/'+k+'.jpg">').join('');
  return'<section class="titre-ecran"><div class="eventail" aria-hidden="true">'+cartes+'</div>'+logo('grand')
    +'<p class="accroche">Le sport médiéval où les arbitres s\'achètent<br>et où les joueurs finissent à l\'infirmerie.</p>'
    +'<div class="menu">'
    +(r?'<button class="gros" data-act="ouvrir" data-v="'+r.id+'">Continuer<small>'+esc(r.nom)+' · '+etatPartie(r)+'</small></button>':'<button class="gros" data-act="ecran" data-v="nouvelle">Fonder mon premier club</button>')
    +'<button class="menu-btn" data-act="ecran" data-v="solo"><b>Partie solo</b><small>'+(L.length?pl(L.length,'équipe enregistrée','équipes enregistrées')+' · nouvelle équipe':'Votre club contre 5 clubs de l\'ordinateur')+'</small></button>'
    +'<button class="menu-btn" data-act="ecran" data-v="multi"><b>Multijoueur <span class="bientot">dans l\'appli</span></b><small>Le Labo ne se joue qu\'en solo</small></button>'
    +'<button class="menu-btn" data-act="ecran" data-v="reglages"><b>Réglages</b><small>Son, apparence, tutoriel</small></button>'
    +'</div><p class="pied">Jeu privé entre amis · aucune publicité · sauvegardes gardées sur cet appareil</p></section>';
}
function retourTitre(t){return'<div class="barre-retour"><button class="discret" data-act="ecran" data-v="titre">‹ Écran titre</button><h2>'+t+'</h2></div>'}
function vueSolo(){
  const L=(lireIndex()||[]).slice().sort((a,b)=>b.maj-a.maj);
  let h='<section class="ecran-menu">'+retourTitre('Partie solo')+'<button class="gros" data-act="ecran" data-v="nouvelle">+ Fonder un nouveau club</button>';
  h+='<h3 class="soustitre">Vos équipes '+(L.length?'<small>('+L.length+')</small>':'')+'</h3>';
  if(!L.length)h+='<p class="note">Aucune équipe enregistrée pour l\'instant. Chaque club que vous fondez est sauvegardé automatiquement, à chaque action.</p>';
  h+=L.map(r=>'<div class="sauvegarde" style="--c:'+(r.couleur||'#7a6650')+'">'+(r.tete?'<img alt="" src="'+img(r.tete[0],r.tete[1])+'">':'<span class="vide"></span>')
    +'<div class="info"><b>'+esc(r.nom)+'</b><span>'+RACES[r.peuple].pl+' · '+etatPartie(r)+'</span><span>'+(r.phase==='saison'||r.fini?r.rang+(r.rang===1?'er':'e')+' · '+DIVS[r.div||4].court+' · ':'')+r.or+' po'+(r.titres?' · '+'🏆'.repeat(Math.min(5,r.titres)):'')+'</span><small>Joué '+dateCourte(r.maj)+'</small></div>'
    +'<div class="actions-s"><button class="discret or" data-act="ouvrir" data-v="'+r.id+'">Jouer</button><button class="discret" data-act="exporter" data-v="'+r.id+'" aria-label="Exporter '+esc(r.nom)+'">Exporter</button><button class="discret danger" data-act="suppr" data-v="'+r.id+'" aria-label="Supprimer '+esc(r.nom)+'">Supprimer</button></div></div>').join('');
  h+='<p class="etat-sauv '+nuageEtat+'">'+(nuageEtat==='nuage'?'☁ Vos équipes sont sauvegardées dans votre compte Claude : vous les retrouvez sur tous vos appareils.':'Vos équipes sont sauvegardées dans ce navigateur. Exportez-les de temps en temps pour ne pas les perdre.')+'</p>';
  h+='<div class="panneau import"><b>Garder ou transférer une équipe</b><p class="note">« Exporter » télécharge un fichier de sauvegarde. Gardez-le précieusement, ou envoyez-le sur un autre appareil et importez-le ici.</p>'
    +'<label class="discret fichier">Importer une sauvegarde<input type="file" accept=".json,application/json" data-act="importer"></label>'+(importErreur?'<p class="note alerte">'+importErreur+'</p>':'')+'</div>';
  return h+'</section>';
}
function vueAccueil(){
  return'<section class="accueil">'+retourTitre('Nouveau club')
    +'<label for="club">Nom de votre club</label><input type="text" id="club" maxlength="26" placeholder="Les Gros Bras de Varoque" value="'+esc(accueil.nom)+'">'
    +'<span class="lab">Peuple dominant de votre effectif de départ</span><div class="peuples">'+RACE_IDS.map(k=>'<button data-act="peuple" data-v="'+k+'" aria-pressed="'+(accueil.race===k)+'"><img alt="" src="'+img(k,0)+'"><span><b>'+RACES[k].pl+'</b><small>'+RACES[k].atout+'</small></span></button>').join('')+'</div>'
    +'<button class="gros" data-act="creer">Fonder le club</button><p class="note">Vous recevez 7 joueurs de ce peuple et 2 d\'ailleurs : 2 cogneurs, 2 trois-quarts, 2 coureurs, 1 passeur et 2 remplaçants. Une saison compte 10 journées face à 5 clubs dirigés par l\'ordinateur. Votre club est sauvegardé automatiquement.</p></section>';
}
function vueMulti(){
  if(typeof vueLigueAmis==='function')return vueLigueAmis(); /* les écrans de ligue sont dans ligue-ui.js */
  return'<section class="ecran-menu">'+retourTitre('Multijoueur')+'<div class="panneau multi"><span class="bientot grand">Le Labo</span>'
    +'<p>Ici, c\'est <b>le Labo</b> : le brouillon où l\'on essaie les idées avant de les mettre dans l\'appli. Il ne se joue qu\'en solo.</p><p class="note">La ligue entre amis se joue dans l\'appli, pas ici.</p></div></section>';
}
function vueReglages(){
  return'<section class="ecran-menu">'+retourTitre('Réglages')
    +'<div class="panneau reglages"><span class="t">Son</span><div class="seg"><button data-act="son" data-v="musique" aria-pressed="'+Son.reg.musique+'">Musique</button><button data-act="son" data-v="sons" aria-pressed="'+Son.reg.sons+'">Bruitages</button></div>'
    +'<span class="t">Musique pendant la partie</span><div class="modes-mus">'+[['lieux','Selon le lieu','L\'Hymne à l\'écran titre, la Marche des Gourdins au vestiaire, et une même musique pour tout le reste du jeu.'],['continue','Bande-son continue','Les morceaux s\'enchaînent tranquillement, sans changer quand vous changez d\'onglet.']].map(([k,n,d])=>'<button data-act="mode-mus" data-v="'+k+'" aria-pressed="'+(Son.reg.mode2===k)+'">'+n+'<small>'+d+'</small></button>').join('')+'</div><span class="petit">Ou un seul morceau en boucle :</span><div class="seg seg-mus">'+Object.keys(Son.NOMS_M).map(k=>'<button data-act="mode-mus" data-v="'+k+'" aria-pressed="'+(Son.reg.mode2===k)+'">'+Son.NOMS_M[k]+'</button>').join('')+'</div>'
    +'<span class="t">Apparence</span><div class="themes">'+THEMES.map(([k,n,d])=>'<button data-act="theme" data-v="'+k+'" aria-pressed="'+(themeActuel()===k)+'">'+n+'<small>'+d+'</small></button>').join('')+'</div>'
    +'<span class="t">Logo de l\'écran titre</span><div class="logos-choix">'+LOGOS.map(([k,n])=>'<button data-act="logo" data-v="'+k+'" aria-pressed="'+(logoActuel()===k)+'"><img alt="" src="'+srcLogo(k)+'"><small>'+n+'</small></button>').join('')+'</div>'
    +'<span class="t">Tutoriel</span><button class="discret" data-act="tuto-raz">'+(tutoVu()?'Revoir la visite guidée au prochain club':'La visite guidée se lancera au prochain club')+'</button></div></section>';
}
const tutoVu=()=>{try{return localStorage.getItem('woodbowl-tuto')==='vu'}catch(e){return false}};
const THEMES=[['stade','Stade de nuit','Projecteurs et pelouse'],['carte','Carte à collectionner','Carton crème, encre noire'],['tele','Retransmission télé','Plateau bleu des années 80'],['programme','Programme de match','Papier journal et encre rouge'],['fer','Fer et sang','Pierre noire et or gothique']];
function themeActuel(){try{return localStorage.getItem('woodbowl-theme')||'stade'}catch(e){return'stade'}}
function appliquerTheme(k){try{localStorage.setItem('woodbowl-theme',k)}catch(e){}document.documentElement.className=k==='stade'?'':'theme-'+k}

/* ================= ERGONOMIE : sous-onglets, lignes compactes, guide ================= */
let sous={vestiaire:null,club:'finances',ligue:'classement'},guide=false;
function barreSous(v,items){return'<div class="sous" role="tablist">'+items.map(([k,l,b])=>'<button role="tab" data-act="sous" data-v="'+v+':'+k+'" aria-selected="'+(sous[v]===k)+'">'+l+(b?'<i>'+b+'</i>':'')+'</button>').join('')+'</div>'}
function sections(html,garder){
  const parts=html.split('<section class="bloc">');let out=parts[0];
  for(const p of parts.slice(1)){const m=p.match(/<h2>([^<]*)/);if(m&&garder.test(m[1]))out+='<section class="bloc">'+p}
  return out;
}
function alertesVestiaire(){const moi=moiT();let h='';
  if(S.evt)h+='<section class="bloc"><h2>Rebondissement</h2><div class="panneau affiche evt"><div class="duel" style="font-size:20px">'+esc(S.evt.titre)+'</div>'+(S.evt.p&&S.evt.p.nom?'<div class="carte" style="margin-top:10px;box-shadow:none">'+vignette(S.evt.p,'#7a6650')+'<div style="min-width:0"><b>'+esc(S.evt.p.nom)+'</b><div class="puces">'+puces(S.evt.p)+'</div>'+jaugesJoueur(S.evt.p)+'</div></div>':'')+'<p style="margin-top:10px">'+esc(S.evt.texte)+'</p><div class="seg" style="margin-top:10px"><button data-act="evt" data-v="1">'+esc(S.evt.oui)+'</button><button data-act="evt" data-v="0">'+esc(S.evt.non)+'</button></div></div></section>';
  if(moi.or<0||moi.joueurs.length<6){const cs=[];
    if(moi.joueurs.length<7)cs.push('Signez un <b>jeune du pays</b> au marché : gratuit, 1 po par match, et il progresse vite.');
    if(!moi.pret)cs.push('Le <b>banquier</b> (onglet Club) prête '+PRET.montant+' po, remboursés '+PRET.parMatch+' po par match.');
    if(coutStaff(moi)>=8)cs.push('Votre staff coûte '+coutStaff(moi)+' po par match : un membre moins cher, ou aucun, soulagera la caisse.');
    const cher=moi.joueurs.slice().sort((a,b)=>b.sal-a.sal)[0];if(cher&&cher.sal>=6&&moi.joueurs.length>NB_TIT)cs.push('<b>'+esc(cher.nom)+'</b> coûte '+cher.sal+' po par match : le renvoyer rapporte '+Math.round(valeur(cher)*.4)+' po.');
    cs.push('Jouez « Prudent » : moins de blessés et de cartons chez vous.');
    h+='<section class="bloc"><div class="alerte-bloc"><b>Plan de survie</b><ul style="margin:6px 0 0;padding-left:18px">'+cs.map(c=>'<li>'+c+'</li>').join('')+'</ul></div></section>'}
  if(moi.or<0)h+='<section class="bloc"><div class="alerte-bloc"><b>Les huissiers sont à la porte.</b> Caisse dans le rouge : plus de recrutement, d\'embauche ni de pot-de-vin (les jeunes du pays restent possibles). Sous '+DETTE_MAX+' po, ils vendent un joueur d\'office.</div></section>';

  return h}
/* ---------- Feuille de match : ce qu'il reste à faire avant le coup d'envoi ---------- */
function feuilleDeMatch(){
  const moi=moiT(),{tit}=onzeDe(moi),L=[];
  const it=(cl,txt,btn)=>L.push('<li class="'+cl+'"><span>'+txt+'</span>'+(btn||'')+'</li>');
  const bEq='<button class="discret" data-act="sous" data-v="vestiaire:equipe">Équipe</button>';
  const manque=POSTE_IDS.filter(po=>!tit.some(p=>p.poste===po&&!p.temp));
  if(besoinPret(S))it('alerte','Il vous manque '+pl(besoinPret(S),'joueur valide','joueurs valides')+' : des stagiaires très faibles (26 partout) compléteront. Empruntez un joueur pour ce match.','<button class="discret or" data-act="pret">Prêt d\'urgence</button>');
  manque.forEach(po=>it('alerte','Aucun <b>'+po.toLowerCase()+'</b> titulaire : '+(po==='Cogneur'?'−10 % en défense':po==='Trois-quarts'?'−5 % en attaque et en défense':'−8 % en attaque')+'.',bEq));
  const las=tit.filter(p=>!p.temp&&p.forme<50).sort((a,b)=>a.forme-b.forme);
  if(las.length)it('alerte','<b>'+las.map(p=>esc(p.nom.split(' ')[0])).join(', ')+'</b> '+(las.length>1?'sont épuisés':'est épuisé')+' (forme '+las.map(p=>Math.round(p.forme)).join(', ')+') : '+(las.length>1?'ils jouent':'il joue')+' moins bien et se blesse'+(las.length>1?'nt':'')+' plus. Faites entrer un remplaçant frais.',bEq);
  const surmenes=moi.joueurs.filter(p=>dispo(p)&&p.forme<55&&p.entr&&p.entr!=='repos');
  if(surmenes.length)it('conseil',pl(surmenes.length,'joueur fatigué','joueurs fatigués')+' à l\'entraînement : le repos leur rendrait de la forme.','<button class="discret" data-act="repos-fatigues">Les reposer</button>');
  const pc=prochainTourCoupe(S);if(pc&&pc.maintenant&&pc.enCourse)it('conseil','Match de <b>coupe</b> juste après : '+(S.choix.coupeRot?'vos remplaçants le démarreront.':'vos titulaires enchaîneront deux matchs.'),'');
  const riv=etatsDe(moi,tit).filter(e=>e.rival);
  riv.forEach(e=>it('conseil','Rivalité sur le terrain : <b>'+e.nom+'</b> ('+e.effet.split(':')[0]+').',bEq));
  const c=clePronostic();
  if(leviersCache.cle===c&&leviersCache.r){const top=leviersCache.r.leviers[0];
    if(top&&top.dv>=.03&&top.app)it('idee','Meilleur réglage trouvé : <b>'+esc(top.nom)+'</b> ('+(Math.round(top.dv*100)>0?'+':'')+Math.round(top.dv*100)+' points de victoire).','<button class="discret or" data-act="levier" data-v="0">Appliquer</button>');
    else it('ok','Vos ordres sont déjà les meilleurs trouvés par la simulation.')}
  else{it('calc','Le stratège cherche votre meilleur réglage…');if(!leviersCache.calcul){leviersCache.calcul=true;setTimeout(()=>{if(clePronostic()!==c){leviersCache.calcul=false;return}leviersCache={cle:c,r:leviersPronostic(S,S.choix,150),calcul:false};if(vue==='vestiaire'&&sous.vestiaire==='match')rendre()},400)}}
  if(!S.sponsor&&S.saison>=1&&S.offresSponsor&&S.offresSponsor.length)it('conseil','Aucun sponsor : il paie à chaque match, sans rien vous coûter.','<button class="discret" data-act="vue-club" data-v="staff">Signer</button>');
  if(!L.some(x=>x.startsWith('<li class="alerte')))L.unshift('<li class="ok"><span>Équipe complète et en état de jouer.</span></li>');
  return'<div class="feuille"><span class="t">Avant le coup d\'envoi</span><ul>'+L.join('')+'</ul></div>';
}
function ongletMatch(){const moi=moiT();let h=encartCoupe();const{adv,dom}=prochainMatch(S);const rang=rangDe(S,adv.id);
  const c=S.choix;const potOk=moi.or>=COUT_POT&&!huissiers(S);const r=S.rapport;const cible=onzeDe(adv).tit;
  h+='<section class="bloc"><h2>Prochain match <small>'+(dom?'à domicile (+5 %)':"à l'extérieur")+'</small></h2><div class="panneau affiche"><div class="duel">'+(dom?esc(moi.court)+' – '+adv.court:adv.court+' – '+esc(moi.court))+'</div>'
    +'<p><b>'+adv.nom+'</b>, '+rang+(rang===1?'er':'e')+' de la '+divDe(S).nom+'. '+adv.rep+' <button class="lien" data-act="club" data-id="'+adv.id+'">Observer</button></p>'
    +(r?rapportHTML(adv):'<p class="note" style="margin:6px 0 0">Sans stratège, vous ignorez leurs plans. <button class="lien" data-act="vue-club" data-v="staff">En embaucher un</button></p>')+'</div></section>';
  h+='<section class="bloc">'+feuilleDeMatch()+'</section>';
  const tc=TACTIQUES[c.tactique||'equilibre'];
  h+='<section class="bloc"><h2>Vos ordres</h2><div class="panneau choix">'+blocChances()
    +'<div><span class="t">Consigne</span><div class="seg">'+['prudent','normal','brutal'].map(k=>'<button data-act="consigne" data-v="'+k+'" aria-pressed="'+(c.consigne===k)+'">'+k.charAt(0).toUpperCase()+k.slice(1)+(r&&r.conseil===k?' ★':'')+'</button>').join('')+'</div><p class="effet">'+CONSIGNES[c.consigne]+'</p></div>'
    +'<div><span class="t">Plan de jeu <button class="lien petit" data-act="guide" data-v="plans">qui bat qui ?</button></span><div class="seg tactiques">'+TACTIQUE_IDS.map(k=>'<button data-act="tactique" data-v="'+k+'" aria-pressed="'+((c.tactique||'equilibre')===k)+'" title="'+esc(TACTIQUES[k].desc)+'">'+TACTIQUES[k].court+(r&&r.tacConseil===k?' ★':'')+'</button>').join('')+'</div><p class="effet">'+esc(tc.desc)+(tc.bat?' Bat le '+TACTIQUES[tc.bat].nom.toLowerCase()+', perd contre le '+TACTIQUES[contreDe(c.tactique||'equilibre')].nom.toLowerCase()+'.':'')+'</p></div>'
    +'<details class="avance"'+(c.marque||c.pot?' open':'')+'><summary>Ordres avancés <small>marquage : '+(c.marque?esc((cible.find(p=>p.id===c.marque)||{nom:'?'}).nom):'personne')+' · arbitre : '+(c.pot?'payé':'honnête')+'</small></summary>'
    +'<div><span class="t">Marquage individuel</span><select data-act="marque" aria-label="Joueur adverse à marquer"><option value="">Personne</option>'+cible.map(p=>'<option value="'+p.id+'"'+(c.marque===p.id?' selected':'')+'>'+esc(p.nom)+' · '+p.poste.toLowerCase()+' · '+pl(p.sb,'but')+(r&&r.menace===p.id?' ★':'')+'</option>').join('')+'</select><p class="effet">'+(c.marque?'Le joueur marqué perd environ '+Math.round((1-kk(moi,'strat','marquage'))*100)+' % d\'efficacité ; votre attaque perd 3 %.':'Un de vos joueurs colle le meilleur adversaire : il perd en efficacité, vous perdez un peu en attaque.')+'</p></div>'
    +'<div><span class="t">Arbitre</span><div class="seg"><button data-act="pot" data-v="0" aria-pressed="'+(!c.pot)+'">Honnête</button><button data-act="pot" data-v="1" aria-pressed="'+(!!c.pot)+'" '+(potOk?'':'disabled')+'>Payé ('+COUT_POT+' po)</button></div><p class="effet">'+(c.pot?"Il gardera ses cartons en poche et sifflera peut-être un penalty pour vous. Petit risque de scandale.":potOk?'Vos fautes seront jugées normalement.':huissiers(S)?'Les huissiers surveillent votre caisse : pas de pot-de-vin.':'Caisse trop maigre pour corrompre qui que ce soit.')+'</p></div></details>'
    +'</div></section>';
  h+=blocOrdresJoueurs(moi,cible);
  return h}
/* cibler un adversaire, ou protéger un coéquipier */
function blocOrdresJoueurs(moi,cible){
  const{tit}=onzeDe(moi);const O=S.choix.ordres||{};const valide=ordresValides(S);
  const elig=tit.filter(p=>!p.temp&&(p.poste==='Cogneur'||(p.race==='elfenoir'&&(p.sp||0)>=20)));
  if(!elig.length)return'';
  const lignes=elig.map(p=>{const x=valide[p.id];const v=x?(x.k==='cible'?'c:':'g:')+x.id:'';
    const assassin=p.race==='elfenoir'&&(p.sp||0)>=20;
    const protegeables=tit.filter(q=>q!==p&&!q.temp);
    const sel='<select data-act="ordre" data-id="'+p.id+'" aria-label="Ordre pour '+esc(p.nom)+'"><option value="">Jeu normal</option>'
      +'<optgroup label="'+(assassin?'Cibler (assassinat ciblé)':'Cibler un adversaire')+'">'+cible.filter(q=>!q.temp).map(q=>'<option value="c:'+q.id+'"'+(v==='c:'+q.id?' selected':'')+'>🎯 '+esc(q.nom)+' · '+q.poste.toLowerCase()+'</option>').join('')+'</optgroup>'
      +(p.poste==='Cogneur'?'<optgroup label="Protéger un coéquipier">'+protegeables.map(q=>'<option value="g:'+q.id+'"'+(v==='g:'+q.id?' selected':'')+'>🛡 '+esc(q.nom)+' · '+q.poste.toLowerCase()+'</option>').join('')+'</optgroup>':'')+'</select>';
    const eff=!x?'Il cogne au hasard des mêlées.':x.k==='cible'?(assassin?'S\'il tente un assassinat, ce sera sur sa cible. ':'')+'Ses coups visent surtout sa cible (2 fois sur 3), un peu plus fort. Il cogne aussi un peu plus souvent.':'Quand on frappe son protégé, il s\'interpose souvent (environ une fois sur deux, plus s\'il est fort) et encaisse à sa place, en amortissant. En échange, il cogne deux fois moins.';
    return'<div class="ordre-j"><span class="mini-img '+cad(p)+'"><img alt="" src="'+img(p.race,p.tete)+'"></span><div><b>'+esc(p.nom)+'</b><small>'+p.poste.toLowerCase()+(assassin?' · assassin':'')+' · FOR '+p.f+'</small>'+sel+'<p class="effet">'+eff+'</p></div></div>'}).join('');
  const nb=Object.keys(valide).length;
  return'<section class="bloc"><details class="avance ordres-j"'+(nb?' open':'')+'><summary>Ordres aux joueurs <small>'+(nb?pl(nb,'ordre donné','ordres donnés'):'cibler ou protéger')+'</small></summary><p class="note" style="margin:6px 0 8px">Vos cogneurs peuvent <b>cibler</b> un adversaire pour lui faire mal, ou <b>protéger</b> un coéquipier en garde du corps. Vos elfes noirs assassins peuvent choisir leur victime. Les ordres restent valables tant que la cible est là.</p>'+lignes+'</details></section>';
}
function pucesC(p){
  const P=(cl,k,txt)=>'<span class="puce '+cl+'"'+aide(aidePuce(k,p))+'>'+txt+'</span>';let h='';
  if(p.blesse>0)h+=P('alerte','blesse','✚ '+(p.blesse>1?p.blesse+' matchs':'1 match'));
  if(p.suspendu)h+=P('alerte','susp','Suspendu');
  if(p.sj%3)h+=P('jaune','jaune','🟨 '+p.sj%3);
  if(p.pret)h+='<span class="puce alerte"'+aide('Prêté par '+p.pret.clubNom+' pour un seul match.')+'>Prêté</span>';if(p.veteran)h+=P('trait','veteran','Vétéran');if(p.jeune&&!p.saisons)h+=P('gain','jeune','Recrue');if(p.mercenaire)h+=P('alerte','mercenaire','Mercenaire');
  if(p.leg){const L=legendeDe(p.leg);h+='<span class="puce leg"'+aide('Légende du Wood Bowl. Pouvoir « '+POUVOIRS[L.pv].nom+' » : '+POUVOIRS[L.pv].desc+' Une légende inspire aussi toute son équipe (+2 % en attaque et en défense).')+'>✦ '+POUVOIRS[L.pv].nom+'</span>'}
  else if(p.etoiles)h+=P('trait','legende','★'.repeat(p.etoiles));
  if(p.trait!=='aucun')h+=P('trait','trait',TRAITS[p.trait].nom);
  if((p.sp||0)>=25)h+='<span class="puce spe"'+aide(SPECIALITES[p.race].nom+' niveau '+NIV_SPE(p.sp)+' : '+SPECIALITES[p.race].desc)+'>'+SPECIALITES[p.race].nom+'</span>';
  if(p.gain&&p.gain.n)h+=P('gain','gain','+'+p.gain.n+' '+ENTR[p.gain.k].court);if(p.gain&&p.gain.max)h+=P('maxi','max',ENTR[p.gain.max.de].court+' au max');
  return h;
}
/* ================= Avis de décès ================= */
let deuil=null;
const ilElle=(d,M)=>d.sexe==='f'?(M?'Elle':'elle'):(M?'Il':'il');
const accorde=(d,m,f)=>d.sexe==='f'?f:m;
function momentMort(i){if(!i||!i.m)return'pendant le match';const m=i.m;return'à la '+m+'e minute'+(m<=40?' (première mi-temps)':' (seconde mi-temps)')}
/* pourquoi ? on liste ce qui a vraiment pesé, du plus lourd au plus léger */
function causesMort(d){
  const i=d.info||{},L=[];
  if(i.asn)L.push(['Un assassinat','Les elfes noirs envoient parfois une lame dans la mêlée. Ce n\'était pas un accident.']);
  if(i.forme!==undefined&&i.forme<30)L.push(['Épuisé'+accorde(d,'','e'),ilElle(d,1)+' jouait à '+i.forme+' de forme : sous 30, les coups sont presque deux fois plus dangereux. Laissez souffler les joueurs épuisés.']);
  else if(i.forme!==undefined&&i.forme<50)L.push(['Fatigué'+accorde(d,'','e'),ilElle(d,1)+' jouait à '+i.forme+' de forme : sous 50, les coups font 40 % plus de dégâts.']);
  if(i.brutal)L.push(['Un adversaire déchaîné',esc(i.club||'L\'adversaire')+' jouait en consigne « Brutal » : +35 % de dégâts.']);
  if(i.rapport>=1.25)L.push(['Un colosse en face',esc(i.par||'Son bourreau')+' était bien plus fort'+(i.rapport>=1.5?' (près de deux fois sa force)':'')+'. Plus l\'écart de force est grand, plus le coup fait mal.']);
  if(i.boucher)L.push(['Un boucher légendaire',esc(i.par)+' est une légende au pouvoir « Boucher » : ses coups sont bien plus dangereux.']);
  if(i.rob!==undefined&&i.rob<=40)L.push([revele(S,'c')?'Fragile':'Une constitution fragile',revele(S,'c')?'Sa robustesse était faible : les blessures étaient plus fréquentes et plus graves.':'Son profil caché le rendait plus vulnérable aux coups (vous le découvrirez au Grand Bol de Bois).']);
  if(!i.prudent&&!L.length)L.push(['La malchance','Rien de particulier : chaque coup a une petite chance d\'être fatal, même dans un match sans enjeu. C\'est rare, et c\'est le Wood Bowl.']);
  return L;
}
function protections(){
  const moi=moiT(),L=[];
  if(!(moi.staff&&moi.staff.prep))L.push('Embaucher un <b>préparateur-kiné</b> (onglet Club) : il peut sauver un joueur d\'un coup mortel.');
  L.push('Jouer en consigne <b>Prudent</b> contre les équipes brutales : −35 % de dégâts subis.');
  L.push('<b>Reposer</b> les joueurs dont la forme passe sous 50.');
  return L;
}
function vueDeuil(){
  const d=deuil,i=d.info||{},moi=moiT();const C=causesMort(d);
  return'<div class="voile haut deuil-voile"><div class="fiche deuil" role="alertdialog" aria-label="Avis de décès">'
    +'<div class="deuil-t">Avis de décès</div>'
    +'<div class="deuil-portrait"><img alt="" src="'+img(d.race,d.tete)+'"><span class="crepe"></span></div>'
    +'<h2>† '+esc(d.nom)+'</h2>'
    +'<p class="deuil-sous">'+esc(d.poste)+' · '+RACES[d.race].nom.toLowerCase()+(d.age?' · '+d.age+' ans':'')+'</p>'
    +'<p class="deuil-recit">'+ilElle(d,1)+' est '+accorde(d,'tombé','tombée')+' '+momentMort(i)+(d.coupe?' en <b>Coupe du Gourdin</b>':' lors de la <b>journée '+d.jour+'</b>')+(i.club?', contre <b>'+esc(i.clubNom||i.club)+'</b>':'')+(i.par?', sous les coups de <b>'+esc(i.par)+'</b>'+(i.parPoste?' ('+i.parPoste.toLowerCase()+')':''):'')+'. '+ilElle(d,1)+' a quitté l\'équipe pour toujours.</p>'
    +'<p class="deuil-carriere">'+pl(d.matchs,'match')+' · '+pl(d.buts,'but')+(d.sb?' · '+pl(d.sb,'adversaire sorti','adversaires sortis'):'')+(d.saisons?' · '+pl(d.saisons+1,'saison')+' au club':' · sa première saison')+'</p>'
    +'<h3>Pourquoi ?</h3><ul class="deuil-causes">'+C.map(c=>'<li><b>'+c[0]+'</b><span>'+c[1]+'</span></li>').join('')+'</ul>'
    +'<details class="regles"><summary>Protéger les autres</summary><ul>'+protections().map(t=>'<li><span>'+t+'</span></li>').join('')+'</ul></details>'
    +'<div class="actions"><button class="gros" data-act="deuil-ok">Minute de silence</button>'
    +'<button class="discret or" data-act="deuil-fun"'+(moi.or<10?' disabled':'')+'>Des funérailles dignes (10 po, +3 ferveur)</button></div>'
    +'<p class="note" style="text-align:center;margin:6px 0 0">Son nom rejoint la liste « Tombés au champ d\'honneur », onglet Légendes.</p>'
    +'</div></div>';
}
function deuilSuivant(){const nv=(S.deuils||[]).filter(d=>!d.vu);deuil=nv[0]||null;if(deuil)Son.jouer('triste')}
/* page de la gazette */
function pageNecro(g){
  let h='<div class="tete-page"><span>L\'Écho du Gourdin</span><span>Nécrologie</span></div><h3 class="rub">Carnet noir</h3>';
  g.deuils.forEach(d=>{const i=d.info||{};
    h+='<div class="necro"><img alt="" src="'+img(d.race,d.tete)+'"><div><h2>'+esc(d.nom)+'</h2><p class="chapo">'+(d.age?d.age+' ans, ':'')+d.poste.toLowerCase()+' chez '+esc(moiT().nom)+'.</p>'
      +'<p>'+pick([ilElle(d,1)+' aimait le contact, le contact l\'a aimé'+accorde(d,'','e')+' en retour, un peu trop fort.','Le vestiaire garde sa place sur le banc et son casque au clou.','La buvette a mis une chope en berne. On ne la remplira pas ce soir.','Les supporters ont chanté son nom pendant tout le temps fort suivant.'])
      +(i.par?' Le coup fatal est venu de '+esc(i.par)+' ('+esc(i.club)+').':'')+' Bilan d\'une vie de gourdin : '+pl(d.matchs,'match')+', '+pl(d.buts,'but')+'.</p></div></div>'});
  return h;
}
/* ================= Haut niveau : interface ================= */
let tiroir=false,pretVu=false;
const cad=(p,vu)=>cadreDe(S,p,vu).cls;
const ageCourt=p=>p.age?p.age+' ans':'';
function texteCadre(p,vu){const c=cadreDe(S,p,vu);let t='<b>Cadre '+c.tier.nom.toLowerCase()+'</b> : '+c.tier.desc+' (valeur au poste '+notePoste(p,vu||null)+').';if(c.spe==='leg')t='<b>Cadre doré de légende</b> : '+CADRES_SPE.leg.desc+' (valeur au poste '+notePoste(p,vu||null)+').';else if(c.spe)t+=' <b>'+CADRES_SPE[c.spe].nom+'</b> au coin du portrait : '+CADRES_SPE[c.spe].desc+'.';return t}
/* vos joueurs au même poste, pour comparer d'un coup d'œil */
function chezVous(p,vu){
  const moi=moiT();if(!moi)return'';const v=notePoste(p,vu||null);
  const L=moi.joueurs.filter(x=>x!==p&&x.id!==p.id&&x.poste===p.poste&&!x.mort).sort((a,b)=>notePoste(b)-notePoste(a));
  if(!L.length)return'<div class="chez-vous"><small>Chez vous :</small> <span class="cv-vide">aucun '+p.poste.toLowerCase()+'</span></div>';
  return'<div class="chez-vous"><small>Vos '+POSTES[p.poste].pl.toLowerCase()+' :</small> '+L.map(x=>{const d=notePoste(x)-v;return'<span class="cv '+(d>=3?'mieux':d<=-3?'moins':'egal')+'" title="'+esc(x.nom)+' : valeur au poste '+notePoste(x)+', '+x.age+' ans">'+esc(x.nom.split(' ')[0])+' <b>'+notePoste(x)+'</b></span>'}).join('')+'</div>';
}
/* le tiroir « Mon équipe », ouvrable pendant les transactions */
function boutonTiroir(){return(fiche!==null||offre||tiroir||clubVu!==null)?'':'<button class="btn-tiroir" data-act="tiroir">👥 Mon équipe</button>'}
function vueTiroir(){
  const moi=moiT();const L=moi.joueurs.slice().sort((a,b)=>POSTE_IDS.indexOf(a.poste)-POSTE_IDS.indexOf(b.poste)||notePoste(b)-notePoste(a));
  return'<div class="voile bas" data-act="voile"><div class="tiroir" role="dialog" aria-label="Mon équipe"><div class="tiroir-t"><b>Mon équipe</b><span>'+moi.joueurs.length+' / '+MAX_EFFECTIF+' joueurs · '+masseSalariale(moi)+' po de salaires par match</span><button class="discret" data-act="fermer">Fermer</button></div>'
    +'<table class="mini-eq"><thead><tr><th></th><th>Joueur</th><th title="Valeur au poste">Val.</th><th>FOR</th><th>VIT</th><th>PAS</th><th>MAI</th><th>Âge</th></tr></thead><tbody>'
    +L.map(p=>'<tr><td><span class="mini-img '+cad(p)+'"><img alt="" src="'+img(p.race,p.tete)+'"></span></td><td><button class="lien" data-act="fiche" data-id="'+p.id+'">'+esc(p.nom)+'</button><small>'+p.poste+(p.retraite?' · dernière saison':'')+(dispo(p)?'':' · indisponible')+'</small></td><td class="val">'+notePoste(p)+'</td>'
      +STATS.map(k=>'<td class="r'+rangStat(p,k)+'">'+p[k]+'</td>').join('')+'<td>'+p.age+'</td></tr>').join('')
    +'</tbody></table><p class="note" style="margin:6px 0 0">Val. = valeur au poste. En doré, la note principale de chaque poste.</p></div></div>';
}
/* profil caché */
function profilCacheHTML(p){
  if(!p.h)return'';
  return'<div class="savoir cache"><small>Profil caché</small>'+CACHE_IDS.map(k=>{const C=CACHE[k];
    if(!revele(S,k))return'<div class="pc"><span>'+C.nom+'</span><span class="pc-inc"'+aide(C.desc+' '+C.rev)+'>? · révélé '+DIVS[C.div].en+'</span></div>';
    const n=niveauCache(p.h[k]);return'<div class="pc"><span>'+C.nom+'</span><span class="pips n'+n+'"'+aide(C.desc)+'>'+'●'.repeat(n+1)+'<i>'+'●'.repeat(4-n)+'</i> '+motCache(k,p.h[k])+'</span></div>'}).join('')+'</div>';
}
function pucesCache(p){
  if(!p.h)return'';let h='';
  CACHE_IDS.forEach(k=>{if(!revele(S,k))return;const n=niveauCache(p.h[k]);if(n===4||n===0)h+='<span class="puce '+(n===4?'cache-bon':'cache-mal')+'"'+aide(CACHE[k].nom+' : '+motCache(k,p.h[k]).toLowerCase()+'. '+CACHE[k].desc)+'>'+(k==='m'?(n===4?"Mental d'acier":'Mental friable'):motCache(k,p.h[k]))+'</span>'});
  return h;
}
function pucesCarriere(p){
  let h='';
  if(p.retraite)h+='<span class="puce alerte"'+aide((p.sexe==='f'?'Elle':'Il')+' a annoncé que cette saison serait sa dernière. À l\'intersaison, '+(p.sexe==='f'?'elle':'il')+' raccrochera les crampons, avec un jubilé. Préparez la relève.')+'>Dernière saison</span>';
  if(p.gain&&p.gain.mentor)h+='<span class="puce gain"'+aide('Parrainé par '+p.gain.mentor+' : un ancien du même poste lui a fait gagner un point de plus cette semaine.')+'>Parrainé</span>';
  return h;
}
/* le prêt d'urgence */
function vuePret(){
  const moi=moiT(),L=offresPret(S),n=besoinPret(S);
  return'<div class="voile haut" data-act="voile"><div class="fiche" role="dialog" aria-label="Prêt d\'urgence"><h2>Prêt d\'urgence</h2>'
    +'<p class="note">Il vous '+(n?'manque <b>'+pl(n,'joueur valide','joueurs valides')+'</b>. ':'reste assez de joueurs. ')+'Un club voisin vous prête un joueur pour <b>un seul match</b> : il repart juste après. Moins bon qu\'un vrai titulaire, mais bien meilleur qu\'un stagiaire (26 partout). Il ne touche pas de salaire.</p>'
    +(n?L.map(p=>'<div class="carte">'+vignette(p,p.pret.couleur)+'<div style="min-width:0"><b>'+esc(p.nom)+'</b><div class="note" style="margin:2px 0">Prêté par '+esc(p.pret.clubNom)+'</div><div class="puces">'+puces(p)+'</div>'+jaugesJoueur(p)+chezVous(p)+'</div><div class="cmd"><b class="prix">'+p.prix+' po</b><button class="discret or" data-act="emprunter" data-id="'+p.id+'"'+(moi.or<p.prix?' disabled':'')+'>Emprunter</button></div></div>').join(''):'')
    +'<div class="actions"><button class="gros" data-act="fermer">Fermer</button></div></div></div>';
}
/* la coupe */
function blocCoupe(){
  const C=S.coupe;if(!C)return'<section class="bloc"><h2>Coupe du Gourdin</h2><div class="panneau"><p class="note" style="margin:0">La prochaine Coupe du Gourdin commencera avec la prochaine saison.</p></div></section>';
  const nom=id=>{const T=equipeCoupe(S,id);return T?(id===0?'<b>'+esc(T.court)+'</b>':esc(T.court)+(T.invite?' <small>('+DIVS[T.div].court+')</small>':'')):'?'};
  let h='<section class="bloc"><h2>Coupe du Gourdin <small>à élimination directe</small></h2><div class="panneau coupe">';
  h+='<p class="note" style="margin:0 0 8px">Les 6 clubs de la ligue et 2 invités d\'autres divisions. Un seul match par tour, joué juste après la journée de championnat : vos joueurs enchaînent deux matchs. En cas d\'égalité, tirs au but. Victoire finale : '+Math.round(COUPE_VICTOIRE*divDe(S).argent)+' po, et un trophée.</p>';
  TOURS_COUPE.forEach((t,n)=>{const fait=C.tours[n],pr=C.tableau[n];
    h+='<div class="tour-c"><span class="t">'+t.nom+' · après la journée '+(t.apres+1)+'</span>';
    if(fait)h+=fait.matchs.map(m=>'<div class="mc'+(m.moi?' moi':'')+'"><span class="'+(m.v===m.ida?'g':'')+'">'+nom(m.ida)+'</span><b>'+m.score[0]+' – '+m.score[1]+(m.tab?' <small>(t.a.b. '+m.tab[0]+'-'+m.tab[1]+')</small>':'')+'</b><span class="'+(m.v===m.idb?'g':'')+'">'+nom(m.idb)+'</span></div>').join('');
    else if(pr){for(let i=0;i<pr.length;i+=2)h+='<div class="mc'+(pr[i]===0||pr[i+1]===0?' moi':'')+'"><span>'+nom(pr[i])+'</span><b>contre</b><span>'+nom(pr[i+1])+'</span></div>'}
    else h+='<div class="mc vide"><span>À déterminer</span></div>';
    h+='</div>'});
  if(C.vainqueur)h+='<p class="coupe-v">🏆 '+esc(C.vainqueurNom)+' remporte la Coupe du Gourdin.</p>';
  return h+'</div></section>';
}
function encartCoupe(){
  const c=prochainTourCoupe(S);if(!c||!c.maintenant)return'';
  if(!c.enCourse)return'';
  return'<section class="bloc"><div class="panneau coupe-ordre"><span class="t">Coupe du Gourdin · '+c.tour.nom.toLowerCase()+'</span><p style="margin:2px 0 8px">Juste après ce match, vous affrontez <b>'+esc(c.adv.nom)+'</b>'+(c.adv.invite?' (invité de la '+DIVS[c.adv.div].nom+')':'')+' en coupe. Vos joueurs enchaînent deux matchs : la forme va fondre.</p>'
    +'<div class="seg"><button data-act="coupe-rot" data-v="0" aria-pressed="'+!S.choix.coupeRot+'">Équipe type</button><button data-act="coupe-rot" data-v="1" aria-pressed="'+!!S.choix.coupeRot+'">Faire tourner</button></div>'
    +'<p class="note" style="margin:6px 0 0">'+(S.choix.coupeRot?'Vos remplaçants démarreront le match de coupe. Les titulaires se reposent un peu.':'Vos titulaires jouent les deux matchs. Plus fort en coupe, mais plus fatigués ensuite.')+'</p></div></section>';
}
function bandeauDivision(){
  const d=S.div||4,D=divDe(S);
  return'<div class="div-bandeau d'+d+'"><span class="div-n">Échelon '+(5-d)+' sur 4</span><b>'+D.nom+'</b><span>'+(d>1?'Les 2 premiers montent'+(d<4?', le dernier descend':''):'L\'élite. Le dernier descend.')+'</span></div>';
}
function ligneJ(p,mode,rang,nb){
  const moi=moiT(),out=!dispo(p),tit=p.titulaire&&!out;
  const st=(l,k)=>{const r=rangStat(p,k);return'<span class="r'+r+'"'+aide(AIDE[l]+' Pour un '+p.poste.toLowerCase()+', c\'est la note '+RANG_NOM[r]+'. Plafond : '+p.cap[k]+'.')+'>'+l+(RANG_MARQ[r]?'<i>'+RANG_MARQ[r]+'</i>':'')+' <b>'+p[k]+'</b>'+(p[k]>=p.cap[k]?'<em>MAX</em>':'')+'</span>'};const vp='<span class="vp"'+aide(AIDE.poste)+'>POSTE <b>'+notePoste(p)+'</b></span>';
  let d='';
  if(mode==='equipe'){
    d='<button class="mini'+(tit?' on':'')+'" data-act="titulaire" data-id="'+p.id+'" aria-pressed="'+tit+'" '+(out?'disabled':'')+' title="'+esc(AIDE.titulaire)+'">'+(out?(p.blesse>0?'Soins':'Tribune'):tit?'Titulaire':rang===0?'Auto':'Banc '+rang)+'</button>';
    if(!out&&!tit&&rang>0)d+='<div class="ordre"><button data-act="monter" data-id="'+p.id+'" aria-label="Plus tôt" '+(rang<=1?'disabled':'')+'>▲</button><button data-act="descendre" data-id="'+p.id+'" aria-label="Plus tard" '+(rang>=nb?'disabled':'')+'>▼</button></div>';
  }else if(mode==='entr'){
    d=p.blesse>0?'<span class="note" style="margin:0">Aux soins</span>':'<div class="entr-mini">'+Object.keys(ENTR).map(k=>'<button data-act="entr" data-id="'+p.id+'" data-v="'+k+'" aria-pressed="'+(p.entr===k)+'"'+(k===conseilEntr(p)?' class="conseil"':'')+' title="'+esc((k===conseilEntr(p)?'Conseillé. ':'')+AIDE[k]+(k!=='repos'&&p[k]>=p.cap[k]?' Plafond atteint.':''))+'"'+(k!=='repos'&&p[k]>=p.cap[k]?' disabled data-max="1"':'')+'>'+(k==='repos'?'Rep.':ENTR[k].court)+(k!=='repos'&&p[k]>=p.cap[k]?'<small>MAX</small>':'')+'</button>').join('')+'</div>';
  }
  return'<div class="lj'+(out?' out':'')+(tit&&mode==='equipe'?' tit':'')+(p.leg?' leg':'')+'"><button class="lj-img '+cad(p)+'" data-act="fiche" data-id="'+p.id+'" style="--c:'+moi.couleur+'" aria-label="Fiche de '+esc(p.nom)+'"><img alt="" src="'+img(p.race,p.tete)+'"><span>'+POSTES[p.poste].court+'</span></button>'
    +'<div class="lj-c"><button class="nom" data-act="fiche" data-id="'+p.id+'">'+esc(p.nom)+'</button>'+pastillePlace(p,mode)+'<span class="age"'+aide(etapeAge(p.age||25)[1]+' : '+etapeAge(p.age||25)[2]+'.')+'>'+ageCourt(p)+'</span>'
    +'<div class="lj-s">'+vp+st('FOR','f')+st('VIT','v')+st('PAS','t')+st('MAI','mn')+'<span'+aide('Spécialité '+SPECIALITES[p.race].nom+' : '+SPECIALITES[p.race].desc)+'>SPÉ <b>'+(p.sp||0)+'</b></span><span class="fo '+(p.forme>=65?'b':p.forme>=40?'m':'f')+'"'+aide(AIDE.Forme)+'>FORME <b>'+Math.round(p.forme)+'</b></span></div>'
    +'<div class="lj-f"'+aide(AIDE.Forme)+'><i class="'+(p.forme>=65?'b':p.forme>=40?'m':'f')+'" style="width:'+Math.round(p.forme)+'%"></i></div>'
    +'<div class="puces">'+pucesC(p)+pucesCarriere(p)+pucesCache(p)+'</div></div><div class="lj-d">'+d+'</div></div>';
}
function resumeEtats(T){
  const{tit}=onzeDe(T);const actifs=etatsDe(T,tit);const n=compterPostes(T.id===0?T.joueurs.filter(p=>dispo(p)&&p.titulaire):tit);
  return'<div class="equilibre">'+POSTE_IDS.map(po=>'<div class="'+(n[po]?'':'manque')+'"><b>'+n[po]+'</b><span>'+POSTES[po].pl+'</span></div>').join('')+'</div>'
    +'<div class="etats">'+(actifs.length?actifs.map(e=>'<span class="etat'+(e.mal?' mal':'')+'"'+aide(e.nom+' : '+e.effet+'. Condition : '+e.cond+'.')+'>'+e.nom+'</span>').join(''):'<span class="note" style="margin:0">Aucun bonus d\'équipe actif.</span>')+'</div>';
}
function ongletEquipe(){
  const moi=moiT();const{tit,reste}=onzeDe(moi);const out=moi.joueurs.filter(p=>!dispo(p));
  const marques=moi.joueurs.filter(p=>dispo(p)&&p.titulaire).length,valides=moi.joueurs.filter(dispo).length;
  let h='<section class="bloc"><div class="panneau compact">'+resumeEtats(moi)+'<div class="ligne-boutons"><button class="discret or" data-act="auto">Composition auto</button><button class="discret" data-act="guide" data-v="compo">Synergies et conseils</button></div></div>';
  const choisis=moi.joueurs.filter(p=>dispo(p)&&p.titulaire).sort((a,b)=>POSTE_IDS.indexOf(a.poste)-POSTE_IDS.indexOf(b.poste));
  const autos=tit.filter(p=>!p.titulaire);const banc=autos.concat(reste);
  h+='<p class="soustitre">Titulaires · '+choisis.length+' sur '+NB_TIT+'</p>'+choisis.map(p=>ligneJ(p,'equipe',0)).join('');
  for(let k=choisis.length;k<NB_TIT;k++){const a=autos[k-choisis.length];h+='<div class="place-libre"><b>Place libre</b><span>'+(a?'Si vous ne choisissez personne, <b>'+esc(a.nom)+'</b> ('+a.poste.toLowerCase()+') entrera. Touchez « Titulaire » sur un joueur du banc.':'Plus personne de disponible : un stagiaire très faible jouera. <button class="lien" data-act="pret">Emprunter un joueur pour ce match</button>')+'</span></div>'}
  if(banc.length)h+='<p class="soustitre">Banc, dans l\'ordre d\'entrée</p>'+banc.map((p,i)=>ligneJ(p,'equipe',i+1,banc.length)).join('');
  if(out.length)h+='<p class="soustitre">Indisponibles</p>'+out.map(p=>ligneJ(p,'equipe',0,0)).join('');
  if(S.phase==='saison'){
    if(valides<NB_TIT)h+='<p class="note alerte">Moins de 7 joueurs disponibles : des stagiaires compléteront. <button class="discret or" data-act="pret">Prêt d\'urgence</button></p>';

  }
  return h+'</section>';
}
function ongletEntr(){
  const moi=moiT();
  let h='<section class="bloc"><div class="panneau compact"><div class="ligne-boutons"><span class="t" style="margin:0">Tous :</span>'+Object.keys(ENTR).map(k=>'<button class="discret" data-act="entr-tous" data-v="'+k+'">'+(k==='repos'?'Repos':ENTR[k].court)+'</button>').join('')+'</div>'
    +'<button class="discret or" data-act="repos-fatigues" style="margin-top:8px">Reposer les joueurs sous 55 de forme</button><p class="note" style="margin:6px 0 0"><b>Repos</b> : la forme remonte. <b>FOR, VIT, PAS, MAI, SPÉ</b> : la note progresse, mais le joueur se fatigue. Règle simple : sous 55 de forme, repos. Le choix est gardé d\'une semaine à l\'autre.</p></div>';
  h+=moi.joueurs.slice().sort((a,b)=>POSTE_IDS.indexOf(a.poste)-POSTE_IDS.indexOf(b.poste)).map(p=>ligneJ(p,'entr')).join('');
  return h+'</section>';
}
function vueVestiaire(){
  const inter=S.phase==='inter';
  const tabs=inter?[['inter','Intersaison',(S.inter&&S.inter.arrivees&&S.inter.arrivees.length)||''],['equipe','Équipe']]:[['match','Match',S.evt?'!':''],['equipe','Équipe'],['entr','Entraînement']];
  if(!tabs.some(t=>t[0]===sous.vestiaire))sous.vestiaire=tabs[0][0];
  let h=barreSous('vestiaire',tabs);
  if(sous.vestiaire==='inter')h+=alertesVestiaire()+blocInter();
  else if(sous.vestiaire==='match')h+=alertesVestiaire()+ongletMatch();
  else if(sous.vestiaire==='equipe')h+=ongletEquipe();
  else h+=ongletEntr();
  if(!inter)h+='<div class="barre-jouer"><button class="gros" data-act="jouer">Jouer la journée '+(S.jour+1)+'</button></div>';
  return h;
}
function vueClub(){
  const tabs=[['finances','Finances'],['stade','Stade'],['staff','Staff'],['options','Options']];
  if(!tabs.some(t=>t[0]===sous.club))sous.club='finances';
  const tout=vueClubComplet();
  const g={finances:/Trésorerie|Ferveur/,stade:/stade/,staff:/Staff|Sponsor/,options:/Apparence/}[sous.club];
  let h=barreSous('club',tabs)+sections(tout,g);
  if(sous.club==='options')h+='<section class="bloc"><h2>Partie</h2><div class="panneau"><div class="ligne-boutons"><button class="discret or" data-act="titre">Écran titre</button><button class="discret" data-act="exporter" data-v="'+partieId+'">Exporter ce club</button><button class="discret danger" data-act="suppr" data-v="'+partieId+'">Supprimer ce club</button></div><p class="note">Votre club est sauvegardé automatiquement sur cet appareil, à chaque action. L\'écran titre permet de changer d\'équipe ou d\'en fonder une nouvelle.</p></div></section>';
  return h;
}
function vueLigue(){
  const tabs=[['classement','Classement'],['coupe','Coupe'],['adversaires','Adversaires'],['calendrier','Calendrier']];
  if(S.phase!=='saison'&&sous.ligue==='calendrier')sous.ligue='classement';
  const t=S.phase==='saison'?tabs:tabs.slice(0,3);
  const g={classement:/Classement/,coupe:/Coupe du Gourdin/,adversaires:/De qui/,calendrier:/calendrier/}[sous.ligue];
  return barreSous('ligue',t)+sections(vueLigueComplet(),g);
}
function vueGuide(){
  const ids=new Set(etatsDe(moiT(),onzeDe(moiT()).tit).map(e=>e.id));
  const sec=(t,body,open)=>'<details class="regles"'+(open?' open':'')+'><summary>'+t+'</summary>'+body+'</details>';
  return'<div class="voile haut" data-act="voile"><div class="fiche guide" role="dialog" aria-label="Guide"><h2>Guide de Wood Bowl</h2>'
    +sec('Monter au sommet : divisions, coupe, carrière','<ul>'
      +'<li><b>Quatre divisions</b><span>Ligue des Tavernes, des Comtés, des Royaumes, puis le Grand Bol de Bois. Les 2 premiers montent, le dernier descend. Plus haut : adversaires plus forts, meilleurs joueurs au marché, recettes plus grosses.</span></li>'
      +'<li><b>La Coupe du Gourdin</b><span>À élimination directe, avec 2 invités d\'autres divisions. Les tours se jouent juste après les journées 3, 6 et 9 : vos joueurs enchaînent deux matchs. Vous pouvez faire tourner l\'effectif.</span></li>'
      +'<li><b>L\'âge</b><span>Jusqu\'à 22 ans, un joueur progresse plus vite. Vers 28 ans, moins. Dès 30 ans, il perd quelques points chaque été, surtout en vitesse. Vers 32-35 ans, il annonce sa dernière saison puis prend sa retraite, avec un jubilé.</span></li>'
      +'<li><b>Le parrainage</b><span>Un ancien (29 ans et plus) aide un jeune (22 ans et moins) du même poste : le jeune gagne souvent un point de plus à l\'entraînement.</span></li>'
      +'<li><b>Le profil caché</b><span>Mental, régularité et robustesse existent dès le début et comptent en match, mais vous ne les voyez qu\'en montant : le mental en Ligue des Comtés, la régularité en Ligue des Royaumes, la robustesse au Grand Bol de Bois.</span></li></ul>'
      +'<h4>Les cadres des portraits</h4><div class="legende-cadres">'+CADRES.map(c=>'<span><i class="mini-img cad-'+c.k+'"></i>'+c.nom+'<small>'+(c.min?'dès '+c.min:'moins de 48')+'</small></span>').join('')+'</div>'
      +'<p class="note">Le cadre suit <b>toujours</b> la valeur au poste. Seules les légendes ont leur propre cadre doré. Une petite pierre au coin du portrait signale en plus : <b>◆ améthyste</b>, un spécialiste de son peuple (niveau Expert ou plus) ; <b>◆ émeraude</b>, un atout caché révélé ; <b>? brume</b>, un joueur qui cache quelque chose d\'exceptionnel, à découvrir en montant.</p>'
      +'<div class="legende-cadres">'+[['cad-leg','Légende'],['cad-argent pierre pierre-spe','Améthyste'],['cad-argent pierre pierre-atout','Émeraude'],['cad-argent pierre pierre-brume','Brume']].map(([k,n])=>'<span><i class="mini-img '+k+'"></i>'+n+'</span>').join('')+'</div>')
    +sec('Comment se gagne un match','<ol class="etapes">'
      +'<li><b>8 temps forts</b><span>Un match se joue en 8 temps forts. À chacun, une équipe a le ballon et tente sa chance, puis chaque camp peut cogner.</span></li>'
      +'<li><b>Qui a le ballon ?</b><span>Additionnez attaque et défense de chaque camp. À 60 contre 40, vous avez le ballon 6 fois sur 10.</span></li>'
      +'<li><b>L\'attaque contre la défense</b><span>On tire la forme du jour de chaque camp (entre ×0,55 et ×1,45). Si votre attaque dépasse leur défense de 18 % : <b>but</b>. Un peu en dessous : <b>occasion manquée</b>.</span></li>'
      +'<li><b>Les coups</b><span>Plus la consigne est brutale et vos cogneurs forts, plus l\'adversaire perd de joueurs. Un blessé ou un expulsé n\'est remplacé que s\'il reste un remplaçant : sinon on joue à 4.</span></li>'
      +'<li><b>Les coups du sort</b><span>Penalty (pot-de-vin), but en douce (fourbes, gobelins), arme secrète gobeline, assassinat elfe noir, esquive elfe, nain increvable.</span></li></ol>'
      +'<h4>D\'où viennent l\'attaque et la défense ?</h4><ul>'
      +'<li><b>Les joueurs</b><span>Sept places sur le terrain : 1 passeur, 2 coureurs, 2 trois-quarts, 2 cogneurs. Coureurs : attaque (vitesse, puis mains). Passeur : attaque (passe surtout). Cogneurs : défense (force surtout). Trois-quarts : un peu des deux (force et vitesse). Un joueur peut occuper n\'importe quelle place : il y joue avec les notes que cette place demande. Chaque note est multipliée par la forme : un joueur à 40 de forme perd 12 %.</span></li>'
      +'<li><b>Les bonus qui multiplient</b><span>États d\'équipe (de −10 % à +8 %), plan de jeu (jusqu\'à +10 %), contrer le plan adverse (+7 %), jouer à domicile (+5 %), consigne prudente (−6 % en attaque, +7 % en défense), suivre le conseil du stratège (+1 à +6 %), peuples (nains en défense, orques et humains partout).</span></li>'
      +'<li><b>Le marquage</b><span>Le joueur marqué perd 12 à 28 % d\'efficacité selon votre stratège ; votre attaque perd 3 %.</span></li></ul>'
      +'<p class="note">Le bouton « Comprendre et améliorer mes chances », dans Vestiaire › Match, rejoue votre prochain match des centaines de fois et montre l\'effet de chaque réglage.</p>',guide==='calcul')
    +sec('Conseils de composition','<ul>'
      +'<li><b>La base</b><span>2 cogneurs, 2 coureurs, 1 passeur. Sans l\'un des trois postes : malus de 8 à 10 %.</span></li>'
      +'<li><b>Sang pur</b><span>7 titulaires du même peuple : +8 % partout, mais toutes les faiblesses du peuple.</span></li>'
      +'<li><b>Alliances</b><span>Humain + nain + elfe : Vieille alliance et Pacte de l\'Ouest. Orque + gobelin + elfe noir : la Horde et les Coups tordus.</span></li>'
      +'<li><b>Joyeux bazar</b><span>4 peuples différents : +7 % en attaque. Glissez un humain pour calmer les rivalités.</span></li>'
      +'<li><b>Rivalités</b><span>Elfe et elfe noir, nain et orque, nain et gobelin se gênent. Un humain médiateur atténue.</span></li>'
      +'<li><b>Formations</b><span>3 cogneurs pour le Mur défensif, 3 coureurs pour le Jeu au sol, 2 passeurs pour le Jeu aérien, 3 trois-quarts pour un peu de tout.</span></li></ul>',guide==='compo')
    +sec('Tous les états d\'équipe','<ul>'+ETATS.map(e=>'<li class="'+(ids.has(e.id)?'actif':'')+'"><b>'+e.nom+(ids.has(e.id)?' · actif':'')+'</b><span>'+e.cond+' : '+e.effet+'.</span></li>').join('')+'</ul>')
    +sec('Peuples et spécialités','<ul>'+RACE_IDS.map(k=>'<li><b>'+RACES[k].pl+'</b><span>'+esc(ficheRace(k).replace(RACES[k].pl+'. ',''))+'</span></li>').join('')+'</ul>')
    +sec('Plans de jeu : qui bat qui','<ul>'+TACTIQUE_IDS.map(k=>'<li><b>'+TACTIQUES[k].nom+'</b><span>'+esc(TACTIQUES[k].desc)+(TACTIQUES[k].bat?' Bat le '+TACTIQUES[TACTIQUES[k].bat].nom.toLowerCase()+'.':'')+'</span></li>').join('')+'</ul><p class="note">Celui qui contre le plan adverse gagne +7 % en attaque et en défense.</p>',guide==='plans')
    +sec('Les postes','<ul>'+POSTE_IDS.map(po=>'<li><b>'+po+'</b><span>'+POSTES[po].role+'</span></li>').join('')+'</ul>')
    +'<div class="actions"><button class="discret or" data-act="tuto" data-v="go">Revoir la visite guidée</button><button class="gros" data-act="fermer-guide">Fermer</button></div></div></div>';
}



/* ================= PRONOSTIC : vos chances, et ce qui les fait bouger ================= */
let legVue=null,prono=false,pronoCache={cle:null,r:null},leviersCache={cle:null,r:null,calcul:false};
function clePronostic(){const moi=moiT();return JSON.stringify([S.saison,S.jour,S.choix,onzeDe(moi).tit.map(p=>p.id),moi.joueurs.map(p=>[p.entr,p.forme,p.blesse]),S.rapport&&S.rapport.niv,moi.or>=COUT_POT])}
function pronosticCourant(){const c=clePronostic();if(pronoCache.cle!==c)pronoCache={cle:c,r:pronostic(S,S.choix,300)};return pronoCache.r}
const pc=x=>Math.round(x*100)+' %';
function barreChances(r,grand){
  const v=Math.round(r.v*100),d=Math.round(r.d*100),n=100-v-d;
  return'<div class="chances'+(grand?' grand':'')+'"'+aide("Sur 300 matchs simulés avec le vrai moteur du jeu : la part de victoires, de nuls et de défaites. Changez un ordre, la barre se recalcule.")+'>'
    +'<div class="barre-ch"><i class="v" style="width:'+v+'%">'+(v>=12?v+' %':'')+'</i><i class="n" style="width:'+n+'%">'+(n>=12?n+' %':'')+'</i><i class="d" style="width:'+d+'%">'+(d>=12?d+' %':'')+'</i></div>'
    +'<div class="legende-ch"><span><b class="pv"></b>Victoire '+v+' %</span><span><b class="pn"></b>Nul '+n+' %</span><span><b class="pd"></b>Défaite '+d+' %</span></div></div>';
}
function blocChances(){
  const r=pronosticCourant();if(!r)return'';
  return'<div class="vos-chances"><div class="t-ch"><span class="t">Vos chances</span><span class="score-moy">Score moyen '+fr(r.bp.toFixed(1))+' – '+fr(r.bc.toFixed(1))+'</span></div>'+barreChances(r)
    +'<button class="discret or plein" data-act="prono">Comprendre et améliorer mes chances</button></div>';
}
function duelForces(lib,a,b,la,lb){
  const m=Math.max(a,b)*1.1,r=a/b;
  const verdict=r>=1.15?'net avantage pour vous':r>=1.02?'léger avantage pour vous':r>=.92?'très serré':r>=.8?'léger avantage pour eux':'net avantage pour eux';
  return'<div class="duel-f"><div class="lib">'+lib+' <small>'+verdict+'</small></div>'
    +'<div class="ligne-f"><span>'+la+'</span><div class="jf"><i class="moi" style="width:'+Math.round(a/m*100)+'%"></i></div><b>'+Math.round(a)+'</b></div>'
    +'<div class="ligne-f"><span>'+lb+'</span><div class="jf"><i class="eux" style="width:'+Math.round(b/m*100)+'%"></i></div><b>'+Math.round(b)+'</b></div></div>';
}
function vuePronostic(){
  const pm=prochainMatch(S);if(!pm)return'';
  const r=pronosticCourant(),f=rapportForces(S,S.choix),adv=pm.adv;
  const poss=Math.round((f.moi.att+f.moi.def)/(f.moi.att+f.moi.def+f.adv.att+f.adv.def)*10);
  let h='<div class="voile haut" data-act="voile"><div class="fiche prono-fiche" role="dialog" aria-label="Pronostic"><h2>Pronostic contre '+esc(adv.court)+'</h2>'
    +barreChances(r,true)
    +'<p class="note">Score moyen '+fr(r.bp.toFixed(1))+' – '+fr(r.bc.toFixed(1))+' · '+fr(r.bl.toFixed(1))+' blessé'+(r.bl>=1.5?'s':'')+' par match chez vous. '+(S.rapport?'Votre stratège devine en partie les choix secrets de l\'adversaire : le pronostic en tient compte.':'Sans stratège, les choix secrets de l\'adversaire (plan de jeu, consigne, arbitre) sont tirés au hasard : le pronostic est plus flou.')+'</p>'
    +'<h3>Le rapport de forces</h3>'
    +duelForces('Quand vous attaquez',f.moi.att,f.adv.def,'Votre attaque','Leur défense')
    +duelForces('Quand ils attaquent',f.moi.def,f.adv.att,'Votre défense','Leur attaque')
    +'<p class="note">Vous aurez le ballon environ <b>'+poss+' fois sur 10</b>. '+(f.moi.etats.length?'Vos bonus et malus d\'équipe : '+f.moi.etats.map(esc).join(', ')+'.':'Aucun bonus d\'équipe actif.')+' Les chiffres comprennent déjà le domicile, la consigne, le plan de jeu (sans le contre, qui dépend du plan adverse) et le marquage.</p>'
    +'<h3>Ce qui ferait bouger vos chances</h3>';
  const c=clePronostic();
  if(leviersCache.cle!==c){
    h+='<p class="calcul">Le stratège rejoue le match avec chaque réglage…</p>';
    if(!leviersCache.calcul){leviersCache.calcul=true;setTimeout(()=>{leviersCache={cle:c,r:leviersPronostic(S,S.choix,250),calcul:false};if(prono)rendre()},60)}
  }else{
    const L=leviersCache.r.leviers;
    h+='<p class="note">Chaque ligne change <b>un seul</b> réglage et rejoue 250 matchs. Touchez « Essayer » pour l\'appliquer.</p><div class="leviers">'
      +L.map((l,i)=>{const dv=Math.round(l.dv*100),cl=dv>=2?'plus':dv<=-2?'moins':'egal';
        return'<div class="levier '+cl+'"><div><b>'+esc(l.nom)+'</b><small>'+esc(l.groupe)+(Math.abs(l.dbl)>=.15?' · blessés '+(l.dbl>0?'+':'')+fr(l.dbl.toFixed(1)):'')+'</small></div><span class="dv">'+(dv>0?'+':'')+dv+'</span><span class="pv">'+pc(l.v)+'</span><button class="discret" data-act="levier" data-v="'+i+'">Essayer</button></div>'}).join('')
      +'</div><p class="note">Les écarts de 1 ou 2 points relèvent du hasard. Au-delà, le levier compte vraiment.</p>';
  }
  h+='<div class="actions"><button class="discret" data-act="guide" data-v="calcul">Comment se gagne un match ?</button><button class="gros" data-act="fermer-prono">Fermer</button></div></div></div>';
  return h;
}

/* ================= TUTORIEL : visite guidée ================= */
const TUTO=[
  {ch:'Le but du jeu',vue:'vestiaire',sous:['vestiaire','match'],cible:null,titre:'Bienvenue, manager !',texte:"Votre but : finir <b>premier de la ligue</b> au bout des 10 journées de la saison. Vous ne jouez pas les matchs : <b>vous les préparez</b>, puis le moteur les simule.<br>On gagne grâce à <b>trois choses</b> :<ol><li>une bonne équipe, <b>en forme</b> ;</li><li>de bons <b>ordres</b> avant chaque match ;</li><li>un club en bonne santé : <b>argent et staff</b>.</li></ol>Cette visite vous montre les trois, en deux minutes."},
  {ch:'Repères',vue:'vestiaire',sous:['vestiaire','match'],cible:'.entete',titre:'Le tableau de bord',texte:"En haut : votre <b>caisse</b> en pièces d'or (po), la <b>journée</b> et votre <b>rang</b>. Le bouton <b>?</b> ouvre le guide complet des règles, à tout moment. Les deux autres coupent la musique ou les bruitages."},
  {ch:'Clé n° 2 : les ordres',vue:'vestiaire',sous:['vestiaire','match'],cible:'.affiche',titre:'Le prochain match',texte:"Votre adversaire de la semaine, et s'il vient chez vous (jouer à domicile donne <b>+5 %</b>). « Observer cette équipe » montre ses joueurs. Un <b>stratège</b> (onglet Club) ajoute ici un rapport : il devine le plan adverse et marque ses conseils d'une étoile ★."},
  {ch:'Clé n° 2 : les ordres',vue:'vestiaire',sous:['vestiaire','match'],cible:'.vos-chances',titre:'Vos chances de gagner',texte:"Votre meilleur outil. Le jeu <b>rejoue le prochain match 300 fois</b> avec le vrai moteur : <b style=\"color:#3d7a1f\">vert</b> victoire, <b style=\"color:#9a7a00\">jaune</b> nul, <b style=\"color:#b3261e\">rouge</b> défaite.<br>La barre <b>se recalcule dès que vous changez un ordre</b> : tentez des choses et regardez-la bouger. Le bouton en dessous classe tous les réglages, du plus utile au plus nuisible."},
  {ch:'Clé n° 2 : les ordres',vue:'vestiaire',sous:['vestiaire','match'],cible:'.choix .seg',titre:'La consigne',texte:"<b>Prudent</b> : moins de blessés et de cartons chez vous, mais −6 % en attaque.<br><b>Normal</b> : l'équilibre.<br><b>Brutal</b> : vous cognez bien plus et l'adversaire perd des joueurs… mais l'arbitre sort ses cartons.<br>Brutal convient aux équipes de cogneurs, prudent aux équipes fragiles (elfes)."},
  {ch:'Clé n° 2 : les ordres',vue:'vestiaire',sous:['vestiaire','match'],cible:'.seg.tactiques',titre:'Le plan de jeu',texte:"Comme pierre-feuille-ciseaux : <b>chaque plan en bat un autre</b>. Si le vôtre contre celui de l'adversaire : <b>+7 %</b> en attaque et en défense.<br>Certains plans demandent des postes : le Jeu au sol veut 2 coureurs, le Jeu aérien un passeur. Sans stratège, « Équilibré » ne risque rien."},
  {ch:'Clé n° 1 : l\'équipe',vue:'vestiaire',sous:['vestiaire','equipe'],cible:'.panneau.compact',titre:'Vos sept titulaires',texte:"Sept joueurs jouent, sur 7 places : <b>1 passeur, 2 coureurs, 2 trois-quarts, 2 cogneurs</b>. L'entraîneur place chacun au mieux ; l'étiquette à côté du nom dit où il jouera. Il faut au moins un joueur de chaque métier, sinon −5 à −10 %.<br>Les pastilles <b>dorées</b> sont vos bonus d'équipe (même peuple, alliances…), les <b>rouges</b> vos malus (rivalités). « Composition auto » fait un choix sûr."},
  {ch:'Clé n° 1 : l\'équipe',vue:'vestiaire',sous:['vestiaire','equipe'],cible:'.lj',titre:'Lire un joueur',texte:"Chaque poste a sa note clé :<ul><li><b>Cogneur</b> : la force, pour la défense et les coups ;</li><li><b>Trois-quarts</b> : la force et la vitesse à parts égales, il dépanne partout ;</li><li><b>Coureur</b> : la vitesse puis les mains, pour marquer ;</li><li><b>Passeur</b> : la passe, pour lancer l'attaque.</li></ul>Touchez le portrait pour la carte complète. Touchez une pastille pour son explication."},
  {ch:'Clé n° 1 : l\'équipe',vue:'vestiaire',sous:['vestiaire','entr'],cible:'.entr-mini',titre:'La forme, le piège n° 1',texte:"La forme <b>multiplie tout</b> : un joueur à 40 de forme perd 12 % de ses notes et se blesse plus. Chaque match fatigue. Chaque semaine, choisissez pour chacun : <b>repos</b> (il récupère) ou une <b>note à travailler</b> (il progresse mais se fatigue). Alternez ! Le bouton marqué <b>★</b> est la note la plus utile à travailler pour son poste : ▲▲ signale la note principale, ▲ la secondaire, la note grisée compte peu."},
  {ch:'Jouer',vue:'vestiaire',sous:['vestiaire','match'],cible:'.barre-jouer',titre:'Lancer la journée',texte:"Quand tout est prêt, lancez la journée. Le match est simulé en 8 temps forts : le camp le plus fort a le ballon plus souvent, puis son attaque affronte la défense adverse, avec une part de chance. Vous arrivez ensuite dans la gazette."},
  {ch:'Après le match',vue:'vestiaire',sous:['vestiaire','match'],cible:'nav.onglets button[data-v="gazette"]',titre:'La gazette',texte:"« L'Écho du Gourdin » raconte chaque journée. Il se <b>feuillette</b> : touchez une rubrique en haut, utilisez les flèches, ou <b>glissez le doigt</b> pour tourner les pages. La page « L'analyse » explique <b>pourquoi</b> vous avez gagné ou perdu : lisez-la, c'est là qu'on apprend."},
  {ch:'Clé n° 1 : l\'équipe',vue:'vestiaire',sous:['vestiaire','match'],cible:'nav.onglets button[data-v="marche"]',titre:'Le marché',texte:"Pour recruter. Les pastilles indiquent si la recrue <b>s'entend avec vos joueurs</b> (alliance) ou non (rivalité). Fauché ? Les <b>jeunes du pays</b> sont gratuits et progressent vite."},
  {ch:'Clé n° 3 : le club',vue:'club',sous:['club','finances'],cible:'.caisse',titre:"L'argent",texte:"Salaires et staff coûtent <b>à chaque match</b>. Billetterie, droits télé et sponsor rapportent. Dans le rouge, les huissiers bloquent les achats.<br>Dans l'onglet Club : signez un <b>sponsor</b>, embauchez un <b>stratège</b> (conseils, pronostic plus précis), un <b>préparateur</b> (progrès, récupération) ou un <b>chineur</b> (meilleur marché)."},
  {ch:'Votre routine',vue:'vestiaire',sous:['vestiaire','match'],cible:null,titre:'À chaque journée, en cinq gestes',texte:"<ol><li><b>Entraînement</b> : reposez les joueurs fatigués.</li><li><b>Équipe</b> : sept titulaires en forme, chacun à sa place si possible.</li><li><b>Ordres</b> : consigne et plan de jeu, en regardant la barre de chances.</li><li><b>Comprendre et améliorer</b> : essayez les meilleurs leviers.</li><li><b>Jouez</b>, puis lisez l'analyse dans la gazette.</li></ol>Toutes les règles sont dans le <b>?</b>, dont « Comment se gagne un match ». Bonne saison !"}
];
let tuto=-1;
function tutoAller(i){
  tuto=i;if(i<0||i>=TUTO.length){tuto=-1;try{localStorage.setItem('woodbowl-tuto','vu')}catch(e){}rendre();return}
  const t=TUTO[i];vue=t.vue;if(t.sous)sous[t.sous[0]]=t.sous[1];fiche=null;clubVu=null;offre=null;guide=false;rendre();
}
function tutoPlacer(){
  const t=TUTO[tuto];if(!t)return;const bx=document.querySelector('.tuto-bulle'),hl=document.querySelector('.tuto-halo');if(!bx)return;
  const el=t.cible&&document.querySelector(t.cible);
  if(el){el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();
    Object.assign(hl.style,{display:'block',left:(r.left-6)+'px',top:(r.top-6)+'px',width:(r.width+12)+'px',height:(r.height+12)+'px'});
    const bas=r.top+r.height/2<innerHeight/2;bx.style.top=bas?Math.min(innerHeight-bx.offsetHeight-12,r.bottom+14)+'px':Math.max(12,r.top-bx.offsetHeight-14)+'px';}
  else{hl.style.display='none';bx.style.top=Math.max(12,(innerHeight-bx.offsetHeight)/2)+'px'}
}
function vueTuto(){const t=TUTO[tuto];
  return'<div class="tuto-voile"></div><div class="tuto-halo"></div><div class="tuto-bulle" role="dialog" aria-label="Tutoriel"><div class="tuto-etape"><span>'+esc(t.ch)+'</span><span>'+(tuto+1)+' / '+TUTO.length+'</span></div><div class="tuto-prog"><i style="width:'+Math.round((tuto+1)/TUTO.length*100)+'%"></i></div><h3>'+esc(t.titre)+'</h3><div class="tuto-texte">'+t.texte+'</div>'
    +'<div class="tuto-btns"><button class="discret" data-act="tuto" data-v="fin">Passer</button>'+(tuto>0?'<button class="discret" data-act="tuto" data-v="prec">Précédent</button>':'')+'<button class="discret or" data-act="tuto" data-v="suiv">'+(tuto===TUTO.length-1?'C\'est parti !':'Suivant')+'</button></div></div>';
}

const ONGLETS=[['vestiaire','Vestiaire'],['gazette','Gazette'],['ligue','Ligue'],['legendes','Légendes'],['marche','Marché'],['club','Club']];
function rendre(){cacherBulle();
  if(!S){$app.innerHTML=({titre:vueTitre,solo:vueSolo,nouvelle:vueAccueil,multi:vueMulti,reglages:vueReglages}[ecran]||vueTitre)()+(message?vueMessage():'')+(confirmation?vueConfirm():'');return}
  /* en ligue entre amis (S.enLigue), on garde tous les écrans du solo ; ligue-ui.js remplace le marché par les enchères et ajoute un bandeau */
  const EL=!!S.enLigue&&!!window.LigueSolo;
  let v={vestiaire:vueVestiaire,gazette:vueGazette,ligue:vueLigue,legendes:vueLegendes,marche:EL?LigueSolo.marche:vueMarche,club:vueClub}[vue]();
  if(EL)v=LigueSolo.bandeau()+LigueSolo.habiller(v);
  $app.innerHTML=entete()+v+'<nav class="onglets" aria-label="Onglets"><div>'+ONGLETS.map(o=>'<button data-act="vue" data-v="'+o[0]+'" '+(vue===o[0]?'aria-current="page"':'')+'>'+svg(o[0])+o[1]+'</button>').join('')+'</div></nav>'
    +(offre?vueOffre():fiche!==null?vueFiche():clubVu!==null?vueClubAdv():tiroir?vueTiroir():pretVu?vuePret():'')+(legVue?vueFicheLegende():'')+(prono?vuePronostic():'')+(guide?vueGuide():'')+(message?vueMessage():'')+(confirmation?vueConfirm():'')+(tuto>=0?vueTuto():'')+(deuil?vueDeuil():'');
  tombe=false;
  if(tuto>=0)requestAnimationFrame(tutoPlacer);
  const sel=document.querySelector('.sommaire [aria-selected="true"]');if(sel){const so=sel.parentNode;so.scrollLeft=sel.offsetLeft-so.clientWidth/2+sel.offsetWidth/2}
}
const AMB={vestiaire:'vestiaire',marche:'club',gazette:'gazette',ligue:'club',legendes:'gazette',club:'club'};

/* ---------- Actions ---------- */
function preparerOpts(){}
function demander(titre,texte,ok,fn){confirmation={titre,texte,ok,fn};Son.jouer('carte')}
function informer(titre,texte,son){message={titre,texte};Son.jouer(son||'carte')}
function deplacer(T,id,sens){const banc=onzeDe(T).reste;const i=banc.findIndex(p=>p.id===id),j=i+sens;if(i<0||j<0||j>=banc.length)return;const a=T.joueurs.indexOf(banc[i]),b=T.joueurs.indexOf(banc[j]);[T.joueurs[a],T.joueurs[b]]=[T.joueurs[b],T.joueurs[a]]}
function lancerJournee(){
  Son.jouer('tambour');setTimeout(()=>Son.jouer('sifflet'),700);setTimeout(()=>Son.jouer('foule'),1200);
  const g=jouerJournee(S);vue='gazette';numero=-1;pageG=0;tombe=true;window.scrollTo(0,0);Son.ambiance('gazette');
  if((S.deuils||[]).some(d=>!d.vu))setTimeout(()=>{deuilSuivant();rendre()},1600);
  clearTimeout(finJournee);finJournee=setTimeout(()=>{Son.jouer('journal');setTimeout(()=>Son.jouer(g&&g.victoire>0?'fanfare':g&&g.victoire<0?'triste':'foule'),350)},2300);
}
function action(b,ev){
  const act=b.dataset.act,v=b.dataset.v,id=Number(b.dataset.id);const moi=S&&moiT();
  /* en ligue, ce qui touche à la caisse ou à l'effectif passe par le serveur */
  if(S&&S.enLigue&&window.LigueSolo){const r=LigueSolo.action(act,v,id,b);if(r!==undefined)return r}
  switch(act){
    case'voile':if(ev.target.closest('.fiche')||ev.target.closest('.tiroir'))return false;if(guide)guide=false;else{fiche=null;clubVu=null;offre=null;prono=false;legVue=null;tiroir=false;pretVu=false}break;
    case'son':Son.basculer(v);break;
    case'mode-mus':Son.changerMode(v,S?AMB[vue]:'titre');break;
    case'peuple':accueil.nom=document.getElementById('club').value;accueil.race=v;break;
    case'creer':{const n=(document.getElementById('club').value||'').trim()||'Les Gros Bras de Varoque';S=courant(nouvellePartie(n.slice(0,26),accueil.race));partieId=nouvelId();accueil={nom:'',race:'humain'};sauver();Son.ambiance(AMB[vue]||'vestiaire');let dejaVu=false;try{dejaVu=localStorage.getItem('woodbowl-tuto')==='vu'}catch(e){}if(!dejaVu)setTimeout(()=>tutoAller(0),300);vue='vestiaire';Son.jouer('fanfare');break}
    case'vue':vue=v;numero=-1;fiche=null;clubVu=null;offre=null;window.scrollTo(0,0);Son.ambiance(AMB[v]);break;
    case'consigne':S.choix.consigne=v;break;
    case'tactique':S.choix.tactique=v;break;
    case'pot':S.choix.pot=v==='1';if(S.choix.pot)Son.jouer('piece');break;
    case'titulaire':{const p=moi.joueurs.find(p=>p.id===id);if(!p||!dispo(p))break;
      if(p.titulaire){/* le retirer : il passe au banc, sa place reste libre jusqu'à ce que vous choisissiez */
        p.titulaire=false;p.auBanc=true}
      else{const choisis=moi.joueurs.filter(x=>dispo(x)&&x.titulaire);
        if(choisis.length>=NB_TIT){informer('Déjà 7 titulaires','Retirez d\'abord un titulaire (touchez son bouton « Titulaire »), puis choisissez qui le remplace.');break}
        p.titulaire=true;delete p.auBanc}
      Son.jouer('bascule');break}
    case'monter':deplacer(moi,id,-1);break;
    case'descendre':deplacer(moi,id,1);break;
    case'entr':{const p=moi.joueurs.find(p=>p.id===id);if(p)p.entr=v;break}
    case'entr-tous':moi.joueurs.forEach(p=>p.entr=(v!=='repos'&&p[v]>=p.cap[v])?conseilEntr(p):v);break;
    case'repos-fatigues':moi.joueurs.forEach(p=>{if(p.forme<55)p.entr='repos'});Son.jouer('bascule');break;
    case'vue-club':vue='club';sous.club=v;numero=-1;fiche=null;clubVu=null;window.scrollTo(0,0);Son.ambiance(AMB.club);break;
    case'jouer':lancerJournee();return true;
    case'numero':numero=Number(v);pageG=0;Son.jouer('journal');break;
    case'pageG':tournerPage(Number(v));break;
    case'lancer':demander('Lancer la saison '+(S.saison+1)+' ?','Les échanges se ferment et les nouveaux contrats prennent effet.'+(S.sponsor?'':' <b>Vous n\'avez pas choisi de sponsor</b> : vous jouerez la saison sans.'),'Lancer la saison',()=>{nouvelleSaison(S);vue='vestiaire';Son.jouer('fanfare')});break;
    case'fiche':fiche=id;Son.jouer('carte');break;
    case'club':clubVu=id;fiche=null;Son.jouer('carte');break;
    case'fermer':if(legVue){legVue=null;break}if(pretVu){pretVu=false;break}if(offre)offre=null;else if(fiche!==null)fiche=null;else if(tiroir)tiroir=false;else clubVu=null;break;
    case'tiroir':tiroir=true;break;
    case'pret':pretVu=true;break;
    case'emprunter':{const err=emprunterJoueur(S,id);if(err)informer('Prêt impossible',esc(err));else{Son.jouer('carte');if(!besoinPret(S))pretVu=false}sauver();break}
    case'deuil-ok':deuil.vu=true;deuilSuivant();sauver();break;
    case'deuil-fun':if(moi.or>=10){moi.or-=10;moi.pop=clamp(moi.pop+3,5,100);deuil.vu=true;deuil.fun=true;informer('Funérailles','Tout le club suit le cortège. Les supporters ont apprécié le geste : +3 de ferveur.','triste')}deuilSuivant();sauver();break;
    case'coupe-rot':S.choix.coupeRot=v==='1';sauver();break;
    case'oui':{const f=confirmation&&confirmation.fn;confirmation=null;if(f)f();Son.jouer('confirme');break}
    case'non':confirmation=null;break;
    case'ok':message=null;break;
    case'renommer':{const p=moi.joueurs.find(p=>p.id===fiche);const n=(document.getElementById('renom').value||'').trim();if(p&&n){if(S._sexe){delete S._sexe[p.nom];S._sexe[n.slice(0,28)]=p.sexe||'m'}p.nom=n.slice(0,28)}fiche=null;break}
    case'soigner':{const p=moi.joueurs.find(p=>p.id===fiche);if(p)demander('Payer le guérisseur ?',esc(p.nom)+' reviendra un match plus tôt. Coût : '+COUT_SOIN+' po.','Payer '+COUT_SOIN+' po',()=>{if(p.blesse>0&&moi.or>=COUT_SOIN){moi.or-=COUT_SOIN;p.blesse--;Son.jouer('piece')}});break}
    case'renvoyer':{const p=moi.joueurs.find(p=>p.id===fiche);if(p&&!p.pret)demander('Renvoyer '+p.nom+' ?',(p.sexe==='f'?'Elle':'Il')+' quitte le club définitivement. Vous récupérez '+Math.round(valeur(p)*.4)+' po et économisez '+p.sal+' po par match.','Renvoyer',()=>{if(moi.joueurs.length>MIN_EFFECTIF){moi.or+=Math.round(valeur(p)*.4);moi.joueurs=moi.joueurs.filter(x=>x!==p);fiche=null}});break}
    case'acheter':{const p=S.marche.find(p=>p.id===id);if(!p)break;const prix=prixMarche(S,p);
      demander('Recruter '+p.nom+' ?',p.poste+' '+RACES[p.race].nom.toLowerCase()+'. Prix : <b>'+(prix?prix+' po':'gratuit')+'</b>, puis '+(p.gratuit?p.sal:salaire(p))+' po par match. '+(p.sexe==='f'?'Elle arrive':'Il arrive')+' tout de suite et s\'entraîne avant le prochain match.',(prix?'Recruter pour '+prix+' po':'Signer gratuitement'),()=>{
        if((!prix||moi.or>=prix)&&moi.joueurs.length<MAX_EFFECTIF&&(p.gratuit||!huissiers(S))){moi.or-=prix;delete p.vu;delete p.coeur;p.titulaire=false;if(!p.gratuit)p.sal=salaire(p);S.marche=S.marche.filter(x=>x!==p);moi.joueurs.push(p);varierTetes(moi,p);Son.jouer('piece');
          informer('Bienvenue au club','Ses vraies notes : force '+p.f+', vitesse '+p.v+', passe '+p.t+', mains '+p.mn+'. Potentiel '+etoiles(etoilesPot(marge(p)))+'.','piece')}});break}
    case'filtre':filtre=v;break;
    case'sous':{const[a,b2]=v.split(':');sous[a]=b2;window.scrollTo(0,0);break}
    case'guide':guide=v||true;Son.jouer('carte');break;
    case'fermer-guide':guide=false;break;
    case'prono':prono=true;guide=false;Son.jouer('carte');break;
    case'fermer-prono':prono=false;break;
    case'levier':{const l=leviersCache.r&&leviersCache.r.leviers[Number(v)];if(l&&l.app){if(l.app.compo)choisirTitulaires(moiT());else Object.assign(S.choix,l.app);if(S.choix.pot&&(moiT().or<COUT_POT||huissiers(S)))S.choix.pot=false;Son.jouer('bascule')}break}
    case'tuto':if(v==='suiv')tutoAller(tuto+1);else if(v==='prec')tutoAller(tuto-1);else if(v==='go'){guide=false;tutoAller(0)}else tutoAller(-1);return true;
    case'auto':choisirTitulaires(moi);Son.jouer('bascule');break;
    case'stade':{const B=STADE[v],n=nivStade(moi,v);demander('Construire : '+B.niv[n+1]+' ?',esc(B.effet(n+1))+'. Coût : <b>'+B.cout[n]+' po</b>, définitif.','Payer '+B.cout[n]+' po',()=>{const r=ameliorerStade(S,v);if(r)informer('Travaux impossibles',esc(r),'refus');else{Son.jouer('piece');informer('Travaux terminés',esc(B.niv[n+1])+' est prêt'+(v==='tribunes'||v==='buvette'?'e':'')+'. '+esc(B.effet(n+1))+'.','fanfare')}});break}
    case'arrivee':{const a=S.inter.arrivees[id];if(!a)break;const oui=v==='1';
      const go=()=>{const r=reponseArrivee(S,id,oui);if(r)informer(oui||a.k==='depart'?'C\'est réglé':'Refus',esc(r),oui?'piece':'refus')};
      if(oui||a.k==='depart')demander(a.k==='depart'?(oui?'Laisser partir '+a.p.nom+' ?':'Retenir '+a.p.nom+' ?'):'Engager '+a.p.nom+' ?',a.k==='depart'?(oui?'Il quitte le club définitivement. Vous recevez '+a.indem+' po.':'Il reste, mais commencera la saison fatigué et grognon.'):(a.prime?'Prime : <b>'+a.prime+' po</b>. ':'')+''+(a.p.sexe==='f'?'Elle':'Il')+' arrive tout de suite dans votre effectif.',oui?'Confirmer':'Le retenir',go);else go();break}
    case'filtreR':filtreR=v;break;
    case'evt':{const r=resoudreEvenement(S,v==='1');if(r)informer(v==='1'?'C\'est fait':'Rebondissement',esc(r),'piece');else Son.jouer('refus');preparerOpts();break}
    case'banque':demander('Emprunter '+PRET.montant+' po ?','Vous recevez '+PRET.montant+' po tout de suite, puis '+PRET.parMatch+' po sont prélevés à chaque match pendant '+PRET.nb+' matchs. Total remboursé : '+PRET.parMatch*PRET.nb+' po.','Emprunter',()=>{if(emprunter(S))Son.jouer('piece')});break;
    case'theme':appliquerTheme(v);break;
    case'sponsor':{const s=sponsorDe(v);demander('Signer avec '+s.nom+' ?',esc(s.desc)+' Le contrat court jusqu\'à la fin de la saison, sans retour possible.','Signer',()=>{S.sponsor=v;Son.jouer('piece')});break}
    case'embaucher':{const c=S.candidats[v][id];if(!c)break;const cur=moi.staff[v];
      demander('Embaucher '+c.nom+' ?',ROLES[v].nom+' '+NIV[c.niv].toLowerCase()+'. Prime d\'embauche : <b>'+c.prime+' po</b>, puis '+c.sal+' po par match.'+(cur?' Il remplace '+esc(cur.nom)+', qui part sans indemnité.':''),'Embaucher pour '+c.prime+' po',()=>{
        if(moi.or>=c.prime&&!huissiers(S)){moi.or-=c.prime;moi.staff[v]=c;S.candidats[v]=S.candidats[v].filter(x=>x!==c);if(v==='chin')S.marche=nouveauMarche(S);preparerJournee(S);Son.jouer('piece')}});break}
    case'licencier':{const c=moi.staff[v];if(c)demander('Renvoyer '+c.nom+' ?','Le poste de '+ROLES[v].nom.toLowerCase()+' restera vacant. Vous économisez '+c.sal+' po par match.','Renvoyer',()=>{delete moi.staff[v];preparerJournee(S)});break}
    case'lister':{const i=moi.liste.indexOf(id);if(i>=0)moi.liste.splice(i,1);else moi.liste.push(id);S.inter.recues=S.inter.recues.filter(o=>o.veut!==id);break}
    case'ecouter':{const l=offresRecues(S);S.inter.ecoute=true;Son.jouer(l.length?'piece':'refus');break}
    case'accepter-offre':{const o=S.inter.recues[Number(v)];if(!o)break;const p=moi.joueurs.find(x=>x.id===o.veut);const q=o.donne?S.teams[o.de].joueurs.find(x=>x.id===o.donne):null;
      demander('Céder '+p.nom+' ?','À '+esc(o.club)+' contre '+(q?esc(q.nom)+(o.po?' et '+o.po+' po':''):o.po+' po')+'. Échange définitif.','Accepter l\'échange',()=>{const err=accepterOffre(S,Number(v));if(err)informer('Échange impossible',esc(err),'refus');else Son.jouer('piece')});break}
    case'refuser-offre':S.inter.recues.splice(Number(v),1);Son.jouer('refus');break;
    case'offre':offre={cible:id,donne:[],po:0,rep:null};fiche=null;break;
    case'offre-donne':{const i=offre.donne.indexOf(id);if(i>=0)offre.donne.splice(i,1);else offre.donne.push(id);offre.rep=null;break}
    case'offre-po':offre.po=clamp(offre.po+Number(v),-50,Math.max(0,moi.or));offre.rep=null;break;
    case'offre-proposer':{const rep=proposerEchange(S,offre.cible,offre.donne,offre.po);offre.rep=rep;
      if(rep.statut==='oui'){const o=offre;const cible=trouver(o.cible).p;demander('Conclure l\'échange ?','Vous recevez <b>'+esc(cible.nom)+'</b> contre '+(o.donne.length?o.donne.map(i=>esc(trouver(i).p.nom)).join(' et '):'rien')+(o.po?(o.po>0?' et '+o.po+' po':', en recevant '+(-o.po)+' po'):'')+'. C\'est définitif.','Conclure',()=>{executerEchange(S,o.cible,o.donne,o.po);offre=null;Son.jouer('piece')})}
      else Son.jouer(rep.statut==='contre'?'carte':'refus');break}
    case'offre-contre':{const o=offre;const po=o.rep.po;const cible=trouver(o.cible).p;
      if(po>moi.or){informer('Caisse insuffisante','Il vous faudrait '+po+' po.','refus');break}
      demander('Accepter la contre-offre ?','Vous recevez <b>'+esc(cible.nom)+'</b> contre '+(o.donne.length?o.donne.map(i=>esc(trouver(i).p.nom)).join(' et ')+' et ':'')+po+' po. C\'est définitif.','Conclure',()=>{executerEchange(S,o.cible,o.donne,po);offre=null;Son.jouer('piece')});break}
    case'legende':legVue=v;Son.jouer('carte');break;
    case'logo':try{localStorage.setItem('woodbowl-logo',v)}catch(e){}Son.jouer('bascule');break;
    case'ecran':ecran=v;importErreur='';window.scrollTo(0,0);break;
    case'ouvrir':if(!ouvrirPartie(v))informer('Sauvegarde illisible','Cette équipe n\'a pas pu être chargée.','refus');else{Son.jouer('fanfare');Son.ambiance(AMB.vestiaire)}window.scrollTo(0,0);break;
    case'titre':quitterPartie();Son.ambiance('titre');window.scrollTo(0,0);break;
    case'exporter':exporterPartie(v);Son.jouer('piece');break;
    case'suppr':{const r=(lireIndex()||[]).find(x=>x.id===v);if(!r)break;demander('Supprimer '+r.nom+' ?','Le club, ses joueurs, ses gazettes et son mur des légendes seront effacés de cet appareil. Pensez à l\'exporter avant si vous voulez le garder.','Supprimer',()=>{supprimerPartie(v);if(partieId===v){S=null;partieId=null;ecran='solo'}});break}
    case'tuto-raz':try{localStorage.removeItem('woodbowl-tuto')}catch(e){}informer('C\'est noté','La visite guidée se lancera quand vous fonderez votre prochain club. Dans une partie en cours, touchez « ? » puis « Revoir la visite guidée ».');break;
    default:return false;
  }
  return true;
}
document.addEventListener('click',ev=>{
  const a=ev.target.closest('[data-aide]');
  if(a&&!a.closest('[data-act]')){const meme=bulle&&bulle._de===a;if(meme&&matchMedia('(hover:hover)').matches)return;cacherBulle();if(!meme){montrerBulle(a);bulle._de=a;Son.toucher();Son.jouer('clic')}return}
  cacherBulle();
  const b=ev.target.closest('[data-act]');if(!b||b.tagName==='SELECT')return;
  const premier=!Son.actif();Son.toucher();
  if(b.tagName==='INPUT'&&b.type==='checkbox'){/* la case se coche d'elle-même */}
  const fait=action(b,ev);if(fait===false)return;
  if(!['oui','son','jouer','acheter','embaucher','sponsor','renvoyer','licencier','lancer','raz','soigner','accepter-offre','refuser-offre','offre-proposer','offre-contre','ecouter','fiche','club','numero','creer','pot','pageG'].includes(b.dataset.act))Son.jouer(b.dataset.act==='titulaire'||b.dataset.act==='entr'?'bascule':'clic');
  if(premier)Son.ambiance(S?AMB[vue]:'titre');
  if(S)sauver();
  rendre();
});
document.addEventListener('change',ev=>{
  const b=ev.target;
  if(b.dataset.act==='filtreSel'&&S){if(b.dataset.v==='poste')filtre=b.value;else filtreR=b.value;Son.toucher();Son.jouer('bascule');rendre();return}
  if(b.dataset.act==='importer'&&b.files&&b.files[0]){importerFichier(b.files[0]);return}
  if(b.dataset.act==='numeroSel'&&S){numero=Number(b.value);pageG=0;Son.toucher();Son.jouer('journal');rendre();return}
  if(b.dataset.act==='ordre'&&S){const O=S.choix.ordres||(S.choix.ordres={});const id=b.dataset.id;if(!b.value)delete O[id];else O[id]={k:b.value[0]==='c'?'cible':'garde',id:Number(b.value.slice(2))};Son.toucher();Son.jouer('bascule');sauver();rendre();return}
  if(b.dataset.act!=='marque'||!S)return;
  S.choix.marque=b.value?Number(b.value):null;Son.toucher();Son.jouer('bascule');sauver();rendre();
});
document.addEventListener('mouseover',e=>{if(!matchMedia('(hover:hover)').matches)return;const a=e.target.closest('[data-aide]');if(a){if(!bulle||bulle._de!==a){montrerBulle(a);bulle._de=a}}else if(bulle)cacherBulle()});
addEventListener('scroll',cacherBulle,{passive:true});
/* la musique démarre au tout premier toucher, où qu'il soit (les navigateurs l'exigent) */
['pointerup','keydown'].forEach(t=>document.addEventListener(t,function lancer(){if(Son.actif())return;Son.toucher();Son.ambiance(S?AMB[vue]:'titre')},{capture:true}));
/* gazette : on tourne les pages d'un glissement du doigt, ou avec les flèches du clavier */
let glisse=null;
document.addEventListener('touchstart',e=>{const t=e.target.closest&&e.target.closest('.gazette.pages');glisse=t&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()}:null},{passive:true});
document.addEventListener('touchend',e=>{if(!glisse||!S||vue!=='gazette')return;const c=e.changedTouches[0],dx=c.clientX-glisse.x,dy=c.clientY-glisse.y;const g0=glisse;glisse=null;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4&&Date.now()-g0.t<700)tournerPage(pageG+(dx<0?1:-1),true)},{passive:true});
document.addEventListener('keydown',e=>{if(!S||vue!=='gazette'||tuto>=0||guide||prono||fiche!==null||e.target.tagName==='SELECT')return;if(e.key==='ArrowRight')tournerPage(pageG+1,true);else if(e.key==='ArrowLeft')tournerPage(pageG-1,true)});
document.addEventListener('keydown',e=>{if(tuto>=0&&e.key==='Escape'){tutoAller(-1);return}if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.aide){montrerBulle(e.target);bulle._de=e.target;return}if(e.key!=='Escape')return;if(confirmation)confirmation=null;else if(message)message=null;else if(guide)guide=false;else if(offre)offre=null;else if(fiche!==null)fiche=null;else if(clubVu!==null)clubVu=null;else return;rendre()});

/* Le geste « retour » du téléphone ne fait plus sortir de l'appli : il ferme ce qui est ouvert (fiche, message, écran de menu), sinon il ne fait rien. */
function retourArriere(){
  if(confirmation)confirmation=null;else if(message)message=null;else if(guide)guide=false;else if(prono)prono=false;else if(offre)offre=null;else if(fiche!==null)fiche=null;
  else if(clubVu!==null)clubVu=null;else if(tiroir)tiroir=false;else if(legVue)legVue=null;else if(pretVu)pretVu=false;
  else if(!S&&ecran==='multi'&&window.LG&&LG.ecran!=='accueil')LG.ecran='accueil';
  else if(!S&&ecran!=='titre')ecran='titre';
  else return false;
  rendre();return true;
}
try{history.pushState({wb:1},'');addEventListener('popstate',()=>{retourArriere();history.pushState({wb:1},'')})}catch(e){}

function demarrer(d){preparerSauvegardes();brancherNuage();if(d&&d.S&&d.S.v===3&&d.partieId){S=courant(d.S);partieId=d.partieId;if(d.vue)vue=d.vue}rendre()}
const chaud=window.claude&&window.claude.hot;
if(chaud&&chaud.snapshot)chaud.snapshot(()=>({S,vue,partieId}));
if(chaud&&chaud.ready)chaud.ready(demarrer);else demarrer((chaud&&chaud.data)||{});
