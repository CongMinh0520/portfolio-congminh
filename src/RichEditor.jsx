// Trình soạn thảo trực quan (giống Word / Google Docs) dùng Tiptap.
// Người dùng chỉ bấm nút định dạng; nội dung vẫn được lưu dưới dạng Markdown để trang chi tiết hiển thị an toàn.
import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { Placeholder } from '@tiptap/extensions'
import Image from '@tiptap/extension-image'
import { useA, at } from './adminLang.js'

const P = {
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7z M7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M10 5h8 M6 19h8 M14 5l-4 14',
  ul: 'M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01',
  ol: 'M10 6h10 M10 12h10 M10 18h10 M4 5l1.5-1v5 M3.5 15.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2-3 3.5h3',
  quote: 'M6 17c-2 0-3-1.5-3-4 0-3 2-6 5-7l.5 1.5C6.5 8.5 6 10 6 11h2.5v6z M16 17c-2 0-3-1.5-3-4 0-3 2-6 5-7l.5 1.5c-2 1-2.5 2.5-2.5 3.5h2.5v6z',
  code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5',
  block: 'M4 5h16v14H4z M8 10l-2 2 2 2 M16 10l2 2-2 2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  undo: 'M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5 M20 9H9a5 5 0 0 0 0 10h3',
  clear: 'M6 6l12 12 M5 19h7 M9 5h10 M14 5l-4 14',
}
const Ico = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="size-[17px]" aria-hidden="true"><path d={d} /></svg>
)

function Btn({ on, title, onClick, children, disabled }) {
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={!!on} disabled={disabled}
      onMouseDown={e => e.preventDefault()} onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-[13px] font-semibold transition disabled:opacity-30
        ${on ? 'bg-purple/25 text-white' : 'text-[#a3a6bd] hover:bg-white/10 hover:text-white'}`}>
      {children}
    </button>
  )
}
const Sep = () => <i className="mx-1 h-5 w-px bg-line" />

export default function RichEditor({ id, value, onChange, placeholder }) {
  const a = useA()
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const linkInput = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        underline: false, strike: false, horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Markdown,
      Placeholder.configure({ placeholder: () => placeholder ?? at('Bắt đầu viết… (dán từ Word / Google Docs vẫn giữ định dạng)') }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg' } }),
    ],
    content: value || '',
    contentType: 'markdown',
    editorProps: { attributes: { id, class: 'rich-editor min-h-[280px] px-4 py-3 outline-none' } },
    onUpdate: ({ editor }) => onChange(editor.getMarkdown()),
  })

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => e ? {
      h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'), italic: e.isActive('italic'), code: e.isActive('code'),
      ul: e.isActive('bulletList'), ol: e.isActive('orderedList'), quote: e.isActive('blockquote'),
      block: e.isActive('codeBlock'), link: e.isActive('link'),
      undo: e.can().undo(), redo: e.can().redo(),
    } : {},
  }) || {}

  useEffect(() => { if (linkOpen) linkInput.current?.focus() }, [linkOpen])
  if (!editor) return null
  const c = () => editor.chain().focus()

  const openLink = () => { setUrl(editor.getAttributes('link').href || ''); setLinkOpen(o => !o) }
  const applyLink = () => {
    const v = url.trim()
    if (!v) c().extendMarkRange('link').unsetLink().run()
    else {
      const href = /^(https?:|mailto:|#)/i.test(v) ? v : `https://${v}`
      if (editor.state.selection.empty && !editor.isActive('link')) c().insertContent({ type: 'text', text: v, marks: [{ type: 'link', attrs: { href } }] }).unsetMark('link').insertContent(' ').run()
      else c().extendMarkRange('link').setLink({ href }).run()
      // con trỏ ra sau link để gõ tiếp không bị dính link
      requestAnimationFrame(() => editor.commands.focus())
    }
    setLinkOpen(false)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-[#0b0d16] focus-within:border-purple focus-within:ring-2 focus-within:ring-purple/25">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-line bg-[#11131f] px-1.5 py-1">
        <Btn title={a('Đoạn văn thường')} on={!s.h2 && !s.h3 && !s.block} onClick={() => c().setParagraph().run()}>¶</Btn>
        <Btn title={a('Tiêu đề lớn')} on={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>H2</Btn>
        <Btn title={a('Tiêu đề nhỏ')} on={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>H3</Btn>
        <Sep />
        <Btn title={a('In đậm (Ctrl+B)')} on={s.bold} onClick={() => c().toggleBold().run()}><Ico d={P.bold} /></Btn>
        <Btn title={a('In nghiêng (Ctrl+I)')} on={s.italic} onClick={() => c().toggleItalic().run()}><Ico d={P.italic} /></Btn>
        <Btn title={a('Chèn link')} on={s.link || linkOpen} onClick={openLink}><Ico d={P.link} /></Btn>
        <Sep />
        <Btn title={a('Danh sách gạch đầu dòng')} on={s.ul} onClick={() => c().toggleBulletList().run()}><Ico d={P.ul} /></Btn>
        <Btn title={a('Danh sách đánh số')} on={s.ol} onClick={() => c().toggleOrderedList().run()}><Ico d={P.ol} /></Btn>
        <Btn title={a('Ghi chú / trích dẫn')} on={s.quote} onClick={() => c().toggleBlockquote().run()}><Ico d={P.quote} /></Btn>
        <Sep />
        <Btn title={a('Mã ngắn trong dòng')} on={s.code} onClick={() => c().toggleCode().run()}><Ico d={P.code} /></Btn>
        <Btn title={a('Khối mã')} on={s.block} onClick={() => c().toggleCodeBlock().run()}><Ico d={P.block} /></Btn>
        <Btn title={a('Xóa định dạng')} onClick={() => c().unsetAllMarks().clearNodes().run()}><Ico d={P.clear} /></Btn>
        <span className="ml-auto flex">
          <Btn title={a('Hoàn tác (Ctrl+Z)')} disabled={!s.undo} onClick={() => c().undo().run()}><Ico d={P.undo} /></Btn>
          <Btn title={a('Làm lại (Ctrl+Y)')} disabled={!s.redo} onClick={() => c().redo().run()}><Ico d={P.redo} /></Btn>
        </span>
      </div>

      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-[#11131f] px-3 py-2">
          <input ref={linkInput} id={`${id}-link`} value={url} onChange={e => setUrl(e.target.value)} placeholder={a('Dán link, VD: playwright.dev')}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } if (e.key === 'Escape') setLinkOpen(false) }}
            className="min-w-0 flex-1 rounded-md border border-line bg-[#0b0d16] px-2.5 py-1.5 text-sm outline-none focus:border-purple" />
          <button type="button" onClick={applyLink} className="rounded-md bg-gradient-to-r from-pink to-purple px-3 py-1.5 text-xs font-semibold">{a('Áp dụng')}</button>
          {s.link && <button type="button" onClick={() => { c().extendMarkRange('link').unsetLink().run(); setLinkOpen(false) }} className="rounded-md border border-line px-3 py-1.5 text-xs text-[#c9cbd8]">{a('Bỏ link')}</button>}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
