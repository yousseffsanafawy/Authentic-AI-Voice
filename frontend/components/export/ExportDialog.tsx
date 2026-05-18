"use client"

import { useState } from "react";
import api from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

export default function ExportDialog({ isOpen, onClose, documentId }: ExportDialogProps) {
  const [activeTab, setActiveTab] = useState<'pdf' | 'latex'>('pdf');
  const [template, setTemplate] = useState('academic');
  const [fontSize, setFontSize] = useState('12pt');
  const [paperSize, setPaperSize] = useState('a4paper');
  const [includeToc, setIncludeToc] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { addToast } = useEditorStore();

  const downloadBlob = (data: Blob, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePDF = async () => {
    setIsExporting(true);
    try {
      const r = await api.post('/api/export/pdf',
        { document_id: documentId }, { responseType: 'blob' });
      downloadBlob(r.data, 'document.pdf', 'application/pdf');
      addToast('PDF downloaded!', 'success');
    } catch {
      addToast('PDF export failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLaTeX = async () => {
    setIsExporting(true);
    try {
      const r = await api.post('/api/export/latex', {
        document_id: documentId,
        options: { template, font_size: fontSize, paper_size: paperSize, include_toc: includeToc }
      }, { responseType: 'blob' });
      downloadBlob(r.data, 'document.tex', 'text/plain');
      addToast('LaTeX downloaded!', 'success');
    } catch {
      addToast('LaTeX export failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:49,
        background:'rgba(0,0,0,0.5)',
        backdropFilter:'blur(4px)'
      }} />

      {/* Modal */}
      <div style={{
        position:'fixed', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        zIndex:50, width:'480px', maxWidth:'90vw',
        background:'rgba(15,18,28,0.92)',
        backdropFilter:'blur(12px)',
        border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:'16px',
        boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
        padding:'1.5rem',
        color: 'var(--color-text)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Export Document</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('pdf')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              color: activeTab === 'pdf' ? 'var(--color-text)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              borderBottom: activeTab === 'pdf' ? '2px solid transparent' : '2px solid transparent',
              borderImage: activeTab === 'pdf' ? 'linear-gradient(90deg, var(--color-mint), var(--color-cyan)) 1' : 'none',
              fontWeight: activeTab === 'pdf' ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            PDF
          </button>
          <button
            onClick={() => setActiveTab('latex')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem 1rem',
              color: activeTab === 'latex' ? 'var(--color-text)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              borderBottom: activeTab === 'latex' ? '2px solid transparent' : '2px solid transparent',
              borderImage: activeTab === 'latex' ? 'linear-gradient(90deg, var(--color-mint), var(--color-cyan)) 1' : 'none',
              fontWeight: activeTab === 'latex' ? 600 : 400,
              transition: 'all 0.2s'
            }}
          >
            LaTeX
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'pdf' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Export a standard PDF document. Note: PDFs do not currently support complex formatting like mathematical formulas.
            </p>
            <button
              onClick={handlePDF}
              disabled={isExporting}
              className="btn-primary"
              style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
            >
              {isExporting ? 'Exporting...' : 'Download PDF'}
            </button>
          </div>
        )}

        {activeTab === 'latex' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Template</label>
              <select 
                value={template} 
                onChange={(e) => setTemplate(e.target.value)}
                style={{ 
                  background: 'var(--color-bg-deep)', 
                  border: '1px solid var(--color-border)', 
                  color: 'var(--color-text)',
                  padding: '0.5rem',
                  borderRadius: '6px'
                }}
              >
                <option value="academic">Academic</option>
                <option value="article">Article (Two-Column)</option>
                <option value="report">Report</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Font Size</label>
                <select 
                  value={fontSize} 
                  onChange={(e) => setFontSize(e.target.value)}
                  style={{ 
                    background: 'var(--color-bg-deep)', 
                    border: '1px solid var(--color-border)', 
                    color: 'var(--color-text)',
                    padding: '0.5rem',
                    borderRadius: '6px'
                  }}
                >
                  <option value="10pt">10pt</option>
                  <option value="11pt">11pt</option>
                  <option value="12pt">12pt</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Paper Size</label>
                <select 
                  value={paperSize} 
                  onChange={(e) => setPaperSize(e.target.value)}
                  style={{ 
                    background: 'var(--color-bg-deep)', 
                    border: '1px solid var(--color-border)', 
                    color: 'var(--color-text)',
                    padding: '0.5rem',
                    borderRadius: '6px'
                  }}
                >
                  <option value="a4paper">A4</option>
                  <option value="letterpaper">Letter</option>
                </select>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={includeToc} 
                onChange={(e) => setIncludeToc(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              Include Table of Contents
            </label>

            <div style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              color: '#fbbf24',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              lineHeight: 1.5
            }}>
              Merged cells and custom colors may not translate exactly. The .tex file is fully editable in Overleaf.
            </div>

            <button
              onClick={handleLaTeX}
              disabled={isExporting}
              className="btn-primary"
              style={{ alignSelf: 'flex-start' }}
            >
              {isExporting ? 'Exporting...' : 'Download LaTeX'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
