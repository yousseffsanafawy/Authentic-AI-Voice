from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document


class PDFService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_pdf(self, document_id: str, user_id: str) -> bytes:
        doc = await self._get_document(document_id, user_id)
        footnotes: list = []
        html_body = self._tiptap_to_html(doc.content, footnotes)

        footnote_section = ""
        if footnotes:
            items = "".join(f"<li>{fn}</li>" for fn in footnotes)
            footnote_section = f'<div class="footnotes"><hr/><ol>{items}</ol></div>'

        full_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: Georgia, serif; font-size: 12pt; margin: 2.5cm; line-height: 1.6; color: #1a1a1a; }}
    h1 {{ font-size: 22pt; border-bottom: 2px solid #333; padding-bottom: 6px; margin-bottom: 1em; }}
    h2 {{ font-size: 17pt; }} h3 {{ font-size: 14pt; }} h4,h5,h6 {{ font-size: 12pt; font-weight: bold; }}
    table {{ border-collapse: collapse; width: 100%; margin: 1em 0; }}
    td, th {{ border: 1px solid #555; padding: 6px 10px; text-align: left; }}
    th {{ background: #f0f0f0; font-weight: bold; }}
    blockquote {{ border-left: 4px solid #ccc; margin: 1em 0; padding: 0.5em 1em; color: #555; }}
    pre {{ background: #f8f8f8; border: 1px solid #ddd; padding: 1em; border-radius: 4px; }}
    code {{ font-family: 'Courier New', monospace; font-size: 10pt; }}
    sup {{ color: #1a0dab; font-size: 8pt; }}
    .footnotes {{ margin-top: 2em; font-size: 10pt; color: #555; }}
  </style>
</head>
<body>
  <h1>{doc.title}</h1>
  {html_body}
  {footnote_section}
</body>
</html>"""
        try:
            from weasyprint import HTML
        except OSError as e:
            raise HTTPException(
                status_code=503,
                detail=(
                    "PDF export requires GTK3. "
                    "Download from https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases "
                    f"Error: {e}"
                ),
            )
        return HTML(string=full_html).write_pdf()

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

    def _tiptap_to_html(self, content: dict, footnotes: list) -> str:
        return "".join(
            self._process_node(n, footnotes) for n in content.get("content", [])
        )

    def _process_node(self, node: dict, footnotes: list) -> str:
        t = node.get("type", "")
        children = node.get("content", [])

        if t == "paragraph":
            return f"<p>{''.join(self._process_node(c, footnotes) for c in children)}</p>"
        elif t == "heading":
            lvl = node["attrs"]["level"]
            return f"<h{lvl}>{''.join(self._process_node(c, footnotes) for c in children)}</h{lvl}>"
        elif t == "bulletList":
            items = "".join(
                f"<li>{''.join(self._process_node(c, footnotes) for c in item.get('content', []))}</li>"
                for item in children
            )
            return f"<ul>{items}</ul>"
        elif t == "orderedList":
            items = "".join(
                f"<li>{''.join(self._process_node(c, footnotes) for c in item.get('content', []))}</li>"
                for item in children
            )
            return f"<ol>{items}</ol>"
        elif t == "blockquote":
            return f"<blockquote>{''.join(self._process_node(c, footnotes) for c in children)}</blockquote>"
        elif t == "codeBlock":
            code = children[0].get("text", "") if children else ""
            return f"<pre><code>{code}</code></pre>"
        elif t == "table":
            rows = "".join(self._process_node(r, footnotes) for r in children)
            return f"<table>{rows}</table>"
        elif t == "tableRow":
            return f"<tr>{''.join(self._process_node(c, footnotes) for c in children)}</tr>"
        elif t == "tableHeader":
            return f"<th>{''.join(self._process_node(c, footnotes) for c in children)}</th>"
        elif t == "tableCell":
            return f"<td>{''.join(self._process_node(c, footnotes) for c in children)}</td>"
        elif t == "footnote":
            content = node["attrs"].get("content", "")
            footnotes.append(content)
            return f"<sup>[{len(footnotes)}]</sup>"
        elif t == "horizontalRule":
            return "<hr>"
        elif t == "text":
            text = node.get("text", "")
            for mark in node.get("marks", []):
                m = mark["type"]
                if m == "bold":         text = f"<strong>{text}</strong>"
                elif m == "italic":     text = f"<em>{text}</em>"
                elif m == "underline":  text = f"<u>{text}</u>"
                elif m == "strike":     text = f"<s>{text}</s>"
                elif m == "code":       text = f"<code>{text}</code>"
                elif m == "link":       text = f'<a href="{mark["attrs"]["href"]}">{text}</a>'
            return text
        return ""
