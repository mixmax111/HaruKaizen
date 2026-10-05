'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Terminal,
  ChevronsUpDown,
  Search,
  Activity,
  Dumbbell,
  Apple,
  Scale,
  Brain,
  Server,
  RefreshCw,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: Activity,
      badge: null,
    },
    {
      label: 'Workouts & Routine',
      href: '/workouts',
      icon: Dumbbell,
      badge: null,
    },
    {
      label: 'Nutrition & Macros',
      href: '/nutrition',
      icon: Apple,
      badge: null,
    },
    {
      label: 'Biometrics & Weight',
      href: '/progress',
      icon: Scale,
      badge: null,
    },
    {
      label: 'AI Coach & Insights',
      href: '/insights',
      icon: Brain,
      badge: { text: 'Beta', className: 'bg-secondary-container text-on-secondary-container' },
    },
    {
      label: 'Docker / System',
      href: '/system',
      icon: Server,
      badge: { text: 'Healthy', className: 'bg-primary-container text-on-primary-container' },
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col justify-between p-space-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-space-sm">
        {/* Node Brand Ribbon */}
        <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-headline-md text-headline-md font-bold">
            <Terminal className="text-primary w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-headline-md text-headline-md truncate text-on-surface font-semibold">
                HaruKaizen
              </span>
              <ChevronsUpDown className="text-outline text-body-sm w-4 h-4" />
            </div>
            <span className="font-label-data-sm text-label-data-sm text-outline truncate">
              Personal Cloud v2.4
            </span>
          </div>
        </div>

        {/* Localhost & Self-Hosted Pill */}
        <div className="flex items-center justify-between px-space-sm py-space-xs rounded bg-surface-container-lowest text-outline">
          <span className="font-label-data-sm text-label-data-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Localhost:8080
          </span>
          <span className="font-label-caps text-label-caps uppercase bg-surface-container px-1 rounded text-on-surface-variant">
            Self-Hosted
          </span>
        </div>

        {/* Quick Search Telemetry Input */}
        <button
          type="button"
          className="flex items-center justify-between w-full px-space-sm py-space-xs rounded bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="flex items-center gap-space-xs font-body-sm text-body-sm">
            <Search className="text-outline text-body-md w-4 h-4" />
            Search telemetry...
          </span>
          <kbd className="font-label-data-sm text-label-data-sm px-1.5 py-0.5 rounded bg-surface-container-high text-outline">
            ⌘K
          </kbd>
        </button>

        {/* Section Label */}
        <div className="pt-space-xs">
          <span className="font-label-caps text-label-caps uppercase text-outline px-space-sm">
            Core Telemetry
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-space-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-space-sm py-space-sm transition-colors rounded-lg ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  <Icon className={`text-body-lg w-5 h-5 ${isActive ? 'text-on-primary-container' : 'text-on-surface-variant'}`} />
                  <span className="font-body-md text-body-md">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`font-label-data-sm text-label-data-sm px-1.5 py-0.5 rounded ${item.badge.className}`}
                  >
                    {item.badge.text}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & User Card */}
      <div className="flex flex-col gap-space-md pt-space-sm">
        {/* SQLite Local DB Status */}
        <div className="p-space-sm rounded-lg bg-surface-container flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-outline">
              SQLite Local DB
            </span>
            <span className="font-label-data-sm text-label-data-sm text-on-surface-variant">
              42.8 MB
            </span>
          </div>
          <div className="w-full h-1 rounded-full bg-surface-container-high overflow-hidden">
            <div className="h-full bg-primary rounded-full w-[24%]"></div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-data-sm text-label-data-sm text-primary flex items-center gap-1">
              <RefreshCw className="text-body-sm w-3.5 h-3.5" />
              Synchronized
            </span>
            <span className="font-label-data-sm text-label-data-sm text-outline">
              WAL Enabled
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-label-data-md text-label-data-md text-primary font-bold">
                {user?.email ? user.email.slice(0, 2).toUpperCase() : 'HK'}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-primary"></span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-body-md text-body-md font-medium text-on-surface truncate">
                {user?.email?.split('@')[0] || 'Telemetry Root'}
              </span>
              <span className="font-label-caps text-label-caps text-outline uppercase truncate">
                {user?.role === 'ADMIN' ? 'Self-Hosted Root' : 'Self-Hosted Pro'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => logout()}
              title="Disconnetti"
              className="text-outline hover:text-red-400 transition-colors p-1"
            >
              <LogOut className="text-body-lg w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

