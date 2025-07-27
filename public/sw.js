// Service Worker for CIE Copilot PWA
const CACHE_NAME = 'cie-copilot-v1.0.0';
const STATIC_CACHE = 'static-cache-v1';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

// Files to cache for offline access
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/nav-icon.png',
  '/favicon.ico',
  '/manifest.json'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.openai\.com/,
  /^\/api\/chat/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static files:', error);
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    handleFetchRequest(request)
  );
});

async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Cache First for static assets
    if (isStaticAsset(url)) {
      return await cacheFirst(request);
    }
    
    // Strategy 2: Network First for API calls with offline fallback
    if (isAPIRequest(url)) {
      return await networkFirstWithOfflineFallback(request);
    }
    
    // Strategy 3: Stale While Revalidate for HTML pages
    if (isHTMLRequest(request)) {
      return await staleWhileRevalidate(request);
    }
    
    // Default: Network First
    return await networkFirst(request);
    
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return await getOfflineFallback(request);
  }
}

// Cache strategies
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // For API requests, return a custom offline response
    if (request.url.includes('/api/chat')) {
      return new Response(
        JSON.stringify({
          choices: [{
            message: {
              content: "抱歉，当前处于离线状态。请检查网络连接后重试。AI功能需要网络连接才能正常工作。"
            }
          }]
        }),
        {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    cache.put(request, networkResponse.clone());
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

async function getOfflineFallback(request) {
  // Return cached version if available
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // For HTML requests, return offline page
  if (isHTMLRequest(request)) {
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>CIE Copilot - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                   display: flex; align-items: center; justify-content: center; 
                   min-height: 100vh; margin: 0; background: #f8fafc; }
            .offline { text-align: center; max-width: 400px; padding: 2rem; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #1e293b; margin-bottom: 1rem; }
            p { color: #64748b; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="offline">
            <div class="icon">📱</div>
            <h1>当前处于离线状态</h1>
            <p>请检查网络连接，然后刷新页面。部分缓存内容仍然可用。</p>
            <button onclick="window.location.reload()" 
                    style="background: #3b82f6; color: white; border: none; 
                           padding: 0.75rem 1.5rem; border-radius: 0.5rem; 
                           cursor: pointer; margin-top: 1rem;">
              重试
            </button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/html'
        }
      }
    );
  }
  
  // Return a generic network error response
  return new Response('Network Error', { 
    status: 408, 
    statusText: 'Network Error' 
  });
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.includes('/static/') || 
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.ico');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         API_CACHE_PATTERNS.some(pattern => pattern.test(url.href));
}

function isHTMLRequest(request) {
  const acceptHeader = request.headers.get('Accept');
  return acceptHeader && acceptHeader.includes('text/html');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'chat-message-sync') {
    event.waitUntil(syncChatMessages());
  }
});

async function syncChatMessages() {
  // Implementation for syncing offline chat messages
  console.log('[SW] Syncing offline chat messages...');
  // This would sync any queued messages when back online
} 