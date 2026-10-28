-- ============================================================
-- PODER JOTA — Esquema inicial para Neon
-- ============================================================
-- Identidad: Neon Auth (schema neon_auth, Better Auth gestionado).
-- El Data API expone el schema `public` con JWT forward automático,
-- así que el control de acceso vive en RLS, igual que en Supabase.
--
-- Aplicar con:
--   psql "$DATABASE_URL" -f db/migrations/001_init.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helpers de identidad
-- ------------------------------------------------------------

-- El JWT de Neon Auth trae el id de usuario; auth.user_id() lo expande.
-- Se marca con profiles.is_admin (no con neon_auth.user.role, porque ese
-- claim "role" lo usa el Data API para elegir el rol de Postgres).
-- SECURITY DEFINER evita la recursión de RLS al leer profiles desde una policy.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id::text = auth.user_id()),
    false
  );
$$;

-- ------------------------------------------------------------
-- 2. Tablas
-- ------------------------------------------------------------

-- Perfil de usuario (1:1 con neon_auth.user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  age INTEGER,
  avatar_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planes de membresía
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membresías contratadas por cada usuario
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'yape',
  payment_provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marca automáticamente como admin a los correos del equipo.
-- Sin esto habría que activar is_admin a mano tras el primer registro.
CREATE OR REPLACE FUNCTION public.set_admin_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe') THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_admin ON public.profiles;
CREATE TRIGGER profiles_set_admin
  BEFORE INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_admin_flag();

-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- profiles: cada usuario ve y edita lo suyo; los admins ven todo
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.user_id() = id::text OR public.is_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_id() = id::text);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.user_id() = id::text)
  WITH CHECK (auth.user_id() = id::text);

-- memberships: catálogo visible para cualquier usuario autenticado
CREATE POLICY "memberships_select_authenticated" ON public.memberships
  FOR SELECT TO authenticated
  USING (true);

-- user_memberships: propias, más acceso de admin
CREATE POLICY "user_memberships_select_own" ON public.user_memberships
  FOR SELECT TO authenticated
  USING (auth.user_id() = user_id::text OR public.is_admin());

CREATE POLICY "user_memberships_insert_own" ON public.user_memberships
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_id() = user_id::text OR public.is_admin());

CREATE POLICY "user_memberships_update_admin" ON public.user_memberships
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- payments: propios, más acceso de admin
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.user_id() = user_id::text OR public.is_admin());

CREATE POLICY "payments_insert_own" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (auth.user_id() = user_id::text);

CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- 4. Permisos para los roles del Data API
-- ------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated, anonymous;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anonymous;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;

-- ------------------------------------------------------------
-- 5. Seed: planes de membresía
-- ------------------------------------------------------------
INSERT INTO public.memberships (name, description, price, duration_days, features)
SELECT * FROM (VALUES
  (
    'Mensual',
    'Acceso completo a todos los cursos del Campus Poder Jota por un mes.',
    49.90::DECIMAL(10,2),
    30,
    '["Acceso a todos los cursos", "Rutinas de entrenamiento", "Seguimiento vía WhatsApp", "Nuevo contenido cada semana"]'::JSONB
  ),
  (
    'Trimestral',
    'Acceso completo por 3 meses con descuento incluido.',
    119.90::DECIMAL(10,2),
    90,
    '["Todo del plan Mensual", "2 sesiones de videollamada con Jota", "Plan personalizado de nutrición", "Descuento en sesiones presenciales"]'::JSONB
  ),
  (
    'Anual',
    'Acceso completo por 12 meses. El mejor precio por mes.',
    399.90::DECIMAL(10,2),
    365,
    '["Todo del plan Trimestral", "4 sesiones de videollamada con Jota", "Merchandising Poder Jota", "Acceso anticipado a nuevos cursos", "Soporte prioritario 24/7"]'::JSONB
  )
) AS seed(name, description, price, duration_days, features)
WHERE NOT EXISTS (SELECT 1 FROM public.memberships);
