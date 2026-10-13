// Tải trước ảnh của bài / dự án khi khách rê chuột hoặc chạm vào thẻ, để trang chi tiết mở ra là ảnh hiện ngay.
// (Dữ liệu chữ đã nằm sẵn trong bộ nhớ nên chỉ còn ảnh cần tải.) Mỗi ảnh chỉ tải trước một lần; ảnh data: / SVG tự tạo bỏ qua.
const done = new Set()
const warmImage = url => {
  if (!url || done.has(url) || !/^https?:\/\//i.test(url)) return
  done.add(url)
  const i = new Image(); i.decoding = 'async'; i.src = url
}
const inlineImages = (text = '') => [...String(text).matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/g)].slice(0, 2).map(m => m[1])
const handlers = urls => { const go = () => urls().forEach(warmImage); return { onPointerEnter: go, onTouchStart: go } }

/** Gắn vào thẻ bài viết: <div {...warmPost(po, cover)}> */
export const warmPost = (po, cover) => handlers(() => [cover, ...inlineImages(po.content)])
/** Gắn vào thẻ dự án */
export const warmProject = cover => handlers(() => [cover])
