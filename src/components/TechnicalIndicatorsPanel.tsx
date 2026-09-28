import type { TechnicalIndicators } from '../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface IndicatorRowProps {
  label: string;
  value: string | number;
  signal: 'bullish' | 'bearish' | 'neutral';
}

function IndicatorRow({ label, value, signal }: IndicatorRowProps) {
  const Icon = signal === 'bullish' ? TrendingUp : signal === 'bearish' ? TrendingDown : Minus;
  const color = signal === 'bullish' ? 'text-emerald-400' : signal === 'bearish' ? 'text-red-400' : 'text-slate-400';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono font-medium text-slate-200">{value}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
    </div>
  );
}

interface TechnicalIndicatorsPanelProps {
  indicators: TechnicalIndicators;
  currentPrice: number;
}

export function TechnicalIndicatorsPanel({ indicators, currentPrice }: TechnicalIndicatorsPanelProps) {
  const smaSignal = indicators.sma_20 > indicators.sma_50 ? 'bullish' : 'bearish';
  const macdSignal = indicators.macd_histogram > 0 ? 'bullish' : 'bearish';
  const rsiSignal = indicators.rsi < 30 ? 'bullish' : indicators.rsi > 70 ? 'bearish' : 'neutral';
  const bollingerSignal = currentPrice < indicators.bollinger_lower ? 'bullish' : currentPrice > indicators.bollinger_upper ? 'bearish' : 'neutral';
  const stochSignal = indicators.stochastic_k < 20 ? 'bullish' : indicators.stochastic_k > 80 ? 'bearish' : 'neutral';
  const momentumSignal = indicators.momentum > 0 ? 'bullish' : 'bearish';
  const rocSignal = indicators.roc > 0 ? 'bullish' : 'bearish';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Technical Indicators</h3>
      <div className="space-y-0">
        <IndicatorRow label="RSI (14)" value={indicators.rsi.toFixed(1)} signal={rsiSignal} />
        <IndicatorRow label="MACD" value={indicators.macd.toFixed(3)} signal={macdSignal} />
        <IndicatorRow label="MACD Signal" value={indicators.macd_signal.toFixed(3)} signal={macdSignal} />
        <IndicatorRow label="SMA 20" value={`$${indicators.sma_20.toFixed(2)}`} signal={smaSignal} />
        <IndicatorRow label="SMA 50" value={`$${indicators.sma_50.toFixed(2)}`} signal={smaSignal} />
        <IndicatorRow label="EMA 12" value={`$${indicators.ema_12.toFixed(2)}`} signal={indicators.ema_12 > indicators.ema_26 ? 'bullish' : 'bearish'} />
        <IndicatorRow label="Bollinger Upper" value={`$${indicators.bollinger_upper.toFixed(2)}`} signal={'neutral'} />
        <IndicatorRow label="Bollinger Lower" value={`$${indicators.bollinger_lower.toFixed(2)}`} signal={bollingerSignal} />
        <IndicatorRow label="Stochastic %K" value={indicators.stochastic_k.toFixed(1)} signal={stochSignal} />
        <IndicatorRow label="ATR (14)" value={indicators.atr.toFixed(2)} signal={'neutral'} />
        <IndicatorRow label="Momentum (10)" value={indicators.momentum.toFixed(2)} signal={momentumSignal} />
        <IndicatorRow label="ROC (12)" value={`${indicators.roc.toFixed(2)}%`} signal={rocSignal} />
      </div>
    </div>
  );
}
