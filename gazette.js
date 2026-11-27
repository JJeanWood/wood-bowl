'use strict';
/* ================= WOOD BOWL · GAZETTE (L'Écho du Gourdin) ================= */
const deN=n=>/^Les /.test(n)?'des '+n.slice(4):/^Le /.test(n)?'du '+n.slice(3):/^La /.test(n)?'de la '+n.slice(3):'de '+n;
const aN=n=>/^Les /.test(n)?'aux '+n.slice(4):/^Le /.test(n)?'au '+n.slice(3):/^La /.test(n)?'à la '+n.slice(3):'à '+n;
const elide=t=>t.replace(/\b([Dd])e ([AEÉÈIOUYaeéèiouy])/g,"$1'$2").replace(/\b([Qq])ue ([AEÉÈIOUYaeéèiouy])/g,"$1u'$2").replace(/\b([Ll])e ([AEÉÈIOUaeéèiou])/g,"$1'$2");
function remplir(g,o){return g.replace(/\{(\w+)\}/g,(_,k)=>o[k]!==undefined&&o[k]!==null?o[k]:'')}
function choisir(S,cat,pool){ // parcourt toute la réserve d'une catégorie avant de reprendre une tournure
  if(!pool||!pool.length)return'';
  const M=S.memo||(S.memo={});const vus=M[cat]||(M[cat]=[]);
  let libres=pool.map((t,i)=>i).filter(i=>!vus.includes(i));
  if(!libres.length){const dernier=vus[vus.length-1];vus.length=0;libres=pool.map((t,i)=>i).filter(i=>i!==dernier);if(!libres.length)libres=[0]}
  const i=pick(libres);vus.push(i);return pool[i];
}
const ph=(S,cat,o)=>elide(remplir(typeof variante==='function'?variante(S,cat,GAB[cat]):choisir(S,cat,GAB[cat]),o));

