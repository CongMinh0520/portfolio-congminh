// Hằng số của trang (mục, màu nền thẻ) và cài đặt mẫu. Nhỏ, dùng cả ở trang chủ lẫn Admin.
// Nội dung mẫu dài (bài viết, dự án…) nằm ở data.js và chỉ tải khi cần.
export const links = [['home','Home'],['skills','Skills'],['experience','Experience'],['work','Work'],['bugs','Bugs'],['blog','Blog']]
// Các phần trên trang chủ có thể ẩn/hiện trong Admin → Bố cục trang chủ (lưu chung cột settings.hidden)
export const SECTIONS = [
  ['Đầu trang', 'Menu trên cùng và phần mở đầu', [
    ['sec_nav_cta', 'Nút “Liên hệ” trên menu'],
    ['sec_hero_badge', 'Huy hiệu “Open to QA opportunities”'],
    ['sec_hero_lead', 'Đoạn giới thiệu dưới tiêu đề'],
    ['sec_hero_buttons', 'Nút “Xem dự án” và “Liên hệ”'],
    ['sec_hero_stats', 'Dãy số liệu (năm kinh nghiệm, bug, dự án)'],
    ['sec_hero_visual', 'Hình tròn đại diện và 2 thẻ số liệu'] ]],
  ['Các mục nội dung', 'Ẩn một mục thì link tới mục đó trên menu cũng tự ẩn', [
    ['sec_marquee', 'Dải chữ chạy ngang'],
    ['sec_skills', 'Mục Kỹ năng'],
    ['sec_experience', 'Mục Kinh nghiệm'],
    ['sec_work', 'Mục Dự án'],
    ['sec_bugs', 'Mục Bug mẫu (tự ẩn khi chưa có bug nào đang hiển thị)'],
    ['sec_blog', 'Mục Blog'],
    ['sec_contact', 'Khối Liên hệ cuối trang'] ]],
  ['Footer', 'Chân trang', [
    ['sec_footer', 'Toàn bộ footer'],
    ['sec_footer_about', 'Cột giới thiệu (logo, trạng thái, CV)'],
    ['sec_footer_menu', 'Cột Menu'],
    ['sec_footer_contact', 'Cột Liên hệ'],
    ['sec_footer_socials', 'Cột Kết nối (mạng xã hội)'],
    ['sec_footer_bottom', 'Dòng bản quyền'] ]],
]
export const SECTION_OF = { skills: 'sec_skills', experience: 'sec_experience', work: 'sec_work', bugs: 'sec_bugs', blog: 'sec_blog', contact: 'sec_contact' }

export const marquee = ['MANUAL TESTING','TEST CASE','API TESTING','MOBILE APP','BLOCKCHAIN WALLET','BUG TRACKING']
export const meta = [['2','Năm kinh nghiệm QA'],['4','Lĩnh vực đã test'],['Web · App','Nền tảng']]

// Tailwind cần thấy class đầy đủ trong source nên map theo key
export const GRADS = {
  sunset: 'from-[#f2ce6a] via-[#ef765c] to-[#6345db]',
  orange: 'from-[#ff9a54] to-[#633dff]',
  neon: 'from-pink to-purple',
  gold: 'from-[#f8d27c] to-[#5c48dd]',
}


// Cài đặt mẫu: dùng làm giá trị mặc định cho cột còn trống
export const DEMO_SETTINGS = {
    footer_tagline: 'Manual QA Tester — giúp sản phẩm chạy ổn định và đáng tin cậy trước khi tới tay người dùng.',
    availability: 'Đang tìm vị trí QA Tester',
    email: 'congminh@example.com',
    phone: '+84 900 000 000',
    address: 'TP. Hồ Chí Minh, Việt Nam',
    working_hours: 'Thứ 2 – Thứ 6 · 9:00 – 18:00',
    cv_url: '',
    copyright: '© 2026 Công Minh. All rights reserved.',
    footer_note: 'Thiết kế & xây dựng với React, Tailwind và Supabase.',
    hidden: ['footer_note'],
    cursor_effect: 'none',
    lang_default: 'vi',
    lang_switch: true,
    hero: {},
  }
DEMO_SETTINGS.en = {
  footer_tagline: 'Manual QA Tester — helping products run reliably before they reach users.',
  availability: 'Looking for a QA Tester role',
  address: 'Ho Chi Minh City, Vietnam',
  working_hours: 'Mon – Fri · 9:00 – 18:00',
  copyright: '© 2026 Công Minh. All rights reserved.',
  footer_note: 'Designed & built with React, Tailwind and Supabase.',
}
DEMO_SETTINGS.hero = { en: {
  badge: { text: 'OPEN TO QA OPPORTUNITIES' },
  card1: { value: 'Manual', label: 'QA Tester' },
  marquee: { items: { 0: 'MANUAL TESTING', 1: 'TEST CASE', 2: 'API TESTING', 3: 'MOBILE APP', 4: 'BLOCKCHAIN WALLET', 5: 'REGRESSION', 6: 'BUG TRACKING' } },
  title: { before: 'I find ', highlight: 'bugs', after: ' before your users do' },
  lead: 'Công Minh — Manual QA Tester with nearly 2 years of experience testing e-commerce websites, mobile apps, management software and blockchain wallets. I write thorough test cases, clear bug reports, and I am learning automation.',
  buttons: { primary: 'View projects', secondary: 'Contact' },
  stats: { 0: { value: '2', label: 'Years in QA' }, 1: { value: '4', label: 'Product domains' }, 2: { value: 'Web · App', label: 'Platforms tested' } },
  card2: { value: 'Mobile', label: 'iOS · Android' },
  post_cta: { title: 'Need a careful tester for your product?', text: 'Happy to talk about manual testing for your website, mobile app or blockchain product.', button: 'Discuss your project' },
} }

