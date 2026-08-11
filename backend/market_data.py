import yfinance as yf
import pandas as pd
import ta
import logging

logger = logging.getLogger(__name__)

# Mappatura dei simboli
SYMBOLS = {
    "EUR-USD": "EURUSD=X",
    "GBP-USD": "GBPUSD=X",
    "AUD-USD": "AUDUSD=X",
    "USD-CAD": "USDCAD=X"
}
REVERSE_SYMBOLS = {v: k for k, v in SYMBOLS.items()}

class MarketAnalyzer:
    def __init__(self):
        self.tickers = list(SYMBOLS.values())
        
    def fetch_data(self):
        try:
            # Scarichiamo i dati necessari
            # 15m: ultimi 5 giorni (sufficienti per RSI 14)
            data_15m = yf.download(self.tickers, interval='15m', period='5d', group_by='ticker', progress=False)
            # 1h: ultimi 20 giorni (sufficienti per RSI 14)
            data_1h = yf.download(self.tickers, interval='1h', period='20d', group_by='ticker', progress=False)
            # 1d: ultimi 200 giorni (necessari per SMA 100 e SMA 10 di ATR 14)
            data_1d = yf.download(self.tickers, interval='1d', period='200d', group_by='ticker', progress=False)
            
            return data_15m, data_1h, data_1d
        except Exception as e:
            logger.error(f"Errore durante il fetch dei dati: {e}")
            return None, None, None

    def calculate_indicators(self, data_15m, data_1h, data_1d, ticker):
        try:
            df_15m = data_15m[ticker].dropna() if len(self.tickers) > 1 else data_15m.dropna()
            df_1h = data_1h[ticker].dropna() if len(self.tickers) > 1 else data_1h.dropna()
            df_1d = data_1d[ticker].dropna() if len(self.tickers) > 1 else data_1d.dropna()
            
            # Calcolo RSI 15m (Periodo 14)
            df_15m['RSI_14'] = ta.momentum.RSIIndicator(close=df_15m['Close'], window=14).rsi()
            
            # Calcolo RSI 1h (Periodo 14)
            df_1h['RSI_14'] = ta.momentum.RSIIndicator(close=df_1h['Close'], window=14).rsi()
            
            # Calcolo indicatori giornalieri
            df_1d['SMA_100'] = ta.trend.SMAIndicator(close=df_1d['Close'], window=100).sma_indicator()
            df_1d['ATR_14'] = ta.volatility.AverageTrueRange(high=df_1d['High'], low=df_1d['Low'], close=df_1d['Close'], window=14).average_true_range()
            df_1d['SMA_ATR_10'] = ta.trend.SMAIndicator(close=df_1d['ATR_14'], window=10).sma_indicator()
            
            # Otteniamo gli ultimi valori validi
            last_15m = df_15m.iloc[-1]
            last_1h = df_1h.iloc[-1]
            last_1d = df_1d.iloc[-1]
            
            # Condizioni
            rsi_15m = last_15m['RSI_14']
            rsi_1h = last_1h['RSI_14']
            sma_100 = last_1d['SMA_100']
            sma_atr_10 = last_1d['SMA_ATR_10']
            current_price = last_15m['Close'] # Prezzo più recente
            
            condition_1 = rsi_15m <= 30
            condition_2 = rsi_1h <= 35
            
            # SMA100 - Prezzo >= (Media(ATR, 10) * 1,5)
            # Dove Media(ATR, 10) è SMA10 di ATR14
            distance = sma_100 - current_price
            threshold = sma_atr_10 * 1.5
            condition_3 = distance >= threshold
            
            is_buy = condition_1 and condition_2 and condition_3
            
            return {
                "symbol": REVERSE_SYMBOLS[ticker],
                "price": round(current_price, 5),
                "rsi_15m": round(rsi_15m, 2) if not pd.isna(rsi_15m) else None,
                "rsi_1h": round(rsi_1h, 2) if not pd.isna(rsi_1h) else None,
                "sma_100": round(sma_100, 5) if not pd.isna(sma_100) else None,
                "sma_atr_10": round(sma_atr_10, 5) if not pd.isna(sma_atr_10) else None,
                "distance": round(distance, 5),
                "threshold": round(threshold, 5) if not pd.isna(threshold) else None,
                "condition_1_met": bool(condition_1),
                "condition_2_met": bool(condition_2),
                "condition_3_met": bool(condition_3),
                "is_buy": bool(is_buy)
            }
        except Exception as e:
            logger.error(f"Errore nel calcolo degli indicatori per {ticker}: {e}")
            return None

    def analyze_all(self):
        data_15m, data_1h, data_1d = self.fetch_data()
        if data_15m is None:
            return []
            
        results = []
        for ticker in self.tickers:
            res = self.calculate_indicators(data_15m, data_1h, data_1d, ticker)
            if res:
                results.append(res)
                
        return results
