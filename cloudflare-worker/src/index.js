export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const update = await request.json();
      
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.toLowerCase().trim();

        if (text === "/start" || text === "/iscriviti" || text === "/iscrivimi") {
          await this.handleStart(chatId, env);
          await this.sendMessage(chatId, "✅ Ti sei iscritto con successo alle notifiche per la Reversal Strategy!\nRiceverai un messaggio automatico non appena si verificheranno le condizioni di acquisto.", env);
        
        } else if (text === "/stop" || text === "/disiscriviti" || text === "/rimuovimi") {
          await this.handleStop(chatId, env);
          await this.sendMessage(chatId, "❌ Ti sei disiscritto dalle notifiche per la Reversal Strategy.", env);
        
        } else if (text === "/condizioni") {
          const condizioniTesto = 
            "📈 <b>CONDIZIONI DELLA REVERSAL STRATEGY</b> 📈\n\n" +
            "La strategia cerca opportunità di acquisto (Long) quando:\n\n" +
            "1️⃣ <b>RSI 15 min:</b> <= 30 (Ipervenduto nel breve termine)\n" +
            "2️⃣ <b>RSI 1 ora:</b> <= 35 (Debolezza nel medio termine)\n" +
            "3️⃣ <b>Distanza SMA 100:</b> Il prezzo deve essere distante dalla SMA 100 giornaliera per almeno 1.5 volte la SMA 10 dell'ATR 14 giornaliero.";
          await this.sendMessage(chatId, condizioniTesto, env);
          
        } else if (text === "/segnale") {
          await this.handleSegnale(chatId, env);
        }
      }
      
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error(error);
      return new Response("Error", { status: 500 });
    }
  },

  async handleStart(chatId, env) {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/telegram_subscribers_reversal`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates"
      },
      body: JSON.stringify({ telegram_chat_id: chatId })
    });

    if (!response.ok) {
      console.error("Errore salvataggio in Supabase:", await response.text());
    }
  },

  async handleStop(chatId, env) {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/telegram_subscribers_reversal?telegram_chat_id=eq.${chatId}`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      console.error("Errore rimozione da Supabase:", await response.text());
    }
  },

  async handleSegnale(chatId, env) {
    try {
      // Recupera lo status JSON da GitHub Pages
      const response = await fetch("https://giuse2003.github.io/reversal_strategy/live-status.json?t=" + Date.now());
      if (!response.ok) throw new Error("File json non trovato");
      
      const json = await response.json();
      const data = json.data || json;
      
      let msg = "📊 <b>RIEPILOGO CROSS VALUTARI</b> 📊\n\n";
      
      data.forEach(item => {
        msg += `<b>${item.symbol}</b> - Prezzo: ${item.price}\n`;
        msg += `RSI 15': ${item.rsi_15m} ${item.condition_1_met ? '✅' : '❌'}\n`;
        msg += `RSI 1H: ${item.rsi_1h} ${item.condition_2_met ? '✅' : '❌'}\n`;
        const distFormattata = item.distance > 0 ? '+' + item.distance : item.distance;
        msg += `Dist. SMA100: ${distFormattata} ${item.condition_3_met ? '✅' : '❌'}\n`;
        msg += `Stato: ${item.is_buy ? '🟢 BUY SIGNAL' : '⏳ IN ATTESA'}\n\n`;
      });
      
      // Aggiunge la data di ultimo aggiornamento
      if (json.timestamp) {
        const dataAgg = new Date(json.timestamp);
        msg += `<i>Ultimo aggiornamento: ${dataAgg.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}</i>`;
      }
      
      await this.sendMessage(chatId, msg, env);
      
    } catch (err) {
      console.error("Errore /segnale:", err);
      await this.sendMessage(chatId, "⚠️ Errore nel recuperare i dati. Riprova tra qualche minuto.", env);
    }
  },

  async sendMessage(chatId, text, env) {
    const token = env.TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
      })
    });
  }
};
