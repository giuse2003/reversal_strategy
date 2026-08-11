# Guida al Deployment Serverless (Reversal Strategy)

Abbiamo trasformato il progetto per funzionare senza un server perennemente acceso, esattamente come hai fatto in `BTC_Prudential_Signal`. Ora ti guido nei 3 passaggi finali per mettere tutto online.

## 1. Configurazione Supabase

Poiché mi hai chiesto di mantenere i due progetti **assolutamente separati**, puoi decidere di:
- (Opzione A): Creare un **nuovo progetto** Supabase chiamato `reversal-strategy`.
- (Opzione B): Usare lo stesso progetto Supabase che hai già (`crypto-prudential-signal`), ma usando la **nuova tabella separata** che abbiamo appena creato, in modo che i dati dei due bot non si mischino mai.

Ecco cosa fare:
1. Vai su [Supabase](https://supabase.com/dashboard) e apri il SQL Editor.
2. Apri il file `supabase/telegram_subscribers_reversal.sql` che trovi in questo progetto e incollane il contenuto.
3. Esegui lo script. Verrà creata la tabella **`telegram_subscribers_reversal`**.
4. Vai in `Project Settings > API` e recupera queste due credenziali:
   - **`Project URL`** (sarà la variabile `SUPABASE_URL`)
   - **`service_role secret`** (sarà la variabile `SUPABASE_SERVICE_ROLE_KEY`)

## 2. Configurazione GitHub (Pages e Actions)

1. Pubblica o pusha il codice su un **nuovo repository GitHub** (es. `reversal_strategy`).
2. Vai in **Settings > Secrets and variables > Actions**.
3. Aggiungi i seguenti **New repository secret**:
   - `TELEGRAM_BOT_TOKEN`: Il token del tuo bot Telegram (creato con BotFather).
   - `SUPABASE_URL`: L'URL preso da Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: La chiave Service Role presa da Supabase.
4. Vai in **Settings > Pages**. 
   - Sotto "Build and deployment", come "Source" scegli `Deploy from a branch`.
   - Come "Branch" seleziona `main` e come cartella seleziona `/docs`.
   - Clicca **Save**. Dopo un minuto la dashboard sarà online!

## 3. Configurazione Webhook (Cloudflare Workers)

Per fare in modo che il bot risponda a `/start` e salvi gli utenti:
1. Apri un terminale nella cartella `cloudflare-worker/` e lancia il comando:
   ```bash
   npx wrangler login
   ```
2. Poi pubblica il worker:
   ```bash
   npx wrangler deploy
   ```
3. Cloudflare ti darà un URL (es. `https://reversal-strategy-bot.tuonome.workers.dev`).
4. Vai sulla Dashboard di Cloudflare, apri il tuo nuovo Worker, vai su **Settings > Variables and Secrets** e aggiungi le stesse 3 variabili (come variabili criptate/segrete):
   - `TELEGRAM_BOT_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Infine, imposta il Webhook di Telegram aprendo questo link nel tuo browser (sostituisci il token e l'url del worker):
   ```
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<URL_DEL_WORKER>
   ```

Tutto fatto! Il sistema adesso è automatizzato: GitHub eseguirà `monitor.py` ogni 5 minuti e Cloudflare gestirà gli iscritti!
