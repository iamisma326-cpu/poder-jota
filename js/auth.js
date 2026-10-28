// ============================================================
// PODER JOTA — Lógica de autenticación (Neon Auth)
// ============================================================
// Esta lógica se usa en: login.html, registro.html, perfil.html
// y en la navbar de todas las páginas.
// ============================================================

import { getNeon, getSession } from './neon.js';

/**
 * Inicia sesión con email y contraseña
 */
export async function loginWithEmail(email, password) {
  const neon = getNeon();
  const { data, error } = await neon.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (data?.user) await ensureProfile(data.user);
  return data;
}

/**
 * Registra un nuevo usuario con email y contraseña.
 * Neon Auth guarda la identidad; el perfil vive en public.profiles.
 */
export async function registerWithEmail(email, password, fullName, age) {
  const neon = getNeon();
  const { data, error } = await neon.auth.signUp({
    email,
    password,
    name: fullName || undefined,
  });
  if (error) throw error;

  if (data?.user) {
    // El nombre visible vive en public.profiles (Neon Auth no lo guarda
    // al registrarse a través del adaptador compatible con Supabase).
    await ensureProfile(data.user, {
      fullName,
      age: age ? parseInt(age, 10) : null,
    });
  }
  return data;
}

/**
 * Crea el perfil si aún no existe (no hay trigger en Neon Auth).
 */
export async function ensureProfile(user, extra = {}) {
  const neon = getNeon();
  if (!neon || !user?.id) return null;

  const existing = await neon
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const { data, error } = await neon
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: extra.fullName || user.user_metadata?.displayName || null,
      age: extra.age ?? null,
      avatar_url: user.user_metadata?.profileImageUrl || null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Inicia sesión con Google OAuth.
 * Desactivado: el proveedor aún no está configurado en Neon Auth.
 */
export async function loginWithGoogle() {
  throw new Error(
    'El acceso con Google todavía no está disponible. Usa tu correo y contraseña.'
  );
}

/**
 * Cierra la sesión del usuario
 */
export async function logout() {
  const neon = getNeon();
  const { error } = await neon.auth.signOut();
  if (error) throw error;
}

/**
 * Actualiza el perfil del usuario (edad, nombre)
 */
export async function updateProfile(userId, updates) {
  const neon = getNeon();
  const { data, error } = await neon
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Obtiene la membresía activa del usuario
 */
export async function getActiveMembership(userId) {
  const neon = getNeon();
  const { data, error } = await neon
    .from('user_memberships')
    .select('*, memberships(*)')
    .eq('user_id', userId)
    .eq('active', true)
    .gte('end_date', new Date().toISOString())
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Obtiene todos los planes de membresía disponibles
 */
export async function getMembershipPlans() {
  const neon = getNeon();
  const { data, error } = await neon
    .from('memberships')
    .select('*')
    .eq('active', true)
    .order('price', { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Obtiene el historial de pagos del usuario
 */
export async function getPaymentHistory(userId) {
  const neon = getNeon();
  const { data, error } = await neon
    .from('payments')
    .select('*, memberships(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Verifica si un email pertenece a un administrador.
 * Debe coincidir con los emails marcados con is_admin en la tabla profiles,
 * que es lo que aplica la RLS en Postgres.
 */
const ADMIN_EMAILS = ['iamisma326@gmail.com', 'diego.alegres@istpargentina.edu.pe'];

export function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.some(function (adminEmail) {
    return adminEmail.toLowerCase() === email.toLowerCase();
  });
}

/**
 * Inicializa el menú de usuario en la navbar
 * Se llama desde todas las páginas
 */
export async function initUserMenu() {
  const session = await getSession();
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  // Remover link de ingreso anterior si existe
  const existingUserBtn = document.querySelector('.nav__user-btn');
  if (existingUserBtn) existingUserBtn.remove();

  if (!session) {
    // No hay sesión: mostrar "Ingresar"
    const loginLink = document.createElement('a');
    loginLink.href = 'login.html';
    loginLink.className = 'nav__user-btn';
    loginLink.textContent = 'Ingresar';
    // Insertar antes del nav__cta--shine (Contacto)
    const cta = navLinks.querySelector('.nav__cta--shine');
    if (cta) {
      navLinks.insertBefore(loginLink, cta);
    } else {
      navLinks.appendChild(loginLink);
    }
    return;
  }

  // Hay sesión: mostrar avatar con menú desplegable
  const user = session.user;
  const avatarUrl = user.user_metadata?.profileImageUrl || user.user_metadata?.avatar_url;
  const displayName =
    user.user_metadata?.displayName ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  // Contar pagos pendientes (solo admins)
  let pendingCount = 0;
  if (isAdmin(user.email)) {
    try {
      const neon = getNeon();
      const { count } = await neon.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      pendingCount = count || 0;
    } catch (e) {}
  }

  // Contenedor del menú de usuario
  const userMenu = document.createElement('div');
  userMenu.className = 'nav__user-menu';

  // Botón del usuario
  const userBtn = document.createElement('button');
  userBtn.className = 'nav__user-btn nav__user-btn--logged';
  userBtn.setAttribute('aria-label', 'Menú de usuario');
  userBtn.innerHTML = avatarUrl
    ? `<img src="${avatarUrl}" alt="" width="32" height="32" class="nav__user-avatar" />`
    : `<span class="nav__user-initial">${initial}</span>`;

  // Dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'nav__user-dropdown';
  const adminBadge = pendingCount > 0
    ? `<span style="background:rgba(249,168,37,0.15);color:var(--warning);font-size:0.7rem;padding:0.1rem 0.45rem;border-radius:999px;margin-left:0.4rem;font-weight:700;">${pendingCount}</span>`
    : '';
  dropdown.innerHTML = `
    <div class="nav__user-info">
      <span class="nav__user-name">${displayName}</span>
      <span class="nav__user-email">${user.email}</span>
    </div>
    <a href="perfil.html" class="nav__dropdown-link">
      <i class="ph ph-user"></i> Mi Perfil
    </a>
    <a href="perfil.html#membresia" class="nav__dropdown-link">
      <i class="ph ph-crown"></i> Mi Membresía
    </a>
    ${isAdmin(session.user.email) ? `<a href="admin.html" class="nav__dropdown-link">
      <i class="ph ph-shield-check"></i> Admin Panel${adminBadge}
    </a>` : ''}
    <button class="nav__dropdown-link nav__dropdown-link--logout" id="btnLogoutNav">
      <i class="ph ph-sign-out"></i> Cerrar Sesión
    </button>
  `;

  userMenu.appendChild(userBtn);
  userMenu.appendChild(dropdown);
  userMenu.classList.add('nav__user-btn');

  // Toggle dropdown
  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('open');
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', () => {
    userMenu.classList.remove('open');
  });

  // Cerrar sesión
  dropdown.querySelector('#btnLogoutNav')?.addEventListener('click', async () => {
    await logout();
    window.location.href = 'index.html';
  });

  // Insertar en navbar
  const cta = navLinks.querySelector('.nav__cta--shine');
  if (cta) {
    navLinks.insertBefore(userMenu, cta);
  } else {
    navLinks.appendChild(userMenu);
  }
}
