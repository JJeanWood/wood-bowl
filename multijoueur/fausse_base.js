/* Fausse base en mémoire qui remplace Supabase dans les tests (Node et navigateur). Mêmes méthodes que supabase/functions/_shared/base.ts. */
function fausseBase(){
  const B={comptes:[],reprises:[],ligues:[],clubs:[],etats:{},ordres:[],encheres:[],gazettes:[],vues:{},echanges:[],courrier:[],n:0};
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
    async compteParHash(h){const c=B.comptes.find(x=>x.hash===h);return c?c.uid:null},
    async poserCompte(uid,h){B.comptes=B.comptes.filter(x=>x.uid!==uid);B.comptes.push({uid,hash:h})},
    async transfererCompte(ancien,nouveau){
      const mes=B.clubs.filter(c=>c.user_id===nouveau).map(c=>c.ligue_id);if(B.clubs.some(c=>c.user_id===ancien&&mes.includes(c.ligue_id)))return false;
      B.clubs.forEach(c=>{if(c.user_id===ancien)c.user_id=nouveau});B.ligues.forEach(l=>{if(l.commissaire===ancien)l.commissaire=nouveau});
      B.comptes=B.comptes.filter(x=>x.uid!==nouveau);B.comptes.forEach(x=>{if(x.uid===ancien)x.uid=nouveau});return true},
  };
  return db;
}
if(typeof module!=='undefined')module.exports={fausseBase};
