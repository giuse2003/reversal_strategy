import os
import json
import asyncio
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv
from telegram import Bot
from supabase import create_client, Client

from market_data import MarketAnalyzer

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs')
STATUS_FILE = os.path.join(DOCS_DIR, 'live-status.json')

def load_previous_state():
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, 'r') as f:
                data = json.load(f)
                # mappa simboli al timestamp in cui hanno dato l'ultimo is_buy
                state = {}
                for item in data.get('data', []):
                    if item.get('is_buy') and item.get('last_buy_time'):
                        state[item['symbol']] = datetime.fromisoformat(item['last_buy_time'])
                return state
        except Exception as e:
            logger.error(f"Errore lettura stato precedente: {e}")
    return {}

def save_current_state(results, previous_state, now):
    os.makedirs(DOCS_DIR, exist_ok=True)
    
    # Aggiorna i risultati con il timestamp del buy se necessario
    for res in results:
        symbol = res['symbol']
        if res['is_buy']:
            # Se era già buy di recente, mantieni il timestamp vecchio, altrimenti metti ora
            prev_time = previous_state.get(symbol)
            if prev_time and (now - prev_time).total_seconds() < 900:
                res['last_buy_time'] = prev_time.isoformat()
            else:
                res['last_buy_time'] = now.isoformat()
        else:
            res['last_buy_time'] = None

    output = {
        "status": "ok",
        "timestamp": now.isoformat(),
        "data": results
    }
    
    with open(STATUS_FILE, 'w') as f:
        json.dump(output, f, indent=2)
        
    return results

async def notify_subscribers(messages):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    supa_url = os.getenv("SUPABASE_URL")
    supa_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not token or not supa_url or not supa_key:
        logger.warning("Credenziali mancanti. Impossibile inviare notifiche.")
        return
        
    bot = Bot(token)
    supabase: Client = create_client(supa_url, supa_key)
    
    try:
        response = supabase.table("telegram_subscribers_reversal").select("telegram_chat_id").execute()
        subscribers = [row["telegram_chat_id"] for row in response.data]
    except Exception as e:
        logger.error(f"Errore caricamento iscritti da Supabase: {e}")
        return
        
    logger.info(f"Trovati {len(subscribers)} iscritti.")
    
    for msg in messages:
        for chat_id in subscribers:
            try:
                await bot.send_message(chat_id=chat_id, text=msg, parse_mode='HTML')
            except Exception as e:
                logger.error(f"Impossibile inviare messaggio a {chat_id}: {e}")

def keep_supabase_alive():
    supa_url = os.getenv("SUPABASE_URL")
    supa_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if supa_url and supa_key:
        try:
            supabase: Client = create_client(supa_url, supa_key)
            # Query leggerissima per evitare la sospensione per inattività (mantiene il DB attivo)
            supabase.table("telegram_subscribers_reversal").select("telegram_chat_id", count="exact").limit(1).execute()
        except Exception as e:
            logger.error(f"Errore keep-alive Supabase: {e}")

def main():
    keep_supabase_alive()
    
    analyzer = MarketAnalyzer()
    results = analyzer.analyze_all()
    
    if not results:
        logger.error("Nessun dato recuperato.")
        return

    now = datetime.now(timezone.utc)
    previous_state = load_previous_state()
    
    updated_results = save_current_state(results, previous_state, now)
    
    messages = []
    for res in updated_results:
        symbol = res['symbol']
        if res['is_buy']:
            prev_time = previous_state.get(symbol)
            # Se è un nuovo segnale di buy (non c'era o è passato più di 15m)
            if not prev_time or (now - prev_time).total_seconds() > 900:
                msg = (
                    f"🚨 <b>SEGNALE BUY: {symbol}</b> 🚨\n\n"
                    f"Prezzo: {res['price']}\n"
                    f"RSI 15': {res['rsi_15m']} (<= 30)\n"
                    f"RSI 1H: {res['rsi_1h']} (<= 35)\n"
                    f"Distanza SMA100: {res['distance']} >= {res['threshold']}\n\n"
                    f"Tutte le condizioni della Reversal Strategy sono soddisfatte!\n\n"
                    f"🔗 <a href='https://giuse2003.github.io/reversal_strategy/'>Apri la Dashboard</a>"
                )
                messages.append(msg)
                
    if messages:
        logger.info(f"Invio di {len(messages)} segnali di buy.")
        asyncio.run(notify_subscribers(messages))
    else:
        logger.info("Nessun nuovo segnale da inviare.")

if __name__ == "__main__":
    main()
