import React from 'react';
import { Sidebar } from './sidebar';
import { TopHeader } from './top-header';

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

