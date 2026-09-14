# Third-party notices

Agent Slides Studio application code is licensed under MIT (see LICENSE).

- The original application scaffold included OpenAI MIT-licensed Sites build support. Its notice is preserved in `licenses/OpenAI-MIT.txt` in release packages and `build/sites-vite-plugin.LICENSE` in the development checkout.
- The development checkout includes shadcn-derived components and CSS. Their notice remains in `vendor/shadcn-tailwind-4.13.0.LICENSE.md`. Unused components and that CSS are not included in the local-only release package.
- npm dependencies retain their own licenses. The package lock records the exact dependencies; this project's license does not replace their licenses.
- System fonts and installed Chrome/Chromium/Codex binaries are not distributed by this project.
- Personal backgrounds `public/backgrounds/bg_1.png` through `bg_6.png`, user decks, uploaded assets, conversations and database files are **not part of the public distribution**. The repository owner has requested that these backgrounds remain private.

Future public artwork must be accompanied by its source, author and redistribution terms before it is added to a release.

PPTXの取り込みには fflate（MIT）と @xmldom/xmldom（MIT）を使用します。各パッケージのライセンスは配布元および node_modules 内を参照してください。

アプリのロゴは開発者提供の画像（申告された生成ツール: GPT-images 2.5）を使用しています。

公開用背景 `public/backgrounds/public-blue.png`、`public-green.png`、`public-orange.png`、`public-sunshine.png`、`public-hearts.png` は、開発者kazu0914がChatGPTで生成して公開用に提供した画像です。本プロジェクトのMITライセンスの条件で再配布できます。生成用プロンプトはアプリに同梱していません。
