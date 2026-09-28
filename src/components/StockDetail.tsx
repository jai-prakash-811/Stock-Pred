import { useEffect, useMemo, useState } from 'react';
import type { Stock, PredictionRecord } from '../types';
import { runPrediction, getPredictionSignals } from '../lib/prediction';
import { supabase } from '../lib/supabase';
import { PredictionChart } from './PredictionChart';
import { PriceChart } from './PriceChart';
import { TechnicalIndicatorsPanel } from './TechnicalIndicatorsPanel';
import { ArrowLeft, TrendingUp, TrendingDown, Star, Brain, Clock, Activity, Zap } from 'lucide-react';

interface StockDetailProps {
  stock: Stock;
  onBack: () => void;
  isWatched: boolean;
  onToggleWatch: () => void;
}

export function StockDetail({ stock, onBack, isWatched, onToggleWatch }: StockDetailProps) {
  const [horizon, setHorizon] = useState(7);
  const [prediction, setPrediction] = useState<ReturnType<typeof runPrediction> | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [history, setHistory] = useState<PredictionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const signals = useMemo(
    () => prediction ? getPredictionSignals(prediction.indicators) : [],
    [prediction]
  );

  const loadHistory = async () => {
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('symbol', stock.symbol)
      .order('created_at', { ascending: false })
      .limit(10);
    setHistory((data ?? []) as PredictionRecord[]);
    setLoadingHistory(false);
  };

  // Load history when the selected stock changes.
  useEffect(() => {
    loadHistory();
  }, [stock.symbol]);

  const handlePredict = async () => {
    setPredicting(true);
    // Simulate computation time for UX
    await new Promise(r => setTimeout(r, 600));
    const result = runPrediction(stock.symbol, stock.price_history, horizon);
    setPrediction(result);
    setPredicting(false);

    // Persist to Supabase
    await supabase.from('predictions').insert({
      symbol: stock.symbol,
      predicted_price: result.predicted_price,
      predicted_change_pct: result.predicted_change_pct,
      direction: result.direction,
      confidence: result.confidence,
      method: result.method,
      horizon_days: result.horizon_days,
      indicators: result.indicators,
    });
    loadHistory();
  };

  const isPositive = stock.price_change >= 0;
  const histData = stock.price_history.map(p => ({ date: p.date, close: p.close }));
  const sparkData = stock.price_history.slice(-30).map(p => p.close);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <button
            onClick={onToggleWatch}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isWatched
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            <Star className={`w-4 h-4 ${isWatched ? 'fill-amber-400' : ''}`} />
            {isWatched ? 'Watching' : 'Add to Watchlist'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stock header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{stock.symbol}</h1>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              }`}>
                {stock.sector}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">{stock.name}</p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold font-mono text-white">
              ${stock.current_price.toFixed(2)}
            </span>
            <div className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="font-mono font-semibold">
                {isPositive ? '+' : ''}{stock.price_change.toFixed(2)} ({isPositive ? '+' : ''}{stock.price_change_pct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Market Cap', value: `$${stock.market_cap.toFixed(0)}B` },
            { label: 'P/E Ratio', value: stock.pe_ratio?.toFixed(1) ?? '—' },
            { label: 'Dividend Yield', value: `${stock.dividend_yield?.toFixed(2)}%` },
            { label: 'Beta', value: stock.beta?.toFixed(2) ?? '—' },
            { label: 'Volume', value: `${(stock.volume / 1e6).toFixed(1)}M` },
            { label: 'Day Range', value: stock.price_history.length > 0 ? `$${stock.price_history[stock.price_history.length - 1].low.toFixed(2)} - $${stock.price_history[stock.price_history.length - 1].high.toFixed(2)}` : '—' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-sm font-mono font-medium text-slate-200 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Price history chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">90-Day Price History</h2>
          </div>
          <PriceChart data={histData} color="#3b82f6" height={280} />
        </div>

        {/* Prediction panel */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">AI Price Prediction</h2>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400">Forecast horizon:</label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
              <button
                onClick={handlePredict}
                disabled={predicting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-4 h-4" />
                {predicting ? 'Analyzing...' : 'Run Prediction'}
              </button>
            </div>
          </div>

          {predicting && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              </div>
              <p className="text-slate-400 text-sm">Running ensemble model with technical indicators...</p>
            </div>
          )}

          {!predicting && prediction && (
            <div className="space-y-6">
              {/* Prediction result cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`rounded-xl p-5 border ${
                  prediction.direction === 'bullish'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {prediction.direction === 'bullish' ? (
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Direction</span>
                  </div>
                  <p className={`text-2xl font-bold capitalize ${
                    prediction.direction === 'bullish' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {prediction.direction}
                  </p>
                </div>

                <div className="rounded-xl p-5 border bg-slate-800/50 border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Predicted Price</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">
                    ${prediction.predicted_price.toFixed(2)}
                  </p>
                  <p className={`text-sm font-mono mt-1 ${
                    prediction.predicted_change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {prediction.predicted_change_pct >= 0 ? '+' : ''}{prediction.predicted_change_pct.toFixed(2)}% in {prediction.horizon_days}d
                  </p>
                </div>

                <div className="rounded-xl p-5 border bg-slate-800/50 border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confidence</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold font-mono text-white">{prediction.confidence}%</p>
                  </div>
                  <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        prediction.confidence >= 70 ? 'bg-emerald-500' : prediction.confidence >= 50 ? 'bg-amber-500' : 'bg-slate-500'
                      }`}
                      style={{ width: `${prediction.confidence}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Prediction chart */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
                  Price Forecast — Next {prediction.horizon_days} Days
                </h3>
                <PredictionChart
                  history={stock.price_history.slice(-60)}
                  forecast={prediction.forecast}
                  currentPrice={stock.current_price}
                  height={340}
                />
              </div>

              {/* Signal analysis + Method */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Signal Analysis</h3>
                  <div className="space-y-2.5">
                    {signals.map((sig, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          sig.includes('bullish') || sig.includes('oversold') || sig.includes('Golden') || sig.includes('Positive')
                            ? 'bg-emerald-400'
                            : sig.includes('bearish') || sig.includes('overbought') || sig.includes('Death') || sig.includes('Negative')
                            ? 'bg-red-400'
                            : 'bg-slate-400'
                        }`} />
                        <span className="text-sm text-slate-300">{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Prediction Method</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    {prediction.method}
                  </p>
                  <div className="space-y-2 text-xs text-slate-500">
                    <p>• <span className="text-slate-400">Linear Regression</span> — fits a trend line to the last 30 closing prices and projects forward.</p>
                    <p>• <span className="text-slate-400">Weighted Moving Average</span> — gives more weight to recent prices for short-term momentum.</p>
                    <p>• <span className="text-slate-400">Ensemble blend</span> — averages both models, with 95% confidence bands from recent volatility.</p>
                    <p>• <span className="text-slate-400">Technical signals</span> — RSI, MACD, SMA crossovers, Bollinger Bands, Stochastic, and momentum adjust the final confidence score.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!predicting && !prediction && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-slate-400 text-sm max-w-md">
                Run a prediction to generate a {horizon}-day price forecast using an ensemble of linear regression and weighted moving average models, combined with 12 technical indicators.
              </p>
            </div>
          )}
        </div>

        {/* Technical indicators + prediction history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {prediction && (
            <TechnicalIndicatorsPanel indicators={prediction.indicators} currentPrice={stock.current_price} />
          )}
          <div className={`bg-slate-900/60 border border-slate-800 rounded-xl p-5 ${prediction ? '' : 'lg:col-span-2'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Prediction History</h3>
            </div>
            {loadingHistory ? (
              <p className="text-slate-500 text-sm py-8 text-center">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">No predictions yet for {stock.symbol}.</p>
            ) : (
              <div className="space-y-2">
                {history.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        rec.direction === 'bullish' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      }`}>
                        {rec.direction === 'bullish' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-mono text-slate-200">${Number(rec.predicted_price).toFixed(2)}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(rec.created_at).toLocaleDateString()} · {rec.horizon_days}d horizon
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-medium ${
                        Number(rec.predicted_change_pct) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {Number(rec.predicted_change_pct) >= 0 ? '+' : ''}{Number(rec.predicted_change_pct).toFixed(2)}%
                      </p>
                      <p className="text-xs text-slate-500">{Number(rec.confidence)}% confidence</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
