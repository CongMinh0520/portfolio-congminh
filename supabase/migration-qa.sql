-- Bug mẫu, trang "Mình đã test chính web này" (/kiem-thu), trang CV online (/cv).
-- Cần hàm public.is_admin(): cài mới bằng schema.sql thì đã có; bản cũ chạy migration-admin-lockdown.sql trước.
-- Chạy 1 lần trong Supabase → SQL Editor. Chạy lại nhiều lần cũng không sao (không tạo trùng dữ liệu).

-- ===== Bảng bug mẫu (Admin → Bug mẫu) =====
create table if not exists public.bugs (
  id bigint generated always as identity primary key,
  sort int not null default 0,
  visible boolean not null default true,
  title text not null,
  severity text not null default 'major' check (severity in ('critical', 'major', 'minor', 'trivial')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'reported' check (status in ('reported', 'fixed', 'wontfix')),
  product text not null default '',
  product_url text not null default '',
  environment text not null default '',
  found_at date,
  steps text not null default '',
  expected text not null default '',
  actual text not null default '',
  content text not null default '',
  image text not null default '',
  tags text[] not null default '{}',
  en jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
-- Khách chỉ đọc được bug đang hiển thị; Admin đọc và ghi tất cả
alter table public.bugs enable row level security;
drop policy if exists "public read" on public.bugs;
create policy "public read" on public.bugs for select using (visible = true or public.is_admin());
drop policy if exists "admin write" on public.bugs;
create policy "admin write" on public.bugs for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== Trang Kiểm thử (Admin → Trang Kiểm thử web): điểm Lighthouse, môi trường đã test, checklist, bug tự tìm =====
alter table public.settings add column if not exists selftest jsonb not null default '{}'::jsonb;

-- ===== Thống kê: đếm thêm lượt xem trang bug, CV, Kiểm thử =====
alter table public.page_views drop constraint if exists page_views_kind_check;
alter table public.page_views add constraint page_views_kind_check
  check (kind in ('home', 'blog', 'post', 'project', 'notfound', 'bug', 'cv', 'selftest'));

-- ===== Trang chủ: 1 request lấy cả bug mẫu =====
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
    'bugs',         coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.bugs t), '[]'::jsonb),
    'footer_links', coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.footer_links t), '[]'::jsonb),
    'socials',      coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.id) from public.socials t), '[]'::jsonb)
  );
$$;
revoke all on function public.get_home() from public;
grant execute on function public.get_home() to anon, authenticated;

-- ===== Sao lưu / khôi phục: thêm bảng bugs =====
create or replace function public.restore_backup(tbl text, rows jsonb, overwrite boolean default false)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  r jsonb;
  cols text[];
  n integer := 0;
  done integer;
  ident boolean;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if tbl not in ('settings', 'admin_settings', 'posts', 'projects', 'skills', 'jobs', 'footer_links', 'socials', 'messages', 'bugs') then
    raise exception 'table % is not restorable', tbl;
  end if;
  if jsonb_typeof(rows) <> 'array' then raise exception 'rows must be an array'; end if;
  select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = tbl and column_name = 'id' and is_identity = 'YES') into ident;
  for r in select * from jsonb_array_elements(rows) loop
    if jsonb_typeof(r) <> 'object' or r->>'id' is null then continue; end if;
    -- chỉ lấy các cột vừa có trong file vừa có trong bảng (file cũ thiếu cột mới vẫn khôi phục được)
    select array_agg(c.column_name::text order by c.ordinal_position) into cols
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = tbl and r ? c.column_name;
    execute format(
      'insert into public.%1$I (%2$s) %3$s select %2$s from jsonb_populate_record(null::public.%1$I, $1) on conflict (id) do %4$s',
      tbl,
      (select string_agg(quote_ident(x), ', ') from unnest(cols) x),
      case when ident then 'overriding system value' else '' end,
      case when overwrite and array_length(cols, 1) > 1
        then 'update set ' || (select string_agg(format('%1$I = excluded.%1$I', x), ', ') from unnest(cols) x where x <> 'id')
        else 'nothing' end
    ) using r;
    get diagnostics done = row_count;
    n := n + done;
  end loop;
  -- id tự tăng tiếp tục sau id lớn nhất, để bài mới không trùng id vừa khôi phục
  if ident then
    execute format('select setval(pg_get_serial_sequence(%L, %L), greatest((select coalesce(max(id), 0) from public.%I), 1))', 'public.' || tbl, 'id', tbl);
  end if;
  return n;
end $$;
revoke execute on function public.restore_backup(text, jsonb, boolean) from public, anon;
grant execute on function public.restore_backup(text, jsonb, boolean) to authenticated;

