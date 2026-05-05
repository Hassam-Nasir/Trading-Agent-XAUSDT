import axios from 'axios';

export interface TradeSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  type: 'MARKET' | 'LIMIT';
  price?: number;
  tp?: number;
  sl?: number;
  volume: number;
}

export async function sendSignalToMT5(signal: TradeSignal) {
  // Prefer User-defined settings from localStorage (for desktop/downloaded use)
  const webhookUrl = localStorage.getItem('MT5_URL') || import.meta.env.VITE_MT5_WEBHOOK_URL;
  const apiKey = localStorage.getItem('MT5_KEY') || import.meta.env.VITE_MT5_API_KEY;

  if (!webhookUrl) {
    console.warn("MT5 Webhook URL not configured. Signal logged but not sent.");
    return { success: false, error: "Webhook not configured" };
  }

  try {
    const response = await axios.post(webhookUrl, {
      ...signal,
      timestamp: Date.now(),
      clientId: 'OmniTrade-AI-Agent'
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Failed to send signal to MT5:", error);
    return { success: false, error: "Connection error" };
  }
}
