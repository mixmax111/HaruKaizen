'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import {
  downloadWorkoutTemplateCsv,
  downloadNutritionTemplateCsv,
  downloadMeasurementsTemplateCsv,
  WORKOUT_TEMPLATE,
  NUTRITION_TEMPLATE,
  MEASUREMENTS_TEMPLATE,
} from '../../lib/template-generator';
import {
  X,
  UploadCloud,
  DownloadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  ArrowRight,
  ShieldCheck,
  FileCode,
  Info,
  Copy,
  Check,
  Dumbbell,
} from 'lucide-react';

interface CsvPortabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTarget?: PortabilityTarget;
}

type TabMode = 'import' | 'export';
export type PortabilityTarget = 'MEASUREMENTS' | 'NUTRITION_LOGS' | 'WORKOUT_LOGS';
type DuplicateStrategy = 'SKIP' | 'OVERWRITE';

interface ImportSummary {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
  createdPlanId?: string;
  createdPlanName?: string;
}

export function CsvPortabilityModal({ isOpen, onClose, onSuccess, initialTarget }: CsvPortabilityModalProps) {
  const [tab, setTab] = useState<TabMode>('import');
  const [target, setTarget] = useState<PortabilityTarget>(initialTarget || 'MEASUREMENTS');
  const [strategy, setStrategy] = useState<DuplicateStrategy>('SKIP');

  useEffect(() => {
    if (initialTarget && isOpen) {
      setTarget(initialTarget);
    }
  }, [initialTarget, isOpen]);

  // Import State
  const [csvContent, setCsvContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Export State
  const [exportLoadingTarget, setExportLoadingTarget] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Client-side quick preview of CSV
  const handleCsvTextChange = (text: string, name?: string) => {
    setCsvContent(text);
    if (name) setFileName(name);
    setImportSummary(null);
    setImportError(null);

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
      setPreviewHeaders(headers);
      const rows = lines.slice(1, 6).map((l) =>
        l.split(',').map((c) => c.replace(/^"|"$/g, '').trim()),
      );
      setPreviewRows(rows);
    } else {
      setPreviewHeaders([]);
      setPreviewRows([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setImportSummary(null);
    setImportError(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      setPreviewHeaders(['File Excel (.xlsx)', 'Colonne e righe elaborate automaticamente dal server']);
      setPreviewRows([['Formato binario Excel supportato', 'Auto-split Serie x Ripetizioni attivo']]);
      setCsvContent('');
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleCsvTextChange(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleCopyErrorLog = () => {
    if (!importSummary || importSummary.errors.length === 0) return;
    const textToCopy = importSummary.errors
      .map((e) => `Riga ${e.row}: ${e.message}`)
      .join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExecuteImport = async () => {
    if (!selectedFile && !csvContent.trim()) {
      setImportError('Inserisci o carica un file CSV/XLSX prima di avviare l\'importazione.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSummary(null);

    try {
      let response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('target', target);
        formData.append('duplicateStrategy', strategy);
        formData.append('file', selectedFile);
        response = await apiClient.post('/portability/import-csv', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await apiClient.post('/portability/import-csv', {
          target,
          csvContent,
          duplicateStrategy: strategy,
        });
      }

      // API interceptor wraps or returns data
      const summary: ImportSummary = response.data?.data || response.data;
      setImportSummary(summary);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setImportError(err.response?.data?.message || err.message || 'Errore durante l\'importazione');
    } finally {
      setIsImporting(false);
    }
  };

  const handleTriggerExport = async (targetType: string, filenameFallback: string) => {
    setExportLoadingTarget(targetType);
    setExportMessage(null);

    try {
      const response = await apiClient.get(`/portability/export?target=${targetType}`, {
        responseType: 'blob',
      });

      const disposition = response.headers['content-disposition'];
      let filename = filenameFallback;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Trigger automatic browser download
      const contentType = typeof response.headers['content-type'] === 'string'
        ? response.headers['content-type']
        : 'application/octet-stream';
      const blob = new Blob([response.data], {
        type: contentType,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportMessage(`Download avviato con successo: ${filename}`);
      setTimeout(() => setExportMessage(null), 4000);
    } catch (err: any) {
      alert(`Errore esportazione: ${err.message || 'Impossibile completare il download'}`);
    } finally {
      setExportLoadingTarget(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-low border border-surface-container-highest rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-container-high bg-surface-container-lowest/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                Universal Data Portability Engine
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container font-mono text-outline">
                  RFC-4180 / Sovereign
                </span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                Importa ed esporta liberamente le tue metriche senza lock-in proprietario.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-surface-container-high bg-surface-container-lowest">
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'import'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Importa CSV (HaruKaizen / Strong / Hevy / MFP)
          </button>
          <button
            type="button"
            onClick={() => setTab('export')}
            className={`flex-1 py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'export'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            Esporta Dati Sovrani (CSV & Full JSON GDPR)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {tab === 'import' ? (
            <div className="space-y-5">
              {/* Target Selector */}
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-2">
                  1. Seleziona tipologia di dati
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'MEASUREMENTS', label: 'Biometrie & Peso' },
                    { id: 'NUTRITION_LOGS', label: 'Diario Nutrizionale' },
                    { id: 'WORKOUT_LOGS', label: 'Allenamenti (Strong/Hevy)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTarget(t.id as PortabilityTarget)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                        target === t.id
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-surface-container-high bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duplicate Strategy */}
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-2">
                  2. Strategia in caso di duplicati
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'SKIP'}
                      onChange={() => setStrategy('SKIP')}
                      className="accent-primary"
                    />
                    <span>Ignora duplicati (Conserva record esistenti)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      checked={strategy === 'OVERWRITE'}
                      onChange={() => setStrategy('OVERWRITE')}
                      className="accent-primary"
                    />
                    <span>Sovrascrivi con i nuovi dati</span>
                  </label>
                </div>
              </div>

              {/* Template Download Ribbon */}
              <div className="p-3 rounded-xl bg-surface-container border border-surface-container-high">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div>
                    <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      Template Standard HaruKaizen (.CSV con UTF-8 BOM)
                    </span>
                    <p className="text-[11px] text-on-surface-variant">
                      Scarica il formato pronto per Microsoft Excel, Google Fogli o Apple Numbers.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadWorkoutTemplateCsv}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        target === 'WORKOUT_LOGS'
                          ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                          : 'bg-surface-container-high border-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      Template Scheda Allenamento (.CSV)
                    </button>
                    <button
                      type="button"
                      onClick={downloadNutritionTemplateCsv}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        target === 'NUTRITION_LOGS'
                          ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                          : 'bg-surface-container-high border-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      Template Diario Nutrizione (.CSV)
                    </button>
                    {target === 'MEASUREMENTS' && (
                      <button
                        type="button"
                        onClick={downloadMeasurementsTemplateCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border bg-primary/20 border-primary text-primary hover:bg-primary/30"
                      >
                        <DownloadCloud className="w-3.5 h-3.5" />
                        Template Biometrie (.CSV)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Column Schema Helper Box */}
              <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
                    <Info className="w-4 h-4 text-secondary" />
                    <span>
                      {target === 'WORKOUT_LOGS' && 'Colonne Richieste — Scheda & Log Allenamento'}
                      {target === 'NUTRITION_LOGS' && 'Colonne Richieste — Diario Nutrizionale'}
                      {target === 'MEASUREMENTS' && 'Colonne Richieste — Biometrie & Misure Corporee'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-container text-outline">
                    Auto-Mapping Attivo
                  </span>
                </div>

                {target === 'WORKOUT_LOGS' && (
                  <>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {WORKOUT_TEMPLATE.headers.map((h) => (
                        <span
                          key={h}
                          className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px] font-mono border border-surface-container-highest"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-outline pt-1">
                      Compatibile con export Strong App e Hevy App. Supporta schemi compatti nella colonna serie/ripetizioni (es. &quot;4x10&quot; o &quot;3x8-12&quot;).
                    </p>
                  </>
                )}

                {target === 'NUTRITION_LOGS' && (
                  <>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {NUTRITION_TEMPLATE.headers.map((h) => (
                        <span
                          key={h}
                          className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px] font-mono border border-surface-container-highest"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-outline pt-1">
                      Valori pasto ammessi: <span className="font-mono text-on-surface-variant">COLAZIONE, PRANZO, CENA, SPUNTINO</span>. Compatibile con export MyFitnessPal.
                    </p>
                  </>
                )}

                {target === 'MEASUREMENTS' && (
                  <>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {MEASUREMENTS_TEMPLATE.headers.map((h) => (
                        <span
                          key={h}
                          className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px] font-mono border border-surface-container-highest"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-outline pt-1">
                      Campi obbligatori: <span className="font-mono text-on-surface-variant">Data, Peso</span>. Circonferenze corporee e % massa grassa sono opzionali.
                    </p>
                  </>
                )}
              </div>

              {/* File Upload / Paste */}
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-2">
                  3. Carica o incolla il file CSV o Excel (.xlsx)
                </label>

                <div className="border-2 border-dashed border-surface-container-highest rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-surface-container-lowest/50">
                  <input
                    type="file"
                    id="csv-file-input"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-primary" />
                    <span className="text-xs font-medium text-on-surface">
                      {fileName ? `File selezionato: ${fileName}` : 'Clicca per selezionare un file .csv o .xlsx dal computer'}
                    </span>
                    <span className="text-[11px] text-outline">
                      Compatibile con export Excel, Strong, Hevy, MyFitnessPal e HaruKaizen Standard
                    </span>
                  </label>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-outline">Oppure incolla il testo CSV qui:</span>
                    {csvContent && (
                      <button
                        type="button"
                        onClick={() => handleCsvTextChange('', undefined)}
                        className="text-[11px] text-error hover:underline"
                      >
                        Pulisci
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={csvContent}
                    onChange={(e) => handleCsvTextChange(e.target.value)}
                    placeholder="Date,Weight,BodyFat&#10;2026-10-20,75.5,14.2"
                    className="w-full bg-surface-container rounded-lg p-3 text-xs font-mono text-on-surface border border-surface-container-high focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* Preview Table */}
              {previewHeaders.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Anteprima Colonne Rilevate ({previewHeaders.length} colonne)</span>
                    <span className="text-[11px] text-primary font-normal">Auto-mapping attivo</span>
                  </label>
                  <div className="overflow-x-auto border border-surface-container-high rounded-lg max-h-40">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-surface-container text-on-surface-variant font-mono uppercase text-[10px]">
                        <tr>
                          {previewHeaders.map((h, i) => (
                            <th key={i} className="px-3 py-2 border-b border-surface-container-high whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high bg-surface-container-low font-mono">
                        {previewRows.map((r, ri) => (
                          <tr key={ri} className="hover:bg-surface-container/50">
                            {r.map((cell, ci) => (
                              <td key={ci} className="px-3 py-1.5 whitespace-nowrap text-on-surface">
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error feedback */}
              {importError && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success / Summary feedback */}
              {importSummary && (
                <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high space-y-2.5">
                  <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Importazione completata con successo</span>
                  </div>

                  {importSummary.createdPlanName && (
                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 text-on-surface text-xs flex items-center gap-2 animate-in fade-in">
                      <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        Nuova scheda creata:{' '}
                        <strong className="text-primary font-semibold">
                          &quot;{importSummary.createdPlanName}&quot;
                        </strong>{' '}
                        (Visibile e attivabile nella pagina Allenamenti)
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                    <div className="p-2 rounded bg-surface-container-low">
                      <span className="text-outline block text-[10px]">TOTALI</span>
                      <span className="text-on-surface font-bold text-sm">{importSummary.totalRows}</span>
                    </div>
                    <div className="p-2 rounded bg-primary/10">
                      <span className="text-primary block text-[10px]">IMPORTATI</span>
                      <span className="text-primary font-bold text-sm">{importSummary.importedCount}</span>
                    </div>
                    <div className="p-2 rounded bg-surface-container-low">
                      <span className="text-outline block text-[10px]">SALTATI</span>
                      <span className="text-outline font-bold text-sm">{importSummary.skippedCount}</span>
                    </div>
                  </div>

                  {importSummary.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-surface-container-high">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-error font-semibold block">
                          Righe con errori ({importSummary.errors.length}):
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyErrorLog}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-all border ${
                            isCopied
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                              : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface border-surface-container-highest'
                          }`}
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copiato!' : 'Copia Log'}</span>
                        </button>
                      </div>
                      <ul className="text-[10px] text-error/90 max-h-24 overflow-y-auto space-y-0.5 font-mono">
                        {importSummary.errors.map((e, idx) => (
                          <li key={idx}>
                            Riga {e.row}: {e.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || !csvContent.trim()}
                className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_16px_-2px_rgba(16,185,129,0.35)]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Elaborazione & Validazione Transazionale...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Esegui Importazione CSV</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-surface-container border border-surface-container-high flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                <p className="text-xs text-on-surface-variant">
                  Garanzia Sovrana HaruKaizen: I tuoi dati ti appartengono al 100%. Puoi scaricare i file sorgenti in CSV conformi RFC-4180 o uno snapshot JSON completo in qualunque momento.
                </p>
              </div>

              {exportMessage && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{exportMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Measurements CSV */}
                <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-on-surface font-semibold text-xs mb-1">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <span>Biometrie & Misure Corporee</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Serie storica peso, massa grassa, circonferenze vita, braccia e torace in formato CSV.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTriggerExport('MEASUREMENTS', 'harukaizen_measurements.csv')}
                    disabled={exportLoadingTarget !== null}
                    className="w-full py-1.5 px-3 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {exportLoadingTarget === 'MEASUREMENTS' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Scarica CSV Misure</span>
                  </button>
                </div>

                {/* 2. Nutrition CSV */}
                <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-on-surface font-semibold text-xs mb-1">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <span>Diario Nutrizionale & Pasti</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Tutti gli alimenti loggati, macro-nutrienti (proteine, carboidrati, grassi) e calorie consumate.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTriggerExport('NUTRITION_LOGS', 'harukaizen_nutrition.csv')}
                    disabled={exportLoadingTarget !== null}
                    className="w-full py-1.5 px-3 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {exportLoadingTarget === 'NUTRITION_LOGS' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Scarica CSV Nutrizione</span>
                  </button>
                </div>

                {/* 3. Workout Logs CSV */}
                <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-on-surface font-semibold text-xs mb-1">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <span>Allenamenti & Serie</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Cronologia workout, esercizi, serie effettuate (kg, reps, RPE, tipologia working/warmup).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTriggerExport('WORKOUT_LOGS', 'harukaizen_workouts.csv')}
                    disabled={exportLoadingTarget !== null}
                    className="w-full py-1.5 px-3 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {exportLoadingTarget === 'WORKOUT_LOGS' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>Scarica CSV Allenamenti</span>
                  </button>
                </div>

                {/* 4. Complete GDPR Snapshot JSON */}
                <div className="p-4 rounded-xl bg-surface-container border border-surface-container-high flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-on-surface font-semibold text-xs mb-1">
                      <FileCode className="w-4 h-4 text-secondary" />
                      <span>Backup Sovrano Completo (JSON)</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Snapshot completo GDPR-grade: profilo utente, preferenze LLM, documenti Semi-RAG, insight AI e tutti i log.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTriggerExport('ALL_JSON', 'harukaizen_sovereign_backup.json')}
                    disabled={exportLoadingTarget !== null}
                    className="w-full py-1.5 px-3 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {exportLoadingTarget === 'ALL_JSON' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>Scarica Backup Sovrano JSON</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
