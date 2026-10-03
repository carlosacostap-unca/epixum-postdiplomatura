"use client";

import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  useEditorState({
    editor,
    selector: ({ editor: current }) => current ? {
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      strike: current.isActive('strike'),
      heading2: current.isActive('heading', { level: 2 }),
      heading3: current.isActive('heading', { level: 3 }),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      canBold: current.can().toggleBold(),
      canItalic: current.can().toggleItalic(),
      canStrike: current.can().toggleStrike(),
    } : null,
  });
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-[var(--color-outline-variant)] p-2 flex gap-2 flex-wrap bg-[var(--color-surface-container-low)] rounded-t-md">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium transition-colors ${
          editor.isActive('bold')
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        title="Negrita" aria-label="Negrita" aria-pressed={editor.isActive('bold')}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium transition-colors ${
          editor.isActive('italic')
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        title="Cursiva" aria-label="Cursiva" aria-pressed={editor.isActive('italic')}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium transition-colors ${
          editor.isActive('strike')
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        title="Tachado" aria-label="Tachado" aria-pressed={editor.isActive('strike')}
      >
        <s>S</s>
      </button>

      <div className="w-px h-6 bg-[var(--color-surface-container-highest)] mx-1 self-center" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium transition-colors ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        title="Título de nivel 2" aria-label="Título de nivel 2" aria-pressed={editor.isActive('heading', { level: 2 })}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium transition-colors ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        title="Título de nivel 3" aria-label="Título de nivel 3" aria-pressed={editor.isActive('heading', { level: 3 })}
      >
        H3
      </button>

      <div className="w-px h-6 bg-[var(--color-surface-container-highest)] mx-1 self-center" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium transition-colors ${
          editor.isActive('bulletList')
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        title="Lista con viñetas" aria-label="Lista con viñetas" aria-pressed={editor.isActive('bulletList')}
      >
        • Lista
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium transition-colors ${
          editor.isActive('orderedList')
            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
            : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)]'
        }`}
        title="Lista numerada" aria-label="Lista numerada" aria-pressed={editor.isActive('orderedList')}
      >
        1. Lista
      </button>
    </div>
  );
};

export default function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--color-primary)] hover:underline',
        },
      }),
    ],
    content: content,
    editable: editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[180px] p-4',
        role: 'textbox',
        'aria-label': 'Descripción',
        'aria-multiline': 'true',
      },
    },
    immediatelyRender: false,
  });

  // Update content if it changes externally (e.g. initial load)
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
       // Only update if content is significantly different to avoid cursor jumping
       // For simple use cases, this might be enough, but be careful with loops
       // editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="border border-[var(--color-outline-variant)] rounded-md overflow-hidden bg-[var(--color-surface-container-lowest)] focus-within:ring-2 focus-within:ring-[var(--color-focus)] focus-within:border-transparent">
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
