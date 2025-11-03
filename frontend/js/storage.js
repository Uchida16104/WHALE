/**
 * WHALE Storage Manager - 完全修正版
 * LocalStorage + PouchDB統合データ管理 + リアルタイム同期
 * @version 2.2.0
 */

class WhaleStorageManager {
    constructor() {
        this.version = '2.2.0';
        this.prefix = 'whale_';
        this.db = null;
        this.remoteDb = null;
        this.syncHandler = null;
        this.initialized = false;
        this.changeListeners = new Set();
        this.syncInterval = null;
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
            this.db = new PouchDB('whale_database', {
                auto_compaction: true,
                revs_limit: 10
            });
            
            // Find Pluginの確認
            if (typeof this.db.find !== 'function') {
                throw new Error('PouchDB Find Plugin is not loaded. Please check CDN connection.');
            }
            
            console.log('✅ PouchDB initialized with Find Plugin');

            // インデックス作成
            await this.createIndexes();

            // LocalStorage初期設定
            this.initLocalStorage();

            // リアルタイム同期開始
            await this.initRealtimeSync();

            // 変更監視開始
            this.startChangeListener();

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
            { fields: ['type', 'organizationId', 'userId'] },
            { fields: ['type', 'attendanceDate'] },
            { fields: ['updatedAt'] }
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

    /**
     * リアルタイム同期初期化
     */
    async initRealtimeSync() {
        try {
            // バックエンドとの同期設定
            const currentUser = await this.getCurrentUser();
            if (!currentUser) return;

            // 定期同期（5分ごと）
            this.syncInterval = setInterval(async () => {
                if (navigator.onLine) {
                    await this.syncWithBackend();
                }
            }, 5 * 60 * 1000);

            // オンライン復帰時の即時同期
            window.addEventListener('online', async () => {
                await this.syncWithBackend();
            });

            console.log('✅ Realtime sync initialized');
        } catch (error) {
            console.warn('Sync initialization warning:', error);
        }
    }

    /**
     * バックエンドとの同期
     */
    async syncWithBackend() {
        try {
            if (!navigator.onLine) return;

            console.log('🔄 Syncing with backend...');

            // 最終同期時刻取得
            const lastSync = this.getLocal('lastSyncTime') || new Date(0).toISOString();

            // 変更されたドキュメント取得
            const changes = await this.db.find({
                selector: {
                    updatedAt: { $gt: lastSync }
                },
                limit: 100
            });

            if (changes.docs.length > 0) {
                // バックエンドに送信
                await fetch(`${window.WHALE.API_URL}/api/sync/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getLocal('authToken')}`
                    },
                    body: JSON.stringify({ documents: changes.docs })
                });

                console.log(`✅ Synced ${changes.docs.length} documents`);
            }

            // 最終同期時刻更新
            this.setLocal('lastSyncTime', new Date().toISOString());

            // 変更通知
            this.notifyChange('sync', { synced: changes.docs.length });

        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    /**
     * 変更監視開始
     */
    startChangeListener() {
        this.db.changes({
            since: 'now',
            live: true,
            include_docs: true
        }).on('change', (change) => {
            console.log('📝 Database changed:', change.id);
            this.notifyChange('change', change);
        }).on('error', (err) => {
            console.error('Change listener error:', err);
        });
    }

    /**
     * 変更通知
     */
    notifyChange(type, data) {
        const event = new CustomEvent('whale:storage:change', {
            detail: { type, data }
        });
        window.dispatchEvent(event);

        // 登録されたリスナーに通知
        this.changeListeners.forEach(listener => {
            try {
                listener(type, data);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    /**
     * 変更リスナー登録
     */
    addChangeListener(listener) {
        this.changeListeners.add(listener);
    }

    /**
     * 変更リスナー削除
     */
    removeChangeListener(listener) {
        this.changeListeners.delete(listener);
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
            
            // 同期実行
            if (navigator.onLine) {
                await this.syncWithBackend();
            }

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

            const result = await this.db.put(updated);
            console.log('✅ Document updated:', result.id);

            // 同期実行
            if (navigator.onLine) {
                await this.syncWithBackend();
            }

            return { ...updated, _rev: result.rev };
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

            // 同期実行
            if (navigator.onLine) {
                await this.syncWithBackend();
            }

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
                sort: [{ updatedAt: 'desc' }],
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
                sort: [{ updatedAt: 'desc' }],
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

    /**
     * 日々の記録保存（修正版）
     */
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
            const result = await this.update(existing.docs[0]._id, data);
            this.notifyChange('daily_record_updated', result);
            return result;
        } else {
            // 新規作成
            const result = await this.save('daily_record', {
                ...data,
                organizationId: organizationId
            });
            this.notifyChange('daily_record_created', result);
            return result;
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

    /**
     * 出席管理（修正版）
     */
    async getAttendance(date) {
        const records = await this.db.find({
            selector: {
                type: 'attendance',
                attendanceDate: date
            }
        });
        return records.docs;
    }

    async saveAttendance(data) {
        const currentUser = await this.getCurrentUser();
        const organizationId = currentUser?.organizationId;

        const existing = await this.db.find({
            selector: {
                type: 'attendance',
                userId: data.userId,
                attendanceDate: data.attendanceDate
            }
        });

        if (existing.docs.length > 0) {
            const result = await this.update(existing.docs[0]._id, data);
            this.notifyChange('attendance_updated', result);
            return result;
        } else {
            const result = await this.save('attendance', {
                ...data,
                organizationId: organizationId
            });
            this.notifyChange('attendance_created', result);
            return result;
        }
    }

    /**
     * アセスメント（修正版）
     */
    async getAssessments() {
        return await this.findByType('assessment');
    }

    async createAssessment(data) {
        const currentUser = await this.getCurrentUser();
        const result = await this.save('assessment', {
            ...data,
            organizationId: currentUser.organizationId,
            createdBy: currentUser._id
        });
        this.notifyChange('assessment_created', result);
        return result;
    }

    /**
     * サービス計画（修正版）
     */
    async getServicePlans() {
        return await this.findByType('service_plan');
    }

    async createServicePlan(data) {
        const currentUser = await this.getCurrentUser();
        const result = await this.save('service_plan', {
            ...data,
            organizationId: currentUser.organizationId,
            createdBy: currentUser._id
        });
        this.notifyChange('service_plan_created', result);
        return result;
    }

    // ==================== エクスポート機能 ====================

    async exportPDF(data) {
        const response = await fetch(`${window.WHALE.API_URL}/api/export/pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getLocal('authToken')}`
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getLocal('authToken')}`
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
            // 同期停止
            if (this.syncInterval) {
                clearInterval(this.syncInterval);
            }

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

    /**
     * クリーンアップ
     */
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.changeListeners.clear();
    }
}

// グローバルインスタンス作成
window.WhaleStorage = new WhaleStorageManager();

console.log('🐋 WHALE Storage Manager loaded (v2.2.0 - Fixed)');

export default window.WhaleStorage;
