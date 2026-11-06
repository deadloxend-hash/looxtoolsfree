-- Additive session metadata. Jobs and private result files remain authoritative.
create table public.loox_media_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(title) between 1 and 120),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,user_id)
);
create table public.loox_media_entries (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null unique,
 media_type text not null check(media_type in ('image','video')),
 prompt text not null check(length(prompt) between 1 and 1200),
 model_id text,
 model_name text not null,
 ratio text check(ratio in ('1:1','16:9','9:16','4:3','3:4')),
 settings jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 foreign key(session_id,user_id) references public.loox_media_sessions(id,user_id) on delete cascade
);
create index loox_media_sessions_recent on public.loox_media_sessions(user_id,updated_at desc);
create index loox_media_entries_order on public.loox_media_entries(session_id,created_at,id);
alter table public.loox_media_sessions enable row level security;
alter table public.loox_media_entries enable row level security;
revoke all on public.loox_media_sessions,public.loox_media_entries from anon,authenticated;
grant select,insert,update,delete on public.loox_media_sessions to authenticated;
grant select,insert,delete on public.loox_media_entries to authenticated;
create policy own_select on public.loox_media_sessions for select to authenticated using ((select auth.uid())=user_id);
create policy own_insert on public.loox_media_sessions for insert to authenticated with check ((select auth.uid())=user_id);
create policy own_update on public.loox_media_sessions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy own_delete on public.loox_media_sessions for delete to authenticated using ((select auth.uid())=user_id);
create policy own_select on public.loox_media_entries for select to authenticated using ((select auth.uid())=user_id);
create policy own_insert on public.loox_media_entries for insert to authenticated with check ((select auth.uid())=user_id);
create policy own_delete on public.loox_media_entries for delete to authenticated using ((select auth.uid())=user_id);
-- Each old job becomes a recoverable session; never guess unavailable settings.
insert into public.loox_media_sessions(id,user_id,title,created_at,updated_at)
 select id,user_id,left(coalesce(nullif(prompt,''),'Earlier generation'),120),created_at,created_at
 from public.loox_jobs where operation in ('generate','generate_video') or operation like 'image_%';
insert into public.loox_media_entries(id,session_id,user_id,request_id,media_type,prompt,model_name,created_at)
 select j.id,j.id,j.user_id,j.request_id,case when j.operation='generate_video' then 'video' else 'image' end,
 coalesce(nullif(j.prompt,''),'Earlier generation'),case when j.operation='generate_video' then 'Wan 2.1' when j.operation='generate' then 'FLUX.1 Schnell' else 'Earlier image model' end,j.created_at
 from public.loox_jobs j join public.loox_media_sessions s on s.id=j.id;

-- Agent text conversations retain their existing backend and owner-only storage.
grant select on public.loox_chat_threads to authenticated;
grant update(title) on public.loox_chat_threads to authenticated;
create policy own_session_select on public.loox_chat_threads for select to authenticated using ((select auth.uid())=user_id);
create policy own_session_rename on public.loox_chat_threads for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
