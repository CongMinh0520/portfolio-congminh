-- Song ngữ Việt / Anh (Admin → Ngôn ngữ). Chạy một lần trong Supabase → SQL Editor.
-- Mỗi bảng thêm cột `en` lưu bản English của các ô chữ; ô nào trống thì trang hiện bản Tiếng Việt.
alter table public.projects add column if not exists en jsonb not null default '{}'::jsonb;
alter table public.skills add column if not exists en jsonb not null default '{}'::jsonb;
alter table public.jobs add column if not exists en jsonb not null default '{}'::jsonb;
alter table public.footer_links add column if not exists en jsonb not null default '{}'::jsonb;
alter table public.settings add column if not exists en jsonb not null default '{}'::jsonb;
alter table public.settings add column if not exists lang_default text not null default 'vi';
alter table public.settings add column if not exists lang_switch boolean not null default true;
-- Menu footer mẫu: điền sẵn bản English (chỉ áp dụng cho các mục mẫu chưa có bản English)
update public.footer_links set en = jsonb_build_object('label', case label
    when 'Trang chủ' then 'Home' when 'Kỹ năng' then 'Skills' when 'Kinh nghiệm' then 'Experience'
    when 'Dự án' then 'Projects' when 'Blog' then 'Blog' end)
  where en = '{}'::jsonb and label in ('Trang chủ', 'Kỹ năng', 'Kinh nghiệm', 'Dự án', 'Blog');
