'use client';

import React, { useState } from 'react';
import { Scale, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import type { BodyMeasurement } from '../../lib/queries/telemetry';

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
  measurements?: BodyMeasurement[];
  onLogWeight?: () => void;
  summaryMetrics?: MetricStripItem[];
}

export function ChartWidget({
  title = 'Weight & Composition Convergence',
  subtitle = 'Longitudinal Trajectory',
  activeMetric = 'Weight (kg)',
  activeRange = '30D',
  measurements = [],
  onLogWeight,
  summaryMetrics,
}: ChartWidgetProps) {
  const [selectedMetric, setSelectedMetric] = useState(activeMetric);
  const [selectedRange, setSelectedRange] = useState(activeRange);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const metrics = ['Weight (kg)', 'Body Fat %'];
  const ranges = ['7D', '30D', '90D', '1Y'];

  // Ordina i dati cronologicamente (dal più vecchio al più recente per l'asse X)
  const sortedData = [...measurements]
    .filter((m) => m && m.weightKg > 0)
    .sort((a, b) => {
      const dateA = new Date(a.recordedAt || a.date || 0).getTime();
      const dateB = new Date(b.recordedAt || b.date || 0).getTime();
      return dateA - dateB;
    });

  const hasEnoughData = sortedData.length >= 2;

  // Calcola metriche di riepilogo dinamiche se ci sono dati reali
  let computedSummary: MetricStripItem[] = summaryMetrics || [];
  if (hasEnoughData && (!summaryMetrics || summaryMetrics.length === 0)) {
    const starting = sortedData[0];
    const latest = sortedData[sortedData.length - 1];
    const weights = sortedData.map((d) => Number(d.weightKg));
    const minWeight = Math.min(...weights);
    const netLoss = (latest.weightKg - starting.weightKg).toFixed(2);
    const startDate = new Date(starting.recordedAt || starting.date || '').toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    });
    const latestDate = new Date(latest.recordedAt || latest.date || '').toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    });

    computedSummary = [
      {
        label: 'Starting Mass',
        value: `${starting.weightKg.toFixed(1)} kg`,
        subtext: startDate,
      },
      {
        label: 'Period Nadir',
        value: `${minWeight.toFixed(1)} kg`,
        subtext: 'Minimo registrato',
      },
      {
        label: 'Net Mass Loss',
        value: `${Number(netLoss) <= 0 ? '' : '+'}${netLoss} kg`,
        subtext: 'Delta totale',
      },
      {
        label: 'Current Mass',
        value: `${latest.weightKg.toFixed(1)} kg`,
        subtext: latestDate,
      },
    ];
  }

  // Dimensioni SVG per il canvas reattivo
  const svgWidth = 700;
  const svgHeight = 210;
  const paddingX = 40;
  const paddingY = 25;

  // Calcolo scala Y
  const isWeightMetric = selectedMetric === 'Weight (kg)';
  const values = sortedData.map((d) =>
    isWeightMetric ? Number(d.weightKg) : Number(d.bodyFatPercentage || 15),
  );

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const buffer = rawMax === rawMin ? 2 : (rawMax - rawMin) * 0.15;
  const minY = Math.floor(rawMin - buffer);
  const maxY = Math.ceil(rawMax + buffer);
  const rangeY = maxY - minY || 1;

  // Coordinate SVG dei punti
  const points = sortedData.map((d, idx) => {
    const val = isWeightMetric ? Number(d.weightKg) : Number(d.bodyFatPercentage || 15);
    const x = paddingX + (idx / (sortedData.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - ((val - minY) / rangeY) * (svgHeight - paddingY * 2);
    return { x, y, data: d, val };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const polygonPoints = `10,${svgHeight} ${polylinePoints} ${svgWidth - 10},${svgHeight}`;

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];

  return (
    <div className="rounded-xl bg-surface-container-low p-space-lg flex flex-col gap-space-md shadow-sm border border-outline-variant/20">
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

      {/* Se non ci sono almeno 2 punti, mostra Empty State accogliente */}
      {!hasEnoughData ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-lg bg-surface-container-lowest border border-dashed border-outline-variant/30">
          <Scale className="w-10 h-10 text-primary/40 mb-3" />
          <h4 className="text-sm font-semibold text-on-surface mb-1 font-sans">
            Nessuna misurazione registrata
          </h4>
          <p className="text-xs text-outline max-w-sm mb-4 font-sans leading-relaxed">
            Aggiungi il tuo peso corporeo per iniziare a visualizzare il grafico di convergenza e la traiettoria nel tempo.
          </p>
          {onLogWeight && (
            <button
              type="button"
              onClick={onLogWeight}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-black font-semibold text-xs font-sans transition active:scale-95 shadow-md shadow-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registra Peso Ora</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Legend Ribbon */}
          <div className="flex flex-wrap items-center gap-space-md font-label-data-sm text-label-data-sm text-outline">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-primary rounded-full shadow-[0_0_8px_rgba(78,222,163,0.5)]"></span>
              {selectedMetric === 'Weight (kg)' ? 'Massa Corporea Misurata (kg)' : 'Percentuale Grasso (%)'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-secondary rounded-full"></span>
              Punti di Rilevamento Telemetrici
            </span>
          </div>

          {/* High Precision SVG Chart Canvas */}
          <div className="relative w-full h-72 bg-surface-container-lowest rounded-lg p-space-sm flex flex-col justify-between overflow-hidden">
            {/* Ambient Glow Flare */}
            <div className="absolute -top-12 left-1/3 w-64 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Y-Axis Grid Lines */}
            <div className="absolute inset-x-space-sm top-space-sm bottom-8 flex flex-col justify-between pointer-events-none">
              <div className="flex items-center justify-between w-full">
                <span className="font-label-data-sm text-label-data-sm text-outline font-mono">
                  {maxY.toFixed(1)} {isWeightMetric ? 'kg' : '%'}
                </span>
                <div className="w-full ml-3 h-[1px] bg-surface-container-high opacity-40"></div>
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="font-label-data-sm text-label-data-sm text-outline font-mono">
                  {((maxY + minY) / 2).toFixed(1)} {isWeightMetric ? 'kg' : '%'}
                </span>
                <div className="w-full ml-3 h-[1px] bg-surface-container-high opacity-40"></div>
              </div>
              <div className="flex items-center justify-between w-full">
                <span className="font-label-data-sm text-label-data-sm text-outline font-mono">
                  {minY.toFixed(1)} {isWeightMetric ? 'kg' : '%'}
                </span>
                <div className="w-full ml-3 h-[1px] bg-surface-container-high opacity-40"></div>
              </div>
            </div>

            {/* SVG Spline */}
            <svg
              className="w-full h-full pt-2 pb-6 px-4 z-10"
              preserveAspectRatio="none"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            >
              <defs>
                <linearGradient id="primaryAreaGradLive" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25"></stop>
                  <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>

              {/* Shaded Area */}
              <polygon fill="url(#primaryAreaGradLive)" points={polygonPoints} />

              {/* Continuous Line */}
              <polyline
                fill="none"
                stroke="#4edea3"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {/* Data Points */}
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={hoverIndex === idx ? 5 : 3.5}
                  fill={hoverIndex === idx ? '#4edea3' : '#12131a'}
                  stroke="#4edea3"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              ))}

              {/* Active Inspection Crosshair */}
              {activePoint && (
                <line
                  opacity="0.5"
                  stroke="#4edea3"
                  strokeDasharray="2,2"
                  strokeWidth="1"
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1="10"
                  y2={svgHeight - 15}
                />
              )}
            </svg>

            {/* Hover Tooltip Popover */}
            {activePoint && (
              <div className="absolute right-6 top-6 bg-surface-container-high/95 backdrop-blur-md rounded-lg p-2.5 shadow-xl z-20 flex flex-col gap-0.5 border border-outline-variant/30 font-mono">
                <div className="flex items-center justify-between gap-4 text-[11px] text-outline">
                  <span>
                    {new Date(activePoint.data.recordedAt || activePoint.data.date || '').toLocaleDateString(
                      'it-IT',
                      { day: 'numeric', month: 'short', year: 'numeric' },
                    )}
                  </span>
                  <span className="text-primary font-semibold">Live Telemetry</span>
                </div>
                <div className="text-xs font-bold text-on-surface">
                  {activePoint.val.toFixed(1)} {isWeightMetric ? 'kg' : '%'}
                </div>
              </div>
            )}

            {/* X-Axis Timeline Markers */}
            <div className="flex justify-between items-center px-6 pt-1 font-label-data-sm text-label-data-sm text-outline z-10 font-mono">
              <span>
                {new Date(sortedData[0].recordedAt || sortedData[0].date || '').toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span>
                {new Date(
                  sortedData[Math.floor(sortedData.length / 2)].recordedAt ||
                    sortedData[Math.floor(sortedData.length / 2)].date ||
                    '',
                ).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              </span>
              <span className="text-primary font-semibold">
                {new Date(
                  sortedData[sortedData.length - 1].recordedAt ||
                    sortedData[sortedData.length - 1].date ||
                    '',
                ).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>

          {/* Telemetry Summary Metric Strip */}
          {computedSummary.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm pt-space-xs">
              {computedSummary.map((m, idx) => (
                <div key={idx} className="p-space-sm rounded bg-surface-container flex flex-col">
                  <span className="font-label-caps text-label-caps uppercase text-outline">
                    {m.label}
                  </span>
                  <span className="font-label-data-md text-label-data-md text-on-surface font-semibold font-mono">
                    {m.value}
                  </span>
                  <span className="font-label-data-sm text-label-data-sm text-outline">
                    {m.subtext}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
