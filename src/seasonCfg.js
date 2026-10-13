// Cấu hình hiệu ứng theo mùa (danh sách, mức độ, lịch tự bật). Tách riêng khỏi SeasonFX.jsx để trang chủ không phải
// tải mã vẽ hiệu ứng khi chưa cần (xem tải muộn trong App.jsx).
export const SEASON_EFFECTS = [
  ['snow', 'Tuyết rơi', 'Bông tuyết trắng rơi chậm, đung đưa nhẹ. Hợp Giáng sinh, mùa đông.'],
  ['mai', 'Hoa mai rơi', 'Hoa mai vàng 5 cánh và cánh hoa lẻ xoay tròn rơi xuống. Hợp Tết Nguyên đán.'],
  ['dao', 'Hoa đào rơi', 'Cánh đào hồng bay nhẹ theo gió. Hợp Tết miền Bắc, mùa xuân.'],
  ['fireworks', 'Pháo hoa', 'Pháo hoa bắn lên và nổ tung nhiều màu. Hợp Giao thừa, Năm mới, ngày lễ lớn.'],
]
export const SEASON_NAME = Object.fromEntries(SEASON_EFFECTS.map(([k, n]) => [k, n]))
export const AMOUNTS = [['low', 'Ít', 0.5], ['medium', 'Vừa', 1], ['high', 'Nhiều', 1.8]]

// Ngày dạng "MM-DD", lặp lại hằng năm. Khoảng có thể vắt qua năm mới (VD 12-31 → 01-01).
const md = d => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const inRange = (today, from, to) => (from <= to ? today >= from && today <= to : today >= from || today <= to)

/** Hiệu ứng đang áp dụng hôm nay (hoặc null) */
export function activeSeason(cfg, date = new Date()) {
  if (!cfg || cfg.mode === 'off') return null
  if (cfg.mode === 'manual') return cfg.effect || null
  const today = md(date)
  const rule = (cfg.rules || []).find(r => r.effect && r.from && r.to && inRange(today, r.from, r.to))
  return rule ? rule.effect : null
}
