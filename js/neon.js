// ============================================================
// PODER JOTA — Cliente Neon
// ============================================================
// Un solo cliente para todo:
//   - Neon Auth (Better Auth gestionado) para el login
//   - Neon Data API (PostgREST) para las consultas a Postgres
//
// Las URLs vienen de variables de entorno de Vite (ver .env.example).
// Usamos el adaptador compatible con Supabase para conservar la API
// que ya usa el proyecto (auth.signInWithPassword, from().select(), …).
// ============================================================

import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';

// Referencias literales: Vite solo sustituye `import.meta.env.X`
// (con `import.meta?.env` la sustitución no ocurre y queda undefined).
const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

let neonClient = null;

/**
 * Devuelve el cliente de Neon (auth + datos), creándolo la primera vez.
 */
export function getNeon() {
  if (neonClient) return neonClient;

  if (!authUrl || !dataApiUrl) {
    console.error(
      'Faltan VITE_NEON_AUTH_URL o VITE_NEON_DATA_API_URL. Copia .env.example a .env.local y rellénalo.'
    );
    return null;
  }

  neonClient = createClient({
    auth: { url: authUrl, adapter: SupabaseAuthAdapter() },
    dataApi: { url: dataApiUrl },
  });

  return neonClient;
}

// ============================================================
// Utilidades de autenticación
// ============================================================

/**
 * Obtiene la sesión actual del usuario
 */
export async function getSession() {
  const neon = getNeon();
  if (!neon) return null;

  const { data, error } = await neon.auth.getSession();
  if (error || !data?.session) return null;
  return data.session;
}

/**
 * Obtiene el perfil del usuario desde la tabla profiles
 */
export async function getUserProfile(userId) {
  const neon = getNeon();
  if (!neon) return null;

  const { data, error } = await neon
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

/**
 * Escucha cambios en el estado de autenticación
 */
export function onAuthStateChange(callback) {
  const neon = getNeon();
  if (!neon) return () => {};

  const { data } = neon.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data?.subscription?.unsubscribe || (() => {});
}
