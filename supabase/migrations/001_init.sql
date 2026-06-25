-- ============================================================
-- PODER JOTA — Migración inicial: Auth, perfiles, membresías
-- ============================================================
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- PEGA TODO y haz clic en "RUN"
-- ============================================================

-- 1. TABLA: perfiles de usuario (se sincroniza con auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  age INTEGER,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: planes de membresía
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

-- 3. TABLA: membresías de usuarios
CREATE TABLE IF NOT EXISTS public.user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: pagos
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

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Profiles: cada usuario solo ve/edita su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Memberships: todos los usuarios autenticados pueden ver planes
CREATE POLICY "Authenticated users can view memberships"
  ON public.memberships FOR SELECT
  TO authenticated
  USING (true);

-- User memberships: cada usuario solo ve sus propias membresías
CREATE POLICY "Users can view own memberships"
  ON public.user_memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memberships"
  ON public.user_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Payments: cada usuario solo ve sus propios pagos
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. TRIGGER: Crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, age)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si ya existe para evitar duplicados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. SEED DATA: Planes de membresía
-- ============================================================
INSERT INTO public.memberships (name, description, price, duration_days, features)
VALUES
  (
    'Mensual',
    'Acceso completo a todos los cursos del Campus Poder Jota por un mes.',
    49.90,
    30,
    '["Acceso a todos los cursos", "Rutinas de entrenamiento", "Seguimiento vía WhatsApp", "Nuevo contenido cada semana"]'
  ),
  (
    'Trimestral',
    'Acceso completo por 3 meses con descuento incluido.',
    119.90,
    90,
    '["Todo del plan Mensual", "2 sesiones de videollamada con Jota", "Plan personalizado de nutrición", "Descuento en sesiones presenciales"]'
  ),
  (
    'Anual',
    'Acceso completo por 12 meses. El mejor precio por mes.',
    399.90,
    365,
    '["Todo del plan Trimestral", "4 sesiones de videollamada con Jota", "Merchandising Poder Jota", "Acceso anticipado a nuevos cursos", "Soporte prioritario 24/7"]'
  );
