-- Creazione tabella per gli iscritti al bot della Reversal Strategy
CREATE TABLE IF NOT EXISTS public.telegram_subscribers_reversal (
  telegram_chat_id BIGINT PRIMARY KEY,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Attiva Row Level Security (RLS)
ALTER TABLE public.telegram_subscribers_reversal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_subscribers_reversal FORCE ROW LEVEL SECURITY;

-- Revoca ogni accesso pubblico
REVOKE ALL ON TABLE public.telegram_subscribers_reversal FROM PUBLIC;
REVOKE ALL ON TABLE public.telegram_subscribers_reversal FROM anon;
REVOKE ALL ON TABLE public.telegram_subscribers_reversal FROM authenticated;

-- Concedi accesso solo alla Service Role (usata da Cloudflare e GitHub Actions)
GRANT ALL ON TABLE public.telegram_subscribers_reversal TO service_role;
