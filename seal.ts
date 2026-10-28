// ============================================================
// PODER JOTA — Función Neon "seal"
// ============================================================
// Sellá (encripta) la consulta en vivo de pagos para que el
// navegador pueda suscribirse a ella con Neon Realtime.
//
// Por qué una función y no el navegador: el sello requiere
// NEON_REALTIME_SECRET, que jamás puede salir del servidor.
// El navegador recibe solo el sello (bearer de corta vida).
//
// Autenticación:
//   1. Verifica el JWT de Neon Auth contra el JWKS inyectado.
//   2. Consulta profiles.is_admin con ese mismo JWT (RLS).
//      Solo un administrador recibe el sello.
// ============================================================

import { createRealtime, rawSql } from "@neon/realtime/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

type PaymentRow = {
  id: string;
  payment_id: string;
  user_id: string;
  membership_id: string | null;
  amount: string;
  status: string;
  created_at: string;
};

// Orígenes con permiso para llamar a esta función
const ALLOWED_ORIGINS = [
  "https://poder-jota.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

// Única consulta que se sella: el listado de pagos que muestra el panel.
// Va contra payment_events (sin RLS) porque Realtime rechaza las tablas
// con RLS. El trigger de la migración 002 la mantiene al día.
const PAYMENTS_SQL =
  "SELECT id, payment_id, user_id, membership_id, amount, status, created_at " +
  "FROM payment_events ORDER BY created_at DESC LIMIT 100";

const jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));
const issuer = new URL(process.env.NEON_AUTH_BASE_URL!).origin;

let realtime: ReturnType<typeof createRealtime> | null = null;

function getRealtime() {
  if (!realtime) {
    realtime = createRealtime({
      secret: process.env.NEON_REALTIME_SECRET!,
      db: "neondb",
    });
  }
  return realtime;
}

function cors(origin: string | null): Record<string, string> | null {
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return Response.json(body, { status, headers });
}

export default async function seal(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const headers = cors(origin);
  if (!headers) return new Response("Forbidden origin", { status: 403 });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, headers);
  }

  // 1. JWT de Neon Auth
  const auth = request.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Unauthorized" }, 401, headers);
  }
  const token = auth.slice(7);
  try {
    await jwtVerify(token, jwks, { issuer });
  } catch {
    return json({ error: "Unauthorized" }, 401, headers);
  }

  // 2. ¿Es admin? (RLS devuelve solo la fila del propio usuario)
  try {
    const res = await fetch(
      `${process.env.NEON_DATA_API_URL}/profiles?select=is_admin`,
      { headers: { Authorization: `Bearer ${token}`, Origin: origin! } }
    );
    const rows = (await res.json()) as Array<{ is_admin: boolean }>;
    if (!res.ok || !rows[0]?.is_admin) {
      return json({ error: "Forbidden" }, 403, headers);
    }
  } catch {
    return json({ error: "Forbidden" }, 403, headers);
  }

  // 3. Sellar la consulta
  try {
    const sealed = await getRealtime().seal({
      query: rawSql<PaymentRow>(PAYMENTS_SQL),
    });
    return json(sealed, 200, headers);
  } catch (err) {
    console.error("seal failed", err);
    return json({ error: "Could not seal the query" }, 500, headers);
  }
}
