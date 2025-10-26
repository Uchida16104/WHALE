/**
 * WHALE API Client
 * バックエンドAPI通信レイヤー
 * @version 2.0.0
 */

class WhaleAPI {
    constructor() {
        this.baseURL = window.WHALE.API_URL;
        this.token = null;
        this.refreshing = false;
    }

    /**
     * 認証トークン設定
     */
    setToken(token) {
        this.token = token;
        window.WhaleStorage.setLocal('authToken', token);
    }

    /**
     * 認証トークン取得
     */
    getToken() {
        if (!this.token) {
            this.token = window.WhaleStorage.getLocal('authToken');
        }
        return this.token;
    }

    /**
     * 認証トークンクリア
     */
    clearToken() {
        this.token = null;
        window.WhaleStorage.removeLocal('authToken');
    }

    /**
     * HTTPリクエスト実行
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);

            // 401エラー: トークン再取得試行
            if (response.status === 401 && !this.refreshing) {
                await this.refreshToken();
                return this.request(endpoint, options);
            }

            // レスポンス処理
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/')) {
                data = await response.text();
            } else {
                data = await response.blob();
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
            }

            return data;

        } catch (error) {
            // オフライン時の処理
            if (!navigator.onLine) {
                console.warn('Offline: Request queued');
                await this.queueRequest(endpoint, options);
                throw new Error('オフラインです。オンライン復帰時に自動送信されます。');
            }

            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * GETリクエスト
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POSTリクエスト
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUTリクエスト
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETEリクエスト
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * ファイルアップロード
     */
    async upload(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // Content-Typeを自動設定させる
        });
    }

    /**
     * トークン更新
     */
    async refreshToken() {
        if (this.refreshing) return;

        this.refreshing = true;
        try {
            const data = await this.post('/api/auth/refresh');
            this.setToken(data.token);
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearToken();
            window.location.href = 'login.html';
        } finally {
            this.refreshing = false;
        }
    }

    /**
     * リクエストキュー追加（オフライン用）
     */
    async queueRequest(endpoint, options) {
        const queue = window.WhaleStorage.getLocal('requestQueue') || [];
        queue.push({
            endpoint,
            options,
            timestamp: new Date().toISOString()
        });
        window.WhaleStorage.setLocal('requestQueue', queue);
    }

    /**
     * キューされたリクエスト送信
     */
    async processQueue() {
        const queue = window.WhaleStorage.getLocal('requestQueue') || [];
        if (queue.length === 0) return;

        console.log(`Processing ${queue.length} queued requests...`);
        const results = [];

        for (const item of queue) {
            try {
                await this.request(item.endpoint, item.options);
                results.push({ success: true, item });
            } catch (error) {
                results.push({ success: false, item, error });
            }
        }

        // 成功したリクエストを削除
        const remaining = queue.filter((item, index) => !results[index].success);
        window.WhaleStorage.setLocal('requestQueue', remaining);

        return results;
    }

    // ===== 認証API =====

    async login(credentials) {
        const data = await this.post('/api/auth/login', credentials);
        if (data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async logout() {
        this.clearToken();
        return { success: true };
    }

    async verifyToken() {
        return this.post('/api/auth/verify');
    }

    // ===== データ同期API =====

    async syncUpload(documents) {
        return this.post('/api/sync/upload', { documents });
    }

    async syncDownload(since = null) {
        return this.get('/api/sync/download', { since });
    }

    // ===== エクスポートAPI =====

    async exportPDF(records, analytics, organization) {
        const response = await fetch(`${this.baseURL}/api/export/pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ records, analytics, organization })
        });

        if (!response.ok) {
            throw new Error('PDF export failed');
        }

        const blob = await response.blob();
        return blob;
    }

    async exportExcel(records) {
        const response = await fetch(`${this.baseURL}/api/export/excel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ records })
        });

        if (!response.ok) {
            throw new Error('Excel export failed');
        }

        const blob = await response.blob();
        return blob;
    }

    async exportCSV(records) {
        const response = await fetch(`${this.baseURL}/api/export/csv`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ records })
        });

        if (!response.ok) {
            throw new Error('CSV export failed');
        }

        const blob = await response.blob();
        return blob;
    }

    // ===== 分析API =====

    async calculateAnalytics(records) {
        return this.post('/api/analytics/calculate', { records });
    }

    // ===== メール送信API =====

    async sendEmail(to, subject, body) {
        return this.post('/api/mail/send', { to, subject, body });
    }

    // ===== ヘルスチェック =====

    async healthCheck() {
        try {
            return await this.get('/health');
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }
}

// グローバルインスタンス作成
window.WhaleAPI = new WhaleAPI();

// オンライン復帰時にキュー処理
window.addEventListener('online', async () => {
    await window.WhaleAPI.processQueue();
});

console.log('🐋 WHALE API client loaded');

export default window.WhaleAPI;
