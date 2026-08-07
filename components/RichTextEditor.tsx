"use client";

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700 p-2 flex gap-2 flex-wrap bg-zinc-50 dark:bg-zinc-800 rounded-t-md">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1.5 rounded text-sm font-medium transition-colors ${
          editor.isActive('bold') 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
            : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded text-sm font-medium transition-colors ${
          editor.isActive('italic') 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
            : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded text-sm font-medium transition-colors ${
          editor.isActive('strike') 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
            : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
        title="Strike"
      >
        <s>S</s>
      </button>
      
      <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-1 self-center" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded text-sm font-medium transition-colors ${
          editor.isActive('heading', { level: 2 }) 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
            : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-1.5 rounded text-sm font-medium transition-colors ${
          editor.isActive('heading', { level: 3 }) 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
            : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
        title="Heading 3"
      >
        H3
      </button>

      <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-1 self-center" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded text-sm font-medium transition-colors ${
          editor.isActive('bulletList') 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
            : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
        title="Bullet List"
      >
        • List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded text-sm font-medium transition-colors ${
          editor.isActive('orderedList') 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
            : 'text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
        }`}
        title="Ordered List"
      >
        1. List
      </button>
    </div>
  );
};

export default function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:underline',
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
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4',
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
    <div className="border border-zinc-300 dark:border-zinc-600 rounded-md overflow-hidden bg-white dark:bg-zinc-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
