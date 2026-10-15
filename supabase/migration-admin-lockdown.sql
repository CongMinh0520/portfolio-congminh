-- Khoá quyền Admin: trước đây MỌI tài khoản đã đăng nhập (kể cả người tự đăng ký) đều có toàn quyền ghi,
-- đọc tin nhắn khách và khôi phục sao lưu. Từ nay chỉ tài khoản có trong bảng public.admins mới được.
--
-- Cách chạy (Supabase → SQL Editor → New query):
--   1. Sửa email ở dòng "admin_email" ngay dưới thành email bạn dùng để đăng nhập Admin.
--   2. Run. Nếu email không có trong Authentication → Users, cả file bị huỷ (không đổi gì) → bạn không bị khoá ngoài.
--   3. Authentication → Sign In / Providers → TẮT "Allow new users to sign up".
-- Chạy lại nhiều lần không sao.

-- ===== Danh sách Admin =====
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Không có policy nào: trình duyệt không đọc/ghi được bảng này, chỉ hàm is_admin() (security definer) đọc.

do $$
declare
  admin_email text := 'EMAIL_ADMIN_CUA_BAN@example.com';
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(admin_email);
  if uid is null and not exists (select 1 from public.admins) then
    raise exception 'Không tìm thấy tài khoản %. Sửa admin_email ở đầu file rồi chạy lại.', admin_email;
  end if;
  if uid is not null then
    insert into public.admins (user_id) values (uid) on conflict do nothing;
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ===== Bảng nội dung: ai cũng đọc, chỉ Admin ghi =====
do $$
declare t text;
begin
  foreach t in array array['projects','skills','jobs','posts','footer_links','socials','settings','bugs'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Bài / bug đang ẩn: chỉ Admin thấy
drop policy if exists "public read" on public.posts;
create policy "public read" on public.posts for select using (visible = true or public.is_admin());
do $$ begin
  if to_regclass('public.bugs') is not null then
    drop policy if exists "public read" on public.bugs;
    create policy "public read" on public.bugs for select using (visible = true or public.is_admin());
  end if;
end $$;

-- ===== Bảng riêng của Admin =====
do $$
declare t text;
begin
  foreach t in array array['messages','admin_settings','push_subscriptions'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop policy if exists "admin all" on public.%I', t);
    execute format('create policy "admin all" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "admin doc luot xem" on public.page_views;
create policy "admin doc luot xem" on public.page_views for select to authenticated using (public.is_admin());
drop policy if exists "admin xoa luot xem" on public.page_views;
create policy "admin xoa luot xem" on public.page_views for delete to authenticated using (public.is_admin());

-- ===== Kho ảnh "media": chỉ Admin tải lên / sửa / xoá, tối đa 10 MB mỗi file =====
update storage.buckets set file_size_limit = 10485760 where id = 'media';
drop policy if exists "media admin write" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin write" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ===== Khôi phục sao lưu: chỉ Admin =====
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
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if tbl not in ('settings', 'admin_settings', 'posts', 'projects', 'skills', 'jobs', 'footer_links', 'socials', 'messages', 'bugs') then
    raise exception 'table % is not restorable', tbl;
  end if;
  if jsonb_typeof(rows) <> 'array' then raise exception 'rows must be an array'; end if;
  select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = tbl and column_name = 'id' and is_identity = 'YES') into ident;
  for r in select * from jsonb_array_elements(rows) loop
    if jsonb_typeof(r) <> 'object' or r->>'id' is null then continue; end if;
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
  if ident then
    execute format('select setval(pg_get_serial_sequence(%L, %L), greatest((select coalesce(max(id), 0) from public.%I), 1))', 'public.' || tbl, 'id', tbl);
  end if;
  return n;
end $$;
revoke execute on function public.restore_backup(text, jsonb, boolean) from public, anon;
grant execute on function public.restore_backup(text, jsonb, boolean) to authenticated;
