// Trạng thái bài Blog: Đã đăng (hiện trên trang) / Bản nháp / Chờ duyệt (cả hai đều ẩn với khách).
// Cột `review` phân biệt Chờ duyệt với Bản nháp; bài cũ chưa có cột này thì bài Easy AI đang ẩn coi là Chờ duyệt.
export const postStatus = r => (r.visible !== false ? 'published' : (r.review ?? r.source === 'easyai') ? 'review' : 'draft')
export const STATUS_PATCH = {
  published: { visible: true, review: false },
  draft: { visible: false, review: false },
  review: { visible: false, review: true },
}
export const STATUS_ORDER = ['published', 'draft', 'review']

// Bài Blog tự sắp xếp: ngày đăng mới nhất lên trên; cùng ngày thì bài vừa đăng/duyệt (sort nhỏ hơn) lên trên
const dayKey = r => String(r.published_at || '').slice(0, 10)
export const sortPosts = rows => [...rows].sort((a, b) =>
  dayKey(b).localeCompare(dayKey(a)) || (Number(a.sort) || 0) - (Number(b.sort) || 0) || (Number(b.id) || 0) - (Number(a.id) || 0))
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
/** Đăng một bài đang ẩn: ngày đăng = hôm nay và đưa lên đầu (sort nhỏ nhất) để hiện trên cùng trang Blog */
export const publishPatch = minSort => ({ ...STATUS_PATCH.published, published_at: today(), sort: (Number(minSort) || 0) - 1 })
