// ============================================================
// PODER JOTA — Cliente Supabase
// ============================================================
// Las keys se cargan desde variables de entorno (Vite)
// o desde un objeto global config.js en producción estática
// ============================================================

// Intentar cargar desde Vite env vars primero
const supabaseUrl =
  import.meta?.env?.VITE_SUPABASE_URL ||
  window.ENV?.SUPABASE_URL ||
  'https://cgqerygskfuctvfwgpxv.supabase.co';

const supabaseAnonKey =
  import.meta?.env?.VITE_SUPABASE_ANON_KEY ||
  window.ENV?.SUPABASE_ANON_KEY ||
  'sb_publishable_I8iqpE0e6IbDwyxVwpaQJA_odh4PT3g';

// Inicializar cliente Supabase
let supabaseClient = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (typeof supabase !== 'undefined') {
    // Cargado desde CDN
    supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseClient;
}

// ============================================================
// Utilidades de autenticación
// ============================================================

/**
 * Obtiene la sesión actual del usuario
 */
export async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

/**
 * Obtiene el perfil del usuario desde la tabla profiles
 */
export async function getUserProfile(userId) {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

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
  const sb = getSupabase();
  if (!sb) return () => {};

  const { data } = sb.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data?.subscription?.unsubscribe || (() => {});
}
