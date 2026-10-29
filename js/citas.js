// ============================================================
// PODER JOTA — Encuesta de bienvenida y citas de asesoría
// Datos: Neon Data API (tablas survey_responses y appointments,
// ver db/migrations/004_survey_appointments.sql)
// ============================================================

import { getNeon } from './neon.js';

// Preguntas de la encuesta. Las de un área (fitness, futbol, campus)
// solo aplican si el usuario marcó esa área en "intereses".
export const SURVEY = [
  {
    key: 'intereses', area: 'general', type: 'checkbox', required: true,
    label: '¿En qué te quieres enfocar?',
    options: [
      ['fitness', 'Asesoría fitness personalizada'],
      ['futbol', 'Entrenamiento de fútbol'],
      ['campus', 'Cursos digitales (Campus)'],
    ],
  },
  // ---- Fitness ----
  {
    key: 'fit_objetivo', area: 'fitness', type: 'select', required: true,
    label: '¿Cuál es tu objetivo principal en el gimnasio?',
    options: [
      ['perder_grasa', 'Perder grasa'],
      ['ganar_musculo', 'Ganar masa muscular'],
      ['tonificar', 'Tonificar y mejorar la postura'],
      ['rendimiento', 'Mejorar mi rendimiento deportivo'],
      ['salud', 'Salud general y energía'],
    ],
  },
  {
    key: 'fit_nivel', area: 'fitness', type: 'radio', required: true,
    label: '¿Cuánto tiempo llevas entrenando?',
    options: [
      ['principiante', 'Menos de 6 meses'],
      ['intermedio', 'Entre 6 meses y 2 años'],
      ['avanzado', 'Más de 2 años'],
    ],
  },
  {
    key: 'fit_dias', area: 'fitness', type: 'select', required: true,
    label: '¿Cuántos días por semana puedes entrenar?',
    options: [['1-2', '1 a 2 días'], ['3-4', '3 a 4 días'], ['5+', '5 o más días']],
  },
  {
    key: 'fit_lugar', area: 'fitness', type: 'radio', required: true,
    label: '¿Dónde prefieres entrenar?',
    options: [['gimnasio', 'Gimnasio'], ['casa', 'En casa'], ['aire_libre', 'Al aire libre']],
  },
  {
    key: 'fit_lesiones', area: 'fitness', type: 'textarea', required: false,
    label: '¿Tienes lesiones o alguna condición médica? (opcional)',
  },
  // ---- Fútbol ----
  {
    key: 'fut_posicion', area: 'futbol', type: 'select', required: true,
    label: '¿En qué posición juegas?',
    options: [
      ['portero', 'Portero'],
      ['defensa', 'Defensa'],
      ['mediocampista', 'Mediocampista'],
      ['delantero', 'Delantero'],
      ['sin_fija', 'Sin posición fija'],
    ],
  },
  {
    key: 'fut_nivel', area: 'futbol', type: 'radio', required: true,
    label: '¿Qué nivel de juego tienes?',
    options: [['recreativo', 'Recreativo'], ['competitivo', 'Competitivo'], ['semiprofesional', 'Semiprofesional']],
  },
  {
    key: 'fut_objetivo', area: 'futbol', type: 'select', required: true,
    label: '¿Qué quieres mejorar primero?',
    options: [
      ['tecnica', 'Técnica con balón'],
      ['resistencia', 'Resistencia'],
      ['velocidad', 'Velocidad y explosividad'],
      ['tactica', 'Táctica y lectura de juego'],
    ],
  },
  {
    key: 'fut_equipo', area: 'futbol', type: 'radio', required: true,
    label: '¿Juegas actualmente en un equipo?',
    options: [['si', 'Sí'], ['no', 'No']],
  },
  // ---- Campus ----
  {
    key: 'cam_tema', area: 'campus', type: 'select', required: true,
    label: '¿Qué tema te interesa más en los cursos?',
    options: [
      ['entrenar_casa', 'Entrenar en casa'],
      ['nutricion', 'Nutrición básica'],
      ['movilidad', 'Movilidad y recuperación'],
      ['fisico_general', 'Preparación física general'],
    ],
  },
  {
    key: 'cam_tiempo', area: 'campus', type: 'radio', required: true,
    label: '¿Cuánto tiempo al día podrías dedicar a un curso?',
    options: [['30', 'Menos de 30 minutos'], ['60', 'Entre 30 y 60 minutos'], ['120', 'Más de 1 hora']],
  },
];

