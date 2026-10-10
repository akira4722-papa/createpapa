-- =========================================================
-- わが家の記録帳：予定テーブル
-- Supabase SQL Editor でそのまま実行してください
-- =========================================================

create table if not exists public.family_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    event_date date not null,
    event_time time,
    title text not null,
    category text not null default 'family',
    created_at timestamptz not null default now(),
    constraint family_events_category_check
        check (category in ('child', 'family', 'work', 'home', 'travel', 'pet'))
);


-- 日付検索を速くする
create index if not exists family_events_date_idx
    on public.family_events (user_id, event_date, event_time);


-- =========================================================
-- RLS
-- =========================================================

alter table public.family_events enable row level security;


-- 既存の権限を一度取り除く
revoke all on table public.family_events from anon, authenticated;


-- ログイン済みユーザーだけCRUD可能
grant select, insert, update, delete
    on table public.family_events
    to authenticated;


-- =========================================================
-- SELECT
-- 自分が登録した予定だけ取得可能
-- =========================================================

drop policy if exists "family_events_select_own" on public.family_events;

create policy "family_events_select_own"
on public.family_events
for select
to authenticated
using ((select auth.uid()) = user_id);


-- =========================================================
-- INSERT
-- 自分のuser_idでのみ登録可能
-- =========================================================

drop policy if exists "family_events_insert_own" on public.family_events;

create policy "family_events_insert_own"
on public.family_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);


-- =========================================================
-- UPDATE
-- 自分の予定だけ変更可能
-- =========================================================

drop policy if exists "family_events_update_own" on public.family_events;

create policy "family_events_update_own"
on public.family_events
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


-- =========================================================
-- DELETE
-- 自分の予定だけ削除可能
-- =========================================================

drop policy if exists "family_events_delete_own" on public.family_events;

create policy "family_events_delete_own"
on public.family_events
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- =========================================================
-- 確認
-- =========================================================

select
    column_name,
    data_type,
    is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'family_events'
order by ordinal_position;
