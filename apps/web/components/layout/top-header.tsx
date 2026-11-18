'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ChevronDown,
  Plus,
  Bell,
  Dumbbell,
  Utensils,
  Scale,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { ProfileSettingsModal } from '../profile/ProfileSettingsModal';
import { AdvancedFastCaptureModal } from '../nutrition/AdvancedFastCaptureModal';

interface TopHeaderProps {
  breadcrumbs?: string[];
  onQuickLog?: () => void;
  onOpenProfile?: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  unread: boolean;
}

export function TopHeader({
  breadcrumbs = ['HaruKaizen', 'Telemetry', 'Dashboard'],
  onQuickLog,
  onOpenProfile,
}: TopHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [isQuickLogMenuOpen, setIsQuickLogMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFastCaptureModalOpen, setIsFastCaptureModalOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'PostgreSQL 17 Sincronizzato',
      description: 'Telemetria e WAL acidi sincronizzati con successo.',
      timestamp: '10 min fa',
      unread: true,
    },
    {
      id: 'notif-2',
      title: 'Microciclo Aggiornato',
      description: 'Progressive overload calcolato per la sessione live.',
      timestamp: '1 ora fa',
      unread: true,
    },
  ]);

  const quickLogRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        quickLogRef.current &&
        !quickLogRef.current.contains(event.target as Node)
      ) {
        setIsQuickLogMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleOpenProfile = () => {
    if (onOpenProfile) {
      onOpenProfile();
    } else {
      setIsProfileModalOpen(true);
    }
  };

  const handleStartWorkout = () => {
    setIsQuickLogMenuOpen(false);
    router.push('/workouts/live');
  };

  const handleLogMeal = () => {
    setIsQuickLogMenuOpen(false);
    setIsFastCaptureModalOpen(true);
  };

  const handleLogWeight = () => {
    setIsQuickLogMenuOpen(false);
    setIsProfileModalOpen(true);
  };

  const hasUnread = notifications.some((n) => n.unread);

  return (
    <>
      <header className="fixed top-0 left-72 right-0 h-16 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-margin-desktop border-b border-surface-container-high/40">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-space-sm font-label-data-sm text-label-data-sm text-outline">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb}>
                {idx > 0 && <span>/</span>}
                <span
                  className={
                    isLast
                      ? 'text-primary font-medium'
                      : idx === 0
                      ? 'text-on-surface font-semibold'
                      : ''
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {/* Control Actions & Diagnostics */}
        <div className="flex items-center gap-space-md">
          {/* Date Range Selector */}
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded bg-surface-container font-label-data-sm text-label-data-sm text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors">
            <Calendar className="text-body-md text-outline w-4 h-4" />
            <span>Last 30 Days</span>
            <ChevronDown className="text-body-sm text-outline w-3.5 h-3.5" />
          </div>

          {/* Quick Log Action Dropdown */}
          <div className="relative" ref={quickLogRef}>
            <button
              type="button"
              onClick={() => {
                if (onQuickLog) {
                  onQuickLog();
                } else {
                  setIsQuickLogMenuOpen(!isQuickLogMenuOpen);
                }
              }}
              className="flex items-center gap-1.5 px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-medium shadow-[0_0_16px_-2px_rgba(16,185,129,0.25)] hover:bg-primary transition-colors cursor-pointer"
            >
              <Plus className="text-body-md w-4 h-4" />
              <span>Quick Log</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </button>

            {/* Quick Log Menu Popover */}
            {isQuickLogMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-low border border-surface-container-high rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-outline border-b border-surface-container-high/50">
                  Registrazione Rapida
                </div>
                <button
                  type="button"
                  onClick={handleStartWorkout}
                  className="w-full px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                    <Dumbbell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-on-surface">Log Workout</div>
                    <div className="text-[10px] text-outline">Apri Live Gym Logger</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleLogMeal}
                  className="w-full px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-on-surface">Log Meal</div>
                    <div className="text-[10px] text-outline">Fast Capture & Ricette</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleLogWeight}
                  className="w-full px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-tertiary/10 text-tertiary">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-on-surface">Log Weight</div>
                    <div className="text-[10px] text-outline">Aggiorna peso & profilo</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Alerts & Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              aria-label="Notifiche"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-space-xs rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              <Bell className="text-body-lg w-5 h-5" />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              )}
            </button>

            {/* Notifications Menu Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-container-low border border-surface-container-high rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-4 py-2 border-b border-surface-container-high/50">
                  <span className="text-xs font-semibold text-on-surface">
                    Notifiche di Sistema
                  </span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearNotifications}
                      className="text-[11px] text-outline hover:text-error flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Pulisci notifiche</span>
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <CheckCircle className="w-6 h-6 text-outline mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-on-surface-variant font-medium">
                        Nessuna notifica
                      </p>
                      <p className="text-[10px] text-outline mt-0.5">
                        Tutti i sistemi sono operativi e sincronizzati.
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3 hover:bg-surface-container/60 transition-colors border-b border-surface-container-high/30 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-on-surface">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-outline shrink-0">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Mini Avatar (Clickable to Profile Modal) */}
          <button
            type="button"
            onClick={handleOpenProfile}
            title={user?.email ? `Profilo: ${user.email}` : 'Profilo Utente'}
            className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/50 hover:border-primary flex items-center justify-center font-label-data-sm font-bold text-primary transition-all cursor-pointer hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          >
            {user?.email ? user.email.slice(0, 2).toUpperCase() : 'HK'}
          </button>
        </div>
      </header>

      {/* Global Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Global Advanced Fast Capture Modal */}
      <AdvancedFastCaptureModal
        isOpen={isFastCaptureModalOpen}
        onClose={() => setIsFastCaptureModalOpen(false)}
      />
    </>
  );
}
