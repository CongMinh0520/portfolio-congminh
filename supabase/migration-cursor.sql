-- Chạy file này để lưu được lựa chọn Hiệu ứng chuột trong Admin.

-- ===== Hiệu ứng chuột =====
alter table public.settings add column if not exists cursor_effect text not null default 'none';
