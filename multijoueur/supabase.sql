-- =====================================================================
-- Wood Bowl : base de données de la ligue entre amis (Supabase / Postgres)
-- À coller tel quel dans Supabase › SQL Editor › New query, puis « Run ».
-- =====================================================================

-- ---------- Ligues ----------
create table if not exists public.ligues (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,                 -- code d'invitation (6 lettres)
  nom           text not null,
  commissaire   uuid not null references auth.users(id),
  reglages      jsonb not null default '{}'::jsonb,   -- rythme, budget de draft, nombre de clubs…
  phase         text not null default 'inscriptions'  -- inscriptions | draft | saison | inter | pause | terminee
                check (phase in ('inscriptions','draft','saison','inter','pause','terminee')),
  etape         text,                                 -- mercato | preparation (pendant la saison)
  etat          jsonb,                                -- état PUBLIC du jeu (sans les ordres ni les mises)
  version       integer not null default 0,           -- augmente à chaque journée jouée
  echeance      timestamptz,                          -- prochaine étape à déclencher
  cree_le       timestamptz not null default now()
);

-- ---------- Qui possède quel club ----------
create table if not exists public.clubs_ligue (
  ligue_id      uuid not null references public.ligues(id) on delete cascade,
  club_index    integer not null,                     -- index du club dans l'état du jeu
  user_id       uuid not null references auth.users(id),
  pseudo        text not null,
  nom_club      text not null,
  couleur       text not null default '#2f5fa8',
  peuple        text not null default 'humain',
  dernier_passage timestamptz,
  primary key (ligue_id, club_index),
  unique (ligue_id, user_id)
);

-- ---------- Ordres d'un club pour une journée (privés) ----------
create table if not exists public.ordres (
  ligue_id      uuid not null references public.ligues(id) on delete cascade,
  club_index    integer not null,
  journee       integer not null,
  contenu       jsonb not null,                       -- composition, entraînement, consigne, plan, marquage, ordres aux joueurs, pot-de-vin
  maj           timestamptz not null default now(),
  primary key (ligue_id, club_index, journee)
);

-- ---------- Enchères secrètes (draft et mercato) ----------
create table if not exists public.encheres (
  ligue_id      uuid not null references public.ligues(id) on delete cascade,
  club_index    integer not null,
  tour          text not null,                        -- 'draft-1', 'draft-2', 'mercato-S1J4'…
  joueur_id     integer not null,
  montant       integer not null check (montant >= 0),
  maj           timestamptz not null default now(),
  primary key (ligue_id, club_index, tour, joueur_id)
);

-- ---------- Gazettes publiées ----------
create table if not exists public.gazettes (
  ligue_id      uuid not null references public.ligues(id) on delete cascade,
  saison        integer not null,
  journee       integer not null,
  club_index    integer not null,                     -- la « une » de ce club ; -1 = édition commune
  contenu       jsonb not null,
  primary key (ligue_id, saison, journee, club_index)
);

-- ---------- Échanges entre amis ----------
create table if not exists public.echanges (
  id            uuid primary key default gen_random_uuid(),
  ligue_id      uuid not null references public.ligues(id) on delete cascade,
  de_club       integer not null,
  vers_club     integer not null,
  donne         jsonb not null,                       -- ids de joueurs + po proposés
  recoit        jsonb not null,                       -- ids de joueurs demandés
  statut        text not null default 'proposee' check (statut in ('proposee','acceptee','refusee','annulee','appliquee')),
  cree_le       timestamptz not null default now()
);

-- ---------- Courrier des lecteurs ----------
create table if not exists public.courrier (
  id            uuid primary key default gen_random_uuid(),
  ligue_id      uuid not null references public.ligues(id) on delete cascade,
  club_index    integer not null,
  texte         text not null check (char_length(texte) <= 280),
  cree_le       timestamptz not null default now()
);

-- ---------- Notifications ----------
create table if not exists public.abonnements_push (
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null,
  cles          jsonb not null,
  cree_le       timestamptz not null default now(),
  primary key (user_id, endpoint)
);

