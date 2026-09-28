import type { PricePoint, TechnicalIndicators, PredictionResult, ForecastPoint } from '@/types';

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  // Signal line: 9-period EMA of MACD values
  const macdValues: number[] = [];
  if (prices.length > 26) {
    const k = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    let e12 = prices[0];
    let e26 = prices[0];
    for (let i = 1; i < prices.length; i++) {
      e12 = prices[i] * k + e12 * (1 - k);
      e26 = prices[i] * k26 + e26 * (1 - k26);
      macdValues.push(e12 - e26);
    }
  }
  const signal = macdValues.length > 0 ? calculateEMA(macdValues, 9) : macd;
  return { macd, signal, histogram: macd - signal };
}

export function calculateBollingerBands(prices: number[], period: number = 20): { upper: number; middle: number; lower: number } {
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  const stdDev = Math.sqrt(variance);
  return {
    upper: mean + 2 * stdDev,
    middle: mean,
    lower: mean - 2 * stdDev,
  };
}

export function calculateStochastic(prices: number[], period: number = 14): { k: number; d: number } {
  if (prices.length < period) return { k: 50, d: 50 };
  const slice = prices.slice(-period);
  const highest = Math.max(...slice);
  const lowest = Math.min(...slice);
  const current = prices[prices.length - 1];
  const k = highest === lowest ? 50 : ((current - lowest) / (highest - lowest)) * 100;
  // D is 3-period SMA of K values
  const kValues: number[] = [];
  for (let i = period; i <= prices.length; i++) {
    const s = prices.slice(i - period, i);
    const h = Math.max(...s);
    const l = Math.min(...s);
    const c = prices[i - 1];
    kValues.push(h === l ? 50 : ((c - l) / (h - l)) * 100);
  }
  const d = kValues.length >= 3 ? calculateSMA(kValues, 3) : k;
  return { k, d };
}

