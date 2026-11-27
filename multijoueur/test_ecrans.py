# Test des écrans de ligue dans un vrai navigateur, sans Supabase : python3 multijoueur/test_ecrans.py
# Le serveur (multijoueur/serveur.js) tourne dans la page sur une fausse base ; trois faux amis s'inscrivent et font une draft.
import asyncio, os, subprocess, sys, json
from playwright.async_api import async_playwright
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
source = subprocess.run(['node', '-e', "process.stdout.write(require('./multijoueur/construire.js').source())"], cwd=RACINE, capture_output=True, text=True).stdout
fausse = open(os.path.join(RACINE, 'multijoueur/fausse_base.js'), encoding='utf-8').read()
INIT = "window.__SRC=" + json.dumps(source) + ";\n" + fausse + r"""
(function(){
  const Jeu=new Function(window.__SRC+'\nreturn {tick,demande,graine}')();
  const db=fausseBase(),B=db.B;window.__B=B;window.__uid='u0';window.__now=Date.now();window.__Jeu=Jeu;window.__db=db;
  const copie=x=>JSON.parse(JSON.stringify(x));
  window.__API_LIGUE={
    async init(){return window.__uid},
    async demande(q){return Jeu.demande(db,window.__uid,copie(q),window.__now)},
    async ligues(uid){return B.clubs.filter(c=>c.user_id===uid).map(c=>({L:copie(B.ligues.find(l=>l.id===c.ligue_id)),club:copie(c)}))},
    async charger(id,uid){const L=copie(B.ligues.find(l=>l.id===id)),clubs=copie(B.clubs.filter(c=>c.ligue_id===id).sort((a,b)=>a.club_index-b.club_index));const moi=clubs.find(c=>c.user_id===uid);
      const tour=L.etat&&L.etat.encheres&&L.etat.encheres.tour;const mises={};if(moi&&tour)B.encheres.filter(e=>e.ligue_id===id&&e.club_index===moi.club_index&&e.tour===tour).forEach(e=>{mises[e.joueur_id]=e.montant});
      return{L,clubs,vue:moi?copie(B.vues[id+':'+moi.club_index]||null):null,mises}},
    async miser(id,club,tour,joueur,montant){B.encheres=B.encheres.filter(e=>!(e.ligue_id===id&&e.club_index===club&&e.tour===tour&&e.joueur_id===joueur));B.encheres.push({ligue_id:id,club_index:club,tour,joueur_id:joueur,montant});return{ok:true}},
    async retirer(id,club,tour,joueur){B.encheres=B.encheres.filter(e=>!(e.ligue_id===id&&e.club_index===club&&e.tour===tour&&e.joueur_id===joueur));return{ok:true}}
  };
})();
"""
echecs = []
def verifier(c, msg):
    if not c: echecs.append(msg); print('  ✗', msg)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 420, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        await pg.add_init_script(INIT)
        await pg.goto('file://' + RACINE + '/index.html'); await pg.wait_for_timeout(600)
        txt = lambda: pg.evaluate("document.body.innerText")
        async def changer(uid):
            await pg.evaluate("(u)=>{window.__uid=u;try{localStorage.removeItem('woodbowl-code')}catch(e){};Object.assign(LG,{etat:'debut',ecran:'accueil',id:null,L:null,ligues:null,code:null,onglet:'ligue',mises:{},saisie:{}});ecran='multi';rendre()}", uid)
            await pg.wait_for_timeout(300)
        async def clic(sel): await pg.click(sel); await pg.wait_for_timeout(250)
        # --- u0 crée la ligue
        await clic('[data-act="ecran"][data-v="multi"]')
        verifier('Vous n\'êtes dans aucune ligue' in await txt(), 'accueil de la ligue affiché')
        await clic('[data-l="montrer"]'); code_secret = await pg.inner_text('.lg-code')
        verifier(len(code_secret.split('-')) == 4, 'code secret de 4 mots : ' + code_secret)
        await clic('[data-l="aller"][data-v="creer"]')
        await pg.fill('#lg-nomLigue', 'Ligue de test'); await pg.fill('#lg-pseudo', 'Juju'); await pg.fill('#lg-club', 'Les Gros Bras')
        await clic('[data-l="couleur"][data-v="#c8402c"]'); await clic('[data-l="peuple"][data-v="orque"]')
        verifier(await pg.input_value('#lg-pseudo') == 'Juju', 'la saisie survit au changement de couleur')
        await clic('[data-l="creer"]'); await pg.wait_for_timeout(300)
        code = await pg.inner_text('.lg-code.grand'); verifier(len(code) == 6, 'code d\'invitation affiché : ' + code)
        await pg.screenshot(path=SORTIE + '/ecran1_attente.png', full_page=True)
        # --- u1 et u2 rejoignent
        for uid, nom in (('u1', 'Hugo'), ('u2', 'Léa')):
            await changer(uid); await clic('[data-l="aller"][data-v="rejoindre"]')
            await pg.fill('#lg-code', code.lower()); await pg.fill('#lg-pseudo', nom); await pg.fill('#lg-club', 'FC ' + nom)
            await clic('[data-l="rejoindre"]'); await pg.wait_for_timeout(300)
            verifier('clubs inscrits' in await txt(), nom + ' est dans la salle d\'attente')
        verifier(await pg.locator('[data-l="onglet"][data-v="commissaire"]').count() == 0, 'un simple membre n\'a pas l\'onglet Commissaire')
        # --- u0 revient, nomme Hugo adjoint, lance la draft
        await changer('u0'); await clic('[data-l="ouvrir"]'); await clic('[data-l="onglet"][data-v="membres"]')
        verifier('Hugo' in await txt() and 'Léa' in await txt(), 'liste des membres')
        await clic('[data-l="adjoint"][data-id="1"]'); await pg.wait_for_timeout(300)
        verifier('Adjoint du commissaire' in await txt(), 'Hugo nommé adjoint')
        await pg.screenshot(path=SORTIE + '/ecran2_membres.png', full_page=True)
        await clic('[data-l="onglet"][data-v="commissaire"]'); await clic('[data-l="demarrer"]')
        verifier('Lancer la draft ?' in await txt(), 'confirmation avant de lancer')
        await clic('[data-act="oui"]'); await pg.wait_for_timeout(600)
        verifier('Draft · premier tour' in await txt(), 'écran de draft affiché')
        n = await pg.locator('.lg-carte').count(); verifier(n == 36, '36 joueurs au vivier pour 3 amis : ' + str(n))
        # --- mises de u0
        ids = await pg.evaluate("LG.L.etat.draft.vivier.slice().sort((a,b)=>valeur(b)-valeur(a)).slice(0,10).map(p=>[p.id,p.plancher])")
        await pg.fill('[data-mise="%d"]' % ids[0][0], '1'); await clic('[data-l="miser"][data-id="%d"]' % ids[0][0])
        verifier('Mise trop basse' in await txt(), 'mise sous le plancher refusée'); await clic('[data-act="ok"]') if await pg.locator('[data-act="ok"]').count() else await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(200)
        for i, pl in ids[:9]:
            await pg.fill('[data-mise="%d"]' % i, str(pl + 8)); await clic('[data-l="miser"][data-id="%d"]' % i)
        verifier('9 mises' in (await txt()).replace('\n', ' '), 'neuf mises comptées')
        await clic('[data-l="retirer"][data-id="%d"]' % ids[8][0])
        await clic('[data-l="filtre"][data-v="mises"]'); verifier(await pg.locator('.lg-carte').count() == 8, 'filtre « Mes mises »')
        await pg.screenshot(path=SORTIE + '/ecran3_draft.png')
        # les deux autres misent (directement dans la fausse base), puis le commissaire clôt les deux tours
        await pg.evaluate("""()=>{const S=__B.etats[LG.L.id].etat;[1,2].forEach(c=>S.draft.vivier.slice().sort(()=>Math.random()-.5).slice(0,12).forEach(p=>__B.encheres.push({ligue_id:LG.L.id,club_index:c,tour:'draft-1',joueur_id:p.id,montant:p.plancher+5})))}""")
        await clic('[data-l="onglet"][data-v="commissaire"]'); await clic('[data-l="lancer"]'); await clic('[data-act="oui"]'); await pg.wait_for_timeout(600)
        await clic('[data-l="onglet"][data-v="ligue"]')
        t = await txt(); verifier('second tour' in t and 'Déjà dans votre club' in t and 'Résultats du premier tour' in t, 'second tour, joueurs gagnés et résultats visibles')
        await pg.screenshot(path=SORTIE + '/ecran4_draft2.png')
        await clic('[data-l="onglet"][data-v="commissaire"]'); await clic('[data-l="lancer"]'); await clic('[data-act="oui"]'); await pg.wait_for_timeout(600)
        await clic('[data-l="onglet"][data-v="ligue"]')
        t = await txt(); verifier('Saison 1 · journée 1 sur 10' in t and 'Classement' in t and 'Clôture du mercato' in t, 'la saison démarre : classement et horaires')
        await pg.screenshot(path=SORTIE + '/ecran5_saison.png', full_page=True)
        # pause / reprise, puis une journée complète en deux clics
        await clic('[data-l="onglet"][data-v="commissaire"]'); await clic('[data-l="pause"]'); await pg.wait_for_timeout(400)
        verifier('Ligue en pause' in await txt(), 'pause affichée'); await clic('[data-l="reprendre"]'); await pg.wait_for_timeout(400)
        for k in range(2):
            await clic('[data-l="lancer"]'); await clic('[data-act="oui"]'); await pg.wait_for_timeout(600)
        await clic('[data-l="onglet"][data-v="ligue"]'); verifier('journée 2 sur 10' in await txt(), 'une journée jouée')
        # exclusion puis code de reprise
        await clic('[data-l="onglet"][data-v="membres"]'); await clic('[data-l="exclure"][data-id="2"]'); await clic('[data-act="oui"]'); await pg.wait_for_timeout(500)
        verifier('Club sans propriétaire' in await txt(), 'Léa exclue : club sans propriétaire'); await clic('[data-l="confier"][data-id="2"]'); await pg.wait_for_timeout(400)
        verifier('Code de reprise' in await txt(), 'code de reprise affiché')
        # retour à l'accueil : la ligue est listée ; le solo marche toujours
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200); await pg.screenshot(path=SORTIE + '/ecran6_fin.png'); await clic('[data-l="aller"][data-v="accueil"]'); await pg.wait_for_timeout(300); verifier('ligue de test' in (await txt()).lower(), 'la ligue est dans « Vos ligues »')
        await clic('[data-act="ecran"][data-v="titre"]'); verifier('partie solo' in (await txt()).lower(), 'retour à l\'écran titre')
        await b.close()
        verifier(not errs, 'aucune erreur de page : ' + ' | '.join(errs))
    print('ÉCHEC : %d problème(s)' % len(echecs) if echecs else 'Tout est bon : création, inscriptions, membres, adjoint, draft, saison, pause, exclusion, reprise.')
    sys.exit(1 if echecs else 0)
asyncio.run(main())
