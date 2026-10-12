-- Dành cho người ĐÃ chạy các file SQL trước: chạy file này để thêm trang chi tiết dự án / bài viết.

-- ===== Trang chi tiết cho Dự án và Blog =====
alter table public.projects add column if not exists content text not null default '';
alter table public.projects add column if not exists role text not null default '';
alter table public.projects add column if not exists duration text not null default '';
alter table public.projects add column if not exists tools text[] not null default '{}';
alter table public.posts add column if not exists content text not null default '';
alter table public.posts add column if not exists published_at date;
