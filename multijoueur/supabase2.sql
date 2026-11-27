-- =====================================================================
-- Wood Bowl : complément pour le serveur de ligue (à coller APRÈS supabase.sql).
-- À coller tel quel dans Supabase › SQL Editor › New query, puis « Run ». Rejouable sans risque.
-- =====================================================================

-- ---------- État complet de chaque partie : PRIVÉ, lu et écrit par le serveur seulement ----------
-- (profils cachés des joueurs, intentions de l'ordinateur, vraies notes du marché, caisses de tout le monde)
create table if not exists public.etats_prives (
  ligue_id   uuid primary key references public.ligues(id) on delete cascade,
  etat       jsonb not null,
  rev        integer not null default 1,              -- augmente à chaque écriture : empêche deux écritures de se marcher dessus
  maj        timestamptz not null default now()
);
alter table public.etats_prives enable row level security;   -- aucune règle : personne d'autre que le serveur n'y accède
revoke all on public.etats_prives from anon, authenticated;
grant all on public.etats_prives to service_role;

-- ---------- Ce que chaque club est seul à voir : sa gestion, sa composition, le marché vu par son chineur ----------
create table if not exists public.vues_club (
  ligue_id   uuid not null references public.ligues(id) on delete cascade,
  club_index integer not null,
  vue        jsonb not null,
  maj        timestamptz not null default now(),
  primary key (ligue_id, club_index)
);
alter table public.vues_club enable row level security;
drop policy if exists "ma vue" on public.vues_club;
create policy "ma vue" on public.vues_club
  for select using (club_index = public.mon_club(ligue_id));
revoke all on public.vues_club from anon, authenticated;
grant select on public.vues_club to authenticated;
grant all on public.vues_club to service_role;

-- ---------- Membres : adjoints du commissaire, clubs sans propriétaire ----------
alter table public.clubs_ligue alter column user_id drop not null;          -- un club exclu ou abandonné passe à l'ordinateur
alter table public.clubs_ligue add column if not exists adjoint boolean not null default false;  -- peut lancer / mettre en pause

-- ---------- Codes de reprise : donnés par le commissaire à un nouvel ami pour reprendre un club. PRIVÉ (serveur seulement) ----------
create table if not exists public.reprises (
  ligue_id   uuid not null references public.ligues(id) on delete cascade,
  club_index integer not null,
  code       text not null unique,
  cree_le    timestamptz not null default now(),
  primary key (ligue_id, club_index)
);
alter table public.reprises enable row level security;
revoke all on public.reprises from anon, authenticated;
grant all on public.reprises to service_role;

-- ---------- Comptes : l'empreinte du code secret de 4 mots, pour retrouver ses clubs sur un autre appareil. PRIVÉ ----------
create table if not exists public.comptes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code_hash  text not null unique,
  cree_le    timestamptz not null default now()
);
alter table public.comptes enable row level security;
revoke all on public.comptes from anon, authenticated;
grant all on public.comptes to service_role;
-- réunit deux comptes (ancien appareil -> nouvel appareil), tout ou rien
create or replace function public.transferer_compte(ancien uuid, nouveau uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from clubs_ligue a join clubs_ligue b on a.ligue_id = b.ligue_id where a.user_id = ancien and b.user_id = nouveau) then
    return false;
  end if;
  update clubs_ligue set user_id = nouveau where user_id = ancien;
  update ligues set commissaire = nouveau where commissaire = ancien;
  delete from abonnements_push where user_id = ancien;
  delete from comptes where user_id = nouveau;
  update comptes set user_id = nouveau where user_id = ancien;
  return true;
end $$;
revoke execute on function public.transferer_compte(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.transferer_compte(uuid, uuid) to service_role;

-- ---------- Les enchères d'un tour clos et les ordres d'une journée jouée ne se modifient plus ----------
-- (le nom du tour en cours est publié par le serveur dans ligues.etat -> 'encheres' ->> 'tour')
drop policy if exists "mes encheres" on public.encheres;
create policy "mes encheres" on public.encheres
  for all using (club_index = public.mon_club(ligue_id))
  with check (club_index = public.mon_club(ligue_id)
              and tour = (select etat -> 'encheres' ->> 'tour' from public.ligues where id = ligue_id));

-- ---------- « Je suis passé » : pour l'écran des membres ----------
create or replace function public.passage(l uuid) returns void
language sql security definer set search_path = public as $$
  update clubs_ligue set dernier_passage = now() where ligue_id = l and user_id = auth.uid();
$$;
revoke execute on function public.passage(uuid) from public, anon;
grant  execute on function public.passage(uuid) to authenticated;

-- ---------- L'horloge : chaque minute, si une ligue est à l'heure, on réveille le serveur ----------
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('wood-bowl-tick', '* * * * *', $cron$
  select net.http_post(
    url     := 'https://gfsritybqwrkgujilser.supabase.co/functions/v1/tick',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb)
  where exists (select 1 from public.ligues where echeance <= now() and phase in ('draft','saison','inter'));
$cron$);
