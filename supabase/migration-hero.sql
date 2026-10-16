-- Chạy file này để: chỉnh phần đầu trang trong Admin, thêm ảnh bìa cho Dự án/Blog, và tạo kho ảnh tải lên.
-- Cần hàm public.is_admin(): cài mới bằng schema.sql thì đã có; bản cũ chạy migration-admin-lockdown.sql trước.

-- ===== Đầu trang tùy chỉnh + ảnh bìa + kho ảnh =====
alter table public.settings add column if not exists hero jsonb not null default '{}'::jsonb;
alter table public.projects add column if not exists image text not null default '';
alter table public.posts add column if not exists image text not null default '';

-- Kho ảnh công khai "media" (ảnh đại diện, ảnh bìa tải lên từ Admin)
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin write" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
-- Không cho người lạ liệt kê kho: link ảnh công khai (/object/public/...) vẫn chạy vì bucket public, chỉ Admin xem được danh sách file
drop policy if exists "media admin read" on storage.objects;
create policy "media admin read" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media admin write" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
