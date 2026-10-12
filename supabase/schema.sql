-- Chạy toàn bộ file này trong Supabase → SQL Editor → New query → Run

create table if not exists public.projects (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  title text not null,
  category text default '',
  description text default '',
  grad text default 'neon',
  link text default '',
  created_at timestamptz default now()
);
create table if not exists public.skills (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  icon text default '',
  title text not null,
  description text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);
create table if not exists public.jobs (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  period text default '',
  role text not null,
  description text default '',
  created_at timestamptz default now()
);
create table if not exists public.posts (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  title text not null,
  excerpt text default '',
  url text default '',
  created_at timestamptz default now()
);

-- Bảo mật (Row Level Security): ai cũng ĐỌC được, chỉ người đã đăng nhập mới GHI được
do $$
declare t text;
begin
  foreach t in array array['projects','skills','jobs','posts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- (Nội dung mẫu nằm ở cuối file, sau khi đã đủ các cột)

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
    execute format('create policy "admin write" on public.%I for all to authenticated using (true) with check (true)', t);
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
  'Manual QA Tester — giúp sản phẩm chạy ổn định và đáng tin cậy trước khi tới tay người dùng.',
  'Đang tìm vị trí QA Tester',
  'congminh@example.com', '+84 900 000 000', 'TP. Hồ Chí Minh, Việt Nam',
  'Thứ 2 – Thứ 6 · 9:00 – 18:00',
  '© 2026 Công Minh. All rights reserved.',
  'Thiết kế & xây dựng với React, Tailwind và Supabase.')
on conflict (id) do nothing;

-- ===== Ẩn / hiện nội dung =====
-- Mỗi mục trong danh sách có công tắc "visible"; các trường ở "Thông tin chung" ẩn được qua cột "hidden"
do $$
declare t text;
begin
  foreach t in array array['projects','skills','jobs','posts','footer_links','socials'] loop
    execute format('alter table public.%I add column if not exists visible boolean not null default true', t);
  end loop;
end $$;
alter table public.settings add column if not exists hidden text[] not null default '{footer_note}';

-- ===== Trang chi tiết cho Dự án và Blog =====
alter table public.projects add column if not exists content text not null default '';
alter table public.projects add column if not exists role text not null default '';
alter table public.projects add column if not exists duration text not null default '';
alter table public.projects add column if not exists tools text[] not null default '{}';
alter table public.posts add column if not exists content text not null default '';
alter table public.posts add column if not exists published_at date;

-- ===== Hiệu ứng chuột =====
alter table public.settings add column if not exists cursor_effect text not null default 'none';

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
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media admin write" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media');

-- ===== Nhận bài tự động (Easy AI) =====
alter table public.posts add column if not exists external_key text;
alter table public.posts add column if not exists slug text not null default '';
alter table public.posts add column if not exists source text not null default '';
create unique index if not exists posts_external_key_uniq on public.posts (external_key) where external_key is not null;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;
drop policy if exists "public read" on public.posts;
create policy "public read" on public.posts for select using (visible = true or auth.role() = 'authenticated');

-- ===== Thẻ bài viết =====
alter table public.posts add column if not exists tags text[] not null default '{}';

-- ===== Hộp thư (form Liên hệ) =====
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

-- ===== Song ngữ Việt / Anh =====
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

-- ===== Thương hiệu (logo, biểu tượng, favicon) =====
alter table public.settings add column if not exists brand jsonb not null default '{}'::jsonb;

-- ===== Trạng thái bài: Chờ duyệt / Bản nháp =====
alter table public.posts add column if not exists review boolean;

-- ===== Thông báo, blog song ngữ, bản chính =====
-- Cài đặt riêng của Admin (VD email nhận thông báo): KHÔNG cho khách đọc, khác với bảng settings công khai.
create table if not exists public.admin_settings (
  id int primary key default 1,
  notify jsonb not null default '{}'::jsonb
);
alter table public.admin_settings enable row level security;
drop policy if exists "admin all" on public.admin_settings;
create policy "admin all" on public.admin_settings for all to authenticated using (true) with check (true);
insert into public.admin_settings (id) values (1) on conflict (id) do nothing;
-- Bài viết: bản English + "bản gốc ở nơi khác là bản chính"
alter table public.posts add column if not exists en jsonb not null default '{}'::jsonb;
alter table public.posts add column if not exists canonical_source boolean not null default false;

-- ===== Thống kê lượt xem (Admin → Tổng quan) =====
-- Mỗi lượt xem trang chủ / blog / bài / dự án ghi 1 dòng. Không lưu IP; "visitor" là mã ngẫu nhiên trong trình duyệt khách.
-- Khách chỉ được GHI (không đọc được); chỉ Admin đã đăng nhập đọc số liệu qua hàm view_stats.
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null default 'home' check (kind in ('home', 'blog', 'post', 'project', 'notfound')),
  ref_id bigint,
  path text not null default '/' check (char_length(path) <= 300),
  source text check (char_length(source) <= 80),
  device text not null default 'desktop' check (device in ('mobile', 'tablet', 'desktop')),
  lang text not null default 'vi' check (lang in ('vi', 'en')),
  visitor text not null default '' check (char_length(visitor) <= 40)
);
create index if not exists page_views_created_at_idx on public.page_views (created_at);
alter table public.page_views enable row level security;
drop policy if exists "khach ghi luot xem" on public.page_views;
create policy "khach ghi luot xem" on public.page_views for insert to anon
  with check (created_at between now() - interval '5 minutes' and now() + interval '5 minutes');
drop policy if exists "admin doc luot xem" on public.page_views;
create policy "admin doc luot xem" on public.page_views for select to authenticated using (true);
drop policy if exists "admin xoa luot xem" on public.page_views;
create policy "admin xoa luot xem" on public.page_views for delete to authenticated using (true);

-- Số liệu cho dashboard: days ngày gần nhất (tính theo giờ Việt Nam) và kỳ trước đó để so sánh.
create or replace function public.view_stats(days integer default 30)
returns jsonb
language sql stable security invoker set search_path = public
as $$
  with r as (
    select n, today,
           (today - make_interval(days => n - 1)) at time zone 'Asia/Ho_Chi_Minh' as since,
           (today - make_interval(days => 2 * n - 1)) at time zone 'Asia/Ho_Chi_Minh' as prev_since
    from (select greatest(1, least(coalesce(days, 30), 366)) as n,
                 date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') as today) x
  ),
  v as (
    select pv.*, (pv.created_at at time zone 'Asia/Ho_Chi_Minh')::date as d, pv.created_at >= r.since as is_cur
    from public.page_views pv, r
    where pv.created_at >= r.prev_since
  ),
  cur as (select * from v where is_cur),
  prev as (select * from v where not is_cur)
  select jsonb_build_object(
    'days', (select n from r),
    'views', (select count(*) from cur),
    'visitors', (select count(distinct nullif(visitor, '')) from cur),
    'prev_views', (select count(*) from prev),
    'prev_visitors', (select count(distinct nullif(visitor, '')) from prev),
    'post_views', (select count(*) from cur where kind = 'post'),
    'prev_post_views', (select count(*) from prev where kind = 'post'),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', g.d, 'views', coalesce(c.views, 0), 'visitors', coalesce(c.visitors, 0)) order by g.d), '[]'::jsonb)
      from r
      cross join lateral generate_series(r.today - make_interval(days => r.n - 1), r.today, interval '1 day') as s(t)
      cross join lateral (select s.t::date as d) g
      left join (select d, count(*) as views, count(distinct nullif(visitor, '')) as visitors from cur group by d) c on c.d = g.d
    ),
    'pages', (
      select coalesce(jsonb_agg(to_jsonb(p) order by p.views desc), '[]'::jsonb)
      from (select kind, ref_id, min(path) as path, count(*) as views from cur where kind <> 'notfound'
            group by kind, ref_id order by count(*) desc limit 8) p
    ),
    'sources', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.visits desc), '[]'::jsonb)
      from (select source, count(*) as visits from cur where source is not null
            group by source order by count(*) desc limit 6) s
    ),
    'devices', (select coalesce(jsonb_object_agg(device, c), '{}'::jsonb) from (select device, count(*) as c from cur group by device) x),
    'langs', (select coalesce(jsonb_object_agg(lang, c), '{}'::jsonb) from (select lang, count(*) as c from cur group by lang) x),
    'broken', (select count(*) from cur where kind = 'notfound')
  );
$$;
revoke execute on function public.view_stats(integer) from public, anon;
grant execute on function public.view_stats(integer) to authenticated;

