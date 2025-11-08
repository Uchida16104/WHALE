/**
 * WHALE Storage Manager - 完全修正版
 * @version 2.4.0 - インデックスエラー完全修正
 */

class WhaleStorageManager {
    constructor() {
        this.version = '2.4.0';
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

            // 🔥 重要: インデックス作成を先に実行
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

    /**
     * 🔥 修正: 全インデックスを確実に作成
     */
    async createIndexes() {
        console.log('📊 Creating indexes...');
        
        const indexes = [
            // 基本インデックス
            { fields: ['type'] },
            { fields: ['type', 'organizationId'] },
            { fields: ['type', 'userId'] },
            
            // 🔥 重要: recordDateフィールド用の複合インデックス
            { fields: ['type', 'userId', 'recordDate'] },
            { fields: ['type', 'recordDate'] },
            { fields: ['recordDate'] }, // 単独インデックスも追加
            
            // その他
            { fields: ['type', 'attendanceDate'] },
            { fields: ['type', 'assessmentDate'] },
            { fields: ['type', 'startDate'] },
            { fields: ['createdAt'] }
        ];

        for (const index of indexes) {
            try {
                const result = await this.db.createIndex({ index });
                console.log('✅ Index created:', index.fields.join(', '));
            } catch (error) {
                // インデックスが既に存在する場合は無視
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

    /**
     * 🔥 修正: 日々の記録保存
     */
    async saveDailyRecord(data) {
        try {
            const currentUser = await this.getCurrentUser();
            const organizationId = data.organizationId || currentUser?.organizationId;
            
            // 既存記録チェック
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

    /**
     * 🔥 修正: 日々の記録取得（インデックスエラー対策）
     */
    async getDailyRecords(userId, startDate, endDate) {
        try {
            console.log('📊 Getting daily records:', { userId, startDate, endDate });
            
            // use_index を明示的に指定してソート可能にする
            const result = await this.db.find({
                selector: {
                    type: 'daily_record',
                    userId: userId,
                    recordDate: {
                        $gte: startDate,
                        $lte: endDate
                    }
                },
                // 🔥 重要: use_indexでインデックスを明示
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
            
            // フォールバック: インデックスなしで取得
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
                
                // 手動でソート
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

    // ==================== エクスポート機能 ====================
    // ... (既存のコードをそのまま維持)
}

// グローバルインスタンス作成
window.WhaleStorage = new WhaleStorageManager();

console.log('🐋 WHALE Storage Manager loaded (v2.4.0 - Fixed)');

export default window.WhaleStorage;
