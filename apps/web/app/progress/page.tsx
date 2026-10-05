'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/app-layout';
import { apiClient } from '../../lib/api';
import { Camera, Calendar, Scale, Plus } from 'lucide-react';

export default function ProgressPage() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [bodyFat, setBodyFat] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProgress = async () => {
    const [mediaRes, measRes] = await Promise.all([
      apiClient.get('/media/progress'),
      apiClient.get('/measurements'),
    ]);
    setMediaList(mediaRes.data.data || []);
    setMeasurements(measRes.data.data || []);
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (weightKg) formData.append('weightKg', String(weightKg));
    if (bodyFat) formData.append('bodyFatPercentage', String(bodyFat));

    try {
      await apiClient.post('/media/progress/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSelectedFile(null);
      setWeightKg('');
      setBodyFat('');
      fetchProgress();
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Progressi Fisici & Foto <Camera size={22} className="text-pink-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visualizza la trasformazione corporea e aggiorna le tue misurazioni
          </p>
        </div>

        {/* Form Caricamento Nuova Foto + Misurazione Sincronizzata */}
        <form onSubmit={handleUpload} className="bg-[#131b26] border border-[#1f2b3d] p-6 rounded-2xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-200">Carica Foto Progresso con Misurazione</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Seleziona Immagine</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-pink-500/10 file:text-pink-400 hover:file:bg-pink-500/20 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Peso Corporeo (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value) || '')}
                placeholder="es. 78.5"
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Massa Grassa % (Opzionale)</label>
              <input
                type="number"
                step="0.1"
                value={bodyFat}
                onChange={(e) => setBodyFat(Number(e.target.value) || '')}
                placeholder="es. 14.5"
                className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="self-end px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-lg shadow-pink-500/20"
          >
            {uploading ? 'Caricamento in corso...' : 'Carica e Sincronizza'}
          </button>
        </form>

        {/* Gallery Foto */}
        <div>
          <h3 className="text-sm font-bold text-slate-200 mb-3">Galleria Trasformazione</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mediaList.map((media) => (
              <div key={media.id} className="bg-[#131b26] border border-[#1f2b3d] rounded-2xl overflow-hidden group">
                <div className="aspect-[3/4] bg-slate-900 relative">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/media/file/${media.id}`}
                    alt="Progresso"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-3 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> {new Date(media.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
