import {existsSync} from 'node:fs';
// 明示指定、OS標準のChrome、Playwright管理のChromiumの順で選ぶ。
export function browserOptions(){
 const explicit=process.env.FRAME_CHROME_BIN;
 if(explicit){if(!existsSync(explicit))throw Error('FRAME_CHROME_BINのブラウザが見つかりません');return {executablePath:explicit};}
 const paths=process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']:process.platform==='win32'?[`${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe`,`${process.env['PROGRAMFILES(X86)']}/Google/Chrome/Application/chrome.exe`]:['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'];
 const executablePath=paths.find(p=>existsSync(p));return executablePath?{executablePath}:{};
}
