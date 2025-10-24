/**
 * WHALE Service Worker
 * オフライン対応とキャッシング
 */

const CACHE_NAME = 'whale-v2.0.0';
const RUNTIME_CACHE = 'whale-runtime-v2.0.0';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/dashboard.html',
    '/daily-record.html',
    '/reports.html',
    '/settings.html',
    '/css/styles.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/storage.js',
    '/js/api.js',
    '/js/utils.js',
    '/manifest.json'
];

// インストール
self.addEventListener('install', (event) => {
    console.log('🐋 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// アクティベーション
self.addEventListener('activate', (event) => {
    console.log('🐋 Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// フェッチ
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // CDNリクエストはキャッシュ優先
    if (url.origin !== location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                return cached || fetch(request).then((response) => {
                    return caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, response.clone());
                        return response;
                    });
                });
            })
        );
        return;
    }

    // API リクエストはネットワーク優先
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({ error: 'Offline', offline: true }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }

    // その他はキャッシュ優先、フォールバック
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(request).then((response) => {
                if (!response || response.status !== 200) {
                    return response;
                }

                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, responseClone);
                });

                return response;
            }).catch(() => {
                // オフライン時のフォールバック
                if (request.destination === 'document') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});

// バックグラウンド同期
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    console.log('🔄 Background sync started');
    try {
        // IndexedDBからキューされたリクエストを取得して送信
        // 実装は WhaleAPI.processQueue() に委譲
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'SYNC_REQUESTED' });
        });
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// プッシュ通知
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'WHALE';
    const options = {
        body: data.body || '新しい通知があります',
        icon: '/assets/icon-192.png',
        badge: '/assets/badge-72.png',
        data: data
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 通知クリック
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

console.log('🐋 Service Worker loaded');
