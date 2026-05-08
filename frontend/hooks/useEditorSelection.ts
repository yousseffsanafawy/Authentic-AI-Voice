"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";

interface SelectionRange {
  from: number;
  to: number;
}

interface UseEditorSelectionReturn {
  selectedText: string;
  selectionRange: SelectionRange;
}

export function useEditorSelection(
  editor: Editor | null
): UseEditorSelectionReturn {
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<SelectionRange>({
    from: 0,
    to: 0,
  });

  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      const text =
        from === to ? "" : editor.state.doc.textBetween(from, to, " ");
      setSelectedText(text);
      setSelectionRange({ from, to });
    };

    editor.on("selectionUpdate", updateSelection);
    return () => {
      editor.off("selectionUpdate", updateSelection);
    };
  }, [editor]);

  return { selectedText, selectionRange };
}
