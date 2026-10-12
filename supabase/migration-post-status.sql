-- Trạng thái bài Blog: phân biệt "Chờ duyệt" với "Bản nháp" (Admin → Blog, bấm đổi trạng thái ngay trong danh sách).
-- Để trống (null) = tự đoán: bài Easy AI đang ẩn là Chờ duyệt.
alter table public.posts add column if not exists review boolean;
