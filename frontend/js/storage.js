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
        this.syncHandler = null;
        this.initialized = false;
        this.syncEnabled = true;
        this.changeListeners = new Map();
    }

    /**
     * ストレージ初期化
     */
    async init() {
        if (this.initialized) return;

        try {
            console.log('🔄 Initializing PouchDB with Find Plugin...');
            
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

            // 変更監視開始
            this.startChangeMonitoring();

            // 同期開始
            if (this.syncEnabled) {
                await this.startSync();
            }

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
            { fields: ['type', 'assessmentDate'] },
            { fields: ['type', 'startDate'] }
        ];

        for (const index of indexes) {
            try {
                await this.db.createIndex({ index });
            } catch (error) {
                console.warn('Index creation warning:', error);
            }
        }
        console.log('✅ All indexes created');
    }

    /**
     * 変更監視開始
     */
    startChangeMonitoring() {
        this.db.changes({
            since: 'now',
            live: true,
            include_docs: true
        }).on('change', (change) => {
            console.log('🔔 Database change detected:', change.id);
            this.notifyListeners(change);
            
            // カスタムイベント発火
            window.dispatchEvent(new CustomEvent('whale:datachange', {
                detail: { change }
            }));
        }).on('error', (err) => {
            console.error('Change monitoring error:', err);
        });
    }

    /**
     * 変更リスナー登録
     */
    addChangeListener(id, callback) {
        this.changeListeners.set(id, callback);
    }

    /**
     * 変更リスナー削除
     */
    removeChangeListener(id) {
        this.changeListeners.delete(id);
    }

    /**
     * リスナーに通知
     */
    notifyListeners(change) {
        this.changeListeners.forEach((callback) => {
            try {
                callback(change);
            } catch (error) {
                console.error('Listener callback error:', error);
            }
        });
    }

    /**
     * 同期開始
     */
    async startSync() {
        // リアルタイム同期の実装
        // 本番環境ではCouchDB/RemotePouchDBと同期
        console.log('🔄 Sync enabled (local only in this version)');
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

            // _revが存在する場合は削除（新規作成の場合）
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

    async findByType(type, options = {}) {
        try {
            const result = await this.db.find({
                selector: { type: type },
                sort: [{ 'createdAt': 'desc' }],
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
                sort: [{ 'createdAt': 'desc' }],
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
        
        // 既存レコード確認（修正版）
        const existing = await this.db.find({
            selector: {
                type: 'daily_record',
                userId: data.userId,
                recordDate: data.recordDate
            },
            limit: 1
        });

        if (existing.docs.length > 0) {
            // 更新
            const doc = existing.docs[0];
            return await this.update(doc._id, {
                ...data,
                organizationId: organizationId
            });
        } else {
            // 新規作成
            return await this.save('daily_record', {
                ...data,
                organizationId: organizationId
            });
        }
    }

    async getDailyRecords(userId, startDate, endDate) {
        try {
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
            return result.docs;
        } catch (error) {
            console.error('Get daily records error:', error);
            return [];
        }
    }

    async getTodayRecord(userId) {
        const today = new Date().toISOString().split('T')[0];
        const records = await this.getDailyRecords(userId, today, today);
        return records[0] || null;
    }

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

        // 既存レコード確認
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

    // ==================== 印刷機能 ====================

    async printAssessment(assessmentId) {
        try {
            const assessment = await this.get(assessmentId);
            if (!assessment) throw new Error('Assessment not found');

            const users = await this.getUsers();
            const user = users.find(u => u._id === assessment.userId);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(this.generateAssessmentHTML(assessment, user));
            printWindow.document.close();
            
            printWindow.onload = () => {
                printWindow.print();
            };
        } catch (error) {
            console.error('Print assessment error:', error);
            throw error;
        }
    }

    generateAssessmentHTML(assessment, user) {
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>アセスメント - ${user?.name || '利用者'}</title>
    <style>
        body { font-family: 'MS Gothic', sans-serif; padding: 40px; }
        h1 { text-align: center; border-bottom: 3px solid #333; padding-bottom: 10px; }
        .section { margin: 30px 0; page-break-inside: avoid; }
        .label { font-weight: bold; color: #555; margin-top: 15px; }
        .content { margin-left: 20px; padding: 10px; background: #f9f9f9; border-left: 3px solid #3b82f6; }
        .header-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <h1>アセスメント</h1>
    <div class="header-info">
        <div><strong>利用者:</strong> ${user?.name || '不明'}</div>
        <div><strong>アセスメント日:</strong> ${assessment.assessmentDate ? new Date(assessment.assessmentDate).toLocaleDateString('ja-JP') : '-'}</div>
    </div>

    <div class="section">
        <div class="label">生活状況</div>
        <div class="content">${assessment.livingCondition || '-'}</div>
    </div>

    <div class="section">
        <div class="label">健康状態</div>
        <div class="content">${assessment.healthCondition || '-'}</div>
    </div>

    <div class="section">
        <div class="label">ADL（日常生活動作）</div>
        <div class="content">${assessment.adl || '-'}</div>
    </div>

    <div class="section">
        <div class="label">コミュニケーション能力</div>
        <div class="content">${assessment.communication || '-'}</div>
    </div>

    <div class="section">
        <div class="label">社会参加状況</div>
        <div class="content">${assessment.socialParticipation || '-'}</div>
    </div>

    <div class="section">
        <div class="label">ニーズと課題</div>
        <div class="content">${assessment.needs || '-'}</div>
    </div>

    <div class="section">
        <div class="label">支援方針</div>
        <div class="content">${assessment.supportPlan || '-'}</div>
    </div>

    <div style="margin-top: 50px; text-align: right; font-size: 12px; color: #666;">
        作成日時: ${assessment.createdAt ? new Date(assessment.createdAt).toLocaleString('ja-JP') : '-'}
    </div>

    <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">印刷</button>
        <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">閉じる</button>
    </div>
</body>
</html>
        `;
    }

    async printServicePlan(planId) {
        try {
            const plan = await this.get(planId);
            if (!plan) throw new Error('Service plan not found');

            const users = await this.getUsers();
            const user = users.find(u => u._id === plan.userId);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(this.generateServicePlanHTML(plan, user));
            printWindow.document.close();
            
            printWindow.onload = () => {
                printWindow.print();
            };
        } catch (error) {
            console.error('Print service plan error:', error);
            throw error;
        }
    }

    generateServicePlanHTML(plan, user) {
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>サービス利用計画 - ${user?.name || '利用者'}</title>
    <style>
        body { font-family: 'MS Gothic', sans-serif; padding: 40px; }
        h1 { text-align: center; border-bottom: 3px solid #333; padding-bottom: 10px; }
        .section { margin: 30px 0; page-break-inside: avoid; }
        .label { font-weight: bold; color: #555; margin-top: 15px; }
        .content { margin-left: 20px; padding: 10px; background: #f9f9f9; border-left: 3px solid #10b981; }
        .header-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <h1>サービス利用計画書</h1>
    <div class="header-info">
        <div><strong>利用者:</strong> ${user?.name || '不明'}</div>
        <div><strong>計画期間:</strong> ${plan.startDate ? new Date(plan.startDate).toLocaleDateString('ja-JP') : '-'} ～ ${plan.endDate ? new Date(plan.endDate).toLocaleDateString('ja-JP') : '-'}</div>
    </div>

    <div class="section">
        <div class="label">利用者の希望</div>
        <div class="content">${plan.userWish || '-'}</div>
    </div>

    <div class="section">
        <div class="label">総合的な支援方針</div>
        <div class="content">${plan.overallPolicy || '-'}</div>
    </div>

    <div class="section">
        <div class="label">長期目標</div>
        <div class="content">${plan.longTermGoal || '-'}</div>
    </div>

    <div class="section">
        <div class="label">短期目標</div>
        <div class="content">${plan.shortTermGoal || '-'}</div>
    </div>

    <div class="section">
        <div class="label">具体的なサービス内容</div>
        <div class="content">${plan.serviceContent || '-'}</div>
    </div>

    <div class="section">
        <div class="label">週間計画</div>
        <div class="content">${plan.weeklyPlan || '-'}</div>
    </div>

    <div class="section">
        <div class="label">緊急時の対応</div>
        <div class="content">${plan.emergencyResponse || '-'}</div>
    </div>

    <div style="margin-top: 50px; text-align: right; font-size: 12px; color: #666;">
        作成日時: ${plan.createdAt ? new Date(plan.createdAt).toLocaleString('ja-JP') : '-'}
    </div>

    <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">印刷</button>
        <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-left: 10px;">閉じる</button>
    </div>
</body>
</html>
        `;
    }

    // ==================== エクスポート機能 ====================

    async exportPDF(data) {
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

console.log('🐋 WHALE Storage Manager loaded (v2.2.0 - Fixed)');

export default window.WhaleStorage;