// Los campos que aplican a la encuesta según las áreas elegidas.
function applicableQuestions(interests) {
  return SURVEY.filter(q => q.area === 'general' || interests.includes(q.area));
}

// Valida las respuestas y devuelve { answers, error }.
// answers solo contiene las preguntas que aplican.
export function validateSurvey(raw) {
  const interests = Array.isArray(raw.intereses) ? raw.intereses : [];
  const answers = {};
  for (const q of applicableQuestions(interests)) {
    let value = raw[q.key];
    if (q.type === 'checkbox') {
      value = Array.isArray(value) ? value : [];
      const valid = value.filter(v => q.options.some(([k]) => k === v));
      if (q.required && valid.length === 0) return { error: 'Elige al menos una opción: ' + q.label };
      answers[q.key] = valid;
      continue;
    }
    value = typeof value === 'string' ? value.trim().slice(0, 500) : '';
    if (q.required && !value) return { error: 'Responde la pregunta: ' + q.label };
    if (value && q.options && !q.options.some(([k]) => k === value)) {
      return { error: 'Respuesta no válida en: ' + q.label };
    }
    answers[q.key] = value;
  }
  return { answers, error: null };
}

// Texto legible de una respuesta guardada (para el admin).
export function answerLabel(q, value) {
  if (Array.isArray(value)) {
    return value.map(v => (q.options.find(([k]) => k === v) || [v, v])[1]).join(', ');
  }
  if (!value) return '—';
  if (!q.options) return value;
  const found = q.options.find(([k]) => k === value);
  return found ? found[1] : value;
}

// ---------- Acceso a datos ----------

export async function getMySurvey(userId) {
  const { data, error } = await getNeon()
    .from('survey_responses')
    .select('id, answers, created_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveSurvey(userId, raw) {
  const { answers, error } = validateSurvey(raw);
  if (error) throw new Error(error);
  const { data, error: dbError } = await getNeon()
    .from('survey_responses')
    .upsert(
      { user_id: userId, answers, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single();
  if (dbError) throw new Error('No se pudo guardar la encuesta. Intenta de nuevo.');
  return data;
}

export async function requestAppointment(userId, surveyId, { preferredAt, channel, userNotes }) {
  if (!['meet', 'zoom'].includes(channel)) throw new Error('Elige Meet o Zoom.');
  const when = new Date(preferredAt);
  if (isNaN(when.getTime())) throw new Error('Elige una fecha y hora válidas.');
  const now = Date.now();
  if (when.getTime() < now + 2 * 3600 * 1000) {
    throw new Error('La cita debe ser con al menos 2 horas de anticipación.');
  }
  if (when.getTime() > now + 60 * 86400 * 1000) {
    throw new Error('Puedes agendar con hasta 60 días de anticipación.');
  }
  const { error } = await getNeon()
    .from('appointments')
    .insert({
      user_id: userId,
      survey_id: surveyId,
      preferred_at: when.toISOString(),
      channel,
      user_notes: (userNotes || '').trim().slice(0, 500) || null,
    });
  if (error) throw new Error('No se pudo agendar la cita. Intenta de nuevo.');
  return true;
}

export async function listMyAppointments(userId) {
  const { data, error } = await getNeon()
    .from('appointments')
    .select('id, preferred_at, channel, status, meeting_url, created_at')
    .eq('user_id', userId)
    .order('preferred_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Solo el admin ve todas las citas (RLS). Incluye datos del usuario y su encuesta.
export async function listAllAppointments() {
  const { data, error } = await getNeon()
    .from('appointments')
    .select('*, profiles!user_id(email, full_name, phone, promo_opt_in), survey_responses!survey_id(answers)')
    .order('preferred_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Solo el admin llama a esto (RLS lo impone en la BD).
export async function updateAppointment(id, { status, meetingUrl, adminNotes }) {
  const allowed = ['pendiente', 'confirmada', 'realizada', 'cancelada'];
  if (!allowed.includes(status)) throw new Error('Estado no válido.');
  let url = (meetingUrl || '').trim() || null;
  if (status === 'confirmada') {
    if (!url || !/^https:\/\//.test(url)) throw new Error('Pega el enlace de Meet o Zoom (https://).');
  }
  const { data, error } = await getNeon()
    .from('appointments')
    .update({
      status,
      meeting_url: url,
      admin_notes: (adminNotes || '').trim().slice(0, 1000) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error || !data) throw new Error('No se pudo actualizar la cita.');
  return true;
}
