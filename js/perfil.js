// ============================================================
// PODER JOTA — Dashboard de usuario (perfil.html)
// ============================================================

import { getSupabase, getSession, getUserProfile } from './supabase.js';
import { getActiveMembership, getMembershipPlans, getPaymentHistory, logout, updateProfile } from './auth.js';

async function initPerfil() {
  const sb = getSupabase();
  if (!sb) {
    document.getElementById('app').innerHTML = '<p class="lead" style="text-align:center;padding:4rem;">Error al cargar Supabase. Verifica la conexión.</p>';
    return;
  }

  // 1. Obtener sesión
  const session = await getSession();
  if (!session) {
    // Redirigir al login si no hay sesión
    window.location.href = 'login.html?redirect=perfil.html';
    return;
  }

  const user = session.user;

  // 2. Obtener perfil
  const profile = await getUserProfile(user.id);

  // 3. Obtener membresía activa
  let activeMembership = null;
  try {
    activeMembership = await getActiveMembership(user.id);
  } catch (e) {
    console.error('Error fetching membership:', e);
  }

  // 4. Obtener planes de membresía
  let plans = [];
  try {
    plans = await getMembershipPlans();
  } catch (e) {
    console.error('Error fetching plans:', e);
  }

  // 5. Obtener historial de pagos
  let payments = [];
  try {
    payments = await getPaymentHistory(user.id);
  } catch (e) {
    console.error('Error fetching payments:', e);
  }

  // 6. Renderizar perfil
  renderPerfil(user, profile, activeMembership, plans, payments);

  // 7. Configurar tabs
  setupTabs();

  // 8. Configurar formulario de edad (para usuarios de Google sin edad)
  setupAgeForm(user.id);
}

