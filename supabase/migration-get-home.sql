-- Tăng tốc trang chủ: gộp 7 request (skills, jobs, projects, posts, footer_links, socials, settings) thành 1.
-- Chạy 1 lần trong Supabase → SQL Editor. Chưa chạy cũng không sao: web tự quay về cách cũ (tải từng bảng).
-- security invoker = vẫn áp dụng đúng chính sách RLS như khi đọc từng bảng (khách chỉ thấy bài visible = true).
create or replace function public.get_home()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'settings',     (select to_jsonb(s) from public.settings s where s.id = 1),
    'skills',       coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.skills t), '[]'::jsonb),
    'jobs',         coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.jobs t), '[]'::jsonb),
    'projects',     coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.projects t), '[]'::jsonb),
    'posts',        coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.posts t), '[]'::jsonb),
    'footer_links', coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.footer_links t), '[]'::jsonb),
    'socials',      coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.socials t), '[]'::jsonb)
  );
$$;

revoke all on function public.get_home() from public;
grant execute on function public.get_home() to anon, authenticated;
