'use client';

import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';

interface SmartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSave: (data: any) => Promise<void>;
}

export function SmartImportModal({ isOpen, onClose, title, onSave }: SmartModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Parsing rapido righe CSV
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const rows = lines.slice(1).map((line, idx) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          id: idx,
          day: parts[0] || 'Giorno A',
          exercise: parts[1] || 'Esercizio',
          sets: Number(parts[2]) || 3,
          reps: parts[3] || '8-12',
          weight: parts[4] || '50kg',
        };
      });
      setParsedData(rows);
      setStep(3); // Vai direttamente all'anteprima e modifica
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(parsedData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#131b26] border border-[#1f2b3d] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400">Importazione Guidata CSV / Scheda Smart</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="bg-pink-500/10 border border-pink-500/20 p-4 rounded-xl flex items-start gap-3">
                <FileText className="text-pink-400 shrink-0 mt-0.5" size={20} />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <p className="font-semibold text-pink-400 mb-1">Struttura richiesta per il file:</p>
                  <p>Il file CSV deve contenere le colonne: <span className="font-mono text-slate-100">Giorno, Esercizio, Serie, Ripetizioni, Carico</span>.</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-700 hover:border-pink-500/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-900/30 transition text-center cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud size={36} className="text-pink-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Trascina qui il file o clicca per caricare</p>
                  <p className="text-xs text-slate-500 mt-0.5">Formati supportati: CSV, TXT</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={16} />
                <span>File parsato con successo! Verifica o modifica i dati prima di salvare:</span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Giorno</th>
                      <th className="p-3">Esercizio</th>
                      <th className="p-3">Serie</th>
                      <th className="p-3">Reps</th>
                      <th className="p-3">Carico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {parsedData.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-slate-200">{row.day}</td>
                        <td className="p-3">{row.exercise}</td>
                        <td className="p-3">{row.sets}</td>
                        <td className="p-3">{row.reps}</td>
                        <td className="p-3">{row.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            Annulla
          </button>
          {step === 3 && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/20 transition disabled:opacity-50"
            >
              {isSaving ? 'Salvataggio...' : 'Conferma e Salva'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
