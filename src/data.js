import { POSTS_EN } from './postsEn.js'
import { DEMO_BUGS } from './demoBugs.js'
// Nav + dữ liệu mẫu (dùng khi chưa cấu hình Supabase). Cùng cấu trúc với các bảng trong supabase/schema.sql
import { links, SECTIONS, SECTION_OF, marquee, meta, GRADS, DEMO_SETTINGS } from './siteBase.js'
export { links, SECTIONS, SECTION_OF, marquee, meta, GRADS, DEMO_SETTINGS }

export const demo = {
  skills: [
    { id: 1, sort: 1, icon: '🔍', title: 'Manual Testing', description: 'Đọc hiểu yêu cầu, viết test case và checklist, test chức năng, giao diện, regression và hỗ trợ UAT trước khi phát hành.', tags: ['Test case', 'Exploratory', 'Regression', 'UAT'] },
    { id: 2, sort: 2, icon: '🔌', title: 'API & Dữ liệu', description: 'Kiểm tra API thủ công bằng Postman, đối chiếu dữ liệu bằng SQL, xem request và lỗi trên DevTools để khoanh vùng bug.', tags: ['Postman', 'SQL', 'DevTools'] },
    { id: 3, sort: 3, icon: '🐞', title: 'Quản lý bug & tài liệu', description: 'Báo bug rõ ràng có bước tái hiện và bằng chứng, theo dõi đến khi sửa xong. Đang học thêm automation để rút ngắn thời gian regression.', tags: ['Jira', 'Trello', 'TestRail', 'Google Sheets'] },
  ],
  jobs: [
    { id: 1, sort: 1, period: '2025 – Hiện tại', role: 'QA Tester (Manual)', description: 'Công ty ABC — kiểm thử ứng dụng launcher iOS/Android tích hợp ví blockchain và NFT: viết test case, test trên nhiều thiết bị, báo và theo dõi bug trên Jira.' },
    { id: 2, sort: 2, period: '2024 – 2025', role: 'Junior Tester', description: 'Công ty XYZ — kiểm thử website thương mại điện tử và phần mềm quản lý nhân sự; viết test case trên Google Sheets/TestRail, kiểm tra API bằng Postman.' },
  ],
  projects: [
    { id: 1, sort: 1, category: 'BLOCKCHAIN · WALLET & NFT', title: 'Kiểm thử launcher tích hợp ví và NFT', grad: 'neon', link: '',
      description: 'Test thủ công ứng dụng launcher iOS/Android có ví blockchain: tạo/khôi phục ví, gửi nhận token, hiển thị NFT.',
      role: 'QA Tester (Manual)', duration: 'Đang tham gia', tools: ['Jira', 'Google Sheets', 'Postman', 'Testnet'],
      content: `## Bối cảnh
Ứng dụng launcher cho iOS và Android, tích hợp sẵn ví blockchain để người dùng giữ token và xem bộ sưu tập NFT ngay trên điện thoại.

## Mình đã làm gì
- Viết test case cho các luồng chính: **tạo ví, khôi phục ví bằng cụm từ khôi phục**, đặt mã PIN, khóa/mở ứng dụng
- Test gửi và nhận token trên **mạng thử nghiệm (testnet)**, kiểm tra số dư, phí giao dịch và trạng thái chờ / thành công / thất bại
- Kiểm tra hiển thị NFT: ảnh, tên, thông tin bộ sưu tập, trường hợp mất mạng hoặc ảnh lỗi
- Test trên nhiều thiết bị và phiên bản iOS/Android khác nhau
- Báo bug trên Jira kèm video quay màn hình, kiểm tra lại sau khi dev sửa

## Điều mình học được
Với ví, một lỗi nhỏ cũng ảnh hưởng tới tài sản người dùng, nên mình luôn test kỹ các trường hợp biên: nhập sai địa chỉ ví, số dư không đủ, mạng chập chờn giữa lúc gửi.

> Ghi chú: đây là nội dung mẫu, sửa trong Admin → Dự án.` },
    { id: 2, sort: 2, category: 'WEB · THƯƠNG MẠI ĐIỆN TỬ', title: 'Kiểm thử website bán hàng', grad: 'sunset', link: '',
      description: 'Test giỏ hàng, thanh toán và mã giảm giá trên nhiều trình duyệt trước mỗi lần phát hành.',
      role: 'Manual Tester', duration: 'Khoảng 6 tháng', tools: ['TestRail', 'Jira', 'Chrome DevTools', 'Postman'],
      content: `## Bối cảnh
Website bán lẻ với giỏ hàng, mã giảm giá và nhiều phương thức thanh toán, phát hành bản mới định kỳ.

## Mình đã làm gì
- Viết test case theo từng chức năng: tìm kiếm, giỏ hàng, **mã giảm giá**, thanh toán, lịch sử đơn hàng
- Ưu tiên test theo rủi ro: luồng thanh toán và khuyến mãi được test kỹ nhất
- Test trên Chrome, Safari, Firefox và giao diện điện thoại
- Dùng DevTools xem request lỗi, dùng Postman kiểm tra lại API giỏ hàng khi nghi lỗi nằm ở phía server
- Chạy lại bộ test regression trước mỗi lần phát hành

## Kết quả
Các lỗi nghiêm trọng ở luồng thanh toán và áp mã giảm giá được phát hiện và sửa trước khi lên bản chính thức.

> Ghi chú: đây là nội dung mẫu, sửa trong Admin → Dự án.` },
    { id: 3, sort: 3, category: 'MOBILE · iOS / ANDROID', title: 'Kiểm thử ứng dụng di động', grad: 'orange', link: '',
      description: 'Test chức năng và giao diện app trên nhiều dòng máy, kiểm tra thông báo, quyền truy cập và trường hợp mất mạng.',
      role: 'Manual Tester', duration: 'Khoảng 4 tháng', tools: ['Jira', 'Google Sheets', 'Postman'],
      content: `## Bối cảnh
Ứng dụng di động chạy trên cả iOS và Android, cần ổn định trên nhiều kích thước màn hình và phiên bản hệ điều hành.

## Mình đã làm gì
- Lập ma trận thiết bị cần test (dòng máy, phiên bản hệ điều hành, kích thước màn hình)
- Test các luồng chính, thông báo đẩy, quyền camera / vị trí, chế độ sáng tối
- Test các tình huống thực tế: **mất mạng, chuyển ứng dụng nền, xoay màn hình, pin yếu**
- Kiểm tra cài đặt mới và cập nhật từ bản cũ lên bản mới

## Kết quả
Bắt được nhiều lỗi giao diện chỉ xuất hiện trên một số dòng máy và lỗi mất dữ liệu khi ứng dụng bị đưa xuống nền.

> Ghi chú: đây là nội dung mẫu, sửa trong Admin → Dự án.` },
    { id: 4, sort: 4, category: 'PHẦN MỀM QUẢN LÝ · HR', title: 'Kiểm thử hệ thống quản lý nhân sự', grad: 'gold', link: '',
      description: 'Test phân quyền, chấm công, tính lương và báo cáo; đối chiếu dữ liệu bằng SQL.',
      role: 'Junior Tester', duration: 'Khoảng 5 tháng', tools: ['TestRail', 'SQL', 'Jira', 'Excel'],
      content: `## Bối cảnh
Phần mềm quản lý nhân sự nội bộ: hồ sơ nhân viên, chấm công, nghỉ phép, tính lương và báo cáo cho quản lý.

## Mình đã làm gì
- Test **phân quyền** theo vai trò: nhân viên, trưởng phòng, nhân sự, quản trị
- Test luồng xin nghỉ phép và duyệt nhiều cấp
- Kiểm tra công thức chấm công, tính lương với các trường hợp đặc biệt (làm thêm giờ, nghỉ không lương, vào giữa tháng)
- Dùng **SQL** đối chiếu số liệu trên báo cáo với dữ liệu trong database
- Xuất file Excel và kiểm tra định dạng, số liệu

## Kết quả
Phát hiện các lỗi sai số khi tính lương ở trường hợp đặc biệt và lỗi phân quyền cho xem dữ liệu không đúng vai trò.

> Ghi chú: đây là nội dung mẫu, sửa trong Admin → Dự án.` },
  ],
  posts: [
    // Các bài viết mới (viết lại có nguồn tham khảo), sort âm để nằm trên cùng
    { id: 10, sort: -7, title: 'Phân vùng tương đương và giá trị biên: ít test case mà vẫn bắt được bug', url: '', published_at: '2026-10-12', tags: ['Test case', 'Kỹ thuật test'],
      excerpt: 'Một ô nhập số có thể nhận hàng nghìn giá trị, nhưng thường chỉ cần khoảng 6 giá trị đúng chỗ. Đây là hai kỹ thuật mình dùng nhiều nhất khi viết test case.',
      content: `Gặp ô nhập "Số lượng: 1 đến 1000", không ai test cả 1000 số. Câu hỏi là chọn số nào để vừa ít test case vừa không bỏ lọt bug. Hai kỹ thuật cơ bản nhất giúp trả lời: phân vùng tương đương (equivalence partitioning) và phân tích giá trị biên (boundary value analysis).

## Phân vùng tương đương: chia nhóm, mỗi nhóm thử một

Ý tưởng: những giá trị mà hệ thống xử lý giống nhau thì thuộc cùng một nhóm, test một giá trị là đại diện cho cả nhóm.

Với ô "1 đến 1000" có 3 nhóm:

- **Hợp lệ:** từ 1 đến 1000, thử một số như 99.
- **Không hợp lệ, nhỏ hơn:** thử 0.
- **Không hợp lệ, lớn hơn:** thử 1001.

Đừng quên các nhóm "ngoài lề" mà yêu cầu ít khi ghi: để trống, chữ cái, số âm, số thập phân, ký tự đặc biệt, dán vào một chuỗi rất dài.

## Giá trị biên: bug thích nằm ở mép

Lập trình viên hay nhầm giữa "nhỏ hơn" và "nhỏ hơn hoặc bằng". Vì vậy bug thường nằm đúng ở ranh giới giữa các nhóm. Với ô "1 đến 1000", các giá trị nên thử là:

- **0, 1, 2** quanh biên dưới
- **999, 1000, 1001** quanh biên trên

## Áp dụng vào công việc thật

- **Giỏ hàng:** mua tối đa 5 sản phẩm mỗi loại → thử 0, 1, 5, 6. Và thử bấm nút "+" khi đang ở 5.
- **Mã giảm giá:** đơn từ 500.000đ được giảm → thử 499.999đ, 500.000đ, 500.001đ. Nhớ kiểm tra cả lúc bỏ bớt hàng làm đơn tụt dưới mức.
- **Ví blockchain:** số dư 10 token, phí 0,1 → thử gửi 9,9 (vừa đủ), 9,91 (thiếu phí), 0, và số có nhiều chữ số thập phân hơn token cho phép.
- **Nghỉ phép:** còn 2 ngày phép → thử xin 2 ngày, 2,5 ngày, nửa ngày cuối cùng.

## Mẹo nhỏ

- Biên không chỉ là số: độ dài chuỗi (tên tối đa 50 ký tự), ngày (hết hạn lúc 23:59), số lượng file tải lên, dung lượng ảnh.
- Ghi rõ giá trị đã chọn trong test case, đừng ghi chung chung "nhập số không hợp lệ". Người chạy lại test sẽ biết chính xác cần nhập gì.

## Nguồn tham khảo

- [What is Boundary Value Analysis and Equivalence Partitioning?](https://www.softwaretestinghelp.com/what-is-boundary-value-analysis-and-equivalence-partitioning/) — Software Testing Help` },
    { id: 9, sort: -6, title: 'Smoke test và sanity test: khác nhau ở đâu, khi nào dùng', url: '', published_at: '2026-10-12', tags: ['Regression', 'Manual testing'],
      excerpt: 'Hai cái tên hay bị dùng lẫn lộn. Smoke test hỏi "bản build này có đáng để test tiếp không", còn sanity test hỏi "chỗ vừa sửa đã ổn chưa".',
      content: `Trong các buổi họp, mình hay nghe "test smoke giúp anh", "chạy sanity lại đi" như thể hai việc là một. Chúng giống nhau ở chỗ đều nhanh và đều làm trước khi test sâu, nhưng mục đích khác hẳn.

## Smoke test: bản build có "bốc khói" không?

- **Khi nào:** ngay khi nhận một bản build mới, trước mọi việc khác.
- **Phạm vi:** rộng nhưng nông. Đi qua toàn bộ hệ thống, mỗi chức năng chính chạm một lần.
- **Câu hỏi cần trả lời:** bản build này có ổn định để bắt đầu test không?
- **Kết quả:** đạt thì test tiếp; không đạt thì trả build về cho dev, khỏi mất cả buổi test trên một bản hỏng.

Ví dụ với web bán hàng: mở được trang, đăng nhập được, danh sách sản phẩm hiện ra, thêm được vào giỏ, mở được trang thanh toán. Khoảng 10–15 phút.

## Sanity test: chỗ vừa sửa đã ổn chưa?

- **Khi nào:** trên một bản build đã ổn định, sau khi sửa bug hoặc thay đổi nhỏ.
- **Phạm vi:** hẹp nhưng sâu hơn. Chỉ tập trung vào phần vừa đổi và xung quanh nó.
- **Câu hỏi cần trả lời:** thay đổi này chạy đúng và hợp lý chưa?
- **Kết quả:** đạt thì chuyển sang regression đầy đủ hoặc phát hành; không đạt thì mở lại bug.

Ví dụ: dev vừa sửa lỗi mã giảm giá áp sai. Mình thử mã hợp lệ, mã hết hạn, mã áp hai lần ở bước thanh toán, xem tổng tiền đúng chưa. Không test lại cả ứng dụng.

## Nhớ nhanh

- **Smoke:** rộng và nông, cho bản build mới, quyết định "có test tiếp không".
- **Sanity:** hẹp và tập trung, cho thay đổi nhỏ, quyết định "chỗ sửa đã ổn chưa".
- Cả hai đều không thay được regression. Đạt smoke hay sanity chỉ có nghĩa là đủ điều kiện để test tiếp, chưa phải là đã test xong.

## Mẹo cho manual tester

Mình giữ sẵn một checklist smoke 10–15 dòng cho mỗi dự án, ghi theo thứ tự đi qua ứng dụng. Mỗi lần có build mới chỉ việc chạy từ trên xuống, ghi đạt hoặc không đạt. Danh sách này cũng là ứng viên đầu tiên khi team bắt đầu làm automation.

## Nguồn tham khảo

- [Smoke Testing vs Sanity Testing](https://www.practitest.com/resource-center/article/smoke-testing-vs-sanity-testing/) — PractiTest` },
  { id: 8, sort: -5, title: 'RCRCRC: chọn gì để test regression khi không đủ thời gian', url: '', published_at: '2026-10-11', tags: ['Regression', 'Manual testing'],
    excerpt: 'Không bao giờ có đủ thời gian để test lại mọi thứ trước khi phát hành. RCRCRC là 6 chữ cái giúp mình chọn đúng chỗ cần test lại.',
    content: `Trước mỗi lần phát hành, câu hỏi khó nhất không phải là "test thế nào" mà là "test lại cái gì". Bộ test regression càng ngày càng dài, còn thời gian thì vẫn vậy. Mình hay dùng RCRCRC, một gợi nhớ do Karen N. Johnson đưa ra, để chọn phần cần test lại.

## 6 chữ cái, 6 câu hỏi

- **Recent (vừa đổi):** bản build này đổi gì? Đọc ghi chú phát hành, các ticket đã đóng, kể cả thay đổi "nhỏ" như sửa câu thông báo hay đổi cách ghi log.
- **Core (cốt lõi):** chức năng nào hỏng là người dùng bỏ đi ngay? Với web bán hàng là tìm kiếm, giỏ hàng, thanh toán; với ví là gửi và nhận token.
- **Risky (rủi ro):** phần nào phụ thuộc dịch vụ bên ngoài hoặc nhiều phần khác cùng lúc? Cổng thanh toán, đăng nhập bằng mạng xã hội, đồng bộ dữ liệu.
- **Configuration sensitive (nhạy với cấu hình):** phần nào chạy khác nhau giữa môi trường test và môi trường thật? Email gửi tự động, múi giờ, khóa API, cấu hình mạng blockchain.
- **Repaired (vừa sửa):** bug vừa sửa xong, và cả những chức năng nằm sát nó. Sửa chỗ này hỏng chỗ kia là chuyện thường ngày.
- **Chronic (bệnh mãn tính):** khu vực nào cứ vài bản lại có bug? Mở lịch sử bug trên Jira là thấy ngay.

## Cách mình áp dụng

1. Lấy danh sách thay đổi của bản build, đánh dấu từng mục theo 6 chữ trên.
2. Phần nào trúng từ 2 chữ trở lên thì test kỹ trước.
3. Phần **Core** luôn chạy một lượt nhanh, kể cả khi không ai đụng vào.
4. Ghi lại phần nào chưa kịp test để báo cho team trước khi phát hành, đừng im lặng.

## Ví dụ nhanh

Bản build sửa lỗi làm tròn phí giao dịch trong ví. Theo RCRCRC, mình sẽ test lại: màn hình gửi token (**Recent, Repaired**), luồng gửi và nhận (**Core**), phí trên mạng thử nghiệm và mạng thật (**Configuration sensitive**), và lịch sử giao dịch, chỗ trước đây từng hiển thị sai số tiền (**Chronic**).

RCRCRC không thay được bộ test case, nhưng giúp mình trả lời rõ ràng khi bị hỏi "sao không test phần kia?".

## Nguồn tham khảo

- [A software expert's heuristic for regression testing](https://www.techtarget.com/searchsoftwarequality/tip/A-software-experts-heuristic-for-regression-testing) — Karen N. Johnson, TechTarget
- [RCRCRC — A heuristic for regression testing](https://www.ministryoftesting.com/moments/rcrcrc-a-heuristic-for-regression-testing) — Ministry of Testing` },

  { id: 7, sort: -4, title: 'Exploratory testing có kế hoạch: test theo charter trong 90 phút', url: '', published_at: '2026-10-09', tags: ['Exploratory', 'Manual testing'],
    excerpt: 'Exploratory testing không phải là bấm lung tung. Chia thành từng phiên có mục tiêu, giới hạn thời gian và ghi chép lại giúp kết quả đo được và báo cáo được.',
    content: `Nhiều người nghĩ exploratory testing là "không có test case thì bấm thử". Thực tế, test khám phá hiệu quả nhất khi có khung rõ ràng. Cách mình hay dùng là Session-Based Test Management (SBTM), do Jon Bach và James Bach xây dựng.

## Charter: một câu nói rõ mình đi tìm gì

Mỗi phiên test bắt đầu bằng một charter, tức một câu mục tiêu. Mẫu mình hay dùng:

> Khám phá **[khu vực]** với **[công cụ, dữ liệu hoặc cách tiếp cận]** để tìm **[loại vấn đề]**.

Ví dụ:

- Khám phá **mã giảm giá ở bước thanh toán** với **mã hết hạn, mã dùng nhiều lần, mã kết hợp** để tìm **sai tổng tiền**.
- Khám phá **khôi phục ví** với **cụm từ khôi phục nhập sai, thừa khoảng trắng** để tìm **trường hợp app báo sai hoặc treo**.

Charter cho biết hướng đi, không bắt mình làm từng bước như test case.

## Giới hạn thời gian

Một phiên thường khoảng 90 phút, có thể ngắn 45 phút hoặc dài tới 2 tiếng. Hết giờ thì dừng, kể cả đang hăng. Giới hạn này giúp mình tập trung và giúp team ước lượng được: "còn 6 phiên nữa cho phần thanh toán".

## Ghi lại trong lúc test

Mình ghi ngắn gọn vào một file, mỗi phiên một mục, ví dụ:

- **Charter:** mã giảm giá ở bước thanh toán
- **Thời gian:** 90 phút
- **Bug tìm được:** 2
- **Câu hỏi cần hỏi:** mã có được cộng dồn với khuyến mãi khác không?
- **Cần phiên tiếp:** có, phần hoàn tiền khi hủy đơn

Cột "Câu hỏi" quan trọng không kém cột bug. Nhiều chỗ không phải bug mà là yêu cầu chưa rõ.

## Trao đổi sau phiên

Sau phiên, mình dành 15–30 phút kể lại cho trưởng nhóm hoặc dev: đã test gì, chưa kịp test gì, gặp gì cản trở, phiên tiếp theo nên làm gì. Nhờ vậy test khám phá có kết quả rõ ràng, không còn là "chắc đã test kỹ rồi".

## Nguồn tham khảo

- [Session-Based Test Management](https://ryancraventech.substack.com/p/session-based-test-management) — Ryan Craven
- [Session-Based Test Management](https://www.virtuosoqa.com/post/session-based-test-management) — Virtuoso QA` },

  { id: 6, sort: -3, title: 'Test theo rủi ro: xếp thứ tự test khi ngày phát hành không dời được', url: '', published_at: '2026-10-07', tags: ['Risk-based', 'Test planning'],
    excerpt: 'Khi deadline cố định, test hết là không thể. Chấm điểm mức thiệt hại và khả năng lỗi cho từng phần giúp quyết định test gì trước, test sâu tới đâu.',
    content: `Ngày phát hành đã chốt, bộ test thì chưa chạy được một nửa. Lúc đó câu hỏi đúng là: nếu chỉ còn thời gian cho một nửa, nửa nào đáng test nhất? Test theo rủi ro (risk-based testing) giúp trả lời câu này bằng con số thay vì cảm giác.

## Rủi ro = thiệt hại × khả năng xảy ra

**Thiệt hại nếu hỏng:** chấm cho từng chức năng.

- 3: thảm họa (mất tiền, mất dữ liệu, sai lương)
- 2: gây hại (người dùng không làm tiếp được)
- 1: gây khó chịu (phải làm cách khác)
- 0: chỉ là phiền (lệch chữ, sai màu)

Cộng thêm điểm theo mức độ dùng thường xuyên: tính năng ai cũng phải đi qua (đăng nhập, thanh toán) nặng hơn tính năng ít người dùng.

**Khả năng có lỗi:** để ý các dấu hiệu sau.

- Code phức tạp, nhiều điều kiện
- Vừa sửa gấp sát ngày phát hành
- Công nghệ mới team chưa quen
- Khu vực có nhiều bug trước đây
- Nhiều người cùng sửa, trao đổi không rõ

## Chấm điểm và xếp hạng

Mình làm một bảng trên Google Sheets: mỗi dòng một chức năng, chấm 1–5 cho từng yếu tố, nhân trọng số, cộng lại. Không cần chính xác tuyệt đối; mục tiêu là chia được nhóm cao, trung bình, thấp.

- **Thanh toán + mã giảm giá:** thiệt hại cao, khả năng lỗi cao (vừa sửa) → test đầu tiên, test sâu.
- **Tìm kiếm sản phẩm:** thiệt hại trung bình, khả năng lỗi thấp → một lượt nhanh.
- **Trang giới thiệu:** thiệt hại thấp, khả năng lỗi thấp → để cuối.

## Lên lịch test theo điểm

1. Chạy một lượt nhanh qua toàn hệ thống trước để biết chỗ nào "có mùi".
2. Test sâu theo thứ tự điểm từ cao xuống thấp.
3. Báo bug nghiêm trọng ngay khi thấy, đừng gom cuối ngày. Báo sớm còn kịp sửa hoặc dời lịch.
4. Hết giờ thì dừng và báo rõ phần nào chưa test, kèm mức rủi ro của phần đó.

Câu cuối là quan trọng nhất: tester không quyết định có phát hành hay không, nhưng tester phải cho người quyết định biết họ đang chấp nhận rủi ro gì.

## Nguồn tham khảo

- [Risk Based Testing — Strategies for Prioritizing Tests Against Deadlines](https://www.logigear.com/blogs/test-methods/Risk-Based-TestingStrategies-for-Prioritizing-Tests-Against-Deadlines) — LogiGear
- [Risk-based Testing to Prioritize QA Efforts](https://testerwork.com/risk-based-testing-to-prioritize-qa-efforts/) — Testerwork` },

  { id: 5, sort: -2, title: 'SFDIPOT: 7 góc nhìn để không bỏ sót trường hợp test', url: '', published_at: '2026-10-05', tags: ['Heuristic', 'Test case'],
    excerpt: 'Khi đọc một tính năng mới và không biết bắt đầu từ đâu, mình đi qua 7 chữ SFDIPOT. Mỗi chữ là một góc nhìn mở ra những trường hợp dễ bị quên.',
    content: `Viết test case cho tính năng mới, mình hay bị "kẹt" ở luồng chính: nhập đúng, bấm nút, thấy kết quả. SFDIPOT là gợi nhớ trong Heuristic Test Strategy Model của James Bach, giúp nhìn tính năng từ 7 phía.

## 7 chữ cái

- **S – Structure (cấu trúc):** sản phẩm gồm những phần gì? Màn hình, API, file cấu hình, tài liệu hướng dẫn.
- **F – Function (chức năng):** nó làm gì? Tính toán, phân quyền, xử lý lỗi, khởi động và tắt.
- **D – Data (dữ liệu):** nó nhận và trả ra dữ liệu gì? Dữ liệu trống, quá dài, sai định dạng, dữ liệu cũ còn lưu lại.
- **I – Interfaces (giao tiếp):** người dùng và hệ thống khác chạm vào nó qua đâu? Giao diện, API, nhập và xuất file.
- **P – Platform (nền tảng):** nó phụ thuộc vào gì bên ngoài? Trình duyệt, phiên bản iOS/Android, dịch vụ bên thứ ba.
- **O – Operations (cách sử dụng):** ai dùng, dùng thế nào? Người dùng mới, người dùng quen, người dùng cố tình phá.
- **T – Time (thời gian):** chuyện gì xảy ra theo thời gian? Bấm nhanh liên tục, mạng chậm, hai người cùng sửa một lúc, hết hạn phiên đăng nhập.

## Áp dụng thử: chức năng "xin nghỉ phép"

Lấy ví dụ trong phần mềm quản lý nhân sự mình từng test:

- **S:** form xin nghỉ, màn hình duyệt của quản lý, email thông báo.
- **F:** trừ số ngày phép, duyệt nhiều cấp, từ chối kèm lý do.
- **D:** nghỉ nửa ngày, nghỉ qua cuối tuần, xin nghỉ khi đã hết phép.
- **I:** xuất báo cáo Excel, API đồng bộ sang bảng chấm công.
- **P:** dùng trên điện thoại, trình duyệt Safari.
- **O:** trưởng phòng tự xin nghỉ thì ai duyệt? Nhân viên sửa đơn khi đang chờ duyệt?
- **T:** hai cấp duyệt cùng bấm một lúc, đơn chờ duyệt qua năm mới thì tính phép năm nào?

Chỉ riêng chữ **T** đã cho ra hai trường hợp mà luồng chính không bao giờ chạm tới.

## Mẹo nhỏ

Không cần đủ 7 chữ cho mọi tính năng. Mình dùng SFDIPOT như một danh sách tự hỏi trong 10 phút trước khi viết test case, rồi chọn những góc rủi ro nhất.

## Nguồn tham khảo

- [Heuristic Test Strategy Model](https://developsense.com/htsm) — James Bach, Satisfice (đăng trên DevelopSense)` },

  { id: 4, sort: -1, title: 'Hỏi trước khi test: tester trong buổi Three Amigos', url: '', published_at: '2026-10-03', tags: ['Three Amigos', 'Yêu cầu'],
    excerpt: 'Bug rẻ nhất là bug chưa kịp được viết ra code. Ngồi cùng PO và dev trước khi làm, đặt câu hỏi bằng ví dụ cụ thể, giúp cả team hiểu giống nhau.',
    content: `Nhiều bug mình tìm được thật ra không phải lỗi code, mà là dev và PO hiểu yêu cầu khác nhau. Cách rẻ nhất để bắt loại bug này là hỏi trước khi bắt đầu làm, trong một buổi ngắn gọi là Three Amigos.

## Three Amigos là gì

Ba góc nhìn ngồi cùng nhau trước khi làm một user story:

- **Product Owner / BA:** muốn giải quyết vấn đề gì.
- **Developer:** làm thế nào.
- **Tester:** chuyện gì có thể sai.

Không cần đúng 3 người, quan trọng là đủ 3 góc nhìn.

## Example Mapping: hỏi bằng ví dụ

Cách tổ chức mình thấy hiệu quả nhất là Example Mapping của Matt Wynne. Dùng thẻ 4 màu:

- **Vàng:** user story
- **Xanh dương:** quy tắc (rule)
- **Xanh lá:** ví dụ cụ thể cho từng quy tắc
- **Đỏ:** câu hỏi chưa ai trả lời được

Mỗi story chỉ nên mất khoảng 25 phút. Nếu bàn đầy thẻ đỏ, story chưa sẵn sàng để làm. Nếu một quy tắc có quá nhiều thẻ xanh lá, nên tách story nhỏ hơn.

## Ví dụ: "Áp mã giảm giá"

- **Quy tắc:** mỗi đơn chỉ dùng một mã. **Ví dụ:** đã áp mã A, nhập thêm mã B → mã B thay mã A hay báo lỗi?
- **Quy tắc:** mã hết hạn không dùng được. **Ví dụ:** mã hết hạn lúc 23:59, khách bấm thanh toán lúc 23:59:30 → tính theo giờ bấm hay giờ thanh toán xong?
- **Câu hỏi (thẻ đỏ):** đổi trả hàng thì có hoàn lại lượt dùng mã không?

Mỗi ví dụ xanh lá gần như là một test case viết sẵn, và mỗi thẻ đỏ là một bug được chặn từ trước khi có code.

## Tester nên hỏi gì

- "Nếu … thì sao?" với dữ liệu biên: trống, bằng 0, rất lớn, đúng giới hạn.
- "Ai không được làm việc này?" để hỏi về phân quyền.
- "Lỗi thì người dùng thấy gì?" để hỏi về thông báo lỗi.
- "Làm sao biết là xong?" để chốt tiêu chí nghiệm thu.

## Nguồn tham khảo

- [Introducing Example Mapping](https://cucumber.io/blog/bdd/example-mapping-introduction/) — Matt Wynne, Cucumber
- [Example Mapping: The Three Amigos](https://www.qatouch.com/qa-masterclass/example-mapping-the-three-amigos) — QA Touch
- [The key role testing plays in a Three Amigos strategy](https://www.techtarget.com/searchsoftwarequality/tip/The-key-role-testing-plays-in-a-Three-Amigos-strategy) — TechTarget` },
    { id: 1, sort: 1, title: 'Viết bug report dev nào cũng muốn đọc', url: '', published_at: '2026-09-02', tags: ['Bug report', 'Manual testing'],
      excerpt: 'Cấu trúc tiêu đề, bước tái hiện, kết quả mong đợi và bằng chứng đính kèm để dev sửa nhanh mà không phải hỏi lại.',
      content: `Một bug report tốt giúp dev sửa lỗi nhanh mà không phải hỏi lại. Đây là cấu trúc mình luôn dùng.

## 1. Tiêu đề nói rõ chuyện gì xảy ra
Tiêu đề nên trả lời được: **ở đâu, làm gì, sai thế nào**. Ví dụ: "Giỏ hàng: áp mã giảm giá hai lần làm tổng tiền bị âm".

## 2. Các bước tái hiện
- Viết từng bước, mỗi bước một hành động
- Ghi rõ dữ liệu đã dùng (tài khoản, mã giảm giá, sản phẩm)
- Ghi môi trường: trình duyệt hoặc thiết bị, phiên bản app

## 3. Kết quả thực tế và kết quả mong đợi
Đặt hai dòng này cạnh nhau để dev thấy ngay chỗ sai.

## 4. Bằng chứng
Ảnh chụp, video ngắn, lỗi trong DevTools hoặc response của API trên Postman. Một video 15 giây thường đáng giá hơn một đoạn mô tả dài.

> Ghi chú: đây là bài viết mẫu, sửa trong Admin → Blog.` },
    { id: 2, sort: 2, title: 'Viết test case sao cho đủ mà không thừa', url: '', published_at: '2026-09-18', tags: ['Test case', 'Manual testing'],
      excerpt: 'Cách mình chia nhỏ yêu cầu, chọn trường hợp cần test và viết test case để người khác đọc là chạy được.',
      content: `Test case viết quá sơ sài thì dễ sót lỗi, viết quá dài thì không ai muốn đọc. Đây là cách mình cân bằng.

## Bắt đầu từ yêu cầu
- Đọc kỹ yêu cầu, gạch ra từng quy tắc nghiệp vụ
- Hỏi lại những chỗ mơ hồ trước khi viết, đừng tự đoán

## Chọn trường hợp cần test
- **Luồng chính**: người dùng làm đúng như mong đợi
- **Giá trị biên**: nhỏ nhất, lớn nhất, vừa vượt giới hạn
- **Dữ liệu sai**: để trống, sai định dạng, ký tự đặc biệt
- **Trường hợp đặc biệt** của nghiệp vụ: hết hàng, hết hạn, không đủ quyền

## Một test case tốt có gì
1. Tiêu đề ngắn, nói rõ đang kiểm tra điều gì
2. Điều kiện trước (tài khoản, dữ liệu cần có)
3. Các bước thực hiện
4. Kết quả mong đợi cụ thể, kiểm tra được

> Ghi chú: đây là bài viết mẫu, sửa trong Admin → Blog.` },
    { id: 3, sort: 3, title: 'Test ví blockchain: những lỗi tester mới hay bỏ sót', url: '', published_at: '2026-10-01', tags: ['Blockchain', 'Mobile'],
      excerpt: 'Những trường hợp cần test kỹ khi kiểm thử ví và NFT trên điện thoại, rút ra từ dự án launcher mình đang tham gia.',
      content: `Test ví blockchain khác test app thông thường: sai một bước là ảnh hưởng tới tài sản của người dùng. Đây là những chỗ mình thấy dễ bị bỏ sót.

## Luôn test trên mạng thử nghiệm
Dùng **testnet** và token thử nghiệm, không dùng tiền thật. Ghi rõ mạng đang dùng trong mỗi bug report.

## Tạo và khôi phục ví
- Khôi phục ví bằng cụm từ khôi phục nhập sai thứ tự, thừa khoảng trắng, sai chính tả
- Gỡ app rồi cài lại, khôi phục ví xem số dư và lịch sử có đúng không

## Gửi và nhận token
- Nhập sai địa chỉ ví, số dư không đủ, số tiền bằng 0
- Mất mạng giữa lúc gửi: giao dịch có bị gửi hai lần không
- Trạng thái chờ, thành công, thất bại có hiển thị đúng không

## Hiển thị NFT
- Ảnh NFT lỗi hoặc tải chậm
- Bộ sưu tập nhiều NFT, tên quá dài

> Ghi chú: đây là bài viết mẫu, sửa trong Admin → Blog.` },
  ],
  footer_links: [
    { id: 1, sort: 1, label: 'Trang chủ', href: '#home' },
    { id: 2, sort: 2, label: 'Kỹ năng', href: '#skills' },
    { id: 3, sort: 3, label: 'Kinh nghiệm', href: '#experience' },
    { id: 4, sort: 4, label: 'Dự án', href: '#work' },
    { id: 5, sort: 5, label: 'Blog', href: '#blog' },
  ],
  socials: [
    { id: 1, sort: 1, label: 'GitHub', url: 'https://github.com/' },
    { id: 2, sort: 2, label: 'LinkedIn', url: 'https://linkedin.com/' },
    { id: 3, sort: 3, label: 'Facebook', url: 'https://facebook.com/' },
  ],
  settings: DEMO_SETTINGS,
}

