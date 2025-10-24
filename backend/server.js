/**
 * WHALE Backend Server
 * Node.js + Express API Server
 * @version 2.0.0
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
            connectSrc: ["'self'", "https://whale-backend-84p5.onrender.com"]
        }
    }
}));

// CORS設定
const corsOptions = {
    origin: [
        'https://uchida16104.github.io',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
};
app.use(cors(corsOptions));

// 圧縮
app.use(compression());

// JSONパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// レート制限
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大100リクエスト
    message: { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' }
});
app.use('/api/', limiter);

// リクエストログ
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
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'WHALE Backend API',
        version: '2.0.0',
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

        // バリデーション
        if (!organizationId || !userId || !passwordHash) {
            return res.status(400).json({ error: '必須項目が不足しています' });
        }

        // JWTトークン生成
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
            expiresIn: 86400 // 24時間（秒）
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

        // ここでCouchDBや他のデータベースに保存
        // 現在はモック実装

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

        // ここでCouchDBや他のデータベースから取得
        // 現在はモック実装

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

// ==================== エクスポートAPI ====================

app.post('/api/export/pdf', authenticateToken, async (req, res) => {
    try {
        const { records, analytics, organization } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }

        // PDFDocument作成
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        // ヘッダー設定
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=whale_report_${new Date().toISOString().split('T')[0]}.pdf`
        );

        // PDFストリームをレスポンスにパイプ
        doc.pipe(res);

        // タイトル
        doc.fontSize(20)
           .text('WHALE システムレポート', { align: 'center' })
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

        // PDFファイナライズ
        doc.end();

    } catch (error) {
        console.error('PDF export error:', error);
        res.status(500).json({ error: 'PDF生成に失敗しました' });
    }
});

app.post('/api/export/excel', authenticateToken, async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }

        // Excelワークブック作成
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('日々の記録');

        // ヘッダー設定
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

        // スタイル設定
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // データ追加
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

        // レスポンスヘッダー設定
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=whale_report_${new Date().toISOString().split('T')[0]}.xlsx`
        );

        // Excelファイル書き込み
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Excel export error:', error);
        res.status(500).json({ error: 'Excel生成に失敗しました' });
    }
});

app.post('/api/export/csv', authenticateToken, async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: '無効なデータ形式です' });
        }

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

        // レスポンス設定
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=whale_report_${new Date().toISOString().split('T')[0]}.csv`
        );

        // BOM追加（Excel対応）
        res.write('\uFEFF');
        res.write(csv);
        res.end();

    } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ error: 'CSV生成に失敗しました' });
    }
});

// ==================== メール送信API ====================

app.post('/api/mail/send', authenticateToken, async (req, res) => {
    try {
        const { to, subject, body } = req.body;

        if (!to || !subject || !body) {
            return res.status(400).json({ error: '必須項目が不足しています' });
        }

        // メール送信処理（SendGrid、Resend等の実装）
        // 現在はモック実装

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

        // 統計計算
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

// 404ハンドラー
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
    console.log(`Version: 2.0.0`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('=================================');
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