-- ===== Sao lưu / khôi phục (Admin → Cài đặt → Sao lưu) =====
-- Khôi phục giữ nguyên id cũ (link bài /blog/ten-bai-12 không đổi). KHÔNG bao giờ xóa dòng nào.
-- overwrite = false: chỉ thêm lại dòng đã mất (id chưa có).  overwrite = true: thêm lại + ghi đè dòng cùng id.
-- Chỉ Admin đã đăng nhập gọi được.
create or replace function public.restore_backup(tbl text, rows jsonb, overwrite boolean default false)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  r jsonb;
  cols text[];
  n integer := 0;
  done integer;
  ident boolean;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if tbl not in ('settings', 'admin_settings', 'posts', 'projects', 'skills', 'jobs', 'footer_links', 'socials', 'messages') then
    raise exception 'table % is not restorable', tbl;
  end if;
  if jsonb_typeof(rows) <> 'array' then raise exception 'rows must be an array'; end if;
  select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = tbl and column_name = 'id' and is_identity = 'YES') into ident;
  for r in select * from jsonb_array_elements(rows) loop
    if jsonb_typeof(r) <> 'object' or r->>'id' is null then continue; end if;
    -- chỉ lấy các cột vừa có trong file vừa có trong bảng (file cũ thiếu cột mới vẫn khôi phục được)
    select array_agg(c.column_name::text order by c.ordinal_position) into cols
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = tbl and r ? c.column_name;
    execute format(
      'insert into public.%1$I (%2$s) %3$s select %2$s from jsonb_populate_record(null::public.%1$I, $1) on conflict (id) do %4$s',
      tbl,
      (select string_agg(quote_ident(x), ', ') from unnest(cols) x),
      case when ident then 'overriding system value' else '' end,
      case when overwrite and array_length(cols, 1) > 1
        then 'update set ' || (select string_agg(format('%1$I = excluded.%1$I', x), ', ') from unnest(cols) x where x <> 'id')
        else 'nothing' end
    ) using r;
    get diagnostics done = row_count;
    n := n + done;
  end loop;
  -- id tự tăng tiếp tục sau id lớn nhất, để bài mới không trùng id vừa khôi phục
  if ident then
    execute format('select setval(pg_get_serial_sequence(%L, %L), greatest((select coalesce(max(id), 0) from public.%I), 1))', 'public.' || tbl, 'id', tbl);
  end if;
  return n;
end $$;
revoke execute on function public.restore_backup(text, jsonb, boolean) from public, anon;
grant execute on function public.restore_backup(text, jsonb, boolean) to authenticated;

-- ===== Thông báo đẩy (Web Push) cho Admin =====
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
create policy "admin all" on public.push_subscriptions for all to authenticated using (true) with check (true);

-- ===== Nội dung mẫu (Manual QA Tester) — chỉ dùng khi cài mới; sửa / xóa trong Admin =====
insert into public.skills (sort, icon, title, description, tags, en) values
 (1, $c$🔍$c$, $c$Manual Testing$c$, $c$Đọc hiểu yêu cầu, viết test case và checklist, test chức năng, giao diện, regression và hỗ trợ UAT trước khi phát hành.$c$, ARRAY[$c$Test case$c$, $c$Exploratory$c$, $c$Regression$c$, $c$UAT$c$]::text[], $c${"title":"Manual Testing","description":"Analysing requirements, writing test cases and checklists, testing functionality, UI and regression, and supporting UAT before release.","tags":["Test cases","Exploratory","Regression","UAT"]}$c$::jsonb),
 (2, $c$🔌$c$, $c$API & Dữ liệu$c$, $c$Kiểm tra API thủ công bằng Postman, đối chiếu dữ liệu bằng SQL, xem request và lỗi trên DevTools để khoanh vùng bug.$c$, ARRAY[$c$Postman$c$, $c$SQL$c$, $c$DevTools$c$]::text[], $c${"title":"API & Data","description":"Testing APIs manually with Postman, checking data with SQL, and reading requests and errors in DevTools to narrow down bugs.","tags":["Postman","SQL","DevTools"]}$c$::jsonb),
 (3, $c$🐞$c$, $c$Quản lý bug & tài liệu$c$, $c$Báo bug rõ ràng có bước tái hiện và bằng chứng, theo dõi đến khi sửa xong. Đang học thêm automation để rút ngắn thời gian regression.$c$, ARRAY[$c$Jira$c$, $c$Trello$c$, $c$TestRail$c$, $c$Google Sheets$c$]::text[], $c${"title":"Bug tracking & documentation","description":"Clear bug reports with reproduction steps and evidence, followed through until fixed. Currently learning automation to shorten regression time.","tags":["Jira","Trello","TestRail","Google Sheets"]}$c$::jsonb);
insert into public.jobs (sort, period, role, description, en) values
 (1, $c$2025 – Hiện tại$c$, $c$QA Tester (Manual)$c$, $c$Công ty ABC — kiểm thử ứng dụng launcher iOS/Android tích hợp ví blockchain và NFT: viết test case, test trên nhiều thiết bị, báo và theo dõi bug trên Jira.$c$, $c${"period":"2025 – Present","role":"QA Tester (Manual)","description":"ABC Company — testing an iOS/Android launcher app with a built-in blockchain wallet and NFTs: writing test cases, testing across many devices, reporting and tracking bugs in Jira."}$c$::jsonb),
 (2, $c$2024 – 2025$c$, $c$Junior Tester$c$, $c$Công ty XYZ — kiểm thử website thương mại điện tử và phần mềm quản lý nhân sự; viết test case trên Google Sheets/TestRail, kiểm tra API bằng Postman.$c$, $c${"period":"2024 – 2025","role":"Junior Tester","description":"XYZ Company — testing an e-commerce website and an HR management system; writing test cases in Google Sheets/TestRail and checking APIs with Postman."}$c$::jsonb);
