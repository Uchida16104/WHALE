/**
 * WHALE Storage Manager - 完全修正版
 * LocalStorage + PouchDB統合データ管理
 * @version 2.1.0
 */

class WhaleStorageManager {
    constructor() {
        this.version = '2.1.0';
        this.prefix = 'whale_';
        this.db = null;
        this.syncHandler = null;
        this.initialized = false;
    }

    /**
     * ストレージ初期化
     */
    async init() {
        if (this.initialized) return;

        try {
            console.log('🔄 Initializing PouchDB...');
            
            // PouchDBの存在確認
            if (typeof PouchDB === 'undefined') {
                throw new Error('PouchDB is not loaded. Please check CDN connection.');
            }

            // PouchDB初期化
            this.db = new PouchDB('whale_database');
            
            // Find Pluginの確認
            if (typeof this.db.find !== 'function') {
                throw new Error('PouchDB Find Plugin is not loaded. Please check CDN connection.');
            }
            
            console.log('✅ PouchDB initialized with Find Plugin');

            // インデックス作成
            await this.createIndexes();

            // LocalStorage初期設定
            this.initLocalStorage();

            this.initialized = true;
            console.log('✅ Storage initialization complete');
        } catch (error) {
            console.error('❌ Storage initialization failed:', error);
            throw error;
        }
    }

    /**
     * PouchDBインデックス作成
     */
    async createIndexes() {
        const indexes = [
            { fields: ['type'] },
            { fields: ['type', 'userId'] },
            { fields: ['type', 'organizationId'] },
            { fields: ['type', 'recordDate'] },
            { fields: ['type', 'userId', 'recordDate'] },
            { fields: ['type', 'organizationId', 'userId'] }
        ];

        for (const index of indexes) {
            try {
                await this.db.createIndex({ index });
            } catch (error) {
                console.warn('Index creation warning:', error);
            }
        }
        console.log('✅ Indexes created');
    }

    /**
     * LocalStorage初期設定
     */
    initLocalStorage() {
        const defaults = {
            settings: {
                colorScheme: 'default',
                language: 'ja',
                fontSize: 'medium',
                theme: 'light'
            },
            version: this.version
        };

        if (!this.getLocal('settings')) {
            this.setLocal('settings', defaults.settings);
        }
        this.setLocal('version', this.version);
    }

    // ==================== LocalStorage操作 ====================

    setLocal(key, value) {
        try {
            const data = {
                value: value,
                timestamp: new Date().toISOString(),
                version: this.version
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('LocalStorage save error:', error);
            return false;
        }
    }

    getLocal(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return null;
            const data = JSON.parse(item);
            return data.value;
        } catch (error) {
            console.error('LocalStorage get error:', error);
            return null;
        }
    }

