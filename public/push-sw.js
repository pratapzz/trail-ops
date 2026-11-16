/* TrailOPS push handler, loaded into the Workbox service worker via importScripts.
 * Runs even when the app tab / PWA is in the background or closed, so SOS,
 * attendance and notice alerts still reach the phone's notification shade. */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'TrailOPS', body: event.data ? event.data.text() : '' };
  }

  const kind = data.kind || 'notice';
  const title = data.title || 'TrailOPS';
  const options = {
    body: data.body || '',
    tag: data.tag || kind,
    renotify: true,
    requireInteraction: Boolean(data.requireInteraction),
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: kind === 'sos' ? [500, 200, 500, 200, 1000, 400, 500, 200, 500] : [200, 100, 200],
    data: { url: data.url || '/', kind },
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const visible = clients.find((c) => c.visibilityState === 'visible');
      // If the app is open on screen, the in-app modal/siren handles it; just nudge it to refresh.
      // SOS is always shown so it can't be missed.
      if (visible && kind !== 'sos') {
        visible.postMessage({ type: 'TRAILOPS_PUSH', payload: data });
        return undefined;
      }
      clients.forEach((c) => c.postMessage({ type: 'TRAILOPS_PUSH', payload: data }));
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          return c.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});
