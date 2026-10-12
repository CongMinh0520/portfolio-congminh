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
