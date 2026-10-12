-- Chạy file này để Blog có thẻ (tag): lọc theo thẻ, bài viết liên quan.
alter table public.posts add column if not exists tags text[] not null default '{}';
