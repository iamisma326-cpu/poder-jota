-- ============================================================
-- PODER JOTA — Migración 002: Políticas de administrador
-- ============================================================
-- Permite que los admins (por email) vean y gestionen
-- todos los pagos y membresías de usuarios.
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. POLÍTICAS PARA PAYMENTS
-- ============================================================

-- Admin: puede ver todos los pagos
CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    auth.email() IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe')
  );

-- Admin: puede actualizar cualquier pago (aprobar/rechazar)
CREATE POLICY "Admins can update all payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    auth.email() IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe')
  )
  WITH CHECK (
    auth.email() IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe')
  );

-- ============================================================
-- 2. POLÍTICAS PARA USER_MEMBERSHIPS
-- ============================================================

-- Admin: puede ver todas las membresías
CREATE POLICY "Admins can view all memberships"
  ON public.user_memberships FOR SELECT
  TO authenticated
  USING (
    auth.email() IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe')
  );

-- Admin: puede insertar membresías para cualquier usuario
CREATE POLICY "Admins can insert memberships for any user"
  ON public.user_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.email() IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe')
  );

-- Admin: puede actualizar membresías
CREATE POLICY "Admins can update all memberships"
  ON public.user_memberships FOR UPDATE
  TO authenticated
  USING (
    auth.email() IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe')
  )
  WITH CHECK (
    auth.email() IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe')
  );

-- ============================================================
-- 3. POLÍTICAS PARA PROFILES (admin puede ver perfiles)
-- ============================================================

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.email() IN ('iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe')
  );

-- ============================================================
-- 4. POLÍTICAS PARA MEMBERSHIPS (ya existe, pero agregamos admin)
-- Nota: memberships ya tiene policy para authenticated users,
-- así que no hace falta cambiarla.
-- ============================================================
