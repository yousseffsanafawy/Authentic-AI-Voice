"use client";

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { createLowlight, common } from "lowlight";

const lowlight = createLowlight(common);

export interface TiptapEditorRef {
  editor: Editor | null;
}

interface TiptapEditorProps {
  initialContent: object;
  onUpdate: (json: object, text: string, wordCount: number) => void;
  onEditorReady?: (editor: Editor) => void;
  editable?: boolean;
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  ({ initialContent, onUpdate, onEditorReady, editable = true }, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        Underline,
        Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
        Image.configure({ inline: false, allowBase64: false }),
        CodeBlockLowlight.configure({ lowlight }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: initialContent,
      editable,
      editorProps: {
        attributes: {
          class:
            "ProseMirror focus:outline-none min-h-[calc(100vh-180px)] px-8 py-8",
          "data-placeholder": "Start writing your document…",
        },
      },
      onUpdate: ({ editor }) => {
        const json = editor.getJSON();
        const text = editor.getText();
        const wordCount = text.trim()
          ? text.trim().split(/\s+/).filter(Boolean).length
          : 0;
        onUpdate(json, text, wordCount);
      },
    });

    // Notify parent when editor is ready
    useEffect(() => {
      if (editor && onEditorReady) {
        onEditorReady(editor);
      }
    }, [editor, onEditorReady]);

    // Update content when initialContent changes (e.g. version restore)
    useEffect(() => {
      if (editor && initialContent) {
        const currentContent = editor.getJSON();
        if (JSON.stringify(currentContent) !== JSON.stringify(initialContent)) {
          editor.commands.setContent(initialContent);
        }
      }
    }, [editor, initialContent]);

    useImperativeHandle(ref, () => ({ editor: editor ?? null }));

    return (
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="max-w-4xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";
export default TiptapEditor;
