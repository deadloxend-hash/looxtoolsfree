-- Run against an existing LOOX database with at least one media session.
-- All test writes are rolled back. No auth users or media files are changed.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.loox_media_sessions limit 1),true);
set local role authenticated;
do $$
declare session uuid; entry uuid;
begin
 if not exists(select 1 from public.loox_media_sessions) then raise exception 'Owner cannot read sessions'; end if;
 insert into public.loox_media_sessions(user_id,title) values(auth.uid(),'Session isolation test') returning id into session;
 insert into public.loox_media_entries(session_id,user_id,request_id,media_type,prompt,model_name)
 values(session,auth.uid(),gen_random_uuid(),'image','Test request','Test model') returning id into entry;
 update public.loox_media_sessions set title='Renamed test' where id=session;
 if not exists(select 1 from public.loox_media_sessions where id=session and title='Renamed test') then raise exception 'Owner rename failed'; end if;
 begin
  insert into public.loox_media_entries(session_id,user_id,request_id,media_type,prompt,model_name)
  values(session,'00000000-0000-0000-0000-000000000001',gen_random_uuid(),'image','Forbidden','Test');
  raise exception 'Cross-owner insert allowed';
 exception when insufficient_privilege then null;
 end;
 delete from public.loox_media_entries where id=entry;
 delete from public.loox_media_sessions where id=session;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if exists(select 1 from public.loox_media_sessions) or exists(select 1 from public.loox_media_entries) or exists(select 1 from public.loox_chat_threads) then raise exception 'Cross-account read allowed'; end if;
end $$;
rollback;
