# WHALE - 福祉・医療・行政・介護・教育統合システム

**Welfare, Healthcare, Administration, Long-term care, and Education**

## 🐋 概要

WHALEは、福祉事業所向けの包括的な情報管理システムです。完全クライアントサイド動作とオフライン対応を実現し、GitHub PagesとRender.comを活用した最新のアーキテクチャで構築されています。

### 主な特徴

- ✅ **完全オフライン対応**: LocalStorage + PouchDBによるクライアントサイドデータ管理
- 🚀 **高速動作**: HTMX + Tailwind CSSによるモダンなUI
- 🔒 **セキュア**: JWT認証 + エンドツーエンド暗号化
- 📱 **PWA対応**: モバイルアプリのような使用感
- 🌐 **無料ホスティング**: GitHub Pages + Render.com Free Tier
- 🔄 **自動デプロイ**: GitHub Actionsによる継続的デリバリー

## 📋 機能一覧

### 利用者向け機能
- 日々の生活記録（起床・就寝・食事・運動・入浴）
- バイタルサイン記録（体温・血圧・脈拍・SpO2）
- 気分状態のトラッキング
- 気付きやコミュニケーション記録
- データ可視化とグラフ表示

### 職員向け機能
- 利用者情報管理
- 出席管理
- アセスメント作成
- サービス利用計画書作成
- 支援記録管理
- モニタリング報告書作成

### 管理者向け機能
- 組織・施設情報管理
- ユーザー管理
- 権限管理
- 監査ログ
- データエクスポート（PDF/Excel/CSV）

## 🏗️ アーキテクチャ

```
┌────────────────────────────────────────┐
│  GitHub Pages (フロントエンド)           │
│  - HTML + HTMX + Tailwind CSS          │
│  - LocalStorage + PouchDB              │
│  - Service Worker (PWA)                │
└──────────────┬─────────────────────────┘
               │ REST API
               ▼
┌────────────────────────────────────────┐
│  Render.com (バックエンド)               │
│  - Node.js + Express                   │
│  - JWT認証                              │
│  - PDF/Excel生成                        │
│  - データ同期                            │
└────────────────────────────────────────┘
```

## 🚀 クイックスタート

### 前提条件

- Node.js 18以上
- npm 9以上
- Gitアカウント
- Render.comアカウント（無料）

### 1. リポジトリのセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/Uchida16104/WHALE.git
cd WHALE

# バックエンド依存関係インストール
cd backend
npm install
cd ..
```

### 2. ローカル開発

```bash
# バックエンド起動
cd backend
npm run dev

# 別ターミナルでフロントエンド起動
cd frontend
python -m http.server 8000
# または
npx serve
```

ブラウザで http://localhost:8000 を開く

### 3. GitHub Pagesデプロイ

```bash
# GitHubリポジトリ作成
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/WHALE.git
git push -u origin main

# GitHub Settings > Pages で以下を設定:
# - Source: Deploy from a branch
# - Branch: main
# - Folder: /frontend
```

### 4. Render.comデプロイ

1. [Render.com](https://render.com)にサインアップ
2. "New +" → "Web Service"を選択
3. GitHubリポジトリを接続
4. 以下の設定:
   - **Name**: whale-backend
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free

5. 環境変数を設定:
   ```
   NODE_ENV=production
   JWT_SECRET=<ランダムな文字列>
   CORS_ORIGIN=https://YOUR_USERNAME.github.io
   ```

6. "Create Web Service"をクリック

### 5. フロントエンド設定更新

`frontend/index.html` の `window.WHALE.API_URL` を更新:

```javascript
window.WHALE = {
    API_URL: 'https://whale-backend.onrender.com', // ← Render.comのURL
    GITHUB_PAGES_URL: 'https://YOUR_USERNAME.github.io/WHALE',
    VERSION: '2.0.0'
};
```

## 📁 ディレクトリ構成

```
WHALE/
├── frontend/              # GitHub Pages用
│   ├── index.html        # メインエントリー
│   ├── login.html        # ログイン
│   ├── register.html     # 新規登録
│   ├── dashboard.html    # ダッシュボード
│   ├── daily-record.html # 日々の記録
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js        # メインアプリ
│       ├── auth.js       # 認証管理
│       ├── storage.js    # データ管理
│       └── utils.js      # ユーティリティ
│
├── backend/              # Render.com用
│   ├── server.js         # Expressサーバー
│   ├── package.json
│   ├── routes/
│   ├── middleware/
│   └── services/
│
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml
│       └── deploy-backend.yml
│
└── README.md
```

## 🔧 設定

### 環境変数 (バックエンド)

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://your-username.github.io
```

### LocalStorage設定 (フロントエンド)

```javascript
{
  "colorScheme": "default",
  "language": "ja",
  "fontSize": "medium",
  "theme": "light"
}
```

## 📊 データ管理

### LocalStorage

- 設定情報
- セッション情報
- キャッシュデータ

### PouchDB

- 構造化データ
- オフラインデータ
- 同期キュー

### データフロー

```
ユーザー入力
    ↓
LocalStorage (即座に保存)
    ↓
PouchDB (構造化データ)
    ↓
バックエンドAPI (同期)
```

## 🔒 セキュリティ

### 実装済み機能

- JWT認証
- SHA-256パスワードハッシュ
- HTTPS強制
- CORS設定
- XSS対策
- CSRF保護
- レート制限
- セキュリティヘッダー

### データプライバシー

- クライアントサイド暗号化
- 個人情報保護法準拠
- GDPR対応設計
- 監査ログ記録

## 📱 PWA対応

### Service Worker

```javascript
// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('whale-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/css/styles.css',
        '/js/app.js'
      ]);
    })
  );
});
```

### マニフェスト

```json
{
  "name": "WHALE",
  "short_name": "WHALE",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "
