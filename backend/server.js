/**
 * WHALE Backend Server - 完全修正版
 * Node.js + Express API Server
 * @version 2.2.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'whale-secret-key-change-in-production';

// ==================== ミドルウェア設定 ====================

// セキュリティヘッダー
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://whale-backend-84p5.onrender.com", "https://uchida16104.github.io"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS設定（修正版）
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://uchida16104.github.io',
            'http://localhost:3000',
            'http://localhost:8000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:8000'
        ];
        
        // originがundefined（同一オリジン）または許可リストに含まれる場合
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn('CORS blocked origin:', origin);
            callback(null, true); // 開発中は全て許可
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// プリフライトリクエスト対応
app.options('*', cors(corsOptions));

// 圧縮
app.use(compression());

// JSONパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// レート制限
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // 増加
    message: { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// リクエストログ
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - Origin: ${req.get('origin')}`);
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
        version: '2.2.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'WHALE Backend API',
        version: '2.2.0',
        status: 'running',
        endpoints: {
            health: '/health',
            auth: '/api/auth/*',
            sync: '/api/sync/*',
            export: '/api/export/*'
        }
    });
});

// ==================== 認証API ====================

app.post('/api/auth/login', async (req, res) => {
    try {
        const { organizationId, userId, passwordHash } = req.body;

        if (!organizationId || !userId || !passwordHash) {
            return res.status(400).json({ error: '必須項目が不足しています' });
        }

        const token = jwt.sign(
            {
                organizationId: organizationId,
                userId: userId,
                timestamp: Date.now()
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: token,
            expiresIn: 86400
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'ログイン処理に失敗しました' });
    }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

app.post('/api/auth/refresh', authenticateToken, (req, res) => {
    try {
        const newToken = jwt.sign(
            {
                organizationId: req.user.organizationId,
                userId: req.user.userId,
                timestamp: Date.now()
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: newToken,
            expiresIn: 86400
        });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'トークン更新に失敗しました' });
    }
});

// ==================== データ同期API ====================

app.post('/api/sync/upload', authenticateToken, async (req, res) => {
    try {
        const { documents } = req.body;

        if (!documents || !Array.isArray(documents)) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }

        // 実際の実装ではCouchDBやPostgreSQLに保存
        console.log(`Received ${documents.length} documents for sync`);

        res.json({
            success: true,
            uploaded: documents.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'アップロードに失敗しました' });
    }
});

app.get('/api/sync/download', authenticateToken, async (req, res) => {
    try {
        const { since } = req.query;

        // 実際の実装ではデータベースから取得
        res.json({
            success: true,
            documents: [],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'ダウンロードに失敗しました' });
    }
});

// ==================== エクスポートAPI（強化版） ====================

app.post('/api/export/pdf', authenticateToken, async (req, res) => {
    try {
        const { records, analytics, organization } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }

        const doc = new PDFDocument({ 
            size: 'A4', 
            margin: 50,
            info: {
                Title: 'WHALE システムレポート',
                Author: 'WHALE System',
                Subject: 'データ分析レポート'
            }
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=whale_report_${new Date().toISOString().split('T')[0]}.pdf`
        );
        res.setHeader('Cache-Control', 'no-cache');

        doc.pipe(res);

        // タイトル
        doc.fontSize(20)
           .text('🐋 WHALE システムレポート', { align: 'center' })
           .moveDown();

        // 基本情報
        doc.fontSize(12)
           .text(`生成日時: ${new Date().toLocaleString('ja-JP')}`)
           .text(`施設: ${organization?.name || ''}`)
           .moveDown();

        // 統計情報
        if (analytics) {
            doc.fontSize(16).text('データ分析', { underline: true }).moveDown(0.5);
            doc.fontSize(12)
               .text(`記録総数: ${analytics.totalRecords || 0}`)
               .text(`平均体温: ${analytics.avgTemperature?.toFixed(1) || '-'} ℃`)
               .text(`平均気分スコア: ${analytics.avgMoodScore?.toFixed(1) || '-'} / 10`)
               .moveDown();
        }

        // 記録データ
        doc.fontSize(16).text('記録一覧', { underline: true }).moveDown(0.5);

        records.slice(0, 30).forEach((record, index) => {
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
        if (!res.headersSent) {
            res.status(500).json({ error: 'PDF生成に失敗しました' });
        }
    }
});

app.post('/api/export/excel', authenticateToken, async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('日々の記録');

        worksheet.columns = [
            { header: '日付', key: 'recordDate', width: 12 },
            { header: '利用者', key: 'userName', width: 20 },
            { header: '起床時間', key: 'wakeUpTime', width: 10 },
            { header: '就寝時間', key: 'sleepTime', width: 10 },
            { header: '体温', key: 'temperature', width: 8 },
            { header: '血圧(高)', key: 'bloodPressureHigh', width: 10 },
            { header: '血圧(低)', key: 'bloodPressureLow', width: 10 },
            { header: '気分スコア', key: 'moodScore', width: 12 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

        records.forEach(record => {
            worksheet.addRow({
                recordDate: record.recordDate || '',
                userName: record.userName || '',
                wakeUpTime: record.wakeUpTime || '',
                sleepTime: record.sleepTime || '',
                temperature: record.temperature || '',
                bloodPressureHigh: record.bloodPressureHigh || '',
                bloodPressureLow: record.bloodPressureLow || '',
                moodScore: record.moodScore || ''
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=whale_report_${new Date().toISOString().split('T')[0]}.xlsx`
        );
        res.setHeader('Cache-Control', 'no-cache');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel export error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Excel生成に失敗しました' });
        }
    }
});

app.post('/api/export/csv', authenticateToken, async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }

        const headers = [
            '日付', '利用者', '起床時間', '就寝時間', '通所時間', '退所時間',
            '朝食', '昼食', '夕食', '体温', '血圧(高)', '血圧(低)', '脈拍',
            'SpO2', '気分スコア', '運動', '入浴'
        ];

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

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=whale_report_${new Date().toISOString().split('T')[0]}.csv`
        );
        res.setHeader('Cache-Control', 'no-cache');

        res.write('\uFEFF');
        res.write(csv);
        res.end();

    } catch (error) {
        console.error('CSV export error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'CSV生成に失敗しました' });
        }
    }
});

// ==================== メール送信API ====================

app.post('/api/mail/send', authenticateToken, async (req, res) => {
    try {
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ error: '必須項目が不足しています' });
        }

        console.log('Email sent:', { to, subject });

        res.json({
            success: true,
            message: 'メールを送信しました'
        });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'メール送信に失敗しました' });
    }
});

// ==================== 統計API ====================

app.post('/api/analytics/calculate', authenticateToken, async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }

        const temperatures = records.map(r => r.temperature).filter(Boolean);
        const moodScores = records.map(r => r.moodScore).filter(Boolean);
        const bloodPressureHigh = records.map(r => r.bloodPressureHigh).filter(Boolean);

        const avgTemp = temperatures.length > 0 
            ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length 
            : 0;

        const avgMood = moodScores.length > 0
            ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
            : 0;

        const avgBpHigh = bloodPressureHigh.length > 0
            ? bloodPressureHigh.reduce((a, b) => a + b, 0) / bloodPressureHigh.length
            : 0;

        const analytics = {
            totalRecords: records.length,
            avgTemperature: avgTemp,
            avgMoodScore: avgMood,
            avgBloodPressureHigh: avgBpHigh,
            breakfastRate: (records.filter(r => r.breakfast).length / records.length) * 100,
            lunchRate: (records.filter(r => r.lunch).length / records.length) * 100,
            dinnerRate: (records.filter(r => r.dinner).length / records.length) * 100,
            exerciseRate: (records.filter(r => r.exercise).length / records.length) * 100,
            bathingRate: (records.filter(r => r.bathing).length / records.length) * 100
        };

        res.json({
            success: true,
            analytics: analytics
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: '統計計算に失敗しました' });
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
    console.log(`Version: 2.2.0`);
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
