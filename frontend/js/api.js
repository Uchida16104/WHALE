/**
 * WHALE API Client - 修正版
 * @version 2.1.0
 */

class WhaleAPI {
    constructor() {
        this.baseURL = 'https://whale-backend-84p5.onrender.com';
        this.token = null;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('whale_token', token);
    }

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('whale_token');
        }
        return this.token;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('whale_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('application/pdf')) {
                data = await response.blob();
            } else if (contentType && contentType.includes('application/vnd.openxmlformats')) {
                data = await response.blob();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || `HTTP ${response.status}`);
            }

            return data;

        } catch (error) {
            if (!navigator.onLine) {
                throw new Error('オフラインです');
            }
            throw error;
        }
    }

    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ===== 認証API =====

    async register(data) {
        const result = await this.post('/api/auth/register', data);
        if (result.token) {
            this.setToken(result.token);
        }
        return result;
    }

    async login(credentials) {
        const result = await this.post('/api/auth/login', credentials);
        if (result.token) {
            this.setToken(result.token);
        }
        return result;
    }

    async verifyToken() {
        return this.post('/api/auth/verify');
    }

    // ===== データAPI =====

    async saveDailyRecord(record) {
        return this.post('/api/data/daily-records', record);
    }

    async getDailyRecords(userId, startDate, endDate) {
        return this.get('/api/data/daily-records', { userId, startDate, endDate });
    }

    async saveAttendance(attendance) {
        return this.post('/api/data/attendance', attendance);
    }

    async getAttendance(date) {
        return this.get('/api/data/attendance', { date });
    }

    async getUsers() {
        return this.get('/api/data/users');
    }

    async createUser(userData) {
        return this.post('/api/data/users', userData);
    }

    async updateUser(userId, updates) {
        return this.put(`/api/data/users/${userId}`, updates);
    }

    async createAssessment(assessment) {
        return this.post('/api/data/assessments', assessment);
    }

    async getAssessments(userId) {
        return this.get('/api/data/assessments', { userId });
    }

    async createServicePlan(plan) {
        return this.post('/api/data/service-plans', plan);
    }

    async getServicePlans(userId) {
        return this.get('/api/data/service-plans', { userId });
    }

    // ===== エクスポートAPI =====

    async exportPDF(data) {
        const response = await fetch(`${this.baseURL}/api/export/pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('PDF生成に失敗しました');
        return await response.blob();
    }

    async exportExcel(data) {
        const response = await fetch(`${this.baseURL}/api/export/excel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Excel生成に失敗しました');
        return await response.blob();
    }
}

window.WhaleAPI = new WhaleAPI();
console.log('🐋 WHALE API client loaded');

export default window.WhaleAPI;
