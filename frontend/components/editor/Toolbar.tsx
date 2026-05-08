"use client";

import { Editor } from "@tiptap/react";

interface ToolbarProps {
  editor: Editor | null;
  wordCount: number;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onExportPDF: () => void;
  isExporting?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="relative px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150
        disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        background: isActive
          ? "linear-gradient(135deg, var(--color-neon-primary), var(--color-neon-purple))"
          : "transparent",
        color: isActive ? "#fff" : "var(--color-text-muted)",
      }}
      onMouseEnter={(e) => {
        if (!isActive && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-3)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
        }
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      className="w-px h-5 flex-shrink-0 mx-1"
      style={{ background: "var(--color-border-bright)" }}
    />
  );
}

export default function Toolbar({
  editor,
  wordCount,
  saveStatus,
  onExportPDF,
  isExporting = false,
}: ToolbarProps) {
  if (!editor) return null;

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertImage = () => {
    const url = window.prompt("Image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const saveStatusConfig = {
    idle:   { label: "",          color: "transparent" },
    saving: { label: "Saving…",   color: "var(--color-warning)" },
    saved:  { label: "Saved ✓",   color: "var(--color-success)" },
    error:  { label: "Error",     color: "var(--color-error)" },
  }[saveStatus];

  return (
    <div
      className="sticky top-0 z-30 flex items-center gap-0.5 px-4 py-2 flex-wrap"
      style={{
        background: "rgba(15,17,23,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      {/* Group 1: Text format */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <span style={{ textDecoration: "line-through" }}>S</span>
      </ToolbarButton>

      <Divider />

      {/* Group 2: Headings */}
      {([1, 2, 3] as (1 | 2 | 3)[]).map((level) => (
        <ToolbarButton
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          isActive={editor.isActive("heading", { level })}
          title={`Heading ${level}`}
        >
          H{level}
        </ToolbarButton>
      ))}

      <Divider />

      {/* Group 3: Structure */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        ≡
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Ordered List"
      >
        ⋮
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        "
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code Block"
      >
        {"<>"}
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        —
      </ToolbarButton>

      <Divider />

      {/* Group 4: Insert */}
      <ToolbarButton onClick={insertTable} title="Insert 3×3 Table">
        ⊞
      </ToolbarButton>
      <ToolbarButton onClick={insertImage} title="Insert Image from URL">
        🖼
      </ToolbarButton>

      <Divider />

      {/* Group 5: Doc actions */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Word count */}
        <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
          {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
        </span>

        {/* Save status */}
        {saveStatus !== "idle" && (
          <span className="text-xs font-medium" style={{ color: saveStatusConfig.color }}>
            {saveStatusConfig.label}
          </span>
        )}

        {/* Export PDF */}
        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, var(--color-neon-primary), var(--color-neon-purple))",
            color: "#fff",
            boxShadow: "0 0 12px rgba(6,182,212,0.3)",
          }}
          title="Export as PDF"
        >
          {isExporting ? (
            <>
              <span className="animate-spin">⟳</span> Exporting…
            </>
          ) : (
            <>⬇ PDF</>
          )}
        </button>
      </div>
    </div>
  );
}
