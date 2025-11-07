/**
 * WHALE Authentication Manager - 完全修正版
 * クライアントサイド認証管理
 * @version 2.3.0 - 施設IDエラー完全修正
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
     * 新規登録（完全修正版）
     */
    async register(formData) {
        try {
            console.log('📝 Starting registration process...');
            console.log('Organization ID:', formData.organizationId);
            console.log('Admin User ID:', formData.adminUserId);

            // バリデーション
            if (!formData.organizationId || !formData.organizationName) {
                throw new Error('組織情報が不足しています');
            }

            if (!formData.adminUserId || !formData.adminName || !formData.adminPassword) {
                throw new Error('管理者情報が不足しています');
            }

            // パスワードハッシュ化
            const passwordHash = await this.hashPassword(formData.adminPassword);
            console.log('✅ Password hashed');

            // 既存組織チェック（エラーにしない）
            const existingOrg = await window.WhaleStorage.getOrganization(formData.organizationId);
            
            if (existingOrg) {
                console.warn('⚠️ Organization already exists');
                // 既存ユーザーチェック
                const existingUser = await window.WhaleStorage.getUserByCredentials(
                    formData.organizationId,
                    formData.adminUserId
                );
                
                if (existingUser) {
                    throw new Error('この施設機関IDとユーザーIDの組み合わせは既に登録されています');
                }
                
                // 組織は存在するが、ユーザーは新規の場合は続行
                console.log('ℹ️ Organization exists but user is new, continuing...');
            }

            // 組織作成（既存の場合は既存データを返す）
            const organization = await window.WhaleStorage.createOrganization({
                organizationId: formData.organizationId,
                name: formData.organizationName,
                postalCode: formData.organizationPostalCode,
                address: formData.organizationAddress,
                phone: formData.organizationPhone,
                establishedDate: formData.organizationEstablishedDate
            });

            console.log('✅ Organization ready:', organization._id);

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
     * ログイン（完全修正版）
     */
    async login(credentials) {
        try {
            console.log('🔐 Starting login process...');
            console.log('Organization ID:', credentials.organizationId);
            console.log('User ID:', credentials.userId);

            // バリデーション
            if (!credentials.organizationId) {
                throw new Error('施設機関IDを入力してください');
            }

            if (!credentials.userId) {
                throw new Error('ユーザーIDを入力してください');
            }

            if (!credentials.password) {
                throw new Error('パスワードを入力してください');
            }

            // 組織確認（存在しない場合はnullが返る）
            const organization = await window.WhaleStorage.getOrganization(credentials.organizationId);

            if (!organization) {
                console.warn('⚠️ Organization not found:', credentials.organizationId);
                throw new Error('施設機関IDが見つかりません。新規登録が必要です。');
            }

            console.log('✅ Organization found:', organization._id);

            // ユーザー取得
            const user = await window.WhaleStorage.getUserByCredentials(
                credentials.organizationId,
                credentials.userId
            );

            if (!user) {
                console.warn('⚠️ User not found:', credentials.userId);
                throw new Error('ユーザーIDが見つかりません');
            }

            console.log('✅ User found:', user._id);

            // パスワード検証
            const passwordHash = await this.hashPassword(credentials.password);
            if (passwordHash !== user.passwordHash) {
                console.warn('⚠️ Password mismatch');
                throw new Error('パスワードが正しくありません');
            }

            console.log('✅ Password verified');

            // セッション開始
            this.startSession(user);

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
    startSession(user) {
        this.currentUser = user;

        // セッション情報保存
        window.WhaleStorage.setLocal('currentUserId', user._id);
        window.WhaleStorage.setLocal('sessionStart', new Date().toISOString());
        window.WhaleStorage.setLocal('isAuthenticated', true);

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
     * ログアウト
     */
    async logout() {
        try {
            console.log('🚪 Logging out...');

            // セッション情報削除
            window.WhaleStorage.removeLocal('currentUserId');
            window.WhaleStorage.removeLocal('sessionStart');
            window.WhaleStorage.removeLocal('isAuthenticated');

            // タイマークリア
            if (this.sessionTimer) {
                clearTimeout(this.sessionTimer);
                this.sessionTimer = null;
            }

            this.currentUser = null;

            // イベント発火
            window.dispatchEvent(new CustomEvent('whale:logout'));

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

console.log('🐋 WHALE Auth Manager loaded (v2.3.0 - Fixed)');

export default window.WhaleAuth;
