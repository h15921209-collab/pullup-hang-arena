-- ============================================================
-- IRON BAR ARENA 單槓持久度競賽 - Supabase 資料表設定腳本
-- 請至 Supabase Dashboard -> SQL Editor 貼上並執行 (Run)
-- ============================================================

-- 1. 建立成績紀錄表
create table if not exists public.hang_records (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(trim(player_name)) between 1 and 24),
  duration_ms integer not null check (duration_ms > 0 and duration_ms <= 3600000),
  grip_type text not null default 'overhand' check (grip_type in ('overhand', 'underhand', 'mixed')),
  client_id text not null,
  is_manual boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. 建立索引以加速排行榜查詢
create index if not exists idx_hang_records_duration on public.hang_records (duration_ms desc);
create index if not exists idx_hang_records_created_at on public.hang_records (created_at desc);

-- 3. 啟用 Row Level Security (RLS)
alter table public.hang_records enable row level security;

-- 4. 允許所有人讀取排行榜
drop policy if exists "Allow public read" on public.hang_records;
create policy "Allow public read"
  on public.hang_records
  for select
  using (true);

-- 5. 允許所有人免註冊新增成績
drop policy if exists "Allow public insert" on public.hang_records;
create policy "Allow public insert"
  on public.hang_records
  for insert
  with check (true);

-- 6. 允許刪除紀錄（前端會比對本機 client_id，只對自己的紀錄顯示刪除鈕）
drop policy if exists "Allow public delete" on public.hang_records;
create policy "Allow public delete"
  on public.hang_records
  for delete
  using (true);

-- 7. 啟用 Realtime 即時同步排行榜
alter publication supabase_realtime add table public.hang_records;
