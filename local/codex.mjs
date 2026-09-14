import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {accountStatus,connectionError} from "./codex-status.mjs";
export async function codexStatus(){try{return await askCodex("",null,"",[],{statusOnly:true});}catch(e){return connectionError(e);}}
export async function askCodex(prompt, deck, selectedSlideId, history = [], options = {}) {
  const cwd = resolve(".local-data/agent");
  mkdirSync(cwd, { recursive: true });
  const child = spawn(
    process.env.FRAME_CODEX_BIN ||
      (existsSync("/Applications/ChatGPT.app/Contents/Resources/codex")
        ? "/Applications/ChatGPT.app/Contents/Resources/codex"
        : "codex"),
    ["-c", "features.context_management=false", "app-server", "--stdio"],
    { cwd, stdio: ["pipe", "pipe", "pipe"] },
  );
  let nextId = 0,
    finalText = "",
    settled = false;
  const pending = new Map();
  const send = (value) => child.stdin.write(JSON.stringify(value) + "\n");
  const rpc = (method, params) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      send({ id, method, params });
    });
  let finish, fail;
  const completed = new Promise((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  completed.catch(() => {});
  const abort = (error) => {
    if (settled) return;
    settled = true;
    fail(error);
    for (const p of pending.values()) p.reject(error);
    pending.clear();
    child.kill();
  };
  const onCancel=()=>abort(new Error("生成を停止しました。"));
  options.signal?.addEventListener('abort',onCancel,{once:true});
  const timer = setTimeout(
    () =>
      abort(new Error("AIの応答がタイムアウトしました。再試行してください。")),
    options.statusOnly?15000:180000,
  );
  child.on("error", error => abort(error));
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk).slice(-2000);
  });
  child.on("exit", () => {
    if (!settled)
      abort(
        new Error(
          "Codex接続が終了しました。ターミナルで codex login を確認してください。",
        ),
      );
  });
  createInterface({ input: child.stdout }).on("line", (line) => {
    let m;
    try {
      m = JSON.parse(line);
    } catch {
      return;
    }
    if (m.id !== undefined && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error.message));
      else p.resolve(m.result);
      return;
    }
    if (m.id !== undefined && m.method) {
      send({
        id: m.id,
        error: {
          code: -32601,
          message: "このスライド編集接続では追加のツール実行を受け付けません。",
        },
      });
      return;
    }
    if (m.method === "item/completed" && m.params.item.type === "agentMessage")
      finalText = m.params.item.text;
    if (m.method === "turn/completed") {
      const turn = m.params.turn;
      if (turn.status === "completed") {
        settled = true;
        finish(finalText);
      } else
        abort(
          new Error(turn.error?.message || "AIの生成を完了できませんでした。"),
        );
    }
  });
  try {
    if(options.signal?.aborted)throw new Error("生成を停止しました。");
    await rpc("initialize", {
      clientInfo: {
        name: "frame_local",
        title: "FRAME Local Slides",
        version: "0.2.0",
      },
    });
    send({ method: "initialized", params: {} });
    const account=await rpc("account/read",{refreshToken:false});
    let limits=null,limitsFailed=false;
    if(account.account?.type==='chatgpt'){try{limits=await rpc("account/rateLimits/read",{});}catch{limitsFailed=true;}}
    const status=accountStatus(account,limits,limitsFailed);
    if(options.statusOnly)return status;
    if(!status.available)throw Error(status.message);
    const catalog = await rpc("model/list", { limit: 100 });
    if(options.listModels) return catalog;
    const chosen = options.model ? catalog.data.find(m=>m.model===options.model) : null;
    if(options.model && !chosen) throw new Error("選択されたモデルは現在利用できません。");
    if(options.effort && (!chosen || !chosen.supportedReasoningEfforts.some(e=>e.reasoningEffort===options.effort))) throw new Error("このモデルでは選択したeffortを利用できません。");
    const { thread } = await rpc("thread/start", {
      ...(options.model ? {model:options.model} : {}),
      cwd,
      ephemeral: true,
      approvalPolicy: "never",
      sandbox: "read-only",
      config: { "tools.shell": false, web_search: "disabled" },
      developerInstructions:
        "あなたは個人用スライド編集アシスタントです。提供されたスライドJSONだけを使用し、ファイルや外部ツールを使わないでください。日本語で回答。変更は実行せず提案のみ。全体生成・スライド追加削除・並べ替えの依頼はproposalJsonに{reason,patches:[],deck:{title,slides}}の完全なデッキを返す。slidesは1〜50枚。各スライドにはid,title,body,eyebrow,layout,theme,animation,notes,items,strokesを含める。新規idは一意な文字列、notes空文字、items/strokes空配列でも可。保持する既存スライドはIDや内容、マーカーを維持する。全体置換でも変更のないスライドを省略しない。回答JSONのproposalJsonには {reason:string,patches:[{slideId:string,changes:{title?,body?,eyebrow?,notes?,theme?,layout?,animation?,items?,placements?,animationDuration?,artworkKind?}}]} を文字列として入れる。変更不要なら空文字。既存のobjects（自由配置要素）とtextStyles（文字書式）も編集可能。objectsを変更するときは同じIDを保持し、変更しない全要素を含む配列全体を返す。各要素x,y,w,hは1600x900の座標で、kindはtext/image/shape/table/chart/motion。文字書式styleはfontFamily,fontSize(pt),bold,italic,underline,color(#RRGGBB),align,left/center/right,lineHeight。table/chartのcellsは1行目が見出しの文字列2次元配列。画像srcはデッキ内に存在する/api/assets/の値だけを使用。新しい画像URLを捏造しない。textStylesはtitle/body/eyebrow/itemsに同じ文字書式を指定。themeはblue/white/dark、layoutはhero/statement/cards/flow/comparison(比較)/metrics(数値実績)/timeline(時系列)/agenda(目次)/quote(引用結論)/section(章扉)。comparison,metrics,timeline,agendaはitemsで各項目を表す。metricsのitems.titleには実際に与えられた数値を使い、数値を捏造しない、animationはorbit/reveal/none。title90文字、body600文字、eyebrow80文字、notes4000文字、items4個以内(title60文字,body180文字)。itemsの任意のbox:{x,y,w,h}はカード領域内のパーセント座標です。既存のboxは配置変更を依頼されない限り保持してください。IDは変えない。artworkKindはorbit,arrow,none,cube(3D立方体),globe(3D球体),rings(3Dリング),helix(3D二重らせん),crystal(3D結晶),wave(波),particles(浮遊粒子),pulse(波紋),bars(スペクトラム)。artworkColorは#2454ef等の6桁HEX。backgroundTemplateはnone,bg_1〜bg_6。placementsはtitle/body/eyebrow/artwork/itemsの任意キーに{x,y,scale,opacity}を指定。x,yは元の配置からのスライド比率の移動量(-100〜100)、scaleは元サイズ倍率(0.2〜2)、opacityは0〜1。省略時は{x:0,y:0,scale:1,opacity:1}。既存placementsの他の要素は保持して全体を返す。animationDurationは回転周期2〜120秒。",
    });
    await rpc("turn/start", {
      threadId: thread.id,
      ...(options.model ? {model:options.model} : {}),
      ...(options.effort ? {effort:options.effort} : {}),
      input: [
        {
          type: "text",
          text: JSON.stringify({
            conversation: history.slice(-12),
            request: prompt,
            selectedSlideId,
            allowedScope:options.scope,
            deck,
          }),
        },
      ],
      outputSchema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          proposalJson: { type: "string" },
        },
        required: ["answer", "proposalJson"],
        additionalProperties: false,
      },
    });
    return JSON.parse(await completed);
  } finally {
    options.signal?.removeEventListener("abort",onCancel);
    clearTimeout(timer);
    settled = true;
    child.kill();
  }
}
