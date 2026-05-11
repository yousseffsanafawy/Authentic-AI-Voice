import sys
sys.path.insert(0, '.')
from app.routers.export import _make_minimal_pdf, _build_pdf_bytes

# Test minimal PDF generator
pdf = _make_minimal_pdf('Test Document', ['Line one', 'Line two with content', 'Third line here'])
print(f'PDF size: {len(pdf)} bytes')
print(f'Starts with: {pdf[:8]}')

has_xref = b'xref' in pdf
has_eof = b'%%EOF' in pdf
has_trailer = b'trailer' in pdf

assert pdf.startswith(b'%PDF-1.4'), 'Missing PDF header'
assert has_xref, 'Missing xref table'
assert has_eof, 'Missing EOF marker'
assert has_trailer, 'Missing trailer'
print('All PDF structure checks PASSED')

# Test with build_pdf_bytes fallback
pdf2 = _build_pdf_bytes('My Document', '<p>Hello <strong>world</strong></p><h2>Section</h2><p>More text here.</p>')
print(f'Full PDF fallback size: {len(pdf2)} bytes')
assert pdf2.startswith(b'%PDF'), 'Not a valid PDF'
print('Build PDF bytes PASSED')
print('ALL OK')
