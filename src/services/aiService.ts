import { GoogleGenAI } from "@google/genai";
import { IndicatorData, OHLCV } from "../lib/market";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeTrade(
  symbol: string,
  priceData: OHLCV[],
  indicators: IndicatorData,
  news: string[]
) {
  const lastPrice = priceData[priceData.length - 1].close;
  const lastRSI = indicators.rsi[indicators.rsi.length - 1];
  
  const prompt = `
    You are an expert crypto trading analyst. 
    Analyze the following data for ${symbol}:
    Current Price: ${lastPrice}
    RSI: ${lastRSI.toFixed(2)}
    EMA20: ${indicators.ema20[indicators.ema20.length - 1].toFixed(2)}
    EMA50: ${indicators.ema50[indicators.ema50.length - 1].toFixed(2)}
    Support Levels: ${indicators.levels.support.join(', ')}
    Resistance Levels: ${indicators.levels.resistance.join(', ')}
    
    Recent News:
    ${news.join('\n')}
    
    Provide a concise technical analysis verdict. Mention specific indicators.
    
    CRITICAL: If the analysis suggests a strong trade opportunity (High Conviction), include an EXECUTION block at the end of your response in the following JSON format:
    EXECUTION: {"action": "BUY" | "SELL", "sl": number, "tp": number, "volume": number, "reason": "concise reason"}
    
    Format your response as a professional signal:
    1. Overall Sentiment (Bullish/Bearish/Neutral)
    2. Strength of Momentum
    3. Suggested Entry/Exit Zones
    4. Risk warning.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Unable to perform AI analysis at this time.";
  }
}
