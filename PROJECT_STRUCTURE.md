```
WHALE/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # CI/CD パイプライン
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # メインReactコンポーネント
│   │   ├── main.tsx                   # エントリーポイント
│   │   ├── index.css                  # グローバルスタイル
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx          # ログインページ
│   │   │   ├── RegisterPage.tsx       # 新規登録ページ
│   │   │   ├── AdminDashboard.tsx     # 管理者ダッシュボード
│   │   │   ├── StaffDashboard.tsx     # 職員ダッシュボード
│   │   │   ├── UserDashboard.tsx      # 利用者ダッシュボード
│   │   │   ├── DailyRecordPage.tsx    # 日常記録ページ
│   │   │   ├── ReportsPage.tsx        # レポートページ
│   │   │   ├── SettingsPage.tsx       # 設定ページ
│   │   │   └── NotFoundPage.tsx       # 404ページ
│   │   ├── components/
│   │   │   ├── Header.tsx             # ヘッダー
│   │   │   ├── Sidebar.tsx            # サイドバー
│   │   │   ├── FormInput.tsx          # フォーム入力
│   │   │   ├── DataTable.tsx          # データテーブル
│   │   │   ├── Chart.tsx              # グラフコンポーネント
│   │   │   └── Modal.tsx              # モーダル
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx        # 認証コンテキスト
│   │   │   ├── ThemeContext.tsx       # テーマコンテキスト
│   │   │   └── LanguageContext.tsx    # 言語コンテキスト
│   │   ├── services/
│   │   │   ├── api.ts                 # API呼び出し
│   │   │   ├── auth.ts                # 認証サービス
│   │   │   ├── storage.ts             # LocalStorage管理
│   │   │   └── encryption.ts          # 暗号化処理
│   │   ├── types/
│   │   │   ├── index.ts               # TypeScript型定義
│   │   │   ├── user.ts                # ユーザー型
│   │   │   ├── record.ts              # レコード型
│   │   │   └── api.ts                 # API型
│   │   ├── utils/
│   │   │   ├── validation.ts          # バリデーション
│   │   │   ├── format.ts              # フォーマット処理
│   │   │   └── constants.ts           # 定数
│   │   └── hooks/
│   │       ├── useAuth.ts             # 認証フック
│   │       ├── useFetch.ts            # フェッチフック
│   │       └── useLocalStorage.ts     # LocalStorageフック
│   ├── public/
│   │   ├── index.html                 # HTMLテンプレート
│   │   ├── manifest.json              # PWAマニフェスト
│   │   ├── logo.svg                   # ロゴ
│   │   └── favicon.ico                # ファビコン
│   ├── package.json                   # npm依存関係
│   ├── tsconfig.json                  # TypeScript設定
│   ├── vite.config.ts                 # Vite設定
│   └── tailwind.config.js             # Tailwind設定
├── backend/
│   ├── laravel/
│   │   ├── app/
│   │   │   ├── Http/
│   │   │   │   ├── Controllers/
│   │   │   │   │   ├── AuthController.php
│   │   │   │   │   ├── UserController.php
│   │   │   │   │   ├── DailyRecordController.php
│   │   │   │   │   ├── ReportController.php
│   │   │   │   │   ├── ExportController.php
│   │   │   │   │   ├── MedicationController.php
│   │   │   │   │   └── VitalSignController.php
│   │   │   │   ├── Middleware/
│   │   │   │   │   ├── Authenticate.php
│   │   │   │   │   ├── CheckRole.php
│   │   │   │   │   └── LogActivity.php
│   │   │   │   └── Requests/
│   │   │   │       ├── LoginRequest.php
│   │   │   │       ├── RegisterRequest.php
│   │   │   │       └── DailyRecordRequest.php
│   │   │   ├── Models/
│   │   │   │   ├── User.php
│   │   │   │   ├── DailyRecord.php
│   │   │   │   ├── Medication.php
│   │   │   │   ├── VitalSign.php
│   │   │   │   ├── Assessment.php
│   │   │   │   └── ServicePlan.php
│   │   │   ├── Jobs/
│   │   │   │   ├── ProcessDailyRecordAnalysis.php
│   │   │   │   └── GenerateReport.php
│   │   │   └── Events/
│   │   │       ├── DailyRecordCreated.php
│   │   │       └── VitalAlertTriggered.php
│   │   ├── routes/
│   │   │   └── api.php                # API routes
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   │   ├── 2025_01_01_000001_create_facilities_table.php
│   │   │   │   ├── 2025_01_01_000002_create_users_table.php
│   │   │   │   ├── 2025_01_01_000003_create_daily_records_table.php
│   │   │   │   └── ... (other migrations)
│   │   │   └── seeders/
│   │   │       ├── FacilitySeeder.php
│   │   │       ├── UserSeeder.php
│   │   │       └── DailyRecordSeeder.php
│   │   ├── resources/
│   │   │   └── views/
│   │   │       └── emails/
│   │   │           ├── welcome.blade.php
│   │   │           └── alert.blade.php
│   │   ├── .env.example               # 環境設定例
│   │   ├── composer.json              # PHP依存関係
│   │   └── composer.lock
│   ├── fastapi/
│   │   ├── main.py                    # メインアプリケーション
│   │   ├── requirements.txt           # Python依存関係
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── core/
│   │   │   │   ├── config.py          # 設定
│   │   │   │   └── security.py        # セキュリティ
│   │   │   ├── api/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── analysis.py
│   │   │   │   │   ├── mood.py
│   │   │   │   │   ├── vital.py
│   │   │   │   │   ├── activity.py
│   │   │   │   │   └── sleep.py
│   │   │   │   └── schemas.py
│   │   │   ├── services/
│   │   │   │   ├── analysis.py
│   │   │   │   ├── database.py
│   │   │   │   └── recommendations.py
│   │   │   └── utils/
│   │   │       ├── charts.py
│   │   │       └── calculations.py
│   │   └── tests/
│   │       ├── test_analysis.py
│   │       └── test_api.py
│   └── cpp/
│       ├── CMakeLists.txt
│       ├── src/
│       │   ├── main.cpp
│       │   ├── export_handler.cpp
│       │   └── file_processor.cpp
│       ├── include/
│       │   └── export_handler.h
│       └── build/
├── database/
│   ├── schema.sql                     # PostgreSQLスキーマ
│   ├── seed.sql                       # 初期データ
│   └── backups/                       # バックアップ
├── docs/
│   ├── api/
│   │   ├── auth.md                    # 認証API
│   │   ├── daily-records.md           # 日常記録API
│   │   ├── analysis.md                # 分析API
│   │   └── openapi.yaml               # OpenAPI仕様
│   ├── guides/
│   │   ├── user-guide.md              # ユーザーガイド
│   │   ├── admin-guide.md             # 管理者ガイド
│   │   └── developer-guide.md         # 開発者ガイド
│   ├── deployment/
│   │   ├── docker.md
│   │   ├── render.md
│   │   └── kubernetes.md
│   ├── security/
│   │   ├── encryption.md
│   │   ├── authentication.md
│   │   └── gdpr.md
│   └── troubleshooting/
│       ├── common-issues.md
│       └── faq.md
├── .gitignore
├── .dockerignore
├── .env.example                       # 環境変数例
├── .env.development                   # 開発環境
├── .env.production                    # 本番環境
├── Dockerfile                         # Docker マルチステージビルド
├── docker-compose.yml                 # Docker Compose設定
├── docker-entrypoint.sh               # Docker エントリーポイント
├── nginx.conf                         # Nginx設定
├── supervisord.conf                   # Supervisor設定
├── render.yaml                        # Render.com設定
├── README.md                          # プロジェクト説明
├── LICENSE                            # MITライセンス
├── CONTRIBUTING.md                    # 貢献ガイド
├── CHANGELOG.md                       # 変更ログ
└── PROJECT_STRUCTURE.md               # このファイル
```

## 主要なファイルの説明

### フロントエンド (React + TypeScript)
- **pages/**: ページコンポーネント
- **components/**: 再利用可能なUIコンポーネント
- **contexts/**: React Context（認証、テーマ、言語）
- **services/**: API呼び出しとビジネスロジック
- **hooks/**: カスタムReactフック
- **types/**: TypeScript型定義

### バックエンド (Laravel)
- **Controllers/**: リクエストハンドラー
- **Models/**: Eloquent ORM モデル
- **Middleware/**: HTTP ミドルウェア
- **Jobs/**: バックグラウンドジョブ
- **Migrations/**: データベーススキーマ

### データ分析 (FastAPI)
- **main.py**: FastAPI アプリケーション
- **app/api/**: APIエンドポイント
- **app/services/**: 分析サービス
- **app/utils/**: ユーティリティ関数

## ビルド・デプロイフロー

```
git push
  ↓
GitHub Actions CI/CD
  ├─ Code Quality Check
  ├─ Run Tests
  ├─ Security Scan
  └─ Build Docker Image
  ↓
Push to Container Registry
  ↓
Deploy to Render.com
  ├─ PostgreSQL Database
  ├─ Redis Cache
  ├─ Laravel API
  ├─ FastAPI Analytics