-- Chạy file này để có Hộp thư: lưu tin nhắn từ form Liên hệ (Admin → Tin nhắn).
-- Cần hàm public.is_admin(): cài mới bằng schema.sql thì đã có; bản cũ chạy migration-admin-lockdown.sql trước.
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
create policy "admin all" on public.messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Bật Realtime để Admin nhận thông báo ngay khi có tin nhắn mới
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
-- Trả lời ngay trong Admin: tin của Admin (email gửi khách / ghi chú nội bộ) nằm chung bảng, gom theo email khách.
alter table public.messages add column if not exists direction text not null default 'in';    -- in: khách gửi · out: Admin trả lời qua email · note: ghi chú nội bộ
alter table public.messages add column if not exists status text not null default '';         -- out: sent | external (soạn trong Gmail) | failed
alter table public.messages add column if not exists subject text not null default '';
alter table public.messages add column if not exists attachments jsonb not null default '[]'::jsonb; -- [{name, url, size, type}]
-- Mẫu trả lời nhanh + chữ ký (Admin → Tin nhắn → Mẫu trả lời)
-- (bảng admin_settings có từ migration-thong-bao-seo.sql; chưa chạy thì bỏ qua dòng này)
alter table if exists public.admin_settings add column if not exists reply jsonb not null default '{}'::jsonb;
