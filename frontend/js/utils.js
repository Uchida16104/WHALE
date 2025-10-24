/**
 * WHALE Utility Functions
 * 共通ユーティリティ関数群
 * @version 2.0.0
 */

class WhaleUtils {
    constructor() {
        this.dateFormat = 'ja-JP';
    }

    /**
     * 日付フォーマット
     */
    formatDate(date, options = {}) {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date) : date;
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };
        return d.toLocaleDateString(this.dateFormat, defaultOptions);
    }

    /**
     * 時刻フォーマット
     */
    formatTime(time) {
        if (!time) return '';
        if (time instanceof Date) {
            return time.toLocaleTimeString(this.dateFormat, {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return time;
    }

    /**
     * 日時フォーマット
     */
    formatDateTime(datetime) {
        if (!datetime) return '';
        const d = typeof datetime === 'string' ? new Date(datetime) : datetime;
        return d.toLocaleString(this.dateFormat, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 相対時間表示
     */
    getRelativeTime(date) {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diff = now - d;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) return this.formatDate(d);
        if (days > 0) return `${days}日前`;
        if (hours > 0) return `${hours}時間前`;
        if (minutes > 0) return `${minutes}分前`;
        return 'たった今';
    }

    /**
     * バリデーション: メールアドレス
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * バリデーション: 電話番号
     */
    validatePhone(phone) {
        const re = /^\d{2,4}-?\d{2,4}-?\d{3,4}$/;
        return re.test(phone);
    }

    /**
     * バリデーション: 郵便番号
     */
    validatePostalCode(postalCode) {
        const re = /^\d{3}-?\d{4}$/;
        return re.test(postalCode);
    }

    /**
     * 郵便番号フォーマット
     */
    formatPostalCode(postalCode) {
        if (!postalCode) return '';
        const cleaned = postalCode.replace(/[^0-9]/g, '');
        if (cleaned.length !== 7) return postalCode;
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }

    /**
     * 電話番号フォーマット
     */
    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/[^0-9]/g, '');
        if (cleaned.length === 10) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        } else if (cleaned.length === 11) {
            return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
        }
        return phone;
    }

    /**
     * 数値フォーマット
     */
    formatNumber(num, decimals = 0) {
        if (num === null || num === undefined) return '-';
        return Number(num).toFixed(decimals);
    }

    /**
     * パーセントフォーマット
     */
    formatPercent(value, total, decimals = 0) {
        if (!total || total === 0) return '0%';
        return ((value / total) * 100).toFixed(decimals) + '%';
    }

    /**
     * ファイルサイズフォーマット
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 安全なJSON解析
     */
    safeJSONParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (error) {
            console.warn('JSON parse error:', error);
            return defaultValue;
        }
    }

    /**
     * ディープコピー
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * オブジェクトのマージ
     */
    mergeObjects(...objects) {
        return Object.assign({}, ...objects);
    }

    /**
     * 配列から重複削除
     */
    uniqueArray(arr) {
        return [...new Set(arr)];
    }

    /**
     * 配列のソート（日本語対応）
     */
    sortArrayJapanese(arr, key = null) {
        return arr.sort((a, b) => {
            const aVal = key ? a[key] : a;
            const bVal = key ? b[key] : b;
            return aVal.localeCompare(bVal, 'ja');
        });
    }

    /**
     * デバウンス
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * スロットル
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * UUID生成
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * ランダム文字列生成
     */
    generateRandomString(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * カラーコード生成（気分スコア用）
     */
    getMoodColor(score) {
        if (!score) return '#6B7280';
        if (score >= 8) return '#10B981'; // 緑
        if (score >= 6) return '#3B82F6'; // 青
        if (score >= 4) return '#F59E0B'; // オレンジ
        return '#EF4444'; // 赤
    }

    /**
     * 絵文字取得（気分スコア用）
     */
    getMoodEmoji(score) {
        if (!score) return '😐';
        if (score >= 9) return '😄';
        if (score >= 7) return '😊';
        if (score >= 5) return '🙂';
        if (score >= 3) return '😔';
        return '😢';
    }

    /**
     * BMI計算
     */
    calculateBMI(weight, height) {
        if (!weight || !height) return null;
        const heightM = height / 100;
        return (weight / (heightM * heightM)).toFixed(1);
    }

    /**
     * 年齢計算
     */
    calculateAge(birthday) {
        if (!birthday) return null;
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    /**
     * クリップボードにコピー
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Clipboard copy error:', error);
            return false;
        }
    }

    /**
     * ダウンロード
     */
    download(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * URLパラメータ取得
     */
    getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    /**
     * URLパラメータ設定
     */
    setUrlParam(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    }

    /**
     * ブラウザ情報取得
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        
        if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (ua.indexOf('Safari') > -1) browser = 'Safari';
        else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (ua.indexOf('Edge') > -1) browser = 'Edge';
        
        return {
            browser,
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language
        };
    }

    /**
     * オンライン状態チェック
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * ストレージ容量チェック
     */
    async checkStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                usagePercent: (estimate.usage / estimate.quota * 100).toFixed(2),
                availableMB: ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(2)
            };
        }
        return null;
    }

    /**
     * エラーメッセージ取得
     */
    getErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        if (error.error) return error.error;
        return '不明なエラーが発生しました';
    }

    /**
     * ローディング表示
     */
    showLoading(message = '読み込み中...') {
        const loading = document.createElement('div');
        loading.id = 'whale-loading';
        loading.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        loading.innerHTML = `
            <div class="bg-white rounded-lg p-8 flex flex-col items-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                <p class="text-gray-700">${message}</p>
            </div>
        `;
        document.body.appendChild(loading);
    }

    /**
     * ローディング非表示
     */
    hideLoading() {
        const loading = document.getElementById('whale-loading');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * 確認ダイアログ
     */
    async confirm(message, title = '確認') {
        return window.confirm(`${title}\n\n${message}`);
    }

    /**
     * プロンプト
     */
    async prompt(message, defaultValue = '') {
        return window.prompt(message, defaultValue);
    }
}

// グローバルインスタンス作成
window.WhaleUtils = new WhaleUtils();

console.log('🐋 WHALE Utils loaded');

export default window.WhaleUtils;
