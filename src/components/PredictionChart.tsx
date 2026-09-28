import { useMemo } from 'react';
import type { PricePoint, ForecastPoint } from '@/types';

interface PredictionChartProps {
  history: PricePoint[];
  forecast: ForecastPoint[];
  currentPrice: number;
  height?: number;
}

export function PredictionChart({ history, forecast, currentPrice, height = 320 }: PredictionChartProps) {
  const chartData = useMemo(() => {
    const w = 900;
    const h = height;
    const padding = { top: 20, right: 60, bottom: 35, left: 60 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const histCloses = history.map(p => p.close);
    const forecastPrices = forecast.map(f => f.price);
    const upperBand = forecast.map(f => f.upper);
    const lowerBand = forecast.map(f => f.lower);

    const allValues = [...histCloses, ...upperBand, ...lowerBand, ...forecastPrices];
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;

    const totalPoints = histCloses.length + forecast.length;
    const histX = histCloses.map((_, i) => padding.left + (i / (totalPoints - 1)) * chartW);
    const forecastX = forecast.map((_, i) =>
      padding.left + ((i + histCloses.length) / (totalPoints - 1)) * chartW
    );

    const toY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;

    const histPoints = histCloses.map((c, i) => ({ x: histX[i], y: toY(c) }));
    const forecastPoints = forecastPrices.map((c, i) => ({ x: forecastX[i], y: toY(c) }));
    const upperPoints = upperBand.map((c, i) => ({ x: forecastX[i], y: toY(c) }));
    const lowerPoints = lowerBand.map((c, i) => ({ x: forecastX[i], y: toY(c) }));

    const histPath = histPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const forecastPath = forecastPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

    const bandPath =
      upperPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
      ' L ' +
      lowerPoints.slice().reverse().map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ') +
      ' Z';

    // Connection from last hist point to first forecast point
    const connectionPath = `M ${histPoints[histPoints.length - 1].x.toFixed(2)} ${histPoints[histPoints.length - 1].y.toFixed(2)} L ${forecastPoints[0].x.toFixed(2)} ${forecastPoints[0].y.toFixed(2)}`;

    // Y-axis labels
    const yLabels = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = maxVal - t * range;
      const y = padding.top + t * chartH;
      return { val, y };
    });

    // X-axis labels (show a few)
    const xLabels: { x: number; label: string }[] = [];
    const labelIndices = [0, Math.floor(histCloses.length * 0.33), Math.floor(histCloses.length * 0.66), histCloses.length - 1, histCloses.length + Math.floor(forecast.length / 2), histCloses.length + forecast.length - 1];
    labelIndices.forEach((idx) => {
      if (idx < histCloses.length) {
        xLabels.push({ x: histX[idx], label: history[idx]?.date.slice(5) ?? '' });
      } else if (idx - histCloses.length < forecast.length) {
        xLabels.push({ x: forecastX[idx - histCloses.length], label: forecast[idx - histCloses.length]?.date.slice(5) ?? '' });
      }
    });

    return {
      histPath,
      forecastPath,
      bandPath,
      connectionPath,
      yLabels,
      xLabels,
      width: w,
      height: h,
      padding,
      chartW,
      histLastX: histX[histX.length - 1],
      forecastEndX: forecastX[forecastX.length - 1],
    };
  }, [history, forecast, height]);

  return (
    <svg viewBox={`0 0 ${chartData.width} ${chartData.height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Y-axis grid + labels */}
      {chartData.yLabels.map((yl, i) => (
        <g key={i}>
          <line
            x1={chartData.padding.left}
            y1={yl.y}
            x2={chartData.width - chartData.padding.right}
            y2={yl.y}
            stroke="#1e293b"
            strokeWidth={0.5}
            strokeDasharray="4 4"
          />
          <text x={5} y={yl.y + 4} fill="#64748b" fontSize={11} fontFamily="monospace">
            ${yl.val.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Confidence band */}
      <path d={chartData.bandPath} fill="url(#forecastGrad)" stroke="none" />

      {/* Historical price line */}
      <path d={chartData.histPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />

      {/* Connection dashed line */}
      <path d={chartData.connectionPath} fill="none" stroke="#64748b" strokeWidth={1.5} strokeDasharray="5 5" />

      {/* Forecast line */}
      <path d={chartData.forecastPath} fill="none" stroke="#10b981" strokeWidth={2.5} strokeDasharray="6 4" strokeLinejoin="round" />

      {/* Divider line between history and forecast */}
      <line
        x1={chartData.histLastX}
        y1={chartData.padding.top}
        x2={chartData.histLastX}
        y2={chartData.height - chartData.padding.bottom}
        stroke="#475569"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text x={chartData.histLastX + 5} y={chartData.padding.top + 15} fill="#94a3b8" fontSize={10}>
        Forecast →
      </text>

      {/* X-axis labels */}
      {chartData.xLabels.map((xl, i) => (
        <text key={i} x={xl.x} y={chartData.height - 8} fill="#64748b" fontSize={10} textAnchor="middle">
          {xl.label}
        </text>
      ))}

      {/* Legend */}
      <g transform={`translate(${chartData.width - chartData.padding.right - 130}, ${chartData.padding.top})`}>
        <rect x={0} y={0} width={125} height={52} fill="#0f172a" stroke="#1e293b" strokeWidth={1} rx={6} opacity={0.9} />
        <line x1={8} y1={14} x2={24} y2={14} stroke="#3b82f6" strokeWidth={2} />
        <text x={28} y={18} fill="#94a3b8" fontSize={10}>Historical</text>
        <line x1={8} y1={30} x2={24} y2={30} stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" />
        <text x={28} y={34} fill="#94a3b8" fontSize={10}>Forecast</text>
        <rect x={8} y={40} width={16} height={6} fill="url(#forecastGrad)" />
        <text x={28} y={46} fill="#94a3b8" fontSize={10}>Confidence band</text>
      </g>
    </svg>
  );
}
