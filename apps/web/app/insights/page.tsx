'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/app-layout';
import { apiClient } from '../../lib/api';
import {
  Sparkles,
  CheckSquare,
  Square,
  Calendar,
  Loader2,
  Camera,
  Layers,
  FileText,
  Cpu,
} from 'lucide-react';
import { ByokModelCard } from '../../components/ai/ByokModelCard';
import { DocumentManager } from '../../components/ai/DocumentManager';
import { AiSandboxDrafts } from '../../components/ai/AiSandboxDrafts';
import { GeneratePlanModal } from '../../components/ai/GeneratePlanModal';

export default function InsightsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [sandboxRefreshTrigger, setSandboxRefreshTrigger] = useState(0);

  const fetchReports = async () => {
    try {
      const res = await apiClient.get('/ai/insights');
      const data = res.data.data || res.data || [];
      setReports(data);
      if (data.length > 0) setActiveReport(data[0]);
    } catch (err: any) {
      console.warn('Errore recupero report AI:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateOnDemand = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/ai/insights/generate', {
        includeProgressPhotos: includePhotos,
      });
      await fetchReports();
      setActiveReport(res.data.data || res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Errore durante la generazione del report.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = (item: string) => {
    setCompletedTasks((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-16">
        {/* Header Principale */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Sovereign AI Coach & Semi-RAG Engine <Sparkles size={22} className="text-pink-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Feedback continuo Kaizen, guardrail clinici basati sulle tue analisi del sangue e sandbox per schede protette
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 bg-[#131b26] border border-[#1f2b3d] px-3.5 py-2.5 rounded-xl text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="rounded accent-pink-500"
              />
              <Camera size={15} className="text-pink-400" />
              <span>Vision Multimodale (Foto)</span>
            </label>

            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/10 transition"
            >
              <Layers size={16} /> Genera Bozza Sandbox
            </button>

            <button
              onClick={handleGenerateOnDemand}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-pink-500/20 transition disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Elaborazione Dati...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Genera Report Settimanale
                </>
              )}
            </button>
          </div>
        </div>

        {/* 1. Card BYOK & Hybrid Model Selector */}
        <ByokModelCard />

        {/* 2. Medical & Coach Documents Manager (Semi-RAG) */}
        <DocumentManager />

        {/* 3. AI Sandbox Drafts Section */}
        <AiSandboxDrafts key={sandboxRefreshTrigger} />

        {/* 4. Storico Report & Report Settimanale Attivo */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-pink-400" /> Report Settimanali Kaizen
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonna Storico */}
            <div className="bg-[#131b26] border border-[#1f2b3d] p-5 rounded-2xl flex flex-col gap-3 h-fit shadow-md">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Archivio Feedback
              </h3>
              {reports.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Nessun report generato finora.</p>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setActiveReport(report)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                      activeReport?.id === report.id
                        ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
                        : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{report.reportType}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(report.createdAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      Intervallo: {report.timeframeCode}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Colonna Report Dettagliato */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {activeReport ? (
                <>
                  {/* Checklist Action Items */}
                  <div className="bg-[#131b26] border border-pink-500/20 p-6 rounded-2xl shadow-xl shadow-pink-500/5">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
                      <CheckSquare size={18} className="text-pink-400" /> Checklist Obiettivi della Settimana
                    </h3>
                    <div className="flex flex-col gap-2.5">
                      {activeReport.actionItems?.map((item: string, idx: number) => {
                        const isDone = Boolean(completedTasks[item]);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleTask(item)}
                            className={`p-3 rounded-xl border text-xs flex items-center gap-3 cursor-pointer transition select-none ${
                              isDone
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through'
                                : 'bg-[#0b0f17] border-slate-800 text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            {isDone ? (
                              <CheckSquare size={16} className="text-emerald-400 shrink-0" />
                            ) : (
                              <Square size={16} className="text-slate-500 shrink-0" />
                            )}
                            <span>{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dialogo e Feedback Coach */}
                  <div className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl">
                    <h3 className="text-sm font-bold text-slate-200 mb-4">
                      Analisi Dettagliata & Considerazioni Cliniche
                    </h3>
                    <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                      {activeReport.coachMessage}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#131b26] border border-[#1f2b3d] p-12 rounded-2xl text-center text-xs text-slate-500">
                  Nessun report selezionato. Clicca su "Genera Report Settimanale" per iniziare.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Generazione Piano Sandbox */}
        <GeneratePlanModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          onSuccess={() => {
            setSandboxRefreshTrigger((prev) => prev + 1);
          }}
        />
      </div>
    </AppLayout>
  );
}
