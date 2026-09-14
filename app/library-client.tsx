"use client";
import BrandLogo from "./brand-logo";
import { useEffect, useState, useRef } from "react";
import {
  Plus,
  ArrowUpRight,
  Search,
  Upload,
  Layers,
  Lock,
  Trash2,
} from "lucide-react";
import { initialDeck, deckSchema, type Slide, type Deck } from "@/lib/model";
import "./studio.css";
import "./library.css";
import {SlideThumbnail} from "./studio-client";
type Entry = {
  id: string;
  title: string;
  slideCount: number;
  cover: Slide;
  version: number;
  updatedAt: string;
};
export default function Library() {
  const [entries, setEntries] = useState<Entry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false);
  const [trash,setTrash]=useState<{id:string;title:string;slideCount:number;deletedAt:string}[]>([]),[trashOpen,setTrashOpen]=useState(false),[restoreBusy,setRestoreBusy]=useState(false);
  const backupInput=useRef<HTMLInputElement>(null);
  async function showTrash(){setError('');try{const r=await fetch('/api/trash');if(!r.ok)throw Error('ゴミ箱を読み込めません');setTrash(await r.json() as typeof trash);setTrashOpen(true);}catch(e){setError((e as Error).message);}}
  async function restoreTrash(id:string){setRestoreBusy(true);try{const r=await fetch('/api/trash/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deckId:id})});if(!r.ok)throw Error('復元できません');setTrash(items=>items.filter(x=>x.id!==id));const list=await fetch('/api/decks');setEntries(await list.json() as Entry[]);}catch(e){setError((e as Error).message);}finally{setRestoreBusy(false);}}
  async function restoreBackup(file:File){setRestoreBusy(true);setError('');try{if(file.size>150000000)throw Error('バックアップは150MBまでです');const payload=JSON.parse(await file.text());const r=await fetch('/api/backup/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await r.json() as {id:string;error?:string};if(!r.ok)throw Error(result.error||'復元できません');location.assign('/deck/'+result.id);}catch(e){setError((e as Error).message);setRestoreBusy(false);}}
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false),
    [deleteError, setDeleteError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const deletionLock = useRef(false);
  useEffect(() => {
    if (deleting) {
      dialog.current?.showModal();
      dialog.current
        ?.querySelector<HTMLButtonElement>("[data-cancel-delete]")
        ?.focus();
    } else dialog.current?.close();
  }, [deleting]);
  function closeDelete() {
    if (!deletionLock.current) {
      setDeleting(null);
      setDeleteError("");
    }
  }
  async function removeDeck() {
    if (!deleting || deletionLock.current) return;
    deletionLock.current = true;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const response = await fetch(
        `/api/decks?deckId=${encodeURIComponent(deleting.id)}&version=${deleting.version}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "削除できませんでした。");
      setEntries((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      deletionLock.current = false;
      setDeleteBusy(false);
    }
  }
  const pptxFile=useRef<HTMLInputElement>(null);
  const [importResult,setImportResult]=useState<{id:string;warnings:string[];slideCount:number}|null>(null);
  async function readPptx(f:File){
    if(busy)return;setBusy(true);setError('');setImportResult(null);
    try{
      if(f.size>50*1024*1024)throw Error('PPTXは50MBまでです');
      const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('ファイルを読み込めません'));reader.readAsDataURL(f);});
      const r=await fetch('/api/pptx/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,data})});
      const result=await r.json() as {id:string;warnings:string[];slideCount:number;error?:string};if(!r.ok)throw Error(result.error||'PPTXを取り込めません');setImportResult(result);reload();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const file = useRef<HTMLInputElement>(null);
  const reload = () => {
    fetch("/api/decks")
      .then(async (r) => {
        const data = (await r.json()) as Entry[] & { error?: string };
        if (!r.ok) throw new Error(data.error);
        setEntries(data);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
  }, []);
  async function create(deck: Deck) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deck),
      });
      const data = (await r.json()) as { id: string; error?: string };
      if (!r.ok) throw new Error(data.error);
      location.assign(`/deck/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="library">
      <header className="library-header">
        <BrandLogo/>
        <span>
          <Lock size={13} /> プライベート・ワークスペース
        </span>
      </header>
      <main>
        <div className="library-heading">
          <div>
            <h1>マイスライド</h1>
            <a className="sample-download" href="/samples/getting-started.json" download>練習用サンプルをダウンロード</a>
          </div>
          <button
            className="library-new"
            disabled={busy}
            onClick={() =>
              void create({
                title: "無題のプレゼンテーション",
                slides: [
                  {
                    ...initialDeck.slides[0],
                    id: crypto.randomUUID(),
                    title: "ここから、始めよう。",
                    eyebrow: "NEW PRESENTATION",
                    body: "伝えたいことを、あなたの言葉で。",
                    notes: "",
                    items: [],
                    strokes: [],
                  },
                ],
              })
            }
          >
            <Plus size={18} /> 新しいスライド
          </button>
        </div>
        <input type="file" accept=".json" hidden ref={backupInput} onChange={e=>{if(e.target.files?.[0])void restoreBackup(e.target.files[0]);e.target.value='';}}/>
        <div className="recovery-toolbar"><button disabled={restoreBusy} onClick={()=>backupInput.current?.click()}>履歴込みバックアップから復元</button><button onClick={()=>void showTrash()}>ゴミ箱</button>{restoreBusy&&<span>復元中…</span>}</div>
        {trashOpen&&<section className="trash-panel"><h2>ゴミ箱</h2><p>復元すると、画像と変更履歴も含めてマイスライドに戻ります。</p><button onClick={()=>setTrashOpen(false)}>閉じる</button>{!trash.length&&<p>ゴミ箱は空です。</p>}{trash.map(item=><div key={item.id}><span>{item.title} · {item.slideCount}枚</span><button disabled={restoreBusy} onClick={()=>void restoreTrash(item.id)}>復元する</button></div>)}</section>}
        <div className="library-toolbar">
          <label>
            <Search size={17} />
            <input
              aria-label="スライドを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="タイトルで検索"
            />
          </label>
          <div className="library-import-actions">
          <button disabled={busy} onClick={()=>pptxFile.current?.click()}><Upload size={15}/>{busy?'処理中…':'PowerPointを取り込む'}</button>
          <input ref={pptxFile} type="file" accept=".pptx" aria-label="PowerPointファイル" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void readPptx(f);e.target.value='';}}/>
          <button disabled={busy} onClick={() => file.current?.click()}>
            <Upload size={15} /> JSONから取り込む
          </button>
          <input
            type="file"
            accept=".json"
            hidden
            ref={file}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 2500000)
                  throw new Error("2.5MB以内のJSONを選択してください。");
                const value = JSON.parse(await f.text());
                await create(deckSchema.parse(value.deck || value));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                if (file.current) file.current.value = "";
              }
            }}
          />
          </div>
        </div>
        {importResult&&<section className="pptx-import-result" role="status"><h2>{importResult.slideCount}枚を取り込みました</h2><p>「編集」タブで文字をダブルクリックすると編集できます。要素はドラッグで移動できます。元のPPTXは変更していません。</p>{importResult.warnings.length>0&&<details><summary>変換時の注意点（{importResult.warnings.length}件）</summary><ul>{importResult.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}<a href={'/deck/'+importResult.id}>取り込んだスライドを編集する →</a></section>}
        {error && (
          <div role="alert" className="library-error">
            {error}
            <button onClick={reload}>再読み込み</button>
          </div>
        )}
        {loading ? (
          <p>スライドを読み込んでいます…</p>
        ) : (
          <>
            <p className="library-count">
              {entries.length} 件のプレゼンテーション
            </p>
            <div className="library-grid">
              {entries
                .filter((e) =>
                  e.title
                    .toLocaleLowerCase()
                    .includes(query.toLocaleLowerCase()),
                )
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .map((e) => (
                  <article key={e.id} className="deck-card">
                    <a href={`/deck/${e.id}`} className="deck-open">
                      <div className="library-slide-preview"><SlideThumbnail slide={e.cover} index={0} total={e.slideCount}/></div>
                      <div className="deck-meta">
                        <h2>{e.title}</h2>
                        <p>
                          <Layers size={13} />
                          {e.slideCount}枚{" "}
                          <span>
                            {e.updatedAt
                              ? new Date(e.updatedAt).toLocaleDateString(
                                  "ja-JP",
                                )
                              : "最初のデッキ"}{" "}
                            · v{e.version}
                          </span>
                        </p>
                      </div>
                    </a>
                    <button
                      className="deck-delete"
                      aria-label={`${e.title}を削除（${e.slideCount}枚）`}
                      onClick={() => {
                        setDeleteError("");
                        setDeleting(e);
                      }}
                    >
                      <Trash2 size={15} /> 削除
                    </button>
                  </article>
                ))}
            </div>
            {entries.length > 0 &&
              !entries.some((e) =>
                e.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
              ) && <p>該当するスライドがありません。</p>}
          </>
        )}
        <p className="library-footnote">
          編集内容と意思決定ログは、デッキごとに保存されます。
        </p>
      </main>
      <dialog
        className="delete-dialog"
        ref={dialog}
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        onCancel={(e) => {
          e.preventDefault();
          closeDelete();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            )
              closeDelete();
          }
        }}
      >
        <div className="delete-dialog-icon">
          <Trash2 size={23} />
        </div>
        <h2 id="delete-title">スライドを削除しますか？</h2>
        <p id="delete-description">
          このデッキをマイスライドの一覧から削除します。
        </p>
        <div className="delete-deck-summary">
          <strong>{deleting?.title}</strong>
          <span>{deleting?.slideCount}枚のスライド</span>
        </div>
        {deleteError && (
          <p className="delete-error" role="alert">
            {deleteError}
          </p>
        )}
        <div className="delete-actions">
          <button
            className="confirm-delete"
            disabled={deleteBusy}
            onClick={() => void removeDeck()}
          >
            {deleteBusy ? "削除中…" : "削除する"}
          </button>
          <button
            data-cancel-delete
            autoFocus
            disabled={deleteBusy}
            onClick={closeDelete}
          >
            削除しない
          </button>
        </div>
      </dialog>
    </div>
  );
}
