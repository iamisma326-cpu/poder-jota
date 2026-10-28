-- ============================================================
-- PODER JOTA — Migración 003: teléfono de contacto en profiles
-- ============================================================
-- El teléfono es opcional: no se pide al crear la cuenta, el usuario
-- lo añade desde su perfil. Sirve como forma de contacto, y solo se
-- usa para promociones si el usuario marca promo_opt_in.
--
-- Las políticas RLS y los GRANT de profiles (migración 001) ya
-- cubren las columnas nuevas: cada usuario solo edita su propia fila.
--
-- Aplicar con:
--   psql "$DATABASE_URL_UNPOOLED" -f db/migrations/003_profile_phone.sql
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS promo_opt_in BOOLEAN NOT NULL DEFAULT false;

-- Formato peruano de celular: 9 dígitos, empieza en 9.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format
  CHECK (phone IS NULL OR phone ~ '^9[0-9]{8}$');
