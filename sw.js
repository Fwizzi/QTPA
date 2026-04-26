/* ═══ SERVICE WORKER — v0.3.28 (FRAG-2 + optimisation détection) ═════════
   Stratégie de cache :

   1) Fichiers de l'app (même origine que le SW)
      → STALE-WHILE-REVALIDATE : sert immédiatement depuis le cache
        (instantané online comme offline), puis met à jour le cache en
        arrière-plan avec la réponse réseau pour la prochaine ouverture.
        ⚠️ Cette stratégie ne déclenche PAS de notification de mise à
        jour. La détection passe désormais par le mécanisme sentinelle
        (cf. point ci-dessous).

   2) Détection de mise à jour via fichier sentinelle
      Au tout premier fetch de la session SW, on déclenche en parallèle
      et UNE SEULE FOIS un check du fichier `js/version.js` (la
      sentinelle). On compare son contenu avec ce qui est en cache. Si
      différent → notification immédiate aux clients via postMessage.
      Avantage : un seul petit fichier à fetcher (~700 octets), donc
      détection en moins d'1 seconde sur connexion correcte. Avant
      v0.3.28, la détection comparait TOUS les fichiers de l'app via
      lecture .text() complète, ce qui prenait plus d'une minute en 4G.

   3) CDN jsPDF + autoTable (cdnjs.cloudflare.com)
      → CACHE-FIRST : ces fichiers ne changent jamais (URLs versionnées),
        inutile de les revérifier à chaque ouverture.

   4) API backend et toutes les autres origines externes
      → NETWORK-ONLY (pas d'interception) : le SW laisse passer les
        requêtes externes non interceptées (mode statique).
        Indispensable pour ne pas casser l'authentification.

   Mécanique de mise à jour :
   - À chaque install, le nouveau SW appelle skipWaiting() pour devenir
     actif immédiatement sans attendre la fermeture de tous les onglets.
   - À l'activate, l'ancien cache est supprimé et clients.claim() prend
     le contrôle des pages déjà ouvertes.
   - Quand la sentinelle détecte un changement, un postMessage est
     envoyé aux clients avec le type 'APP_UPDATE_AVAILABLE'. Le client
     affiche alors un bandeau proposant de recharger.

   Discipline requise (déjà imposée par les conventions du projet) :
   - Bumper APP_VERSION dans js/version.js à chaque release.
   - Bumper CACHE_NAME ci-dessous à chaque release.
═════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'arbitres-hb-v1.4.2';

/* Fichier sentinelle utilisé pour la détection rapide de mise à jour.
   Doit être un fichier qui change à chaque release par convention.
   Dans ce projet : js/version.js, qui contient la constante APP_VERSION
   bumpée à chaque version. */
const SENTINEL_URL = './js/version.js';

const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './logo.png',
  './manifest.json',
  './theme-init.js',
  './js/main.js',
  './js/state.js',
  './js/observations.js',
  './js/timer.js',
  './js/score.js',
  './js/synthesis.js',
  './js/pdf.js',
  './js/ui.js',
  './js/match.js',
  './js/storage.js',
  './js/auth.js',
  './js/logger.js',
  './js/utils.js',
  './js/version.js'
];

/* CDN jsPDF — pré-cachés séparément (ne bloquent pas l'install si offline) */
const CDN_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

/* Flag de session SW : empêche de re-vérifier la sentinelle à chaque
   requête. Une seule vérification suffit par "vie" du SW (jusqu'à son
   prochain stop par le navigateur). */
let _sentinelChecked = false;

