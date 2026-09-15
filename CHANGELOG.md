# Changelog

## Unreleased

- フォントサイズの手入力中に最小値6へ書き換わる問題を修正。小数入力を保持し、Enter・フォーカス移動で確定、Escapeで取消。

- 編集枠を非表示にするとドラッグ中の整列ガイドまで隠れる問題を修正。

- ドラッグ中のピンクの整列ガイド・余白px表示・吸着を追加。選択メニューの出現でキャンバスが縮む問題も修正。

- 複数選択に6方向の整列・横縦の等間隔配置を追加。カード・文字・図形の混在選択とUndoに対応。

- スライド一覧の⌘C／⌘V（Ctrl+C／Ctrl+V）によるコピー・貼り付けと、選択要素のDelete／Backspace削除に対応。文字編集中とロックした要素を保護。

- スライド別のプレゼンメモとマーカーをブラウザに自動保存。編集画面・発表者画面のメモ入力、再表示、現在のスライドのマーカー消去に対応。

- マーカーが不透明な図形の後ろに隠れる重なり順を修正。

- 余白からドラッグする範囲選択と、カード・文字・図形の混在した一括移動を追加。ドラッグ完了時に一括記録しUndoに対応。
- 選択操作バーをスライド外へ移し、未選択時は非表示。

- AI入力欄にCodex標準Web検索の任意チェックを追加。現在日時・タイムゾーンを渡し、調査の出典記載を指示。
- カードの複数選択と一括ドラッグ・矢印キー移動を追加。

- 要素追加・レイヤーと右メニュー全体の折りたたみを追加。
- 表示・ロック操作に短い半透明ツールチップを追加。
- 不具合・要望を送るGoogleフォームへのボタンを追加（発表中は非表示）。
- サムネイルのドラッグ並べ替え、端での自動スクロール、Alt＋上下キーでの移動に対応。

## 0.9.0-beta.2 — 2026-09-15

- スライドのグリッド表示、選択状態の維持、閉じる操作とフォーカス復帰を追加。
- ポータルなど別サイトのリンクから編集画面を開けない問題を修正。API・埋め込み・別Originの拒否は維持。
- READMEに操作GIFと英語の紹介を追加。
- リリース手順・互換性方針・更新手順を文書化。
- 保存形式の変更なし。macOS向けベータ版で、既知の機能制限は継続。

## 0.9.0-beta.1 — 2026-09-14

- Local slide library and editor with editable objects, tables, charts and animations.
- Codex integration, visual proposal comparison, scope restriction and partial acceptance.
- Decision history, backups, trash recovery, PDF and editable PPTX export.
- Presenter window, click reveal, temporary marker tools and zoom.
- OSS preparation: MIT license, local-first setup, CI, release file scan, portable browser detection.

macOS向けの無料ベータ版。検証範囲と制限は docs/RELEASE_CHECKS.md を参照。

- PPTXのローカル取り込みを追加。文字・画像・基本図形・表・ノートを新規デッキに変換し、互換性の注意点を表示。

- コメント不要の自動保存、保存完了後のプレゼン開始。
- テキスト・装飾の直接移動/サイズ変更、回転、コピーと貼り付け、編集枠の自動非表示。
- 21種類の立体的なモーション、個別の色/周期、複数配置、ドラッグ＆ドロップ。
- 自作SVGアニメーションの追加とサンプル。
- 右向き矢印と太さ調整。