const GAB={
  but:["{j} transperce la défense {da} et marque.","{j} profite d'un trou dans la haie adverse et file déposer la balle.","Sur une passe hasardeuse, {j} se retrouve seul face à l'en-but et ne tremble pas.","{j} marque en force, en emportant deux défenseurs et un morceau de palissade.","But de {j}, qui avouera plus tard avoir visé la buvette.","{j} slalome entre trois joueurs {da}, dont un qui dormait, et marque.","{j} plonge dans l'en-but avec la grâce d'un sac de patates. Ça compte quand même.","{j} feinte, refeinte, s'emmêle, se relève et marque. Personne n'a compris, surtout pas lui.","Course folle de {j} sur toute la longueur : la défense {da} regarde passer le chariot.","{j} ramasse un ballon qui traînait dans la boue et l'aplatit sans trembler.","{j} saute par-dessus un défenseur à terre, puis par-dessus la ligne. Élégant.","{j} part en solitaire, s'arrête pour saluer sa mère en tribune, et marque quand même."],
  butPasse:["Service millimétré de {p}, et {j} n'a plus qu'à pousser la balle.","{p} lance au-dessus de la mêlée, {j} attrape et marque.","Une-deux entre {p} et {j}, conclu par {j}. Du grand art.","{p} voit l'ouverture avant tout le monde ; {j} s'y engouffre.","Passe aveugle de {p} dans le dos de la défense : {j} n'en demandait pas tant.","{j} conclut une action lancée par {p}. Le public se lève, la défense se gratte la tête.","{p} attire trois défenseurs et glisse la balle à {j}, seul au monde.","Sur un lancer de {p} qui a dû traverser les nuages, {j} plonge et marque."],
  butCogneur:["Fait rare : {j}, un cogneur, marque. Il ne sait pas quoi faire de la balle ensuite et la mord un peu.","{j} trouve l'en-but par erreur en poursuivant un adversaire. Le but est validé.","{j} écrase tout sur son passage, y compris la ligne d'en-but. But !","Les défenseurs s'écartent devant {j}. Instinct de survie. But.","{j}, qu'on croyait là pour cogner, marque. Sa mère n'en revient pas."],
  ctx_ouvre:["{e} ouvre le score : {s}.","Premier sang pour {e} : {s}.","{s}, et les tribunes {de} chavirent.","Le tableau s'anime : {s}."],
  ctx_egalise:["Tout est à refaire : {s}.","{e} égalise : {s}.","Retour à égalité, {s}.","{s}, et tout le monde se regarde."],
  ctx_avantage:["{e} repasse devant : {s}.","{e} prend l'avantage : {s}.","{s}, la balance penche vers {e}."],
  ctx_ecart:["Le break : {s}.","{e} creuse l'écart : {s}.","{s}. Ça commence à sentir le sapin pour {a}.","{s}, et une partie du public adverse rentre traire ses chèvres."],
  ctx_reduit:["{e} réduit l'écart : {s}.","{s} : {e} y croit encore.","{s}, l'espoir renaît chez {e}."],
  ctx_tardif:["{s} à la {m}, et le stade explose.","But tardif, {s}. Les cardiaques sont priés de sortir.","{s} dans les derniers instants : la buvette tremble sur ses fondations."],
  occasion:["{j} part seul au but, puis se prend les pieds dans son propre lacet.","Tir de {j} : la balle finit dans la marmite du vendeur de soupe.","{j} manque l'immanquable. Le public lui lance des navets, par politesse.","La défense {da} repousse {j} d'extrême justesse.","{j} hésite entre tirer et passer, et réussit à ne faire ni l'un ni l'autre.","{j} file vers l'en-but, mais un défenseur le rattrape par la culotte.","{j} glisse sur une flaque à un mètre de la ligne. La flaque est désignée meilleure défenseuse.","Belle percée de {j}, stoppée net par un plaquage qu'on entend jusqu'au village.","{j} envoie la balle sur le poteau. Le poteau est remplacé à la mi-temps.","{j} s'arrête pour célébrer trop tôt. On lui reprend la balle."],
  sonne:["{j} étend {v}, qui se relève en demandant quel jour on est.","{v} croise le coude de {j} et compte les chandelles un moment.","Plaquage appuyé de {j} sur {v}, qui y laisse son casque et un peu de dignité.","{j} sonne {v}, qui repart en jouant pour la mauvaise équipe pendant deux minutes.","{v} se relève après la charge de {j}, mais parle désormais avec un accent.","{j} renverse {v} comme une chaise de taverne. Rien de cassé, mais l'égo en prend un coup."],
  blesse:["{j} plie {v} dans un sens que la nature n'avait pas prévu. Sortie sur civière.","{v} ne se relève pas après la charge de {j}. Les guérisseurs annoncent {n} d'absence.","Vilain tampon de {j} sur {v}, évacué en brouette.","{j} marche sur {v}. Deux fois. {v} sort, absent pour {n}.","{v} quitte le terrain sur une porte de grange après un contact avec {j}.","Le genou de {v} fait un bruit de fagot sous la charge de {j}. {n} d'arrêt."],
  grave:["Choc terrible : {j} démolit {v}, qui quitte le terrain en plusieurs voyages. Absence longue à prévoir.","{v} est piétiné par {j}. Le guérisseur a fait la grimace, ce qui n'est jamais bon signe.","{j} fracasse {v} contre la palissade. On parle de plusieurs semaines, et d'une cicatrice.","{v} se fait plier par {j}. Il ne sera plus jamais tout à fait le même joueur."],
  mort:["Drame : {v} ne se relève pas de la charge de {j}. Le stade observe une minute de silence, puis réclame la reprise.","{v} a fini sa carrière, et le reste, sous les crampons de {j}. Ses coéquipiers lui dédient la suite du match.","{j} percute {v} une fois de trop. Les pompes funèbres, assises au premier rang, se lèvent sans un mot.","Silence glacial : {v} ne bouge plus après le passage de {j}. On rapporte qu'il souriait."],
  sauvetage:["{j} ne respire plus... jusqu'à ce que le préparateur lui verse un seau d'eau et une potion douteuse. Il vivra, mais pas cette saison.","On croyait {j} perdu. Son kiné l'a ramené à coups de bandages et d'insultes. Longue absence, mais vivant."],
  miracle:["{f} charge {j} de toutes ses forces. {j} se relève, s'époussette et réclame la balle. Un miracle.","{j} disparaît sous {f}, puis ressort de l'autre côté sans une égratignure.","{f} percute {j} à pleine vitesse. {j} n'a rien. {f}, lui, cherche ses dents."],
  jaune:["Carton jaune pour {j}, qui jure qu'il visait la balle.","L'arbitre avertit {j}. {j} lui demande s'il a de la famille.","Jaune pour {j}, qui applaudit l'arbitre avec un peu trop d'insistance.","{j} prend un jaune et le contemple comme une invitation à recommencer.","Avertissement pour {j}, qui jure sur la tête de sa grand-mère, déjà sortie sur civière la saison dernière."],
  rouge2:["Deuxième jaune pour {j} : rouge, douche, et suspension au prochain match.","{j} récidive. L'arbitre sort le second jaune, puis le rouge, pour être bien compris.","Jaune, re-jaune, rouge : {j} a fait le tour du nuancier. Suspendu au prochain match."],
  rouge:["Carton rouge direct pour {j}. Il sera suspendu au prochain match, et {e} paie l'amende.","Rouge pour {j}, qui quitte le terrain en expliquant que « c'est l'autre qui a commencé ».","L'arbitre brandit le rouge sous le nez de {j}, puis court se cacher derrière un poteau.","{j} est renvoyé au vestiaire. Il y casse un banc, par habitude."],
  aveugle:["L'arbitre, soudain passionné par ses chaussures, ne voit rien du geste de {j}.","Agression caractérisée de {j}. L'arbitre regarde ailleurs en tâtant sa bourse.","L'arbitre cherche son carton, trouve une pièce d'or à la place, et laisse jouer.","{j} assomme un adversaire sous le nez de l'arbitre, qui siffle... une faute contre la victime.","L'arbitre se mouche longuement pendant la faute de {j}. Quel rhume opportun."],
  penalty:["Penalty généreux pour {e} : personne n'a vu la faute, sauf l'arbitre. {j} transforme.","L'arbitre siffle un penalty pour {e} en raison d'un « regard menaçant ». {j} marque.","Penalty pour {e}, parce que l'arbitre a « entendu une insulte en elfique ». {j} ne se fait pas prier."],
  penaltyRate:["Penalty très généreux pour {e}. {j} réussit l'exploit de le manquer.","Penalty offert à {e} : {j} tire dans la tribune. L'arbitre a l'air vexé."],
  douce:["{j} marque en douce pendant que tout le monde regarde une bagarre.","But de {j}, qui avait caché la balle sous son maillot. L'arbitre valide.","{j} passe sous les jambes de la mêlée et marque avant qu'on remarque son absence.","{j} déguisé en ramasseur de balle marque. L'arbitre ne trouve rien dans le règlement contre."],
  douceAnnule:["{j} tente de marquer avec une seconde balle sortie de sa culotte. But refusé.","{j} essaie de déplacer discrètement les poteaux. L'arbitre s'en aperçoit.","{j} est surpris à marquer avec une citrouille. Refusé."],
  maladroit:["{j} plaque son propre capitaine. « Je croyais qu'on avait changé de côté », dira-t-il.","{j} dégage la balle vers son propre camp, avec beaucoup de conviction.","{j} célèbre un but qui n'a pas eu lieu.","{j} se prend les crampons dans la civière et l'emprunte un moment.","{j} lace ses chaussures ensemble à la mi-temps. Exprès, assure-t-il."],
  fetard:["{j} ({e}) a été aperçu sortant de la taverne à l'aube. Il a joué au ralenti.","{j} ({e}) est arrivé au stade en chantant. Il a chanté tout le match, et couru peu.","{j} ({e}) a confondu le vestiaire et la cave à vin. Forme en berne."],
  scandale:["Scandale avant le coup d'envoi : l'arbitre a été surpris en train de compter les pièces {de}. Il est remplacé au pied levé, et le club écope de 20 po d'amende.","Un spectateur photographie à la plume l'arbitre empochant l'or {de}. Arbitre remplacé, 20 po d'amende."]
};
const TITRES={
  mort:["Drame au stade : {v} ne se relèvera pas","Minute de silence pour {v}","{v} tombé au champ d'honneur","Deuil à la buvette : {v} n'est plus"],
  remontada:["{W} renverse {L}","Incroyable retournement : {W} fait plier {L}","Mené au score, {W} finit par croquer {L}","{L} s'effondre, {W} renaît de ses cendres"],
  triple:["Triplé de {j}, {W} s'impose","{j} marque trois fois, {L} n'a rien vu venir","Le grand soir de {j}"],
  tripleNul:["Triplé de {j}, mais pas de victoire","{j} marque trois fois pour un match nul"],
  triplePerdu:["{j} marque trois fois, et perd quand même","Triplé inutile pour {j}"],
  tardif:["{W} arrache la victoire au bout du suspense","À la dernière minute, {W} crucifie {L}","{L} craque dans les derniers instants","Coup de théâtre tardif : {W} l'emporte"],
  surprise:["Énorme surprise : {W} fait tomber {L}","Le petit {W} mange le gros {L}","Personne n'y croyait : {W} bat {L}"],
  rouges:["Festival de cartons : {W} s'impose dans le chaos","{n} cartons rouges et une victoire pour {W}","L'arbitre perd la tête, {W} garde la sienne"],
  boucherie:["Boucherie au stade : {W} survit à {L}","Les civières ont chauffé, {W} l'emporte","Bataille rangée : {W} reste debout"],
  m1:["Courte victoire {dW} face {aL}","{W} s'impose d'un rien face {aL}","Victoire à l'arraché {dW}","{W} passe de justesse","Sur le fil, {W} dompte {L}","{W} sauve l'essentiel face {aL}"],
  m2:["Nette victoire {dW} face {aL}","{W} s'impose sans trembler","{W} maîtrise {L}","Succès solide {dW}","{W} règle son compte {dL}"],
  m3:["Démonstration {dW} : {L} en charrette","{W} sans pitié pour {L}","Correction pour {L}","{L} humilié par {W}","Carnage : {W} écrase {L}","{W} roule sur {L}"],
  nul0:["Zéro partout entre {A} et {B} : le public demande à être remboursé","Rien à voir entre {A} et {B}","{A} et {B} se neutralisent dans l'ennui","Match nul et vierge : les marchands de soupe font fortune"],
  nul:["{A} et {B} dos à dos","Match nul {s} : seuls les guérisseurs ont gagné","Partage des points entre {A} et {B}","Ni vainqueur ni vaincu entre {A} et {B}"],
  nulFou:["Festival de buts entre {A} et {B} !","{s} : les défenses sont restées au vestiaire","Match fou entre {A} et {B}"]
};
const CHAPOS=["Devant {n} spectateurs et autant de chopes, le match {A} – {B} a tenu ses promesses de violence.","{n} personnes s'étaient déplacées pour {A} – {B}. Certaines sont même restées jusqu'au bout.","Temps boueux, public nerveux, {n} spectateurs : tout était réuni pour {A} – {B}.","Sous une pluie de navets et devant {n} curieux, {A} recevait {B}.","Le vent soufflait de l'est, les paris de l'ouest : {n} spectateurs pour {A} – {B}.","On annonçait un choc, {n} spectateurs sont venus voir {A} – {B} de près.","{n} supporters, trois bardes et un ours dressé ont assisté à {A} – {B}.","Il faisait si froid que l'arbitre portait deux sifflets. {n} braves pour {A} – {B}."];
const BREVES=["Petites annonces : échange bouclier peu servi contre béquilles.","Météo : boue le matin, boue l'après-midi, éclaircies de boue en soirée.","Le syndicat des guérisseurs réclame une prime de pénibilité, et une pelle.","Rectificatif : l'arbitre de la semaine dernière n'était pas ivre, il était « pensif ».","Perdu : une dent, côté tribune nord. Forte valeur sentimentale.","La ligue rappelle que mordre reste interdit, sauf le samedi.","Courrier des lecteurs : « Moins de balle, plus de bagarre. » Signé : un orque.","Le vendeur de soupe précise que la balle retrouvée dans sa marmite sera facturée.","Sondage : 9 spectateurs sur 10 ne connaissent pas les règles. Le dixième est arbitre.","Objets trouvés : trois casques, un genou, une chope encore pleine.","L'imprimeur des cartons jaunes annonce une rupture de stock.","Un nain porte plainte : on l'aurait pris pour le ballon. Deux fois.","Le Bol de Bois, trophée de la ligue, a été vernis. Le vernisseur demande à être payé.","Rumeur : un gobelin aurait été vu en train de lire le règlement. Démenti immédiat.","Les elfes réclament des vestiaires avec miroirs. Les orques réclament des vestiaires.","Offre d'emploi : cherche ramasseur de balles, de dents et de morceaux divers.","La taverne du stade lance la chope « Prolongations » : trois litres, une paille.","Concours de pronostics : le gagnant a parié sur l'arbitre.","Un barde compose une ballade sur le dernier carton rouge. Elle dure quarante couplets.","Les supporters nains exigent des sièges plus bas. Les supporters elfes, des sièges plus loin des nains.","Le guérisseur de la ligue recherche son scalpel, oublié dans un joueur.","Fête du club : buffet à volonté. La sécurité rappelle que les joueurs adverses ne sont pas au buffet.","Avis aux spectateurs : il est interdit de lancer des chaises. Les tabourets restent tolérés.","Les elfes noirs nient avoir empoisonné la soupe. Personne ne leur a rien demandé.","Le président de la ligue rappelle que le ballon est en cuir, pas en gobelin."];

