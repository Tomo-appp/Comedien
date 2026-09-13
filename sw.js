// Service worker : condition technique pour qu'Android/Chrome proposent "Installer
// l'application", et garde une copie locale pour un accès hors-ligne de secours.
//
// Stratégie "cache d'abord, réseau en arrière-plan" (stale-while-revalidate) :
// affiche IMMÉDIATEMENT ce qui est déjà en cache (aucune attente réseau), pendant
// qu'une requête part en silence pour rafraîchir le cache pour la PROCHAINE ouverture.
// Concrètement : après une mise à jour de l'appli, tu peux voir l'ancienne version une
// dernière fois à l'ouverture suivante, puis la nouvelle dès celle d'après — c'est le
// compromis qui rend l'appli installée aussi rapide qu'un onglet de navigateur classique
// (v1 de ce fichier attendait le réseau à chaque fois avant d'afficher quoi que ce soit,
// ce qui la rendait plus lente qu'un simple onglet Firefox : ne pas y revenir).
const CACHE_NAME = 'comedien-shell-v2';
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
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkUpdate = fetch(event.request).then((response) => {
        // Les scripts des CDN (React, Tailwind...) sont cross-origin donc "opaques" :
        // impossible de lire leur vrai statut HTTP, on les met en cache quand même
        // (pratique standard pour ce type de ressource, seule façon de les accélérer).
        if (response && (response.status === 200 || response.type === 'opaque')) {
          cache.put(event.request, response.clone());
        }
        return response;
      }).catch(() => null);
      // Cache dispo → réponse instantanée, la mise à jour se fait sans bloquer
      // l'affichage. Rien en cache (tout premier chargement, ou hors-ligne) → on
      // attend le réseau, faute de mieux.
      return cached || (await networkUpdate) || Response.error();
    })
  );
});
