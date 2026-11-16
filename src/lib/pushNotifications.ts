/**
 * Web Push registration for background / closed-app alerts.
 *
 * Why this exists: every alert in TrailOPS used to come from JavaScript polling
 * the server every few seconds. Phones freeze a page's JavaScript as soon as the
 * browser or PWA goes to the background, so SOS, attendance and notices stopped
 * arriving. With a push subscription the server can wake the service worker
 * (public/push-sw.js), which shows a system notification even when the app is closed.
 *
 * Android Chrome: works in the browser and the installed PWA.
 * iPhone: works only after "Add to Home Screen" (iOS 16.4+), opened from that icon.
 */

import { buildApiHeaders } from './supabase';

export type PushStatus = 'unsupported' | 'denied' | 'default' | 'granted';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushStatus(): PushStatus {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as PushStatus;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getServerPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/public-key');
    const data = await res.json().catch(() => null);
    return data?.publicKey || null;
  } catch {
    return null;
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    // Wait at most 8s for the PWA service worker to be ready.
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Make sure this device has a push subscription and the server knows which
 * user/group it belongs to. Never prompts; call `enablePushNotifications`
 * from a button tap for that.
 */
export async function syncPushSubscription(userId: string, groupId?: string | null): Promise<boolean> {
  if (!userId || getPushStatus() !== 'granted') return false;
  const reg = await getRegistration();
  if (!reg) return false;

  const publicKey = await getServerPublicKey();
  if (!publicKey) return false;

  try {
    let sub = await reg.pushManager.getSubscription();

    // If the server's VAPID key changed (e.g. redeploy without env vars), resubscribe.
    const currentKey = sub?.options?.applicationServerKey;
    if (sub && currentKey) {
      const a = new Uint8Array(currentKey);
      const b = urlBase64ToUint8Array(publicKey);
      const same = a.length === b.length && a.every((v, i) => v === b[i]);
      if (!same) {
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
    }

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const headers = await buildApiHeaders(userId);
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ subscription: sub.toJSON(), userId, groupId: groupId || '' }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return false;
  }
}

/** Ask for notification permission (must be called from a user tap) and subscribe. */
export async function enablePushNotifications(userId: string, groupId?: string | null): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      permission = Notification.permission;
    }
  }
  if (permission === 'granted') {
    await syncPushSubscription(userId, groupId);
  }
  return permission as PushStatus;
}

export function isIosNotInstalled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as any).standalone === true;
  return isIos && !standalone;
}