/* ---------- Construction d'un numéro ---------- */
function phraseEvt(S,res,e,prev){
  const A=S.teams[res.dom],B=S.teams[res.ext];const eq=e.c===0?A:B,ad=e.c===0?B:A;
  const o={j:e.j,v:e.v,f:e.f,p:e.p,e:eq.court,a:ad.court,da:deN(ad.court),de:deN(eq.court),n:e.n?pl(e.n,'match'):'',m:e.m+'e'};
  let cat=e.k;if(e.k==='but')cat=e.p?'butPasse':e.poste==='Cogneur'?'butCogneur':'but';
  let t=ph(S,cat,o);
  if(e.s){ // contexte du score
    const[a,b]=e.s;const nous=e.c===0?a:b,eux=e.c===0?b:a;const sc=a+'-'+b;let k;
    if(a+b===1)k='ctx_ouvre';else if(nous===eux)k='ctx_egalise';else if(nous===eux+1&&prev.nous===prev.eux)k=e.m>=70?'ctx_tardif':'ctx_avantage';else if(nous>eux)k='ctx_ecart';else k='ctx_reduit';
    t+=' '+ph(S,k,Object.assign(o,{s:sc}));
  }
  if(e.vise&&['blesse','grave','mort'].includes(e.k))t+=' '+pick(['Une victime désignée : les ordres ont été suivis à la lettre.','Il le cherchait depuis le coup d\'envoi.','Ce n\'était pas un hasard : la consigne venait du banc.']);
  if(e.susp)t+=" C'est son troisième jaune de la saison : suspendu au prochain match.";
  if(e.r)t+=' '+e.r+' entre à sa place.';else if(e.r===null&&['blesse','grave','mort'].includes(e.k))t+=' Personne sur le banc pour le remplacer.';
  return t;
}
function faitsDuMatch(res){
  const[a,b]=res.score;const W=a>b?0:a<b?1:-1;
  let min=[0,0],cur=[0,0],dernier=null;
  res.ev.forEach(e=>{if(e.s){cur=[e.s[0],e.s[1]];if(W>=0){const d=cur[W]-cur[1-W];if(d<min[W])min[W]=d}dernier=e}});
  const buteurs={};res.ev.forEach(e=>{if(e.s)buteurs[e.j+'|'+e.c]=(buteurs[e.j+'|'+e.c]||0)+1});
  const triple=Object.entries(buteurs).find(([k,n])=>n>=3);
  const blessures=res.ev.filter(e=>['blesse','grave','mort'].includes(e.k)).length;
  const rouges=res.ev.filter(e=>['rouge','rouge2'].includes(e.k)).length;
  return{W,marge:Math.abs(a-b),remontada:W>=0&&min[W]<=-1,tardif:W>=0&&Math.abs(a-b)===1&&dernier&&dernier.m>=70&&dernier.c===W,
    triple:triple?{nom:triple[0].split('|')[0],c:+triple[0].split('|')[1]}:null,blessures,rouges,mort:res.ev.find(e=>e.k==='mort'),
    surprise:W>=0&&res.rangs[W]>=res.rangs[1-W]+3};
}
function titreDe(S,res,f){
  const A=S.teams[res.dom],B=S.teams[res.ext];const[a,b]=res.score;
  const W=f.W===0?A:B,L=f.W===0?B:A;
  const o={A:A.court,B:B.court,W:W.court,L:L.court,dW:deN(W.court),dL:deN(L.court),aL:aN(L.court),s:a+' à '+b,n:f.rouges};
  let cat;
  if(f.mort){cat='mort';o.v=f.mort.v}
  else if(f.W<0){if(f.triple){cat='tripleNul';o.j=f.triple.nom}else cat=a===0?'nul0':a>=3?'nulFou':'nul'}
  else if(f.remontada)cat='remontada';
  else if(f.triple){o.j=f.triple.nom;cat=f.triple.c===f.W?'triple':'triplePerdu'}
  else if(f.tardif)cat='tardif';
  else if(f.surprise)cat='surprise';
  else if(f.rouges>=2)cat='rouges';
  else if(f.blessures>=3)cat='boucherie';
  else cat=f.marge===1?'m1':f.marge===2?'m2':'m3';
  return elide(remplir(typeof variante==='function'&&TITRES_COMPO[cat]?variante(S,'T'+cat,TITRES[cat],{['T'+cat]:TITRES_COMPO[cat]},.55):choisir(S,'T'+cat,TITRES[cat]),o));
}
const VERDICTS={
  victoireDomine:["Une victoire volée, et c'est très bien comme ça : vous avez subi plus que joué.","Le hold-up parfait. Votre défense a plié sans rompre, et la chance a fait le reste.","Trois points sans la manière. Les puristes grincent, la caisse sourit."],
  victoire:["Une victoire méritée, construite match après match à l'entraînement.","Le plan a fonctionné : vous avez fait mal là où il fallait.","Rien à redire, vous étiez au-dessus."],
  victoireLarge:["Une démonstration. Vos adversaires repartent avec un complexe d'infériorité et quelques dents en moins.","Le genre de match qu'on raconte aux petits-enfants, en exagérant à peine."],
  nul:["Un nul qui ne dit pas grand-chose, sinon que les deux équipes se valaient ce jour-là.","Un point chacun. Personne n'est content, ce qui est souvent signe de justice.","Match équilibré : un résultat logique, un peu frustrant."],
  defaiteDomine:["Vous avez eu le jeu, ils ont eu le score. Le brutball est injuste, c'est pour ça qu'on l'aime.","Défaite cruelle : vous méritiez mieux, mais la balle n'a pas voulu entrer."],
  defaite:["Une défaite logique : ils étaient plus forts aujourd'hui.","Pas de honte, mais pas grand-chose à sauver non plus.","Ils ont fait le match, vous l'avez regardé."],
  defaiteLarge:["Une raclée. Il faudra revoir beaucoup de choses, à commencer par la défense.","On a vu des naufrages plus discrets. Repos général conseillé."]
};
function analyse(S,res,x){
  const i=res.dom===(x.moi||0)?0:1,o=1-i;const st=res.st[i],so=res.st[o];const L=[];
  const nous=res.score[i],eux=res.score[o];const ra=res.rapport[i],rd=res.rapport[o];
  const dom=st.occ-so.occ;
  let v;if(nous>eux)v=nous-eux>=3?'victoireLarge':dom<=-2?'victoireDomine':'victoire';else if(nous<eux)v=eux-nous>=3?'defaiteLarge':dom>=2?'defaiteDomine':'defaite';else v='nul';
  L.push(choisir(S,'V'+v,VERDICTS[v]));
  // attaque et défense
  const att=ra>1.15?choisir(S,'att+',["Votre attaque a pris le dessus sur leur défense ({o}).","Vos porteurs de balle ont trouvé des trous partout : {o}.","Devant, ça a fonctionné : {o}."]):ra<.87?choisir(S,'att-',["Votre attaque a buté sur leur mur : seulement {o}.","Vos porteurs de balle ont tourné en rond face à leur défense ({o}).","Peu de danger créé : {o}, c'est maigre."]):choisir(S,'att=',["Votre attaque et leur défense se sont neutralisées ({o}).","Duel équilibré entre votre attaque et leur défense : {o}."]);
  L.push(remplir(att,{o:pl(st.occ,'occasion')}));
  const def=rd>1.15?choisir(S,'def-',["Derrière, ça a craqué : ils ont eu {o}.","Leur attaque a débordé votre défense, {o} à la clé.","Votre défense a pris l'eau : {o}."]):rd<.87?choisir(S,'def+',["Votre défense a tenu bon : {o} seulement.","Vos cogneurs ont fermé la boutique ({o}).","Rien ne passait derrière : {o}."]):choisir(S,'def=',["Leur attaque et votre défense se sont rendu coup pour coup ({o}).","Défense correcte, sans plus : {o}."]);
  L.push(remplir(def,{o:pl(so.occ,'occasion')}));
  // postes
  const po=st.postes;const compo=pl(po.Cogneur,'cogneur')+', '+pl(po.Coureur,'coureur')+', '+pl(po.Passeur,'passeur');
  if(res.etatsMal[i].length)L.push('Composition déséquilibrée ('+compo+') : '+res.etatsMal[i].map(n=>'« '+n+' »').join(' et ')+' vous a coûté cher.');
  else if(res.etats[i].length)L.push(choisir(S,'etats',["Vos titulaires ({c}) ont profité de : {e}.","Avec {c}, vous aviez {e} en votre faveur.","Composition : {c}. États actifs : {e}."]).replace('{c}',compo).replace('{e}',res.etats[i].join(', ')));
  else L.push('Composition : '+compo+', sans état d\'équipe particulier.');
  if(res.etats[o].length&&R()<.7)L.push('En face, ils jouaient avec : '+res.etats[o].join(', ')+'.');
  // forme
  if(st.formeMoy<48)L.push(choisir(S,'fat',["Vos titulaires étaient éreintés (forme moyenne {f}) : l'entraînement de la semaine les a rincés.","Jambes lourdes : forme moyenne de {f} au coup d'envoi. Un peu de repos ne ferait pas de mal."]).replace('{f}',st.formeMoy));
  else if(st.formeMoy>=75&&R()<.6)L.push('Vos titulaires étaient frais (forme moyenne '+st.formeMoy+'), et ça s\'est vu en fin de match.');
  if(res.stag[i])L.push('Faute de joueurs valides, vous avez aligné '+pl(res.stag[i],'stagiaire')+'. Ils ont fait ce qu\'ils ont pu, c\'est-à-dire pas grand-chose.');
  // consigne
  const c=res.consigne[i];const cart=pl(st.jaunes,'jaune')+' et '+pl(st.expuls,'rouge');
  if(c==='brutal')L.push(choisir(S,'brut',["Consigne brutale : {b} hors de combat en face, pour {c} chez vous.","Vous avez joué les bouchers : {b} sorti(s) en face, {c} reçus.","La manière forte : {b} en face, et {c} pour vous."]).replace('{b}',pl(st.blInfl,'adversaire')).replace('{c}',cart));
  else if(c==='prudent')L.push('Consigne prudente : '+pl(st.blSubies,'blessé')+' dans vos rangs, au prix d\'une attaque plus timide.');
  else if(st.jaunes||st.expuls)L.push('Discipline : '+cart+' contre vous.');
  // plan de jeu
  if(res.tactique){const tn=TACTIQUES[res.tactique[i]].nom.toLowerCase(),to=TACTIQUES[res.tactique[o]].nom.toLowerCase();
    if(res.duel[i])L.push(choisir(S,'tacG',["Votre {a} a pris le dessus sur leur {b} : bonus de 7 % pour vous.","Bien vu : votre {a} a désarmé leur {b}.","Leur {b} n'avait pas de réponse à votre {a}."]).replace('{a}',tn).replace('{b}',to));
    else if(res.duel[o])L.push(choisir(S,'tacP',["Leur {b} a contré votre {a} : avantage pour eux.","Votre {a} est tombé pile sur leur {b}, son pire ennemi.","Mauvaise pioche : leur {b} était taillé pour battre votre {a}."]).replace('{a}',tn).replace('{b}',to));
    else if(res.tactique[i]!=='equilibre'||res.tactique[o]!=='equilibre')L.push('Plans de jeu : '+tn+' pour vous, '+to+' pour eux. Aucun des deux n\'a pris l\'ascendant.');}
  // stratège
  const r=x.rapStrat;
  if(r){
    const bon=r.humain||r.prediction===r.reel; /* face à un humain, le stratège ne prédit rien */
    if(r.suivi&&r.fiable)L.push('Votre stratège avait vu juste et vous l\'avez écouté : +'+K.plan[r.niv+1]+' % sur le terrain.');
    else if(r.suivi&&!r.fiable)L.push('Vous avez suivi votre stratège, mais il s\'était trompé'+(bon?'':' : ils ont joué '+r.reel+' et non '+r.prediction)+'. Aucun bonus.');
    else if(!r.suivi&&r.fiable)L.push('Votre stratège conseillait de jouer '+r.conseil+' et il avait raison. Vous avez laissé un petit bonus sur la table.');
    else L.push('Vous avez ignoré votre stratège, et vous avez bien fait : son rapport était à côté de la plaque.');
  }
  // marquage
  res.marques.forEach(m=>{
    if(m.c===i)L.push(m.b?m.nom+' a échappé à votre marquage : '+pl(m.b,'but')+' quand même.':choisir(S,'marqOk',["Le marquage de {n} a tenu : pas un but de sa part.","{n} a passé le match avec un de vos joueurs collé à ses basques. Muet.","Bien vu : {n}, marqué de près, n'a rien pu faire."]).replace('{n}',m.nom));
    else L.push(m.nom+' était marqué de près par l\'adversaire'+(m.b?', mais a marqué quand même.':' et n\'a rien pu faire.'));
  });
  // arbitre
  if(st.scandale)L.push('Votre pot-de-vin a été découvert : arbitre remplacé, amende, et argent perdu.');
  else if(res.pot[i])L.push(st.aveugle?'L\'arbitre acheté vous a rendu service '+pl(st.aveugle,'fois','fois')+(st.penalty?', penalty compris.':'.'):'Pot-de-vin perdu : l\'arbitre n\'a rien eu à ignorer.');
  if(res.pot[o]&&so.aveugle&&!so.scandale)L.push('Méfiance : l\'arbitre semblait très ami avec vos adversaires.');
  return L;
}
const COMMENTS={10:['Monstrueux','Intenable','Légendaire'],8.5:['Le patron','Tout bon','Héroïque','Impérial'],7:['Solide','Précieux','Efficace','Utile'],5.5:['Correct','Discret','Appliqué','Honnête','Sans plus'],4:['Transparent','Dans le dur','Fébrile','Hors du coup'],0:['Naufrage','Catastrophique','À oublier','Coupable']};
function commentaire(j){const x=j.perf||{};if(x.mort)return'Paix à son âme';if(x.cr)return'Expulsé';if(x.bl)return'Sorti sur civière';if(x.b>=2)return pl(x.b,'but')+', '+pick(['un régal','quel finisseur','insatiable']);if(x.sort>=2)return pl(x.sort,'victime')+', '+pick(['terrifiant','un vrai boucher','sans pitié']);
  const n=j.note;const k=n>=9.5?10:n>=8.5?8.5:n>=7?7:n>=5.5?5.5:n>=4?4:0;return pick(COMMENTS[k])}
