import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Cpu, 
  Newspaper, 
  Zap, 
  RefreshCcw, 
  Bot,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { fetchKlines, OHLCV, IndicatorData } from './lib/market';
import { calculateIndicators } from './lib/indicators';
import { analyzeTrade } from './services/aiService';
import { sendSignalToMT5, TradeSignal } from './services/mt5Service';
import { MarketChart } from './components/MarketChart';
import { IndicatorCard } from './components/IndicatorCard';
import { cn } from './lib/utils';

const NEWS_MOCK = [
  "Fed Chair signals interest rate trajectory change; Gold eyes $2400",
  "U.S. CPI data shows cooling inflation, boosting Gold's safe-haven appeal",
  "Central banks increase Gold reserves to record levels in Q1",
  "Geopolitical tensions in Middle East drive safe-haven demand",
  "US Dollar Index (DXY) weakens as Treasury yields retreat"
];

export default function App() {
  const [symbol, setSymbol] = useState('PAXGUSDT'); // Pax Gold as XAU proxy on Binance
  const [data, setData] = useState<OHLCV[]>([]);
  const [indicators, setIndicators] = useState<IndicatorData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoTrade, setIsAutoTrade] = useState(false);
  const [tradeLogs, setTradeLogs] = useState<{ id: string; time: string; signal: TradeSignal; status: string }[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [mt5Config, setMt5Config] = useState({ 
    url: localStorage.getItem('MT5_URL') || '', 
    key: localStorage.getItem('MT5_KEY') || '' 
  });

  const saveSettings = () => {
    localStorage.setItem('MT5_URL', mt5Config.url);
    localStorage.setItem('MT5_KEY', mt5Config.key);
    setShowSettings(false);
  };

  const handleAutoTrade = async (analysisText: string) => {
    if (!isAutoTrade) return;
    
    const executionMatch = analysisText.match(/EXECUTION:\s*({.*})/);
    if (executionMatch) {
      try {
        const executionData = JSON.parse(executionMatch[1]);
        const signal: TradeSignal = {
          symbol: 'XAUUSD', // Translate to MT5 symbol
          action: executionData.action,
          type: 'MARKET',
          volume: executionData.volume || 0.1,
          sl: executionData.sl,
          tp: executionData.tp
        };

        const result = await sendSignalToMT5(signal);
        
        setTradeLogs(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          time: new Date().toLocaleTimeString(),
          signal,
          status: result.success ? 'EXECUTED' : `FAILED: ${result.error}`
        }, ...prev].slice(0, 10));

      } catch (e) {
        console.error("Failed to parse execution signal", e);
      }
    }
  };

  const loadMarketData = async () => {
    setIsLoading(true);
    try {
      const klines = await fetchKlines(symbol);
      setData(klines);
      const ind = calculateIndicators(klines);
      setIndicators(ind);
    } catch (error) {
      console.error("Failed to fetch market data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const runAiAgent = async () => {
    if (!data.length || !indicators) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeTrade('Gold (XAU/USD)', data, indicators, NEWS_MOCK);
      const output = result ?? "No analysis available.";
      setAiAnalysis(output);
      if (result) {
        await handleAutoTrade(result);
      }
    } catch (error) {
      setAiAnalysis("Error generating AI analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, [symbol]);

  const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const prevPrice = data.length > 1 ? data[data.length - 2].close : 0;
  const priceChange = lastPrice - prevPrice;
  const pricePercent = (priceChange / prevPrice) * 100;

  return (
    <div className="h-screen bg-[#050505] text-[#e0e0e0] font-sans flex flex-col overflow-hidden">
      {/* Header / Nav */}
      <nav className="h-16 border-b border-[#222] flex items-center justify-between px-8 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
            <span className="text-xs tracking-[0.2em] font-bold uppercase text-white">Aegis Gold AI Agent</span>
          </div>
          <div className="h-4 w-[1px] bg-[#333]"></div>
          <div className="flex gap-4">
            <span className="text-[11px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 font-mono italic">MARKET: XAU/USD</span>
            <span className="text-[11px] text-gray-500 uppercase tracking-widest font-mono">Macro-Engine: V4</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 bg-[#111] p-1.5 rounded-lg border border-[#222]">
            <span className="text-[10px] uppercase font-bold text-gray-500 ml-2">Auto-Trade</span>
            <button 
              onClick={() => setIsAutoTrade(!isAutoTrade)}
              className={cn(
                "w-10 h-5 rounded-full transition-all relative overflow-hidden",
                isAutoTrade ? "bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-gray-800"
              )}
            >
              <div className={cn(
                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                isAutoTrade ? "left-6" : "left-1"
              )} />
            </button>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-tighter text-gray-500">Spot Price (Gold)</div>
            <div className={cn("text-sm font-mono font-bold", priceChange >= 0 ? "text-emerald-500" : "text-red-500")}>
              ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span className="ml-2 text-[10px] opacity-70">({pricePercent.toFixed(2)}%)</span>
            </div>
          </div>
          <button 
            onClick={runAiAgent}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? "Analyzing..." : "Generate Strategy"}
          </button>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Column: Intelligence Feed */}
        <section className="w-[340px] shrink-0 flex flex-col gap-4">
          <div className="flex-1 bg-[#0d0d0d] border border-[#222] p-4 flex flex-col overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mb-4 flex justify-between shrink-0">
              <span>Gold Intelligence Feed</span>
              <button 
                onClick={loadMarketData}
                className="opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
              >
                <RefreshCcw className={cn("w-2 h-2", isLoading && "animate-spin")} />
                <span className="text-[9px] uppercase">Sync</span>
              </button>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {isAnalyzing && (
                <div className="p-3 bg-[#111] border-l-2 border-blue-500 animate-pulse">
                  <p className="text-[11px] leading-relaxed text-gray-400 font-mono italic">
                    [SYSTEM] Analyzing Gold macro-drivers and technical divergence. Awaiting synthesis...
                  </p>
                </div>
              )}

              {aiAnalysis && (
                <div className="p-3 bg-emerald-500/5 border-l-2 border-emerald-500 border border-emerald-500/10">
                  <div className="text-[11px] font-sans text-gray-200">
                    <span className="text-white font-bold italic underline block mb-2 text-[10px]">GOLD STRATEGY:</span>
                    {aiAnalysis.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0 leading-relaxed">{line}</p>
                    ))}
                  </div>
                </div>
              )}

              {NEWS_MOCK.map((news, i) => (
                <div key={i} className={cn(
                  "p-3 bg-[#111] border-l-2",
                  i % 2 === 0 ? "border-emerald-500" : "border-amber-500"
                )}>
                  <p className="text-[11px] leading-relaxed text-gray-400">
                    <span className="text-gray-600 font-mono mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    {news}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#222] shrink-0">
              <div className="text-[10px] text-gray-600 mb-2 uppercase tracking-widest font-black">Sentiment Score</div>
              <div className="h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className={cn(
                  "h-full transition-all duration-1000",
                  indicators && indicators.rsi[indicators.rsi.length - 1] > 50 ? "bg-emerald-500" : "bg-red-500"
                )} style={{ width: indicators ? `${(indicators.rsi[indicators.rsi.length - 1] / 100 * 100)}%` : '50%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] mt-1 font-mono uppercase font-bold tracking-tighter">
                <span className={indicators && indicators.rsi[indicators.rsi.length - 1] > 50 ? "text-emerald-500" : "text-red-500"}>
                  {indicators && indicators.rsi[indicators.rsi.length - 1] > 50 ? 'BULLISH' : 'BEARISH'}
                </span>
                <span className="text-white opacity-50">STRENGTH: {indicators ? indicators.rsi[indicators.rsi.length - 1].toFixed(1) : '50.0'}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Center Column: Visual Analysis */}
        <section className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Main Chart */}
          <div className="flex-[2] bg-[#0d0d0d] border border-[#222] relative p-6 flex flex-col overflow-hidden text-white">
            <div className="flex justify-between items-start mb-4 overflow-hidden shrink-0">
              <div className="flex gap-4 text-[11px] font-mono whitespace-nowrap overflow-x-auto pb-1">
                <span className="text-white uppercase font-bold tracking-widest underline underline-offset-4 decoration-emerald-500">GOLD / XAU</span>
                <span className="text-emerald-400">MA-20: ${indicators?.ema20[indicators.ema20.length - 1].toFixed(1)}</span>
                <span className="text-amber-400">MA-50: ${indicators?.ema50[indicators.ema50.length - 1].toFixed(1)}</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[10px] font-mono text-gray-700 animate-pulse tracking-[0.5em]">SYNCHRONIZING_MARKET_OPTICS...</p>
                </div>
              ) : (
                <MarketChart 
                  data={data} 
                  ema20={indicators?.ema20} 
                  ema50={indicators?.ema50} 
                />
              )}
            </div>
          </div>

          {/* Sub-visuals */}
          <div className="flex-1 grid grid-cols-2 gap-4 shrink-0">
            <div className="bg-[#0d0d0d] border border-[#222] p-4 flex flex-col overflow-hidden">
              <h3 className="text-[9px] uppercase tracking-widest text-gray-500 mb-3 font-bold">Safe Haven Divergence (RSI)</h3>
              <div className="flex-1 flex items-center justify-center border-b border-l border-[#1a1a1a] relative">
                {/* Visualizer for RSI bar */}
                <div className="w-full h-8 bg-[#111] border border-[#222] relative overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: indicators ? `${indicators.rsi[indicators.rsi.length - 1]}%` : '50%' }}
                    className={cn(
                      "h-full opacity-50",
                      indicators && indicators.rsi[indicators.rsi.length - 1] > 70 ? "bg-red-500" : indicators && indicators.rsi[indicators.rsi.length - 1] < 30 ? "bg-emerald-500" : "bg-blue-500"
                    )}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white">
                    {indicators?.rsi[indicators.rsi.length - 1].toFixed(2)}
                  </div>
                </div>
                <div className="absolute bottom-[-15px] left-0 right-0 flex justify-between text-[8px] text-gray-700 font-mono">
                  <span>0</span><span>30 (OVERSOLD)</span><span>70 (OVERBOUGHT)</span><span>100</span>
                </div>
              </div>
            </div>
            <div className="bg-[#0d0d0d] border border-[#222] p-4 flex flex-col overflow-hidden text-white">
              <h3 className="text-[9px] uppercase tracking-widest text-gray-500 mb-3 font-bold">Trend Momentum (MACD)</h3>
              <div className="flex-1 flex flex-col justify-center gap-1">
                <div className="flex items-end gap-[1px] h-12">
                   {indicators?.macd.slice(-30).map((m, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex-1", 
                          m.histogram > 0 ? "bg-emerald-500/30 border-t border-emerald-500" : "bg-red-500/30 border-b border-red-500"
                        )} 
                        style={{ height: `${Math.min(100, Math.abs(m.histogram) * 200)}%`, maxHeight: '100%' }}
                      />
                   ))}
                </div>
                <div className="h-px bg-gray-800 w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Indicators & Status */}
        <section className="w-[260px] shrink-0 flex flex-col gap-4 overflow-hidden">
          <div className="bg-[#0d0d0d] border border-[#222] p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 shrink-0">Telemetry Indicators</h3>
            
            <div className="space-y-6">
              <IndicatorRow 
                label="Spot Momentum" 
                value={indicators?.rsi[indicators.rsi.length - 1].toFixed(2) ?? '0.00'} 
                status={indicators && indicators.rsi[indicators.rsi.length - 1] > 70 ? 'OVERHEATED' : indicators && indicators.rsi[indicators.rsi.length - 1] < 30 ? 'ACCUMULATION' : 'STABLE'}
                statusClass={indicators && indicators.rsi[indicators.rsi.length - 1] > 70 ? 'text-red-500' : indicators && indicators.rsi[indicators.rsi.length - 1] < 30 ? 'text-emerald-500' : 'text-blue-500'}
              />

              <div className="space-y-4">
                <div className="text-[9px] text-emerald-500/50 font-bold uppercase tracking-[0.2em]">Institutional Floors/Ceilings</div>
                {indicators?.levels.resistance.slice(0, 2).map((r, i) => (
                  <div key={i} className="flex justify-between items-end border-b border-[#1a1a1a] pb-2">
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase font-mono">Resistance R{i+1}</div>
                      <div className="text-sm font-mono text-white">${r.toLocaleString()}</div>
                    </div>
                    <div className="text-[9px] text-red-800 uppercase font-bold">Wall</div>
                  </div>
                ))}
                {indicators?.levels.support.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex justify-between items-end border-b border-[#1a1a1a] pb-2">
                    <div>
                      <div className="text-[9px] text-gray-500 uppercase font-mono">Support S{i+1}</div>
                      <div className="text-sm font-mono text-white">${s.toLocaleString()}</div>
                    </div>
                    <div className="text-[9px] text-emerald-950 uppercase font-bold">Anchor</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="text-[9px] text-amber-500/50 font-bold uppercase tracking-[0.2em]">Gold Specific Metrics</div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 uppercase">Trend Alignment</span>
                  <span className={cn("text-[10px] font-bold uppercase", indicators && indicators.ema20[indicators.ema20.length - 1] > indicators.ema50[indicators.ema50.length - 1] ? 'text-emerald-500' : 'text-red-500')}>
                    {indicators && indicators.ema20[indicators.ema20.length - 1] > indicators.ema50[indicators.ema50.length - 1] ? 'Bullish Drift' : 'Bearish Gap'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 uppercase">Volatility Index</span>
                  <span className="text-[10px] font-mono text-white underline underline-offset-2 decoration-white/20">
                    {indicators ? ((indicators.bb[indicators.bb.length - 1].upper - indicators.bb[indicators.bb.length - 1].lower) / indicators.bb[indicators.bb.length - 1].middle * 100).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-[#1a1a1a] shrink-0">
              <div className="text-[10px] text-gray-600 mb-2 uppercase font-black">Agent Operational Status</div>
              <div className={cn(
                "border p-3 rounded flex flex-col gap-2 transition-all",
                isAutoTrade ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-blue-500/5 border-blue-500/20"
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    isAutoTrade ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" : "bg-blue-500"
                  )}></div>
                  <span className={cn("text-[10px] font-bold uppercase", isAutoTrade ? "text-emerald-500" : "text-blue-500")}>
                    {isAutoTrade ? "Gold Auto-Execution Active" : "Passive Scanning"}
                  </span>
                </div>
                <p className="text-[9px] text-gray-500 leading-tight">
                  {isAutoTrade 
                    ? "Agent scanning for safe-haven breakouts. MT5 Bridge: CONNECTED. Auto-Margin Enabled." 
                    : "Awaiting high-conviction divergence in Gold macro catalysts."}
                </p>
              </div>
            </div>

            {/* Trade Logs */}
            <div className="mt-4 pt-4 border-t border-[#1a1a1a] shrink-0">
              <div className="text-[10px] text-gray-600 mb-2 uppercase font-black">MT5 Activity Log</div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                {tradeLogs.length === 0 ? (
                  <p className="text-[9px] text-gray-800 italic uppercase">Terminal Idle</p>
                ) : (
                  tradeLogs.map(log => (
                    <div key={log.id} className="text-[10px] font-mono p-2 bg-[#111] border border-[#222] rounded overflow-hidden">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">[{log.time}]</span>
                        <span className={cn(
                          "font-bold",
                          log.status === 'EXECUTED' ? "text-emerald-500" : "text-red-500"
                        )}>{log.status}</span>
                      </div>
                      <div className="text-gray-300">
                        {log.signal.action} {log.signal.symbol} @ {log.signal.volume} lot
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Ticker */}
      <footer className="h-8 bg-black border-t border-[#222] flex items-center px-4 overflow-hidden shrink-0">
        <div className="flex gap-12 whitespace-nowrap text-[9px] font-mono text-gray-600 marquee pb-1 lowercase">
          <TickItem label="GOLD (XAU/USD)" value={lastPrice} change={pricePercent} />
          <TickItem label="DXY (US DOLLAR)" value={104.2} change={-0.12} />
          <TickItem label="US10Y (TREASURY)" value={4.251} change={0.45} />
          <TickItem label="SILVER (XAG/USD)" value={28.12} change={1.25} />
          <div className="flex gap-2">
            <span className="text-emerald-500/40 uppercase cursor-pointer hover:text-emerald-500 transition-colors mr-4" onClick={() => setShowSettings(true)}>| MT5_BRIDGE_SETTINGS |</span>
            <div className="flex gap-2 opacity-40 uppercase">| CALIBRATING_AI_FOR_SAFE_HAVEN_MODELS | GOLD_SENTIMENT: POSITIVE | AGENT_MODE: HIGH_CONVICTION |</div>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0d0d0d] border border-[#222] p-8 rounded-2xl shadow-2xl"
            >
              <h2 className="text-emerald-500 font-bold uppercase tracking-[0.2em] text-xs mb-6">Bridge Configuration</h2>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">MT5 Gateway URL</label>
                  <input 
                    type="text" 
                    value={mt5Config.url}
                    onChange={(e) => setMt5Config({ ...mt5Config, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-[#111] border border-[#222] p-3 rounded-lg text-sm font-mono text-white outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">API Secret Key</label>
                  <input 
                    type="password" 
                    value={mt5Config.key}
                    onChange={(e) => setMt5Config({ ...mt5Config, key: e.target.value })}
                    placeholder="MT5_..."
                    className="w-full bg-[#111] border border-[#222] p-3 rounded-lg text-sm font-mono text-white outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={saveSettings}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
                >
                  Apply Config
                </button>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-3 border border-[#222] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
                >
                  Close
                </button>
              </div>
              <p className="mt-6 text-[9px] text-gray-600 leading-relaxed italic">
                *Settings are saved locally to your device. Ensure your MT5 Web Gateway is configured to receive these signals.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IndicatorRow({ label, value, status, statusClass }: { label: string, value: string, status: string, statusClass: string }) {
  return (
    <div className="flex justify-between items-end border-b border-[#1a1a1a] pb-2">
      <div>
        <div className="text-[9px] text-gray-500 uppercase">{label}</div>
        <div className="text-lg font-mono text-white">{value}</div>
      </div>
      <div className={cn("text-[8px] uppercase font-black", statusClass)}>{status}</div>
    </div>
  );
}

function TickItem({ label, value, change }: { label: string, value: number, change: number }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-white font-bold">{label}:</span>
      <span className="text-gray-400">${value.toLocaleString()}</span>
      <span className={change >= 0 ? "text-emerald-500" : "text-red-500"}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
    </div>
  );
}

