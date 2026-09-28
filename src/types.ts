export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
  price_change: number;
  price_change_pct: number;
  volume: number;
  market_cap: number;
  pe_ratio: number;
  dividend_yield: number;
  beta: number;
  price_history: PricePoint[];
  updated_at: string;
}

export interface PredictionResult {
  symbol: string;
  predicted_price: number;
  predicted_change_pct: number;
  direction: 'bullish' | 'bearish';
  confidence: number;
  method: string;
  horizon_days: number;
  indicators: TechnicalIndicators;
  forecast: ForecastPoint[];
}

export interface ForecastPoint {
  date: string;
  price: number;
  upper: number;
  lower: number;
}

export interface TechnicalIndicators {
  sma_20: number;
  sma_50: number;
  ema_12: number;
  ema_26: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  bollinger_upper: number;
  bollinger_middle: number;
  bollinger_lower: number;
  stochastic_k: number;
  stochastic_d: number;
  atr: number;
  momentum: number;
  roc: number;
}

export interface PredictionRecord {
  id: string;
  symbol: string;
  predicted_price: number;
  predicted_change_pct: number;
  direction: string;
  confidence: number;
  method: string;
  horizon_days: number;
  indicators: TechnicalIndicators | null;
  created_at: string;
}
