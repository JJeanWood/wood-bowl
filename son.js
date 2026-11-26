'use strict';
/* ================= WOOD BOWL · MUSIQUES ET BRUITAGES =================
   Musiques : morceaux médiévaux composés pour le jeu (dossier mus/). Bruitages : synthétisés. */
const Son=(()=>{
  let ctx=null,master,mus,sfx,salle,bruit=null,piste=null,bloque=false;
  const reg={musique:true,sons:true,mode2:'lieux'};
  try{const r=JSON.parse(localStorage.getItem('woodbowl-son')||'null');if(r)Object.assign(reg,r)}catch(e){}
  const sauver=()=>{try{localStorage.setItem('woodbowl-son',JSON.stringify(reg))}catch(e){}};
  const hz=m=>440*Math.pow(2,(m-69)/12);
  const VOL_M=.55;
  function init(){
    if(ctx||bloque)return!!ctx;
    try{const C=window.AudioContext||window.webkitAudioContext;if(!C){bloque=true;return false}
      ctx=new C();
      const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;comp.connect(ctx.destination);
      master=ctx.createGain();master.gain.value=.9;master.connect(comp);
      mus=ctx.createGain();mus.gain.value=reg.musique?VOL_M:0;mus.connect(master);
      sfx=ctx.createGain();sfx.gain.value=reg.sons?.45:0;sfx.connect(master);
      const n=ctx.sampleRate*2;bruit=ctx.createBuffer(1,n,ctx.sampleRate);const d=bruit.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
      /* réverbération de stade : réponse impulsionnelle générée */
      const L=ctx.sampleRate*2.6,ir=ctx.createBuffer(2,L,ctx.sampleRate);
      for(let c=0;c<2;c++){const x=ir.getChannelData(c);for(let i=0;i<L;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/L,3.2)}
      const conv=ctx.createConvolver();conv.buffer=ir;salle=ctx.createGain();salle.gain.value=.32;salle.connect(conv);
      const ret=ctx.createGain();ret.gain.value=.9;conv.connect(ret);ret.connect(master);
    }catch(e){bloque=true;return false}
    return true;
  }
  function reprendre(){if(ctx&&ctx.state==='suspended')ctx.resume().catch(()=>{})}
  /* --- briques sonores --- */
  function env(v,t,att,g,dur){v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(g,t+att);v.gain.exponentialRampToValueAtTime(.0001,t+dur)}
  function sortie(node,dest,verb){node.connect(dest);if(verb&&salle)node.connect(salle)}
  function osc(type,f,t,dur,g,dest,opt){
    opt=opt||{};const o=ctx.createOscillator(),v=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
    if(opt.vers)o.frequency.exponentialRampToValueAtTime(opt.vers,t+(opt.versDur||dur));
    if(opt.det)o.detune.value=opt.det;
    env(v,t,opt.att||.005,g,dur);
    let fin=v;if(opt.lp){const l=ctx.createBiquadFilter();l.type='lowpass';l.frequency.setValueAtTime(opt.lp,t);if(opt.lpVers)l.frequency.exponentialRampToValueAtTime(opt.lpVers,t+dur);l.Q.value=opt.q||.7;v.connect(l);fin=l}
    o.connect(v);sortie(fin,dest,opt.verb);o.start(t);o.stop(t+dur+.05);
    if(opt.vib){const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=opt.vib;lg.gain.value=opt.vibA||8;lfo.connect(lg);lg.connect(o.frequency);lfo.start(t);lfo.stop(t+dur+.05)}
  }
  function souffle(t,dur,g,dest,type,freq,q,opt){
    opt=opt||{};const s=ctx.createBufferSource();s.buffer=bruit;const fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(freq,t);fl.Q.value=q||1;
    if(opt.vers)fl.frequency.exponentialRampToValueAtTime(opt.vers,t+dur);
    const v=ctx.createGain();env(v,t,opt.att||.005,g,dur);
    s.connect(fl);fl.connect(v);sortie(v,dest,opt.verb);s.start(t,Math.random()*.5);s.stop(t+dur+.05);
  }
    /* ---------- musiques composées (fichiers mus/*.mp3, boucles sans couture) ----------
     Chaque fichier contient la boucle précédée et suivie d'une seconde de recouvrement :
     on lit entre PAD et PAD+dur, ce qui reste exact même si le décodeur décale le son. */
  const PAD=1;
  const MORCEAUX={titre1:80,stade1:67.2,stade3:34*4*60/132,club1:60,gazette3:26*4*60/112};
  const PISTES={titre:['titre1'],vestiaire:['stade1'],reste:['club1'],
    partie:['stade1','club1','stade3','gazette3','titre1']};
  const NOMS_M={titre1:'Hymne du Bol de Bois',stade1:'Marche des Gourdins',stade3:'Le vestiaire',club1:'Le club',gazette3:'La gazette'};
  /* modes : 'continue' = une seule bande-son qui s'enchaîne, quel que soit l'onglet ;
     'lieux' = chaque lieu a sa musique ; un nom de morceau = ce morceau en boucle pendant toute la partie */
  const cible=nom=>nom==='titre'?'titre':reg.mode2==='lieux'?(nom==='vestiaire'?'vestiaire':'reste'):MORCEAUX[reg.mode2]?'seul:'+reg.mode2:'partie';
  const tampons={},enCours={};let lecteur=null,alterne=0,relais=null;
  function charger(nom){
    if(tampons[nom])return Promise.resolve(tampons[nom]);
    if(enCours[nom])return enCours[nom];
    enCours[nom]=fetch('mus/'+nom+'.mp3').then(r=>{if(!r.ok)throw new Error('absent');return r.arrayBuffer()})
      .then(ab=>new Promise((ok,ko)=>{const p=ctx.decodeAudioData(ab,ok,ko);if(p&&p.then)p.then(ok,ko)}))
      .then(b=>{tampons[nom]=b;return b}).catch(()=>{delete enCours[nom];return null});
    return enCours[nom];
  }
  function arreter(l,fondu){if(!l)return;const t=ctx.currentTime;try{l.g.gain.cancelScheduledValues(t);l.g.gain.setValueAtTime(l.g.gain.value,t);l.g.gain.linearRampToValueAtTime(0,t+fondu);l.s.stop(t+fondu+.05)}catch(e){}}
  function lancerMorceau(nom,fondu){
    charger(nom).then(b=>{
      if(!b||!lecteur||lecteur.nom!==nom)return;
      const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;s.loop=true;
      const d=MORCEAUX[nom];s.loopStart=PAD;s.loopEnd=Math.min(b.duration,PAD+d);
      g.gain.value=0;s.connect(g);g.connect(mus);const t=ctx.currentTime+.05;s.start(t,PAD);
      g.gain.linearRampToValueAtTime(1,t+fondu);
      if(lecteur.s)arreter(lecteur,fondu);
      lecteur.s=s;lecteur.g=g;
    });
  }
  function ambiance(lieu){
    if(!ctx)return;const nom=cible(lieu);
    const liste=nom.startsWith('seul:')?[nom.slice(5)]:PISTES[nom];
    if(!liste||nom===piste)return;piste=nom;
    clearTimeout(relais);
    /* si le morceau en cours fait partie de la nouvelle liste, on ne coupe rien : il continue */
    if(lecteur&&lecteur.s&&liste.includes(lecteur.nom)){
      alterne=liste.indexOf(lecteur.nom)+1;
      if(liste.length>1){const suite=()=>{if(piste!==nom)return;const n=liste[alterne++%liste.length];const prec=lecteur;lecteur={nom:n,s:null,g:null};
          charger(n).then(()=>{if(piste!==nom||lecteur.nom!==n)return;lancerMorceau(n,2.5);setTimeout(()=>arreter(prec,2.5),50)});
          relais=setTimeout(suite,MORCEAUX[n]*2000)};
        relais=setTimeout(suite,MORCEAUX[lecteur.nom]*1000)}
      return}
    if(nom==='partie')alterne=Math.floor(Math.random()*liste.length);
    const choix=liste[alterne++%liste.length];
    const ancien=lecteur;lecteur={nom:choix,s:null,g:null};
    if(ancien&&ancien.s)arreter(ancien,1.2);
    lancerMorceau(choix,ancien?1.2:.6);
    /* plusieurs morceaux pour un même lieu : on passe au suivant après deux tours */
    if(liste.length>1){const suite=()=>{if(piste!==nom)return;const n=liste[alterne++%liste.length];const prec=lecteur;lecteur={nom:n,s:null,g:null};
        charger(n).then(()=>{if(piste!==nom||lecteur.nom!==n)return;lancerMorceau(n,2.5);setTimeout(()=>arreter(prec,2.5),50)});
        relais=setTimeout(suite,MORCEAUX[n]*2000)};
      relais=setTimeout(suite,MORCEAUX[choix]*2000)}
    /* on précharge les autres morceaux discrètement */
    Object.keys(MORCEAUX).forEach((k,i)=>setTimeout(()=>charger(k),1500+i*900));
  }
  const SFX={
    clic(t){osc('sine',700,t,.06,.35,sfx,{vers:420});souffle(t,.025,.15,sfx,'bandpass',2200,3)},
    bascule(t){osc('triangle',520,t,.05,.3,sfx,{vers:300});osc('triangle',780,t+.05,.06,.25,sfx,{vers:500})},
    piece(t){osc('triangle',1320,t,.09,.3,sfx);osc('triangle',1760,t+.08,.24,.3,sfx,{verb:1})},
    carte(t){souffle(t,.13,.3,sfx,'bandpass',1600,.8,{vers:3800})},
    confirme(t){osc('sawtooth',hz(62),t,.14,.12,sfx,{lp:1600});osc('sawtooth',hz(69),t+.1,.3,.12,sfx,{lp:1800,verb:1})},
    refus(t){osc('sawtooth',130,t,.22,.16,sfx,{lp:600});osc('sawtooth',110,t+.12,.25,.16,sfx,{lp:600})},
    sifflet(t){osc('sine',2900,t,.32,.22,sfx,{vib:32,vibA:120});osc('sine',2900,t+.42,.6,.22,sfx,{vib:32,vibA:120,verb:1})},
    foule(t){souffle(t,2.4,.5,sfx,'bandpass',850,.6,{att:.4,verb:1});souffle(t+.15,2,.28,sfx,'bandpass',1500,.8,{att:.35,verb:1});
      for(let k=0;k<3;k++){const tt=t+.5+k*.42;souffle(tt,.12,.22,sfx,'bandpass',1200,1,{verb:1});souffle(tt+.14,.12,.22,sfx,'bandpass',1200,1,{verb:1});souffle(tt+.28,.16,.3,sfx,'bandpass',1400,1.1,{verb:1})}},
    journal(t){souffle(t,.08,.5,sfx,'lowpass',500,1);souffle(t+.03,.35,.25,sfx,'highpass',3000,.7,{att:.05})},
    fanfare(t){[62,66,69,74].forEach((m,i)=>[-8,8].forEach(d=>osc('sawtooth',hz(m),t+i*.14,i===3?.9:.18,.09,sfx,{det:d,lp:2400,att:.02,verb:1})));osc('sine',60,t+.42,.6,.4,sfx,{vers:40})},
    triste(t){[65,64,62].forEach((m,i)=>osc('sawtooth',hz(m-12),t+i*.4,.38,.13,sfx,{lp:800,vib:5,vibA:4,verb:1}));osc('sawtooth',hz(49),t+1.2,1.2,.16,sfx,{lp:700,vib:5,vibA:8,verb:1})},
    tambour(t){for(let i=0;i<12;i++)souffle(t+i*.055,.07,.12+i*.03,sfx,'lowpass',420,1);osc('sine',85,t+.68,.7,.7,sfx,{vers:40,versDur:.3,verb:1})}
  };
  return{
    reg,
    toucher(){ if(init())reprendre() },
    jouer(nom){ if(!ctx||!reg.sons||!SFX[nom])return; try{SFX[nom](ctx.currentTime+.01)}catch(e){} },
    ambiance(nom){ if(!ctx)return; ambiance(nom) },
    NOMS_M,
    morceau:()=>lecteur&&lecteur.nom,
    changerMode(m,lieu){ reg.mode2=m;sauver();piste=null;if(ctx)ambiance(lieu) },
    basculer(cle){ reg[cle]=!reg[cle];sauver();if(ctx){mus.gain.setTargetAtTime(reg.musique?VOL_M:0,ctx.currentTime,.1);sfx.gain.setTargetAtTime(reg.sons?.45:0,ctx.currentTime,.05)} },
    actif:()=>!!ctx
  };
})();
