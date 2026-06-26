// ============================================================
// PODER JOTA — Lógica de autenticación
// ============================================================
// Esta lógica se usa en: login.html, registro.html, perfil.html
// y en la navbar de todas las páginas.
// ============================================================

import { getSupabase, getSession } from './supabase.js';

/**
 * Inicia sesión con email y contraseña
 */
export async function loginWithEmail(email, password) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Registra un nuevo usuario con email y contraseña
 */
export async function registerWithEmail(email, password, fullName, age) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        age: age ? parseInt(age) : null,
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Inicia sesión con Google OAuth
 */
export async function loginWithGoogle() {
  const sb = getSupabase();
  // Detectar si estamos en dev (localhost) o producción
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const redirectTo = isLocal
    ? window.location.origin + '/perfil.html'
    : 'https://poder-jota.vercel.app/perfil.html';

  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Cierra la sesión del usuario
 */
export async function logout() {
  const sb = getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

/**
 * Actualiza el perfil del usuario (edad, nombre)
 */
export async function updateProfile(userId, updates) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .update(updates)
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
  const sb = getSupabase();
  const { data, error } = await sb
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
  const sb = getSupabase();
  const { data, error } = await sb
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
  const sb = getSupabase();
  const { data, error } = await sb
    .from('payments')
    .select('*, memberships(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Verifica si un email pertenece a un administrador
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
  const avatarUrl = user.user_metadata?.avatar_url;
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  // Contar pagos pendientes (solo admins)
  let pendingCount = 0;
  if (isAdmin(user.email)) {
    try {
      const sb = getSupabase();
      const { count } = await sb.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending');
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
