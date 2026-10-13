// Nội dung mặc định của trang /kiem-thu ("Mình đã test chính web này").
// Sửa trong Admin → Trang Kiểm thử web (lưu ở cột settings.selftest). Ô nào chưa lưu thì dùng giá trị ở đây.
// Mỗi dòng có bản English ở trường *_en; để trống thì hiện bản Tiếng Việt.
export const DEFAULT_SELFTEST = {
  intro: 'Là tester, mình áp dụng cách làm việc hằng ngày lên chính trang portfolio này: đo hiệu năng, thử trên nhiều trình duyệt, rà trợ năng và ghi lại những lỗi tìm ra, kể cả lỗi chưa sửa xong.',
  intro_en: 'As a tester, I apply my everyday process to this portfolio itself: measuring performance, trying it on different browsers, checking accessibility and logging the bugs I find, including the ones not fixed yet.',
  measured: '2026-10-13',
  tool: 'Lighthouse 12.8.2 (Chrome 152, chạy trên máy)',
  tool_en: 'Lighthouse 12.8.2 (Chrome 152, run locally)',
  scores: {
    mobile: { performance: 55, accessibility: 96, best: 100, seo: 100 },
    desktop: { performance: 99, accessibility: 96, best: 100, seo: 100 },
  },
  envs: [
    { name: 'Chrome · Windows 10 (máy tính)', name_en: 'Chrome · Windows 10 (desktop)', result: 'pass', note: 'Trang chủ, Blog, bug report, trang Kiểm thử, CV (cả bản in PDF).', note_en: 'Home, blog, bug reports, testing page, CV (including the printed PDF).' },
    { name: 'Giả lập điện thoại 375px (Chrome DevTools)', name_en: 'Phone emulation at 375px (Chrome DevTools)', result: 'pass', note: 'Không bị cuộn ngang ở trang chủ, Blog, bug report, Kiểm thử, CV.', note_en: 'No horizontal scrolling on home, blog, bug reports, testing page, CV.' },
    { name: 'Safari · iPhone', name_en: 'Safari · iPhone', result: 'todo', note: '', note_en: '' },
    { name: 'Chrome · Android', name_en: 'Chrome · Android', result: 'todo', note: '', note_en: '' },
    { name: 'Firefox · máy tính', name_en: 'Firefox · desktop', result: 'todo', note: '', note_en: '' },
  ],
  checks: [
    { text: 'Có link "Bỏ qua, tới nội dung chính" cho người dùng bàn phím', text_en: 'A "Skip to main content" link for keyboard users', ok: true },
    { text: 'Thẻ <html> khai báo đúng ngôn ngữ đang xem (vi / en)', text_en: 'The <html> tag declares the current language (vi / en)', ok: true },
    { text: 'Ô nhập trong form Liên hệ đều có nhãn', text_en: 'Every contact form field has a label', ok: true },
    { text: 'Ảnh khai báo sẵn kích thước, bố cục không nhảy khi tải (CLS = 0)', text_en: 'Images declare their size, so the layout does not jump while loading (CLS = 0)', ok: true },
    { text: 'Tôn trọng cài đặt "giảm chuyển động" của hệ điều hành', text_en: 'Respects the operating system "reduce motion" setting', ok: true },
    { text: 'Form Liên hệ có chống spam (Cloudflare Turnstile)', text_en: 'The contact form has spam protection (Cloudflare Turnstile)', ok: true },
    { text: 'Link sai có trang 404 riêng và không cho Google lập chỉ mục', text_en: 'Broken links get a proper 404 page that Google does not index', ok: true },
    { text: 'Điểm hiệu năng trên điện thoại từ 90 trở lên', text_en: 'Mobile performance score of 90 or higher', ok: false },
  ],
  found: [
    { title: 'Khóa Supabase bị che thành "•••" sau khi deploy', title_en: 'Supabase key replaced by "•••" after deploying', status: 'fixed',
      detail: 'Biến VITE_SUPABASE_ANON_KEY được khai báo kiểu "Secret" trên Vercel nên lúc build, khóa bị thay bằng "•••" và trang không tải được dữ liệu. Sửa: đổi biến sang kiểu thường rồi build lại.',
      detail_en: 'VITE_SUPABASE_ANON_KEY was set as a "Secret" on Vercel, so the build baked in "•••" instead of the key and the site could not load its data. Fix: switched the variable to a plain value and rebuilt.' },
    { title: 'Ô chống spam báo lỗi trên tên miền thật', title_en: 'Spam check failing on the real domain', status: 'fixed',
      detail: 'Cloudflare Turnstile mới chỉ cho phép localhost nên trên congminh-qa.vercel.app form Liên hệ không gửi được. Sửa: thêm tên miền thật vào danh sách được phép.',
      detail_en: 'Cloudflare Turnstile only allowed localhost, so the contact form could not be sent on congminh-qa.vercel.app. Fix: added the real domain to the allowed hostnames.' },
    { title: 'Trang giật khi bật hiệu ứng chuột và hiệu ứng mùa', title_en: 'Page stuttering with cursor and seasonal effects on', status: 'fixed',
      detail: 'Hiệu ứng vẽ lại liên tục kể cả khi chuột đứng yên. Sửa: hiệu ứng chuột tự dừng khi đứng yên, hiệu ứng mùa chạy ở luồng riêng và tự giảm khi máy yếu.',
      detail_en: 'Effects kept redrawing even when the mouse was still. Fix: the cursor effect pauses when idle, seasonal effects run in a separate thread and scale down on slow devices.' },
    { title: 'Lighthouse báo chữ thiếu độ tương phản', title_en: 'Lighthouse reports low text contrast', status: 'note',
      detail: 'Các khối hiện dần khi cuộn bắt đầu ở độ mờ 40%, Lighthouse đo đúng lúc chúng còn mờ. Khi hiện đủ, chữ hồng trên nền tối đạt tỷ lệ tương phản 5,7:1 (chuẩn WCAG AA cần 4,5:1). Ghi nhận là cảnh báo của công cụ đo.',
      detail_en: 'Blocks that fade in on scroll start at 40% opacity, and Lighthouse measures them while still faded. Fully shown, the pink text on the dark background reaches a 5.7:1 contrast ratio (WCAG AA needs 4.5:1). Logged as a tool warning.' },
    { title: 'Điểm hiệu năng trên điện thoại còn thấp (55/100)', title_en: 'Low mobile performance score (55/100)', status: 'open',
      detail: 'Lighthouse giả lập điện thoại có CPU chậm gấp 4 lần: chạy JavaScript và tính bố cục mất nhiều thời gian (Total Blocking Time 1,4 giây, LCP 3,5 giây). Trên máy tính đạt 99. Đang tìm cách giảm thêm.',
      detail_en: 'Lighthouse emulates a phone with a 4× slower CPU: running JavaScript and computing layout takes a long time (Total Blocking Time 1.4 s, LCP 3.5 s). Desktop scores 99. Still working on it.' },
  ],
}

/** Gộp phần đã lưu với mặc định (thiếu khóa nào lấy mặc định khóa đó) */
export const selftestOf = v => {
  const s = v && typeof v === 'object' ? v : {}
  const d = DEFAULT_SELFTEST
  return {
    ...d, ...s,
    scores: { mobile: { ...d.scores.mobile, ...(s.scores?.mobile || {}) }, desktop: { ...d.scores.desktop, ...(s.scores?.desktop || {}) } },
    envs: Array.isArray(s.envs) ? s.envs : d.envs,
    checks: Array.isArray(s.checks) ? s.checks : d.checks,
    found: Array.isArray(s.found) ? s.found : d.found,
  }
}
/** Chọn bản theo ngôn ngữ: row.text hoặc row.text_en */
export const pickLang = (row, k, lang) => (lang === 'en' && String(row?.[`${k}_en`] ?? '').trim() ? row[`${k}_en`] : row?.[k] ?? '')
