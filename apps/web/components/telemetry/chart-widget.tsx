'use client';

import React, { useState } from 'react';

interface MetricStripItem {
  label: string;
  value: string;
  subtext: string;
  isPositive?: boolean;
}

interface ChartWidgetProps {
  title?: string;
  subtitle?: string;
  activeMetric?: string;
  activeRange?: string;
  summaryMetrics?: MetricStripItem[];
}

export function ChartWidget({
  title = 'Weight & Composition Convergence',
  subtitle = 'Longitudinal Trajectory',
  activeMetric = 'Weight (kg)',
  activeRange = '30D',
  summaryMetrics = [
    { label: 'Starting Mass', value: '78.2 kg', subtext: 'Sep 27, 2024' },
    { label: 'Period Nadir', value: '76.2 kg', subtext: '48h post-refeed' },
    { label: 'Net Mass Loss', value: '-1.80 kg', subtext: '-2.30% total body' },
    { label: 'Projected Goal', value: '74.5 kg', subtext: 'Nov 18 (~24 Days)' },
  ],
}: ChartWidgetProps) {
  const [selectedMetric, setSelectedMetric] = useState(activeMetric);
  const [selectedRange, setSelectedRange] = useState(activeRange);
  const [isHovering, setIsHovering] = useState(true);

  const metrics = ['Weight (kg)', 'Body Fat %', 'Lean Mass'];
  const ranges = ['7D', '30D', '90D', '1Y'];

  return (
    <div className="rounded-xl bg-surface-container-low p-space-lg flex flex-col gap-space-md shadow-sm">
      {/* Panel Sub-header with Metrics Toggle & Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex flex-col">
          <span className="font-label-caps text-label-caps uppercase text-outline">
            {subtitle}
          </span>
          <span className="font-headline-md text-headline-md text-on-surface font-semibold">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-space-xs flex-wrap">
          {/* Metric Dimension Pills */}
          <div className="flex bg-surface-container p-0.5 rounded">
            {metrics.map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => setSelectedMetric(metric)}
                className={`px-2.5 py-1 rounded font-label-data-sm text-label-data-sm transition-colors ${
                  selectedMetric === metric
                    ? 'bg-surface-container-highest text-on-surface'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {metric}
              </button>
            ))}
          </div>

          {/* Temporal Range Switcher */}
          <div className="flex bg-surface-container p-0.5 rounded">
            {ranges.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setSelectedRange(range)}
                className={`px-2 py-1 rounded font-label-data-sm text-label-data-sm transition-colors ${
                  selectedRange === range
                    ? 'bg-surface-container-highest text-primary font-semibold'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend Ribbon */}
      <div className="flex flex-wrap items-center gap-space-md font-label-data-sm text-label-data-sm text-outline">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(78,222,163,0.5)]"></span>
          Actual Weighed Mass
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-secondary rounded-full"></span>
          7-Day Exponential Moving Avg
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-outline-variant rounded-full"></span>
          Caloric Model Target (Linear)
        </span>
      </div>

      {/* High Precision SVG Chart Visualization Canvas */}
      <div
        className="relative w-full h-72 bg-surface-container-lowest rounded-lg p-space-sm flex flex-col justify-between overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
      >
        {/* Ambient Glow Flare */}
        <div className="absolute -top-12 left-1/3 w-64 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Y-Axis Ticks & Grid Background Lines */}
        <div className="absolute inset-x-space-sm top-space-sm bottom-8 flex flex-col justify-between pointer-events-none">
          <div className="flex items-center justify-between w-full">
            <span className="font-label-data-sm text-label-data-sm text-outline">78.5 kg</span>
            <div className="w-full ml-3 h-[1px] bg-surface-container-high opacity-40"></div>
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="font-label-data-sm text-label-data-sm text-outline">77.5 kg</span>
            <div className="w-full ml-3 h-[1px] bg-surface-container-high opacity-40"></div>
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="font-label-data-sm text-label-data-sm text-outline">76.5 kg</span>
            <div className="w-full ml-3 h-[1px] bg-surface-container-high opacity-40"></div>
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="font-label-data-sm text-label-data-sm text-outline">75.5 kg</span>
            <div className="w-full ml-3 h-[1px] bg-surface-container-high opacity-40"></div>
          </div>
        </div>

        {/* SVG Continuous Spline Chart Rendering */}
        <svg
          className="w-full h-full pt-2 pb-6 px-12 z-10"
          preserveAspectRatio="none"
          viewBox="0 0 700 210"
        >
          <defs>
            <linearGradient id="primaryAreaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25"></stop>
              <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0"></stop>
            </linearGradient>
          </defs>
          {/* Planned Deficit Target Line (Dashed) */}
          <line
            stroke="#3c4a42"
            strokeDasharray="4,4"
            strokeWidth="1.5"
            x1="10"
            x2="690"
            y1="40"
            y2="175"
          ></line>
          {/* Weight Shaded Area Gradient */}
          <polygon
            fill="url(#primaryAreaGrad)"
            points="10,48 55,56 110,64 165,72 220,84 275,80 330,96 385,110 440,118 495,124 550,138 605,142 660,154 690,158 690,205 10,205"
          ></polygon>
          {/* 7-day EMA Rolling Curve (Indigo) */}
          <path
            d="M 10 50 Q 150 70 330 98 T 690 156"
            fill="none"
            opacity="0.8"
            stroke="#c0c1ff"
            strokeWidth="2"
          ></path>
          {/* Daily Actual Measured Mass Path (Phosphor Emerald) */}
          <path
            d="M 10 48 L 55 56 L 110 64 L 165 72 L 220 84 L 275 80 L 330 96 L 385 110 L 440 118 L 495 124 L 550 138 L 605 142 L 660 154 L 690 158"
            fill="none"
            stroke="#4edea3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          ></path>
          {/* Data Point Anchors & Tooltip Marker Anchor */}
          <circle cx="275" cy="80" fill="#4edea3" r="3"></circle>
          <circle cx="440" cy="118" fill="#4edea3" r="3"></circle>
          <circle
            cx="660"
            cy="154"
            fill="#12131a"
            r="4"
            stroke="#4edea3"
            strokeWidth="2.5"
          ></circle>
          {/* Vertical Crosshair rule for inspection point */}
          <line
            opacity="0.5"
            stroke="#4edea3"
            strokeDasharray="2,2"
            strokeWidth="1"
            x1="660"
            x2="660"
            y1="10"
            y2="195"
          ></line>
        </svg>

        {/* Interactive Hover Tooltip Popover */}
        {isHovering && (
          <div className="absolute right-12 top-10 bg-surface-container-high/95 backdrop-blur-md rounded-lg p-space-xs shadow-xl z-20 flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-4 font-label-data-sm text-label-data-sm text-outline">
              <span>Oct 24 (Day 28)</span>
              <span className="text-primary font-semibold">Fast: 14h</span>
            </div>
            <div className="font-label-data-md text-label-data-md font-bold text-on-surface">
              76.4 kg{' '}
              <span className="font-normal text-body-sm text-outline">(-0.3 vs prev)</span>
            </div>
            <div className="font-label-caps text-label-caps uppercase text-outline">
              Delta vs Baseline:{' '}
              <span className="text-primary font-semibold">-1.8 kg</span>
            </div>
          </div>
        )}

        {/* X-Axis Timeline Markers */}
        <div className="flex justify-between items-center px-12 pt-1 font-label-data-sm text-label-data-sm text-outline z-10">
          <span>Sep 27</span>
          <span>Oct 04</span>
          <span>Oct 11</span>
          <span>Oct 18</span>
          <span className="text-primary font-semibold">Today (Oct 25)</span>
        </div>
      </div>

      {/* Telemetry Summary Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm pt-space-xs">
        {summaryMetrics.map((m, idx) => (
          <div key={idx} className="p-space-sm rounded bg-surface-container flex flex-col">
            <span className="font-label-caps text-label-caps uppercase text-outline">
              {m.label}
            </span>
            <span className="font-label-data-md text-label-data-md text-on-surface font-semibold">
              {m.value}
            </span>
            <span className="font-label-data-sm text-label-data-sm text-outline">
              {m.subtext}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

