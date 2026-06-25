# 🚀 Plan: Login, Membresías y Pagos — Poder Jota

## Resumen del proyecto actual

- **Stack**: HTML estático multi-página con Vite, CSS custom properties, Vanilla JS
- **Hosting**: Vercel (gratuito)
- **Paleta**: Peruana/cristiana — rojo-bandera, amarillo-oro, lima-voltio, verde-cancha, carbon-andino
- **Sin backend, sin BD, sin auth**

## Objetivo

Implementar: autenticación (email + Google OAuth) → membresías mensuales → pago con Yape → acceso a cursos.

---

## FASE 1: INFRAESTRUCTURA (Supabase + Vercel)

### 1.1 Crear proyecto en Supabase

- Ir a [supabase.com](https://supabase.com) → New Project
- Crear base de datos PostgreSQL
- Obtener: `SUPABASE_URL` + `SUPABASE_ANON_KEY` (pública) + `SUPABASE_SERVICE_ROLE_KEY` (privada)
- Habilitar **Google OAuth** en Authentication > Providers > Google:
  - Crear OAuth Client ID en [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - Copiar callback URL de Supabase y pegarla en Google Cloud como Authorized Redirect URI
  - Pegar Client ID y Client Secret en Supabase

### 1.2 Conectar Supabase MCP (opcional para desarrollo)

Configurar en `.mcp.json`:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```
Luego autenticar con `claude /mcp` (abre navegador).

### 1.3 Crear tablas en Supabase

```sql
-- Tabla: perfiles de usuario (se crea al registrarse)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  age INTEGER,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: planes de membresía
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: membresías de usuarios
CREATE TABLE user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  membership_id UUID REFERENCES memberships(id) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: pagos
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  membership_id UUID REFERENCES memberships(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'yape', 'culqi', 'mercadopago'
  payment_provider TEXT NOT NULL, -- 'culqi', 'mercadopago'
  provider_payment_id TEXT, -- ID del pago en la pasarela
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS (Row Level Security):**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para user_memberships
CREATE POLICY "Users can view own memberships"
  ON user_memberships FOR SELECT
  USING (auth.uid() = user_id);

-- Políticas para payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);
```

### 1.4 Poblar tabla de membresías (seed data)

Insertar 2-3 planes (ej. "Mensual", "Trimestral", "Anual") con precios en soles.

---

## FASE 2: INTERFAZ DE USUARIO (HTML/CSS/JS)

### 2.1 Navbar: agregar enlace "Ingresar" + menú de usuario

**Modificar:** `css/styles.css`
**Modificar:** `index.html`, `fitness.html`, `futbol.html`, `campus.html`, `precios.html`, `contacto.html`

- Si NO hay sesión: mostrar "Ingresar" en navbar
- Si HAY sesión: mostrar avatar + nombre (menú desplegable con perfil, membresía, cerrar sesión)
- Estilo: respetar paleta de colores (lima-voltio, amarillo-oro, oscuros)

### 2.2 Página de Login (`login.html`)

**Nuevo archivo:** `login.html`
**Nuevo archivo:** `js/auth.js` (lógica compartida de autenticación)
**Modificar:** `vite.config.ts` (agregar entrada)

Diseño:
- Layout centrado con fondo oscuro
- Tarjeta estilizada con borde lima-voltio
- Título "Ingresa a Poder Jota"
- Inputs: email + password
- Botón "Ingresar" (primary, lima-voltio)
- Separador "O continúa con"
- Botón "Continuar con Google" (con icono)
- Enlace "¿No tienes cuenta? Regístrate"
- Estados: loading, error, éxito

### 2.3 Página de Registro (`registro.html`)

**Nuevo archivo:** `registro.html`
**Modificar:** `vite.config.ts`

Diseño:
- Mismo layout que login
- Título "Crea tu cuenta Poder Jota"
- Inputs: nombre completo, email, edad, contraseña, confirmar contraseña
- Botón "Crear cuenta" (primario)
- Botón "Registrarse con Google"
- Enlace "¿Ya tienes cuenta? Inicia sesión"
- Validación de formulario

### 2.4 Dashboard / Perfil de Usuario (`perfil.html`)

**Nuevo archivo:** `perfil.html`
**Modificar:** `vite.config.ts`
**Nuevo archivo:** `js/perfil.js`

Diseño:
- Menú lateral con secciones:
  - **Mi Perfil**: avatar, nombre, email, edad, editar datos
  - **Mi Membresía**: plan actual, fecha de expiración, días restantes
  - **Comprar Membresía**: lista de planes con precios, botón "Comprar"
  - **Historial**: pagos realizados

Visual:
- Sidebar compacto (o tabs en mobile)
- Colores oscuros con acentos lima-voltio y amarillo-oro
- Tarjetas de membresía con efectos hover
- Avatar circular con initiales como fallback

---

## FASE 3: LÓGICA DE AUTENTICACIÓN (JS + Supabase)

### 3.1 Configurar Supabase Client

```js
// js/supabase.js
const SUPABASE_URL = 'https://xxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // importante para OAuth
  },
});
```

### 3.2 Auth flow

**Registro con email:**
```js
const { data, error } = await supabaseClient.auth.signUp({
  email,
  password,
  options: {
    data: { full_name, age }
  }
});
// Al confirmar email, trigger de BD crea perfil automáticamente
```

**Login con email:**
```js
const { data, error } = await supabaseClient.auth.signInWithPassword({
  email,
  password,
});
```

**Login con Google:**
```js
const { data, error } = await supabaseClient.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://poder-jota.vercel.app/perfil.html'
  }
});
```
- Google devuelve: `user_metadata.full_name`, `user_metadata.avatar_url`, `email`
- **Edad no la da Google** — se puede pedir al usuario en un onboarding posterior

**Onboarding de edad:**
Después del primer login con Google, redirigir a un mini-formulario donde el usuario ingrese su edad (solo una vez).

**Cerrar sesión:**
```js
await supabaseClient.auth.signOut();
```

**Detectar sesión activa:**
```js
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session) {
    // usuario logueado
    const user = session.user;
    // nombre: user.user_metadata.full_name
    // avatar: user.user_metadata.avatar_url
  }
});
```

**Trigger automático (crear perfil al registrarse):**
En Supabase Dashboard > Database > Triggers, crear un trigger SQL:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## FASE 4: PAGOS CON MERCADO PAGO + YAPE

### 4.1 Elección: **Mercado Pago** (recomendado)

Por qué:
- ✅ Mejor documentación para Perú
- ✅ Checkout Pro embebido (no requiere backend pesado)
- ✅ Webhooks (IPN) para automatizar activación de membresías
- ✅ SDK JS listo para vanilla HTML
- ✅ Yape soportado nativamente
- Comisión: ~3.5-4% por transacción

### 4.2 Configurar Mercado Pago

1. Crear cuenta en [Mercado Pago Developers](https://developers.mercadopago.com.pe/)
2. Obtener `Access Token` (producción) y `Public Key`
3. Configurar Webhook URL: `https://tu-sitio.vercel.app/api/webhook`
4. Configurar IPN en dashboard de MP

