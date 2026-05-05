export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  rsi: number[];
  ema20: number[];
  ema50: number[];
  macd: { macd: number; signal: number; histogram: number }[];
  bb: { upper: number; middle: number; lower: number }[];
  levels: { support: number[]; resistance: number[] };
  patterns: string[];
}

export async function fetchKlines(symbol: string = 'BTCUSDT', interval: string = '1h', limit: number = 200): Promise<OHLCV[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  
  return data.map((d: any) => ({
    time: d[0] / 1000,
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
  }));
}
