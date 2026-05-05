import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, CandlestickData } from 'lightweight-charts';
import { OHLCV } from '../lib/market';

interface ChartProps {
  data: OHLCV[];
  ema20?: number[];
  ema50?: number[];
}

export const MarketChart: React.FC<ChartProps> = ({ data, ema20, ema50 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d0d0d' },
        textColor: '#666',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#222',
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22C55E',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#22C55E',
      wickDownColor: '#EF4444',
    });

    candlestickSeries.setData(data as CandlestickData[]);

    // Add EMA 20
    if (ema20 && ema20.length > 0) {
      const ema20Series = chart.addSeries(LineSeries, {
        color: '#3B82F6',
        lineWidth: 1,
        title: 'EMA 20',
      });
      const ema20Data = data.slice(data.length - ema20.length).map((d, i) => ({
        time: d.time,
        value: ema20[i],
      }));
      ema20Series.setData(ema20Data);
    }

    // Add EMA 50
    if (ema50 && ema50.length > 0) {
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#EAB308',
        lineWidth: 1,
        title: 'EMA 50',
      });
      const ema50Data = data.slice(data.length - ema50.length).map((d, i) => ({
        time: d.time,
        value: ema50[i],
      }));
      ema50Series.setData(ema50Data);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, ema20, ema50]);

  return <div id="market-chart" ref={chartContainerRef} className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-800" />;
};