insert into public.projects (sort, category, title, description, grad, link, role, duration, tools, content, en) values
 (1, $c$BLOCKCHAIN · WALLET & NFT$c$, $c$Kiểm thử launcher tích hợp ví và NFT$c$, $c$Test thủ công ứng dụng launcher iOS/Android có ví blockchain: tạo/khôi phục ví, gửi nhận token, hiển thị NFT.$c$, $c$neon$c$, $c$$c$, $c$QA Tester (Manual)$c$, $c$Đang tham gia$c$, ARRAY[$c$Jira$c$, $c$Google Sheets$c$, $c$Postman$c$, $c$Testnet$c$]::text[], $c$## Bối cảnh
Ứng dụng launcher cho iOS và Android, tích hợp sẵn ví blockchain để người dùng giữ token và xem bộ sưu tập NFT ngay trên điện thoại.

## Mình đã làm gì
- Viết test case cho các luồng chính: **tạo ví, khôi phục ví bằng cụm từ khôi phục**, đặt mã PIN, khóa/mở ứng dụng
- Test gửi và nhận token trên **mạng thử nghiệm (testnet)**, kiểm tra số dư, phí giao dịch và trạng thái chờ / thành công / thất bại
- Kiểm tra hiển thị NFT: ảnh, tên, thông tin bộ sưu tập, trường hợp mất mạng hoặc ảnh lỗi
- Test trên nhiều thiết bị và phiên bản iOS/Android khác nhau
- Báo bug trên Jira kèm video quay màn hình, kiểm tra lại sau khi dev sửa

## Điều mình học được
Với ví, một lỗi nhỏ cũng ảnh hưởng tới tài sản người dùng, nên mình luôn test kỹ các trường hợp biên: nhập sai địa chỉ ví, số dư không đủ, mạng chập chờn giữa lúc gửi.

> Ghi chú: đây là nội dung mẫu, sửa trong Admin → Dự án.$c$, $c${"category":"BLOCKCHAIN · WALLET & NFT","title":"Testing a launcher with a built-in wallet and NFTs","role":"QA Tester (Manual)","duration":"Ongoing","description":"Manual testing of an iOS/Android launcher with a blockchain wallet: creating/restoring wallets, sending and receiving tokens, displaying NFTs.","content":"## Context\nA launcher app for iOS and Android with a built-in blockchain wallet, so users can hold tokens and browse their NFT collections right on their phone.\n\n## What I did\n- Wrote test cases for the main flows: **creating a wallet, restoring it with a recovery phrase**, setting a PIN, locking/unlocking the app\n- Tested sending and receiving tokens on a **testnet**, checking balances, fees and pending / success / failed states\n- Checked NFT display: image, name, collection info, plus offline and broken-image cases\n- Tested on many devices and iOS/Android versions\n- Reported bugs in Jira with screen recordings and retested after fixes\n\n## What I learned\nWith a wallet, a small bug can affect users' assets, so I always test edge cases carefully: wrong wallet address, insufficient balance, an unstable connection in the middle of a transfer.\n\n> Note: this is sample content, edit it in Admin → Projects."}$c$::jsonb),
 (2, $c$WEB · THƯƠNG MẠI ĐIỆN TỬ$c$, $c$Kiểm thử website bán hàng$c$, $c$Test giỏ hàng, thanh toán và mã giảm giá trên nhiều trình duyệt trước mỗi lần phát hành.$c$, $c$sunset$c$, $c$$c$, $c$Manual Tester$c$, $c$Khoảng 6 tháng$c$, ARRAY[$c$TestRail$c$, $c$Jira$c$, $c$Chrome DevTools$c$, $c$Postman$c$]::text[], $c$## Bối cảnh
Website bán lẻ với giỏ hàng, mã giảm giá và nhiều phương thức thanh toán, phát hành bản mới định kỳ.

## Mình đã làm gì
- Viết test case theo từng chức năng: tìm kiếm, giỏ hàng, **mã giảm giá**, thanh toán, lịch sử đơn hàng
- Ưu tiên test theo rủi ro: luồng thanh toán và khuyến mãi được test kỹ nhất
- Test trên Chrome, Safari, Firefox và giao diện điện thoại
- Dùng DevTools xem request lỗi, dùng Postman kiểm tra lại API giỏ hàng khi nghi lỗi nằm ở phía server
- Chạy lại bộ test regression trước mỗi lần phát hành

## Kết quả
Các lỗi nghiêm trọng ở luồng thanh toán và áp mã giảm giá được phát hiện và sửa trước khi lên bản chính thức.

> Ghi chú: đây là nội dung mẫu, sửa trong Admin → Dự án.$c$, $c${"category":"WEB · E-COMMERCE","title":"Testing an online store","role":"Manual Tester","duration":"About 6 months","description":"Testing the cart, checkout and discount codes across browsers before every release.","content":"## Context\nA retail website with a shopping cart, discount codes and several payment methods, releasing new versions regularly.\n\n## What I did\n- Wrote test cases per feature: search, cart, **discount codes**, checkout, order history\n- Prioritised by risk: checkout and promotions were tested most thoroughly\n- Tested on Chrome, Safari, Firefox and mobile layouts\n- Used DevTools to inspect failing requests and Postman to recheck the cart API when a bug looked server-side\n- Ran the regression suite before every release\n\n## Results\nSerious bugs in the checkout flow and discount handling were found and fixed before going live.\n\n> Note: this is sample content, edit it in Admin → Projects."}$c$::jsonb),
 (3, $c$MOBILE · iOS / ANDROID$c$, $c$Kiểm thử ứng dụng di động$c$, $c$Test chức năng và giao diện app trên nhiều dòng máy, kiểm tra thông báo, quyền truy cập và trường hợp mất mạng.$c$, $c$orange$c$, $c$$c$, $c$Manual Tester$c$, $c$Khoảng 4 tháng$c$, ARRAY[$c$Jira$c$, $c$Google Sheets$c$, $c$Postman$c$]::text[], $c$## Bối cảnh
Ứng dụng di động chạy trên cả iOS và Android, cần ổn định trên nhiều kích thước màn hình và phiên bản hệ điều hành.

## Mình đã làm gì
- Lập ma trận thiết bị cần test (dòng máy, phiên bản hệ điều hành, kích thước màn hình)
- Test các luồng chính, thông báo đẩy, quyền camera / vị trí, chế độ sáng tối
- Test các tình huống thực tế: **mất mạng, chuyển ứng dụng nền, xoay màn hình, pin yếu**
- Kiểm tra cài đặt mới và cập nhật từ bản cũ lên bản mới

## Kết quả
Bắt được nhiều lỗi giao diện chỉ xuất hiện trên một số dòng máy và lỗi mất dữ liệu khi ứng dụng bị đưa xuống nền.

> Ghi chú: đây là nội dung mẫu, sửa trong Admin → Dự án.$c$, $c${"category":"MOBILE · iOS / ANDROID","title":"Testing a mobile app","role":"Manual Tester","duration":"About 4 months","description":"Functional and UI testing across many phone models, including notifications, permissions and offline cases.","content":"## Context\nA mobile app running on both iOS and Android that needs to stay stable across screen sizes and OS versions.\n\n## What I did\n- Built a device matrix to cover (models, OS versions, screen sizes)\n- Tested the main flows, push notifications, camera / location permissions, light and dark mode\n- Tested real-life situations: **no connection, app sent to background, screen rotation, low battery**\n- Checked fresh installs and upgrades from older versions\n\n## Results\nCaught several UI bugs that only appeared on certain models and a data-loss bug when the app was sent to the background.\n\n> Note: this is sample content, edit it in Admin → Projects."}$c$::jsonb),
 (4, $c$PHẦN MỀM QUẢN LÝ · HR$c$, $c$Kiểm thử hệ thống quản lý nhân sự$c$, $c$Test phân quyền, chấm công, tính lương và báo cáo; đối chiếu dữ liệu bằng SQL.$c$, $c$gold$c$, $c$$c$, $c$Junior Tester$c$, $c$Khoảng 5 tháng$c$, ARRAY[$c$TestRail$c$, $c$SQL$c$, $c$Jira$c$, $c$Excel$c$]::text[], $c$## Bối cảnh
Phần mềm quản lý nhân sự nội bộ: hồ sơ nhân viên, chấm công, nghỉ phép, tính lương và báo cáo cho quản lý.

## Mình đã làm gì
- Test **phân quyền** theo vai trò: nhân viên, trưởng phòng, nhân sự, quản trị
- Test luồng xin nghỉ phép và duyệt nhiều cấp
- Kiểm tra công thức chấm công, tính lương với các trường hợp đặc biệt (làm thêm giờ, nghỉ không lương, vào giữa tháng)
- Dùng **SQL** đối chiếu số liệu trên báo cáo với dữ liệu trong database
- Xuất file Excel và kiểm tra định dạng, số liệu

## Kết quả
Phát hiện các lỗi sai số khi tính lương ở trường hợp đặc biệt và lỗi phân quyền cho xem dữ liệu không đúng vai trò.

> Ghi chú: đây là nội dung mẫu, sửa trong Admin → Dự án.$c$, $c${"category":"MANAGEMENT SOFTWARE · HR","title":"Testing an HR management system","role":"Junior Tester","duration":"About 5 months","description":"Testing permissions, attendance, payroll and reports; cross-checking data with SQL.","content":"## Context\nInternal HR software: employee records, attendance, leave, payroll and reports for managers.\n\n## What I did\n- Tested **role-based permissions**: employee, team lead, HR, admin\n- Tested leave requests with multi-level approval\n- Checked attendance and payroll formulas with special cases (overtime, unpaid leave, joining mid-month)\n- Used **SQL** to cross-check report figures against the database\n- Exported Excel files and checked formatting and numbers\n\n## Results\nFound payroll calculation errors in special cases and a permission bug that showed data to the wrong roles.\n\n> Note: this is sample content, edit it in Admin → Projects."}$c$::jsonb);
insert into public.posts (sort, title, excerpt, url, published_at, tags, content, en) values
 (-7, $c$Phân vùng tương đương và giá trị biên: ít test case mà vẫn bắt được bug$c$, $c$Một ô nhập số có thể nhận hàng nghìn giá trị, nhưng thường chỉ cần khoảng 6 giá trị đúng chỗ. Đây là hai kỹ thuật mình dùng nhiều nhất khi viết test case.$c$, $c$$c$, $c$2026-10-12$c$, ARRAY[$c$Test case$c$, $c$Kỹ thuật test$c$]::text[], $c$Gặp ô nhập "Số lượng: 1 đến 1000", không ai test cả 1000 số. Câu hỏi là chọn số nào để vừa ít test case vừa không bỏ lọt bug. Hai kỹ thuật cơ bản nhất giúp trả lời: phân vùng tương đương (equivalence partitioning) và phân tích giá trị biên (boundary value analysis).

## Phân vùng tương đương: chia nhóm, mỗi nhóm thử một

Ý tưởng: những giá trị mà hệ thống xử lý giống nhau thì thuộc cùng một nhóm, test một giá trị là đại diện cho cả nhóm.

Với ô "1 đến 1000" có 3 nhóm:

- **Hợp lệ:** từ 1 đến 1000, thử một số như 99.
- **Không hợp lệ, nhỏ hơn:** thử 0.
- **Không hợp lệ, lớn hơn:** thử 1001.

Đừng quên các nhóm "ngoài lề" mà yêu cầu ít khi ghi: để trống, chữ cái, số âm, số thập phân, ký tự đặc biệt, dán vào một chuỗi rất dài.

## Giá trị biên: bug thích nằm ở mép

Lập trình viên hay nhầm giữa "nhỏ hơn" và "nhỏ hơn hoặc bằng". Vì vậy bug thường nằm đúng ở ranh giới giữa các nhóm. Với ô "1 đến 1000", các giá trị nên thử là:

- **0, 1, 2** quanh biên dưới
- **999, 1000, 1001** quanh biên trên

## Áp dụng vào công việc thật

- **Giỏ hàng:** mua tối đa 5 sản phẩm mỗi loại → thử 0, 1, 5, 6. Và thử bấm nút "+" khi đang ở 5.
- **Mã giảm giá:** đơn từ 500.000đ được giảm → thử 499.999đ, 500.000đ, 500.001đ. Nhớ kiểm tra cả lúc bỏ bớt hàng làm đơn tụt dưới mức.
- **Ví blockchain:** số dư 10 token, phí 0,1 → thử gửi 9,9 (vừa đủ), 9,91 (thiếu phí), 0, và số có nhiều chữ số thập phân hơn token cho phép.
- **Nghỉ phép:** còn 2 ngày phép → thử xin 2 ngày, 2,5 ngày, nửa ngày cuối cùng.

## Mẹo nhỏ

- Biên không chỉ là số: độ dài chuỗi (tên tối đa 50 ký tự), ngày (hết hạn lúc 23:59), số lượng file tải lên, dung lượng ảnh.
- Ghi rõ giá trị đã chọn trong test case, đừng ghi chung chung "nhập số không hợp lệ". Người chạy lại test sẽ biết chính xác cần nhập gì.

## Nguồn tham khảo

- [What is Boundary Value Analysis and Equivalence Partitioning?](https://www.softwaretestinghelp.com/what-is-boundary-value-analysis-and-equivalence-partitioning/) — Software Testing Help$c$, $c${"title":"Equivalence partitioning and boundary values: fewer test cases, still catching bugs","excerpt":"A number field can accept thousands of values, but you usually only need about 6 of them in the right places. These are the two techniques I use most when writing test cases.","tags":["Test case","Test techniques"],"content":"Faced with a \"Quantity: 1 to 1000\" field, nobody tests all 1000 numbers. The real question is which numbers to pick so you keep the test cases few without letting bugs slip through. The two most basic test techniques help answer that: equivalence partitioning and boundary value analysis.\n\n## Equivalence partitioning: split into groups, test one from each\n\nThe idea: values the system handles the same way belong to the same group, so testing one value stands in for the whole group.\n\nFor the \"1 to 1000\" field there are 3 groups:\n\n- **Valid:** 1 to 1000, try a number like 99.\n- **Invalid, too small:** try 0.\n- **Invalid, too large:** try 1001.\n\nDon't forget the \"edge\" groups that requirements rarely mention: leaving it empty, letters, negative numbers, decimals, special characters, pasting in a very long string.\n\n## Boundary values: bugs love the edges\n\nDevelopers often mix up \"less than\" and \"less than or equal to\". That's why bugs tend to sit right on the boundary between groups. For the \"1 to 1000\" field, the values worth trying are:\n\n- **0, 1, 2** around the lower boundary\n- **999, 1000, 1001** around the upper boundary\n\n## Applying it to real work\n\n- **Shopping cart:** max 5 of each product → try 0, 1, 5, 6. And try tapping the \"+\" button when you're already at 5.\n- **Discount code:** orders from 500,000 VND get a discount → try 499,999 VND, 500,000 VND, 500,001 VND. Remember to also check removing items so the order drops below the threshold.\n- **Blockchain wallet:** balance of 10 tokens, fee of 0.1 → try sending 9.9 (just enough), 9.91 (not enough to cover the fee), 0, and an amount with more decimal places than the token allows.\n- **Leave requests:** 2 days of leave left → try requesting 2 days, 2.5 days, and the last half day.\n\n## Quick tips\n\n- Boundaries aren't just numbers: string length (name up to 50 characters), dates (expires at 23:59), number of uploaded files, image file size.\n- Write the exact value you picked in the test case, not something vague like \"enter an invalid number\". Whoever reruns the test will know exactly what to type.\n\n## References\n\n- [What is Boundary Value Analysis and Equivalence Partitioning?](https://www.softwaretestinghelp.com/what-is-boundary-value-analysis-and-equivalence-partitioning/) — Software Testing Help"}$c$::jsonb),
 (-6, $c$Smoke test và sanity test: khác nhau ở đâu, khi nào dùng$c$, $c$Hai cái tên hay bị dùng lẫn lộn. Smoke test hỏi "bản build này có đáng để test tiếp không", còn sanity test hỏi "chỗ vừa sửa đã ổn chưa".$c$, $c$$c$, $c$2026-10-12$c$, ARRAY[$c$Regression$c$, $c$Manual testing$c$]::text[], $c$Trong các buổi họp, mình hay nghe "test smoke giúp anh", "chạy sanity lại đi" như thể hai việc là một. Chúng giống nhau ở chỗ đều nhanh và đều làm trước khi test sâu, nhưng mục đích khác hẳn.

## Smoke test: bản build có "bốc khói" không?

- **Khi nào:** ngay khi nhận một bản build mới, trước mọi việc khác.
- **Phạm vi:** rộng nhưng nông. Đi qua toàn bộ hệ thống, mỗi chức năng chính chạm một lần.
- **Câu hỏi cần trả lời:** bản build này có ổn định để bắt đầu test không?
- **Kết quả:** đạt thì test tiếp; không đạt thì trả build về cho dev, khỏi mất cả buổi test trên một bản hỏng.

Ví dụ với web bán hàng: mở được trang, đăng nhập được, danh sách sản phẩm hiện ra, thêm được vào giỏ, mở được trang thanh toán. Khoảng 10–15 phút.

## Sanity test: chỗ vừa sửa đã ổn chưa?

- **Khi nào:** trên một bản build đã ổn định, sau khi sửa bug hoặc thay đổi nhỏ.
- **Phạm vi:** hẹp nhưng sâu hơn. Chỉ tập trung vào phần vừa đổi và xung quanh nó.
- **Câu hỏi cần trả lời:** thay đổi này chạy đúng và hợp lý chưa?
- **Kết quả:** đạt thì chuyển sang regression đầy đủ hoặc phát hành; không đạt thì mở lại bug.

Ví dụ: dev vừa sửa lỗi mã giảm giá áp sai. Mình thử mã hợp lệ, mã hết hạn, mã áp hai lần ở bước thanh toán, xem tổng tiền đúng chưa. Không test lại cả ứng dụng.

## Nhớ nhanh

- **Smoke:** rộng và nông, cho bản build mới, quyết định "có test tiếp không".
- **Sanity:** hẹp và tập trung, cho thay đổi nhỏ, quyết định "chỗ sửa đã ổn chưa".
- Cả hai đều không thay được regression. Đạt smoke hay sanity chỉ có nghĩa là đủ điều kiện để test tiếp, chưa phải là đã test xong.

## Mẹo cho manual tester

Mình giữ sẵn một checklist smoke 10–15 dòng cho mỗi dự án, ghi theo thứ tự đi qua ứng dụng. Mỗi lần có build mới chỉ việc chạy từ trên xuống, ghi đạt hoặc không đạt. Danh sách này cũng là ứng viên đầu tiên khi team bắt đầu làm automation.

## Nguồn tham khảo

- [Smoke Testing vs Sanity Testing](https://www.practitest.com/resource-center/article/smoke-testing-vs-sanity-testing/) — PractiTest$c$, $c${"title":"Smoke testing vs. sanity testing: how they differ and when to use each","excerpt":"These two names often get mixed up. A smoke test asks \"is this build worth testing further?\", while a sanity test asks \"is the thing that was just fixed working now?\"","tags":["Regression","Manual testing"],"content":"In meetings I often hear \"can you smoke test this for me\" and \"run sanity again\" as if they were the same thing. They're alike in that both are quick and both happen before deeper testing, but their purpose is completely different.\n\n## Smoke test: is the build \"smoking\"?\n\n- **When:** as soon as you get a new build, before anything else.\n- **Scope:** wide but shallow. Go through the whole system, touching each main feature once.\n- **Question to answer:** is this build stable enough to start testing?\n- **Outcome:** if it passes, keep testing; if it fails, send the build back to the devs so you don't waste a whole session testing a broken build.\n\nExample for an e-commerce site: the site opens, you can log in, the product list shows up, you can add to cart, the checkout page opens. About 10–15 minutes.\n\n## Sanity test: is the fix actually OK?\n\n- **When:** on an already stable build, after a bug fix or a small change.\n- **Scope:** narrow but deeper. Focus only on the part that changed and what's around it.\n- **Question to answer:** does this change work correctly and make sense?\n- **Outcome:** if it passes, move on to full regression or release; if it fails, reopen the bug.\n\nExample: a dev just fixed a bug where discount codes were applied incorrectly. I try a valid code, an expired code, and applying the same code twice at checkout, and check that the total is right. I don't retest the whole app.\n\n## Quick recap\n\n- **Smoke:** wide and shallow, for a new build, answers \"do we keep testing?\".\n- **Sanity:** narrow and focused, for a small change, answers \"is the fix OK?\".\n- Neither one replaces regression. Passing smoke or sanity only means it's ready for further testing, not that testing is done.\n\n## Tip for manual testers\n\nI keep a 10–15 line smoke checklist for each project, written in the order I move through the app. Every time a new build lands, I just run it top to bottom and mark each line pass or fail. This list is also the first candidate when the team starts on automation.\n\n## References\n\n- [Smoke Testing vs Sanity Testing](https://www.practitest.com/resource-center/article/smoke-testing-vs-sanity-testing/) — PractiTest"}$c$::jsonb),
 (-5, $c$RCRCRC: chọn gì để test regression khi không đủ thời gian$c$, $c$Không bao giờ có đủ thời gian để test lại mọi thứ trước khi phát hành. RCRCRC là 6 chữ cái giúp mình chọn đúng chỗ cần test lại.$c$, $c$$c$, $c$2026-10-11$c$, ARRAY[$c$Regression$c$, $c$Manual testing$c$]::text[], $c$Trước mỗi lần phát hành, câu hỏi khó nhất không phải là "test thế nào" mà là "test lại cái gì". Bộ test regression càng ngày càng dài, còn thời gian thì vẫn vậy. Mình hay dùng RCRCRC, một gợi nhớ do Karen N. Johnson đưa ra, để chọn phần cần test lại.

## 6 chữ cái, 6 câu hỏi

- **Recent (vừa đổi):** bản build này đổi gì? Đọc ghi chú phát hành, các ticket đã đóng, kể cả thay đổi "nhỏ" như sửa câu thông báo hay đổi cách ghi log.
- **Core (cốt lõi):** chức năng nào hỏng là người dùng bỏ đi ngay? Với web bán hàng là tìm kiếm, giỏ hàng, thanh toán; với ví là gửi và nhận token.
- **Risky (rủi ro):** phần nào phụ thuộc dịch vụ bên ngoài hoặc nhiều phần khác cùng lúc? Cổng thanh toán, đăng nhập bằng mạng xã hội, đồng bộ dữ liệu.
- **Configuration sensitive (nhạy với cấu hình):** phần nào chạy khác nhau giữa môi trường test và môi trường thật? Email gửi tự động, múi giờ, khóa API, cấu hình mạng blockchain.
- **Repaired (vừa sửa):** bug vừa sửa xong, và cả những chức năng nằm sát nó. Sửa chỗ này hỏng chỗ kia là chuyện thường ngày.
- **Chronic (bệnh mãn tính):** khu vực nào cứ vài bản lại có bug? Mở lịch sử bug trên Jira là thấy ngay.

## Cách mình áp dụng

1. Lấy danh sách thay đổi của bản build, đánh dấu từng mục theo 6 chữ trên.
2. Phần nào trúng từ 2 chữ trở lên thì test kỹ trước.
3. Phần **Core** luôn chạy một lượt nhanh, kể cả khi không ai đụng vào.
4. Ghi lại phần nào chưa kịp test để báo cho team trước khi phát hành, đừng im lặng.

## Ví dụ nhanh

Bản build sửa lỗi làm tròn phí giao dịch trong ví. Theo RCRCRC, mình sẽ test lại: màn hình gửi token (**Recent, Repaired**), luồng gửi và nhận (**Core**), phí trên mạng thử nghiệm và mạng thật (**Configuration sensitive**), và lịch sử giao dịch, chỗ trước đây từng hiển thị sai số tiền (**Chronic**).

RCRCRC không thay được bộ test case, nhưng giúp mình trả lời rõ ràng khi bị hỏi "sao không test phần kia?".

## Nguồn tham khảo

- [A software expert's heuristic for regression testing](https://www.techtarget.com/searchsoftwarequality/tip/A-software-experts-heuristic-for-regression-testing) — Karen N. Johnson, TechTarget
- [RCRCRC — A heuristic for regression testing](https://www.ministryoftesting.com/moments/rcrcrc-a-heuristic-for-regression-testing) — Ministry of Testing$c$, $c${"title":"RCRCRC: what to regression test when you're short on time","excerpt":"There's never enough time to retest everything before a release. RCRCRC is six letters that help me pick the right places to retest.","tags":["Regression","Manual testing"],"content":"Before every release, the hardest question isn't \"how do I test this?\" but \"what do I retest?\". The regression suite keeps getting longer, while the time stays the same. I often use RCRCRC, a heuristic coined by Karen N. Johnson, to decide what to retest.\n\n## 6 letters, 6 questions\n\n- **Recent:** what changed in this build? Read the release notes and the closed tickets, including \"small\" changes like a reworded message or a change to logging.\n- **Core:** which features would make users leave right away if they broke? For an e-commerce site that's search, cart, and checkout; for a wallet it's sending and receiving tokens.\n- **Risky:** which parts depend on external services, or on many other parts at once? Payment gateway, social login, data sync.\n- **Configuration sensitive:** which parts behave differently in the test environment and in production? Automated emails, time zones, API keys, blockchain network config.\n- **Repaired:** bugs that were just fixed, plus the features sitting right next to them. Fixing one thing and breaking another happens all the time.\n- **Chronic:** which areas seem to have bugs every few builds? Open the bug history in Jira and you'll spot them right away.\n\n## How I apply it\n\n1. Take the list of changes in the build and tag each item against the 6 letters above.\n2. Anything that hits 2 or more letters gets tested thoroughly first.\n3. **Core** always gets a quick pass, even when nobody touched it.\n4. Write down what I didn't get to and tell the team before the release. Don't stay silent.\n\n## Quick example\n\nThe build fixes a rounding bug in the wallet's transaction fees. Following RCRCRC, I'd retest: the send token screen (**Recent, Repaired**), the send and receive flows (**Core**), fees on testnet and mainnet (**Configuration sensitive**), and the transaction history, which used to show wrong amounts (**Chronic**).\n\nRCRCRC doesn't replace a set of test cases, but it helps me give a clear answer when someone asks \"why didn't you test that part?\".\n\n## References\n\n- [A software expert's heuristic for regression testing](https://www.techtarget.com/searchsoftwarequality/tip/A-software-experts-heuristic-for-regression-testing) — Karen N. Johnson, TechTarget\n- [RCRCRC — A heuristic for regression testing](https://www.ministryoftesting.com/moments/rcrcrc-a-heuristic-for-regression-testing) — Ministry of Testing"}$c$::jsonb),
 (-4, $c$Exploratory testing có kế hoạch: test theo charter trong 90 phút$c$, $c$Exploratory testing không phải là bấm lung tung. Chia thành từng phiên có mục tiêu, giới hạn thời gian và ghi chép lại giúp kết quả đo được và báo cáo được.$c$, $c$$c$, $c$2026-10-09$c$, ARRAY[$c$Exploratory$c$, $c$Manual testing$c$]::text[], $c$Nhiều người nghĩ exploratory testing là "không có test case thì bấm thử". Thực tế, test khám phá hiệu quả nhất khi có khung rõ ràng. Cách mình hay dùng là Session-Based Test Management (SBTM), do Jon Bach và James Bach xây dựng.

## Charter: một câu nói rõ mình đi tìm gì

Mỗi phiên test bắt đầu bằng một charter, tức một câu mục tiêu. Mẫu mình hay dùng:

> Khám phá **[khu vực]** với **[công cụ, dữ liệu hoặc cách tiếp cận]** để tìm **[loại vấn đề]**.

Ví dụ:

- Khám phá **mã giảm giá ở bước thanh toán** với **mã hết hạn, mã dùng nhiều lần, mã kết hợp** để tìm **sai tổng tiền**.
- Khám phá **khôi phục ví** với **cụm từ khôi phục nhập sai, thừa khoảng trắng** để tìm **trường hợp app báo sai hoặc treo**.

Charter cho biết hướng đi, không bắt mình làm từng bước như test case.

## Giới hạn thời gian

Một phiên thường khoảng 90 phút, có thể ngắn 45 phút hoặc dài tới 2 tiếng. Hết giờ thì dừng, kể cả đang hăng. Giới hạn này giúp mình tập trung và giúp team ước lượng được: "còn 6 phiên nữa cho phần thanh toán".

## Ghi lại trong lúc test

Mình ghi ngắn gọn vào một file, mỗi phiên một mục, ví dụ:

- **Charter:** mã giảm giá ở bước thanh toán
- **Thời gian:** 90 phút
- **Bug tìm được:** 2
- **Câu hỏi cần hỏi:** mã có được cộng dồn với khuyến mãi khác không?
- **Cần phiên tiếp:** có, phần hoàn tiền khi hủy đơn

Cột "Câu hỏi" quan trọng không kém cột bug. Nhiều chỗ không phải bug mà là yêu cầu chưa rõ.

## Trao đổi sau phiên

Sau phiên, mình dành 15–30 phút kể lại cho trưởng nhóm hoặc dev: đã test gì, chưa kịp test gì, gặp gì cản trở, phiên tiếp theo nên làm gì. Nhờ vậy test khám phá có kết quả rõ ràng, không còn là "chắc đã test kỹ rồi".

## Nguồn tham khảo

- [Session-Based Test Management](https://ryancraventech.substack.com/p/session-based-test-management) — Ryan Craven
- [Session-Based Test Management](https://www.virtuosoqa.com/post/session-based-test-management) — Virtuoso QA$c$, $c${"title":"Exploratory testing with a plan: charter-based sessions in 90 minutes","excerpt":"Exploratory testing isn't random clicking. Splitting it into sessions with a goal, a time limit, and notes makes the results measurable and reportable.","tags":["Exploratory","Manual testing"],"content":"A lot of people think exploratory testing means \"there are no test cases, so just click around\". In reality, exploratory testing works best inside a clear structure. The approach I usually use is Session-Based Test Management (SBTM), developed by Jon Bach and James Bach.\n\n## Charter: one sentence that says what you're looking for\n\nEvery test session starts with a charter, a one-sentence goal. The template I usually use:\n\n> Explore **[area]** with **[tools, data, or approach]** to discover **[type of problem]**.\n\nExamples:\n\n- Explore **discount codes at checkout** with **expired codes, reused codes, and combined codes** to discover **incorrect totals**.\n- Explore **wallet recovery** with **mistyped recovery phrases and extra spaces** to discover **cases where the app shows the wrong message or hangs**.\n\nA charter gives you a direction; it doesn't make you follow steps one by one like a test case.\n\n## Timebox\n\nA session is usually around 90 minutes; it can be as short as 45 minutes or as long as 2 hours. When time's up, stop, even if you're on a roll. The timebox keeps me focused and helps the team estimate: \"6 more sessions to go for checkout\".\n\n## Take notes while you test\n\nI keep short notes in a file, one entry per session, for example:\n\n- **Charter:** discount codes at checkout\n- **Duration:** 90 minutes\n- **Bugs found:** 2\n- **Questions to ask:** can codes be stacked with other promotions?\n- **Follow-up session needed:** yes, refunds when an order is canceled\n\nThe \"Questions\" column matters just as much as the bugs column. A lot of what I find isn't a bug, it's an unclear requirement.\n\n## Debrief after the session\n\nAfter each session, I spend 15–30 minutes walking the team lead or a dev through it: what I tested, what I didn't get to, what got in my way, and what the next session should cover. That way exploratory testing produces clear results instead of \"I'm pretty sure it was tested thoroughly\".\n\n## References\n\n- [Session-Based Test Management](https://ryancraventech.substack.com/p/session-based-test-management) — Ryan Craven\n- [Session-Based Test Management](https://www.virtuosoqa.com/post/session-based-test-management) — Virtuoso QA"}$c$::jsonb),
 (-3, $c$Test theo rủi ro: xếp thứ tự test khi ngày phát hành không dời được$c$, $c$Khi deadline cố định, test hết là không thể. Chấm điểm mức thiệt hại và khả năng lỗi cho từng phần giúp quyết định test gì trước, test sâu tới đâu.$c$, $c$$c$, $c$2026-10-07$c$, ARRAY[$c$Risk-based$c$, $c$Test planning$c$]::text[], $c$Ngày phát hành đã chốt, bộ test thì chưa chạy được một nửa. Lúc đó câu hỏi đúng là: nếu chỉ còn thời gian cho một nửa, nửa nào đáng test nhất? Test theo rủi ro (risk-based testing) giúp trả lời câu này bằng con số thay vì cảm giác.

## Rủi ro = thiệt hại × khả năng xảy ra

**Thiệt hại nếu hỏng:** chấm cho từng chức năng.

- 3: thảm họa (mất tiền, mất dữ liệu, sai lương)
- 2: gây hại (người dùng không làm tiếp được)
- 1: gây khó chịu (phải làm cách khác)
- 0: chỉ là phiền (lệch chữ, sai màu)

Cộng thêm điểm theo mức độ dùng thường xuyên: tính năng ai cũng phải đi qua (đăng nhập, thanh toán) nặng hơn tính năng ít người dùng.

**Khả năng có lỗi:** để ý các dấu hiệu sau.

- Code phức tạp, nhiều điều kiện
- Vừa sửa gấp sát ngày phát hành
- Công nghệ mới team chưa quen
- Khu vực có nhiều bug trước đây
- Nhiều người cùng sửa, trao đổi không rõ

## Chấm điểm và xếp hạng

Mình làm một bảng trên Google Sheets: mỗi dòng một chức năng, chấm 1–5 cho từng yếu tố, nhân trọng số, cộng lại. Không cần chính xác tuyệt đối; mục tiêu là chia được nhóm cao, trung bình, thấp.

- **Thanh toán + mã giảm giá:** thiệt hại cao, khả năng lỗi cao (vừa sửa) → test đầu tiên, test sâu.
- **Tìm kiếm sản phẩm:** thiệt hại trung bình, khả năng lỗi thấp → một lượt nhanh.
- **Trang giới thiệu:** thiệt hại thấp, khả năng lỗi thấp → để cuối.

## Lên lịch test theo điểm

1. Chạy một lượt nhanh qua toàn hệ thống trước để biết chỗ nào "có mùi".
2. Test sâu theo thứ tự điểm từ cao xuống thấp.
3. Báo bug nghiêm trọng ngay khi thấy, đừng gom cuối ngày. Báo sớm còn kịp sửa hoặc dời lịch.
4. Hết giờ thì dừng và báo rõ phần nào chưa test, kèm mức rủi ro của phần đó.

Câu cuối là quan trọng nhất: tester không quyết định có phát hành hay không, nhưng tester phải cho người quyết định biết họ đang chấp nhận rủi ro gì.

## Nguồn tham khảo

- [Risk Based Testing — Strategies for Prioritizing Tests Against Deadlines](https://www.logigear.com/blogs/test-methods/Risk-Based-TestingStrategies-for-Prioritizing-Tests-Against-Deadlines) — LogiGear
- [Risk-based Testing to Prioritize QA Efforts](https://testerwork.com/risk-based-testing-to-prioritize-qa-efforts/) — Testerwork$c$, $c${"title":"Risk-based testing: prioritizing tests when the release date won't move","excerpt":"With a fixed deadline, testing everything is impossible. Scoring each area for impact and likelihood of failure helps decide what to test first and how deep to go.","tags":["Risk-based","Test planning"],"content":"The release date is locked in, and the test suite isn't even half done. At that point the right question is: if there's only time for half, which half is most worth testing? Risk-based testing helps answer that with numbers instead of gut feeling.\n\n## Risk = impact × likelihood\n\n**Impact if it breaks:** give each feature a score.\n\n- 3: catastrophic (lost money, lost data, wrong payroll)\n- 2: damaging (users can't continue)\n- 1: annoying (users need a workaround)\n- 0: just a nuisance (misaligned text, wrong color)\n\nThen add points for how often it's used: features everyone has to go through (login, checkout) weigh more than features few people use.\n\n**Likelihood of bugs:** watch for these signs.\n\n- Complex code with lots of conditions\n- Rushed changes right before the release\n- New technology the team isn't familiar with yet\n- Areas with a lot of past bugs\n- Many people changing the same thing, with unclear communication\n\n## Scoring and ranking\n\nI make a table in Google Sheets: one row per feature, score each factor from 1 to 5, multiply by its weight, and add it all up. It doesn't need to be perfectly precise; the goal is to sort things into high, medium, and low.\n\n- **Checkout + discount codes:** high impact, high likelihood (just changed) → test first, test deep.\n- **Product search:** medium impact, low likelihood → one quick pass.\n- **About page:** low impact, low likelihood → leave it for last.\n\n## Scheduling tests by score\n\n1. Do a quick pass through the whole system first to see what \"smells off\".\n2. Test in depth in score order, from highest to lowest.\n3. Report serious bugs as soon as you find them; don't save them up for the end of the day. Reporting early leaves time to fix them or move the schedule.\n4. When time's up, stop and clearly report which parts weren't tested, along with their risk level.\n\nThat last point is the most important: testers don't decide whether to release, but we do have to make sure the people who decide know what risks they're accepting.\n\n## References\n\n- [Risk Based Testing — Strategies for Prioritizing Tests Against Deadlines](https://www.logigear.com/blogs/test-methods/Risk-Based-TestingStrategies-for-Prioritizing-Tests-Against-Deadlines) — LogiGear\n- [Risk-based Testing to Prioritize QA Efforts](https://testerwork.com/risk-based-testing-to-prioritize-qa-efforts/) — Testerwork"}$c$::jsonb),
 (-2, $c$SFDIPOT: 7 góc nhìn để không bỏ sót trường hợp test$c$, $c$Khi đọc một tính năng mới và không biết bắt đầu từ đâu, mình đi qua 7 chữ SFDIPOT. Mỗi chữ là một góc nhìn mở ra những trường hợp dễ bị quên.$c$, $c$$c$, $c$2026-10-05$c$, ARRAY[$c$Heuristic$c$, $c$Test case$c$]::text[], $c$Viết test case cho tính năng mới, mình hay bị "kẹt" ở luồng chính: nhập đúng, bấm nút, thấy kết quả. SFDIPOT là gợi nhớ trong Heuristic Test Strategy Model của James Bach, giúp nhìn tính năng từ 7 phía.

## 7 chữ cái

- **S – Structure (cấu trúc):** sản phẩm gồm những phần gì? Màn hình, API, file cấu hình, tài liệu hướng dẫn.
- **F – Function (chức năng):** nó làm gì? Tính toán, phân quyền, xử lý lỗi, khởi động và tắt.
- **D – Data (dữ liệu):** nó nhận và trả ra dữ liệu gì? Dữ liệu trống, quá dài, sai định dạng, dữ liệu cũ còn lưu lại.
- **I – Interfaces (giao tiếp):** người dùng và hệ thống khác chạm vào nó qua đâu? Giao diện, API, nhập và xuất file.
- **P – Platform (nền tảng):** nó phụ thuộc vào gì bên ngoài? Trình duyệt, phiên bản iOS/Android, dịch vụ bên thứ ba.
- **O – Operations (cách sử dụng):** ai dùng, dùng thế nào? Người dùng mới, người dùng quen, người dùng cố tình phá.
- **T – Time (thời gian):** chuyện gì xảy ra theo thời gian? Bấm nhanh liên tục, mạng chậm, hai người cùng sửa một lúc, hết hạn phiên đăng nhập.

## Áp dụng thử: chức năng "xin nghỉ phép"

Lấy ví dụ trong phần mềm quản lý nhân sự mình từng test:

- **S:** form xin nghỉ, màn hình duyệt của quản lý, email thông báo.
- **F:** trừ số ngày phép, duyệt nhiều cấp, từ chối kèm lý do.
- **D:** nghỉ nửa ngày, nghỉ qua cuối tuần, xin nghỉ khi đã hết phép.
- **I:** xuất báo cáo Excel, API đồng bộ sang bảng chấm công.
- **P:** dùng trên điện thoại, trình duyệt Safari.
- **O:** trưởng phòng tự xin nghỉ thì ai duyệt? Nhân viên sửa đơn khi đang chờ duyệt?
- **T:** hai cấp duyệt cùng bấm một lúc, đơn chờ duyệt qua năm mới thì tính phép năm nào?

Chỉ riêng chữ **T** đã cho ra hai trường hợp mà luồng chính không bao giờ chạm tới.

## Mẹo nhỏ

Không cần đủ 7 chữ cho mọi tính năng. Mình dùng SFDIPOT như một danh sách tự hỏi trong 10 phút trước khi viết test case, rồi chọn những góc rủi ro nhất.

## Nguồn tham khảo

- [Heuristic Test Strategy Model](https://developsense.com/htsm) — James Bach, Satisfice (đăng trên DevelopSense)$c$, $c${"title":"SFDIPOT: 7 angles so you don't miss test cases","excerpt":"When I'm reading about a new feature and don't know where to start, I walk through the seven letters of SFDIPOT. Each letter is an angle that opens up cases that are easy to forget.","tags":["Heuristic","Test case"],"content":"When I write test cases for a new feature, I tend to get \"stuck\" on the happy path: enter valid input, click the button, see the result. SFDIPOT is a mnemonic from James Bach's Heuristic Test Strategy Model that helps you look at a feature from 7 sides.\n\n## The 7 letters\n\n- **S – Structure:** what is the product made of? Screens, APIs, config files, user guides.\n- **F – Function:** what does it do? Calculations, permissions, error handling, startup and shutdown.\n- **D – Data:** what data does it take in and give back? Empty data, data that's too long, wrong formats, old data still lying around.\n- **I – Interfaces:** how do users and other systems touch it? The UI, APIs, file import and export.\n- **P – Platform:** what external things does it depend on? Browsers, iOS/Android versions, third-party services.\n- **O – Operations:** who uses it, and how? New users, experienced users, users who are deliberately trying to break it.\n- **T – Time:** what happens over time? Rapid repeated clicks, a slow network, two people editing at once, a login session expiring.\n\n## Trying it out: a \"request leave\" feature\n\nHere's an example from an HR management app I used to test:\n\n- **S:** the leave request form, the manager's approval screen, the notification email.\n- **F:** deducting leave days, multi-level approval, rejecting with a reason.\n- **D:** half-day leave, leave that spans a weekend, requesting leave after running out of days.\n- **I:** exporting an Excel report, the API that syncs to the timesheet system.\n- **P:** using it on a phone, the Safari browser.\n- **O:** if a department head requests leave, who approves it? What if an employee edits a request while it's pending approval?\n- **T:** two approval levels click at the same moment; a request is still pending when the new year starts, so which year's leave does it count against?\n\nThe letter **T** alone gave me two cases that the happy path would never reach.\n\n## A quick tip\n\nYou don't need all 7 letters for every feature. I use SFDIPOT as a checklist of questions to ask myself for 10 minutes before writing test cases, then pick the riskiest angles.\n\n## References\n\n- [Heuristic Test Strategy Model](https://developsense.com/htsm) — James Bach, Satisfice (published on DevelopSense)"}$c$::jsonb),
 (-1, $c$Hỏi trước khi test: tester trong buổi Three Amigos$c$, $c$Bug rẻ nhất là bug chưa kịp được viết ra code. Ngồi cùng PO và dev trước khi làm, đặt câu hỏi bằng ví dụ cụ thể, giúp cả team hiểu giống nhau.$c$, $c$$c$, $c$2026-10-03$c$, ARRAY[$c$Three Amigos$c$, $c$Yêu cầu$c$]::text[], $c$Nhiều bug mình tìm được thật ra không phải lỗi code, mà là dev và PO hiểu yêu cầu khác nhau. Cách rẻ nhất để bắt loại bug này là hỏi trước khi bắt đầu làm, trong một buổi ngắn gọi là Three Amigos.

## Three Amigos là gì

Ba góc nhìn ngồi cùng nhau trước khi làm một user story:

- **Product Owner / BA:** muốn giải quyết vấn đề gì.
- **Developer:** làm thế nào.
- **Tester:** chuyện gì có thể sai.

Không cần đúng 3 người, quan trọng là đủ 3 góc nhìn.

## Example Mapping: hỏi bằng ví dụ

Cách tổ chức mình thấy hiệu quả nhất là Example Mapping của Matt Wynne. Dùng thẻ 4 màu:

- **Vàng:** user story
- **Xanh dương:** quy tắc (rule)
- **Xanh lá:** ví dụ cụ thể cho từng quy tắc
- **Đỏ:** câu hỏi chưa ai trả lời được

Mỗi story chỉ nên mất khoảng 25 phút. Nếu bàn đầy thẻ đỏ, story chưa sẵn sàng để làm. Nếu một quy tắc có quá nhiều thẻ xanh lá, nên tách story nhỏ hơn.

## Ví dụ: "Áp mã giảm giá"

- **Quy tắc:** mỗi đơn chỉ dùng một mã. **Ví dụ:** đã áp mã A, nhập thêm mã B → mã B thay mã A hay báo lỗi?
- **Quy tắc:** mã hết hạn không dùng được. **Ví dụ:** mã hết hạn lúc 23:59, khách bấm thanh toán lúc 23:59:30 → tính theo giờ bấm hay giờ thanh toán xong?
- **Câu hỏi (thẻ đỏ):** đổi trả hàng thì có hoàn lại lượt dùng mã không?

Mỗi ví dụ xanh lá gần như là một test case viết sẵn, và mỗi thẻ đỏ là một bug được chặn từ trước khi có code.

## Tester nên hỏi gì

- "Nếu … thì sao?" với dữ liệu biên: trống, bằng 0, rất lớn, đúng giới hạn.
- "Ai không được làm việc này?" để hỏi về phân quyền.
- "Lỗi thì người dùng thấy gì?" để hỏi về thông báo lỗi.
- "Làm sao biết là xong?" để chốt tiêu chí nghiệm thu.

## Nguồn tham khảo

- [Introducing Example Mapping](https://cucumber.io/blog/bdd/example-mapping-introduction/) — Matt Wynne, Cucumber
- [Example Mapping: The Three Amigos](https://www.qatouch.com/qa-masterclass/example-mapping-the-three-amigos) — QA Touch
- [The key role testing plays in a Three Amigos strategy](https://www.techtarget.com/searchsoftwarequality/tip/The-key-role-testing-plays-in-a-Three-Amigos-strategy) — TechTarget$c$, $c${"title":"Ask before you test: the tester in a Three Amigos session","excerpt":"The cheapest bug is the one that never gets written into code. Sitting down with the PO and dev before work starts, and asking questions with concrete examples, gets the whole team on the same page.","tags":["Three Amigos","Requirements"],"content":"A lot of the bugs I find aren't really coding mistakes. They happen because the dev and the PO understood the requirement differently. The cheapest way to catch this kind of bug is to ask questions before any work starts, in a short session called Three Amigos.\n\n## What is Three Amigos\n\nThree perspectives sit down together before a user story is worked on:\n\n- **Product Owner / BA:** what problem we want to solve.\n- **Developer:** how to build it.\n- **Tester:** what could go wrong.\n\nIt doesn't have to be exactly 3 people. What matters is having all 3 perspectives in the room.\n\n## Example Mapping: asking with examples\n\nThe format I've found most effective is Matt Wynne's Example Mapping. It uses cards in 4 colors:\n\n- **Yellow:** the user story\n- **Blue:** rules\n- **Green:** concrete examples for each rule\n- **Red:** questions nobody can answer yet\n\nEach story should take about 25 minutes. If the table fills up with red cards, the story isn't ready to work on. If one rule has too many green cards, the story should be split into smaller ones.\n\n## Example: \"Apply a discount code\"\n\n- **Rule:** only one code per order. **Example:** code A is already applied and the customer enters code B → does B replace A, or do we show an error?\n- **Rule:** expired codes can't be used. **Example:** the code expires at 23:59 and the customer clicks checkout at 23:59:30 → do we go by the time they clicked, or the time payment completed?\n- **Question (red card):** if an order is returned, does the customer get the code usage back?\n\nEach green example is practically a ready-made test case, and each red card is a bug stopped before any code exists.\n\n## What testers should ask\n\n- \"What if…?\" for boundary data: empty, zero, very large, exactly at the limit.\n- \"Who shouldn't be allowed to do this?\" to ask about permissions.\n- \"What does the user see when something fails?\" to ask about error messages.\n- \"How do we know it's done?\" to pin down the acceptance criteria.\n\n## References\n\n- [Introducing Example Mapping](https://cucumber.io/blog/bdd/example-mapping-introduction/) — Matt Wynne, Cucumber\n- [Example Mapping: The Three Amigos](https://www.qatouch.com/qa-masterclass/example-mapping-the-three-amigos) — QA Touch\n- [The key role testing plays in a Three Amigos strategy](https://www.techtarget.com/searchsoftwarequality/tip/The-key-role-testing-plays-in-a-Three-Amigos-strategy) — TechTarget"}$c$::jsonb),
 (1, $c$Viết bug report dev nào cũng muốn đọc$c$, $c$Cấu trúc tiêu đề, bước tái hiện, kết quả mong đợi và bằng chứng đính kèm để dev sửa nhanh mà không phải hỏi lại.$c$, $c$$c$, $c$2026-09-02$c$, ARRAY[$c$Bug report$c$, $c$Manual testing$c$]::text[], $c$Một bug report tốt giúp dev sửa lỗi nhanh mà không phải hỏi lại. Đây là cấu trúc mình luôn dùng.

## 1. Tiêu đề nói rõ chuyện gì xảy ra
Tiêu đề nên trả lời được: **ở đâu, làm gì, sai thế nào**. Ví dụ: "Giỏ hàng: áp mã giảm giá hai lần làm tổng tiền bị âm".

## 2. Các bước tái hiện
- Viết từng bước, mỗi bước một hành động
- Ghi rõ dữ liệu đã dùng (tài khoản, mã giảm giá, sản phẩm)
- Ghi môi trường: trình duyệt hoặc thiết bị, phiên bản app

## 3. Kết quả thực tế và kết quả mong đợi
Đặt hai dòng này cạnh nhau để dev thấy ngay chỗ sai.

## 4. Bằng chứng
Ảnh chụp, video ngắn, lỗi trong DevTools hoặc response của API trên Postman. Một video 15 giây thường đáng giá hơn một đoạn mô tả dài.

> Ghi chú: đây là bài viết mẫu, sửa trong Admin → Blog.$c$, $c${"title":"Writing bug reports devs actually want to read","excerpt":"How to structure the title, steps to reproduce, expected result and attached evidence so devs can fix things fast without coming back to ask.","tags":["Bug report","Manual testing"],"content":"A good bug report helps the dev fix the issue quickly without having to come back with questions. This is the structure I always use.\n\n## 1. A title that says exactly what happened\nThe title should answer: **where, what you did, and what went wrong**. For example: \"Cart: applying a discount code twice makes the total negative\".\n\n## 2. Steps to reproduce\n- Write it step by step, one action per step\n- Note the exact data you used (account, discount code, product)\n- Note the environment: browser or device, app version\n\n## 3. Actual result and expected result\nPut these two lines side by side so the dev can see right away what's wrong.\n\n## 4. Evidence\nScreenshots, a short video, errors from DevTools, or the API response in Postman. A 15-second video is often worth more than a long description.\n\n> Note: this is a sample post, edit it in Admin → Blog."}$c$::jsonb),
 (2, $c$Viết test case sao cho đủ mà không thừa$c$, $c$Cách mình chia nhỏ yêu cầu, chọn trường hợp cần test và viết test case để người khác đọc là chạy được.$c$, $c$$c$, $c$2026-09-18$c$, ARRAY[$c$Test case$c$, $c$Manual testing$c$]::text[], $c$Test case viết quá sơ sài thì dễ sót lỗi, viết quá dài thì không ai muốn đọc. Đây là cách mình cân bằng.

## Bắt đầu từ yêu cầu
- Đọc kỹ yêu cầu, gạch ra từng quy tắc nghiệp vụ
- Hỏi lại những chỗ mơ hồ trước khi viết, đừng tự đoán

## Chọn trường hợp cần test
- **Luồng chính**: người dùng làm đúng như mong đợi
- **Giá trị biên**: nhỏ nhất, lớn nhất, vừa vượt giới hạn
- **Dữ liệu sai**: để trống, sai định dạng, ký tự đặc biệt
- **Trường hợp đặc biệt** của nghiệp vụ: hết hàng, hết hạn, không đủ quyền

## Một test case tốt có gì
1. Tiêu đề ngắn, nói rõ đang kiểm tra điều gì
2. Điều kiện trước (tài khoản, dữ liệu cần có)
3. Các bước thực hiện
4. Kết quả mong đợi cụ thể, kiểm tra được

> Ghi chú: đây là bài viết mẫu, sửa trong Admin → Blog.$c$, $c${"title":"Writing test cases that are enough, not too much","excerpt":"How I break down requirements, choose which cases to test, and write test cases that anyone can pick up and run.","tags":["Test case","Manual testing"],"content":"Test cases that are too thin let bugs slip through; test cases that are too long, nobody wants to read. Here's how I strike the balance.\n\n## Start from the requirements\n- Read the requirements carefully and list out each business rule\n- Ask about anything vague before you write, don't guess\n\n## Choose what to test\n- **Happy path**: the user does exactly what's expected\n- **Boundary values**: the minimum, the maximum, and just over the limit\n- **Invalid data**: empty fields, wrong formats, special characters\n- **Business edge cases**: out of stock, expired, insufficient permissions\n\n## What a good test case has\n1. A short title that says clearly what's being checked\n2. Preconditions (the account and data you need)\n3. Steps to perform\n4. A specific, verifiable expected result\n\n> Note: this is a sample post, edit it in Admin → Blog."}$c$::jsonb),
 (3, $c$Test ví blockchain: những lỗi tester mới hay bỏ sót$c$, $c$Những trường hợp cần test kỹ khi kiểm thử ví và NFT trên điện thoại, rút ra từ dự án launcher mình đang tham gia.$c$, $c$$c$, $c$2026-10-01$c$, ARRAY[$c$Blockchain$c$, $c$Mobile$c$]::text[], $c$Test ví blockchain khác test app thông thường: sai một bước là ảnh hưởng tới tài sản của người dùng. Đây là những chỗ mình thấy dễ bị bỏ sót.

## Luôn test trên mạng thử nghiệm
Dùng **testnet** và token thử nghiệm, không dùng tiền thật. Ghi rõ mạng đang dùng trong mỗi bug report.

## Tạo và khôi phục ví
- Khôi phục ví bằng cụm từ khôi phục nhập sai thứ tự, thừa khoảng trắng, sai chính tả
- Gỡ app rồi cài lại, khôi phục ví xem số dư và lịch sử có đúng không

## Gửi và nhận token
- Nhập sai địa chỉ ví, số dư không đủ, số tiền bằng 0
- Mất mạng giữa lúc gửi: giao dịch có bị gửi hai lần không
- Trạng thái chờ, thành công, thất bại có hiển thị đúng không

## Hiển thị NFT
- Ảnh NFT lỗi hoặc tải chậm
- Bộ sưu tập nhiều NFT, tên quá dài

> Ghi chú: đây là bài viết mẫu, sửa trong Admin → Blog.$c$, $c${"title":"Testing blockchain wallets: bugs new testers often miss","excerpt":"The cases worth testing thoroughly when testing wallets and NFTs on mobile, drawn from the launcher project I'm working on.","tags":["Blockchain","Mobile"],"content":"Testing a blockchain wallet is different from testing a regular app: one wrong step can affect the user's assets. These are the spots I've found easy to miss.\n\n## Always test on a test network\nUse **testnet** and test tokens, never real money. State which network you used in every bug report.\n\n## Creating and restoring a wallet\n- Restore a wallet with a seed phrase entered in the wrong order, with extra spaces, or with typos\n- Uninstall and reinstall the app, then restore the wallet and check that the balance and history are correct\n\n## Sending and receiving tokens\n- Wrong wallet address, insufficient balance, an amount of zero\n- Losing the connection mid-send: does the transaction get sent twice?\n- Do the pending, successful and failed states display correctly?\n\n## Displaying NFTs\n- Broken or slow-loading NFT images\n- Collections with many NFTs, names that are too long\n\n> Note: this is a sample post, edit it in Admin → Blog."}$c$::jsonb);
update public.settings set en = $c${"footer_tagline":"Manual QA Tester — helping products run reliably before they reach users.","availability":"Looking for a QA Tester role","address":"Ho Chi Minh City, Vietnam","working_hours":"Mon – Fri · 9:00 – 18:00","copyright":"© 2026 Công Minh. All rights reserved.","footer_note":"Designed & built with React, Tailwind and Supabase."}$c$::jsonb, hero = coalesce(hero, '{}'::jsonb) || jsonb_build_object('en', $c${"badge":{"text":"OPEN TO QA OPPORTUNITIES"},"card1":{"value":"Manual","label":"QA Tester"},"marquee":{"items":{"0":"MANUAL TESTING","1":"TEST CASE","2":"API TESTING","3":"MOBILE APP","4":"BLOCKCHAIN WALLET","5":"REGRESSION","6":"BUG TRACKING"}},"title":{"before":"I find ","highlight":"bugs","after":" before your users do"},"lead":"Công Minh — Manual QA Tester with nearly 2 years of experience testing e-commerce websites, mobile apps, management software and blockchain wallets. I write thorough test cases, clear bug reports, and I am learning automation.","buttons":{"primary":"View projects","secondary":"Contact"},"stats":{"0":{"value":"2","label":"Years in QA"},"1":{"value":"4","label":"Product domains"},"2":{"value":"Web · App","label":"Platforms tested"}},"card2":{"value":"Mobile","label":"iOS · Android"},"post_cta":{"title":"Need a careful tester for your product?","text":"Happy to talk about manual testing for your website, mobile app or blockchain product.","button":"Discuss your project"}}$c$::jsonb) where id = 1 and en = '{}'::jsonb;
