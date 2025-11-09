/**
 * WHALE Storage Manager - 完全修正版
 * @version 2.6.0 - CSV専用 & 全利用者データ対応 & モバイル対応
 */

class WhaleStorageManager {
    constructor() {
        this.version = '2.6.0';
        this.prefix = 'whale_';
        this.db = null;
        this.syncHandler = null;
        this.initialized = false;
        this.initializationPromise = null;
        this.syncEnabled = true;
        this.changeListeners = new Map();
    }

    async init() {
        // 既に初期化中の場合は同じPromiseを返す
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        if (this.initialized) {
            return Promise.resolve();
        }

        this.initializationPromise = this._performInit();
        return this.initializationPromise;
    }

    async _performInit() {
        try {
            console.log('🔄 Initializing PouchDB...');
            
            // PouchDBの存在確認
            if (typeof PouchDB === 'undefined') {
                throw new Error('PouchDB is not loaded');
            }

            // データベース作成
            this.db = new PouchDB('whale_database', {
                auto_compaction: true,
                revs_limit: 10
            });
            
            // Find Pluginの確認
            if (typeof this.db.find !== 'function') {
                throw new Error('PouchDB Find Plugin is not loaded');
            }
            
            console.log('✅ PouchDB initialized');

            await this.createIndexes();
            this.initLocalStorage();
            this.startChangeMonitoring();

            this.initialized = true;
            console.log('✅ Storage initialization complete');
        } catch (error) {
            console.error('❌ Storage initialization failed:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    async createIndexes() {
        console.log('📊 Creating indexes...');
        
        const indexes = [
            { fields: ['type'] },
            { fields: ['type', 'organizationId'] },
            { fields: ['type', 'userId'] },
            { fields: ['type', 'userId', 'recordDate'] },
            { fields: ['type', 'recordDate'] },
            { fields: ['recordDate'] },
            { fields: ['type', 'attendanceDate'] },
            { fields: ['type', 'assessmentDate'] },
            { fields: ['type', 'startDate'] },
            { fields: ['createdAt'] }
        ];

        for (const index of indexes) {
            try {
                await this.db.createIndex({ index });
                console.log('✅ Index created:', index.fields.join(', '));
            } catch (error) {
                if (!error.message.includes('exists')) {
                    console.warn('⚠️ Index creation warning:', error.message);
                }
            }
        }
        
        console.log('✅ All indexes ready');
    }

    startChangeMonitoring() {
        this.db.changes({
            since: 'now',
            live: true,
            include_docs: true
        }).on('change', (change) => {
            console.log('🔔 Database change:', change.id);
            this.notifyListeners(change);
            
            window.dispatchEvent(new CustomEvent('whale:datachange', {
                detail: { change }
            }));
        }).on('error', (err) => {
            console.error('Change monitoring error:', err);
        });
    }

    addChangeListener(id, callback) {
        this.changeListeners.set(id, callback);
    }

    removeChangeListener(id) {
        this.changeListeners.delete(id);
    }

    notifyListeners(change) {
        this.changeListeners.forEach((callback) => {
            try {
                callback(change);
            } catch (error) {
                console.error('Listener callback error:', error);
            }
        });
    }

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

            if (!data._rev) {
                delete doc._rev;
            }

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
                throw new Error('Document not found: ' + id);
            }

            const updated = {
                ...doc,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            const result = await this.db.put(updated);
            console.log('✅ Document updated:', result.id);
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
            return true;
        } catch (error) {
            console.error('❌ Delete error:', error);
            throw error;
        }
    }

    // ==================== 組織・ユーザー管理 ====================

    async createOrganization(data) {
        try {
            const existing = await this.getOrganization(data.organizationId);
            if (existing) {
                console.warn('⚠️ Organization exists, returning existing');
                return existing;
            }

            const org = await this.save('organization', {
                organizationId: data.organizationId,
                name: data.name,
                postalCode: data.postalCode,
                address: data.address,
                phone: data.phone,
                establishedDate: data.establishedDate
            });

            console.log('✅ Organization created:', org._id);
            return org;
        } catch (error) {
            console.error('❌ Create organization error:', error);
            throw error;
        }
    }

    async getOrganization(organizationId) {
        try {
            if (!organizationId) return null;

            const allDocs = await this.db.allDocs({
                include_docs: true,
                startkey: 'organization_',
                endkey: 'organization_\ufff0'
            });

            const org = allDocs.rows
                .filter(row => row.doc && row.doc.type === 'organization')
                .map(row => row.doc)
                .find(o => o.organizationId === organizationId);

            return org || null;
        } catch (error) {
            console.error('❌ Get organization error:', error);
            return null;
        }
    }

