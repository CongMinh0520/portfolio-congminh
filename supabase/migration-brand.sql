-- Thương hiệu: logo, biểu tượng, favicon (Admin → Thương hiệu). Chạy một lần trong Supabase → SQL Editor.
alter table public.settings add column if not exists brand jsonb not null default '{}'::jsonb;
