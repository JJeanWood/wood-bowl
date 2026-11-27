/* Assemble le moteur et la logique du serveur en un seul fichier pour les fonctions Supabase :
     node multijoueur/construire.js        -> écrit supabase/functions/_shared/jeu.js
   Ce fichier est fabriqué automatiquement à chaque publication (voir .github/workflows/serveur.yml) : ne pas le modifier à la main. */
const fs=require('fs'),path=require('path');
const racine=path.join(__dirname,'..');
const FICHIERS=['moteur.js','legendes.js','carriere.js','gazette.js','gazette2.js','ligue.js','multijoueur/serveur.js'];
const EXPORTS='tick,avancer,demande,publier,planifier,prochainCreneau,instantLocal,RYTHME,vuePour,vueClub,nouvelleLigue,graine,estH,humains,G';
function source(){return FICHIERS.map(f=>'/* ---- '+f+' ---- */\n'+fs.readFileSync(path.join(racine,f),'utf8').replace(/^'use strict';\s*/,'')).join('\n')}
function charger(){return new Function(source()+'\nreturn {'+EXPORTS+',setR:f=>{R=f}};')()}
if(require.main===module){
  const dest=path.join(racine,'supabase/functions/_shared/jeu.js');
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,'// Fichier fabriqué par multijoueur/construire.js : ne pas modifier.\nexport const Jeu=(function(){\n'+source()+'\nreturn {'+EXPORTS+'};\n})();\n');
  console.log('écrit',path.relative(racine,dest),Math.round(fs.statSync(dest).size/1024)+' ko');
}
module.exports={charger,source,EXPORTS};