    async createUser(data) {
        try {
            const currentUser = await this.getCurrentUser();
            const organizationId = data.organizationId || currentUser?.organizationId;
            
            if (!organizationId) {
                throw new Error('組織IDが指定されていません');
            }

            let passwordHash = data.passwordHash;
            if (data.password && !passwordHash) {
                passwordHash = await this.hashPassword(data.password);
            }

            const user = await this.save('user', {
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

            console.log('✅ User created:', user._id);
            return user;
        } catch (error) {
            console.error('❌ Create user error:', error);
            throw error;
        }
    }

    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async getUserByCredentials(organizationId, userId) {
        try {
            if (!organizationId || !userId) return null;

            const allDocs = await this.db.allDocs({
                include_docs: true,
                startkey: 'user_',
                endkey: 'user_\ufff0'
            });

            const user = allDocs.rows
                .filter(row => row.doc && row.doc.type === 'user')
                .map(row => row.doc)
                .find(u => u.organizationId === organizationId && u.userId === userId);

            return user || null;
        } catch (error) {
            console.error('❌ Get user by credentials error:', error);
            return null;
        }
    }

    async getCurrentUser() {
        const userId = this.getLocal('currentUserId');
        if (!userId) return null;
        return await this.get(userId);
    }

    async getUsers() {
        const currentUser = await this.getCurrentUser();
        if (!currentUser) return [];
        
        try {
            const result = await this.db.find({
                selector: {
                    type: 'user',
                    organizationId: currentUser.organizationId
                }
            });
            return result.docs;
        } catch (error) {
            console.error('Get users error:', error);
            return [];
        }
    }

    async updateUser(userId, updates) {
        return await this.update(userId, updates);
    }

    // ==================== 日々の記録管理 ====================

    async saveDailyRecord(data) {
        try {
            const currentUser = await this.getCurrentUser();
            const organizationId = data.organizationId || currentUser?.organizationId;
            
            const existing = await this.db.find({
                selector: {
                    type: 'daily_record',
                    userId: data.userId,
                    recordDate: data.recordDate
                },
                limit: 1
            });

            if (existing.docs.length > 0) {
                const doc = existing.docs[0];
                return await this.update(doc._id, {
                    ...data,
                    organizationId: organizationId
                });
            } else {
                return await this.save('daily_record', {
                    ...data,
                    organizationId: organizationId
                });
            }
        } catch (error) {
            console.error('❌ Save daily record error:', error);
            throw error;
        }
    }

    async getDailyRecords(userId, startDate, endDate) {
        try {
            console.log('📊 Getting daily records:', { userId, startDate, endDate });
            
            const result = await this.db.find({
                selector: {
                    type: 'daily_record',
                    userId: userId,
                    recordDate: {
                        $gte: startDate,
                        $lte: endDate
                    }
                },
                sort: [{ recordDate: 'desc' }]
            });
            
            console.log('✅ Found', result.docs.length, 'records');
            return result.docs;
        } catch (error) {
            console.error('❌ Get daily records error:', error);
            return [];
        }
    }

    // 🔥 新規追加: 全利用者の記録を取得
    async getAllDailyRecords(startDate, endDate) {
        try {
            console.log('📊 Getting ALL daily records:', { startDate, endDate });
            
            const result = await this.db.find({
                selector: {
                    type: 'daily_record',
                    recordDate: {
                        $gte: startDate,
                        $lte: endDate
                    }
                },
                sort: [{ recordDate: 'desc' }]
            });
            
            console.log('✅ Found', result.docs.length, 'total records');
            return result.docs;
        } catch (error) {
            console.error('❌ Get all daily records error:', error);
            return [];
        }
    }

    async getTodayRecord(userId) {
        const today = new Date().toISOString().split('T')[0];
        const records = await this.getDailyRecords(userId, today, today);
        return records[0] || null;
    }

    // ==================== 出席管理 ====================

    async getAttendance(date) {
        try {
            const result = await this.db.find({
                selector: {
                    type: 'attendance',
                    attendanceDate: date
                }
            });
            return result.docs;
        } catch (error) {
            console.error('Get attendance error:', error);
            return [];
        }
    }

    async saveAttendance(data) {
        const currentUser = await this.getCurrentUser();
        const organizationId = currentUser?.organizationId;

        const existing = await this.db.find({
            selector: {
                type: 'attendance',
                userId: data.userId,
                attendanceDate: data.attendanceDate
            },
            limit: 1
        });

        if (existing.docs.length > 0) {
            return await this.update(existing.docs[0]._id, {
                ...data,
                organizationId: organizationId
            });
        } else {
            return await this.save('attendance', {
                ...data,
                organizationId: organizationId
            });
        }
    }

    // ==================== アセスメント管理 ====================

    async getAssessments() {
        try {
            const result = await this.db.find({
                selector: { type: 'assessment' }
            });
            return result.docs;
        } catch (error) {
            console.error('Get assessments error:', error);
            return [];
        }
    }

    async createAssessment(data) {
        const currentUser = await this.getCurrentUser();
        return await this.save('assessment', {
            ...data,
            organizationId: currentUser.organizationId,
            createdBy: currentUser._id
        });
    }

    // ==================== サービス計画管理 ====================

    async getServicePlans() {
        try {
            const result = await this.db.find({
                selector: { type: 'service_plan' }
            });
            return result.docs;
        } catch (error) {
            console.error('Get service plans error:', error);
            return [];
        }
    }

    async createServicePlan(data) {
        const currentUser = await this.getCurrentUser();
        return await this.save('service_plan', {
            ...data,
            organizationId: currentUser.organizationId,
            createdBy: currentUser._id
        });
    }

    // ==================== 🔥 CSV専用エクスポート ====================

    /**
     * 日々の記録をCSVエクスポート
     */
    async exportDailyRecordsCSV(records, users = null) {
        try {
            console.log('📋 Exporting daily records to CSV...');
            
            // ユーザー情報のマップを作成
            const userMap = {};
            if (users && Array.isArray(users)) {
                users.forEach(u => {
                    userMap[u._id] = u.name;
                });
            }

            // CSVヘッダー
            const headers = [
                '日付', '利用者', '起床時間', '就寝時間', '通所時間', '退所時間',
                '朝食', '昼食', '夕食', '体温', '血圧(高)', '血圧(低)', '脈拍',
                'SpO2', '気分スコア', '気分詳細', '運動', '入浴', '洗面', '歯磨き'
            ];

            // CSV生成
            let csv = headers.join(',') + '\n';

            records.forEach(record => {
                const userName = userMap[record.userId] || record.userName || 'unknown';
                const row = [
                    record.recordDate || '',
                    `"${userName}"`,
                    record.wakeUpTime || '',
                    record.sleepTime || '',
                    record.arrivalTime || '',
                    record.departureTime || '',
                    record.breakfast ? '有' : '無',
                    record.lunch ? '有' : '無',
                    record.dinner ? '有' : '無',
                    record.temperature || '',
                    record.bloodPressureHigh || '',
                    record.bloodPressureLow || '',
                    record.pulse || '',
                    record.spo2 || '',
                    record.moodScore || '',
                    `"${(record.moodDetail || '').replace(/"/g, '""')}"`,
                    record.exercise ? '有' : '無',
                    record.bathing ? '有' : '無',
                    record.faceWash ? '有' : '無',
                    record.toothBrushing ? '有' : '無'
                ];
                csv += row.join(',') + '\n';
            });

            // BOM付きでダウンロード（Excel対応）
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whale_daily_records_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ CSV exported successfully');
            return true;
        } catch (error) {
            console.error('❌ CSV export error:', error);
            throw error;
        }
    }

    /**
     * アセスメントをCSVエクスポート
     */
    async exportAssessmentsCSV(assessments, users = null) {
        try {
            console.log('📋 Exporting assessments to CSV...');
            
            const userMap = {};
            if (users && Array.isArray(users)) {
                users.forEach(u => {
                    userMap[u._id] = u.name;
                });
            }

            const headers = [
                '日付', '利用者', '生活状況', '健康状態', 'ADL',
                'コミュニケーション', '社会参加', 'ニーズ', '支援方針', '作成日時'
            ];

            let csv = headers.join(',') + '\n';

            assessments.forEach(assessment => {
                const userName = userMap[assessment.userId] || 'unknown';
                const row = [
                    assessment.assessmentDate || '',
                    `"${userName}"`,
                    `"${(assessment.livingCondition || '').replace(/"/g, '""')}"`,
                    `"${(assessment.healthCondition || '').replace(/"/g, '""')}"`,
                    `"${(assessment.adl || '').replace(/"/g, '""')}"`,
                    `"${(assessment.communication || '').replace(/"/g, '""')}"`,
                    `"${(assessment.socialParticipation || '').replace(/"/g, '""')}"`,
                    `"${(assessment.needs || '').replace(/"/g, '""')}"`,
                    `"${(assessment.supportPlan || '').replace(/"/g, '""')}"`,
                    assessment.createdAt || ''
                ];
                csv += row.join(',') + '\n';
            });

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whale_assessments_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ Assessments CSV exported');
            return true;
        } catch (error) {
            console.error('❌ Assessments CSV export error:', error);
            throw error;
        }
    }

    /**
     * サービス計画をCSVエクスポート
     */
    async exportServicePlansCSV(plans, users = null) {
        try {
            console.log('📋 Exporting service plans to CSV...');
            
            const userMap = {};
            if (users && Array.isArray(users)) {
                users.forEach(u => {
                    userMap[u._id] = u.name;
                });
            }

            const headers = [
                '利用者', '開始日', '終了日', '利用者の希望', '支援方針',
                '長期目標', '短期目標', 'サービス内容', '週間計画', '緊急時対応', '作成日時'
            ];

            let csv = headers.join(',') + '\n';

            plans.forEach(plan => {
                const userName = userMap[plan.userId] || 'unknown';
                const row = [
                    `"${userName}"`,
                    plan.startDate || '',
                    plan.endDate || '',
                    `"${(plan.userWish || '').replace(/"/g, '""')}"`,
                    `"${(plan.overallPolicy || '').replace(/"/g, '""')}"`,
                    `"${(plan.longTermGoal || '').replace(/"/g, '""')}"`,
                    `"${(plan.shortTermGoal || '').replace(/"/g, '""')}"`,
                    `"${(plan.serviceContent || '').replace(/"/g, '""')}"`,
                    `"${(plan.weeklyPlan || '').replace(/"/g, '""')}"`,
                    `"${(plan.emergencyResponse || '').replace(/"/g, '""')}"`,
                    plan.createdAt || ''
                ];
                csv += row.join(',') + '\n';
            });

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whale_service_plans_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ Service plans CSV exported');
            return true;
        } catch (error) {
            console.error('❌ Service plans CSV export error:', error);
            throw error;
        }
    }

    // ==================== データ管理 ====================

    async backup() {
        try {
            console.log('💾 Creating backup...');

            const allDocs = await this.db.allDocs({
                include_docs: true
            });

            const backup = {
                version: this.version,
                timestamp: new Date().toISOString(),
                documents: allDocs.rows.map(row => row.doc)
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whale_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ Backup created successfully');
        } catch (error) {
            console.error('❌ Backup error:', error);
            throw error;
        }
    }

    async import(file) {
        try {
            console.log('📥 Importing data...');

            const text = await file.text();
            const backup = JSON.parse(text);

            if (!backup.documents || !Array.isArray(backup.documents)) {
                throw new Error('無効なバックアップファイル形式です');
            }

            let imported = 0;
            const total = backup.documents.length;

            for (const doc of backup.documents) {
                try {
                    await this.db.put(doc);
                    imported++;
                } catch (error) {
                    console.warn('Failed to import document:', doc._id, error);
                }
            }

            console.log(`✅ Imported ${imported}/${total} documents`);
            return { imported, total };
        } catch (error) {
            console.error('❌ Import error:', error);
            throw error;
        }
    }

    async cleanOldData(days = 90) {
        try {
            console.log(`🗑️ Cleaning data older than ${days} days...`);

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            const result = await this.db.find({
                selector: {
                    type: 'daily_record',
                    recordDate: { $lt: cutoffStr }
                }
            });

            let deleted = 0;
            for (const doc of result.docs) {
                await this.db.remove(doc);
                deleted++;
            }

            console.log(`✅ Deleted ${deleted} old records`);
            return { deleted };
        } catch (error) {
            console.error('❌ Clean error:', error);
            throw error;
        }
    }

    async reset() {
        try {
            console.log('⚠️ Resetting all data...');

            await this.db.destroy();
            
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });

            this.initialized = false;
            this.initializationPromise = null;
            await this.init();

            console.log('✅ Data reset complete');
        } catch (error) {
            console.error('❌ Reset error:', error);
            throw error;
        }
    }

    getStorageInfo() {
        let localStorageSize = 0;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorageSize += localStorage.getItem(key).length;
            }
        });

        return {
            localStorage: {
                used: localStorageSize,
                usedMB: (localStorageSize / 1024 / 1024).toFixed(2)
            }
        };
    }
}

// グローバルインスタンス作成
window.WhaleStorage = new WhaleStorageManager();

console.log('🐋 WHALE Storage Manager loaded (v2.6.0 - CSV Only & All Users Support)');

export default window.WhaleStorage;
