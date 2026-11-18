'use client';

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../lib/api';
import {
  FileText,
  Upload,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileUp,
  X,
  Shield,
} from 'lucide-react';

interface DocumentItem {
  id: string;
  title: string;
  category: 'BLOODWORK' | 'MEDICAL_REPORT' | 'COACH_PLAN' | 'BIOMETRICS' | 'OTHER';
  originalFilename: string;
  mimeType: string;
  tokenEstimate: number;
  isActiveInRag: boolean;
  createdAt: string;
  extractedMarkdown?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  BLOODWORK: { label: 'Esami Ematici', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  MEDICAL_REPORT: { label: 'Referto Medico', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  COACH_PLAN: { label: 'Scheda Coach', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  BIOMETRICS: { label: 'Biometria/DEXA', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  OTHER: { label: 'Altro Documento', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
};

export function DocumentManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('BLOODWORK');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [activeModalDoc, setActiveModalDoc] = useState<DocumentItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/documents');
      setDocuments(res.data.data || res.data || []);
    } catch (err: any) {
      console.warn('Errore recupero documenti:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!customTitle) {
        setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);
      if (customTitle.trim()) {
        formData.append('title', customTitle.trim());
      }

      await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFeedback({ type: 'success', message: 'Documento caricato, testo estratto e aggiunto al Semi-RAG!' });
      setSelectedFile(null);
      setCustomTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Errore durante il caricamento o parsing del documento.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleRag = async (id: string) => {
    try {
      await apiClient.patch(`/documents/${id}/toggle`);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isActiveInRag: !d.isActiveInRag } : d))
      );
    } catch (err: any) {
      console.error('Errore toggle RAG:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo documento dalla base di conoscenza AI?')) return;
    try {
      await apiClient.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      console.error('Errore eliminazione documento:', err);
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const res = await apiClient.get(`/documents/${id}`);
      setActiveModalDoc(res.data.data || res.data);
    } catch (err: any) {
      console.error('Errore caricamento dettaglio documento:', err);
    }
  };

  const totalTokens = documents
    .filter((d) => d.isActiveInRag)
    .reduce((sum, d) => sum + (d.tokenEstimate || 0), 0);

  return (
    <div className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl flex flex-col gap-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Cartella Clinica & Schede (Semi-RAG Pipeline)
            </h3>
            <p className="text-[11px] text-slate-400">
              Carica analisi ematiche, referti o vecchie schede PDF/MD/TXT. Il testo estratto guiderà il Coach con parametri clinici.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] px-3 py-1 bg-slate-800/80 text-slate-300 border border-slate-700/60 rounded-full font-mono">
            ~{totalTokens.toLocaleString()} token attivi in RAG
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Upload Box */}
      <form onSubmit={handleUpload} className="bg-[#0b0f17] border border-[#1f2b3d] p-4 rounded-xl flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Titolo Documento</label>
            <input
              type="text"
              placeholder="es. Esami del Sangue Ottobre 2026"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-[#131b26] border border-[#1f2b3d] text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Categoria Documento</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#131b26] border border-[#1f2b3d] text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-pink-500"
            >
              <option value="BLOODWORK">Esami Ematici / Analisi del Sangue</option>
              <option value="MEDICAL_REPORT">Referto Medico / Visita Specialistica</option>
              <option value="COACH_PLAN">Scheda di Allenamento Precedente</option>
              <option value="BIOMETRICS">DEXA / Plicometria / Misure Corporee</option>
              <option value="OTHER">Altro Documento Testuale</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Seleziona File (.pdf, .md, .txt)</label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.md,.txt,text/plain,text/markdown,application/pdf"
              onChange={handleFileSelect}
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <p className="text-[10px] text-slate-500">
            * I file vengono elaborati localmente in RAM con estrazione testo automatica e sanificazione anti-overflow.
          </p>
          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition disabled:opacity-40"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Elaborazione & Iniezione RAG...
              </>
            ) : (
              <>
                <FileUp size={14} /> Carica nel RAG
              </>
            )}
          </button>
        </div>
      </form>

      {/* Lista Documenti */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Documenti Attivi nella Memoria Clinica ({documents.length})
        </h4>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Caricamento documenti in corso...
          </div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-[#0b0f17] border border-dashed border-[#1f2b3d] rounded-xl">
            Nessun documento caricato finora. Carica il tuo primo PDF per attivare i guardrail clinici personalizzati.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {documents.map((doc) => {
              const catConfig = CATEGORY_LABELS[doc.category] || CATEGORY_LABELS.OTHER;
              return (
                <div
                  key={doc.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    doc.isActiveInRag
                      ? 'bg-[#0b0f17] border-[#1f2b3d]'
                      : 'bg-[#0b0f17]/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800 text-slate-300 rounded-lg shrink-0 mt-0.5">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-200">{doc.title}</span>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${catConfig.color}`}
                        >
                          {catConfig.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                          ~{doc.tokenEstimate} token
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        File: {doc.originalFilename} • Caricato il {new Date(doc.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleRag(doc.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                        doc.isActiveInRag
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                      title="Attiva/Disattiva inclusione nel contesto dei prompt AI"
                    >
                      {doc.isActiveInRag ? (
                        <>
                          <ToggleRight size={16} className="text-emerald-400" />
                          <span>Incluso nel RAG</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={16} className="text-slate-500" />
                          <span>Escluso</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleViewDetails(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                      title="Visualizza testo estratto"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 rounded-lg transition"
                      title="Elimina documento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Visualizzazione Testo Estratto */}
      {activeModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b26] border border-[#1f2b3d] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#1f2b3d] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-100">{activeModalDoc.title}</h4>
                <p className="text-[11px] text-slate-400 font-mono">
                  {activeModalDoc.originalFilename} • ~{activeModalDoc.tokenEstimate} token stimati
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-[#0b0f17]">
              {activeModalDoc.extractedMarkdown || 'Nessun contenuto testuale disponibile.'}
            </div>
            <div className="p-3 border-t border-[#1f2b3d] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalDoc(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

