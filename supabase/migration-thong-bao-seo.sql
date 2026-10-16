-- Thông báo (email + trình duyệt), blog song ngữ, bản chính cho bài đăng lại. Chạy một lần trong Supabase → SQL Editor.
-- Cần hàm public.is_admin(): cài mới bằng schema.sql thì đã có; bản cũ chạy migration-admin-lockdown.sql trước.
-- Cài đặt riêng của Admin (VD email nhận thông báo): KHÔNG cho khách đọc, khác với bảng settings công khai.
create table if not exists public.admin_settings (
  id int primary key default 1,
  notify jsonb not null default '{}'::jsonb
);
alter table public.admin_settings enable row level security;
drop policy if exists "admin all" on public.admin_settings;
create policy "admin all" on public.admin_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.admin_settings (id) values (1) on conflict (id) do nothing;
-- Bài viết: bản English + "bản gốc ở nơi khác là bản chính"
alter table public.posts add column if not exists en jsonb not null default '{}'::jsonb;
alter table public.posts add column if not exists canonical_source boolean not null default false;
