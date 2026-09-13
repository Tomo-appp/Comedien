// Service worker minimal : sert juste à rendre l'appli "installable" (condition
// technique exigée par Android/Chrome) et à garder une version en cache pour un accès
// hors-ligne de secours. Stratégie "réseau d'abord" : à chaque ouverture, si internet
// est là, on charge toujours la dernière version en ligne (jamais une vieille version
// coincée en cache) — le cache ne sert que si le téléphone est hors-ligne.
const CACHE_NAME = 'comedien-shell-v1';
const SHELL_FILES = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