/* ── Install : pré-cache des fichiers de l'app ─────────────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(APP_FILES))
      .then(() => {
        /* Tenter de pré-cacher les CDN (non bloquant si offline) */
        return caches.open(CACHE_NAME).then(c =>
          Promise.allSettled(CDN_FILES.map(url =>
            fetch(url).then(r => { if (r.ok) c.put(url, r); })
          ))
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ── Activate : nettoie les anciens caches et prend le contrôle ────────── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
═════════════════════════════════════════════════════════════════════════ */

/* Détermine si une URL est un fichier de l'app (même origine que le SW). */
function isAppFile(url) {
  return url.origin === self.location.origin;
}

/* Détermine si une URL est une ressource CDN pré-cachée. */
function isCdnFile(url) {
  return url.hostname === 'cdnjs.cloudflare.com';
}

/* Notifie tous les clients actifs qu'une nouvelle version a été détectée
   via la sentinelle. Le client affichera un bandeau proposant de recharger. */
function notifyClientsUpdateAvailable() {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'APP_UPDATE_AVAILABLE' });
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   Vérification de la sentinelle (détection rapide de mise à jour)
   ─────────────────────────────────────────────────────────────────────────
   Appelée UNE SEULE FOIS par session SW, lors du tout premier fetch
   intercepté. Fait :
   1) Récupère la version en cache de la sentinelle (js/version.js)
   2) Fait un fetch réseau frais de cette même URL (cache: 'no-store'
      pour éviter le cache HTTP du navigateur qui pourrait nous mentir)
   3) Compare les deux contenus en texte brut
   4) Si différent → notifyClientsUpdateAvailable()
   5) Met à jour le cache avec la nouvelle version

   La fonction est volontairement isolée et tolérante aux erreurs : si
   le réseau est inaccessible ou si la sentinelle n'est pas en cache,
   elle ne fait rien et n'empêche pas le fonctionnement de l'app.
═════════════════════════════════════════════════════════════════════════ */
async function checkSentinel() {
  if (_sentinelChecked) return;
  _sentinelChecked = true;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(SENTINEL_URL);
    if (!cachedResponse) {
      /* Pas de version en cache → premier chargement, rien à comparer.
         Le pré-cache de install va s'en occuper. */
      return;
    }
    const networkResponse = await fetch(SENTINEL_URL, { cache: 'no-store' });
    if (!networkResponse || !networkResponse.ok) return;
    const [cachedText, networkText] = await Promise.all([
      cachedResponse.clone().text(),
      networkResponse.clone().text()
    ]);
    if (cachedText !== networkText) {
      /* Vraie nouvelle version détectée → on met à jour le cache de la
         sentinelle ET on notifie les clients. La mise à jour des autres
         fichiers se fera naturellement via stale-while-revalidate aux
         prochains fetch. */
      await cache.put(SENTINEL_URL, networkResponse.clone());
      notifyClientsUpdateAvailable();
    }
  } catch (e) {
    /* Erreur silencieuse : un échec de check sentinelle ne doit pas
       casser l'app. Au pire l'utilisateur ne verra pas la notification
       et devra recharger manuellement. */
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Stratégies de fetch
═════════════════════════════════════════════════════════════════════════ */

/* Stale-while-revalidate pour les fichiers de l'app :
   1) Sert immédiatement la version en cache (ouverture instantanée)
   2) En arrière-plan, fait un fetch réseau et met à jour le cache pour
      la prochaine ouverture
   3) Pas de comparaison ni de notification ici : la détection de mise
      à jour est désormais gérée uniquement par checkSentinel() */
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then(networkResponse => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(() => null);

    if (cached) {
      /* Le fetch tourne en arrière-plan pour rafraîchir le cache.
         On ne l'attend pas, on retourne immédiatement la version cache. */
      return cached;
    }
    /* Premier chargement sans cache disponible : attendre le réseau. */
    const networkResponse = await fetchPromise;
    if (networkResponse) return networkResponse;
    return new Response('Offline et pas de cache disponible', {
      status: 504,
      statusText: 'Gateway Timeout'
    });
  });
}

/* Cache-first pour les CDN : exactement comme en v0.3.19 */
function cacheFirst(request) {
  return caches.match(request).then(r => r || fetch(request).then(resp => {
    if (resp && resp.ok) {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, clone));
    }
    return resp;
  }));
}

/* ── Fetch : dispatch par origine ───────────────────────────────────────── */
self.addEventListener('fetch', e => {
  /* Ignorer les requêtes non-GET (POST vers l'API backend, etc.) */
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  if (isAppFile(url)) {
    /* Déclenche la vérification sentinelle UNE SEULE FOIS par session SW.
       En parallèle du dispatch normal, sans bloquer la réponse au client.
       waitUntil() garantit que le SW reste actif le temps que checkSentinel
       termine, sinon le navigateur pourrait l'endormir avant. */
    if (!_sentinelChecked) {
      e.waitUntil(checkSentinel());
    }
    /* Fichiers de l'app → stale-while-revalidate */
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  if (isCdnFile(url)) {
    /* CDN jsPDF → cache-first */
    e.respondWith(cacheFirst(e.request));
    return;
  }

  /* Toutes les autres origines (CDN tiers, etc.) :
     NE PAS INTERCEPTER. */
});
