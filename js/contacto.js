/* ============================================================
   PODER JOTA — contacto.js
   Validación del formulario y generación del link de WhatsApp.
   Número: +51 922 375 598  →  wa.me/51922375598
   ============================================================ */
(function () {
  'use strict';

  const WHATSAPP_NUMBER = '51922375598'; // +51 922 375 598

  const form = document.getElementById('contactForm');
  if (!form) return;

  const feedback = document.getElementById('formFeedback');

  // Reglas de validación por campo
  const validators = {
    nombre: (v) => (v.trim().length >= 2 ? '' : 'Escribe tu nombre (mínimo 2 caracteres).'),
    apellido: (v) => (v.trim().length >= 2 ? '' : 'Escribe tu apellido (mínimo 2 caracteres).'),
    correo: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Ingresa un correo válido.'),
    telefono: (v) => {
      const digits = v.replace(/\D/g, '');
      return digits.length >= 7 ? '' : 'Ingresa un teléfono válido (mínimo 7 dígitos).';
    },
    servicio: (v) => (v ? '' : 'Selecciona un servicio de interés.'),
    mensaje: (v) => (v.trim().length >= 10 ? '' : 'Cuéntanos un poco más (mínimo 10 caracteres).'),
  };

  function setFieldError(field, message) {
    const input = form.querySelector(`[name="${field}"]`);
    const errorEl = form.querySelector(`[data-error-for="${field}"]`);
    if (!input) return;
    const wrapper = input.closest('.field');
    if (message) {
      wrapper && wrapper.classList.add('field--error');
      input.setAttribute('aria-invalid', 'true');
      if (errorEl) errorEl.textContent = message;
    } else {
      wrapper && wrapper.classList.remove('field--error');
      input.removeAttribute('aria-invalid');
      if (errorEl) errorEl.textContent = '';
    }
  }

  function validateField(field) {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return true;
    const error = validators[field] ? validators[field](input.value) : '';
    setFieldError(field, error);
    return !error;
  }

  function validateAll() {
    let valid = true;
    Object.keys(validators).forEach((field) => {
      if (!validateField(field)) valid = false;
    });
    return valid;
  }

  // Validación en tiempo real al perder el foco
  Object.keys(validators).forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (!input) return;
    input.addEventListener('blur', () => validateField(field));
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('field--error')) {
        validateField(field);
      }
    });
  });

  function buildWhatsAppMessage(data) {
    const lines = [
      '*Hola Poder Jota!* 💪',
      '',
      `*Nombre:* ${data.nombre} ${data.apellido}`,
      `*Correo:* ${data.correo}`,
      `*Teléfono:* ${data.telefono}`,
      `*Servicio de interés:* ${data.servicio}`,
      '',
      '*Mensaje:*',
      data.mensaje,
      '',
      '— Enviado desde poderjota.pe — Solo hombres',
    ];
    return encodeURIComponent(lines.join('\n'));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    feedback.textContent = '';
    feedback.style.color = '';

    if (!validateAll()) {
      feedback.textContent = 'Revisa los campos marcados antes de enviar.';
      feedback.style.color = 'var(--error)';
      // Foco al primer error
      const firstError = form.querySelector('.field--error input, .field--error select, .field--error textarea');
      if (firstError) firstError.focus();
      return;
    }

    const data = {
      nombre: form.nombre.value.trim(),
      apellido: form.apellido.value.trim(),
      correo: form.correo.value.trim(),
      telefono: form.telefono.value.trim(),
      servicio: form.servicio.value,
      mensaje: form.mensaje.value.trim(),
    };

    const message = buildWhatsAppMessage(data);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    feedback.textContent = 'Abriendo WhatsApp con tu mensaje...';
    feedback.style.color = 'var(--lima-voltio)';

    // Abrir en nueva pestaña
    window.open(url, '_blank', 'noopener,noreferrer');
  });
})();
