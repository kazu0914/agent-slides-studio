# リリースとバージョン管理

## 開発の進め方

- `main` は次回公開版の開発先。配布済みの版はタグとGitHub Releasesで特定する。
- 小さな作業ブランチからPRを作成し、変更内容とCIを確認して取り込む。
- 不具合は再現手順・OS・アプリのバージョンをIssueに記載する。個人資料や認証情報を添付しない。
- 日々の変更は `CHANGELOG.md` の `Unreleased` に記録する。機能の優先順位は `ROADMAP.md` で管理する。

## 番号と互換性

SemVerを基準にする。ベータ中は `0.9.0-beta.1` → `0.9.0-beta.2` のように公開単位で番号を進める。
1.0.0以降は、不具合修正がpatch、互換性のある機能追加がminor、互換性のない変更がmajor。
互換性の対象は、デッキJSON・バックアップ・保存データ、公開する連携API、起動設定とする。
0.xでも保存データを無断で破壊しない。移行が必要ならバックアップ・移行方法・制限を明記する。

公開済みのタグを移動せず、配布ファイルを差し替えない。誤りは新しいバージョンで修正する。
新規タグは `git tag -a` による注釈付きタグを使用する。初回の軽量タグは変更しない。

## 公開手順

1. クリーンな公開用チェックアウトを用意する。個人データや非公開素材を含む開発履歴をpushしない。
2. `package.json` と `package-lock.json` のルートのversion、READMEの現行版表記をそろえる。
3. CHANGELOGの未公開変更を新バージョンへ移し、変更内容・既知の制限・更新手順を用意する。
4. 次のチェックを実施する。

```sh
npm ci
npm audit --audit-level=high
npm run typecheck
npm test
npm run build
npm run check:release
npm run test:e2e
```

E2Eは専用の一時データと9192番ポートを使用する。起動前に空きを確認する。
UI変更はmacOSのブラウザでも確認し、確認結果をPRへ記載する。

5. PRのCI成功を確認してmainへ取り込む。タグ対象のコミットを記録する。
6. そのコミットへ注釈付きタグを作り、タグだけを明示してpushする。
7. タグからソースアーカイブを作成し、展開先でファイルスキャン、バージョン一致を確認する。SHA256も作成する。
8. GitHub Releaseをドラフトとして作成し、アーカイブ・SHA256・変更説明をすべて添付する。
9. タグのコミットと添付内容を確認して公開する。ベータはPre-releaseにする。
10. 公開後、タグ・添付ファイル・チェックサムを再取得して一致を確認する。

GitHubのImmutable releasesを有効にすると公開後のタグ移動・添付ファイル変更を防げる。
有効化はリポジトリ設定の変更として別途確認し、公開前にドラフトへ全添付物をそろえる。

## 利用者の更新

アプリ内でバックアップを保存し、サーバーを停止してから更新する。
cloneした環境ではローカル変更を確認してから新しいタグを取得・checkoutし、`npm ci`、`npm run build`、`npm start` を実行する。
`.local-data/` と個人用素材は削除しない。ローカル変更がある場合は強制リセットせず、別フォルダーで新しい版を準備する。
ソースアーカイブ利用者も旧フォルダーを消さず、新しい版でバックアップの復元を確認してから切り替える。

## 参考資料

- [Git: Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging.html)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
