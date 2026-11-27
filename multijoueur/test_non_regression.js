const fs=require('fs');
function moteur(dir){return new Function(['moteur.js','legendes.js','carriere.js','gazette.js','gazette2.js'].map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('\n')+'\nreturn {nouvellePartie,jouerJournee,nouvelleSaison,courant,conseilEntr,choisirTitulaires,graine,setR:f=>{R=f}};')()}
function partie(E,seed){
  E.setR(E.graine(seed));const S=E.nouvellePartie('Test',['humain','orque','nain','elfe'][seed%4]);E.courant(S);
  for(let s=0;s<3;s++){while(S.phase==='saison'&&!S.fini){S.teams[0].joueurs.forEach(p=>{p.entr=p.forme<55?'repos':E.conseilEntr(p)});E.choisirTitulaires(S.teams[0]);E.jouerJournee(S)}if(S.phase==='inter')E.nouvelleSaison(S)}
  return JSON.stringify(S);
}
const A=moteur(process.argv[3]||'/tmp/avant'),B=moteur(process.argv[2]||'.');let diff=0;
for(let seed=1;seed<=6;seed++){const a=partie(A,seed),b=partie(B,seed);if(a!==b){diff++;let i=0;while(a[i]===b[i])i++;console.log('graine',seed,'diffère vers',a.slice(i-80,i+40),'|',b.slice(i-80,i+40))}}
console.log(diff?'DIFFÉRENCES : '+diff:'identique sur 6 parties de 3 saisons');