### 4.3 Edge Function en Supabase para webhook (SERVIDOR)

**Crear:** `supabase/functions/payment-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const body = await req.json();
  // Validar firma del webhook
  // Buscar payment en tabla payments por provider_payment_id
  // Si status = "approved", activar membresía:
  //   - INSERT en user_memberships
  //   - UPDATE payments SET status = 'completed'
  // Devolver 200 OK
});
```

**Hacer deploy:** `supabase functions deploy payment-webhook`

### 4.4 Integración en frontend (perfil.html)

```js
// js/pago.js
const mp = new MercadoPago('PUBLIC_KEY', { locale: 'es-PE' });

async function comprarMembresia(planId, precio) {
  // Crear preferencia via Edge Function o Vercel Function
  const response = await fetch('/api/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, userId, precio }),
  });
  const preference = await response.json();

  // Abrir checkout de Mercado Pago
  mp.checkout({
    preference: { id: preference.id },
    render: { container: '.checkout-container', label: 'Pagar con Yape' },
  });
}
```

**Nota:** La creación de preferencias requiere Access Token secreto, por lo que debe hacerse desde:
- **Opción A:** Edge Function de Supabase
- **Opción B:** Vercel Serverless Function (API Route)

### 4.5 API endpoint en Vercel (recomendado)

Crear: `api/create-preference.js` (se deploya automáticamente con Vercel)

```js
// api/create-preference.js
import mercadopago from 'mercadopago';

export default async function handler(req, res) {
  mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
  
  const preference = await mercadopago.preferences.create({
    items: [{
      title: req.body.planName,
      unit_price: req.body.price,
      quantity: 1,
    }],
    payer: { email: req.body.email },
    back_urls: {
      success: 'https://poder-jota.vercel.app/perfil.html?pago=exitoso',
      failure: 'https://poder-jota.vercel.app/perfil.html?pago=fallido',
    },
    notification_url: 'https://poder-jota.vercel.app/api/webhook',
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }],
    },
  });
  
  res.json({ id: preference.body.id });
}
```

Vercel deploya automáticamente los archivos en `/api/*` como serverless functions.

---

## FASE 5: VARIABLES DE ENTORNO

