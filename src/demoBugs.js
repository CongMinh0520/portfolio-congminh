// Bug mẫu cho bản demo (giống 3 bug trong supabase/migration-qa.sql)
export const DEMO_BUGS = [
 {
  "id": 1,
  "sort": 1,
  "title": "Sắp xếp theo giá và theo tên trả về thứ tự ngược",
  "severity": "major",
  "priority": "high",
  "status": "reported",
  "product": "Toolshop v5.0 (bản có bug) — trang danh sách sản phẩm",
  "product_url": "https://with-bugs.practicesoftwaretesting.com",
  "environment": "Windows 10 · Chrome 152 · màn hình 1280×720",
  "found_at": "2026-10-13",
  "steps": "1. Mở trang chủ Toolshop (bản có bug)\n2. Ở ô sắp xếp bên trái (nhãn \"Sorth\"), chọn **Price (Low - High)**\n3. Xem thứ tự sản phẩm ở trang 1\n4. Lặp lại với **Price (High - Low)** và **Name (A - Z)**",
  "expected": "Sản phẩm xếp đúng theo lựa chọn. Với **Price (Low - High)**, món rẻ nhất lên đầu: bản Toolshop không có bug hiện Washers $3.55, Flat-Head Wood Screws $3.95, M4 Nuts $4.65…",
  "actual": "Cả 3 kiểu sắp xếp đều ra thứ tự **ngược**:\n- **Price (Low - High):** Cordless Drill 20V $125.23, Cordless Drill 18V $119.24, Random Orbit Sander $100.79…\n- **Price (High - Low):** Phillips Screwdriver $4.92, Slip Joint Pliers $9.17, Thor Hammer $11.14…\n- **Name (A - Z):** Wood Saw, Thor Hammer, Slip Joint Pliers…",
  "content": "## Ghi chú\n- Đã thử cả 3 kiểu sắp xếp, kiểu nào cũng bị.\n- Làm đúng các bước này trên bản Toolshop không có bug thì kết quả đúng, nên lỗi nằm ở chiều sắp xếp chứ không phải ở dữ liệu.\n- **Ảnh hưởng:** khách muốn tìm món rẻ nhất lại thấy món đắt nhất trước, dễ bỏ đi.\n- **Lỗi phụ thấy cùng lúc:** nhãn ô sắp xếp sai chính tả \"Sorth\" (đúng là \"Sort\").\n\n> Đây là web thực hành kiểm thử, lỗi được cài sẵn có chủ đích để luyện tập.",
  "image": "",
  "tags": [
   "Chức năng",
   "Sắp xếp",
   "Web"
  ],
  "en": {
   "title": "Sorting by price and by name returns the reverse order",
   "product": "Toolshop v5.0 (bugged build) — product list page",
   "environment": "Windows 10 · Chrome 152 · 1280×720 screen",
   "steps": "1. Open the Toolshop home page (bugged build)\n2. In the sort box on the left (labelled \"Sorth\"), choose **Price (Low - High)**\n3. Look at the order of products on page 1\n4. Repeat with **Price (High - Low)** and **Name (A - Z)**",
   "expected": "Products are ordered as selected. With **Price (Low - High)** the cheapest item comes first: the bug-free Toolshop build shows Washers $3.55, Flat-Head Wood Screws $3.95, M4 Nuts $4.65…",
   "actual": "All 3 sort options return the **reverse** order:\n- **Price (Low - High):** Cordless Drill 20V $125.23, Cordless Drill 18V $119.24, Random Orbit Sander $100.79…\n- **Price (High - Low):** Phillips Screwdriver $4.92, Slip Joint Pliers $9.17, Thor Hammer $11.14…\n- **Name (A - Z):** Wood Saw, Thor Hammer, Slip Joint Pliers…",
   "content": "## Notes\n- Tried all 3 sort options; every one is affected.\n- The same steps on the bug-free Toolshop build give the correct order, so the problem is the sort direction, not the data.\n- **Impact:** shoppers looking for the cheapest item see the most expensive ones first and may leave.\n- **Side issue found at the same time:** the sort box label is misspelled \"Sorth\" (should be \"Sort\").\n\n> This is a practice site for software testing; its bugs are planted on purpose.",
   "tags": [
    "Functional",
    "Sorting",
    "Web"
   ]
  }
 },
 {
  "id": 2,
  "sort": 2,
  "title": "Nút \"+\" ở trang sản phẩm không tăng số lượng",
  "severity": "major",
  "priority": "medium",
  "status": "reported",
  "product": "Toolshop v5.0 (bản có bug) — trang chi tiết sản phẩm",
  "product_url": "https://with-bugs.practicesoftwaretesting.com/#/product/1",
  "environment": "Windows 10 · Chrome 152 · màn hình 1280×720",
  "found_at": "2026-10-13",
  "steps": "1. Mở trang sản phẩm **Combination Pliers**\n2. Ô số lượng đang là 1\n3. Bấm nút **+** cạnh ô số lượng 2 lần",
  "expected": "Số lượng tăng lên 3. Trên bản Toolshop không có bug, bấm \"+\" một lần thì số lượng đổi từ 1 thành 2.",
  "actual": "Số lượng vẫn là **1**, không có thông báo gì. Đã bấm chuột thật nhiều lần, kết quả như nhau.",
  "content": "## Ghi chú\n- **Cách tạm né:** gõ thẳng số vào ô số lượng (ô cho phép từ 1 đến 99).\n- **Ảnh hưởng:** người muốn mua nhiều món phải tự gõ số, khó thao tác hơn trên điện thoại; nhiều người sẽ nghĩ trang bị treo.\n- Nút \"−\" giữ ở 1 là đúng vì số lượng tối thiểu là 1.\n\n> Đây là web thực hành kiểm thử, lỗi được cài sẵn có chủ đích để luyện tập.",
  "image": "",
  "tags": [
   "Chức năng",
   "Giỏ hàng",
   "Web"
  ],
  "en": {
   "title": "The \"+\" button on the product page does not increase the quantity",
   "product": "Toolshop v5.0 (bugged build) — product detail page",
   "environment": "Windows 10 · Chrome 152 · 1280×720 screen",
   "steps": "1. Open the **Combination Pliers** product page\n2. The quantity box shows 1\n3. Click the **+** button next to the quantity box twice",
   "expected": "The quantity goes up to 3. On the bug-free Toolshop build, one click on \"+\" changes the quantity from 1 to 2.",
   "actual": "The quantity stays at **1** with no message. Clicked with a real mouse several times, same result every time.",
   "content": "## Notes\n- **Workaround:** type the number straight into the quantity box (it accepts 1 to 99).\n- **Impact:** anyone buying several items has to type the number, which is harder on a phone; many will think the page is frozen.\n- The \"−\" button staying at 1 is correct, since the minimum quantity is 1.\n\n> This is a practice site for software testing; its bugs are planted on purpose.",
   "tags": [
    "Functional",
    "Cart",
    "Web"
   ]
  }
 },
 {
  "id": 3,
  "sort": 3,
  "title": "Nút \"Add to favourites\" đè lên nút \"Add to cart\"",
  "severity": "minor",
  "priority": "medium",
  "status": "reported",
  "product": "Toolshop v5.0 (bản có bug) — trang chi tiết sản phẩm",
  "product_url": "https://with-bugs.practicesoftwaretesting.com/#/product/1",
  "environment": "Windows 10 · Chrome 152 · màn hình 1280×720",
  "found_at": "2026-10-13",
  "steps": "1. Mở trang sản phẩm **Combination Pliers** trên màn hình rộng 1280px\n2. Nhìn hai nút ngay dưới ô số lượng",
  "expected": "Hai nút nằm cạnh nhau, có khoảng cách, đọc được đủ chữ \"Add to cart\" và \"Add to favourites\".",
  "actual": "Nút **Add to favourites** (màu vàng) đè lên khoảng 50px bên phải nút **Add to cart** (màu xanh), che mất chữ, chỉ còn đọc được \"Add t…\".\nĐo bằng DevTools: \"Add to cart\" nằm từ x = 644 đến 775px, còn \"Add to favourites\" bắt đầu từ x = 725px.",
  "content": "## Ghi chú\n- **Ảnh hưởng:** nút mua hàng quan trọng nhất bị che chữ; bấm vào nửa bên phải có nguy cơ trúng nhầm nút Yêu thích.\n- Mới thử ở độ rộng 1280px; cần thử thêm trên điện thoại và máy tính bảng.\n\n> Đây là web thực hành kiểm thử, lỗi được cài sẵn có chủ đích để luyện tập.",
  "image": "",
  "tags": [
   "Giao diện",
   "Bố cục",
   "Web"
  ],
  "en": {
   "title": "The \"Add to favourites\" button overlaps the \"Add to cart\" button",
   "product": "Toolshop v5.0 (bugged build) — product detail page",
   "environment": "Windows 10 · Chrome 152 · 1280×720 screen",
   "steps": "1. Open the **Combination Pliers** product page on a 1280px-wide screen\n2. Look at the two buttons right below the quantity box",
   "expected": "The two buttons sit side by side with a gap, and both labels \"Add to cart\" and \"Add to favourites\" are fully readable.",
   "actual": "The **Add to favourites** button (yellow) covers about 50px of the right side of the **Add to cart** button (green), hiding its label so only \"Add t…\" is readable.\nMeasured in DevTools: \"Add to cart\" spans x = 644 to 775px, while \"Add to favourites\" starts at x = 725px.",
   "content": "## Notes\n- **Impact:** the most important buy button has its label hidden; clicking its right half risks hitting the Favourites button instead.\n- Only tested at 1280px wide so far; phones and tablets still need checking.\n\n> This is a practice site for software testing; its bugs are planted on purpose.",
   "tags": [
    "UI",
    "Layout",
    "Web"
   ]
  }
 }
]
