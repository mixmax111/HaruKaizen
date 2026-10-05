'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  Camera,
  Sparkles,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useTheme } from '../../lib/theme-context';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Allenamento', href: '/workouts', icon: Dumbbell },
    { label: 'Nutrizione', href: '/nutrition', icon: Apple },
    { label: 'Progressi', href: '/progress', icon: Camera },
    { label: 'Kaizen AI', href: '/insights', icon: Sparkles },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible from md:) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#1f2b3d] dark:border-[#1f2b3d] bg-[#131b26] p-5 justify-between h-screen sticky top-0">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <span className="text-2xl">🌸</span>
            <div>
              <h1 className="font-bold text-lg text-slate-100 tracking-wider">
                HaruKaizen
              </h1>
              <p className="text-xs text-pink-400 font-medium">Kaizen Daily Core</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-pink-400' : 'text-slate-400'} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer & Theme Toggle */}
        <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Cambia tema"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Modalità Salvia' : 'Modalità Scura'}</span>
            </button>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
              title="Disconnetti"
            >
              <LogOut size={16} />
            </button>
          </div>
          {user && (
            <div className="px-2">
              <p className="text-xs font-semibold text-slate-300 truncate">{user.email}</p>
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest">{user.role}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (visible below md:, hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#131b26] border-t border-[#1f2b3d] px-3 py-2 flex items-center justify-around backdrop-blur-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium ${
                isActive ? 'text-pink-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
