'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import {
  Cpu,
  Key,
  Globe,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Server,
  Zap,
} from 'lucide-react';

interface SettingsData {
  preferredLlmProvider?: string;
  preferredLlmModel?: string;
  customLlmBaseUrl?: string;
  hasApiKey?: boolean;
}

const MODEL_PRESETS: Record<
  string,
  { fast: string; reasoning: string; vision: string }
> = {
  gemini: {
    fast: 'gemini-2.5-flash',
    reasoning: 'gemini-2.5-pro',
    vision: 'gemini-2.5-flash',
  },
  openai: {
    fast: 'gpt-4o-mini',
    reasoning: 'o3-mini',
    vision: 'gpt-4o',
  },
  anthropic: {
    fast: 'claude-3-5-haiku-20241022',
    reasoning: 'claude-3-7-sonnet-20250219',
    vision: 'claude-3-5-sonnet-20241022',
  },
  openrouter: {
    fast: 'google/gemini-2.5-flash',
    reasoning: 'deepseek/deepseek-r1',
    vision: 'anthropic/claude-3.5-sonnet',
  },
  local_custom: {
    fast: 'llama3.2:3b',
    reasoning: 'qwen2.5-coder:32b',
    vision: 'llava:13b',
  },
};

export function ByokModelCard() {
  const [provider, setProvider] = useState<string>('gemini');
  const [modelType, setModelType] = useState<'fast' | 'reasoning' | 'vision' | 'custom'>('fast');
  const [customModelId, setCustomModelId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [hasExistingKey, setHasExistingKey] = useState<boolean>(false);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      const data: SettingsData = res.data.data || res.data;
      if (data) {
        const prov = data.preferredLlmProvider || 'gemini';
        setProvider(prov);
        setHasExistingKey(Boolean(data.hasApiKey));
        setCustomBaseUrl(data.customLlmBaseUrl || '');

        const currentModel = data.preferredLlmModel || '';
        const presets = MODEL_PRESETS[prov] || MODEL_PRESETS.gemini;

        if (currentModel === presets.fast) setModelType('fast');
        else if (currentModel === presets.reasoning) setModelType('reasoning');
        else if (currentModel === presets.vision) setModelType('vision');
        else if (currentModel) {
          setModelType('custom');
          setCustomModelId(currentModel);
        } else {
          setModelType('fast');
        }
      }
    } catch (err: any) {
      console.warn('Impossibile caricare impostazioni AI:', err);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const presets = MODEL_PRESETS[newProvider] || MODEL_PRESETS.gemini;
    if (modelType !== 'custom') {
      // aggiorna con preset corrispondente
    }
    if (newProvider === 'local_custom' && !customBaseUrl) {
      setCustomBaseUrl('http://localhost:11434/v1');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      let finalModel = '';
      const presets = MODEL_PRESETS[provider] || MODEL_PRESETS.gemini;
      if (modelType === 'custom') {
        finalModel = customModelId.trim();
      } else {
        finalModel = presets[modelType];
      }

      const payload: Record<string, any> = {
        preferredLlmProvider: provider,
        preferredLlmModel: finalModel,
        customLlmBaseUrl: customBaseUrl.trim() || null,
      };

      if (apiKey.trim()) {
        payload.llmApiKey = apiKey.trim();
      }

      await apiClient.patch('/settings', payload);
      setFeedback({ type: 'success', message: 'Configurazione Sovereign AI salvata e criptata!' });
      if (apiKey.trim()) {
        setHasExistingKey(true);
        setApiKey('');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Errore durante il salvataggio delle impostazioni AI.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl flex flex-col gap-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Sovereign AI Engine (BYOK & Local LLM)
            </h3>
            <p className="text-[11px] text-slate-400">
              Scegli il tuo fornitore d'intelligenza artificiale, inserisci la tua chiave API o connettiti al tuo LLM locale
            </p>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Air-Gap Ready
        </span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fornitore LLM */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Globe size={14} className="text-slate-400" /> Fornitore / Provider
          </label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500 transition"
          >
            <option value="gemini">Google Gemini (Consigliato - Multimodale & Veloce)</option>
            <option value="openai">OpenAI (GPT-4o / o3-mini)</option>
            <option value="anthropic">Anthropic (Claude 3.5 / 3.7)</option>
            <option value="openrouter">OpenRouter (Aggregatore Multi-Model)</option>
            <option value="local_custom">100% Locale / Air-Gapped (Ollama / LM Studio / vLLM)</option>
          </select>
        </div>

        {/* Preset Modello Ibrido */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Zap size={14} className="text-slate-400" /> Profilo Modello
          </label>
          <div className="grid grid-cols-4 gap-1 bg-[#0b0f17] p-1 rounded-xl border border-[#1f2b3d]">
            <button
              type="button"
              onClick={() => setModelType('fast')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition ${
                modelType === 'fast'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Flash / Fast
            </button>
            <button
              type="button"
              onClick={() => setModelType('reasoning')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition ${
                modelType === 'reasoning'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reasoning
            </button>
            <button
              type="button"
              onClick={() => setModelType('vision')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition ${
                modelType === 'vision'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vision
            </button>
            <button
              type="button"
              onClick={() => setModelType('custom')}
              className={`py-2 text-[11px] font-semibold rounded-lg transition ${
                modelType === 'custom'
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom...
            </button>
          </div>
        </div>
      </div>

      {/* Input ID Modello Personalizzato (se custom) */}
      {modelType === 'custom' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Model Identifier personalizzato
          </label>
          <input
            type="text"
            placeholder="es. deepseek/deepseek-r1, llama3.3:70b, mistral-large-latest"
            value={customModelId}
            onChange={(e) => setCustomModelId(e.target.value)}
            className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500 transition"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chiave API Mascherata */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key size={14} className="text-slate-400" /> Chiave API (Crittografia AES-256-GCM)
            </span>
            {hasExistingKey && (
              <span className="text-[10px] text-emerald-400 font-medium">✓ Chiave presente nel DB</span>
            )}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={
                provider === 'local_custom'
                  ? 'Opzionale per server locali (es. non richiesta per Ollama)'
                  : hasExistingKey
                  ? '•••••••••••••••••••••••••••••• (già salvata, scrivi per aggiornare)'
                  : 'Incolla la tua chiave API...'
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 pr-10 focus:outline-none focus:border-pink-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Custom Base URL (per Ollama, LM Studio o reverse proxy) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Server size={14} className="text-slate-400" /> Base URL Personalizzato (OpenAI-compatible)
          </label>
          <input
            type="text"
            placeholder={
              provider === 'local_custom'
                ? 'http://localhost:11434/v1 (Ollama) o http://localhost:1234/v1'
                : 'Default endpoint ufficiale'
            }
            value={customBaseUrl}
            onChange={(e) => setCustomBaseUrl(e.target.value)}
            className="w-full bg-[#0b0f17] border border-[#1f2b3d] text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-pink-500 transition"
          />
        </div>
      </div>

      {/* Guida Local LLM Collapsible */}
      <div className="border border-[#1f2b3d] rounded-xl overflow-hidden bg-[#0b0f17]/50">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-slate-100 transition"
        >
          <span className="flex items-center gap-2">
            <HelpCircle size={16} className="text-pink-400" />
            Guida Setup 100% Offline & Locale (Ollama / LM Studio)
          </span>
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showGuide && (
          <div className="p-4 pt-1 text-xs text-slate-400 border-t border-[#1f2b3d] flex flex-col gap-3">
            <p>
              Per garantire sovranità totale e privacy assoluta sui dati sanitari, puoi eseguire un LLM sul tuo computer o server locale senza alcuna connessione internet:
            </p>
            <div className="bg-[#0b0f17] p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-pink-300 space-y-1">
              <p># 1. Avvia Ollama consentendo richieste da HaruKaizen:</p>
              <p className="text-slate-300">OLLAMA_ORIGINS="*" ollama run llama3.3:70b</p>
              <p className="text-slate-500 mt-2"># 2. In HaruKaizen imposta:</p>
              <p className="text-slate-300">Fornitore: 100% Locale / Air-Gapped</p>
              <p className="text-slate-300">Base URL: http://localhost:11434/v1 (oppure IP LAN: http://192.168.1.X:11434/v1)</p>
            </div>
            <p className="text-[11px] text-slate-500">
              * Nota: Con LM Studio, attiva il "Local Inference Server" su porta 1234 e imposta `http://localhost:1234/v1`.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-pink-500/20 transition disabled:opacity-50"
        >
          {saving ? 'Salvataggio in corso...' : 'Salva Configurazione AI'}
        </button>
      </div>
    </div>
  );
}

