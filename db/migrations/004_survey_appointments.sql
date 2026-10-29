-- ============================================================
-- PODER JOTA — Migración 004: encuesta de bienvenida y citas de asesoría
-- ============================================================
-- survey_responses: una encuesta por usuario (obligatoria tras el registro).
-- appointments: citas gratis por Meet/Zoom que pide el usuario.
--   El usuario propone fecha y hora; el admin confirma y pone el enlace.
--
-- Aplicar con:
--   psql "$DATABASE_URL_UNPOOLED" -f db/migrations/004_survey_appointments.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tablas
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  survey_id    UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  preferred_at TIMESTAMPTZ NOT NULL,
  channel      TEXT NOT NULL CHECK (channel IN ('meet', 'zoom')),
  user_notes   TEXT,
  status       TEXT NOT NULL DEFAULT 'pendiente'
               CHECK (status IN ('pendiente', 'confirmada', 'realizada', 'cancelada')),
  meeting_url  TEXT,
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_user_idx ON public.appointments (user_id);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON public.appointments (status, preferred_at);

-- ------------------------------------------------------------
-- 2. Row Level Security
-- ------------------------------------------------------------

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- survey_responses: cada usuario crea, lee y actualiza la suya; el admin lee todas
CREATE POLICY "survey_select_own" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (auth.user_id() = user_id::text OR public.is_admin());

CREATE POLICY "survey_insert_own" ON public.survey_responses
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_id() = user_id::text);

CREATE POLICY "survey_update_own" ON public.survey_responses
  FOR UPDATE TO authenticated
  USING (auth.user_id() = user_id::text)
  WITH CHECK (auth.user_id() = user_id::text);

-- appointments: el usuario crea y lee las suyas; solo el admin cambia estado y enlace
CREATE POLICY "appointments_select_own" ON public.appointments
  FOR SELECT TO authenticated
  USING (auth.user_id() = user_id::text OR public.is_admin());

CREATE POLICY "appointments_insert_own" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_id() = user_id::text);

CREATE POLICY "appointments_update_admin" ON public.appointments
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- 3. Permisos para los roles del Data API
-- ------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.survey_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;