function renderPerfil(user, profile, activeMembership, plans, payments) {
  const displayName = user.user_metadata?.full_name || profile?.full_name || user.email?.split('@')[0] || 'Usuario';
  const avatarUrl = user.user_metadata?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase();
  const email = user.email;
  const age = profile?.age || user.user_metadata?.age;

  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <section class="section" style="padding-top: calc(var(--header-h) + var(--sp-5));">
      <div class="container">
        <div class="perfil-layout">
          <!-- Sidebar -->
          <aside class="perfil-sidebar">
            <div class="perfil-card">
              <div class="perfil-avatar">
                ${avatarUrl
                  ? `<img src="${avatarUrl}" alt="${displayName}" width="80" height="80" />`
                  : `<span class="perfil-initial">${initial}</span>`
                }
              </div>
              <h2 class="perfil-name">${displayName}</h2>
              <p class="perfil-email">${email}</p>
              ${age ? `<p class="perfil-age"><i class="ph ph-cake"></i> ${age} años</p>` : ''}
              <div class="perfil-sidebar-nav">
                <button class="perfil-tab-btn active" data-tab="perfil-tab">
                  <i class="ph ph-user-circle"></i> Mi Perfil
                </button>
                <button class="perfil-tab-btn" data-tab="membresia-tab">
                  <i class="ph ph-crown"></i> Mi Membresía
                  ${activeMembership ? '<span class="perfil-badge active">Activa</span>' : ''}
                </button>
                <button class="perfil-tab-btn" data-tab="planes-tab">
                  <i class="ph ph-shopping-bag-open"></i> Comprar Membresía
                </button>
                <button class="perfil-tab-btn" data-tab="historial-tab">
                  <i class="ph ph-clock"></i> Historial
                </button>
                <button class="perfil-tab-btn perfil-tab-btn--logout" id="btnLogoutPerfil">
                  <i class="ph ph-sign-out"></i> Cerrar Sesión
                </button>
              </div>
            </div>
          </aside>

          <!-- Main Content -->
          <main class="perfil-main">
            <!-- Tab: Perfil -->
            <div class="perfil-tab-content active" id="perfil-tab">
              <div class="perfil-card">
                <h3><i class="ph ph-user-circle"></i> Información Personal</h3>
                <div class="perfil-field">
                  <label>Nombre completo</label>
                  <p>${displayName}</p>
                </div>
                <div class="perfil-field">
                  <label>Correo electrónico</label>
                  <p>${email}</p>
                </div>
                <div class="perfil-field">
                  <label>Edad</label>
                  ${age
                    ? `<p>${age} años</p>`
                    : `<div class="perfil-age-form">
                        <p style="color:var(--amarillo-oro);font-size:0.85rem;">Completa tu edad para una mejor experiencia</p>
                        <div class="perfil-age-input-group">
                          <input type="number" id="inputAge" min="1" max="120" placeholder="Tu edad" class="perfil-input" />
                          <button id="btnSaveAge" class="btn btn--primary">Guardar</button>
                        </div>
                      </div>`
                  }
                </div>
              </div>
            </div>

            <!-- Tab: Membresía -->
            <div class="perfil-tab-content" id="membresia-tab">
              ${activeMembership
                ? `<div class="perfil-card perfil-membresia-active">
                    <div class="perfil-membresia-header">
                      <i class="ph-fill ph-crown" style="font-size:2rem;color:var(--amarillo-oro);"></i>
                      <div>
                        <h3>${activeMembership.memberships?.name || 'Membresía'}</h3>
                        <p class="perfil-membresia-status">✓ Activa</p>
                      </div>
                    </div>
                    <div class="perfil-membresia-dates">
                      <div>
                        <span class="perfil-membresia-label">Inicio</span>
                        <span>${new Date(activeMembership.start_date).toLocaleDateString('es-PE')}</span>
                      </div>
                      <div>
                        <span class="perfil-membresia-label">Vence</span>
                        <span>${new Date(activeMembership.end_date).toLocaleDateString('es-PE')}</span>
                      </div>
                      <div>
                        <span class="perfil-membresia-label">Días restantes</span>
                        <span class="perfil-membresia-dias">${calcDaysLeft(activeMembership.end_date)}</span>
                      </div>
                    </div>
                    <div class="perfil-membresia-features">
                      ${activeMembership.memberships?.features
                        ? JSON.parse(activeMembership.memberships.features).map(f =>
                            `<span class="perfil-feature-tag">✓ ${f}</span>`
                          ).join('')
                        : ''
                      }
                    </div>
                  </div>`
                : `<div class="perfil-card" style="text-align:center;padding:var(--sp-6);">
                    <i class="ph ph-crown" style="font-size:3rem;color:var(--gris-500);"></i>
                    <h3 style="margin-top:var(--sp-2);">Sin membresía activa</h3>
                    <p class="lead" style="margin-top:var(--sp-1);">Adquiere una membresía para acceder a todos los cursos del Campus Poder Jota.</p>
                    <button class="btn btn--primary" style="margin-top:var(--sp-3);" onclick="document.querySelector('[data-tab=\\'planes-tab\\']').click()">
                      Ver Planes <span class="arrow">→</span>
                    </button>
                  </div>`
              }
            </div>

            <!-- Tab: Planes -->
            <div class="perfil-tab-content" id="planes-tab">
              <div class="section-head">
                <h3>Elige tu plan</h3>
                <p class="lead">Accede a todos los cursos del Campus Poder Jota con una membresía mensual.</p>
              </div>
              <div class="perfil-plans-grid">
                ${plans.length > 0
                  ? plans.map((plan, i) => `
                      <div class="perfil-plan-card ${i === 1 ? 'perfil-plan-card--featured' : ''}">
                        ${i === 1 ? '<span class="perfil-plan-badge">MÁS POPULAR</span>' : ''}
                        <div class="perfil-plan-header">
                          <h4>${plan.name}</h4>
                          <div class="perfil-plan-price">
                            <span class="perfil-plan-currency">S/</span>
                            <span class="perfil-plan-amount">${plan.price}</span>
                            <span class="perfil-plan-period">/mes</span>
                          </div>
                          <p>${plan.description}</p>
                        </div>
                        <ul class="perfil-plan-features">
                          ${plan.features
                            ? JSON.parse(plan.features).map(f =>
                                `<li><i class="ph ph-check-circle"></i> ${f}</li>`
                              ).join('')
                            : ''
                          }
                        </ul>
                        <button class="btn ${i === 1 ? 'btn--primary' : 'btn--ghost'} perfil-btn-comprar"
                          data-plan-id="${plan.id}"
                          data-plan-name="${plan.name}"
                          data-plan-price="${plan.price}">
                          Comprar <span class="arrow">→</span>
                        </button>
                      </div>
                    `).join('')
                  : '<p class="lead">No hay planes disponibles momentáneamente.</p>'
                }
              </div>
              <div class="perfil-payment-info" style="margin-top:var(--sp-3);text-align:center;">
                <p class="form-note" style="color:var(--gris-300);">
                  <i class="ph ph-shield-check" style="color:var(--lima-voltio);"></i>
                  Pago 100% seguro vía Mercado Pago. Aceptamos Yape, tarjetas y más.
                </p>
              </div>
            </div>

            <!-- Tab: Historial -->
            <div class="perfil-tab-content" id="historial-tab">
              <div class="section-head">
                <h3>Historial de Pagos</h3>
              </div>
              ${payments.length > 0
                ? `<div class="perfil-payments-list">
                    ${payments.map(p => `
                      <div class="perfil-payment-item">
                        <div class="perfil-payment-left">
                          <span class="perfil-payment-plan">${p.memberships?.name || 'Membresía'}</span>
                          <span class="perfil-payment-date">${new Date(p.created_at).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div class="perfil-payment-right">
                          <span class="perfil-payment-amount">S/ ${p.amount}</span>
                          <span class="perfil-payment-status perfil-payment-status--${p.status}">
                            ${p.status === 'completed' ? '✓ Pagado' : p.status === 'pending' ? '⏳ Pendiente' : '✗ Fallido'}
                          </span>
                        </div>
                      </div>
                    `).join('')}
                  </div>`
                : `<div class="perfil-card" style="text-align:center;padding:var(--sp-6);">
                    <i class="ph ph-clock" style="font-size:3rem;color:var(--gris-500);"></i>
                    <h3 style="margin-top:var(--sp-2);">Sin pagos registrados</h3>
                    <p class="lead" style="margin-top:var(--sp-1);">Cuando realices tu primera compra, aparecerá aquí.</p>
                  </div>`
              }
            </div>
          </main>
        </div>
      </div>
    </section>
  `;

  // Cerrar sesión desde perfil
  document.getElementById('btnLogoutPerfil')?.addEventListener('click', async () => {
    await logout();
    window.location.href = 'index.html';
  });
}

function calcDaysLeft(endDate) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function setupTabs() {
  const tabs = document.querySelectorAll('.perfil-tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover active de todos
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      // Mostrar tab correspondiente
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.perfil-tab-content').forEach(tc => tc.classList.remove('active'));
      document.getElementById(tabId)?.classList.add('active');
    });
  });
}

function setupAgeForm(userId) {
  const btnSave = document.getElementById('btnSaveAge');
  const inputAge = document.getElementById('inputAge');
  if (!btnSave || !inputAge) return;

  btnSave.addEventListener('click', async () => {
    const age = parseInt(inputAge.value);
    if (!age || age < 1 || age > 120) {
      inputAge.style.borderColor = 'var(--error)';
      return;
    }
    inputAge.style.borderColor = '';

    try {
      await updateProfile(userId, { age });
      // Recargar para mostrar cambios
      window.location.reload();
    } catch (e) {
      alert('Error al guardar la edad. Intenta de nuevo.');
    }
  });
}

// ============================================================
// Inicialización cuando el DOM esté listo
// ============================================================
(async function () {
  // Asegurar que año del footer se muestre
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Inicializar navbar
  await initUserMenu();
  // Inicializar perfil
  await initPerfil();
})();
