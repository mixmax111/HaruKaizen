'use client';

import React, { useState } from 'react';

interface FastCaptureCardProps {
  onCommit?: (value: string) => void;
}

export function FastCaptureCard({ onCommit }: FastCaptureCardProps) {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onCommit?.(inputVal);
    setInputVal('');
  };

  return (
    <div className="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-xs shadow-sm">
      <span className="font-label-caps text-label-caps uppercase text-outline">
        Fast Capture
      </span>
      <form onSubmit={handleSubmit} className="flex items-center gap-space-xs">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="e.g. 76.2 kg or 500g Greek yogurt"
          className="w-full h-8 px-space-sm rounded bg-surface-container-lowest text-on-surface font-body-sm text-body-sm placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          className="h-8 px-3 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-data-sm text-label-data-sm flex-shrink-0 transition-colors"
        >
          Commit
        </button>
      </form>
    </div>
  );
}

