'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  icon: LucideIcon;
  iconColorClass?: string;
  value: string | number;
  valueUnit?: string;
  trendText?: string;
  trendIcon?: LucideIcon;
  trendColorClass?: string;
  subtitle?: string;
  circularGauge?: {
    percentage: number;
    strokeDasharray?: string;
  };
  progress?: {
    percentage: number;
    colorClass?: string;
  };
  statusBadge?: {
    text: string;
    icon?: LucideIcon;
    colorClass?: string;
    bgClass?: string;
  };
  footerLeft?: string | React.ReactNode;
  footerRight?: string | React.ReactNode;
}

export function StatCard({
  title,
  icon: Icon,
  iconColorClass = 'text-primary',
  value,
  valueUnit,
  trendText,
  trendIcon: TrendIcon,
  trendColorClass = 'text-primary',
  subtitle,
  circularGauge,
  progress,
  statusBadge,
  footerLeft,
  footerRight,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md flex flex-col justify-between shadow-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-label-caps uppercase text-outline">
          {title}
        </span>
        <Icon className={`text-body-lg w-5 h-5 ${iconColorClass}`} />
      </div>

      {/* Main Metric Value & Optional Gauge */}
      <div className="flex items-baseline justify-between pt-space-sm pb-space-xs">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-label-data-lg text-label-data-lg font-bold text-on-surface">
              {value}
            </span>
            {valueUnit && (
              <span className="text-body-sm font-body-sm font-normal text-outline">
                {valueUnit}
              </span>
            )}
            {subtitle && !valueUnit && (
              <span className="font-body-sm text-body-sm text-outline">
                {subtitle}
              </span>
            )}
          </div>

          {trendText && (
            <span className={`font-label-data-sm text-label-data-sm ${trendColorClass} flex items-center gap-1 mt-0.5`}>
              {TrendIcon && <TrendIcon className="text-body-sm w-3.5 h-3.5" />}
              {trendText}
            </span>
          )}

          {subtitle && valueUnit && (
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Circular Gauge if provided */}
        {circularGauge && (
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-container-highest"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-primary"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${circularGauge.percentage}, 100`}
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-label-data-sm text-label-data-sm font-semibold text-on-surface">
              {circularGauge.percentage}%
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar or Middle Badge */}
      {progress && (
        <div className="pt-space-xs">
          <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
            <div
              className={`${progress.colorClass || 'bg-primary'} h-full rounded-full`}
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Footer Info Row */}
      <div className="flex justify-between items-center mt-1.5 font-label-data-sm text-label-data-sm text-outline">
        <div>
          {statusBadge ? (
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${
                statusBadge.bgClass || 'bg-surface-container'
              } font-label-data-sm text-label-data-sm ${
                statusBadge.colorClass || 'text-primary'
              }`}
            >
              {statusBadge.icon && (
                <statusBadge.icon className="text-body-sm w-3.5 h-3.5" />
              )}
              <span>{statusBadge.text}</span>
            </div>
          ) : (
            footerLeft
          )}
        </div>
        <div>{footerRight}</div>
      </div>
    </div>
  );
}