-- ===== 3 bug mẫu (đang ẨN, duyệt trong Admin → Bug mẫu rồi bật "Hiển thị") =====
-- Tìm thật trên web thực hành kiểm thử Toolshop (bản có bug cài sẵn) ngày 13/10/2026. Chỉ thêm khi bảng còn trống.
insert into public.bugs (sort, visible, title, severity, priority, status, product, product_url, environment, found_at, steps, expected, actual, content, tags, en)
select * from (values
(1, false, $c$Sắp xếp theo giá và theo tên trả về thứ tự ngược$c$, 'major', 'high', 'reported',
 $c$Toolshop v5.0 (bản có bug) — trang danh sách sản phẩm$c$, $c$https://with-bugs.practicesoftwaretesting.com$c$,
 $c$Windows 10 · Chrome 152 · màn hình 1280×720$c$, date '2026-10-13',
 $c$1. Mở trang chủ Toolshop (bản có bug)
2. Ở ô sắp xếp bên trái (nhãn "Sorth"), chọn **Price (Low - High)**
3. Xem thứ tự sản phẩm ở trang 1
4. Lặp lại với **Price (High - Low)** và **Name (A - Z)**$c$,
 $c$Sản phẩm xếp đúng theo lựa chọn. Với **Price (Low - High)**, món rẻ nhất lên đầu: bản Toolshop không có bug hiện Washers $3.55, Flat-Head Wood Screws $3.95, M4 Nuts $4.65…$c$,
 $c$Cả 3 kiểu sắp xếp đều ra thứ tự **ngược**:
- **Price (Low - High):** Cordless Drill 20V $125.23, Cordless Drill 18V $119.24, Random Orbit Sander $100.79…
- **Price (High - Low):** Phillips Screwdriver $4.92, Slip Joint Pliers $9.17, Thor Hammer $11.14…
- **Name (A - Z):** Wood Saw, Thor Hammer, Slip Joint Pliers…$c$,
 $c$## Ghi chú
- Đã thử cả 3 kiểu sắp xếp, kiểu nào cũng bị.
- Làm đúng các bước này trên bản Toolshop không có bug thì kết quả đúng, nên lỗi nằm ở chiều sắp xếp chứ không phải ở dữ liệu.
- **Ảnh hưởng:** khách muốn tìm món rẻ nhất lại thấy món đắt nhất trước, dễ bỏ đi.
- **Lỗi phụ thấy cùng lúc:** nhãn ô sắp xếp sai chính tả "Sorth" (đúng là "Sort").

> Đây là web thực hành kiểm thử, lỗi được cài sẵn có chủ đích để luyện tập.$c$,
 ARRAY[$c$Chức năng$c$, $c$Sắp xếp$c$, $c$Web$c$]::text[],
 $c${"title":"Sorting by price and by name returns the reverse order","product":"Toolshop v5.0 (bugged build) — product list page","environment":"Windows 10 · Chrome 152 · 1280×720 screen","steps":"1. Open the Toolshop home page (bugged build)\n2. In the sort box on the left (labelled \"Sorth\"), choose **Price (Low - High)**\n3. Look at the order of products on page 1\n4. Repeat with **Price (High - Low)** and **Name (A - Z)**","expected":"Products are ordered as selected. With **Price (Low - High)** the cheapest item comes first: the bug-free Toolshop build shows Washers $3.55, Flat-Head Wood Screws $3.95, M4 Nuts $4.65…","actual":"All 3 sort options return the **reverse** order:\n- **Price (Low - High):** Cordless Drill 20V $125.23, Cordless Drill 18V $119.24, Random Orbit Sander $100.79…\n- **Price (High - Low):** Phillips Screwdriver $4.92, Slip Joint Pliers $9.17, Thor Hammer $11.14…\n- **Name (A - Z):** Wood Saw, Thor Hammer, Slip Joint Pliers…","content":"## Notes\n- Tried all 3 sort options; every one is affected.\n- The same steps on the bug-free Toolshop build give the correct order, so the problem is the sort direction, not the data.\n- **Impact:** shoppers looking for the cheapest item see the most expensive ones first and may leave.\n- **Side issue found at the same time:** the sort box label is misspelled \"Sorth\" (should be \"Sort\").\n\n> This is a practice site for software testing; its bugs are planted on purpose.","tags":["Functional","Sorting","Web"]}$c$::jsonb),
(2, false, $c$Nút "+" ở trang sản phẩm không tăng số lượng$c$, 'major', 'medium', 'reported',
 $c$Toolshop v5.0 (bản có bug) — trang chi tiết sản phẩm$c$, $c$https://with-bugs.practicesoftwaretesting.com/#/product/1$c$,
 $c$Windows 10 · Chrome 152 · màn hình 1280×720$c$, date '2026-10-13',
 $c$1. Mở trang sản phẩm **Combination Pliers**
2. Ô số lượng đang là 1
3. Bấm nút **+** cạnh ô số lượng 2 lần$c$,
 $c$Số lượng tăng lên 3. Trên bản Toolshop không có bug, bấm "+" một lần thì số lượng đổi từ 1 thành 2.$c$,
 $c$Số lượng vẫn là **1**, không có thông báo gì. Đã bấm chuột thật nhiều lần, kết quả như nhau.$c$,
 $c$## Ghi chú
- **Cách tạm né:** gõ thẳng số vào ô số lượng (ô cho phép từ 1 đến 99).
- **Ảnh hưởng:** người muốn mua nhiều món phải tự gõ số, khó thao tác hơn trên điện thoại; nhiều người sẽ nghĩ trang bị treo.
- Nút "−" giữ ở 1 là đúng vì số lượng tối thiểu là 1.

> Đây là web thực hành kiểm thử, lỗi được cài sẵn có chủ đích để luyện tập.$c$,
 ARRAY[$c$Chức năng$c$, $c$Giỏ hàng$c$, $c$Web$c$]::text[],
 $c${"title":"The \"+\" button on the product page does not increase the quantity","product":"Toolshop v5.0 (bugged build) — product detail page","environment":"Windows 10 · Chrome 152 · 1280×720 screen","steps":"1. Open the **Combination Pliers** product page\n2. The quantity box shows 1\n3. Click the **+** button next to the quantity box twice","expected":"The quantity goes up to 3. On the bug-free Toolshop build, one click on \"+\" changes the quantity from 1 to 2.","actual":"The quantity stays at **1** with no message. Clicked with a real mouse several times, same result every time.","content":"## Notes\n- **Workaround:** type the number straight into the quantity box (it accepts 1 to 99).\n- **Impact:** anyone buying several items has to type the number, which is harder on a phone; many will think the page is frozen.\n- The \"−\" button staying at 1 is correct, since the minimum quantity is 1.\n\n> This is a practice site for software testing; its bugs are planted on purpose.","tags":["Functional","Cart","Web"]}$c$::jsonb),
(3, false, $c$Nút "Add to favourites" đè lên nút "Add to cart"$c$, 'minor', 'medium', 'reported',
 $c$Toolshop v5.0 (bản có bug) — trang chi tiết sản phẩm$c$, $c$https://with-bugs.practicesoftwaretesting.com/#/product/1$c$,
 $c$Windows 10 · Chrome 152 · màn hình 1280×720$c$, date '2026-10-13',
 $c$1. Mở trang sản phẩm **Combination Pliers** trên màn hình rộng 1280px
2. Nhìn hai nút ngay dưới ô số lượng$c$,
 $c$Hai nút nằm cạnh nhau, có khoảng cách, đọc được đủ chữ "Add to cart" và "Add to favourites".$c$,
 $c$Nút **Add to favourites** (màu vàng) đè lên khoảng 50px bên phải nút **Add to cart** (màu xanh), che mất chữ, chỉ còn đọc được "Add t…".
Đo bằng DevTools: "Add to cart" nằm từ x = 644 đến 775px, còn "Add to favourites" bắt đầu từ x = 725px.$c$,
 $c$## Ghi chú
- **Ảnh hưởng:** nút mua hàng quan trọng nhất bị che chữ; bấm vào nửa bên phải có nguy cơ trúng nhầm nút Yêu thích.
- Mới thử ở độ rộng 1280px; cần thử thêm trên điện thoại và máy tính bảng.

> Đây là web thực hành kiểm thử, lỗi được cài sẵn có chủ đích để luyện tập.$c$,
 ARRAY[$c$Giao diện$c$, $c$Bố cục$c$, $c$Web$c$]::text[],
 $c${"title":"The \"Add to favourites\" button overlaps the \"Add to cart\" button","product":"Toolshop v5.0 (bugged build) — product detail page","environment":"Windows 10 · Chrome 152 · 1280×720 screen","steps":"1. Open the **Combination Pliers** product page on a 1280px-wide screen\n2. Look at the two buttons right below the quantity box","expected":"The two buttons sit side by side with a gap, and both labels \"Add to cart\" and \"Add to favourites\" are fully readable.","actual":"The **Add to favourites** button (yellow) covers about 50px of the right side of the **Add to cart** button (green), hiding its label so only \"Add t…\" is readable.\nMeasured in DevTools: \"Add to cart\" spans x = 644 to 775px, while \"Add to favourites\" starts at x = 725px.","content":"## Notes\n- **Impact:** the most important buy button has its label hidden; clicking its right half risks hitting the Favourites button instead.\n- Only tested at 1280px wide so far; phones and tablets still need checking.\n\n> This is a practice site for software testing; its bugs are planted on purpose.","tags":["UI","Layout","Web"]}$c$::jsonb)
) as v(sort, visible, title, severity, priority, status, product, product_url, environment, found_at, steps, expected, actual, content, tags, en)
where not exists (select 1 from public.bugs);
