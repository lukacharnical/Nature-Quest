create extension if not exists pgcrypto;


-- ==========================================
-- PROFILS
-- ==========================================

create table if not exists public.profiles (

    id uuid primary key
        references auth.users(id)
        on delete cascade,

    username text unique not null,

    role text not null default 'player'
        check (
            role in ('player', 'admin')
        ),

    points integer not null default 0,

    created_at timestamptz
        default now()

);


-- ==========================================
-- QUÊTES
-- ==========================================

create table if not exists public.quests (

    id uuid primary key
        default gen_random_uuid(),

    name text not null,

    description text default '',

    question_type text not null default 'creative'
        check (
            question_type
            in (
                'creative',
                'text',
                'choice'
            )
        ),

    question text not null,

    options jsonb
        not null default '[]',

    correct_answer text
        default '',

    latitude double precision
        not null,

    longitude double precision
        not null,

    qr_code text unique
        not null,

    points integer
        not null default 10,

    active boolean
        not null default true,

    next_quest_id uuid
        references public.quests(id)
        on delete set null,

    created_by uuid
        references public.profiles(id)
        on delete set null,

    created_at timestamptz
        default now()

);


-- ==========================================
-- PROGRESSION
-- ==========================================

create table if not exists public.quest_progress (

    player_id uuid
        references public.profiles(id)
        on delete cascade,

    quest_id uuid
        references public.quests(id)
        on delete cascade,

    unlocked boolean
        default true,

    completed boolean
        default false,

    completed_at timestamptz,

    primary key (
        player_id,
        quest_id
    )

);


-- ==========================================
-- RÉPONSES
-- ==========================================

create table if not exists public.answers (

    id uuid primary key
        default gen_random_uuid(),

    player_id uuid
        references public.profiles(id)
        on delete cascade,

    quest_id uuid
        references public.quests(id)
        on delete cascade,

    answer text not null,

    correct boolean
        default false,

    points_awarded integer
        default 0,

    created_at timestamptz
        default now()

);


-- ==========================================
-- CRÉATION AUTOMATIQUE DU PROFIL
-- ==========================================

create or replace function
public.handle_new_user()

returns trigger

language plpgsql

security definer

set search_path = public

as $$

declare

    username_value text;

begin

    username_value :=
        coalesce(
            nullif(
                trim(
                    new.raw_user_meta_data
                    ->>'username'
                ),
                ''
            ),

            split_part(
                new.email,
                '@',
                1
            )
        );


    if exists (

        select 1

        from profiles

        where username =
            username_value

    ) then

        username_value :=
            username_value
            || '_'
            || substr(
                new.id::text,
                1,
                6
            );

    end if;


    insert into profiles (
        id,
        username
    )

    values (
        new.id,
        username_value
    );


    return new;

end;

$$;


drop trigger if exists
on_auth_user_created
on auth.users;


create trigger
on_auth_user_created

after insert on auth.users

for each row

execute procedure
public.handle_new_user();


-- ==========================================
-- ADMIN
-- ==========================================

create or replace function
public.is_admin()

returns boolean

language sql

stable

security definer

set search_path = public

as $$

select exists (

    select 1

    from profiles

    where id = auth.uid()

    and role = 'admin'

);

$$;


-- ==========================================
-- SÉCURITÉ
-- ==========================================

alter table profiles
enable row level security;

alter table quests
enable row level security;

alter table quest_progress
enable row level security;

alter table answers
enable row level security;


-- ==========================================
-- PROFILS
-- ==========================================

create policy
"profile read own"

on profiles

for select

to authenticated

using (

    id = auth.uid()
    or public.is_admin()

);


create policy
"profile update own"

on profiles

for update

to authenticated

using (

    id = auth.uid()
    and role = 'player'

)

with check (

    id = auth.uid()
    and role = 'player'

);


-- ==========================================
-- QUÊTES
-- ==========================================

create policy
"quest read active"

on quests

for select

to anon, authenticated

using (

    active = true
    or public.is_admin()

);