-- =====================================================================
-- Sécurité : chacun ne voit que ce qu'il a le droit de voir.
-- Le serveur (fonctions Edge avec la clé service_role) passe outre ces règles.
-- =====================================================================
alter table public.ligues           enable row level security;
alter table public.clubs_ligue      enable row level security;
alter table public.ordres           enable row level security;
alter table public.encheres         enable row level security;
alter table public.gazettes         enable row level security;
alter table public.echanges         enable row level security;
alter table public.courrier         enable row level security;
alter table public.abonnements_push enable row level security;

-- Suis-je membre de cette ligue ? Quel est mon club ?
create or replace function public.est_membre(l uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from clubs_ligue where ligue_id = l and user_id = auth.uid());
$$;
create or replace function public.mon_club(l uuid) returns integer
language sql stable security definer set search_path = public as $$
  select club_index from clubs_ligue where ligue_id = l and user_id = auth.uid();
$$;

-- Ligues : visibles par leurs membres et leur commissaire ; on les crée et les modifie par le serveur.
drop policy if exists "ligue lisible par ses membres" on public.ligues;
create policy "ligue lisible par ses membres" on public.ligues
  for select using (public.est_membre(id) or commissaire = auth.uid());

-- Clubs de la ligue : visibles par les membres de la ligue.
drop policy if exists "clubs lisibles par les membres" on public.clubs_ligue;
create policy "clubs lisibles par les membres" on public.clubs_ligue
  for select using (public.est_membre(ligue_id));

-- Ordres : chacun lit et écrit uniquement les siens, et seulement pour une journée pas encore jouée.
drop policy if exists "mes ordres" on public.ordres;
create policy "mes ordres" on public.ordres
  for all using (club_index = public.mon_club(ligue_id))
  with check (club_index = public.mon_club(ligue_id)
              and journee > (select coalesce(version, 0) from public.ligues where id = ligue_id));

-- Enchères : chacun ne voit et ne modifie que ses propres mises.
drop policy if exists "mes encheres" on public.encheres;
create policy "mes encheres" on public.encheres
  for all using (club_index = public.mon_club(ligue_id))
  with check (club_index = public.mon_club(ligue_id));

-- Gazettes : lisibles par tous les membres (on peut lire les autres matchs).
drop policy if exists "gazettes lisibles par les membres" on public.gazettes;
create policy "gazettes lisibles par les membres" on public.gazettes
  for select using (public.est_membre(ligue_id));

-- Échanges : visibles par les deux clubs concernés ; on propose en son nom ; le destinataire répond.
drop policy if exists "echanges visibles" on public.echanges;
create policy "echanges visibles" on public.echanges
  for select using (public.mon_club(ligue_id) in (de_club, vers_club));
drop policy if exists "proposer un echange" on public.echanges;
create policy "proposer un echange" on public.echanges
  for insert with check (de_club = public.mon_club(ligue_id) and statut = 'proposee');
drop policy if exists "repondre a un echange" on public.echanges;
create policy "repondre a un echange" on public.echanges
  for update using (public.mon_club(ligue_id) in (de_club, vers_club))
  with check (statut in ('acceptee','refusee','annulee'));

-- Courrier : lisible par les membres ; chacun écrit en son nom.
drop policy if exists "courrier lisible" on public.courrier;
create policy "courrier lisible" on public.courrier
  for select using (public.est_membre(ligue_id));
drop policy if exists "ecrire au courrier" on public.courrier;
create policy "ecrire au courrier" on public.courrier
  for insert with check (club_index = public.mon_club(ligue_id));

-- Notifications : chacun gère ses abonnements.
drop policy if exists "mes abonnements" on public.abonnements_push;
create policy "mes abonnements" on public.abonnements_push
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Index utiles
create index if not exists idx_ligues_echeance on public.ligues (echeance) where phase in ('draft','saison','inter');
create index if not exists idx_echanges_ligue on public.echanges (ligue_id, statut);
