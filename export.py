from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User

# Imports for LaTeX service
from app.schemas.voice_profile import ExportLaTeXRequest
from app.services.latex_service import LaTeXService

router = APIRouter(tags=["export"])

class ExportRequest(BaseModel):
    # Accept both field names — frontend may send either
    document_id: str | None = None
    doc_id: str | None = None

    def get_id(self) -> str:
        val = self.document_id or self.doc_id
        if not val:
            raise ValueError("document_id is required")
        return val


async def _get_owned_doc(doc_id: str, user_id: str, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == user_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


def _tiptap_to_html(content: dict | list | str | None) -> str:
    """Convert Tiptap JSON content to basic HTML for PDF rendering."""
    if not content:
        return "<p></p>"
    if isinstance(content, str):
        return f"<p>{content}</p>"

    lines = []

    def walk(node):
        if not isinstance(node, dict):
            return ""
        ntype = node.get("type", "")
        children = node.get("content", []) or []

        # Leaf text node
        if ntype == "text":
            text = node.get("text", "")
            marks = {m["type"] for m in (node.get("marks") or [])}
            if "bold" in marks:
                text = f"<strong>{text}</strong>"
            if "italic" in marks:
                text = f"<em>{text}</em>"
            if "underline" in marks:
                text = f"<u>{text}</u>"
            if "strike" in marks:
                text = f"<s>{text}</s>"
            if "code" in marks:
                text = f"<code>{text}</code>"
            return text

        inner = "".join(walk(c) for c in children)

        tag_map = {
            "paragraph": "p",
            "blockquote": "blockquote",
            "codeBlock": "pre",
            "horizontalRule": "hr",
        }
        heading_map = {1: "h1", 2: "h2", 3: "h3", 4: "h4"}

        if ntype in tag_map:
            tag = tag_map[ntype]
            if tag == "hr":
                return "<hr/>"
            return f"<{tag}>{inner}</{tag}>"

        if ntype == "heading":
            level = node.get("attrs", {}).get("level", 1)
            tag = heading_map.get(level, "h2")
            return f"<{tag}>{inner}</{tag}>"

        if ntype == "bulletList":
            items = "".join(f"<li>{walk(c)}</li>" for c in children)
            return f"<ul>{items}</ul>"

        if ntype == "orderedList":
            items = "".join(f"<li>{walk(c)}</li>" for c in children)
            return f"<ol>{items}</ol>"

        if ntype == "listItem":
            return inner

        if ntype == "table":
            rows = "".join(walk(c) for c in children)
            return f"<table border='1' cellpadding='6'>{rows}</table>"

        if ntype == "tableRow":
            cells = "".join(walk(c) for c in children)
            return f"<tr>{cells}</tr>"

        if ntype in ("tableCell", "tableHeader"):
            tag = "th" if ntype == "tableHeader" else "td"
            return f"<{tag}>{inner}</{tag}>"

        if ntype == "doc":
            return inner

        return inner

    html_body = walk(content) if isinstance(content, dict) else "".join(walk(n) for n in (content if isinstance(content, list) else []))
    return html_body or "<p></p>"


def _build_pdf_bytes(title: str, html_body: str) -> bytes:
    """Generate PDF using xhtml2pdf (cross-platform, no GTK required)."""
    full_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>{title}</title>
  <style>
    @page {{ margin: 2cm; }}
    body {{ font-family: Georgia, serif; line-height: 1.7; color: #111; font-size: 11pt; }}
    h1   {{ font-size: 22pt; color: #1a1a2e; border-bottom: 1px solid #ccc; padding-bottom: 6pt; margin-bottom: 12pt; }}
    h2   {{ font-size: 16pt; color: #1a1a2e; margin-top: 18pt; }}
    h3   {{ font-size: 13pt; color: #333; margin-top: 14pt; }}
    h4   {{ font-size: 11pt; color: #444; margin-top: 10pt; }}
    p    {{ margin: 0 0 10pt; }}
    blockquote {{ border-left: 3px solid #888; padding-left: 12pt; color: #555; margin: 10pt 0; font-style: italic; }}
    pre  {{ background: #f4f4f4; padding: 10pt; border-radius: 4pt; font-size: 9pt; overflow-wrap: break-word; }}
    code {{ background: #f4f4f4; padding: 1pt 4pt; border-radius: 2pt; font-size: 9.5pt; }}
    table {{ border-collapse: collapse; width: 100%; margin: 10pt 0; }}
    th, td {{ border: 1px solid #ccc; padding: 6pt 8pt; text-align: left; }}
    th {{ background: #f0f0f0; font-weight: bold; }}
    a    {{ color: #1a6f9a; }}
    ul, ol {{ margin: 0 0 10pt; padding-left: 20pt; }}
    li   {{ margin-bottom: 3pt; }}
    hr   {{ border: none; border-top: 1px solid #ddd; margin: 16pt 0; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  {html_body}
</body>
</html>"""

    import io
    from xhtml2pdf import pisa

    buf = io.BytesIO()
    result = pisa.CreatePDF(full_html, dest=buf)
    if result.err:
        raise RuntimeError(f"xhtml2pdf error: {result.err}")
    return buf.getvalue()


@router.post("/pdf")
async def export_pdf(
    payload: ExportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export document as PDF. Direct download, named after document title."""
    try:
        doc_id = payload.get_id()
    except ValueError:
        raise HTTPException(status_code=422, detail="document_id is required")

    doc = await _get_owned_doc(doc_id, user.id, db)

    html_body = _tiptap_to_html(doc.content)
    pdf_bytes = _build_pdf_bytes(doc.title or "Document", html_body)

    safe_title = (doc.title or "document").strip()
    safe_title = "".join(c for c in safe_title if c.isalnum() or c in " _-").strip() or "document"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.post("/latex")
async def export_latex(
    body: ExportLaTeXRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export document as .tex file. Direct attachment download."""
    latex_str = await LaTeXService(db).generate_latex(
        body.document_id, user.id, body.options
    )

    doc = await _get_owned_doc(body.document_id, user.id, db)
    safe_title = (
        "".join(c for c in (doc.title or "document") if c.isalnum() or c in " _-").strip()
        or "document"
    )
    encoded = latex_str.encode("utf-8")

    return Response(
        content=encoded,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}.tex"',
            "Content-Length": str(len(encoded)),
        },
    )