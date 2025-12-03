/**
 * WHALE Service Worker - 修正版
 * GitHub Pages対応 + パス修正
 * @version 2.4.0
 */

const CACHE_NAME = 'whale-v2.4.0';
const RUNTIME_CACHE = 'whale-runtime-v2.4.0';

// 🔥 修正: GitHub Pagesのベースパスを含める
const BASE_PATH = '/WHALE';

const STATIC_ASSETS = [
    BASE_PATH + '/',
    BASE_PATH + '/index.html',
    BASE_PATH + '/login.html',
    BASE_PATH + '/register.html',
    BASE_PATH + '/css/styles.css',
    BASE_PATH + '/manifest.json'
    // dashboard.htmlなどの動的コンテンツは除外
];

// インストール
self.addEventListener('install', (event) => {
    console.log('🐋 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ Caching static assets');
            // 🔥 修正: エラーがあっても続行
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('⚠️ Some assets failed to cache:', err);
                // 個別にキャッシュを試みる
                return Promise.all(
                    STATIC_ASSETS.map(url => {
                        return cache.add(url).catch(error => {
                            console.warn('Failed to cache:', url, error);
                        });
                    })
                );
            });
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

    // 🔥 修正: chrome-extension:// など外部プロトコルは無視
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // CDNリクエストはキャッシュ優先
    if (url.origin !== location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                return cached || fetch(request).then((response) => {
                    // 🔥 修正: レスポンスが有効な場合のみキャッシュ
                    if (response && response.status === 200) {
                        return caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, response.clone());
                            return response;
                        });
                    }
                    return response;
                }).catch(err => {
                    console.warn('Fetch failed:', url.href, err);
                    return cached || new Response('Offline', { status: 503 });
                });
            })
        );
        return;
    }

    // API リクエストはネットワーク優先
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(request).catch(() => {
                return new Response(
                    JSON.stringify({ error: 'Offline', offline: true }),
                    { 
                        status: 503,
                        headers: { 'Content-Type': 'application/json' } 
                    }
                );
            })
        );
        return;
    }

    // その他はキャッシュ優先
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }

            return fetch(request).then((response) => {
                // 🔥 修正: 有効なレスポンスのみキャッシュ
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, responseClone);
                });

                return response;
            }).catch((error) => {
                console.warn('Fetch error:', url.href, error);
                
                // オフライン時のフォールバック
                if (request.destination === 'document') {
                    return caches.match(BASE_PATH + '/index.html');
                }
                
                return new Response('Network error', { 
                    status: 503,
                    statusText: 'Service Unavailable' 
                });
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

window.syncData = async function() {
    console.log('🔄 Background sync started');
    try {
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
        icon: BASE_PATH + '/assets/icon-192.png',
        badge: BASE_PATH + '/assets/badge-72.png',
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
        clients.openWindow(event.notification.data.url || BASE_PATH + '/')
    );
});

console.log('🐋 Service Worker loaded (v2.4.0 - Fixed)');