export function calculateATR(priceHistory: PricePoint[], period: number = 14): number {
  if (priceHistory.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const high = priceHistory[i].high;
    const low = priceHistory[i].low;
    const prevClose = priceHistory[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  return calculateSMA(trs.slice(-period), period);
}

export function calculateIndicators(priceHistory: PricePoint[]): TechnicalIndicators {
  const closes = priceHistory.map(p => p.close);
  const bollinger = calculateBollingerBands(closes, 20);
  const macd = calculateMACD(closes);
  const stochastic = calculateStochastic(closes, 14);
  const lastPrice = closes[closes.length - 1];
  const sma50 = calculateSMA(closes, 50);
  const momentum = closes.length > 10 ? lastPrice - closes[closes.length - 11] : 0;
  const roc = closes.length > 12 ? ((lastPrice - closes[closes.length - 13]) / closes[closes.length - 13]) * 100 : 0;

  return {
    sma_20: calculateSMA(closes, 20),
    sma_50: sma50,
    ema_12: calculateEMA(closes, 12),
    ema_26: calculateEMA(closes, 26),
    rsi: calculateRSI(closes, 14),
    macd: macd.macd,
    macd_signal: macd.signal,
    macd_histogram: macd.histogram,
    bollinger_upper: bollinger.upper,
    bollinger_middle: bollinger.middle,
    bollinger_lower: bollinger.lower,
    stochastic_k: stochastic.k,
    stochastic_d: stochastic.d,
    atr: calculateATR(priceHistory, 14),
    momentum,
    roc,
  };
}

function linearRegressionForecast(prices: number[], horizon: number): number[] {
  const n = prices.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = prices.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - xMean) * (prices[i] - yMean);
    den += (x[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const forecast: number[] = [];
  for (let i = 0; i < horizon; i++) {
    forecast.push(intercept + slope * (n + i));
  }
  return forecast;
}

function weightedMovingAverageForecast(prices: number[], horizon: number): number[] {
  const recent = prices.slice(-20);
  const n = recent.length;
  const weights = Array.from({ length: n }, (_, i) => i + 1);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const wma = recent.reduce((a, p, i) => a + p * weights[i], 0) / wSum;
  const avgChange = (recent[n - 1] - recent[0]) / n;
  const forecast: number[] = [];
  for (let i = 0; i < horizon; i++) {
    forecast.push(wma + avgChange * (i + 1));
  }
  return forecast;
}

function ensembleForecast(prices: number[], horizon: number): { forecast: number[]; upper: number[]; lower: number[] } {
  const lrForecast = linearRegressionForecast(prices.slice(-30), horizon);
  const wmaForecast = weightedMovingAverageForecast(prices, horizon);
  const blended = lrForecast.map((lr, i) => (lr + wmaForecast[i]) / 2);

  // Confidence bands based on recent volatility
  const recentReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    recentReturns.push((prices[i] - prices[i - 1]) / prices[i]);
  }
  const volatility = Math.sqrt(recentReturns.reduce((a, b) => a + b * b, 0) / recentReturns.length);
  const lastPrice = prices[prices.length - 1];

  const upper = blended.map((f, i) => f * (1 + volatility * Math.sqrt(i + 1) * 1.96));
  const lower = blended.map((f, i) => f * (1 - volatility * Math.sqrt(i + 1) * 1.96));

  return { forecast: blended, upper, lower };
}

function generateSignalScore(ind: TechnicalIndicators): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  // RSI signals
  if (ind.rsi < 30) {
    score += 2;
    signals.push('RSI oversold — potential reversal upward');
  } else if (ind.rsi > 70) {
    score -= 2;
    signals.push('RSI overbought — potential reversal downward');
  }

  // MACD signals
  if (ind.macd_histogram > 0) {
    score += 1.5;
    signals.push('MACD bullish crossover');
  } else {
    score -= 1.5;
    signals.push('MACD bearish crossover');
  }

  // SMA crossover
  if (ind.sma_20 > ind.sma_50) {
    score += 1;
    signals.push('Golden cross — SMA20 above SMA50');
  } else {
    score -= 1;
    signals.push('Death cross — SMA20 below SMA50');
  }

  // Bollinger position
  const lastPrice = ind.bollinger_middle;
  if (lastPrice < ind.bollinger_lower) {
    score += 1;
    signals.push('Price below lower Bollinger Band — oversold');
  } else if (lastPrice > ind.bollinger_upper) {
    score -= 1;
    signals.push('Price above upper Bollinger Band — overbought');
  }

  // Stochastic
  if (ind.stochastic_k < 20) {
    score += 1;
    signals.push('Stochastic oversold');
  } else if (ind.stochastic_k > 80) {
    score -= 1;
    signals.push('Stochastic overbought');
  }

  // Momentum
  if (ind.momentum > 0) {
    score += 0.5;
    signals.push('Positive momentum');
  } else {
    score -= 0.5;
    signals.push('Negative momentum');
  }

  return { score, signals };
}

export function runPrediction(
  symbol: string,
  priceHistory: PricePoint[],
  horizonDays: number = 7
): PredictionResult {
  const closes = priceHistory.map(p => p.close);
  const currentPrice = closes[closes.length - 1];
  const ind = calculateIndicators(priceHistory);

  const { forecast, upper, lower } = ensembleForecast(closes, horizonDays);
  const predictedPrice = forecast[forecast.length - 1];
  const predictedChangePct = ((predictedPrice - currentPrice) / currentPrice) * 100;

  const { score, signals } = generateSignalScore(ind);

  // Direction from ensemble forecast
  const direction: 'bullish' | 'bearish' = predictedChangePct >= 0 ? 'bullish' : 'bearish';

  // Confidence: base on signal agreement + forecast magnitude
  const maxScore = 7;
  const signalConfidence = (Math.abs(score) / maxScore) * 60;
  const trendConfidence = Math.min(40, Math.abs(predictedChangePct) * 8);
  const confidence = Math.min(95, Math.max(15, 45 + signalConfidence + trendConfidence));

  const lastDate = new Date(priceHistory[priceHistory.length - 1].date);
  const forecastPoints: ForecastPoint[] = forecast.map((f, i) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i + 1);
    return {
      date: d.toISOString().slice(0, 10),
      price: Math.round(f * 100) / 100,
      upper: Math.round(upper[i] * 100) / 100,
      lower: Math.round(lower[i] * 100) / 100,
    };
  });

  const methodParts: string[] = [];
  methodParts.push('Ensemble (Linear Regression + WMA)');
  if (score > 0) methodParts.push('Technical signals: bullish');
  else if (score < 0) methodParts.push('Technical signals: bearish');
  else methodParts.push('Technical signals: neutral');

  return {
    symbol,
    predicted_price: Math.round(predictedPrice * 100) / 100,
    predicted_change_pct: Math.round(predictedChangePct * 100) / 100,
    direction,
    confidence: Math.round(confidence),
    method: methodParts.join(' | '),
    horizon_days: horizonDays,
    indicators: ind,
    forecast: forecastPoints,
  };
}

export function getPredictionSignals(ind: TechnicalIndicators): string[] {
  const { signals } = generateSignalScore(ind);
  return signals;
}
