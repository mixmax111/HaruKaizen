'use client';

import React, { useState } from 'react';
import { X, LayoutGrid, Plus, Trash2, Edit2, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface MealSlotsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealSlots: Array<{ id: string; name: string; slotOrder: number }>;
  onSuccess: () => void;
}

export function MealSlotsManagerModal({
  isOpen,
  onClose,
  mealSlots,
  onSuccess,
}: MealSlotsManagerModalProps) {
  const [newSlotName, setNewSlotName] = useState('');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<any | null>(null);
  const [reassignSlotId, setReassignSlotId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/nutrition/meal-slots', {
        name: newSlotName.trim(),
        slotOrder: mealSlots.length + 1,
      });
      setNewSlotName('');
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore creazione slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.put(`/nutrition/meal-slots/${id}`, {
        name: editName.trim(),
      });
      setEditingSlotId(null);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore aggiornamento slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.delete(`/nutrition/meal-slots/${deleteCandidate.id}`, {
        data: {
          reassignLogsToSlotId: reassignSlotId || undefined,
        },
      });
      setDeleteCandidate(null);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Errore eliminazione slot.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-[#131b26] border border-[#1f2b3d] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg">
              <LayoutGrid size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Gestione Slot Pasti</h3>
              <p className="text-[11px] text-slate-500">Personalizza i pasti della tua giornata (es. Colazione, Pre-Workout)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Lista degli slot correnti */}
        <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
          {mealSlots.map((slot) => (
            <div key={slot.id} className="p-3 flex items-center justify-between text-xs bg-[#0b0f17]/60">
              {editingSlotId === slot.id ? (
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-[#131b26] border border-[#1f2b3d] rounded-lg px-2 py-1 text-slate-200 text-xs"
                  />
                  <button
                    onClick={() => handleUpdate(slot.id)}
                    className="px-2 py-1 bg-pink-500 text-white rounded text-[11px] font-bold"
                  >
                    Salva
                  </button>
                  <button
                    onClick={() => setEditingSlotId(null)}
                    className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[11px]"
                  >
                    Annulla
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-slate-200">{slot.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingSlotId(slot.id);
                        setEditName(slot.name);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-200"
                    >
                      <Edit2 size={13} />
                    </button>
                    {mealSlots.length > 1 && (
                      <button
                        onClick={() => {
                          setDeleteCandidate(slot);
                          const other = mealSlots.find((s) => s.id !== slot.id);
                          setReassignSlotId(other?.id || '');
                        }}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Modale conferma eliminazione con riassegnazione */}
        {deleteCandidate && (
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2 text-xs">
            <span className="font-bold text-red-300">Eliminare lo slot "{deleteCandidate.name}"?</span>
            <p className="text-[11px] text-slate-400">
              Scegli dove riassegnare gli alimenti registrati in questo slot per non perderli:
            </p>
            <select
              value={reassignSlotId}
              onChange={(e) => setReassignSlotId(e.target.value)}
              className="w-full bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-1.5 text-xs text-slate-200"
            >
              {mealSlots
                .filter((s) => s.id !== deleteCandidate.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    Riassegna a: {s.name}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white font-bold text-xs"
              >
                Conferma Eliminazione
              </button>
            </div>
          </div>
        )}

        {/* Creazione nuovo slot */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="Nome nuovo slot (es. Pre-Nanna)..."
            value={newSlotName}
            onChange={(e) => setNewSlotName(e.target.value)}
            className="flex-1 bg-[#0b0f17] border border-[#1f2b3d] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newSlotName.trim()}
            className="px-3 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
          >
            <Plus size={14} /> Aggiungi
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