function resume(S,res){
  const A=S.teams[res.dom],B=S.teams[res.ext];const f=faitsDuMatch(res);let t=A.court+' '+res.score[0]+' – '+res.score[1]+' '+B.court+'.';
  if(f.mort)t+=' '+f.mort.v+' y a laissé la vie.';
  else if(f.triple)t+=' Triplé de '+f.triple.nom+'.';
  else if(f.remontada)t+=' '+(f.W===0?A:B).court+' revient de loin.';
  else if(f.rouges>=2)t+=' '+pl(f.rouges,'carton rouge','cartons rouges')+'.';
  else{const g=res.ev.find(e=>e.k==='grave');const b=res.ev.filter(e=>e.s).pop();if(g)t+=' '+g.v+' gravement blessé.';else if(b)t+=' '+pick(['But décisif de ','Dernier but signé ','On retiendra le but de '])+b.j+'.'}
  return elide(t);
}
/* l'homme (ou la femme) du match, avec de quoi afficher son portrait */
function hommeDe(S,res,moi){
  const tous=res.joueurs[0].concat(res.joueurs[1]);const h=tous.slice().sort((a,b)=>b.note-a.note)[0];if(!h)return null;
  const T=S.teams[res.joueurs[0].includes(h)?res.dom:res.ext];
  return{nom:h.nom,f:h.sexe?h.sexe==='f':(S._sexe&&S._sexe[h.nom])==='f',note:h.note,club:T.court,couleur:T.couleur,race:h.race,tete:h.tete,poste:h.poste,leg:h.leg,perf:{b:h.perf.b||0,pd:h.perf.pd||0,sort:h.perf.sort||0},moi:T.id===(moi||0)};
}
/* l'article d'un match : écrit une seule fois par journée en ligue (x.cache), pour que tous les amis lisent le même récit */
function articleDe(S,res,C){
  const k='a'+res.dom;if(C&&C[k])return C[k];
  const A=S.teams[res.dom],B=S.teams[res.ext];
  const paras=[];let prev={nous:0,eux:0};
  res.pre.forEach(e=>paras.push({m:'Avant-match',t:phraseEvt(S,res,e,prev)}));
  let sc=[0,0];
  res.ev.forEach(e=>{const pv={nous:sc[e.c],eux:sc[1-e.c]};paras.push({m:e.m<=1?'1re':Math.min(80,e.m)+'e',t:phraseEvt(S,res,e,pv),but:!!e.s,c:e.c});if(e.s)sc=[e.s[0],e.s[1]]});
  if(!res.ev.length)paras.push({m:'',t:"Il ne s'est rien passé. Vraiment rien. Notre envoyé spécial s'est endormi."});
  const chapo=remplir(choisir(S,'chapo',CHAPOS),{n:res.public.toLocaleString('fr-FR'),A:A.court,B:B.court});
  const art={paras,chapo};if(C)C[k]=art;return art;
}
function gazette(S,res,ailleurs,x){
  const moi=x.moi||0,C=x.cache||null;
  const A=S.teams[res.dom],B=S.teams[res.ext];const i=res.dom===moi?0:1;
  const f=faitsDuMatch(res);
  const art=articleDe(S,res,C);const chapo=art.chapo;
  const paras=art.paras.map(p=>{const q={m:p.m,t:p.t};if(p.but!==undefined){q.but=p.but;q.nous=p.c===i}return q});
  const memo=(k,fn)=>C?(C[k]!==undefined?C[k]:(C[k]=fn())):fn();
  const notes=res.joueurs[i].slice().sort((a,b)=>b.note-a.note).map(j=>({nom:j.nom,poste:j.poste,note:j.note,com:commentaire(j)}));
  const cl=classement(S);
  const mini=cl.map((T,k)=>({rang:k+1,nom:T.court,pts:T.pts,moi:T.id===moi})).filter((t,k)=>k<3||t.moi);
  const prochain=S.jour+1<S.calendrier.length?(()=>{const m=S.calendrier[S.jour+1].find(([h,a])=>h===moi||a===moi);return(m[0]===moi?'Vous recevez ':'Vous vous déplacez chez ')+S.teams[m[0]===moi?m[1]:m[0]].nom+'.'})():null;
  const titreM=r=>memo('t'+r.dom,()=>titreDe(S,r,faitsDuMatch(r)));
  const resumeM=r=>memo('r'+r.dom,()=>resume(S,r));
  return{saison:S.saison,jour:x.jour,article:{titre:C?titreM(res):titreDe(S,res,f),score:A.court+' '+res.score[0]+' – '+res.score[1]+' '+B.court,chapo,paras},
    analyse:analyse(S,res,x),notes,homme:hommeDe(S,res,moi),
    ailleurs:ailleurs.map(r=>resumeM(r)),
    matchs:ailleurs.map(r=>({titre:titreM(r),dom:S.teams[r.dom].court,ext:S.teams[r.ext].court,cd:S.teams[r.dom].couleur,ce:S.teams[r.ext].couleur,score:r.score,texte:resumeM(r).slice((S.teams[r.dom].court+' '+r.score[0]+' – '+r.score[1]+' '+S.teams[r.ext].court+'.').length).trim(),homme:hommeDe(S,r,moi)})),mini,prochain,infirmerie:x.infirmerie,comptes:x.comptes,solde:x.solde,pop:x.pop,vente:x.vente,
    breve:choisir(S,'breve',BREVES),victoire:res.score[i]>res.score[1-i]?1:res.score[i]<res.score[1-i]?-1:0};
}
/* ligue entre amis : l'édition commune, avec le récit complet de tous les matchs de la journée */
function editionCommune(S,resultats,C,jour){
  const cl=classement(S);
  return{saison:S.saison,jour,
    matchs:resultats.map(r=>{const a=articleDe(S,r,C);const A=S.teams[r.dom],B=S.teams[r.ext];
      return{dom:r.dom,ext:r.ext,nomDom:A.court,nomExt:B.court,cd:A.couleur,ce:B.couleur,score:r.score,titre:C['t'+r.dom]!==undefined?C['t'+r.dom]:(C['t'+r.dom]=titreDe(S,r,faitsDuMatch(r))),chapo:a.chapo,
        paras:a.paras.map(p=>{const q={m:p.m,t:p.t};if(p.but!==undefined){q.but=p.but;q.c=p.c}return q}),homme:hommeDe(S,r,-1),public:r.public}}),
    classement:cl.map((T,k)=>({rang:k+1,id:T.id,nom:T.court,couleur:T.couleur,j:T.j,g:T.g,n:T.n,p:T.p,bp:T.bp,bc:T.bc,pts:T.pts})),
    breve:choisir(S,'breve',BREVES)};
}
