'use client';

import { useEffect, type CSSProperties } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

// ── Props ──

export interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  linkPrompt?: string;
}

// ── ProseMirror 콘텐츠 스타일 (CSS 변수 기반 다크 테마) ──

const EDITOR_CSS_ID = 'wz-rich-editor-styles';
const SCOPE = '.wz-rich-editor';

const EDITOR_STYLES = `
${SCOPE} .tiptap {
  outline: none;
  min-height: 250px;
  padding: 12px;
  color: var(--blog-text, #171717);
  font-family: var(--blog-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  font-size: 14px;
  line-height: 1.8;
}
${SCOPE} .tiptap p { margin: 0.4em 0; }
${SCOPE} .tiptap h2 { font-size: 1.4em; font-weight: 700; margin: 1em 0 0.4em; color: var(--blog-text, #171717); }
${SCOPE} .tiptap h3 { font-size: 1.2em; font-weight: 600; margin: 0.8em 0 0.3em; color: var(--blog-text, #171717); }
${SCOPE} .tiptap ul { list-style: disc; padding-left: 1.5em; margin: 0.4em 0; }
${SCOPE} .tiptap ol { list-style: decimal; padding-left: 1.5em; margin: 0.4em 0; }
${SCOPE} .tiptap li { margin: 0.2em 0; }
${SCOPE} .tiptap blockquote {
  border-left: 3px solid var(--blog-border, #e5e5e5);
  padding-left: 1em;
  margin: 0.6em 0;
  color: var(--blog-text-muted, #737373);
  font-style: italic;
}
${SCOPE} .tiptap a { color: var(--blog-accent, #4A90D9); text-decoration: underline; }
${SCOPE} .tiptap code {
  background: var(--blog-bg-input, #ffffff);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--blog-font-mono, monospace);
  font-size: 0.9em;
}
${SCOPE} .tiptap pre {
  background: var(--blog-bg-input, #ffffff);
  padding: 12px;
  border-radius: var(--blog-radius-sm, 4px);
  overflow-x: auto;
  margin: 0.6em 0;
}
${SCOPE} .tiptap pre code { background: none; padding: 0; }
${SCOPE} .tiptap hr {
  border: none;
  border-top: 1px solid var(--blog-border, #e5e5e5);
  margin: 1em 0;
}
${SCOPE} .tiptap s { text-decoration: line-through; color: var(--blog-text-dim, #a3a3a3); }
`;

// ── 스타일 ──

const rs = {
  container: {
    border: '1px solid var(--blog-border, #e5e5e5)',
    borderRadius: 'var(--blog-radius-sm, 4px)',
    overflow: 'hidden',
    backgroundColor: 'var(--blog-bg-input, #ffffff)',
  } as CSSProperties,

  toolbar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 2,
    padding: '6px 8px',
    borderBottom: '1px solid var(--blog-border, #e5e5e5)',
    backgroundColor: 'var(--blog-bg-card, #ffffff)',
  } as CSSProperties,

  sep: {
    width: 1,
    alignSelf: 'stretch' as const,
    backgroundColor: 'var(--blog-border, #e5e5e5)',
    margin: '0 4px',
  } as CSSProperties,

  btn: (active: boolean): CSSProperties => ({
    padding: '4px 8px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    fontFamily: 'var(--blog-font, sans-serif)',
    borderRadius: 3,
    border: 'none',
    backgroundColor: active ? 'rgba(74,144,217,0.12)' : 'transparent',
    color: active ? 'var(--blog-accent, #4A90D9)' : 'var(--blog-text-muted, #737373)',
    cursor: 'pointer',
    transition: 'background-color 0.12s, color 0.12s',
    whiteSpace: 'nowrap' as const,
    lineHeight: '20px',
  }),

  unlinkBtn: {
    padding: '4px 8px',
    fontSize: 12,
    fontFamily: 'var(--blog-font, sans-serif)',
    borderRadius: 3,
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--blog-danger, #ef4444)',
    cursor: 'pointer',
    lineHeight: '20px',
  } as CSSProperties,
};

// ── MenuBar ──

function MenuBar({ editor, linkPrompt }: { editor: ReturnType<typeof useEditor> | null; linkPrompt: string }) {
  if (!editor) return null;

  function handleLink() {
    const url = window.prompt(linkPrompt);
    if (!url) return;
    editor!.chain().focus().setLink({ href: url }).run();
  }

  const b = (active: boolean) => rs.btn(active);

  return (
    <div style={rs.toolbar}>
      <button type="button" style={b(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </button>
      <button type="button" style={b(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </button>
      <button type="button" style={b(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </button>

      <div style={rs.sep} />

      <button type="button" style={b(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </button>
      <button type="button" style={b(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        H3
      </button>

      <div style={rs.sep} />

      <button type="button" style={b(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        &#x2022; List
      </button>
      <button type="button" style={b(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. List
      </button>

      <div style={rs.sep} />

      <button type="button" style={b(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        &#x275D;
      </button>
      <button type="button" style={b(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        &#x2015;
      </button>
      <button type="button" style={b(editor.isActive('code'))} onClick={() => editor.chain().focus().toggleCode().run()}>
        {'</>'}
      </button>

      <div style={rs.sep} />

      <button type="button" style={b(editor.isActive('link'))} onClick={handleLink}>
        Link
      </button>
      {editor.isActive('link') && (
        <button type="button" style={rs.unlinkBtn} onClick={() => editor.chain().focus().unsetLink().run()}>
          Unlink
        </button>
      )}
    </div>
  );
}

// ── RichTextEditor ──

export default function RichTextEditor({
  content,
  onChange,
  disabled = false,
  linkPrompt = 'URL을 입력하세요:',
}: RichTextEditorProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(EDITOR_CSS_ID)) return;
    const style = document.createElement('style');
    style.id = EDITOR_CSS_ID;
    style.textContent = EDITOR_STYLES;
    document.head.appendChild(style);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: '' },
      }),
    ],
    content,
    immediatelyRender: false,
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div className="wz-rich-editor" style={rs.container}>
      {!disabled && <MenuBar editor={editor} linkPrompt={linkPrompt} />}
      <EditorContent editor={editor} />
    </div>
  );
}
