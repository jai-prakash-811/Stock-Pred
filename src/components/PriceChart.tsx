import { useMemo } from 'react';

interface PriceChartProps {
  data: { date: string; close: number }[];
  height?: number;
  color?: string;
  showAxis?: boolean;
  showGradient?: boolean;
}

export function PriceChart({
  data,
  height = 200,
  color = '#10b981',
  showAxis = true,
  showGradient = true,
}: PriceChartProps) {
  const { path, areaPath, min, max, points, width } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', min: 0, max: 0, points: [], width: 800 };
    const w = 800;
    const h = height;
    const padding = { top: 10, right: 10, bottom: showAxis ? 25 : 10, left: showAxis ? 50 : 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const closes = data.map(d => d.close);
    const minVal = Math.min(...closes);
    const maxVal = Math.max(...closes);
    const range = maxVal - minVal || 1;

    const pts = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW;
      const y = padding.top + chartH - ((d.close - minVal) / range) * chartH;
      return { x, y, date: d.date, close: d.close };
    });

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const areaP = `${linePath} L ${pts[pts.length - 1].x.toFixed(2)} ${padding.top + chartH} L ${pts[0].x.toFixed(2)} ${padding.top + chartH} Z`;

    return { path: linePath, areaPath: areaP, min: minVal, max: maxVal, points: pts, width: w };
  }, [data, height, showAxis]);

  if (data.length === 0) {
    return <div style={{ height }} className="flex items-center justify-center text-slate-500 text-sm">No data</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {showAxis && (
        <>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = 10 + t * (height - 35);
            const val = max - t * (max - min);
            return (
              <g key={t}>
                <line x1={50} y1={y} x2={width - 10} y2={y} stroke="#1e293b" strokeWidth={0.5} strokeDasharray="4 4" />
                <text x={5} y={y + 4} fill="#64748b" fontSize={11} fontFamily="monospace">
                  ${val.toFixed(2)}
                </text>
              </g>
            );
          })}
        </>
      )}
      {showGradient && <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {showAxis && points.length > 0 && (
        <>
          <text x={points[0].x} y={height - 5} fill="#64748b" fontSize={10} textAnchor="start">
            {data[0].date.slice(5)}
          </text>
          <text x={points[points.length - 1].x} y={height - 5} fill="#64748b" fontSize={10} textAnchor="end">
            {data[data.length - 1].date.slice(5)}
          </text>
        </>
      )}
    </svg>
  );
}
