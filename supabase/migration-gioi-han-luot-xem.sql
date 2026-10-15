-- Chống ghi lượt xem ảo: khách (anon) được ghi vào page_views không cần đăng nhập, nên ai cũng có thể gửi hàng loạt.
-- Giới hạn: cùng một visitor + đường dẫn chỉ tính 1 lần mỗi 10 giây, và toàn trang tối đa 300 lượt mỗi phút.
-- Lượt vượt giới hạn bị bỏ qua lặng lẽ (không báo lỗi về trình duyệt). Chạy lại nhiều lần không sao.

create index if not exists page_views_visitor_path_idx on public.page_views (visitor, path, created_at desc);

create or replace function public.page_views_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.page_views where visitor = new.visitor and path = new.path and created_at > now() - interval '10 seconds') then
    return null;
  end if;
  if (select count(*) from public.page_views where created_at > now() - interval '1 minute') >= 300 then
    return null;
  end if;
  return new;
end $$;
revoke all on function public.page_views_limit() from public, anon, authenticated;

drop trigger if exists page_views_limit on public.page_views;
create trigger page_views_limit before insert on public.page_views for each row execute function public.page_views_limit();
