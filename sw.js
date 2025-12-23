
// Give the service worker access to Firebase Messaging.
// Note: These URLs must match the version in index.html for compatibility.
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyAXyLvrB51sOAXOSACG-BNSD7qMXlzhfbc",
  authDomain: "anistream-ata1.firebaseapp.com",
  projectId: "anistream-ata1",
  storageBucket: "anistream-ata1.firebasestorage.app",
  messagingSenderId: "1010869287188",
  appId: "1:1010869287188:web:2cb217eab801dbef306a01",
  measurementId: "G-31FKH81ZME"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png',
    data: { url: payload.data?.url || '/' }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- PWA Caching Logic ---

const CACHE_NAME = 'anistream-v4';
const IMAGE_CACHE_NAME = 'anistream-images-v1';
const DATA_CACHE_NAME = 'anistream-data-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@500;600;700&display=swap'
];

// Domains that should be treated as static assets (Cache First)
const STATIC_DOMAINS = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'esm.sh'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Navigation Requests (HTML) -> Network First, Fallback to Cache, Fallback to /index.html (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
            // Update cache with fresh version
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              // Fallback to SPA root for client-side routing
              return caches.match('/index.html')
                .then(index => {
                    if (index) return index;
                    // Last resort offline page
                    return new Response(
                        `<!DOCTYPE html>
                        <html style="background:#0F172A;color:white;font-family:sans-serif;height:100%">
                        <body style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;margin:0;text-align:center">
                            <h1 style="font-size:2rem;margin-bottom:1rem">You're Offline</h1>
                            <p style="color:#94A3B8;margin-bottom:2rem">Please check your internet connection.</p>
                            <button onclick="window.location.reload()" style="background:#3B82F6;border:none;padding:12px 24px;border-radius:99px;color:white;font-weight:bold;cursor:pointer">Retry</button>
                        </body>
                        </html>`, 
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                });
            });
        })
    );
    return;
  }

  // 2. Static Assets (Scripts, Fonts) -> Cache First
  if (STATIC_DOMAINS.some(domain => url.hostname.includes(domain))) {
      event.respondWith(
          caches.open(CACHE_NAME).then(cache => 
              cache.match(event.request).then(cached => {
                  if (cached) return cached;
                  return fetch(event.request).then(response => {
                      if(response.ok) cache.put(event.request, response.clone());
                      return response;
                  }).catch(e => console.warn("Static asset fetch failed", e));
              })
          )
      );
      return;
  }

  // 3. Images -> Cache First (Dedicated Cache)
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then((networkResponse) => {
            if(networkResponse.ok) cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 4. API (AniList) -> Stale While Revalidate
  if (url.hostname === 'graphql.anilist.co') {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if(networkResponse.ok) cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(e => {
              // Network failed
              console.warn("API network fail", e);
              return cachedResponse; // Return cached if available, else will propogate undefined
          });
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 5. Default -> Network Only (Don't cache random API calls or POSTs)
  // especially Google GenAI calls which are POST and non-cacheable standardly
});

// Handle Notification Clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
