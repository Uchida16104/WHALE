# WHALE - 福祉統合管理システム

**Welfare, Healthcare, Administration, Long-term care, and Education**

完全なマルチテナント福祉管理システムで、利用者、職員、管理者が日々の生活情報を記録し、多機関連携を実現します。

## 🚀 システム概要

### 対応施設
- デイサービス
- デイケア
- 自立訓練支援
- 就労継続支援B型・A型
- 就労移行支援
- 相談支援
- 放課後等デイサービス
- 児童発達支援

### 主な機能
- ✅ マルチユーザー認証（管理者・職員・利用者）
- ✅ 日常記録入力（起床・食事・薬・バイタル・気分など35項目以上）
- ✅ AI分析（気分・バイタル・活動・睡眠パターン）
- ✅ データ出力（PDF・Excel・Word・CSV）
- ✅ 多言語対応（20言語以上）
- ✅ バリアフリー対応（色覚異常・高齢者対応）
- ✅ LocalStorage連携
- ✅ リアルタイムアラート

## 📋 必要なシステム

- Docker & Docker Compose
- Node.js 18+
- PHP 8.2+
- PostgreSQL 15+
- Redis 7+
- Python 3.11+

## 🛠️ インストール

### 1. リポジトリをクローン
```bash
git clone https://github.com/Uchida16104/WHALE.git
cd WHALE
```

### 2. 環境ファイルのセットアップ
```bash
cp .env.example .env.development
cp .env.production.example .env.production
```

### 3. 開発環境の起動
```bash
docker-compose up -d
```

### 4. 初期化
```bash
docker-compose exec laravel php artisan migrate --seed
docker-compose exec laravel php artisan passport:install
```

### 5. アプリケーションにアクセス
- フロントエンド: http://localhost:3000
- API: http://localhost/api
- データ分析: http://localhost/analysis
- PgAdmin: http://localhost:5050
- MailHog: http://localhost:8025

## 📚 ドキュメント

### API仕様
- [認証API](./docs/api/auth.md)
- [日常記録API](./docs/api/daily-records.md)
- [分析API](./docs/api/analysis.md)

### デプロイメント
- [Render.com deployment](./docs/deployment/render.md)
- [Docker deployment](./docs/deployment/docker.md)

## 🔐 セキュリティ

- TLS 1.2+ 強制
- AES-256 データ暗号化
- RBAC（ロールベースアクセス制御）
- 2要素認証対応
- レート制限
- CORS保護

## 📱 ユーザーガイド

### 管理者
1. システム設定
2. 職員・利用者管理
3. 施設情報管理
4. レポート生成
5. アラート設定

### 職員
1. 利用者情報管理
2. 日常記録確認・編集
3. レポート生成
4. アラート確認

### 利用者
1. 日常記録入力
2. 自分のデータ閲覧
3. 気分トレンド確認

## 🚀 デプロイメント

### Render.comへのデプロイ
```bash
# Renderに接続
render login

# デプロイ
render deploy

# ログ確認
render logs
```

### ローカルビルド
```bash
docker build -t whale:latest .
docker run -p 80:80 whale:latest
```

## 📊 技術スタック

### フロントエンド
- React 18
- TypeScript
- Tailwind CSS
- HTMX
- LocalStorage

### バックエンド
- Laravel 10
- PHP 8.2
- FastAPI
- PostgreSQL
- Redis

### インフラストラクチャ
- Docker
- Nginx
- Render.com

## 🔄 CI/CD

GitHub Actionsで自動テストとデプロイを実行:
- コード品質チェック (ESLint, PHP CodeSniffer)
- ユニットテスト
- 統合テスト
- セキュリティスキャン

## 📈 スケーリング

- 水平スケーリング対応
- データベース複製
- キャッシュレイヤー
- CDN統合

## 📞 サポート

### 問題報告
GitHub Issues: https://github.com/Uchida16104/WHALE/issues

### ドキュメント
- [API Documentation](./docs/api/)
- [User Guide](./docs/guides/)
- [Installation Guide](./docs/installation/)
- [Troubleshooting](./docs/troubleshooting/)

## 📄 ライセンス

このプロジェクトはMITライセンス下でライセンスされています。

## 👨‍💻 開発者

**Hirotoshi Uchida**
- GitHub: https://github.com/Uchida16104
- Website: https://hirotoshiuchida.onrender.com

## 🙏 謝辞

このシステムは日本の福祉事業所の支援を目的として開発されました。

## ✨ 今後の機能

- [ ] AI音声入力
- [ ] ピクトグラム入力
- [ ] IoT連携（ウェアラブルデバイス）
- [ ] FHIR標準対応
- [ ] 医療機関連携
- [ ] 教育機関連携
- [ ] 行政機関連携
- [ ] モバイルアプリ
- [ ] オフラインファースト対応
- [ ] 多地域展開

---

**最後更新**: 2025年1月
**バージョン**: 1.0.0