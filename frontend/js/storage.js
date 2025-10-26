/**
 * WHALE Storage Manager - バックエンド統合版
 * @version 2.1.0
 */

class WhaleStorageManager {
    constructor() {
        this.currentUser = null;
        this.currentOrganization = null;
        this.api = null;
    }

    async init() {
        // APIクライアント取得
        this.api = window.WhaleAPI;
        
        // 認証済みの場合、ユーザー情報を取得
        const token = this.api.getToken();
        if (token) {
            try {
                const result = await this.api.verifyToken();
                if (result.success) {
                    this.currentUser = result.user;
                }
            } catch (error) {
                console.warn('Token verification failed:', error);
                this.api.clearToken();
            }
        }
        
        console.log('✅ Storage initialized');
    }

    // ===== LocalStorage操作 =====

    setLocal(key, value) {
        try {
            localStorage.setItem(`whale_${key}`, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('LocalStorage save error:', error);
            return false;
        }
    }

    getLocal(key) {
        try {
            const item = localStorage.getItem(`whale_${key}`);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('LocalStorage get error:', error);
            return null;
        }
    }

    removeLocal(key) {
        try {
            localStorage.removeItem(`whale_${key}`);
            return true;
        } catch (error) {
            console.error('LocalStorage remove error:', error);
            return false;
        }
    }

    // ===== 認証関連 =====

    async getCurrentUser() {
        if (!this.currentUser) {
            try {
                const result = await this.api.verifyToken();
                this.currentUser = result.user;
            } catch (error) {
                return null;
            }
        }
        return this.currentUser;
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    clearCurrentUser() {
        this.currentUser = null;
    }

    // ===== 日々の記録 =====

    async saveDailyRecord(data) {
        try {
            const result = await this.api.saveDailyRecord(data);
            return result.record;
        } catch (error) {
            console.error('Save daily record error:', error);
            throw error;
        }
    }

    async getDailyRecords(userId, startDate, endDate) {
        try {
            const result = await this.api.getDailyRecords(userId, startDate, endDate);
            return result.records || [];
        } catch (error) {
            console.error('Get daily records error:', error);
            return [];
        }
    }

    async getTodayRecord(userId) {
        const today = new Date().toISOString().split('T')[0];
        const records = await this.getDailyRecords(userId, today, today);
        return records.length > 0 ? records[0] : null;
    }

    // ===== 出席管理 =====

    async saveAttendance(data) {
        try {
            const result = await this.api.saveAttendance(data);
            return result.record;
        } catch (error) {
            console.error('Save attendance error:', error);
            throw error;
        }
    }

    async getAttendance(date) {
        try {
            const result = await this.api.getAttendance(date);
            return result.records || [];
        } catch (error) {
            console.error('Get attendance error:', error);
            return [];
        }
    }

    // ===== ユーザー管理 =====

    async getUsers() {
        try {
            const result = await this.api.getUsers();
            return result.users || [];
        } catch (error) {
            console.error('Get users error:', error);
            return [];
        }
    }

    async createUser(userData) {
        try {
            const result = await this.api.createUser(userData);
            return result.user;
        } catch (error) {
            console.error('Create user error:', error);
            throw error;
        }
    }

    async updateUser(userId, updates) {
        try {
            const result = await this.api.updateUser(userId, updates);
            return result.user;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    }

    // ===== アセスメント =====

    async createAssessment(assessment) {
        try {
            const result = await this.api.createAssessment(assessment);
            return result.assessment;
        } catch (error) {
            console.error('Create assessment error:', error);
            throw error;
        }
    }

    async getAssessments(userId) {
        try {
            const result = await this.api.getAssessments(userId);
            return result.assessments || [];
        } catch (error) {
            console.error('Get assessments error:', error);
            return [];
        }
    }

    // ===== サービス計画 =====

    async createServicePlan(plan) {
        try {
            const result = await this.api.createServicePlan(plan);
            return result.plan;
        } catch (error) {
            console.error('Create service plan error:', error);
            throw error;
        }
    }

    async getServicePlans(userId) {
        try {
            const result = await this.api.getServicePlans(userId);
            return result.plans || [];
        } catch (error) {
            console.error('Get service plans error:', error);
            return [];
        }
    }

    // ===== エクスポート =====

    async exportPDF(data) {
        const blob = await this.api.exportPDF(data);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whale_report_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    async exportExcel(data) {
        const blob = await this.api.exportExcel(data);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whale_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // ===== 設定管理 =====

    getSettings() {
        return this.getLocal('settings') || {
            theme: 'light',
            fontSize: 'medium',
            colorScheme: 'default',
            language: 'ja'
        };
    }

    saveSettings(settings) {
        return this.setLocal('settings', settings);
    }
}

window.WhaleStorage = new WhaleStorageManager();
console.log('🐋 WHALE Storage Manager loaded');

export default window.WhaleStorage;
