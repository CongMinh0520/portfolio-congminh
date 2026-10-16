-- Chạy file này để Blog nhận bài tự động từ Easy AI (Admin → Đăng bài tự động).
-- Cần hàm public.is_admin(): cài mới bằng schema.sql thì đã có; bản cũ chạy migration-admin-lockdown.sql trước.
alter table public.posts add column if not exists external_key text;
alter table public.posts add column if not exists slug text not null default '';
alter table public.posts add column if not exists source text not null default '';
create unique index if not exists posts_external_key_uniq on public.posts (external_key) where external_key is not null;

-- Bật Realtime cho bảng posts (Admin nhận thông báo bài mới, trang chủ tự hiện bài vừa duyệt)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;

-- Bản nháp / chờ duyệt chỉ người đăng nhập (Admin) đọc được; khách chỉ thấy bài đã đăng
drop policy if exists "public read" on public.posts;
create policy "public read" on public.posts for select using (visible = true or public.is_admin());

-- Thẻ bài viết
alter table public.posts add column if not exists tags text[] not null default '{}';
