-- AI Todo Manager — Supabase schema
-- PRD 데이터 구조 기준. Supabase SQL Editor에서 한 번에 실행 가능.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.todo_priority as enum ('high', 'medium', 'low');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.todo_category as enum ('업무', '개인', '건강', '학습', '기타');
exception
  when duplicate_object then null;
end $$;

-- 기존 enum에 '건강'이 없으면 추가 (이미 생성된 DB용)
do $$ begin
  alter type public.todo_category add value if not exists '건강';
exception
  when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- public.users — auth.users 와 1:1 프로필
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Auth 사용자와 1:1로 연결되는 앱 프로필';

-- UI 개인화 (글꼴·테마) — 브라우저를 바꿔도 동일 적용
alter table public.users
  add column if not exists ui_font text not null default 'maple';

alter table public.users
  add column if not exists ui_theme text not null default 'deep-teal';

alter table public.users
  add column if not exists avatar_url text;

comment on column public.users.avatar_url is '프로필 사진(공개 URL 또는 압축 data URL)';

-- ---------------------------------------------------------------------------
-- public.todos — 사용자별 할 일
-- ---------------------------------------------------------------------------
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  due_date timestamptz,
  priority public.todo_priority not null default 'medium',
  category public.todo_category not null default '기타',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.todos is '사용자별 할 일(CRUD) 테이블';

create index if not exists todos_user_id_idx on public.todos (user_id);
create index if not exists todos_user_due_date_idx on public.todos (user_id, due_date);
create index if not exists todos_user_completed_idx on public.todos (user_id, completed);
create index if not exists todos_user_priority_idx on public.todos (user_id, priority);

-- ---------------------------------------------------------------------------
-- updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
  before update on public.todos
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 회원가입 시 public.users 자동 생성
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS — public.users (소유자만 읽기/쓰기)
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users_delete_own" on public.users;
create policy "users_delete_own"
  on public.users
  for delete
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- RLS — public.todos (소유자만 읽기/쓰기)
-- ---------------------------------------------------------------------------
alter table public.todos enable row level security;

drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own"
  on public.todos
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own"
  on public.todos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own"
  on public.todos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own"
  on public.todos
  for delete
  to authenticated
  using (auth.uid() = user_id);
