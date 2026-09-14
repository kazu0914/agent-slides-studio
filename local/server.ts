import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRepository, AppError } from "../lib/repository";
import {
  deckSchema,
  proposalSchema,
  applyProposal,
  diffDeck,
} from "../lib/model";
import {constrainDeck} from "../lib/review";
import { askCodex, codexStatus } from "./codex.mjs";
import { renderPdf } from "./pdf";
import {importPptx} from "./pptx-import";
import {renderPptx} from "./pptx.mjs";
import { z } from "zod";
import {storeImage,readAsset} from "./assets";
import {exportBackup,importBackup} from "./backup";
const port = Number(process.env.FRAME_PORT || 9182),
  root = resolve("dist-local");
mkdirSync(".local-data", { recursive: true });
const sqlite = new DatabaseSync(".local-data/frame.sqlite");
sqlite.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS chat(deck_id TEXT,role TEXT,text TEXT,at TEXT); CREATE TABLE IF NOT EXISTS deleted_decks(owner TEXT NOT NULL,deck_id TEXT NOT NULL,deleted_at TEXT NOT NULL,PRIMARY KEY(owner,deck_id));",
);
for (const name of ["0000_white_naoko.sql", "0001_neat_master_chief.sql"]) {
  if (!sqlite.prepare("SELECT name FROM migrations WHERE name=?").get(name)) {
    sqlite.exec("BEGIN");
    try {
      sqlite.exec(readFileSync(resolve("drizzle", name), "utf8"));
      sqlite.prepare("INSERT INTO migrations VALUES(?)").run(name);
      sqlite.exec("COMMIT");
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  }
}
const database = {
  prepare(sql: string) {
    const stmt = sqlite.prepare(sql);
    return {
      bind(...args: unknown[]) {
        return {
          async first() {
            return stmt.get(...(args as never[])) || null;
          },
          async all() {
            return { results: stmt.all(...(args as never[])) };
          },
          async run() {
            return stmt.run(...(args as never[]));
          },
        };
      },
    };
  },
} as unknown as D1Database;
const repo = createRepository(database),
  user = "local-owner";
sqlite.exec("CREATE TABLE IF NOT EXISTS templates(id TEXT PRIMARY KEY,name TEXT NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL)");
let generating = false;
const saveSchema = z.object({
  deck: deckSchema.optional(),
  restoreVersion: z.number().int().min(0).optional(),
  version: z.number().int().min(0),
  requestId: z.string().min(1).max(100),
  reason: z.string().trim().min(1).max(1000),
  actor: z.enum([
    "手動編集",
    "クイック操作",
    "エージェント",
    "プレゼン",
    "履歴の復元",
    "JSON取込",
  ]),
});
let pdfGenerating = false;
createServer(async (req, res) => {
  const json = (data: unknown, status = 200) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  try {
    if (
      req.headers.host !== `127.0.0.1:${port}` &&
      req.headers.host !== `localhost:${port}`
    )
      throw new AppError("ローカル接続のみ利用できます。", 403);
    const origin = `http://${req.headers.host}`;
    if (req.headers.origin && req.headers.origin !== origin)
      throw new AppError("別サイトからの操作は受け付けません。", 403);
    const url = new URL(req.url || "/", origin),
      id = url.searchParams.get("deckId") || "legacy";
    const deleted = () =>
      !!sqlite
        .prepare("SELECT 1 FROM deleted_decks WHERE owner=? AND deck_id=?")
        .get(user, id);
    if (
      ["/api/deck", "/api/agent", "/api/codex/chat", "/api/pdf", "/api/pptx", "/api/backup"].includes(
        url.pathname,
      ) &&
      deleted()
    )
      throw new AppError("このデッキは削除されています。", 404);
    let body: unknown;
    if (req.method === "POST") {
      let text = "";
      for await (const chunk of req) {
        text += chunk;
        if (Buffer.byteLength(text) > (url.pathname==="/api/pptx/import"?71000000:url.pathname==="/api/backup/import"?150000000:url.pathname==="/api/assets"?15000000:10000000))
          throw new AppError("データが大きすぎます。", 413);
      }
      try {
        body = JSON.parse(text);
      } catch {
        throw new AppError("JSON形式を確認してください。");
      }
    }
    if(url.pathname==="/api/pptx/import"&&req.method==="POST"){
      const input=z.object({name:z.string().max(255),data:z.string().max(70000000).regex(/^[A-Za-z0-9+/]+={0,2}$/)}).parse(body);
      const result=importPptx(Buffer.from(input.data,'base64'),input.name,storeImage);
      const created=await repo.create(user,result.deck);
      return json({...created,warnings:result.warnings,slideCount:result.deck.slides.length},201);
    }
    if(url.pathname==="/api/assets"&&req.method==="POST") return json({src:storeImage(z.object({data:z.string()}).parse(body).data)},201);
    if(url.pathname.startsWith("/api/assets/")&&req.method==="GET"){try{const bytes=readAsset(url.pathname);const ext=url.pathname.split('.').pop();res.writeHead(200,{"Content-Type":`image/${ext==='jpg'?'jpeg':ext}`,"Cache-Control":"private,max-age=31536000,immutable","X-Content-Type-Options":"nosniff"});res.end(bytes);return;}catch{return json({error:'画像が見つかりません'},404);}}
    if(url.pathname==="/api/backup"&&req.method==="GET")return json(await exportBackup(sqlite,repo,user,id));
    if(url.pathname==="/api/backup/import"&&req.method==="POST")return json(importBackup(sqlite,user,body),201);
    if(url.pathname==="/api/trash"&&req.method==="GET"){const ids=sqlite.prepare('SELECT deck_id,deleted_at FROM deleted_decks WHERE owner=? ORDER BY deleted_at DESC').all(user);return json(await Promise.all(ids.map(async row=>{const w=await repo.workspace(user,row.deck_id as string);return {id:row.deck_id,title:w.deck.title,slideCount:w.deck.slides.length,deletedAt:row.deleted_at};})));}
    if(url.pathname==="/api/trash/restore"&&req.method==="POST"){const {deckId}=z.object({deckId:z.string().max(100)}).parse(body);await repo.workspace(user,deckId);sqlite.prepare('DELETE FROM deleted_decks WHERE owner=? AND deck_id=?').run(user,deckId);return json({id:deckId});}
    if(url.pathname==="/api/pptx"&&req.method==="GET"){
      if(pdfGenerating)throw new AppError('別の出力処理が進行中です',409);pdfGenerating=true;
      try{const current=await repo.workspace(user,id);const bytes=await renderPptx(origin,id,current.version);res.writeHead(200,{"Content-Type":"application/vnd.openxmlformats-officedocument.presentationml.presentation","Content-Disposition":`attachment; filename="slides.pptx"; filename*=UTF-8''${encodeURIComponent(current.deck.title)}.pptx`,"Cache-Control":"no-store"});res.end(bytes);}finally{pdfGenerating=false;}return;
    }
    if (url.pathname === "/api/pdf" && req.method === "GET") {
      if (pdfGenerating)
        throw new AppError(
          "別のPDFを生成中です。完了してから再試行してください。",
          409,
        );
      const current = await repo.workspace(user, id);
      pdfGenerating = true;
      try {
        const pdf = await renderPdf(origin, id, current.version);
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="slides.pdf"; filename*=UTF-8''${encodeURIComponent(current.deck.title)}.pdf`,
          "Cache-Control": "no-store",
        });
        res.end(pdf);
      } finally {
        pdfGenerating = false;
      }
      return;
    }
    if (url.pathname === "/api/decks") {
      if (req.method === "GET") {
        const deletedIds = new Set(
          sqlite
            .prepare("SELECT deck_id FROM deleted_decks WHERE owner=?")
            .all(user)
            .map((row) => row.deck_id),
        );
        return json(
          (await repo.list(user)).filter((deck) => !deletedIds.has(deck.id)),
        );
      }
      if (req.method === "DELETE") {
        const deckId = z
          .string()
          .min(1)
          .max(100)
          .parse(url.searchParams.get("deckId"));
        if (deleted()) return json({ deleted: true, id: deckId });
        const version = z.coerce
          .number()
          .int()
          .min(0)
          .parse(url.searchParams.get("version"));
        if (!url.searchParams.has("version"))
          throw new AppError("版番号が必要です。");
        const current = await repo.workspace(user, deckId);
        if (current.version !== version)
          throw new AppError(
            "このデッキは更新されています。一覧を再読み込みして確認してください。",
            409,
          );
        sqlite
          .prepare(
            "INSERT OR IGNORE INTO deleted_decks(owner,deck_id,deleted_at) VALUES(?,?,?)",
          )
          .run(user, deckId, new Date().toISOString());
        return json({ deleted: true, id: deckId });
      }
      if (req.method === "POST")
        return json(await repo.create(user, deckSchema.parse(body)), 201);
    }
    if (url.pathname === "/api/deck") {
      if (req.method === "GET") return json(await repo.workspace(user, id));
      if (req.method === "POST") {
        const input = saveSchema.parse(body);
        const deck =
          input.restoreVersion === undefined
            ? input.deck
            : await repo.restoreSnapshot(user, input.restoreVersion, id);
        if (!deck) throw new AppError("スライドが必要です。");
        return json(await repo.save(user, { ...input, deck }, id));
      }
    }
    if(url.pathname==='/api/backgrounds'&&req.method==='GET')return json(['public-blue','public-green','public-orange','public-sunshine','public-hearts',...[1,2,3,4,5,6].map(n=>'bg_'+n)].filter(id=>existsSync(resolve(root,'backgrounds',id+'.png'))));
    if(url.pathname==='/api/templates'){
      if(req.method==='GET')return json(sqlite.prepare('SELECT * FROM templates ORDER BY created_at DESC').all().map((t:any)=>({id:t.id,name:t.name,deck:JSON.parse(t.snapshot)})));
      if(req.method==='POST'){const t=z.object({name:z.string().trim().min(1).max(80),deck:deckSchema}).parse(body);const templateId=crypto.randomUUID();sqlite.prepare('INSERT INTO templates VALUES(?,?,?,?)').run(templateId,t.name,JSON.stringify(t.deck),new Date().toISOString());return json({id:templateId});}
    }
    if (url.pathname === "/api/codex/models" && req.method === "GET") return json(await askCodex("", null, "", [], {listModels:true}));
    if (url.pathname === "/api/codex/status") return json(await codexStatus());
    if (url.pathname === "/api/codex/chat") {
      await repo.workspace(user, id);
      if (req.method === "GET")
        return json(
          sqlite
            .prepare(
              "SELECT role,text,at FROM chat WHERE deck_id=? ORDER BY rowid",
            )
            .all(id),
        );
      if (req.method === "POST") {
        if (generating)
          throw new AppError(
            "AIが処理中です。完了してから再試行してください。",
            409,
          );
        const input = z
          .object({
            prompt: z.string().trim().min(1).max(8000),
            model: z.string().max(100).optional(),
            effort: z.string().max(20).optional(),
            scope:z.object({mode:z.enum(["deck","slide","objects"]),slideId:z.string(),objectIds:z.array(z.string()).max(100)}).optional(),
            selectedSlideId: z.string(),
            version: z.number().int(),
          })
          .parse(body);
        const current = await repo.workspace(user, id);
        if (current.version !== input.version)
          throw new AppError(
            "デッキが更新されています。読み込み直してください。",
            409,
          );
        const controller=new AbortController();const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on("close",cancel);
        generating = true;
        try {
          const history = sqlite
            .prepare(
              "SELECT role,text FROM chat WHERE deck_id=? ORDER BY rowid DESC LIMIT 12",
            )
            .all(id)
            .reverse();
          const result = await askCodex(
            input.prompt,
            current.deck,
            input.selectedSlideId,
            history,
            {model:input.model, effort:input.effort,signal:controller.signal,scope:input.scope},
          );
          let proposal = result.proposalJson
            ? proposalSchema.parse(JSON.parse(result.proposalJson))
            : null;
          if(controller.signal.aborted)throw new AppError("生成を停止しました",499);
          if (proposal){const next=applyProposal(current.deck,proposal);if(input.scope)proposal=proposalSchema.parse({reason:proposal.reason,patches:[],deck:constrainDeck(current.deck,next,input.scope)});}
          const at = new Date().toISOString();
          sqlite
            .prepare("INSERT INTO chat VALUES(?,?,?,?)")
            .run(id, "user", input.prompt, at);
          sqlite
            .prepare("INSERT INTO chat VALUES(?,?,?,?)")
            .run(id, "assistant", result.answer, at);
          return json({
            answer: result.answer,
            proposal,
            version: current.version,
          });
        } finally {
          res.off("close",cancel);generating = false;
        }
      }
    }
    if (url.pathname === "/api/agent") {
      const current = await repo.workspace(user, id);
      if (req.method === "GET") return json(current);
      if (req.method === "POST") {
        const input = z
          .object({
            proposal: proposalSchema,
            version: z.number().int(),
            apply: z.boolean().default(false),
            requestId: z.string().min(1).max(100),
          })
          .parse(body);
        if (input.version !== current.version)
          throw new AppError("版が古くなっています。", 409);
        const deck = applyProposal(current.deck, input.proposal);
        return json(
          input.apply
            ? await repo.save(
                user,
                {
                  deck,
                  version: input.version,
                  requestId: input.requestId,
                  reason: input.proposal.reason,
                  actor: "エージェント",
                },
                id,
              )
            : {
                deck,
                version: current.version,
                changes: diffDeck(current.deck, deck),
              },
        );
      }
    }
    if (url.pathname.startsWith("/api/"))
      return json({ error: "見つかりません。" }, 404);
    if (req.method !== "GET" && req.method !== "HEAD")
      return json({ error: "許可されていない操作です。" }, 405);
    const path = resolve(root, "." + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + "/") && path !== root)
      throw new AppError("見つかりません。", 404);
    const file =
      existsSync(path) && extname(path) ? path : resolve(root, "index.html");
    const mime: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".woff2": "font/woff2",
    };
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(readFileSync(file));
  } catch (e) {
    json(
      {
        error:
          e instanceof AppError
            ? e.message
            : e instanceof z.ZodError
              ? "入力内容の形式を確認してください。"
              : e instanceof Error
                ? e.message
                : "処理に失敗しました。",
      },
      e instanceof AppError ? e.status : 400,
    );
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Agent Slides Studio: http://127.0.0.1:${port}`),
);
