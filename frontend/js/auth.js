/**
 * WHALE Authentication Manager - 完全修正版
 * クライアントサイド認証管理 + セッション管理強化
 * @version 2.2.0
 */

class WhaleAuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 60 * 60 * 1000; // 1時間
        this.sessionTimer = null;
    }

    /**
     * パスワードハッシュ化
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 新規登録
     */
    async register(formData) {
        try {
            console.log('📝 Registering new organization and user...');

            // 組織情報検証
            const existingOrg = await window.WhaleStorage.getOrganization(
                formData.organizationId
            );

            if (existingOrg) {
                throw new Error('この施設機関IDは既に使用されています');
            }

            // パスワードハッシュ化
            const passwordHash = await this.hashPassword(formData.adminPassword);

            // 組織作成
            const organization = await window.WhaleStorage.createOrganization({
                organizationId: formData.organizationId,
                name: formData.organizationName,
                postalCode: formData.organizationPostalCode,
                address: formData.organizationAddress,
                phone: formData.organizationPhone,
                establishedDate: formData.organizationEstablishedDate
            });

            console.log('✅ Organization created:', organization._id);

            // 管理者ユーザー作成
            const user = await window.WhaleStorage.createUser({
                userId: formData.adminUserId,
                organizationId: formData.organizationId,
                name: formData.adminName,
                nameKana: formData.adminNameKana,
                role: 'admin',
                postalCode: formData.adminPostalCode,
                address: formData.adminAddress,
                phone: formData.adminPhone,
                birthday: formData.adminBirthday,
                passwordHash: passwordHash
            });

            console.log('✅ Admin user created:', user._id);

            // 自動ログイン
            await this.login({
                organizationId: formData.organizationId,
                userId: formData.adminUserId,
                password: formData.adminPassword
            });

            return {
                success: true,
                message: '登録が完了しました',
                organization: organization,
                user: user
            };
        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    }

    /**
     * ログイン
     */
    async login(credentials) {
        try {
            console.log('🔐 Logging in...');

            // 組織確認
            const organization = await window.WhaleStorage.getOrganization(
                credentials.organizationId
            );

            if (!organization) {
                throw new Error('施設機関IDが見つかりません');
            }

            // ユーザー取得
            const user = await window.WhaleStorage.getUserByCredentials(
                credentials.organizationId,
                credentials.userId
            );

            if (!user) {
                throw new Error('ユーザーIDが見つかりません');
            }

            // パスワード検証
            const passwordHash = await this.hashPassword(credentials.password);
            if (passwordHash !== user.passwordHash) {
                throw new Error('パスワードが正しくありません');
            }

            // セッション開始
            await this.startSession(user);

            console.log('✅ Login successful:', user.name);

            return {
                success: true,
                user: user,
                organization: organization
            };
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    }

    /**
     * セッション開始
     */
    async startSession(user) {
        this.currentUser = user;

        // セッション情報保存
        window.WhaleStorage.setLocal('currentUserId', user._id);
        window.WhaleStorage.setLocal('sessionStart', new Date().toISOString());
        window.WhaleStorage.setLocal('isAuthenticated', true);

        // 認証トークン生成（簡易版）
        const token = btoa(JSON.stringify({
            userId: user._id,
            organizationId: user.organizationId,
            timestamp: Date.now()
        }));
        window.WhaleStorage.setLocal('authToken', token);

        // セッションタイマー開始
        this.resetSessionTimer();

        // イベント発火
        window.dispatchEvent(new CustomEvent('whale:login', { 
            detail: { user: user } 
        }));
    }

    /**
     * セッションタイマーリセット
     */
    resetSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }

        this.sessionTimer = setTimeout(() => {
            this.handleSessionTimeout();
        }, this.sessionTimeout);
    }

    /**
     * セッションタイムアウト処理
     */
    handleSessionTimeout() {
        console.warn('⏱️ Session timeout');
        this.logout();
        window.location.href = 'login.html?timeout=1';
    }

    /**
     * ログアウト（完全修正版）
     */
    async logout() {
        try {
            console.log('🚪 Logging out...');

            // ストレージクリーンアップ停止
            if (window.WhaleStorage && window.WhaleStorage.syncInterval) {
                clearInterval(window.WhaleStorage.syncInterval);
            }

            // セッション情報削除
            window.WhaleStorage.removeLocal('currentUserId');
            window.WhaleStorage.removeLocal('sessionStart');
            window.WhaleStorage.removeLocal('isAuthenticated');
            window.WhaleStorage.removeLocal('authToken');
            window.WhaleStorage.removeLocal('lastActivity');

            // タイマークリア
            if (this.sessionTimer) {
                clearTimeout(this.sessionTimer);
                this.sessionTimer = null;
            }

            this.currentUser = null;

            // イベント発火
            window.dispatchEvent(new CustomEvent('whale:logout'));

            // キャッシュクリア
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }

            console.log('✅ Logout successful');

            return { success: true };
        } catch (error) {
            console.error('❌ Logout error:', error);
            throw error;
        }
    }

    /**
     * 認証チェック
     */
    async checkAuth() {
        try {
            const isAuthenticated = window.WhaleStorage.getLocal('isAuthenticated');
            const currentUserId = window.WhaleStorage.getLocal('currentUserId');
            const sessionStart = window.WhaleStorage.getLocal('sessionStart');

            if (!isAuthenticated || !currentUserId || !sessionStart) {
                return false;
            }

            // セッション有効期限チェック
            const sessionAge = Date.now() - new Date(sessionStart).getTime();
            if (sessionAge > this.sessionTimeout) {
                await this.logout();
                return false;
            }

            // ユーザー情報取得
            this.currentUser = await window.WhaleStorage.get(currentUserId);
            if (!this.currentUser) {
                await this.logout();
                return false;
            }

            // セッションタイマー再開
            this.resetSessionTimer();

            return true;
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    }

    /**
     * 現在のユーザー取得
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 権限チェック
     */
    hasRole(role) {
        if (!this.currentUser) return false;

        const roles = {
            'user': ['user'],
            'staff': ['user', 'staff'],
            'admin': ['user', 'staff', 'admin']
        };

        return roles[this.currentUser.role]?.includes(role) || false;
    }

    /**
     * 管理者チェック
     */
    isAdmin() {
        return this.currentUser?.role === 'admin';
    }

    /**
     * 職員チェック
     */
    isStaff() {
        return this.currentUser?.role === 'staff' || this.currentUser?.role === 'admin';
    }

    /**
     * 利用者チェック
     */
    isUser() {
        return this.currentUser?.role === 'user';
    }

    /**
     * パスワード変更
     */
    async changePassword(oldPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('ログインしていません');
            }

            // 現在のパスワード検証
            const oldHash = await this.hashPassword(oldPassword);
            if (oldHash !== this.currentUser.passwordHash) {
                throw new Error('現在のパスワードが正しくありません');
            }

            // 新しいパスワード設定
            const newHash = await this.hashPassword(newPassword);
            await window.WhaleStorage.update(this.currentUser._id, {
                passwordHash: newHash,
                passwordChangedAt: new Date().toISOString()
            });

            console.log('✅ Password changed successfully');

            return { success: true, message: 'パスワードを変更しました' };
        } catch (error) {
            console.error('❌ Password change error:', error);
            throw error;
        }
    }

    /**
     * アクティビティ記録
     */
    recordActivity() {
        if (this.currentUser) {
            window.WhaleStorage.setLocal('lastActivity', new Date().toISOString());
            this.resetSessionTimer();
        }
    }
}

// グローバルインスタンス作成
window.WhaleAuth = new WhaleAuthManager();

// アクティビティ監視
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
        if (window.WhaleAuth.currentUser) {
            window.WhaleAuth.recordActivity();
        }
    }, { passive: true });
});

console.log('🐋 WHALE Auth Manager loaded (v2.2.0 - Fixed)');

export default window.WhaleAuth;
