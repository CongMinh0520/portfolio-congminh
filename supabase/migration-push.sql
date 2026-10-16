-- ===== Thông báo đẩy (Web Push) cho Admin =====
-- Cần hàm public.is_admin(): cài mới bằng schema.sql thì đã có; bản cũ chạy migration-admin-lockdown.sql trước.
-- Mỗi thiết bị bấm "Bật trên thiết bị này" ở Admin → Cài đặt → Thông báo lưu 1 dòng.
-- Hàm gui-tin-nhan / nhan-bai đọc bảng này (bằng service role) để gửi thông báo kể cả khi đã đóng Admin.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  label text not null default '' check (char_length(label) <= 120)
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "admin all" on public.push_subscriptions;
create policy "admin all" on public.push_subscriptions for all to authenticated using (public.is_admin()) with check (public.is_admin());
