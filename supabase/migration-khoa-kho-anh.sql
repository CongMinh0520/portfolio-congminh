-- Khoá liệt kê kho "media": trước đây ai cũng gọi được API liệt kê để xem toàn bộ file trong kho
-- (kể cả thư mục attachments/ chứa file bạn gửi kèm khi trả lời khách).
-- Sau khi chạy: link ảnh / PDF công khai (…/storage/v1/object/public/media/…) vẫn mở bình thường vì kho để public,
-- chỉ có danh sách file là riêng Admin xem được.
-- Cần hàm public.is_admin() (migration-admin-lockdown.sql). Chạy lại nhiều lần không sao.

drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin read" on storage.objects;
create policy "media admin read" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_admin());
