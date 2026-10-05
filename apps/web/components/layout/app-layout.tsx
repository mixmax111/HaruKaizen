import React from 'react';
import { Sidebar } from './sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto mb-16 md:mb-0 w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
