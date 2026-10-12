// Admin → Đăng bài tự động: hướng dẫn nối Easy AI với Blog + danh sách bài nhận được.
import { useEffect, useState } from 'react'
import { supabase, demoMode } from './supabase.js'
import { loadTable } from './useContent.js'
import { Markdown } from './Detail.jsx'
import { coverOf } from './autoArt.js'
import { href, postPath } from './router.js'
import { postStatus, publishPatch } from './postStatus.js'
import { useA } from './adminLang.js'
// Mã hàm nhận bài, nhúng sẵn để bấm sao chép (không phải mở file)
import FN_CODE from '../supabase/functions/nhan-bai/index.ts?raw'

const grad = 'bg-gradient-to-r from-pink to-purple'
const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50'
const ghost = `${btn} border border-line text-[#c9cbd8] hover:border-[#3a3f5a] hover:bg-white/5 hover:text-white`

const SQL = `alter table public.posts add column if not exists tags text[] not null default '{}'; alter table public.posts add column if not exists external_key text; alter table public.posts add column if not exists slug text not null default ''; alter table public.posts add column if not exists source text not null default ''; create unique index if not exists posts_external_key_uniq on public.posts (external_key) where external_key is not null; do $$ begin if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then alter publication supabase_realtime add table public.posts; end if; end $$; drop policy if exists "public read" on public.posts; create policy "public read" on public.posts for select using (visible = true or auth.role() = 'authenticated');`

export const ENDPOINT = (import.meta.env.VITE_SUPABASE_URL || 'https://<ma-project>.supabase.co').replace(/\/+$/, '') + '/functions/v1/nhan-bai'

