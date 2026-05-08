"""
document_service.py — thin helper layer over the documents router.
Most document logic lives directly in routers/documents.py for Sprint 1.
This module is a placeholder for any shared business logic added in later sprints
(e.g., detecting has_footnotes / has_tables from Tiptap JSON).
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.document import Document


def detect_flags(content: dict) -> dict:
    """
    Scan a Tiptap JSON doc and return flags for has_tables / has_footnotes.
    Called inside PATCH /documents/{id} auto-save.
    """
    has_tables = False
    has_footnotes = False

    def walk(node: dict):
        nonlocal has_tables, has_footnotes
        t = node.get("type", "")
        if t == "table":
            has_tables = True
        if t == "footnote":
            has_footnotes = True
        for child in node.get("content", []):
            walk(child)

    walk(content)
    return {"has_tables": has_tables, "has_footnotes": has_footnotes}
