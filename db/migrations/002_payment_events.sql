-- ============================================================
-- PODER JOTA — Migración 002: eventos de pago para Neon Realtime
-- ============================================================
-- Neon Realtime (beta) rechaza cualquier consulta que toque una
-- tabla con RLS habilitado ("unsupported query: row security"),
-- y las cuatro tablas de la app lo tienen. Por eso el directo no
-- puede suscribirse a `payments`.
--
-- Solución: tabla de eventos SIN RLS y SIN permisos para los
-- roles del Data API. Un trigger la rellena en cada INSERT de
-- `payments`; la lee solo el motor de Realtime (rol privilegiado)
-- a través del sello que entrega la función `seal`.
--
-- Resultado: el navegador no gana ningún acceso nuevo (sigue sin
-- poder leer esta tabla por el Data API), pero el directo funciona.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_events_created_at_idx
  ON public.payment_events (created_at DESC);

-- Sin RLS a propósito: es lo que Realtime exige. La protección es
-- por privilegios: nadie fuera del motor de Realtime la lee.
ALTER TABLE public.payment_events DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_events FROM authenticated, anonymous, PUBLIC;

-- Trigger: cada INSERT en payments deja su evento.
CREATE OR REPLACE FUNCTION public.log_payment_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.payment_events (payment_id, user_id, membership_id, amount, status)
  VALUES (NEW.id, NEW.user_id, NEW.membership_id, NEW.amount, NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS payments_log_event ON public.payments;
CREATE TRIGGER payments_log_event
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_payment_event();