create policy
"quest admin insert"

on quests

for insert

to authenticated

with check (
    public.is_admin()
);


create policy
"quest admin update"

on quests

for update

to authenticated

using (
    public.is_admin()
)

with check (
    public.is_admin()
);


create policy
"quest admin delete"

on quests

for delete

to authenticated

using (
    public.is_admin()
);


-- ==========================================
-- PROGRESSION
-- ==========================================

create policy
"progress read own"

on quest_progress

for select

to authenticated

using (

    player_id = auth.uid()
    or public.is_admin()

);


-- ==========================================
-- RÉPONSES
-- ==========================================

create policy
"answers read own"

on answers

for select

to authenticated

using (

    player_id = auth.uid()
    or public.is_admin()

);


-- ==========================================
-- VALIDATION D'UNE QUÊTE
-- ==========================================

create or replace function
public.submit_quest_answer(
    p_quest_id uuid,
    p_answer text
)

returns table(
    correct boolean,
    points_awarded integer,
    already_completed boolean
)

language plpgsql

security definer

set search_path = public

as $$

declare

    q quests%rowtype;

    is_correct boolean := false;

    awarded integer := 0;

    already_done boolean := false;

begin

    if auth.uid() is null then

        raise exception
            'Connexion requise';

    end if;


    select *
    into q

    from quests

    where id = p_quest_id

    and active = true;


    if not found then

        raise exception
            'Quête introuvable';

    end if;


    select
        coalesce(
            completed,
            false
        )

    into already_done

    from quest_progress

    where player_id =
        auth.uid()

    and quest_id =
        q.id;


    -- QUESTION LIBRE

    if q.question_type =
        'creative' then

        is_correct :=
            length(
                trim(
                    coalesce(
                        p_answer,
                        ''
                    )
                )
            ) > 0;


    -- QUESTION NORMALE

    else

        is_correct :=
            lower(
                trim(
                    coalesce(
                        p_answer,
                        ''
                    )
                )
            )

            =

            lower(
                trim(
                    coalesce(
                        q.correct_answer,
                        ''
                    )
                )
            )

            and q.correct_answer <> '';

    end if;


    -- PREMIÈRE RÉUSSITE

    if
        is_correct
        and not already_done
    then

        awarded :=
            q.points;


        insert into quest_progress (

            player_id,
            quest_id,
            unlocked,
            completed,
            completed_at

        )

        values (

            auth.uid(),
            q.id,
            true,
            true,
            now()

        )

        on conflict (
            player_id,
            quest_id
        )

        do update set

            completed = true,

            completed_at = now();


        update profiles

        set points =
            points + awarded

        where id =
            auth.uid();


        -- DÉBLOQUE LA PROCHAINE

        if q.next_quest_id
            is not null
        then

            insert into quest_progress (

                player_id,
                quest_id,
                unlocked

            )

            values (

                auth.uid(),
                q.next_quest_id,
                true

            )

            on conflict (
                player_id,
                quest_id
            )

            do update set

                unlocked = true;

        end if;

    end if;


    insert into answers (

        player_id,
        quest_id,
        answer,
        correct,
        points_awarded

    )

    values (

        auth.uid(),
        q.id,
        coalesce(
            p_answer,
            ''
        ),
        is_correct,
        awarded

    );


    return query

    select
        is_correct,
        awarded,
        already_done;

end;

$$;


-- ==========================================
-- AUTORISATIONS
-- ==========================================

grant select
on quests

to anon,
   authenticated;


grant select,
      update
on profiles

to authenticated;


grant select
on quest_progress,
   answers

to authenticated;


grant execute
on function
public.submit_quest_answer(
    uuid,
    text
)

to authenticated;


-- ==========================================
-- TRANSFORMER UN COMPTE EN ADMIN
-- ==========================================

-- Après avoir créé ton compte,
-- remplace TON_EMAIL par ton adresse.

-- update profiles p
-- set role = 'admin'
-- from auth.users u
-- where p.id = u.id
-- and u.email = 'TON_EMAIL';