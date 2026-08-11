export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const update = await request.json();
      
      // Assicurati che ci sia un messaggio di testo
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;

        if (text === "/start" || text === "/iscrivimi") {
          await this.handleStart(chatId, env);
          await this.sendMessage(chatId, "✅ Ti sei iscritto con successo alle notifiche per la Reversal Strategy!", env);
        } else if (text === "/stop" || text === "/rimuovimi") {
          await this.handleStop(chatId, env);
          await this.sendMessage(chatId, "❌ Ti sei disiscritto dalle notifiche per la Reversal Strategy.", env);
        }
      }
      
      // Rispondi sempre con 200 OK a Telegram
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error(error);
      return new Response("Error", { status: 500 });
    }
  },

  async handleStart(chatId, env) {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    // Esegui la query REST verso Supabase per inserire l'iscritto
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
        text: text
      })
    });
  }
};
