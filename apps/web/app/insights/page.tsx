'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/app-layout';
import { apiClient } from '../../lib/api';
import { Sparkles, CheckSquare, Square, Calendar, Loader2 } from 'lucide-react';

export default function InsightsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const fetchReports = async () => {
    const res = await apiClient.get('/ai/insights');
    const data = res.data.data || [];
    setReports(data);
    if (data.length > 0) setActiveReport(data[0]);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateOnDemand = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/ai/insights/generate');
      await fetchReports();
      setActiveReport(res.data.data || res.data);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = (item: string) => {
    setCompletedTasks((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              Kaizen AI Coach <Sparkles size={22} className="text-pink-400" />
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Feedback settimanali, analisi dell'1% continuo e checklist obiettivi
            </p>
          </div>
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
                <Sparkles size={16} /> Genera Report Ora
              </>
            )}
          </button>
        </div>

        {/* Layout a 2 Colonne: Storico Report a sinistra e Report Attivo a destra */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna Storico */}
          <div className="bg-[#131b26] border border-[#1f2b3d] p-5 rounded-2xl flex flex-col gap-3 h-fit">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Storico Report</h3>
            {reports.map((report) => (
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
                  <span className="text-[10px] text-slate-500">{new Date(report.createdAt).toLocaleDateString('it-IT')}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  Timeframe: {report.timeframeCode}
                </p>
              </div>
            ))}
          </div>

          {/* Colonna Report Dettagliato */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {activeReport ? (
              <>
                {/* Checklist Action Items (Formato Interattivo Richiesto) */}
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

                {/* Dialogo e Feedback Coach (Markdown Style) */}
                <div className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-slate-200 mb-4">Analisi Dettagliata del Coach</h3>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                    {activeReport.coachMessage}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-[#131b26] border border-[#1f2b3d] p-12 rounded-2xl text-center text-xs text-slate-500">
                Nessun report generato finora. Clicca su "Genera Report Ora" per iniziare.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
