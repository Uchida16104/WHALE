/**
 * WHALE Storage Manager
 * LocalStorage + PouchDB統合データ管理
 * @version 2.0.0
 */

class WhaleStorageManager {
    constructor() {
        this.version = '2.0.0';
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
            // PouchDB初期化
            this.db = new PouchDB('whale_database');
            console.log('✅ PouchDB initialized');

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
            { fields: ['type', 'userId', 'recordDate'] }
        ];

        for (const index of indexes) {
            try {
                await this.db.createIndex({ index });
            } catch (error) {
                console.warn('Index creation warning:', error);
            }
        }
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

    /**
     * LocalStorage保存
     */
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

    /**
     * LocalStorage取得
     */
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

    /**
     * LocalStorage削除
     */
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

    /**
     * ドキュメント保存
     */
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

    /**
     * ドキュメント取得
     */
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

    /**
     * ドキュメント更新
     */
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

    /**
     * ドキュメント削除
     */
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

    /**
     * タイプ別クエリ
     */
    async findByType(type, options = {}) {
        try {
            const result = await this.db.find({
                selector: { type: type },
                ...options
            });
            return result.docs;
        } catch (error) {
            console.error('❌ Query error:', error);
            throw error;
        }
    }

    /**
     * ユーザー別クエリ
     */
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
            throw error;
        }
    }

    /**
     * 日付範囲クエリ
     */
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
            throw error;
        }
    }

    // ==================== 高レベルAPI ====================

    /**
     * 組織作成
     */
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

    /**
     * 組織取得
     */
    async getOrganization(organizationId) {
        const orgs = await this.findByType('organization');
        return orgs.find(o => o.organizationId === organizationId);
    }

    /**
     * ユーザー作成
     */
    async createUser(data) {
        return await this.save('user', {
            userId: data.userId,
            organizationId: data.organizationId,
            name: data.name,
            nameKana: data.nameKana,
            role: data.role,
            postalCode: data.postalCode,
            address: data.address,
            phone: data.phone,
            birthday: data.birthday,
            passwordHash: data.passwordHash
        });
    }

    /**
     * ユーザー取得（認証用）
     */
    async getUserByCredentials(organizationId, userId) {
        const users = await this.findByType('user');
        return users.find(u => 
            u.organizationId === organizationId && 
            u.userId === userId
        );
    }

    /**
     * 現在のユーザー取得
     */
    async getCurrentUser() {
        const userId = this.getLocal('currentUserId');
        if (!userId) return null;
        return await this.get(userId);
    }

    /**
     * 日々の記録保存
     */
    async saveDailyRecord(data) {
        return await this.save('daily_record', {
            userId: data.userId,
            organizationId: data.organizationId,
            recordDate: data.recordDate,
            wakeUpTime: data.wakeUpTime,
            sleepTime: data.sleepTime,
            arrivalTime: data.arrivalTime,
            departureTime: data.departureTime,
            breakfast: data.breakfast,
            breakfastAppetite: data.breakfastAppetite,
            breakfastContent: data.breakfastContent,
            lunch: data.lunch,
            lunchAppetite: data.lunchAppetite,
            lunchContent: data.lunchContent,
            dinner: data.dinner,
            dinnerAppetite: data.dinnerAppetite,
            dinnerContent: data.dinnerContent,
            mealProvided: data.mealProvided,
            exercise: data.exercise,
            exerciseType: data.exerciseType,
            exerciseDuration: data.exerciseDuration,
            steps: data.steps,
            bathing: data.bathing,
            bathingTime: data.bathingTime,
            bathingAssistanceLevel: data.bathingAssistanceLevel,
            faceWash: data.faceWash,
            toothBrushing: data.toothBrushing,
            temperature: data.temperature,
            bloodPressureHigh: data.bloodPressureHigh,
            bloodPressureLow: data.bloodPressureLow,
            pulse: data.pulse,
            spo2: data.spo2,
            moodScore: data.moodScore,
            moodDetail: data.moodDetail,
            thoughts: data.thoughts,
            feelings: data.feelings,
            concerns: data.concerns,
            consultation: data.consultation,
            achievements: data.achievements,
            improvements: data.improvements
        });
    }

    /**
     * 日々の記録取得
     */
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

    /**
     * 今日の記録取得または作成
     */
    async getTodayRecord(userId) {
        const today = new Date().toISOString().split('T')[0];
        const records = await this.findByDateRange('daily_record', today, today);
        const existing = records.find(r => r.userId === userId);
        
        if (existing) {
            return existing;
        }

        // 新規作成
        const user = await this.get(userId);
        return await this.saveDailyRecord({
            userId: userId,
            organizationId: user.organizationId,
            recordDate: today
        });
    }

    // ==================== データエクスポート ====================

    /**
     * 全データエクスポート
     */
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

    /**
     * LocalStorage全取得
     */
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

    /**
     * JSONダウンロード
     */
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

    /**
     * バックアップ
     */
    async backup() {
        const data = await this.exportAll();
        const filename = `whale_backup_${new Date().toISOString().split('T')[0]}.json`;
        this.downloadJSON(data, filename);
        console.log('✅ Backup created:', filename);
    }

    /**
     * データインポート
     */
    async import(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const importData = JSON.parse(e.target.result);

                    if (!importData.version || !importData.documents) {
                        throw new Error('Invalid backup file format');
                    }

                    // PouchDBデータ復元
                    let successCount = 0;
                    for (const doc of importData.documents) {
                        try {
                            await this.db.put(doc);
                            successCount++;
                        } catch (error) {
                            console.warn('Import warning:', error);
                        }
                    }

                    // LocalStorageデータ復元
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

    // ==================== 同期機能 ====================

    /**
     * リモート同期設定
     */
    setupSync(remoteUrl) {
        if (this.syncHandler) {
            this.syncHandler.cancel();
        }

        this.syncHandler = this.db.sync(remoteUrl, {
            live: true,
            retry: true
        })
        .on('change', (info) => {
            console.log('🔄 Sync change:', info);
        })
        .on('paused', (err) => {
            console.log('⏸️ Sync paused:', err);
        })
        .on('active', () => {
            console.log('▶️ Sync active');
        })
        .on('denied', (err) => {
            console.error('🚫 Sync denied:', err);
        })
        .on('complete', (info) => {
            console.log('✅ Sync complete:', info);
        })
        .on('error', (err) => {
            console.error('❌ Sync error:', err);
        });
    }

    /**
     * 同期停止
     */
    stopSync() {
        if (this.syncHandler) {
            this.syncHandler.cancel();
            this.syncHandler = null;
        }
    }

    // ==================== ユーティリティ ====================

    /**
     * ストレージ使用量取得
     */
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
     * 古いデータ削除
     */
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

    /**
     * データベースリセット
     */
    async reset() {
        if (!confirm('全データを削除してよろしいですか？この操作は取り消せません。')) {
            return false;
        }

        try {
            // PouchDB削除
            await this.db.destroy();
            
            // LocalStorage削除
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    keys.push(key);
                }
            }
            keys.forEach(key => localStorage.removeItem(key));

            // 再初期化
            await this.init();

            console.log('✅ Database reset complete');
            return true;
        } catch (error) {
            console.error('❌ Reset error:', error);
            throw error;
        }
    }
}

// グローバルインスタンス作成
window.WhaleStorage = new WhaleStorageManager();

// 使用例ログ
console.log('🐋 WHALE Storage Manager loaded');

export default window.WhaleStorage;
