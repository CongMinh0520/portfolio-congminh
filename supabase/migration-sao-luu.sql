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
