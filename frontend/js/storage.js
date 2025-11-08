/**
 * WHALE Storage Manager - 完全修正版
 * @version 2.5.0 - エクスポート機能完全実装
 */

class WhaleStorageManager {
    constructor() {
        this.version = '2.5.0';
        this.prefix = 'whale_';
        this.db = null;
        this.syncHandler = null;
        this.initialized = false;
        this.syncEnabled = true;
        this.changeListeners = new Map();
    }

    async init() {
        if (this.initialized) return;

        try {
            console.log('🔄 Initializing PouchDB...');
            
            if (typeof PouchDB === 'undefined') {
                throw new Error('PouchDB is not loaded');
            }

            this.db = new PouchDB('whale_database', {
                auto_compaction: true,
                revs_limit: 10
            });
            
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

    // ==================== 高レベルAPI ====================

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
                use_index: ['type', 'userId', 'recordDate'],
                sort: [
                    { type: 'asc' },
                    { userId: 'asc' },
                    { recordDate: 'desc' }
                ]
            });
            
            console.log('✅ Found', result.docs.length, 'records');
            return result.docs;
        } catch (error) {
            console.error('❌ Get daily records error:', error);
            
            console.warn('⚠️ Falling back to non-indexed query');
            try {
                const result = await this.db.find({
                    selector: {
                        type: 'daily_record',
                        userId: userId,
                        recordDate: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                });
                
                result.docs.sort((a, b) => {
                    return new Date(b.recordDate) - new Date(a.recordDate);
                });
                
                return result.docs;
            } catch (fallbackError) {
                console.error('❌ Fallback query failed:', fallbackError);
                return [];
            }
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

    // ==================== 🔥 新規追加: エクスポート機能 ====================

    /**
     * PDF印刷（ブラウザ印刷ダイアログを使用）
     */
    async printAssessment(assessmentId) {
        try {
            const assessment = await this.get(assessmentId);
            if (!assessment) {
                throw new Error('アセスメントが見つかりません');
            }

            const user = await this.get(assessment.userId);
            
            // 印刷用HTMLを生成
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>アセスメント - ${user?.name || '不明'}</title>
                    <style>
                        body { font-family: 'Noto Sans JP', sans-serif; padding: 40px; }
                        h1 { border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
                        .section { margin: 20px 0; }
                        .label { font-weight: bold; color: #4b5563; margin-top: 15px; }
                        .value { margin-left: 20px; white-space: pre-wrap; }
                        @media print {
                            body { padding: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <h1>アセスメント</h1>
                    <div class="section">
                        <div class="label">利用者:</div>
                        <div class="value">${user?.name || '不明'}</div>
                    </div>
                    <div class="section">
                        <div class="label">アセスメント日:</div>
                        <div class="value">${assessment.assessmentDate ? new Date(assessment.assessmentDate).toLocaleDateString('ja-JP') : '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">生活状況:</div>
                        <div class="value">${assessment.livingCondition || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">健康状態:</div>
                        <div class="value">${assessment.healthCondition || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">ADL（日常生活動作）:</div>
                        <div class="value">${assessment.adl || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">コミュニケーション能力:</div>
                        <div class="value">${assessment.communication || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">社会参加状況:</div>
                        <div class="value">${assessment.socialParticipation || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">ニーズと課題:</div>
                        <div class="value">${assessment.needs || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">支援方針:</div>
                        <div class="value">${assessment.supportPlan || '-'}</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error('Print assessment error:', error);
            throw error;
        }
    }

    /**
     * サービス計画印刷
     */
    async printServicePlan(planId) {
        try {
            const plan = await this.get(planId);
            if (!plan) {
                throw new Error('サービス計画が見つかりません');
            }

            const user = await this.get(plan.userId);
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>サービス利用計画 - ${user?.name || '不明'}</title>
                    <style>
                        body { font-family: 'Noto Sans JP', sans-serif; padding: 40px; }
                        h1 { border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
                        .section { margin: 20px 0; page-break-inside: avoid; }
                        .label { font-weight: bold; color: #4b5563; margin-top: 15px; }
                        .value { margin-left: 20px; white-space: pre-wrap; }
                        @media print {
                            body { padding: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <h1>サービス利用計画</h1>
                    <div class="section">
                        <div class="label">利用者:</div>
                        <div class="value">${user?.name || '不明'}</div>
                    </div>
                    <div class="section">
                        <div class="label">計画期間:</div>
                        <div class="value">${plan.startDate ? new Date(plan.startDate).toLocaleDateString('ja-JP') : '-'} ～ ${plan.endDate ? new Date(plan.endDate).toLocaleDateString('ja-JP') : '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">利用者の希望:</div>
                        <div class="value">${plan.userWish || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">総合的な支援方針:</div>
                        <div class="value">${plan.overallPolicy || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">長期目標:</div>
                        <div class="value">${plan.longTermGoal || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">短期目標:</div>
                        <div class="value">${plan.shortTermGoal || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">具体的なサービス内容:</div>
                        <div class="value">${plan.serviceContent || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">週間計画:</div>
                        <div class="value">${plan.weeklyPlan || '-'}</div>
                    </div>
                    <div class="section">
                        <div class="label">緊急時の対応:</div>
                        <div class="value">${plan.emergencyResponse || '-'}</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error('Print service plan error:', error);
            throw error;
        }
    }

    /**
     * PDF エクスポート（バックエンドAPI経由）
     */
    async exportPDF(data) {
        try {
            console.log('📄 Exporting PDF...');
            
            // バックエンドAPIが利用可能か確認
            if (!window.WhaleAPI) {
                // フォールバック: ブラウザ印刷を使用
                console.warn('⚠️ Backend API not available, using browser print');
                return this.exportPDFViaPrint(data);
            }

            const blob = await window.WhaleAPI.exportPDF(
                data.records,
                data.analytics,
                data.organization
            );

            // ダウンロード
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whale_report_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ Excel exported successfully');
        } catch (error) {
            console.error('❌ Excel export error:', error);
            // フォールバック: CSV
            return this.exportCSV(data);
        }
    }

    /**
     * CSV エクスポート
     */
    async exportCSV(data) {
        try {
            console.log('📋 Exporting CSV...');
            const records = data.records || [];

            // CSVヘッダー
            const headers = [
                '日付', '利用者', '起床時間', '就寝時間', '通所時間', '退所時間',
                '朝食', '昼食', '夕食', '体温', '血圧(高)', '血圧(低)', '脈拍',
                'SpO2', '気分スコア', '運動', '入浴'
            ];

            // CSV生成
            let csv = headers.join(',') + '\n';

            records.forEach(record => {
                const row = [
                    record.recordDate || '',
                    `"${record.userName || ''}"`,
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
                    record.exercise ? '有' : '無',
                    record.bathing ? '有' : '無'
                ];
                csv += row.join(',') + '\n';
            });

            // BOM付きでダウンロード（Excel対応）
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whale_report_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ CSV exported successfully');
        } catch (error) {
            console.error('❌ CSV export error:', error);
            throw error;
        }
    }

    // ==================== データ管理機能 ====================

    /**
     * バックアップ
     */
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

    /**
     * データインポート
     */
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

    /**
     * 古いデータ削除
     */
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

    /**
     * 全データリセット
     */
    async reset() {
        try {
            console.log('⚠️ Resetting all data...');

            await this.db.destroy();
            
            // LocalStorage削除
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });

            // 再初期化
            this.initialized = false;
            await this.init();

            console.log('✅ Data reset complete');
        } catch (error) {
            console.error('❌ Reset error:', error);
            throw error;
        }
    }

    /**
     * ストレージ情報取得
     */
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

console.log('🐋 WHALE Storage Manager loaded (v2.5.0 - Export Functions Added)');

export default window.WhaleStorage;keObjectURL(url);

            console.log('✅ PDF exported successfully');
        } catch (error) {
            console.error('❌ PDF export error:', error);
            // フォールバック
            return this.exportPDFViaPrint(data);
        }
    }

    /**
     * PDFエクスポート（ブラウザ印刷フォールバック）
     */
    async exportPDFViaPrint(data) {
        const printWindow = window.open('', '_blank');
        const records = data.records || [];
        const analytics = data.analytics || {};
        const org = data.organization || {};

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WHALE レポート</title>
                <style>
                    body { font-family: 'Noto Sans JP', sans-serif; padding: 40px; }
                    h1 { border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
                    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                    .stat-item { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                    th { background: #f3f4f6; font-weight: bold; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <h1>WHALE システムレポート</h1>
                <p><strong>施設:</strong> ${org.name || '-'}</p>
                <p><strong>生成日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
                
                <h2>統計情報</h2>
                <div class="stats">
                    <div class="stat-item">
                        <div>記録総数</div>
                        <div style="font-size: 24px; font-weight: bold;">${analytics.totalRecords || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div>平均体温</div>
                        <div style="font-size: 24px; font-weight: bold;">${analytics.avgTemperature ? analytics.avgTemperature.toFixed(1) : '-'} ℃</div>
                    </div>
                    <div class="stat-item">
                        <div>平均気分スコア</div>
                        <div style="font-size: 24px; font-weight: bold;">${analytics.avgMoodScore ? analytics.avgMoodScore.toFixed(1) : '-'} / 10</div>
                    </div>
                    <div class="stat-item">
                        <div>運動実施率</div>
                        <div style="font-size: 24px; font-weight: bold;">${analytics.exerciseRate ? analytics.exerciseRate.toFixed(0) : '-'} %</div>
                    </div>
                </div>

                <h2>記録一覧</h2>
                <table>
                    <thead>
                        <tr>
                            <th>日付</th>
                            <th>利用者</th>
                            <th>体温</th>
                            <th>気分</th>
                            <th>食事</th>
                            <th>運動</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.slice(0, 50).map(r => `
                            <tr>
                                <td>${r.recordDate || '-'}</td>
                                <td>${r.userName || '-'}</td>
                                <td>${r.temperature || '-'} ℃</td>
                                <td>${r.moodScore || '-'} / 10</td>
                                <td>${[r.breakfast, r.lunch, r.dinner].filter(Boolean).length}/3</td>
                                <td>${r.exercise ? '✓' : '×'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    /**
     * Excel エクスポート
     */
    async exportExcel(data) {
        try {
            console.log('📊 Exporting Excel...');
            
            if (!window.WhaleAPI) {
                // フォールバック: CSV形式でダウンロード
                console.warn('⚠️ Backend API not available, using CSV fallback');
                return this.exportCSV(data);
            }

            const blob = await window.WhaleAPI.exportExcel(data.records);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whale_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revo
