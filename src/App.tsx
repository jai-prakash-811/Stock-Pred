import { useEffect, useState, useMemo } from 'react';
import type { Stock, PredictionRecord } from '@/types';
import { supabase } from '@/lib/supabase';
import { StockDetail } from '@/components/StockDetail';
import { Sparkline } from '@/components/Sparkline';
import { PriceChart } from '@/components/PriceChart';
import { TrendingUp, TrendingDown, Star, Search, Brain, Activity, BarChart3, Plus, X } from 'lucide-react';

type View = 'dashboard' | 'detail';

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [recentPredictions, setRecentPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [marketSummary, setMarketSummary] = useState<{ gainers: number; losers: number; avgChange: number }>({ gainers: 0, losers: 0, avgChange: 0 });

  // Load data from Supabase
  const loadData = async () => {
    const [stocksRes, watchRes, predRes] = await Promise.all([
      supabase.from('stocks').select('*').order('market_cap', { ascending: false }),
      supabase.from('watchlist').select('symbol'),
      supabase.from('predictions').select('*').order('created_at', { ascending: false }).limit(8),
    ]);
    setStocks((stocksRes.data ?? []) as Stock[]);
    setWatchlist((watchRes.data ?? []).map((w: { symbol: string }) => w.symbol));
    setRecentPredictions((predRes.data ?? []) as PredictionRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Market summary
  useEffect(() => {
    if (stocks.length === 0) return;
    const gainers = stocks.filter(s => s.price_change_pct > 0).length;
    const losers = stocks.filter(s => s.price_change_pct < 0).length;
    const avgChange = stocks.reduce((a, s) => a + s.price_change_pct, 0) / stocks.length;
    setMarketSummary({ gainers, losers, avgChange });
  }, [stocks]);

  const sectors = useMemo(() => ['All', ...new Set(stocks.map(s => s.sector))], [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks.filter(s => {
      const matchesSearch = s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase());
      const matchesSector = sectorFilter === 'All' || s.sector === sectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [stocks, search, sectorFilter]);

  const watchedStocks = useMemo(() => stocks.filter(s => watchlist.includes(s.symbol)), [stocks, watchlist]);

  const selectedStock = stocks.find(s => s.symbol === selectedSymbol) ?? null;

  const handleToggleWatch = async (symbol: string) => {
    if (watchlist.includes(symbol)) {
      setWatchlist(watchlist.filter(s => s !== symbol));
      await supabase.from('watchlist').delete().eq('symbol', symbol);
    } else {
      setWatchlist([...watchlist, symbol]);
      await supabase.from('watchlist').insert({ symbol });
    }
  };

  const openStock = (symbol: string) => {
    setSelectedSymbol(symbol);
    setView('detail');
  };

  // Add custom stock (simulated)
  const handleAddStock = async (symbol: string, name: string) => {
    const basePrice = 50 + Math.random() * 400;
    const history = Array.from({ length: 90 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (89 - i));
      const noise = (Math.random() - 0.48) * basePrice * 0.03;
      const close = Math.max(1, basePrice * 0.85 + (basePrice * 0.15 * i / 89) + noise);
      return {
        date: date.toISOString().slice(0, 10),
        open: close * 0.99,
        high: close * 1.02,
        low: close * 0.98,
        close: Math.round(close * 100) / 100,
        volume: Math.floor(10e6 + Math.random() * 50e6),
      };
    });
    const lastClose = history[history.length - 2].close;
    const currentPrice = history[history.length - 1].close;
    const newStock = {
      symbol: symbol.toUpperCase(),
      name,
      sector: 'Custom',
      current_price: currentPrice,
      price_change: Math.round((currentPrice - lastClose) * 100) / 100,
      price_change_pct: Math.round(((currentPrice - lastClose) / lastClose * 100) * 100) / 100,
      volume: Math.floor(10e6 + Math.random() * 50e6),
      market_cap: Math.round(currentPrice * (10 + Math.random() * 90)),
      pe_ratio: Math.round((10 + Math.random() * 50) * 10) / 10,
      dividend_yield: Math.round(Math.random() * 4 * 100) / 100,
      beta: Math.round((0.5 + Math.random() * 1.5) * 100) / 100,
      price_history: history,
    };
    await supabase.from('stocks').upsert(newStock);
    setShowAddModal(false);
    await loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-500 text-sm">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedStock) {
    return (
      <StockDetail
        stock={selectedStock}
        onBack={() => { setView('dashboard'); setSelectedSymbol(null); }}
        isWatched={watchlist.includes(selectedStock.symbol)}
        onToggleWatch={() => handleToggleWatch(selectedStock.symbol)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">PredictIQ</h1>
                <p className="text-xs text-slate-500">AI Stock Market Prediction</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-400">Market Live</span>
                </div>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Stock</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Market Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Tracked Stocks</span>
            </div>
            <p className="text-2xl font-bold text-white">{stocks.length}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900/50 border border-emerald-900/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Gainers</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{marketSummary.gainers}</p>
          </div>
          <div className="bg-gradient-to-br from-red-950/40 to-slate-900/50 border border-red-900/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Losers</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{marketSummary.losers}</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wide">Avg Change</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${marketSummary.avgChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {marketSummary.avgChange >= 0 ? '+' : ''}{marketSummary.avgChange.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Watchlist */}
        {watchedStocks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h2 className="text-lg font-bold text-white">Watchlist</h2>
              <span className="text-sm text-slate-500">({watchedStocks.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchedStocks.map(stock => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  isWatched={true}
                  onClick={() => openStock(stock.symbol)}
                  onToggleWatch={() => handleToggleWatch(stock.symbol)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All stocks */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-white">All Stocks</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search symbol or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-4 py-2 w-56 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 outline-none placeholder-slate-600"
                />
              </div>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/30 outline-none"
              >
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStocks.map(stock => (
              <StockCard
                key={stock.id}
                stock={stock}
                isWatched={watchlist.includes(stock.symbol)}
                onClick={() => openStock(stock.symbol)}
                onToggleWatch={() => handleToggleWatch(stock.symbol)}
              />
            ))}
          </div>
          {filteredStocks.length === 0 && (
            <p className="text-slate-500 text-center py-12">No stocks match your search.</p>
          )}
        </div>

        {/* Recent predictions */}
        {recentPredictions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Recent Predictions</h2>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Symbol</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Predicted</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">Change</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Direction</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">Confidence</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPredictions.map((rec) => (
                    <tr
                      key={rec.id}
                      onClick={() => openStock(rec.symbol)}
                      className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span className="font-bold text-white">{rec.symbol}</span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-200">${Number(rec.predicted_price).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-mono hidden sm:table-cell">
                        <span className={Number(rec.predicted_change_pct) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {Number(rec.predicted_change_pct) >= 0 ? '+' : ''}{Number(rec.predicted_change_pct).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          rec.direction === 'bullish' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {rec.direction === 'bullish' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {rec.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-slate-300">{Number(rec.confidence)}%</span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500 text-sm hidden md:table-cell">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <AddStockModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddStock}
          existingSymbols={stocks.map(s => s.symbol)}
        />
      )}
    </div>
  );
}

interface StockCardProps {
  stock: Stock;
  isWatched: boolean;
  onClick: () => void;
  onToggleWatch: () => void;
}

function StockCard({ stock, isWatched, onClick, onToggleWatch }: StockCardProps) {
  const isPositive = stock.price_change >= 0;
  const sparkData = stock.price_history.slice(-30).map(p => p.close);
  const sparkColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div
      onClick={onClick}
      className="group bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer relative"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWatch(); }}
        className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <Star className={`w-4 h-4 ${isWatched ? 'fill-amber-400 text-amber-400' : 'text-slate-600 hover:text-slate-400'}`} />
      </button>

      <div className="flex items-start justify-between mb-3 pr-8">
        <div>
          <h3 className="font-bold text-white text-lg tracking-tight">{stock.symbol}</h3>
          <p className="text-xs text-slate-500 truncate max-w-[180px]">{stock.name}</p>
        </div>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-2xl font-bold font-mono text-white">
            ${stock.current_price.toFixed(2)}
          </p>
          <div className={`flex items-center gap-1 text-sm font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositive ? '+' : ''}{stock.price_change.toFixed(2)} ({isPositive ? '+' : ''}{stock.price_change_pct.toFixed(2)}%)
          </div>
        </div>
        <Sparkline data={sparkData} color={sparkColor} width={70} height={32} />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
        <span className="text-xs text-slate-500">{stock.sector}</span>
        <span className="text-xs font-mono text-slate-400">Vol {(stock.volume / 1e6).toFixed(1)}M</span>
      </div>
    </div>
  );
}

interface AddStockModalProps {
  onClose: () => void;
  onAdd: (symbol: string, name: string) => void;
  existingSymbols: string[];
}

function AddStockModal({ onClose, onAdd, existingSymbols }: AddStockModalProps) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym || !name.trim()) {
      setError('Please enter both symbol and company name.');
      return;
    }
    if (existingSymbols.includes(sym)) {
      setError(`${sym} is already in the list.`);
      return;
    }
    onAdd(sym, name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Add Stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setError(''); }}
              placeholder="e.g. PLTR"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm uppercase focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Company Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Palantir Technologies"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-400 transition-colors"
          >
            Add to Market
          </button>
          <p className="text-xs text-slate-500 text-center">
            A simulated 90-day price history will be generated for this stock.
          </p>
        </form>
      </div>
    </div>
  );
}
