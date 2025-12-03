// frontend/js/dashboard.js
// Dashboard controller — safe for repeated htmx swaps
(function () {
    'use strict';

    // Ensure single global namespace to avoid duplicates across htmx swaps
    window.dashboard = window.dashboard || {};

    // Use existing state or create it once
    window.dashboard.state = window.dashboard.state || {
        currentUser: null,
        allUsers: [],
        updateIntervalId: null,
        initialized: false,
        lastInitAt: 0
    };

    const state = window.dashboard.state;

    /**
     * initDashboard - safe to call multiple times (idempotent)
     */
    window.initDashboard = async function() {
        // guard: don't run more than once per 500ms and don't double-init
        const now = Date.now();
        if (state.initialized && (now - state.lastInitAt) < 500) {
            // already initialized recently
            return;
        }
        state.lastInitAt = now;

        try {
            console.log('📊 [dashboard] init start');

            // wait for WhaleStorage to be available, but use its init promise if any
            let retry = 0;
            while (typeof window.WhaleStorage === 'undefined' && retry < 50) {
                await new Promise(r => setTimeout(r, 100));
                retry++;
            }
            if (typeof window.WhaleStorage === 'undefined') {
                throw new Error('WhaleStorage is not available');
            }

            // initialize storage (storage.js already deduplicates init calls)
            await window.WhaleStorage.init();

            // load current user (safe)
            const current = await window.WhaleStorage.getCurrentUser();
            if (!current) {
                console.warn('[dashboard] no current user, redirecting to login');
                window.location.href = 'login.html';
                return;
            }
            state.currentUser = current;

            // load users
            state.allUsers = await window.WhaleStorage.getUsers();

            // show/hide admin menus
            showAdminMenus(state.currentUser.role);

            // attach navigation handlers (dashboard-nav buttons)
            attachNavigationHandlers();

            // load statistics and recent records
            await safeCall(loadStatistics);
            await safeCall(loadRecentRecords);

            // listen to whale:datachange once
            if (!window.dashboard._dataChangeHandler) {
                window.dashboard._dataChangeHandler = async function (e) {
                    console.log('[dashboard] whale:datachange', e && e.detail);
                    await safeCall(loadStatistics);
                    await safeCall(loadRecentRecords);
                };
                window.addEventListener('whale:datachange', window.dashboard._dataChangeHandler);
            }

            // ensure single interval
            if (state.updateIntervalId) {
                clearInterval(state.updateIntervalId);
            }
            state.updateIntervalId = setInterval(async () => {
                await safeCall(loadStatistics);
                await safeCall(loadRecentRecords);
            }, 30000);

            state.initialized = true;
            state.lastInitAt = Date.now();

            console.log('✅ [dashboard] initialized');
        } catch (err) {
            console.error('❌ [dashboard] init error:', err);
            if (window.showToast) window.showToast('ダッシュボードの初期化に失敗しました: ' + err.message, 'error');
        }
    }

    // Helper to call functions and catch errors
    window.safeCall = async function(fn) {
        try {
            await fn();
        } catch (e) {
            console.error('[dashboard] safeCall error:', e);
        }
    }

    // Attach navigation handlers to elements with .dashboard-nav
    window.attachNavigationHandlers = function() {
        document.querySelectorAll('.dashboard-nav').forEach(btn => {
            // avoid double-binding
            if (btn.dataset._navBound === '1') return;
            btn.dataset._navBound = '1';
            btn.addEventListener('click', (e) => {
                const url = btn.dataset.href;
                if (url && typeof window.loadPage === 'function') {
                    window.loadPage(url);
                } else if (url) {
                    window.location.href = url;
                }
            });
        });
    }

    // show/hide admin menus
    window.showAdminMenus = function(role) {
        const adminMenuIds = ['attendance-menu', 'users-menu', 'assessments-menu', 'service-plans-menu'];
        adminMenuIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (role === 'admin' || role === 'staff') {
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        });
    }

    // loadStatistics: safe DOM checks and defensive coding
    window.loadStatistics = async function() {
        if (!state.currentUser) return;

        try {
            const today = new Date();
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - today.getDay());

            let monthRecords = [], weekRecords = [];

            if (state.currentUser.role === 'admin' || state.currentUser.role === 'staff') {
                monthRecords = await window.WhaleStorage.getAllDailyRecords(thisMonth.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]);
                weekRecords = await window.WhaleStorage.getAllDailyRecords(firstDayOfWeek.toISOString().split('T')[0], today.toISOString().split('T')[0]);
            } else {
                monthRecords = await window.WhaleStorage.getDailyRecords(state.currentUser._id, thisMonth.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]);
                weekRecords = await window.WhaleStorage.getDailyRecords(state.currentUser._id, firstDayOfWeek.toISOString().split('T')[0], today.toISOString().split('T')[0]);
            }

            const moodScores = (weekRecords || []).map(r => Number(r.moodScore)).filter(Boolean);
            const avgMood = moodScores.length ? (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(1) : '-';

            const temps = (weekRecords || []).map(r => Number(r.temperature)).filter(Boolean);
            const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '-';

            const monthCountEl = document.getElementById('records-count-month');
            const weekCountEl = document.getElementById('records-count-week');
            const avgMoodEl = document.getElementById('avg-mood');
            const avgTempEl = document.getElementById('avg-temp');

            if (monthCountEl) monthCountEl.textContent = (monthRecords || []).length;
            if (weekCountEl) weekCountEl.textContent = (weekRecords || []).length;
            if (avgMoodEl) avgMoodEl.textContent = avgMood;
            if (avgTempEl) avgTempEl.textContent = avgTemp;

        } catch (err) {
            console.error('[dashboard] loadStatistics error:', err);
            throw err;
        }
    }

    // loadRecentRecords: safe DOM checks
    window.loadRecentRecords = async function() {
        if (!state.currentUser) return;

        try {
            const container = document.getElementById('recent-records');
            if (!container) return;

            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);

            let records = [];
            if (state.currentUser.role === 'admin' || state.currentUser.role === 'staff') {
                records = await window.WhaleStorage.getAllDailyRecords(sevenDaysAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]);
            } else {
                records = await window.WhaleStorage.getDailyRecords(state.currentUser._id, sevenDaysAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]);
            }

            if (!records || records.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">📝</div>
                        <p>まだ記録がありません</p>
                        <button data-href="daily-record.html" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition dashboard-nav">
                            最初の記録を作成
                        </button>
                    </div>
                `;
                // attach nav handlers for newly added button(s)
                attachNavigationHandlers();
                return;
            }

            const userMap = {};
            (state.allUsers || []).forEach(u => (userMap[u._id] = u.name));

            container.innerHTML = (records.slice(0, 10) || []).map(record => {
                const userName = userMap[record.userId] || '不明';
                const mood = record.moodScore != null ? record.moodScore : '-';
                const temp = record.temperature != null ? record.temperature : '-';
                const date = record.recordDate ? new Date(record.recordDate).toLocaleDateString('ja-JP', {
                    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
                }) : '-';

                const emoji = (record.moodScore >= 8) ? '😊' : (record.moodScore >= 5 ? '😐' : '😔');

                return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3">
                                <span class="text-2xl">${emoji}</span>
                                <div>
                                    <div class="font-medium text-gray-800">${userName} - ${date}</div>
                                    <div class="text-sm text-gray-600">体温: ${temp} ℃ | 気分: ${mood} / 10</div>
                                </div>
                            </div>
                        </div>
                        <button data-record-id="${record._id}" class="view-record-btn text-blue-600 hover:text-blue-800 text-sm font-medium">詳細 →</button>
                    </div>
                `;
            }).join('');

            // attach view handlers
            document.querySelectorAll('.view-record-btn').forEach(btn => {
                if (btn.dataset._bound === '1') return;
                btn.dataset._bound = '1';
                btn.addEventListener('click', async (e) => {
                    const id = btn.dataset.recordId;
                    if (id) window.viewRecordDetail && window.viewRecordDetail(id);
                });
            });

        } catch (err) {
            console.error('[dashboard] loadRecentRecords error:', err);
            throw err;
        }
    }

    // viewRecordDetail is left as global caller from original code; we provide a safe implementation
    window.viewRecordDetail = window.viewRecordDetail || async function (recordId) {
        try {
            const record = await window.WhaleStorage.get(recordId);
            if (!record) {
                if (window.showToast) window.showToast('記録が見つかりません', 'error');
                return;
            }
            const user = (state.allUsers || []).find(u => u._id === record.userId);
            const userName = user ? user.name : '不明';

            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.innerHTML = `
                <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-gray-800">記録詳細</h3>
                        <button class="close-modal text-gray-500 hover:text-gray-700"><span class="text-2xl">×</span></button>
                    </div>
                    <div class="space-y-3">
                        <div><label class="text-sm text-gray-600">利用者</label><div class="font-medium">${userName}</div></div>
                        <div><label class="text-sm text-gray-600">日付</label><div class="font-medium">${record.recordDate ? new Date(record.recordDate).toLocaleDateString('ja-JP') : '-'}</div></div>
                        <div class="grid grid-cols-2 gap-4">
                          <div><label class="text-sm text-gray-600">起床時間</label><div class="font-medium">${record.wakeUpTime || '-'}</div></div>
                          <div><label class="text-sm text-gray-600">就寝時間</label><div class="font-medium">${record.sleepTime || '-'}</div></div>
                        </div>
                        <div class="grid grid-cols-3 gap-4">
                          <div><label class="text-sm text-gray-600">朝食</label><div class="font-medium">${record.breakfast ? '✅' : '❌'}</div></div>
                          <div><label class="text-sm text-gray-600">昼食</label><div class="font-medium">${record.lunch ? '✅' : '❌'}</div></div>
                          <div><label class="text-sm text-gray-600">夕食</label><div class="font-medium">${record.dinner ? '✅' : '❌'}</div></div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                          <div><label class="text-sm text-gray-600">体温</label><div class="font-medium">${record.temperature ? record.temperature + '℃' : '-'}</div></div>
                          <div><label class="text-sm text-gray-600">血圧</label><div class="font-medium">${record.bloodPressureHigh && record.bloodPressureLow ? record.bloodPressureHigh + '/' + record.bloodPressureLow : '-'}</div></div>
                        </div>
                        <div><label class="text-sm text-gray-600">気分スコア</label><div class="font-medium">${record.moodScore || '-'} / 10</div></div>
                        <div><label class="text-sm text-gray-600">気分詳細</label><div class="font-medium">${record.moodDetail || '-'}</div></div>
                    </div>
                    <div class="mt-6"><button class="w-full close-modal bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition">閉じる</button></div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', () => modal.remove()));
        } catch (err) {
            console.error('[dashboard] viewRecordDetail error:', err);
            if (window.showToast) window.showToast('記録の表示に失敗しました', 'error');
        }
    };

    // Minimal safe implementations for the functions that were referenced from dashboard.html
    // These avoid ReferenceError and provide simple behavior that can be extended later.
    window.showAddUserModal = window.showAddUserModal || function () {
        document.getElementById('add-user-modal').classList.remove('hidden');
    };

    window.showCreateAssessmentModal = window.showCreateAssessmentModal || function () {
        document.getElementById('create-assessment-modal').classList.remove('hidden');
        document.querySelector('input[name="assessmentDate"]').valueAsDate = new Date();
    };

    window.showCreatePlanModal = window.showCreatePlanModal || function () {
        document.getElementById('create-plan-modal').classList.remove('hidden');
        const today = new Date();
        document.querySelector('input[name="startDate"]').valueAsDate = today;
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 6);
        document.querySelector('input[name="endDate"]').valueAsDate = endDate;
    };

    window.filterUsers = window.filterUsers || function () {
        const searchName = document.getElementById('search-name').value.toLowerCase();
        const filterRole = document.getElementById('filter-role').value;

        const filtered = allUsers.filter(user => {
            const nameMatch = !searchName || 
                user.name.toLowerCase().includes(searchName) || 
                (user.nameKana && user.nameKana.toLowerCase().includes(searchName));
            const roleMatch = !filterRole || user.role === filterRole;
            return nameMatch && roleMatch;
        });

        displayUsers(filtered);
    };

    window.filterAssessments = window.filterAssessments || function () {
        const filterUserId = document.getElementById('filter-user').value;

        const filtered = filterUserId
            ? allAssessments.filter(a => a.userId === filterUserId)
            : allAssessments;

        displayAssessments(filtered);
    };

    window.filterPlans = window.filterPlans || function () {
        const filterUserId = document.getElementById('filter-user').value;

        const filtered = filterUserId
            ? allPlans.filter(p => p.userId === filterUserId)
            : allPlans;

        displayPlans(filtered);
    };

    // Reports / exports
    window.loadReportData = window.loadReportData || async function () {
        try {
            if (!currentUser) return;

            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;

            if (!startDate || !endDate) {
                window.showToast('期間を選択してください', 'warning');
                return;
            }

            // 🔥 管理者・職員は全利用者のデータを表示
            if (currentUser.role === 'admin' || currentUser.role === 'staff') {
                console.log('📊 Loading report data for ALL users...');
                currentRecords = await window.WhaleStorage.getAllDailyRecords(startDate, endDate);
            } else {
                // 利用者は自分のデータのみ
                console.log('📊 Loading report data for current user only...');
                currentRecords = await window.WhaleStorage.getDailyRecords(currentUser._id, startDate, endDate);
            }

            console.log('✅ Loaded', currentRecords.length, 'records');

            // 統計計算
            updateStatistics(currentRecords);

            // グラフ更新
            updateCharts(currentRecords);

            // テーブル更新
            updateTable(currentRecords);

            window.showToast('データを読み込みました', 'success');

        } catch (error) {
            console.error('Load report data error:', error);
            window.showToast('データ読み込みエラー: ' + error.message, 'error');
        }
    };

    window.exportCSV = window.exportCSV || async function (type = 'daily_records') {
        try {
            // type can be 'daily_records', 'assessments', 'service_plans'
            if (type === 'daily_records') {
                const records = await window.WhaleStorage.getAllDailyRecords('1970-01-01', new Date().toISOString().split('T')[0]);
                const users = await window.WhaleStorage.getUsers();
                await window.WhaleStorage.exportDailyRecordsCSV(records, users);
            } else if (type === 'assessments') {
                const assessments = await window.WhaleStorage.getAssessments();
                const users = await window.WhaleStorage.getUsers();
                await window.WhaleStorage.exportAssessmentsCSV(assessments, users);
            } else if (type === 'service_plans') {
                const plans = await window.WhaleStorage.getServicePlans();
                const users = await window.WhaleStorage.getUsers();
                await window.WhaleStorage.exportServicePlansCSV(plans, users);
            } else {
                console.warn('Unknown export type:', type);
            }
        } catch (err) {
            console.error('exportCSV error:', err);
            if (window.showToast) window.showToast('エクスポートに失敗しました', 'error');
        }
    };

    window.exportJSON = window.exportJSON || async function () {
        try {
            await window.WhaleStorage.backup();
        } catch (err) {
            console.error('exportJSON error:', err);
            if (window.showToast) window.showToast('JSONエクスポートに失敗しました', 'error');
        }
    };

    // Clean up when page unloads (clear interval)
    window.addEventListener('beforeunload', () => {
        if (state.updateIntervalId) {
            clearInterval(state.updateIntervalId);
            state.updateIntervalId = null;
        }
    });

    // Expose init function globally so htmx:afterSwap or index loader can call it
    window.initDashboard = initDashboard;

    // If the dashboard is already present in DOM at load time, initialize
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        if (document.getElementById('dashboard-root')) {
            // Call but do not await
            setTimeout(() => initDashboard(), 0);
        }
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('dashboard-root')) {
                setTimeout(() => initDashboard(), 0);
            }
        });
    }

    console.log('🧭 dashboard.js loaded (safe, idempotent)');

})();
