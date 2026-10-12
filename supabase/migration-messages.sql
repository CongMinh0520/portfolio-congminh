-- Chạy file này để có Hộp thư: lưu tin nhắn từ form Liên hệ (Admin → Tin nhắn).
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  read boolean not null default false,
  page text not null default '',
  user_agent text not null default ''
);
alter table public.messages enable row level security;
-- Khách KHÔNG đọc/ghi trực tiếp được; tin nhắn chỉ vào qua hàm gui-tin-nhan (đã kiểm tra chống spam).
drop policy if exists "admin all" on public.messages;
create policy "admin all" on public.messages for all to authenticated using (true) with check (true);
-- Bật Realtime để Admin nhận thông báo ngay khi có tin nhắn mới
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
