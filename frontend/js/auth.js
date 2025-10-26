/**
 * WHALE Authentication Manager - バックエンド統合版
 * @version 2.1.0
 */

class WhaleAuthManager {
    constructor() {
        this.api = null;
        this.storage = null;
    }

    init() {
        this.api = window.WhaleAPI;
        this.storage = window.WhaleStorage;
    }

    /**
     * 新規登録
     */
    async register(formData) {
        try {
            console.log('📝 Registering new organization and user...');

            const registrationData = {
                organization: {
                    organizationId: formData.organizationId,
                    name: formData.organizationName,
                    postalCode: formData.organizationPostalCode,
                    address: formData.organizationAddress,
                    phone: formData.organizationPhone,
                    establishedDate: formData.organizationEstablishedDate
                },
                admin: {
                    userId: formData.adminUserId,
                    name: formData.adminName,
                    nameKana: formData.adminNameKana,
                    postalCode: formData.adminPostalCode,
                    address: formData.adminAddress,
                    phone: formData.adminPhone,
                    birthday: formData.adminBirthday,
                    password: formData.adminPassword
                }
            };

            const result = await this.api.register(registrationData);

            if (result.success) {
                this.storage.setCurrentUser(result.user);
                this.storage.setLocal('sessionStart', new Date().toISOString());
                
                window.dispatchEvent(new CustomEvent('whale:login', {
                    detail: { user: result.user }
                }));
            }

            return result;

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

            const result = await this.api.login(credentials);

            if (result.success) {
                this.storage.setCurrentUser(result.user);
                this.storage.setLocal('sessionStart', new Date().toISOString());
                
                window.dispatchEvent(new CustomEvent('whale:login', {
                    detail: { user: result.user }
                }));
            }

            return result;

        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    }

    /**
     * ログアウト
     */
    async logout() {
        try {
            console.log('🚪 Logging out...');

            this.api.clearToken();
            this.storage.clearCurrentUser();
            this.storage.removeLocal('sessionStart');

            window.dispatchEvent(new CustomEvent('whale:logout'));

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
            const token = this.api.getToken();
            if (!token) {
                return false;
            }

            const result = await this.api.verifyToken();
            if (result.success) {
                this.storage.setCurrentUser(result.user);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Auth check error:', error);
            this.api.clearToken();
            return false;
        }
    }

    /**
     * 現在のユーザー取得
     */
    async getCurrentUser() {
        return await this.storage.getCurrentUser();
    }

    /**
     * 権限チェック
     */
    async hasRole(role) {
        const user = await this.getCurrentUser();
        if (!user) return false;

        const roles = {
            'user': ['user'],
            'staff': ['user', 'staff'],
            'admin': ['user', 'staff', 'admin']
        };

        return roles[user.role]?.includes(role) || false;
    }

    /**
     * 管理者チェック
     */
    async isAdmin() {
        const user = await this.getCurrentUser();
        return user?.role === 'admin';
    }

    /**
     * 職員チェック
     */
    async isStaff() {
        const user = await this.getCurrentUser();
        return user?.role === 'staff' || user?.role === 'admin';
    }

    /**
     * 利用者チェック
     */
    async isUser() {
        const user = await this.getCurrentUser();
        return user?.role === 'user';
    }
}

window.WhaleAuth = new WhaleAuthManager();

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.WhaleAuth.init();
});

console.log('🐋 WHALE Auth Manager loaded');

export default window.WhaleAuth;