En Vercel (Settings > Environment Variables):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
MP_ACCESS_TOKEN=APP_USR-xxx
MP_PUBLIC_KEY=APP_USR-xxx
```

En el frontend (archivo de config):
```js
// js/config.js
window.ENV = {
  SUPABASE_URL: 'https://xxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...',
  MP_PUBLIC_KEY: 'APP_USR-xxx',
};
```

**Las keys públicas pueden ir en el frontend sin riesgo.** Las privadas SOLO en el servidor (Vercel API / Supabase Edge Functions).

---

## FASE 6: IMPLEMENTACIÓN DETALLADA (orden)

### Paso 1: Crear proyecto Supabase
- Manual (UI de Supabase) o vía MCP
- Crear base de datos
- Habilitar Google OAuth
- Ejecutar SQL de tablas + RLS + triggers

### Paso 2: Configurar variables de entorno en Vercel
- Agregar SUPABASE_URL, SUPABASE_ANON_KEY, MP_PUBLIC_KEY

### Paso 3: Crear archivos JS compartidos
- `js/supabase.js` — cliente Supabase
- `js/auth.js` — lógica de login/registro/logout
- `js/perfil.js` — lógica del dashboard
- `js/pago.js` — integración Mercado Pago

### Paso 4: Crear páginas
- `login.html` — formulario de inicio de sesión
- `registro.html` — formulario de registro
- `perfil.html` — dashboard de usuario

### Paso 5: Modificar navbar en TODOS los HTML
- Agregar "Ingresar" (si no hay sesión)
- Agregar menú desplegable de usuario (si hay sesión)
- Agregar CDN de Supabase JS y Mercado Pago JS

### Paso 6: Actualizar vite.config.ts
- Agregar entradas: login, registro, perfil

### Paso 7: Crear API endpoints de Vercel
- `api/create-preference.js` — crear preferencia de pago
- `api/webhook.js` — recibir notificación de pago

### Paso 8: Crear Edge Function de Supabase
- `payment-webhook` — alternativa/backup para webhook

### Paso 9: Poblar tabla memberships con seed data
- Mensual: S/ 49.90
- Trimestral: S/ 119.90
- Anual: S/ 399.90

### Paso 10: Probar flujo completo
1. Visitar sitio → ver "Ingresar" en navbar
2. Click → login.html
3. Registrarse con email o Google
4. Ser redirigido a perfil.html
5. Ver nombre, avatar, email
6. Comprar membresía → checkout de MP con Yape
7. Pago exitoso → membresía activa
8. Ver membresía en dashboard

---

## VERIFICACIÓN

1. **Local**: `npm run dev` — probar todas las páginas nuevas
2. **Auth**: Probar registro/login con email y Google OAuth
3. **Dashboard**: Verificar que muestra datos del usuario correctamente
4. **Pagos**: Probar con credenciales de prueba de Mercado Pago
5. **Webhook**: Simular pago exitoso y verificar que activa membresía en BD
6. **RLS**: Verificar que usuario no ve datos de otros usuarios
7. **Build**: `npm run build` — sin errores
8. **Deploy**: Push a GitHub → Vercel auto-deploy

---

## TECNOLOGÍAS A AGREGAR

| Tecnología | Uso | Tipo |
|-----------|-----|------|
| `@supabase/supabase-js` (CDN) | Cliente de BD + Auth | Frontend |
| `mercadopago.js` (SDK) | Checkout de pagos con Yape | Frontend |
| `mercadopago` (npm) | API de preferencias (server) | Backend (Vercel API) |
| Supabase Edge Functions | Webhooks + lógica serverless | Backend |
| Vercel API Routes | Endpoints de pago | Backend |

---

## COSTOS

| Servicio | Costo |
|----------|-------|
| Supabase (free) | 500MB BD, 50k MAU, 1GB storage ✅ |
| Vercel (free) | 100GB bandwidth, serverless functions ✅ |
| Mercado Pago | ~3.5-4% por transacción |
| Total mensual base | **S/ 0** (solo comisiones por venta) |

---

## YAPE: LO QUE DEBES SABER

⚠️ **Yape NO tiene API pública.** No se puede integrar directamente.

✅ **Solución real:** Usar Mercado Pago como intermediario. El checkout de MP ofrece Yape como método de pago. Cuando el usuario paga con Yape en el checkout de MP:

1. Usuario escanea QR o ingresa su número + código OTP
2. Mercado Pago recibe el pago
3. MP envía webhook a tu servidor
4. Tu servidor activa la membresía automáticamente

**No necesitas API key de Yape.** Necesitas:
- Cuenta de Mercado Pago (vendedor)
- Access Token de MP
- Public Key de MP

---

## 🔑 PASOS INMEDIATOS QUE DEBES HACER TÚ

1. **Crear cuenta en Supabase** → [supabase.com](https://supabase.com)
2. **Crear proyecto** y obtener URL + anon key
3. **Habilitar Google OAuth** → Consola de Google Cloud + Supabase Auth
4. **Crear cuenta en Mercado Pago Developer** → [developers.mercadopago.com.pe](https://developers.mercadopago.com.pe/)
5. **Obtener Access Token y Public Key** de MP
6. **Configurar variables de entorno** en Vercel
7. **Compartirme las keys** (públicas van al frontend, privadas van a Vercel) para configurar el resto automáticamente