// ---- Bản English của nội dung mẫu (sửa trong Admin, tab English của từng form) ----
const EN = {
  skills: {
    1: { title: 'Manual Testing', description: 'Analysing requirements, writing test cases and checklists, testing functionality, UI and regression, and supporting UAT before release.', tags: ['Test cases', 'Exploratory', 'Regression', 'UAT'] },
    2: { title: 'API & Data', description: 'Testing APIs manually with Postman, checking data with SQL, and reading requests and errors in DevTools to narrow down bugs.', tags: ['Postman', 'SQL', 'DevTools'] },
    3: { title: 'Bug tracking & documentation', description: 'Clear bug reports with reproduction steps and evidence, followed through until fixed. Currently learning automation to shorten regression time.', tags: ['Jira', 'Trello', 'TestRail', 'Google Sheets'] },
  },
  jobs: {
    1: { period: '2025 – Present', role: 'QA Tester (Manual)', description: 'ABC Company — testing an iOS/Android launcher app with a built-in blockchain wallet and NFTs: writing test cases, testing across many devices, reporting and tracking bugs in Jira.' },
    2: { period: '2024 – 2025', role: 'Junior Tester', description: 'XYZ Company — testing an e-commerce website and an HR management system; writing test cases in Google Sheets/TestRail and checking APIs with Postman.' },
  },
  projects: {
    1: { category: 'BLOCKCHAIN · WALLET & NFT', title: 'Testing a launcher with a built-in wallet and NFTs', role: 'QA Tester (Manual)', duration: 'Ongoing',
      description: 'Manual testing of an iOS/Android launcher with a blockchain wallet: creating/restoring wallets, sending and receiving tokens, displaying NFTs.',
      content: `## Context
A launcher app for iOS and Android with a built-in blockchain wallet, so users can hold tokens and browse their NFT collections right on their phone.

## What I did
- Wrote test cases for the main flows: **creating a wallet, restoring it with a recovery phrase**, setting a PIN, locking/unlocking the app
- Tested sending and receiving tokens on a **testnet**, checking balances, fees and pending / success / failed states
- Checked NFT display: image, name, collection info, plus offline and broken-image cases
- Tested on many devices and iOS/Android versions
- Reported bugs in Jira with screen recordings and retested after fixes

## What I learned
With a wallet, a small bug can affect users' assets, so I always test edge cases carefully: wrong wallet address, insufficient balance, an unstable connection in the middle of a transfer.

> Note: this is sample content, edit it in Admin → Projects.` },
    2: { category: 'WEB · E-COMMERCE', title: 'Testing an online store', role: 'Manual Tester', duration: 'About 6 months',
      description: 'Testing the cart, checkout and discount codes across browsers before every release.',
      content: `## Context
A retail website with a shopping cart, discount codes and several payment methods, releasing new versions regularly.

## What I did
- Wrote test cases per feature: search, cart, **discount codes**, checkout, order history
- Prioritised by risk: checkout and promotions were tested most thoroughly
- Tested on Chrome, Safari, Firefox and mobile layouts
- Used DevTools to inspect failing requests and Postman to recheck the cart API when a bug looked server-side
- Ran the regression suite before every release

## Results
Serious bugs in the checkout flow and discount handling were found and fixed before going live.

> Note: this is sample content, edit it in Admin → Projects.` },
    3: { category: 'MOBILE · iOS / ANDROID', title: 'Testing a mobile app', role: 'Manual Tester', duration: 'About 4 months',
      description: 'Functional and UI testing across many phone models, including notifications, permissions and offline cases.',
      content: `## Context
A mobile app running on both iOS and Android that needs to stay stable across screen sizes and OS versions.

## What I did
- Built a device matrix to cover (models, OS versions, screen sizes)
- Tested the main flows, push notifications, camera / location permissions, light and dark mode
- Tested real-life situations: **no connection, app sent to background, screen rotation, low battery**
- Checked fresh installs and upgrades from older versions

## Results
Caught several UI bugs that only appeared on certain models and a data-loss bug when the app was sent to the background.

> Note: this is sample content, edit it in Admin → Projects.` },
    4: { category: 'MANAGEMENT SOFTWARE · HR', title: 'Testing an HR management system', role: 'Junior Tester', duration: 'About 5 months',
      description: 'Testing permissions, attendance, payroll and reports; cross-checking data with SQL.',
      content: `## Context
Internal HR software: employee records, attendance, leave, payroll and reports for managers.

## What I did
- Tested **role-based permissions**: employee, team lead, HR, admin
- Tested leave requests with multi-level approval
- Checked attendance and payroll formulas with special cases (overtime, unpaid leave, joining mid-month)
- Used **SQL** to cross-check report figures against the database
- Exported Excel files and checked formatting and numbers

## Results
Found payroll calculation errors in special cases and a permission bug that showed data to the wrong roles.

> Note: this is sample content, edit it in Admin → Projects.` },
  },
  footer_links: { 1: { label: 'Home' }, 2: { label: 'Skills' }, 3: { label: 'Experience' }, 4: { label: 'Projects' }, 5: { label: 'Blog' } },
}
Object.entries(EN).forEach(([t, m]) => demo[t].forEach(r => { if (m[r.id]) r.en = m[r.id] }))
// Bản English của bài blog mẫu
demo.posts.forEach(p => { if (POSTS_EN[p.id]) p.en = POSTS_EN[p.id] })
demo.bugs = DEMO_BUGS