export function Copy({ text, label = 'Sao chép' }) {
  const a = useA()
  const [ok, setOk] = useState(false)
  const copy = async e => {
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600) }
    catch { const box = e.currentTarget.closest('[data-copy]')?.querySelector('code'); if (box) { const r = document.createRange(); r.selectNodeContents(box); getSelection().removeAllRanges(); getSelection().addRange(r) } }
  }
  return <button type="button" onClick={copy} className={`${ghost} flex-none px-3 py-1.5 text-xs`}>{a(ok ? 'Đã chép ✓' : label)}</button>
}
export function Value({ children }) {
  return (
    <div data-copy className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-[#0b0d16] px-3 py-2">
      <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-[#f3b6d6]">{children}</code><Copy text={children} />
    </div>
  )
}
export const Step = ({ n, title, children }) => (
  <li className="flex gap-4">
    <span className={`${grad} grid size-8 flex-none place-items-center rounded-full text-sm font-bold`}>{n}</span>
    <div className="min-w-0 flex-1 space-y-2 pb-6"><h3 className="pt-1 font-semibold">{title}</h3><div className="space-y-2 text-sm leading-relaxed text-[#c9cbd8]">{children}</div></div>
  </li>
)

export default function AutoPostAdmin({ toast, go, live }) {
  const a = useA()
  const [posts, setPosts] = useState(null); const [view, setView] = useState(null)
  const reload = () => loadTable('posts').then(r => setPosts(r.filter(p => p.source === 'easyai'))).catch(() => setPosts([]))
  useEffect(() => { reload() }, [live])
  const approve = async p => {
    // Duyệt → ngày đăng hôm nay, lên đầu trang Blog
    const all = await loadTable('posts').catch(() => [])
    const { error } = await supabase.from('posts').update(publishPatch(Math.min(0, ...all.map(x => Number(x.sort) || 0)))).eq('id', p.id)
    if (error) return toast(error.message, 'error'); toast(a('Đã đăng bài lên Blog')); reload()
  }
  const waiting = (posts || []).filter(p => postStatus(p) === 'review')
  // Bản demo: giả lập một bài gửi tới để thấy realtime (thông báo, số chờ duyệt, danh sách tự cập nhật)
  const simulate = async () => {
    const n = (posts?.length || 0) + 1
    await supabase.from('posts').insert({
      // vi-only: nội dung bài mẫu lưu vào DB (bản demo), không phải chữ giao diện
      title: `Bài thử từ Easy AI #${n}`, excerpt: 'Bài mô phỏng để xem realtime hoạt động.', content: '## Bài thử\n\nNội dung **mô phỏng** từ Easy AI.\n\n- Ý một\n- Ý hai',
      image: '', url: '', published_at: new Date().toISOString().slice(0, 10), source: 'easyai', visible: false, sort: -n,
    })
  }

  return (
    <div className="space-y-8 pb-16">
      {view && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setView(null)}>
          <div className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-line bg-[#07080f] p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#f8d27c]/15 px-2.5 py-1 text-xs font-medium text-[#f8d27c]">{a('Xem trước · chưa đăng')}</span>
              <button onClick={() => setView(null)} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Đóng')}</button>
            </div>
            <h1 className="text-[clamp(24px,4vw,36px)] font-bold leading-tight">{view.title}</h1>
            <img src={coverOf(view, 'post')} alt="" className="mt-5 aspect-[1200/630] w-full rounded-xl border border-line object-cover" />
            {view.excerpt && <p className="mt-5 border-b border-line pb-5 text-[#dfe0ea]">{view.excerpt}</p>}
            <div className="mt-5"><Markdown text={view.content} /></div>
            <div className="mt-8 flex justify-end gap-2">
              <button onClick={() => setView(null)} className={ghost}>{a('Để sau')}</button>
              <button onClick={() => { approve(view); setView(null) }} className={`${btn} ${grad}`}>{a('Duyệt & đăng')}</button>
            </div>
          </div>
        </div>
      )}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold">{a('Bài nhận từ Easy AI')}</h2><p className="text-sm text-muted">{a('Bài “Lưu nháp” vào ở trạng thái chờ duyệt. Bấm “Duyệt & đăng” là bài hiện lên Blog.')}</p></div>
          <div className="flex flex-wrap gap-2">
            {demoMode && <button onClick={simulate} className={`${ghost} text-xs`} title={a('Chỉ có ở bản demo')}>{a('Mô phỏng Easy AI gửi bài')}</button>}
            <button onClick={() => go('posts')} className={`${ghost} text-xs`}>{a('Mở danh sách Blog')}</button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          {posts === null && <p className="p-6 text-center text-sm text-muted">{a('Đang tải…')}</p>}
          {posts && !posts.length && <p className="p-8 text-center text-sm text-muted">{a('Chưa nhận bài nào. Làm xong các bước bên dưới rồi gửi thử một bài từ Easy AI.')}</p>}
          {posts?.map(p => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-xs text-muted">{p.published_at || '—'}</p>
              </div>
              {p.visible === false
                ? <><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${postStatus(p) === 'review' ? 'bg-[#f8d27c]/15 text-[#f8d27c]' : 'bg-white/8 text-[#c9cbd8]'}`}>{a(postStatus(p) === 'review' ? 'Chờ duyệt' : 'Bản nháp')}</span>
                    <button onClick={() => setView(p)} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Xem trước')}</button>
                    <button onClick={() => approve(p)} className={`${btn} ${grad} px-3 py-1.5 text-xs`}>{a('Duyệt & đăng')}</button></>
                : <><span className="rounded-full bg-[#3ddc97]/12 px-2.5 py-1 text-xs font-medium text-[#5fe3a9]">{a('Đã đăng')}</span>
                    <a href={href(postPath(p))} className={`${ghost} px-3 py-1.5 text-xs`}>{a('Xem bài')}</a></>}
            </div>
          ))}
        </div>
        {waiting.length > 0 && <p className="text-xs text-muted">{a('{n} bài đang chờ duyệt. Muốn sửa nội dung trước khi đăng: Admin → Blog → bấm vào bài.', { n: waiting.length })}</p>}
      </section>

      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">{a('Cách kết nối (làm một lần)')}</h2>
          <p className="text-sm text-muted">{a('Làm trên trang quản lý Supabase, không cần cài gì vào máy. Khoảng 10 phút.')}</p></div>
        {demoMode && <p className="rounded-lg border border-[#f8d27c]/40 bg-[#f8d27c]/10 p-3 text-sm text-[#f8d27c]">{a('Bản demo chưa nối Supabase nên chưa nhận bài thật được. Các bước dưới đây làm khi bạn đã có project Supabase.')}</p>}
        <ol className="rounded-xl border border-line bg-card p-5">
          <Step n="1" title={a('Chạy SQL thêm cột cho Blog và bật realtime')}>
            <p>Supabase → <b>SQL Editor</b> {a('→ New query → dán đoạn này →')} <b>Run</b>:</p>
            <Value>{SQL}</Value>
          </Step>
          <Step n="2" title={a('Tạo hàm nhận bài')}>
            <p>Supabase → <b>Edge Functions</b> → <b>Deploy a new function</b> → <b>Via Editor</b>.</p>
            <p>{a('Đặt tên đúng là:')}</p><Value>nhan-bai</Value>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-[#0b0d16] px-3 py-2.5">
              <span className="min-w-0 flex-1 text-sm">{a('Mã hàm nhận bài')} <span className="text-muted">({a('{n} dòng', { n: FN_CODE.split('\n').length })})</span></span>
              <Copy text={FN_CODE} label={a('Sao chép mã hàm')} />
            </div>
            <p>{a('Xóa hết mã mẫu trong ô soạn thảo, dán mã vừa chép vào, bấm')} <b>Deploy</b>.</p>
            <p>{a('Sau khi deploy: vào hàm')} <b>nhan-bai</b> → <b>Details</b> → <b>{a('tắt “Enforce JWT verification”')}</b> {a('→ Save. Bước này bắt buộc, nếu không Easy AI sẽ bị từ chối.')}</p>
          </Step>
          <Step n="3" title={a('Thêm kênh trên Easy AI để lấy khóa bí mật')}>
            <p>{a('Ở Easy AI: Thêm kênh → Loại kênh')} <b>Website</b> {a('→ Cách đăng bài')} <b>{a('Tự động gửi tới website')}</b>{a('. Dán địa chỉ nhận bài này:')}</p>
            <Value>{ENDPOINT}</Value>
            <p>{a('Chọn “Lưu nháp để duyệt trên website” (an toàn, bạn duyệt trước khi lên trang) hoặc “Đăng thẳng”. Bấm')} <b>{a('Thêm kênh')}</b> {a('và')} <b>{a('sao chép ngay khóa bí mật')}</b> {a('(chỉ hiện một lần).')}</p>
          </Step>
          <Step n="4" title={a('Lưu khóa vào Supabase')}>
            <p>Supabase → <b>Edge Functions</b> → <b>Secrets</b> {a('→ Add new secret, thêm 2 dòng:')}</p>
            <Value>EASYAI_SECRET</Value><p className="-mt-1 text-xs text-muted">{a('Giá trị: khóa bí mật vừa chép ở bước 3.')}</p>
            <Value>SITE_URL</Value><p className="-mt-1 text-xs text-muted">{a('Giá trị: địa chỉ trang của bạn, VD https://congminh.dev (để Easy AI biết link bài đã đăng).')}</p>
          </Step>
          <Step n="5" title={a('Kiểm tra kết nối')}>
            <p>{a('Quay lại Easy AI, bấm')} <b>{a('Kiểm tra kết nối')}</b>{a('. Thấy “Kết nối website hoạt động” là xong. Gửi thử một bài: bài sẽ hiện trong danh sách ở trên.')}</p>
          </Step>
        </ol>
        <details className="rounded-xl border border-line bg-card p-4 text-sm text-[#c9cbd8]">
          <summary className="cursor-pointer font-semibold text-white">{a('Gặp lỗi? Xem nhanh')}</summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li><b>401</b> {a('khi kiểm tra kết nối: khóa trong Secrets không khớp khóa của kênh, hoặc chưa tắt “Enforce JWT verification”.')}</li>
            <li><b>{a('500 “Chưa đặt EASYAI_SECRET”')}</b>{a(': thiếu secret ở bước 4 (tên phải viết hoa đúng).')}</li>
            <li><b>500 “column … does not exist”</b>{a(': chưa chạy SQL ở bước 1.')}</li>
            <li>{a('Mất khóa bí mật: tạo khóa mới trên Easy AI rồi sửa lại EASYAI_SECRET.')}</li>
          </ul>
        </details>
      </section>
    </div>
  )
}
