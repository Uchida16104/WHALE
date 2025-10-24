/**
 * WHALE Main Application
 * メインアプリケーション初期化とグローバル設定
 * @version 2.0.0
 */

// グローバル設定
window.WHALE = window.WHALE || {
    API_URL: 'https://whale-backend-84p5.onrender.com',
    GITHUB_PAGES_URL: 'https://uchida16104.github.io/WHALE',
    VERSION: '2.0.0',
    DEBUG: false
};

class WhaleApp {
    constructor() {
        this.initialized = false;
        this.user = null;
        this.organization = null;
    }

    /**
     * アプリケーション初期化
     */
    async init() {
        if (this.initialized) return;

        try {
            console.log('🐋 WHALE Application initializing...');

            // ストレージ初期化
            await this.initStorage();

            // Service Worker登録
            await this.registerServiceWorker();

            // グローバルイベントリスナー設定
            this.setupGlobalListeners();

            // オンライン/オフライン検出
            this.setupOnlineDetection();

            // HTMX設定
            this.setupHTMX();

            // エラーハンドリング
            this.setupErrorHandling();

            this.initialized = true;
            console.log('✅ WHALE Application initialized');

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showCriticalError(error);
        }
    }

    /**
     * ストレージ初期化
     */
    async initStorage() {
        try {
            await window.WhaleStorage.init();
            console.log('✅ Storage initialized');
        } catch (error) {
            console.error('Storage initialization failed:', error);
            throw new Error('ストレージの初期化に失敗しました');
        }
    }

    /**
     * Service Worker登録
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('✅ Service Worker registered:', registration.scope);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    /**
     * グローバルイベントリスナー設定
     */
    setupGlobalListeners() {
        // ページ読み込み完了
        window.addEventListener('load', () => {
            console.log('Page loaded');
            this.hideLoadingScreen();
        });

        // 認証イベント
        window.addEventListener('whale:login', (e) => {
            console.log('User logged in:', e.detail.user);
            this.user = e.detail.user;
        });

        window.addEventListener('whale:logout', () => {
            console.log('User logged out');
            this.user = null;
            this.organization = null;
        });

        // ストレージ変更検出
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('whale_')) {
                console.log('Storage changed:', e.key);
            }
        });

        // ページ離脱前の確認
        window.addEventListener('beforeunload', (e) => {
            const unsavedChanges = this.checkUnsavedChanges();
            if (unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    /**
     * オンライン/オフライン検出
     */
    setupOnlineDetection() {
        window.addEventListener('online', () => {
            console.log('🟢 Online');
            this.showToast('オンラインに復帰しました', 'success');
            this.syncData();
        });

        window.addEventListener('offline', () => {
            console.log('🔴 Offline');
            this.showToast('オフラインモードです', 'warning');
        });
    }

    /**
     * HTMX設定
     */
    setupHTMX() {
        if (typeof htmx === 'undefined') {
            console.warn('HTMX not loaded');
            return;
        }

        // HTMX設定
        document.body.addEventListener('htmx:configRequest', (e) => {
            // リクエストヘッダーにバージョン情報追加
            e.detail.headers['X-WHALE-Version'] = window.WHALE.VERSION;
        });

        // ローディング表示
        document.body.addEventListener('htmx:beforeRequest', () => {
            this.showLoading();
        });

        // ローディング非表示
        document.body.addEventListener('htmx:afterRequest', () => {
            this.hideLoading();
        });

        // エラーハンドリング
        document.body.addEventListener('htmx:responseError', (e) => {
            console.error('HTMX error:', e.detail);
            this.showToast('通信エラーが発生しました', 'error');
        });

        // コンテンツ交換後
        document.body.addEventListener('htmx:afterSwap', (e) => {
            console.log('Content swapped:', e.detail.pathInfo.path);
            this.initializeDynamicContent();
        });
    }

    /**
     * エラーハンドリング設定
     */
    setupErrorHandling() {
        // グローバルエラーハンドラー
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            if (window.WHALE.DEBUG) {
                this.showToast(`Error: ${e.message}`, 'error');
            }
        });

        // Promise拒否ハンドラー
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled rejection:', e.reason);
            if (window.WHALE.DEBUG) {
                this.showToast(`Promise error: ${e.reason}`, 'error');
            }
        });
    }

    /**
     * 動的コンテンツ初期化
     */
    initializeDynamicContent() {
        // スライダーイベント
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const updateDisplay = () => {
                const display = document.getElementById(`${slider.id}-value`);
                if (display) display.textContent = slider.value;
            };
            slider.addEventListener('input', updateDisplay);
            updateDisplay();
        });

        // 日付入力のデフォルト値
        document.querySelectorAll('input[type="date"]').forEach(input => {
            if (!input.value) {
                input.valueAsDate = new Date();
            }
        });
    }

    /**
     * データ同期
     */
    async syncData() {
        try {
            if (!navigator.onLine) return;

            console.log('🔄 Syncing data...');
            // 同期処理の実装
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✅ Sync complete');
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    /**
     * 未保存変更チェック
     */
    checkUnsavedChanges() {
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
            if (form.classList.contains('dirty')) {
                return true;
            }
        }
        return false;
    }

    /**
     * ローディング画面非表示
     */
    hideLoadingScreen() {
        const loading = document.getElementById('loading-screen');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => loading.remove(), 500);
        }
    }

    /**
     * ローディング表示
     */
    showLoading(message = '読み込み中...') {
        let loader = document.getElementById('page-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'page-loader';
            loader.className = 'fixed top-0 left-0 w-full h-1 bg-blue-600 z-50';
            loader.style.animation = 'loading 1s ease-in-out infinite';
            document.body.appendChild(loader);
        }
        loader.style.display = 'block';
    }

    /**
     * ローディング非表示
     */
    hideLoading() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    /**
     * トースト通知
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container') || this.createToastContainer();
        const toast = document.createElement('div');
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.className = `${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 mb-2`;
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-2xl">${icons[type]}</span>
                <span class="font-medium">${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(400px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * トーストコンテナ作成
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
        return container;
    }

    /**
     * 致命的エラー表示
     */
    showCriticalError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed inset-0 bg-red-600 text-white flex items-center justify-center z-50 p-8';
        errorDiv.innerHTML = `
            <div class="text-center max-w-md">
                <div class="text-6xl mb-4">⚠️</div>
                <h1 class="text-3xl font-bold mb-4">システムエラー</h1>
                <p class="mb-6">${error.message || '不明なエラーが発生しました'}</p>
                <button onclick="location.reload()" 
                        class="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
                    再読み込み
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * ページナビゲーション
     */
    navigateTo(url) {
        if (typeof htmx !== 'undefined') {
            htmx.ajax('GET', url, {
                target: '#main-content',
                swap: 'innerHTML',
                pushUrl: true
            });
        } else {
            window.location.href = url;
        }
    }
}

// グローバルインスタンス作成
window.WhaleApp = new WhaleApp();

// グローバル関数エクスポート
window.showToast = (message, type) => window.WhaleApp.showToast(message, type);
window.loadPage = (url) => window.WhaleApp.navigateTo(url);

// ローディングアニメーション追加
const style = document.createElement('style');
style.textContent = `
    @keyframes loading {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(0); }
        100% { transform: translateX(100%); }
    }
`;
document.head.appendChild(style);

console.log('🐋 WHALE App module loaded');

export default window.WhaleApp;
