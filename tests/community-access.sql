-- Tests existing approved data within a rollback-only transaction.
-- No accounts, media files, credits, or persistent test fixtures are created.
begin;
create temporary table community_check as select id as post,creator_id as owner from public.loox_community_posts where status='approved' and visible limit 1;
grant select on community_check to anon,authenticated;
select set_config('request.jwt.claim.sub',(select owner::text from community_check),true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from community_check) then raise exception 'An approved post is needed for this test'; end if;
 delete from public.loox_post_likes where post_id=(select post from community_check) and user_id=auth.uid();
 insert into public.loox_post_likes(post_id,user_id) select post,auth.uid() from community_check;
 begin insert into public.loox_post_likes(post_id,user_id) select post,auth.uid() from community_check;raise exception 'Duplicate like allowed';exception when unique_violation then null;end;
 if not exists(select 1 from public.loox_post_likes where post_id=(select post from community_check) and user_id=auth.uid()) then raise exception 'Like not saved';end if;
 delete from public.loox_post_likes where post_id=(select post from community_check) and user_id=auth.uid();
 begin insert into public.loox_creator_follows(follower_id,creator_id) values(auth.uid(),auth.uid());raise exception 'Self-follow allowed';exception when check_violation or insufficient_privilege then null;end;
 perform public.loox_manage_post((select post from community_check),'hide');
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.loox_community_posts where id=(select post from community_check)) then raise exception 'Hidden post visible';end if;
 begin insert into public.loox_post_likes(post_id,user_id) select post,owner from community_check;raise exception 'Anonymous like allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
 begin perform public.loox_manage_post((select post from community_check),'show');raise exception 'Foreign post mutation allowed';exception when raise_exception then if sqlerrm<>'Post not found' then raise;end if;end;
 begin perform public.loox_review_creation((select post from community_check),'approved');raise exception 'Non-admin review allowed';exception when raise_exception then if sqlerrm<>'Administrator access required' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select owner::text from community_check),true);
set local role authenticated;
select public.loox_manage_post(post,'edit','Private prompt test',false) from community_check;
do $$ begin
 if exists(select 1 from public.loox_community_posts where id=(select post from community_check) and (shared_prompt is not null or status<>'pending')) then raise exception 'Prompt privacy/moderation failed';end if;
end $$;
rollback;
