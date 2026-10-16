-- Dành cho người ĐÃ chạy schema.sql trước đó: chỉ chạy file này để thêm phần footer.
-- Cần hàm public.is_admin(): cài mới bằng schema.sql thì đã có; bản cũ chạy migration-admin-lockdown.sql trước.

-- ===== Footer: menu, mạng xã hội, thông tin chung =====
create table if not exists public.footer_links (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  label text not null,
  href text default '#',
  created_at timestamptz default now()
);
create table if not exists public.socials (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  label text not null,
  url text default '',
  created_at timestamptz default now()
);
-- Bảng 1 dòng duy nhất (id luôn = 1)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  footer_tagline text default '',
  availability text default '',
  email text default '',
  phone text default '',
  address text default '',
  working_hours text default '',
  cv_url text default '',
  copyright text default '',
  footer_note text default ''
);

do $$
declare t text;
begin
  foreach t in array array['footer_links','socials','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Dữ liệu mẫu (chỉ chèn khi bảng còn trống, chạy lại nhiều lần không bị trùng)
insert into public.footer_links (sort, label, href)
select * from (values
  (1,'Trang chủ','#home'),(2,'Kỹ năng','#skills'),(3,'Kinh nghiệm','#experience'),(4,'Dự án','#work'),(5,'Blog','#blog')
) v(sort,label,href) where not exists (select 1 from public.footer_links);

insert into public.socials (sort, label, url)
select * from (values
  (1,'GitHub','https://github.com/'),(2,'LinkedIn','https://linkedin.com/'),(3,'Facebook','https://facebook.com/')
) v(sort,label,url) where not exists (select 1 from public.socials);

insert into public.settings (id, footer_tagline, availability, email, phone, address, working_hours, copyright, footer_note)
values (1,
  'Software Tester — giúp sản phẩm chạy ổn định, mượt mà và đáng tin cậy.',
  'Đang nhận dự án freelance / việc làm QA',
  'congminh@example.com', '+84 900 000 000', 'TP. Hồ Chí Minh, Việt Nam',
  'Thứ 2 – Thứ 6 · 9:00 – 18:00',
  '© 2026 Công Minh. All rights reserved.',
  'Thiết kế & xây dựng với React, Tailwind và Supabase.')
on conflict (id) do nothing;
