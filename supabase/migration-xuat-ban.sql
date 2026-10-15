-- Xuất bản (Jamstack): trang công khai được dựng sẵn lúc build, nên sửa nội dung xong cần bấm "Xuất bản" trong Admin
-- để Vercel build lại. Bảng này ghi lúc nội dung đổi gần nhất và lúc xuất bản gần nhất để Admin hiện "Có thay đổi chưa xuất bản".
-- Chạy sau migration-admin-lockdown.sql (dùng hàm is_admin). Chạy lại nhiều lần không sao.

create table if not exists public.publish_state (
  id int primary key default 1 check (id = 1),
  changed_at timestamptz,
  published_at timestamptz
);
insert into public.publish_state (id, changed_at, published_at) values (1, now(), now()) on conflict (id) do nothing;
alter table public.publish_state enable row level security;
-- Admin chỉ đọc; ghi do trigger bên dưới và hàm gui-tin-nhan (service role) lo
drop policy if exists "admin doc" on public.publish_state;
create policy "admin doc" on public.publish_state for select to authenticated using (public.is_admin());

-- Mọi thay đổi ở bảng hiện trên trang công khai → ghi lại thời điểm
create or replace function public.mark_content_changed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.publish_state set changed_at = now() where id = 1;
  return null;
end $$;
revoke all on function public.mark_content_changed() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['settings','posts','projects','bugs','skills','jobs','footer_links','socials'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists content_changed on public.%I', t);
    execute format('create trigger content_changed after insert or update or delete on public.%I for each statement execute function public.mark_content_changed()', t);
  end loop;
end $$;

-- Admin xem trạng thái realtime (nút Xuất bản tự đổi khi có thay đổi mới, kể cả bài Easy AI gửi tới)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'publish_state') then
    alter publication supabase_realtime add table public.publish_state;
  end if;
end $$;
