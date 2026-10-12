-- Dành cho người ĐÃ chạy schema.sql / migration-footer.sql trước đó: chạy file này để thêm tính năng ẩn/hiện.

-- ===== Ẩn / hiện nội dung =====
-- Mỗi mục trong danh sách có công tắc "visible"; các trường ở "Thông tin chung" ẩn được qua cột "hidden"
do $$
declare t text;
begin
  foreach t in array array['projects','skills','jobs','posts','footer_links','socials'] loop
    execute format('alter table public.%I add column if not exists visible boolean not null default true', t);
  end loop;
end $$;
alter table public.settings add column if not exists hidden text[] not null default '{}';
