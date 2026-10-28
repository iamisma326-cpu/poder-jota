import { createRealtimeClient } from '@neon/realtime/client';
import { getSession } from './neon.js';

const realtimeUrl = import.meta.env.VITE_NEON_REALTIME_URL;
const sealUrl = import.meta.env.VITE_NEON_FUNCTION_SEAL_BASE_URL;

const RENEW_EARLY_MS = 10_000;
const RETRY_MS = 1_000;

let client = null;

function getRealtimeClient() {
  if (client) return client;

  if (!realtimeUrl) {
    throw new Error('Falta VITE_NEON_REALTIME_URL en .env.local');
  }

  client = createRealtimeClient({ url: realtimeUrl });
  return client;
}

async function fetchSealedPayments() {
  if (!sealUrl) {
    throw new Error('Falta VITE_NEON_FUNCTION_SEAL_BASE_URL en .env.local');
  }

  const session = await getSession();
  if (!session?.access_token) {
    throw new Error('No hay sesión activa');
  }

  const response = await fetch(sealUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  if (!response.ok) {
    throw new Error(`No se pudo sellar la consulta (${response.status})`);
  }

  return response.json();
}

function renewBeforeExpiry(subscription, sealedQuery, fetchSealedQuery) {
  let timer;
  let stopped = false;

  function schedule(delay) {
    clearTimeout(timer);
    if (!stopped) timer = setTimeout(renew, delay);
  }

  function scheduleBeforeExpiry(expiresAt) {
    schedule(Math.max(0, expiresAt - Date.now() - RENEW_EARLY_MS));
  }

  async function renew() {
    let next;
    try {
      next = await fetchSealedQuery();
    } catch {
      schedule(RETRY_MS);
      return;
    }

    scheduleBeforeExpiry(next.expiresAt);
    subscription.renew(next).catch(stop);
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
  }

  scheduleBeforeExpiry(sealedQuery.expiresAt);
  return stop;
}

export async function startPaymentNotifications({ onNewPayment, onStatus, onError }) {
  let stopped = false;
  let cleanup = null;

  async function connect() {
    const sealedQuery = await fetchSealedPayments();
    if (stopped) return;

    const subscription = getRealtimeClient().subscribe(sealedQuery);
    const stopRenewing = renewBeforeExpiry(subscription, sealedQuery, fetchSealedPayments);
    let seenIds = null;

    const stopListening = subscription.onChange((snapshot) => {
      if (onStatus) onStatus(snapshot);

      if (snapshot.status !== 'live' || !snapshot.data) return;

      const currentIds = new Set(snapshot.data.map((row) => row.id));
      if (seenIds === null) {
        seenIds = currentIds;
        return;
      }

      snapshot.data.forEach((row) => {
        if (!seenIds.has(row.id) && row.status === 'pending') {
          onNewPayment(row);
        }
      });

      seenIds = currentIds;
    });

    cleanup = () => {
      stopRenewing();
      stopListening();
      subscription.unsubscribe();
    };
  }

  try {
    await connect();
  } catch (error) {
    if (onError) onError(error);
  }

  return () => {
    stopped = true;
    if (cleanup) cleanup();
  };
}
