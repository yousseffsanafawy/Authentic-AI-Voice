from pathlib import Path
from fastapi import HTTPException
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


class LaTeXService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

    async def generate_latex(self, document_id: str, user_id: str, options: dict) -> str:
        doc = await self._get_document(document_id, user_id)
        body = self._tiptap_to_latex(doc.content)
        template_name = options.get("template", "academic")
        template = self.env.get_template(f"{template_name}.tex.j2")
        return template.render(
            title=self._escape(doc.title),
            body=body,
            font_size=options.get("font_size", "12pt"),
            paper_size=options.get("paper_size", "a4paper"),
            include_toc=options.get("include_toc", False),
        )

    async def _get_document(self, document_id: str, user_id: str) -> Document:
        result = await self.db.execute(
            select(Document).where(
                Document.id == document_id, Document.user_id == user_id
            )
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc

    def _tiptap_to_latex(self, content: dict) -> str:
        return "\n\n".join(
            self._process_node(n)
            for n in content.get("content", [])
            if n
        )

    def _process_node(self, node: dict) -> str:
        t = node.get("type", "")
        children = node.get("content", [])
        if t == "paragraph":
            return self._inline(children)
        elif t == "heading":
            lvl = node["attrs"]["level"]
            cmds = ["\\section", "\\subsection", "\\subsubsection",
                    "\\paragraph", "\\subparagraph", "\\subparagraph"]
            return f"{cmds[lvl - 1]}{{{self._inline(children)}}}"
        elif t == "bulletList":
            items = "\n".join(
                f"  \\item {self._process_node(item['content'][0])}"
                for item in children if item.get("content")
            )
            return f"\\begin{{itemize}}\n{items}\n\\end{{itemize}}"
        elif t == "orderedList":
            items = "\n".join(
                f"  \\item {self._process_node(item['content'][0])}"
                for item in children if item.get("content")
            )
            return f"\\begin{{enumerate}}\n{items}\n\\end{{enumerate}}"
        elif t == "blockquote":
            inner = "\n\n".join(self._process_node(c) for c in children)
            return f"\\begin{{quote}}\n{inner}\n\\end{{quote}}"
        elif t == "codeBlock":
            code = children[0].get("text", "") if children else ""
            lang = node.get("attrs", {}).get("language", "")
            return f"\\begin{{lstlisting}}[language={lang}]\n{code}\n\\end{{lstlisting}}"
        elif t == "table":
            return self._process_table(node)
        elif t == "horizontalRule":
            return "\\hrule"
        elif t == "footnote":
            return f"\\footnote{{{self._escape(node['attrs'].get('content', ''))}}}"
        return ""

    def _inline(self, nodes: list) -> str:
        return "".join(self._process_inline(n) for n in nodes)

    def _process_inline(self, node: dict) -> str:
        if node.get("type") == "footnote":
            return self._process_node(node)
        text = self._escape(node.get("text", ""))
        for mark in node.get("marks", []):
            m = mark["type"]
            if m == "bold":         text = f"\\textbf{{{text}}}"
            elif m == "italic":     text = f"\\textit{{{text}}}"
            elif m == "underline":  text = f"\\underline{{{text}}}"
            elif m == "strike":     text = f"\\sout{{{text}}}"
            elif m == "code":       text = f"\\texttt{{{text}}}"
            elif m == "link":       text = f"\\href{{{mark['attrs']['href']}}}{{{text}}}"
        return text

    def _process_table(self, node: dict) -> str:
        rows = node.get("content", [])
        if not rows:
            return ""
        col_count = len(rows[0].get("content", []))
        col_spec = "|" + "c|" * col_count
        lines = [f"\\begin{{tabular}}{{{col_spec}}}", "\\hline"]
        for row in rows:
            cells = [
                self._inline(cell.get("content", [{}])[0].get("content", []))
                for cell in row.get("content", [])
            ]
            lines.append(" & ".join(cells) + " \\\\")
            lines.append("\\hline")
        lines.append("\\end{tabular}")
        return "\n".join(lines)

    def _escape(self, text: str) -> str:
        for old, new in [
            ("\\", "\\textbackslash{}"), ("&", "\\&"), ("%", "\\%"),
            ("$", "\\$"), ("#", "\\#"), ("_", "\\_"),
            ("{", "\\{"), ("}", "\\}"),
            ("~", "\\textasciitilde{}"), ("^", "\\textasciicircum{}"),
        ]:
            text = text.replace(old, new)
        return text
