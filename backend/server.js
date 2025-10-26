/**
 * WHALE Backend Server - 修正版
 * @version 2.1.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'whale-secret-key-change-in-production';

// ==================== インメモリデータストア ====================
// 本番環境では MongoDB/PostgreSQL などのDBを使用
const dataStore = {
    organizations: new Map(),
    users: new Map(),
    dailyRecords: new Map(),
    attendanceRecords: new Map(),
    assessments: new Map(),
    servicePlans: new Map()
};

// ==================== ミドルウェア設定 ====================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

const corsOptions = {
    origin: [
        'https://uchida16104.github.io/WHALE',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
};
app.use(cors(corsOptions));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'リクエストが多すぎます' }
});
app.use('/api/', limiter);

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ==================== 認証ミドルウェア ====================

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '認証が必要です' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'トークンが無効です' });
        }
        req.user = user;
        next();
    });
}

// ==================== ヘルスチェック ====================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'WHALE Backend API',
        version: '2.1.0',
        status: 'running',
        endpoints: {
            health: '/health',
            auth: '/api/auth/*',
            data: '/api/data/*',
            sync: '/api/sync/*',
            export: '/api/export/*'
        }
    });
});

// ==================== 認証API ====================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { organization, admin } = req.body;

        // 組織の重複チェック
        if (dataStore.organizations.has(organization.organizationId)) {
            return res.status(400).json({ error: 'この施設機関IDは既に使用されています' });
        }

        // 組織を保存
        const orgData = {
            ...organization,
            createdAt: new Date().toISOString()
        };
        dataStore.organizations.set(organization.organizationId, orgData);

        // 管理者ユーザーを保存
        const passwordHash = await bcrypt.hash(admin.password, 10);
        const userId = `${organization.organizationId}_${admin.userId}`;
        const userData = {
            ...admin,
            _id: userId,
            organizationId: organization.organizationId,
            passwordHash,
            role: 'admin',
            createdAt: new Date().toISOString()
        };
        delete userData.password;
        dataStore.users.set(userId, userData);

        // JWTトークン生成
        const token = jwt.sign(
            {
                userId: userId,
                organizationId: organization.organizationId,
                role: 'admin'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: userData,
            organization: orgData
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: '登録処理に失敗しました' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { organizationId, userId, password } = req.body;

        if (!organizationId || !userId || !password) {
            return res.status(400).json({ error: '必須項目が不足しています' });
        }

        // 組織の確認
        const organization = dataStore.organizations.get(organizationId);
        if (!organization) {
            return res.status(401).json({ error: '施設機関IDが見つかりません' });
        }

        // ユーザーの確認
        const fullUserId = `${organizationId}_${userId}`;
        const user = dataStore.users.get(fullUserId);
        if (!user) {
            return res.status(401).json({ error: 'ユーザーIDが見つかりません' });
        }

        // パスワードの検証
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'パスワードが正しくありません' });
        }

        // JWTトークン生成
        const token = jwt.sign(
            {
                userId: fullUserId,
                organizationId: user.organizationId,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                ...user,
                passwordHash: undefined
            },
            organization
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'ログイン処理に失敗しました' });
    }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
    const user = dataStore.users.get(req.user.userId);
    if (!user) {
        return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }
    res.json({
        success: true,
        user: {
            ...user,
            passwordHash: undefined
        }
    });
});

// ==================== データ管理API ====================

// 日々の記録
app.post('/api/data/daily-records', authenticateToken, async (req, res) => {
    try {
        const record = {
            ...req.body,
            _id: `${req.body.userId}_${req.body.recordDate}`,
            organizationId: req.user.organizationId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        dataStore.dailyRecords.set(record._id, record);

        res.json({
            success: true,
            record
        });

    } catch (error) {
        console.error('Save daily record error:', error);
        res.status(500).json({ error: '記録の保存に失敗しました' });
    }
});

app.get('/api/data/daily-records', authenticateToken, (req, res) => {
    try {
        const { userId, startDate, endDate } = req.query;

        let records = Array.from(dataStore.dailyRecords.values())
            .filter(r => r.organizationId === req.user.organizationId);

        if (userId) {
            records = records.filter(r => r.userId === userId);
        }

        if (startDate && endDate) {
            records = records.filter(r => 
                r.recordDate >= startDate && r.recordDate <= endDate
            );
        }

        res.json({
            success: true,
            records
        });

    } catch (error) {
        console.error('Get daily records error:', error);
        res.status(500).json({ error: '記録の取得に失敗しました' });
    }
});

// 出席管理
app.post('/api/data/attendance', authenticateToken, async (req, res) => {
    try {
        const record = {
            ...req.body,
            _id: `${req.body.userId}_${req.body.attendanceDate}`,
            organizationId: req.user.organizationId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        dataStore.attendanceRecords.set(record._id, record);

        res.json({
            success: true,
            record
        });

    } catch (error) {
        console.error('Save attendance error:', error);
        res.status(500).json({ error: '出席記録の保存に失敗しました' });
    }
});

app.get('/api/data/attendance', authenticateToken, (req, res) => {
    try {
        const { date } = req.query;

        let records = Array.from(dataStore.attendanceRecords.values())
            .filter(r => r.organizationId === req.user.organizationId);

        if (date) {
            records = records.filter(r => r.attendanceDate === date);
        }

        res.json({
            success: true,
            records
        });

    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: '出席記録の取得に失敗しました' });
    }
});

// ユーザー管理
app.get('/api/data/users', authenticateToken, (req, res) => {
    try {
        // 同じ組織のユーザーのみ取得
        const users = Array.from(dataStore.users.values())
            .filter(u => u.organizationId === req.user.organizationId)
            .map(u => ({
                ...u,
                passwordHash: undefined
            }));

        // 利用者は自分自身のみ
        if (req.user.role === 'user') {
            const selfUser = users.find(u => u._id === req.user.userId);
            return res.json({
                success: true,
                users: selfUser ? [selfUser] : []
            });
        }

        res.json({
            success: true,
            users
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'ユーザーの取得に失敗しました' });
    }
});

app.post('/api/data/users', authenticateToken, async (req, res) => {
    try {
        // 管理者のみ実行可能
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: '権限がありません' });
        }

        const { userId, password, ...userData } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const fullUserId = `${req.user.organizationId}_${userId}`;

        const newUser = {
            ...userData,
            _id: fullUserId,
            userId,
            organizationId: req.user.organizationId,
            passwordHash,
            createdAt: new Date().toISOString()
        };

        dataStore.users.set(fullUserId, newUser);

        res.json({
            success: true,
            user: {
                ...newUser,
                passwordHash: undefined
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'ユーザーの作成に失敗しました' });
    }
});

app.put('/api/data/users/:id', authenticateToken, async (req, res) => {
    try {
        const user = dataStore.users.get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'ユーザーが見つかりません' });
        }

        // 同じ組織かつ権限チェック
        if (user.organizationId !== req.user.organizationId) {
            return res.status(403).json({ error: '権限がありません' });
        }

        const updatedUser = {
            ...user,
            ...req.body,
            _id: user._id,
            organizationId: user.organizationId,
            updatedAt: new Date().toISOString()
        };

        dataStore.users.set(req.params.id, updatedUser);

        res.json({
            success: true,
            user: {
                ...updatedUser,
                passwordHash: undefined
            }
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'ユーザーの更新に失敗しました' });
    }
});

// アセスメント
app.post('/api/data/assessments', authenticateToken, (req, res) => {
    try {
        const assessment = {
            ...req.body,
            _id: `assessment_${Date.now()}`,
            organizationId: req.user.organizationId,
            createdBy: req.user.userId,
            createdAt: new Date().toISOString()
        };

        dataStore.assessments.set(assessment._id, assessment);

        res.json({
            success: true,
            assessment
        });

    } catch (error) {
        console.error('Create assessment error:', error);
        res.status(500).json({ error: 'アセスメントの作成に失敗しました' });
    }
});

app.get('/api/data/assessments', authenticateToken, (req, res) => {
    try {
        const { userId } = req.query;
        
        let assessments = Array.from(dataStore.assessments.values())
            .filter(a => a.organizationId === req.user.organizationId);

        if (userId) {
            assessments = assessments.filter(a => a.userId === userId);
        }

        res.json({
            success: true,
            assessments
        });

    } catch (error) {
        console.error('Get assessments error:', error);
        res.status(500).json({ error: 'アセスメントの取得に失敗しました' });
    }
});

// サービス計画
app.post('/api/data/service-plans', authenticateToken, (req, res) => {
    try {
        const plan = {
            ...req.body,
            _id: `plan_${Date.now()}`,
            organizationId: req.user.organizationId,
            createdBy: req.user.userId,
            createdAt: new Date().toISOString()
        };

        dataStore.servicePlans.set(plan._id, plan);

        res.json({
            success: true,
            plan
        });

    } catch (error) {
        console.error('Create service plan error:', error);
        res.status(500).json({ error: 'サービス計画の作成に失敗しました' });
    }
});

app.get('/api/data/service-plans', authenticateToken, (req, res) => {
    try {
        const { userId } = req.query;
        
        let plans = Array.from(dataStore.servicePlans.values())
            .filter(p => p.organizationId === req.user.organizationId);

        if (userId) {
            plans = plans.filter(p => p.userId === userId);
        }

        res.json({
            success: true,
            plans
        });

    } catch (error) {
        console.error('Get service plans error:', error);
        res.status(500).json({ error: 'サービス計画の取得に失敗しました' });
    }
});

// ==================== エクスポートAPI ====================

app.post('/api/export/pdf', authenticateToken, async (req, res) => {
    try {
        const { records, analytics, organization } = req.body;

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=whale_report_${new Date().toISOString().split('T')[0]}.pdf`
        );

        doc.pipe(res);

        doc.fontSize(20).text('WHALE システムレポート', { align: 'center' }).moveDown();
        doc.fontSize(12)
           .text(`生成日時: ${new Date().toLocaleString('ja-JP')}`)
           .text(`施設: ${organization?.name || ''}`)
           .moveDown();

        if (analytics) {
            doc.fontSize(16).text('データ分析', { underline: true }).moveDown(0.5);
            doc.fontSize(12)
               .text(`記録総数: ${analytics.totalRecords || 0}`)
               .text(`平均体温: ${analytics.avgTemperature?.toFixed(1) || '-'} ℃`)
               .text(`平均気分スコア: ${analytics.avgMoodScore?.toFixed(1) || '-'} / 10`)
               .moveDown();
        }

        doc.fontSize(16).text('記録一覧', { underline: true }).moveDown(0.5);

        records.slice(0, 20).forEach((record, index) => {
            if (index > 0 && index % 10 === 0) {
                doc.addPage();
            }

            doc.fontSize(11)
               .text(`日付: ${record.recordDate || '-'}`)
               .text(`利用者: ${record.userName || '-'}`)
               .text(`体温: ${record.temperature || '-'} ℃`)
               .text(`気分: ${record.moodScore || '-'} / 10`)
               .moveDown(0.5);
        });

        doc.end();

    } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({ error: 'PDF生成に失敗しました' });
    }
});

app.post('/api/export/excel', authenticateToken, async (req, res) => {
    try {
        const { records } = req.body;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('日々の記録');

        worksheet.columns = [
            { header: '日付', key: 'recordDate', width: 12 },
            { header: '利用者', key: 'userName', width: 20 },
            { header: '体温', key: 'temperature', width: 8 },
            { header: '気分スコア', key: 'moodScore', width: 12 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        records.forEach(record => {
            worksheet.addRow(record);
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=whale_report_${new Date().toISOString().split('T')[0]}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({ error: 'Excel生成に失敗しました' });
    }
});

// ==================== エラーハンドラー ====================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'サーバーエラーが発生しました',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: 'エンドポイントが見つかりません',
        path: req.path
    });
});

// ==================== サーバー起動 ====================

app.listen(PORT, () => {
    console.log('🐋 WHALE Backend Server');
    console.log('=================================');
    console.log(`Version: 2.1.0`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('=================================');
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
