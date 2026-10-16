-- Xác thực 2 bước bắt buộc ở phía máy chủ (TÙY CHỌN, chạy sau khi đã bật trong Admin)
-- ---------------------------------------------------------------------------------
-- Admin → Tài khoản của tôi → Xác thực 2 bước chỉ chặn ở giao diện. File này bắt cả cơ sở dữ liệu
-- (mọi bảng, kho ảnh "media", hàm SQL dùng public.is_admin()) đòi phiên đăng nhập mức aal2,
-- tức đã nhập mã 6 số sau mật khẩu. Kẻ lấy được mật khẩu mà không có điện thoại thì không ghi/đọc được gì.
--
-- An toàn, không tự khóa mình:
--   * Chỉ đòi aal2 khi tài khoản ĐÃ có app xác thực được xác nhận. Chưa bật (hoặc gỡ hết) thì vẫn như cũ.
--   * Nên chạy SAU khi bật xác thực 2 bước trong Admin và thử đăng xuất/đăng nhập lại thành công.
--
-- Mất điện thoại? Vào Supabase → Authentication → Users → chọn tài khoản → xóa MFA factor,
-- hoặc chạy khối "HOÀN TÁC" ở cuối file. Sau đó đăng nhập bằng mật khẩu và bật lại.
--
-- Cần chạy trước: supabase/migration-admin-lockdown.sql (tạo bảng admins và hàm is_admin()).

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
    and (
      coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
    );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ===== HOÀN TÁC (bỏ dấu -- ở các dòng dưới rồi chạy) =====
-- Trả is_admin() về bản cũ (chỉ cần có trong bảng admins):
-- create or replace function public.is_admin()
-- returns boolean
-- language sql stable security definer set search_path = public
-- as $$ select exists (select 1 from public.admins where user_id = auth.uid()); $$;
--
-- Mất app xác thực, cần xóa để đăng nhập lại bằng mật khẩu (sửa email):
-- delete from auth.mfa_factors where user_id = (select id from auth.users where lower(email) = lower('EMAIL_ADMIN_CUA_BAN@example.com'));
