'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';
import { useAuth } from '../../lib/auth-context';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: string[];
  onQuickLog?: () => void;
}

export function AppLayout({
  children,
  breadcrumbs,
  onQuickLog,
}: AppLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span>[CARICAMENTO TELEMETRIA DI SISTEMA...]</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface font-body-md text-body-md selection:bg-primary selection:text-on-primary">
      {/* Fixed Telemetry Sidebar */}
      <Sidebar />

      {/* Main Content Area (offset by sidebar width 72 / 18rem) */}
      <div className="pl-72">
        <TopHeader breadcrumbs={breadcrumbs} onQuickLog={onQuickLog} />
        <main className="w-full pt-16 px-margin-desktop min-h-screen bg-surface-container-lowest">
          {children}
        </main>
      </div>
    </div>
  );
}

