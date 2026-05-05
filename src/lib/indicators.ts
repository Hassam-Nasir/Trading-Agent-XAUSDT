import { 
  RSI, 
  EMA, 
  MACD, 
  BollingerBands, 
} from 'technicalindicators';
import { OHLCV, IndicatorData } from './market';

export function calculateIndicators(data: OHLCV[]): IndicatorData {
  const prices = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);

  // RSI
  const rsi = RSI.calculate({ values: prices, period: 14 });

  // EMAs
  const ema20 = EMA.calculate({ values: prices, period: 20 });
  const ema50 = EMA.calculate({ values: prices, period: 50 });

  // MACD
  const macdRaw = MACD.calculate({
    values: prices,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  
  const macd = macdRaw.map(m => ({
    macd: m.MACD ?? 0,
    signal: m.signal ?? 0,
    histogram: m.histogram ?? 0
  }));

  // Bollinger Bands
  const bb = BollingerBands.calculate({ values: prices, period: 20, stdDev: 2 });

  // Support/Resistance (Simple peak/trough detection)
  const support: number[] = [];
  const resistance: number[] = [];
  
  for (let i = 2; i < highs.length - 2; i++) {
    // Local High (Resistance)
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
      resistance.push(highs[i]);
    }
    // Local Low (Support)
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
      support.push(lows[i]);
    }
  }

  // Filter levels to keep them relevant (simplified)
  const lastPrice = prices[prices.length - 1];
  const relevantSupport = Array.from(new Set(support))
    .filter(s => s < lastPrice)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const relevantResistance = Array.from(new Set(resistance))
    .filter(r => r > lastPrice)
    .sort((a, b) => a - b)
    .slice(0, 3);

  return {
    rsi,
    ema20,
    ema50,
    macd,
    bb,
    levels: { support: relevantSupport, resistance: relevantResistance },
    patterns: [] // Could add pattern detection logic here
  };
}