    removeLocal(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('LocalStorage remove error:', error);
            return false;
        }
    }

    // ==================== PouchDB操作 ====================

    async save(type, data) {
        try {
            const doc = {
                _id: data._id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: type,
                ...data,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const result = await this.db.put(doc);
            console.log('✅ Document saved:', result.id);
            return { ...doc, _rev: result.rev };
        } catch (error) {
            console.error('❌ Save error:', error);
            throw error;
        }
    }

    async get(id) {
        try {
            return await this.db.get(id);
        } catch (error) {
            if (error.name === 'not_found') {
                return null;
            }
            throw error;
        }
    }

    async update(id, updates) {
        try {
            const doc = await this.get(id);
            if (!doc) {
                throw new Error('Document not found');
            }

            const updated = {
                ...doc,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            return await this.save(updated.type, updated);
        } catch (error) {
            console.error('❌ Update error:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const doc = await this.get(id);
            if (!doc) {
                throw new Error('Document not found');
            }
            await this.db.remove(doc);
            console.log('✅ Document deleted:', id);
            return true;
        } catch (error) {
            console.error('❌ Delete error:', error);
            throw error;
        }
    }

    async findByType(type, options = {}) {
        try {
            const result = await this.db.find({
                selector: { type: type },
                ...options
            });
            return result.docs;
        } catch (error) {
            console.error('❌ Query error:', error);
            return [];
        }
    }

    async findByUser(type, userId, options = {}) {
        try {
            const result = await this.db.find({
                selector: {
                    type: type,
                    userId: userId
                },
                ...options
            });
            return result.docs;
        } catch (error) {
            console.error('❌ Query error:', error);
            return [];
        }
    }

    async findByDateRange(type, startDate, endDate, options = {}) {
        try {
            const result = await this.db.find({
                selector: {
                    type: type,
                    recordDate: {
                        $gte: startDate,
                        $lte: endDate
                    }
                },
                sort: [{ recordDate: 'desc' }],
                ...options
            });
            return result.docs;
        } catch (error) {
            console.error('❌ Query error:', error);
            return [];
        }
    }

    // ==================== 高レベルAPI ====================

    async createOrganization(data) {
        return await this.save('organization', {
            organizationId: data.organizationId,
            name: data.name,
            postalCode: data.postalCode,
            address: data.address,
            phone: data.phone,
            establishedDate: data.establishedDate
        });
    }

    async getOrganization(organizationId) {
        const orgs = await this.findByType('organization');
        return orgs.find(o => o.organizationId === organizationId);
    }

    async createUser(data) {
        const currentUser = await this.getCurrentUser();
        const organizationId = data.organizationId || currentUser?.organizationId;
        
        // パスワードハッシュ化
        let passwordHash = data.passwordHash;
        if (data.password && !passwordHash) {
            passwordHash = await this.hashPassword(data.password);
        }

        return await this.save('user', {
            userId: data.userId,
            organizationId: organizationId,
            name: data.name,
            nameKana: data.nameKana,
            role: data.role,
            postalCode: data.postalCode,
            address: data.address,
            phone: data.phone,
            birthday: data.birthday,
            passwordHash: passwordHash
        });
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async getUserByCredentials(organizationId, userId) {
        const users = await this.findByType('user');
        return users.find(u => 
            u.organizationId === organizationId && 
            u.userId === userId
        );
    }

    async getCurrentUser() {
        const userId = this.getLocal('currentUserId');
        if (!userId) return null;
        return await this.get(userId);
    }

    async getUsers() {
        const currentUser = await this.getCurrentUser();
        if (!currentUser) return [];
        
        const allUsers = await this.findByType('user');
        return allUsers.filter(u => u.organizationId === currentUser.organizationId);
    }

    async updateUser(userId, updates) {
        return await this.update(userId, updates);
    }

    async saveDailyRecord(data) {
        const currentUser = await this.getCurrentUser();
        const organizationId = data.organizationId || currentUser?.organizationId;
        
        // 既存レコード確認
        const existing = await this.db.find({
            selector: {
                type: 'daily_record',
                userId: data.userId,
                recordDate: data.recordDate
            }
        });

        if (existing.docs.length > 0) {
            // 更新
            return await this.update(existing.docs[0]._id, data);
        } else {
            // 新規作成
            return await this.save('daily_record', {
                ...data,
                organizationId: organizationId
            });
        }
    }

    async getDailyRecords(userId, startDate, endDate) {
        return await this.findByDateRange('daily_record', startDate, endDate, {
            selector: {
                type: 'daily_record',
                userId: userId,
                recordDate: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        });
    }

    async getTodayRecord(userId) {
        const today = new Date().toISOString().split('T')[0];
        const records = await this.findByDateRange('daily_record', today, today);
        return records.find(r => r.userId === userId) || null;
    }

    async getAttendance(date) {
        const records = await this.findByType('attendance');
        return records.filter(r => r.attendanceDate === date);
    }

    async saveAttendance(data) {
        const currentUser = await this.getCurrentUser();
        const organizationId = currentUser?.organizationId;

        // 既存レコード確認
        const existing = await this.db.find({
            selector: {
                type: 'attendance',
                userId: data.userId,
                attendanceDate: data.attendanceDate
            }
        });

        if (existing.docs.length > 0) {
            return await this.update(existing.docs[0]._id, data);
        } else {
            return await this.save('attendance', {
                ...data,
                organizationId: organizationId
            });
        }
    }

    async getAssessments() {
        return await this.findByType('assessment');
    }

    async createAssessment(data) {
        const currentUser = await this.getCurrentUser();
        return await this.save('assessment', {
            ...data,
            organizationId: currentUser.organizationId,
            createdBy: currentUser._id
        });
    }

    async getServicePlans() {
        return await this.findByType('service_plan');
    }

    async createServicePlan(data) {
        const currentUser = await this.getCurrentUser();
        return await this.save('service_plan', {
            ...data,
            organizationId: currentUser.organizationId,
            createdBy: currentUser._id
        });
    }

    // ==================== エクスポート機能 ====================

    async exportPDF(data) {
        // バックエンドAPI経由でPDF生成
        const response = await fetch(`${window.WHALE.API_URL}/api/export/pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('PDF export failed');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whale_report_${new Date().toISOString().split('T')[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return blob;
    }

    async exportExcel(data) {
        const response = await fetch(`${window.WHALE.API_URL}/api/export/excel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Excel export failed');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whale_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        return blob;
    }

    // ==================== バックアップ・復元 ====================

    async exportAll() {
        try {
            const allDocs = await this.db.allDocs({
                include_docs: true
            });

            const exportData = {
                version: this.version,
                timestamp: new Date().toISOString(),
                documents: allDocs.rows.map(row => row.doc),
                localStorage: this.getAllLocal()
            };

            return exportData;
        } catch (error) {
            console.error('❌ Export error:', error);
            throw error;
        }
    }

    getAllLocal() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                const cleanKey = key.replace(this.prefix, '');
                data[cleanKey] = this.getLocal(cleanKey);
            }
        }
        return data;
    }

    async backup() {
        const data = await this.exportAll();
        const filename = `whale_backup_${new Date().toISOString().split('T')[0]}.json`;
        this.downloadJSON(data, filename);
        console.log('✅ Backup created:', filename);
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async import(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const importData = JSON.parse(e.target.result);

                    if (!importData.version || !importData.documents) {
                        throw new Error('Invalid backup file format');
                    }

                    let successCount = 0;
                    for (const doc of importData.documents) {
                        try {
                            await this.db.put(doc);
                            successCount++;
                        } catch (error) {
                            console.warn('Import warning:', error);
                        }
                    }

                    if (importData.localStorage) {
                        Object.entries(importData.localStorage).forEach(([key, value]) => {
                            this.setLocal(key, value);
                        });
                    }

                    resolve({
                        success: true,
                        imported: successCount,
                        total: importData.documents.length
                    });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('File read error'));
            reader.readAsText(file);
        });
    }

    async cleanOldData(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const oldRecords = await this.db.find({
            selector: {
                type: 'daily_record',
                recordDate: { $lt: cutoffStr }
            }
        });

        let deletedCount = 0;
        for (const doc of oldRecords.docs) {
            try {
                await this.db.remove(doc);
                deletedCount++;
            } catch (error) {
                console.warn('Delete warning:', error);
            }
        }

        return {
            deleted: deletedCount,
            cutoffDate: cutoffStr
        };
    }

    async reset() {
        if (!confirm('全データを削除してよろしいですか？この操作は取り消せません。')) {
            return false;
        }

        try {
            await this.db.destroy();
            
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keys.push(key);
                }
            }
            keys.forEach(key => localStorage.removeItem(key));

            await this.init();

            console.log('✅ Database reset complete');
            return true;
        } catch (error) {
            console.error('❌ Reset error:', error);
            throw error;
        }
    }

    getStorageInfo() {
        let localStorageSize = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                const value = localStorage.getItem(key);
                localStorageSize += key.length + (value ? value.length : 0);
            }
        }

        return {
            localStorage: {
                used: localStorageSize,
                usedMB: (localStorageSize / 1024 / 1024).toFixed(2),
                percentage: ((localStorageSize / (5 * 1024 * 1024)) * 100).toFixed(2)
            }
        };
    }
}

// グローバルインスタンス作成
window.WhaleStorage = new WhaleStorageManager();

console.log('🐋 WHALE Storage Manager loaded (v2.1.0)');

export default window.WhaleStorage;
