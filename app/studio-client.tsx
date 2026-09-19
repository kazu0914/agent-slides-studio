"use client";
import {useRangeSelection,emptySelection,type CanvasSelection} from './use-range-selection';
import {usePresentationRecords} from './use-presentation-records';
import {alignSelection,type Alignment} from './align-selection';
import {DragGuides} from './drag-guides';
import CardHandles from "./card-handles";
import BrandLogo from "./brand-logo";
import SlideGrid from "./slide-grid";
import SortableSlides from "./sortable-slides";
import {useBackgrounds,backgroundLabels,defaultBackground} from "./use-backgrounds";
import {FreeObjects,textCss} from "./free-objects";
import {ObjectPanel,TextStyleControls,uploadImage} from "./object-panel";
import {makeObject,objectSchema,type SlideObject} from "@/lib/objects";
import {layoutPatterns, hasLayoutItems, defaultLayoutItems} from "@/lib/layouts";
import { MotionArt, motionPresets } from "./motion-art";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Play,
  Pause,
  Plus,
  Sparkles,
  History,
  PanelLeft,
  PanelRight,
  LayoutGrid,
  Lock,
  MousePointer2,
  Type,
  Highlighter,
  Undo2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Download,
  Upload,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  RotateCcw,
  Code2,
  Loader2,
  ArrowUpRight,
  Maximize2,
} from "lucide-react";
import {
  initialDeck,
  deckSchema,
  slideSchema,
  diffDeck,
  applyProposal,
  proposalSchema,
  type Deck,
  type Slide,
  type Workspace,
  type Stroke,
  type Proposal,
} from "@/lib/model";
import "./studio.css";
import {
  ElementControls,
  defaultPlacement,
  elementLabels,
  type ElementKey,
  type ElementPlacement,
} from "./element-controls";
import { usePresentationZoom } from "./use-presentation-zoom";
import { CanvasText } from "./canvas-text";
const pad = (n: number) => String(n).padStart(2, "0");
const themes = { blue: "ブルー", white: "ホワイト", dark: "ダーク" };
const animations = { orbit: "オービット", reveal: "順番に表示", none: "なし" };
function download(name: string, data: unknown) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = (await response.json()) as Workspace & { error?: string };
  if (!response.ok) throw new Error(data.error || "接続に失敗しました");
  return data;
}
function BaseSelectionOutline({host,elementKey,slide}:{host:React.RefObject<HTMLDivElement|null>;elementKey:ElementKey;slide:Slide}){
 const [box,setBox]=useState<{x:number;y:number;w:number;h:number}|null>(null);
 useLayoutEffect(()=>{const root=host.current,el=root?.querySelector(`[data-edit-element="${elementKey}"]`);if(!root||!el)return;const a=root.getBoundingClientRect(),b=el.getBoundingClientRect();setBox({x:(b.left-a.left)/a.width*100,y:(b.top-a.top)/a.height*100,w:b.width/a.width*100,h:b.height/a.height*100});},[host,elementKey,slide]);
 return box?<div className="canvas-base-selected" style={{left:`${box.x}%`,top:`${box.y}%`,width:`${box.w}%`,height:`${box.h}%`}}/>:null;
}
export function SlideView({
  slide:sourceSlide,
  index,
  total,
  animate = true,
  marker = false,
  color = "yellow",
  penWidth = 18,
  onDraw,
  editable = false,
  editing = false,
  onEdit,
  onActivate,
  layoutEditing = false,
  selectedElement = "artwork",
  onSelectElement,
  onPlacement,
  onGesture,
  objectSelection=[],onObjectSelection,onObjects,revealStep=Infinity,
  cardSelection=[],onCardSelection=()=>{},
  baseSelection=[],rangeEnabled=false,onCanvasSelection=()=>{},onSelectionEdit,
}: {
  revealStep?:number;
  baseSelection?:ElementKey[];rangeEnabled?:boolean;onCanvasSelection?:(s:CanvasSelection)=>void;onSelectionEdit?:(patch:Partial<Slide>)=>void;
  cardSelection?:number[];onCardSelection?:(ids:number[])=>void;
  objectSelection?:string[];onObjectSelection?:(ids:string[])=>void;onObjects?:(objects:SlideObject[])=>void;
  slide: Slide;
  index: number;
  total: number;
  animate?: boolean;
  marker?: boolean;
  color?: Stroke["color"];
  penWidth?: number;
  onDraw?: (stroke: Stroke) => void;
  editable?: boolean;
  editing?: boolean;
  onEdit?: (
    field: "title" | "body" | "eyebrow" | "items" | "artworkKind",
    value: string | Slide["items"],
  ) => void;
  onActivate?: () => void;
  layoutEditing?: boolean;
  selectedElement?: ElementKey;
  onSelectElement?: (key: ElementKey) => void;
  onPlacement?: (key: ElementKey, value: ElementPlacement) => void;
  onGesture?: () => void;
}) {
  const slideRoot = useRef<HTMLDivElement>(null);
  const rangeSelection=useRangeSelection(slideRoot,sourceSlide,rangeEnabled&&editable,{cards:cardSelection,objects:objectSelection,elements:baseSelection},onCanvasSelection,onSelectionEdit);
  const slide=rangeSelection.preview?{...sourceSlide,...rangeSelection.preview}:sourceSlide;
  const artworkKind = slide.layout === "image-right" ? "none" :
    slide.artworkKind ??
    (slide.layout === "hero"
      ? "orbit"
      : slide.layout === "statement"
        ? "arrow"
        : "none");
  const setCardSelection=onCardSelection;
  const [points, setPoints] = useState<[number, number][]>([]);
  const active = useRef<[number, number][] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  function position(e: React.PointerEvent<SVGSVGElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1600, ((e.clientX - r.left) / r.width) * 1600)),
      Math.max(0, Math.min(900, ((e.clientY - r.top) / r.height) * 900)),
    ];
  }
  function finish() {
    const line = active.current;
    active.current = null;
    setPoints([]);
    if (line && line.length > 1)
      onDraw?.({ id: crypto.randomUUID(), color, width: penWidth, points: line });
  }
  return (
    <div
      ref={slideRoot}
      {...rangeSelection.handlers}
      tabIndex={rangeEnabled?0:undefined}
      data-range-enabled={rangeEnabled?"true":undefined}
      style={
        {
          ...Object.fromEntries(
            Object.entries(slide.placements || {}).flatMap(([key, value]) =>
              value
                ? [
                    [`--${key}-x`, `${value.x}cqw`],
                    [`--${key}-y`, `${value.y * 0.5625}cqw`],
                    [`--${key}-size`, value.scale],
                    ...(value.width ? [[`--${key}-width`, `${value.width}cqw`]] : []),
                    ...(value.height ? [[`--${key}-height`, `${value.height * .5625}cqw`]] : []),
                    [`--${key}-rotation`, `${value.rotation || 0}deg`],
                    [`--${key}-opacity`, value.opacity],
                  ]
                : [],
            ),
          ),
          ...Object.fromEntries(['title','body','eyebrow','items','artwork'].map(k=>[`--reveal-${k}`,(slide.revealSteps?.[k as 'title']||0)>revealStep?'hidden':'visible'])),
          backgroundColor: slide.backgroundColor,
          backgroundImage: slide.backgroundTemplate && slide.backgroundTemplate !== "none" ? `url(/backgrounds/${slide.backgroundTemplate}.png)` : undefined,
          backgroundSize: "100% 100%",
          "--custom-art-color": slide.artworkColor,
          "--art-color": slide.artworkColor || (slide.theme === "white" || (slide.backgroundTemplate && slide.backgroundTemplate !== "none") ? "#2454ef" : "#a6dfff"),
          "--orbit-duration": `${slide.animationDuration || 38}s`,
          "--title-scale": Math.min(
            1,
            Math.sqrt(24 / Math.max(slide.title.length, 1)),
          ),
          "--body-scale": Math.min(
            1,
            Math.sqrt(120 / Math.max(slide.body.length, 1)),
          ),
        } as CSSProperties
      }
      className={`slide ${slide.imported ? "imported-slide" : ""} theme-${slide.backgroundTemplate === "public-midnight" ? "dark" : slide.backgroundTemplate && slide.backgroundTemplate !== "none" ? "white" : slide.theme} layout-${slide.layout} ${!slide.backgroundTemplate || slide.backgroundTemplate === "none" ? (slide.theme !== "white" ? "hero-slide" : "") : ""} ${"motion-" + slide.animation} ${animate ? "" : "motion-paused"} ${editing ? "editing-slide" : ""}`}
      data-testid="slide-canvas"
    >
      {slide.layout==='image-right'&&<div className="side-image-panel">{slide.sideImage?<img src={slide.sideImage.src} alt="" style={{objectPosition:`${slide.sideImage.position}% 50%`}}/>:<div className="side-image-placeholder"><span>IMAGE</span><small>右画像・70/30</small></div>}</div>}
      <DragGuides guides={rangeSelection.guides}/>
      <CanvasText
        as="div"
        className="slide-eyebrow"
        label="スライドのラベル"
        elementKey="eyebrow"
        style={textCss(slide.textStyles?.eyebrow)}
        value={slide.eyebrow}
        limit={80}
        editable={editable}
        onActivate={onActivate}
        onChange={(value) => onEdit?.("eyebrow", value)}
      />
      <div className="hero-copy">
        <CanvasText
          as="h2"
          label="スライドのタイトル"
          elementKey="title"
          style={textCss(slide.textStyles?.title)}
          value={slide.title}
          limit={90}
          editable={editable}
          onActivate={onActivate}
          onChange={(value) => onEdit?.("title", value)}
        />
        <CanvasText
          as="p"
          label="スライドの本文"
          elementKey="body"
          style={textCss(slide.textStyles?.body)}
          value={slide.body}
          limit={600}
          editable={editable}
          onActivate={onActivate}
          onChange={(value) => onEdit?.("body", value)}
        />
      </div>
      {artworkKind === "orbit" && (
        <div className="artwork-position" data-edit-element="artwork">
          <div className="orbit-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="orbit-dot" />
            <div className="orbit-core">
              F<span>FRAME</span>
            </div>
          </div>
        </div>
      )}
      {!["none", "orbit", "arrow"].includes(artworkKind) && <div className="artwork-position" data-edit-element="artwork"><MotionArt kind={artworkKind}/></div>}
      {artworkKind === "arrow" && (
        <div
          className="statement-arrow"
          data-edit-element="artwork"
          aria-hidden="true"
        >
          <MotionArt kind="arrow" strokeWidth={slide.arrowWidth??6}/>
        </div>
      )}
      {hasLayoutItems(slide.layout) && (
        <div
          data-edit-element="items"
          className={`slide-items ${slide.layout === "flow" ? "flow-items" : ""}`}
        >
          {slide.items.map((item, i) => (
            <div
              className={`slide-item ${editable&&cardSelection.includes(i)?'card-selected':''}`}
              onPointerDownCapture={e=>{if(editable&&(e.shiftKey||e.metaKey||e.ctrlKey)&&!(e.target as HTMLElement).closest('button')){e.preventDefault();e.stopPropagation();setCardSelection(cardSelection.includes(i)?cardSelection.filter(id=>id!==i):[...cardSelection,i]);}}}
              key={i}
              data-card-index={i}
              style={{ animationDelay: `${i * 0.25 + 0.15}s`,...(item.box?{position:'absolute',left:`${item.box.x}%`,top:`${item.box.y}%`,width:`${item.box.w}%`,height:`${item.box.h}%`,boxSizing:'border-box'}:{}) }}
            >
              {editable&&onEdit&&<CardHandles index={i} selected={cardSelection} onSelect={setCardSelection} items={slide.items} onChange={items=>onEdit('items',items)} onBegin={()=>{onActivate?.();onGesture?.();}}/>}
              <span>{pad(i + 1)}</span>
              <CanvasText
                as="h3"
                label={`項目 ${i + 1} の見出し`}
                style={textCss(slide.textStyles?.items)}
                value={item.title}
                limit={60}
                editable={editable}
                onActivate={onActivate}
                onChange={(value) =>
                  onEdit?.(
                    "items",
                    slide.items.map((x, j) =>
                      j === i ? { ...x, title: value } : x,
                    ),
                  )
                }
              />
              <CanvasText
                as="p"
                label={`項目 ${i + 1} の本文`}
                style={textCss(slide.textStyles?.items)}
                value={item.body}
                limit={180}
                editable={editable}
                onActivate={onActivate}
                onChange={(value) =>
                  onEdit?.(
                    "items",
                    slide.items.map((x, j) =>
                      j === i ? { ...x, body: value } : x,
                    ),
                  )
                }
              />
              {slide.layout === "flow" && i < slide.items.length - 1 && (
                <b>→</b>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="slide-footer">
        <span />
        <span>
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>
      {(layoutEditing || editable) && onPlacement && onSelectElement && (
        <ElementControls
          key={artworkKind}
          host={slideRoot}
          onlyKey={layoutEditing ? undefined : "direct"}
          onDelete={onEdit ? () => onEdit("artworkKind", "none") : undefined}
          selected={selectedElement}
          onSelect={onSelectElement}
          placements={slide.placements || {}}
          onChange={onPlacement}
          onBegin={() => onGesture?.()}
        />
      )}
      <FreeObjects linksActive={!editing&&!editable&&!marker} objects={(slide.objects||[]).filter(o=>(o.appearAt||0)<=revealStep)} editable={(editing || editable) && !marker && !!onObjects} selected={objectSelection} onSelect={onObjectSelection} onChange={onObjects} onBegin={onGesture}/>
      {!marker&&baseSelection.map(key=><BaseSelectionOutline key={key} host={slideRoot} elementKey={key} slide={slide}/>)}
      {rangeSelection.range&&<div className="canvas-range-selection" data-testid="range-selection" style={{left:`${rangeSelection.range.x}%`,top:`${rangeSelection.range.y}%`,width:`${rangeSelection.range.w}%`,height:`${rangeSelection.range.h}%`}}/>}
      <svg
        ref={svg}
        className={`ink-layer ${marker ? "drawing" : ""}`}
        viewBox="0 0 1600 900"
        aria-label="マーカー描画面"
        style={{ pointerEvents: marker ? "auto" : "none" }}
        onPointerDown={(e) => {
          if (!marker) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          active.current = [position(e)];
          setPoints(active.current);
        }}
        onPointerMove={(e) => {
          if (!active.current || active.current.length >= 2400) return;
          active.current = [...active.current, position(e)];
          setPoints(active.current);
        }}
        onPointerUp={finish}
        onPointerCancel={() => {
          active.current = null;
          setPoints([]);
        }}
      >
        {slide.strokes.map((s) => (
          <polyline
            key={s.id}
            points={s.points.map((p) => p.join(",")).join(" ")}
            className={`ink ink-${s.color}`}
            style={{strokeWidth:s.width ?? 18}}
          />
        ))}
        {points.length > 1 && (
          <polyline
            points={points.map((p) => p.join(",")).join(" ")}
            className={`ink ink-${color}`}
            style={{strokeWidth:penWidth}}
          />
        )}
      </svg>
    </div>
  );
}
function PanelResize({
  side,
  width,
  onResize,
}: {
  side: "left" | "right";
  width: number;
  onResize: (width: number) => void;
}) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  return (
    <div
      className={`panel-resize resize-${side}`}
      role="separator"
      aria-label={
        side === "left" ? "スライド一覧の幅" : "エージェントパネルの幅"
      }
      aria-orientation="vertical"
      aria-valuemin={side === "left" ? 150 : 260}
      aria-valuemax={side === "left" ? 340 : 560}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, width };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (drag.current)
          onResize(
            drag.current.width +
              (e.clientX - drag.current.x) * (side === "left" ? 1 : -1),
          );
      }}
      onPointerUp={(e) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          onResize(
            width +
              (e.key === "ArrowRight" ? 16 : -16) * (side === "left" ? 1 : -1),
          );
        }
      }}
      onDoubleClick={() => onResize(side === "left" ? 226 : 302)}
    >
      <span />
    </div>
  );
}
import {nextStep,previousStep,steps} from '@/lib/presentation';
import type {PresenterState} from './presenter';
import DeckTools from './deck-tools';
import ReviewPanel from './review-panel';
import {constrainDeck,type Scope} from '@/lib/review';
export function SlideThumbnail({slide,index,total}:{slide:Slide;index:number;total:number}) {
  const host=useRef<HTMLDivElement>(null);
  const [scale,setScale]=useState(0);
  useEffect(()=>{const el=host.current;if(!el)return;const measure=()=>setScale(el.clientWidth/1600);measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[]);
  return <div ref={host} className="slide-thumbnail" aria-hidden="true"><div className="slide-thumbnail-content" style={{transform:`scale(${scale})`}}><SlideView slide={slide} index={index} total={total} animate={false}/></div></div>;
}
export default function Home({ deckId = "legacy" }: { deckId?: string }) {
  const [slidesCollapsed,setSlidesCollapsed]=useState(false);
  const [rightCollapsed,setRightCollapsed]=useState(false);
  const rightCloseButton=useRef<HTMLButtonElement>(null),rightOpenButton=useRef<HTMLButtonElement>(null);
  const rightTogglePending=useRef(false);
  useEffect(()=>{if(rightTogglePending.current){(rightCollapsed?rightOpenButton:rightCloseButton).current?.focus();rightTogglePending.current=false;}},[rightCollapsed]);
  function toggleRightPanel(collapsed:boolean){rightTogglePending.current=true;setRightCollapsed(collapsed);}
  const [gridOpen,setGridOpen]=useState(false);
  const backgrounds=useBackgrounds();
  const [panelWidths, setPanelWidths] = useState({ left: 226, right: 302 });
  const [frameSize, setFrameSize] = useState(100);
  const [showEditGuides,setShowEditGuides]=useState(true);
  useEffect(()=>{setShowEditGuides(localStorage.getItem("agent-slides-edit-guides")!=="hidden");},[]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("frame-panel-widths") || "null",
      );
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.right))
        setPanelWidths({
          left: Math.max(150, Math.min(340, saved.left)),
          right: Math.max(260, Math.min(560, saved.right)),
        });
    } catch {}
  }, []);
  function resizePanel(side: "left" | "right", value: number) {
    setPanelWidths((current) => {
      const next = {
        ...current,
        [side]: Math.round(
          Math.max(
            side === "left" ? 150 : 260,
            Math.min(side === "left" ? 340 : 560, value),
          ),
        ),
      };
      localStorage.setItem("frame-panel-widths", JSON.stringify(next));
      return next;
    });
  }
  const [objectSelection,setObjectSelection]=useState<string[]>([]);
  const [cardSelection,setCardSelection]=useState<number[]>([]);
  const [baseSelection,setBaseSelection]=useState<ElementKey[]>([]);
  const [selectionTool,setSelectionTool]=useState(true);
  const selectCanvas=(value:CanvasSelection)=>{setCardSelection(value.cards);setObjectSelection(value.objects);setBaseSelection(value.elements);};
  const [styleTarget,setStyleTarget]=useState<"title"|"body"|"eyebrow"|"items">("title");
  const [objectBusy,setObjectBusy]=useState(false);
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementKey>("artwork");
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const undoDrafts = useRef<Record<string, Slide>[]>([]),
    redoDrafts = useRef<Record<string, Slide>[]>([]);
  const undoDecks = useRef<Deck[]>([]),
    redoDecks = useRef<Deck[]>([]);
  const historyAction = useRef(false),
    lastDraftEdit = useRef({ key: "", at: 0 });
  const [historyTick, setHistoryTick] = useState(0);
  const recoveryKey = `frame-draft-v1:${deckId}`;
  const deckUrl = `/api/deck?deckId=${encodeURIComponent(deckId)}`;
  const presentationRecords=usePresentationRecords(deckId);
  const [memoOpen,setMemoOpen]=useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  useEffect(() => {
    // ブラウザに保存した表示設定を初回マウント時に同期する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotesOpen(localStorage.getItem("frame-notes-open") !== "false");
  }, []);
  const [work, setWork] = useState<Workspace>({
    deck: initialDeck,
    version: 0,
    logs: [],
  });
  const workRef = useRef(work);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<"agent" | "edit" | "log">("agent");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterLog, setFilterLog] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Slide>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const draftBases = useRef<Record<string, Slide>>({});
  const savingDraftId = useRef<string | null>(null);
  const pendingBase = useRef<Deck | null>(null);
  const [draftError, setDraftError] = useState("");
  const [autosaveError,setAutosaveError]=useState("");
  const [presentAfterSave,setPresentAfterSave]=useState(false);
  const [prompt, setPrompt] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [aiScope,setAiScope]=useState<Scope['mode']>('deck');
  const aiAbort=useRef<AbortController|null>(null);
  const [proposalVersion, setProposalVersion] = useState(0);
  const [agentError, setAgentError] = useState("");
  const [agentMode, setAgentMode] = useState<"quick" | "json" | "ai">("quick");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>(
    [],
  );
  const [connection,setConnection]=useState({state:'checking',message:'Codexの接続を確認しています…'});
  const checkConnection=useCallback(async()=>{
    setConnection({state:'checking',message:'Codexの接続を確認しています…'});
    try{const r=await fetch('/api/codex/status');if(!r.ok)throw Error();const data=await r.json() as {available:boolean;state:string;message:string;resetsAt?:number};setAiAvailable(data.available);setConnection({state:data.state,message:data.message+(data.resetsAt?' 再開予定: '+new Date(data.resetsAt*1000).toLocaleString('ja-JP'):'')});if(data.available)setAgentMode('ai');else setAgentMode('quick');}catch{setAiAvailable(false);setConnection({state:'connection_error',message:'接続確認に失敗しました。アプリの起動状態を確認してください。'});}
  },[]);
  useEffect(()=>{void checkConnection();fetch(`/api/codex/chat?deckId=${encodeURIComponent(deckId)}`).then(async r=>{if(r.ok)setMessages(await r.json() as {role:string;text:string}[]);}).catch(()=>{});},[deckId,checkConnection]);
  const [modelCatalog, setModelCatalog] = useState<{model:string;displayName:string;isDefault:boolean;defaultReasoningEffort:string;supportedReasoningEfforts:{reasoningEffort:string}[]}[]>([]);
  const [aiModel,setAiModel] = useState("");
  const [aiEffort,setAiEffort] = useState("");
  const [webSearch,setWebSearch] = useState(false);
  const [modelError,setModelError] = useState("");
  useEffect(()=>{if(!aiAvailable||connection.state!=='ready')return;setModelError('');fetch("/api/codex/models").then(async r=>{if(!r.ok)throw Error("モデル一覧を取得できません");return r.json();}).then(result=>{
    const models=(result as {data: typeof modelCatalog}).data;setModelCatalog(models);
    const saved=JSON.parse(localStorage.getItem("agent-slides-model")||"null");
    const selected=models.find((m:{model:string})=>m.model===saved?.model)||models.find((m:{isDefault:boolean})=>m.isDefault)||models[0];
    if(selected){setAiModel(selected.model);setAiEffort(selected.supportedReasoningEfforts.some((e:{reasoningEffort:string})=>e.reasoningEffort===saved?.effort)?saved.effort:selected.defaultReasoningEffort);}
  }).catch(e=>setModelError(e.message));},[aiAvailable,connection.state]);
  useEffect(()=>{if(aiModel)localStorage.setItem("agent-slides-model",JSON.stringify({model:aiModel,effort:aiEffort}));},[aiModel,aiEffort]);
  async function askAI() {
    if (aiBusy || !aiAvailable || !prompt.trim()) return;
    if (Object.keys(drafts).length) {
      setAgentError(
        "直接編集の変更を保存または取り消してから、AIに指示してください。",
      );
      return;
    }
    const text = prompt;
    const controller=new AbortController();aiAbort.current=controller;
    setAiBusy(true);
    setAgentError("");
    setProposal(null);
    try {
      const r = await fetch(
        `/api/codex/chat?deckId=${encodeURIComponent(deckId)}`,
        {
          signal:controller.signal,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            webSearch,
            scope:{mode:aiScope,slideId:slide.id,objectIds:objectSelection},
            ...(aiModel ? {model:aiModel,effort:aiEffort || undefined}:{}),
            version: work.version,
            selectedSlideId: slide.id,
          }),
        },
      );
      const result = (await r.json()) as {
        answer: string;
        proposal: Proposal | null;
        version: number;
        error?: string;
      };
      if (!r.ok) throw new Error(result.error);
      setMessages((m) => [
        ...m,
        { role: "user", text },
        { role: "assistant", text: result.answer },
      ]);
      setPrompt("");
      if (result.proposal) {
        if (result.version !== workRef.current.version)
          throw new Error(
            "生成中にスライドが更新されました。AIへの指示を再送してください。",
          );
        stage(result.proposal, {mode:"deck",slideId:"",objectIds:[]});
      }
    } catch (e) {
      setAgentError(controller.signal.aborted?"生成を停止しました。":(e as Error).message);
    } finally {
      aiAbort.current=null;setAiBusy(false);
    }
  }
  const [present, setPresent] = useState(false);
  const [revealStep,setRevealStep]=useState(0);
  const [started,setStarted]=useState(Date.now());
  const presenterToken=useRef(crypto.randomUUID());
  const presenterChannel=useRef<BroadcastChannel|null>(null);
  const presenterWindow=useRef<Window|null>(null);
  const presenterState=useRef<PresenterState|null>(null);
  const presenterActions=useRef<(type:string,slideId?:string,memo?:string)=>void>(()=>{});
  useEffect(()=>{setRevealStep(0);},[selected,present]);
  useEffect(()=>{const c=new BroadcastChannel('studio-presenter:'+presenterToken.current);presenterChannel.current=c;c.onmessage=e=>{if(e.data.type==='ready'){if(presenterState.current)c.postMessage({type:'state',state:presenterState.current});}else presenterActions.current(e.data.type,e.data.slideId,e.data.memo);};return()=>c.close();},[]);
  const [controlsVisible, setControlsVisible] = useState(true);
  const presentationViewport = useRef<HTMLDivElement>(null);
  const presentationZoom = usePresentationZoom(
    presentationViewport,
    present,
    work.deck.slides[selected]?.id || "",
  );
  useEffect(() => {
    if (!present) return;
    const toggle = (e: KeyboardEvent) => {
      if((e.target as HTMLElement).closest("input,textarea,select,[contenteditable]"))return;
      if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setControlsVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, [present]);
  const [marker, setMarker] = useState(false);
  const [color, setColor] = useState<Stroke["color"]>("yellow");
  const [penWidth, setPenWidth] = useState(18);
  const [sessionInk, setSessionInk] = useState<Record<string, Stroke[]>>({});
  useEffect(() => { if (!present) setSessionInk({}); }, [present]);
  const [playing, setPlaying] = useState(true);
  const [replay, setReplay] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [deckName, setDeckName] = useState("");
  const importInput = useRef<HTMLInputElement>(null);
  const pending = useRef<Record<string, unknown> | null>(null);
  const busy = useRef(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const slide =
    work.deck.slides[Math.min(selected, work.deck.slides.length - 1)];
  const draft = drafts[slide.id] ?? slide;
  const reason = reasons[slide.id] ?? "";
  useEffect(()=>selectCanvas(emptySelection()),[slide.id,draft.items.length]);
  function setReason(value: string) {
    setReasons((r) => ({ ...r, [slide.id]: value }));
  }
  const locked = saving || !loaded || !recoveryReady || !!pending.current;
  function setWorkspace(next: Workspace) {
    setProposal(null);
    workRef.current = next;
    setWork(next);
    setSelected((i) => Math.min(i, next.deck.slides.length - 1));
  }
  const reload = useCallback(async () => {
    try {
      setError("");
      const next = await request(deckUrl);
      pending.current = null;
      setWorkspace(next);
      setLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [deckUrl]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    if (!loaded || recoveryReady) return;
    try {
      const raw = localStorage.getItem(recoveryKey);
      if (raw) {
        const cached = JSON.parse(raw);
        const restored: Record<string, Slide> = {},
          bases: Record<string, Slide> = {};
        for (const [id, value] of Object.entries(cached.drafts || {})) {
          const parsed = deckSchema.parse({ title: "復旧", slides: [value] })
            .slides[0];
          if (workRef.current.deck.slides.some((s) => s.id === id)) {
            restored[id] = parsed;
            bases[id] = deckSchema.parse({
              title: "復旧",
              slides: [cached.bases?.[id] || parsed],
            }).slides[0];
          }
        }
        if (
          cached.pending &&
          !workRef.current.logs.some(
            (log) => log.id === cached.pending.requestId,
          )
        ) {
          const recoveredDeck = deckSchema.parse(cached.pending.deck);
          if (
            typeof cached.pending.requestId !== "string" ||
            !Number.isInteger(cached.pending.version)
          )
            throw new Error("保存待ちデータの形式が不正です。");
          pending.current = { ...cached.pending, deck: recoveredDeck };
          pendingBase.current = cached.pendingBase
            ? deckSchema.parse(cached.pendingBase)
            : null;
          savingDraftId.current = cached.savingDraftId || null;
          setWorkspace({ ...workRef.current, deck: recoveredDeck });
          setError(
            "前回完了しなかった保存を復旧しました。再試行、またはJSONで退避してください。",
          );
        }
        setDrafts(restored);
        draftBases.current = bases;
        setReasons(
          Object.fromEntries(
            Object.entries(cached.reasons || {})
              .filter(([, value]) => typeof value === "string")
              .map(([key, value]) => [key, (value as string).slice(0, 1000)]),
          ),
        );
        if (Object.keys(restored).length)
          setRecoveryNotice(
            "未保存の下書きを復旧しました。内容を確認して保存してください。",
          );
      }
    } catch {
      setRecoveryNotice(
        "下書きを読み込めませんでした。保存済みスライドを表示しています。",
      );
    }
    setRecoveryReady(true);
  }, [loaded, recoveryReady, recoveryKey]);
  useEffect(() => {
    if (!recoveryReady) return;
    try {
      localStorage.setItem(
        recoveryKey,
        JSON.stringify({
          drafts,
          bases: draftBases.current,
          reasons,
          pending: pending.current,
          pendingBase: pendingBase.current,
          savingDraftId: savingDraftId.current,
          at: new Date().toISOString(),
        }),
      );
    } catch {
      setRecoveryNotice(
        "下書きの自動保存に失敗しました。JSONで書き出してください。",
      );
    }
  }, [drafts, reasons, recoveryReady, recoveryKey, work, saving]);
  function recordDraft(key: string, force = false) {
    const now = Date.now();
    if (
      force ||
      lastDraftEdit.current.key !== key ||
      now - lastDraftEdit.current.at > 700
    ) {
      undoDrafts.current.push(structuredClone(drafts));
      undoDrafts.current = undoDrafts.current.slice(-80);
    }
    lastDraftEdit.current = { key, at: now };
    redoDrafts.current = [];
    redoDecks.current = [];
    setHistoryTick((t) => t + 1);
  }
  async function undoRedo(redo = false) {
    if (locked) return;
    const source = redo ? redoDrafts.current : undoDrafts.current,
      target = redo ? undoDrafts.current : redoDrafts.current;
    if (source.length) {
      target.push(structuredClone(drafts));
      setDrafts(source.pop()!);
      lastDraftEdit.current = { key: "", at: 0 };
      setHistoryTick((t) => t + 1);
      return;
    }
    if (Object.keys(drafts).length) {
      setDraftError(
        "未保存の編集を保存または取り消してから、保存済み操作を戻してください。",
      );
      return;
    }
    const from = redo ? redoDecks.current : undoDecks.current,
      to = redo ? undoDecks.current : redoDecks.current;
    if (!from.length) return;
    const previous = structuredClone(workRef.current.deck);
    historyAction.current = true;
    try {
      await commit(
        from[from.length - 1],
        redo ? "操作をやり直し" : "直前の操作を取り消し",
      );
      from.pop();
      to.push(previous);
      setHistoryTick((t) => t + 1);
    } catch {
    } finally {
      historyAction.current = false;
    }
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if(document.querySelector('[aria-modal="true"]:not(.presentation)'))return;
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const el = e.target as HTMLElement;
      if (el.closest("input,textarea,[contenteditable]")) return;
      e.preventDefault();
      void undoRedo(e.shiftKey);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const commit = useCallback(
    async (
      deck: Deck,
      why: string,
      actor = "手動編集",
      restoreVersion?: number,
    ) => {
      if (busy.current || pending.current)
        throw new Error("保存中、または未保存の変更があります。");
      const current = workRef.current;
      deckSchema.parse(deck);
      if (!why.trim()) throw new Error("変更理由を入力してください。");
      if (!diffDeck(current.deck, deck).length) return current;
      const payload = {
        deck,
        version: current.version,
        requestId: crypto.randomUUID(),
        reason: why,
        actor,
        ...(restoreVersion !== undefined ? { restoreVersion } : {}),
      };
      pendingBase.current = structuredClone(current.deck);
      pending.current = payload;
      busy.current = true;
      setSaving(true);
      setError("");
      setProposal(null);
      setWorkspace({ ...current, deck });
      try {
        const next = await request(deckUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        pending.current = null;
        if (!historyAction.current) {
          undoDecks.current.push(structuredClone(current.deck));
          undoDecks.current = undoDecks.current.slice(-80);
          redoDecks.current = [];
        }
        undoDrafts.current = [];
        redoDrafts.current = [];
        setHistoryTick((t) => t + 1);
        setWorkspace(next);
        return next;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        busy.current = false;
        setSaving(false);
      }
    },
    [deckUrl],
  );
  function fire(deck: Deck, why: string, actor = "手動編集") {
    void commit(deck, why, actor).catch(() => {});
  }
  async function retry() {
    if (!pending.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const next = await request(deckUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      pending.current = null;
      if (pendingBase.current) {
        undoDecks.current.push(pendingBase.current);
        undoDecks.current = undoDecks.current.slice(-80);
        redoDecks.current = [];
        pendingBase.current = null;
      }
      undoDrafts.current = [];
      redoDrafts.current = [];
      setHistoryTick((t) => t + 1);
      setError("");
      setAutosaveError("");
      setWorkspace(next);
      const id = savingDraftId.current;
      if (id) {
        setDrafts((d) => {
          const remaining = { ...d };
          delete remaining[id];
          return remaining;
        });
        delete draftBases.current[id];
        setReasons((r) => {
          const remaining = { ...r };
          delete remaining[id];
          return remaining;
        });
        savingDraftId.current = null;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (pending.current || Object.keys(drafts).length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [drafts]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(document.querySelector('[aria-modal="true"]:not(.presentation)'))return;
      if (
        (e.target as HTMLElement).closest(
          present ? "input,textarea,select,[contenteditable=true],[contenteditable=plaintext-only]" : "input,textarea,select,[data-free-object],[contenteditable=true],[contenteditable=plaintext-only]",
        )
      )
        return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        if(present)advancePresentation();else setSelected((i)=>Math.min(i+1,workRef.current.deck.slides.length-1));
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        if(present)backPresentation();else setSelected((i)=>Math.max(0,i-1));
      }
      if (e.key === "Escape") {
        setPresent(false);
        setMarker(false);
      }
      if (e.key.toLowerCase() === "m") {
        setMarker((m) => !m);
        setTab("agent");
      }
      if (e.key === " " && present) {
        e.preventDefault();
        advancePresentation();
      }
      if(e.key.toLowerCase()==="p"&&present)setPlaying(p=>!p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present,selected,revealStep,work.deck]);
  useEffect(() => {
    const onFull = () => {
      if (!document.fullscreenElement) {
        setPresent(false);
        setMarker(false);
      }
    };
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);
  async function insertImage(file:File,replaceId?:string){
    if(locked||objectBusy)return;if(!replaceId&&(draft.objects?.length||0)>=100){setDraftError("1枚に100要素までです");return;}const targetId=slide.id;setObjectBusy(true);setDraftError("");
    try{const src=await uploadImage(file);const obj={...makeObject('shape'),kind:'image' as const,name:file.name||'貼り付け画像',src};recordDraft('image-insert',true);setDrafts(d=>{const current=d[targetId]||workRef.current.deck.slides.find(s=>s.id===targetId);if(!current)return d;if(!replaceId&&(current.objects?.length||0)>=100)return d;if(!d[targetId])draftBases.current[targetId]=structuredClone(current);return {...d,[targetId]:{...current,objects:replaceId?(current.objects||[]).map(o=>o.id===replaceId&&!o.locked?{...o,src}:o):[...(current.objects||[]),obj]}};});setObjectSelection([replaceId||obj.id]);setTab('edit');setLayoutEditing(false);
    }catch(e){setDraftError((e as Error).message);}finally{setObjectBusy(false);}
  }
  function chooseLayout(layout: Slide["layout"]) {
    changeDraft("layout",layout);
    if(layout==='image-right')setDrafts(d=>({...d,[slide.id]:{...(d[slide.id]??slide),layout,theme:'white',backgroundTemplate:'none',backgroundColor:'#ffffff'}}));
    if(hasLayoutItems(layout) && !draft.items.length) setDrafts(d=>({...d,[slide.id]:{...(d[slide.id]??slide),layout,items:defaultLayoutItems(layout)}}));
  }
  function changeDraft<K extends keyof Slide>(key: K, value: Slide[K]) {
    recordDraft(`${slide.id}:${String(key)}`);
    setDraftError("");
    setDrafts((d) => {
      if (!d[slide.id]) draftBases.current[slide.id] = structuredClone(slide);
      return { ...d, [slide.id]: { ...(d[slide.id] ?? slide), [key]: value } };
    });
  }
  async function clipboardShortcut(e: React.KeyboardEvent) {
    if(!e.ctrlKey||e.metaKey||!['c','v'].includes(e.key.toLowerCase())||present||locked)return;
    if((e.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]'))return;
    const target=e.target as HTMLElement;
    const data=new DataTransfer();
    if(e.key.toLowerCase()==='c'){
      const event=new ClipboardEvent('copy',{bubbles:true,cancelable:true,clipboardData:data});target.dispatchEvent(event);
      if(event.defaultPrevented){e.preventDefault();await navigator.clipboard.writeText(data.getData('text/plain')).catch(()=>{});}
    }else{
      e.preventDefault();try{data.setData('text/plain',await navigator.clipboard.readText());target.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));}catch{}
    }
  }
  function copySelection(e: React.ClipboardEvent) {
    if(present || locked)return;
    const target=e.target as HTMLElement;
    if(target.closest('input,textarea,select') || (target.closest('[contenteditable]') && !window.getSelection()?.isCollapsed))return;
    if(target.closest('.thumb-list,.slide-grid-card,.slide-grid-list')){
      e.preventDefault();
      e.clipboardData.setData('text/plain',JSON.stringify({agentSlidesSlide:structuredClone(draft)}));
      return;
    }
    let objects: SlideObject[]=[];
    if(objectSelection.length&&!target.closest('[contenteditable="true"],[contenteditable="plaintext-only"]'))objects=(draft.objects||[]).filter(o=>objectSelection.includes(o.id));
    else {
      const el=target.closest('[data-edit-element]') as HTMLElement|null;
      const key=el?.dataset.editElement || (target.closest('.element-box')?selectedElement:null);
      const node=(target.closest('[contenteditable]') as HTMLElement|null) || el || (key?document.querySelector<HTMLElement>(`.center [data-edit-element="${key}"]`):null);
      const root=document.querySelector<HTMLElement>('.center .slide');
      if(node&&root){
        const b=node.getBoundingClientRect(),r=root.getBoundingClientRect(),style=getComputedStyle(node);
        const base={...makeObject(key==='artwork'?'motion':'text'),x:(b.x-r.x)/r.width*1600,y:(b.y-r.y)/r.height*900,w:Math.max(1,b.width/r.width*1600),h:Math.max(1,b.height/r.height*900)};
        if(key==='artwork')objects=[{...base,motion:(draft.artworkKind||'orbit') as SlideObject['motion'],rotation:draft.placements?.artwork?.rotation||0,duration:draft.animationDuration||38,fill:draft.artworkColor||'#2454ef'}];
        else objects=[{...base,text:node.innerText,style:{fontSize:Math.min(160,parseFloat(style.fontSize)/r.width*1600*.75),bold:Number(style.fontWeight)>=600,color:draft.theme==='white'?'#17233b':'#ffffff'}}];
      }
    }
    if(!objects.length)return;
    e.preventDefault();e.clipboardData.setData('text/plain',JSON.stringify({agentSlidesObjects:objects}));
  }
  function pasteSelection(e: React.ClipboardEvent) {
    if(present||locked)return;
    const target=e.target as HTMLElement;
    if(target.closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]'))return;
    try {
      const data=JSON.parse(e.clipboardData.getData('text/plain'));
      if(data.agentSlidesSlide){
        if(!target.closest('.thumb-list,.slide-grid-card,.slide-grid-list'))return;
        e.preventDefault();
        const copied=slideSchema.parse(data.agentSlidesSlide);
        if(Object.keys(drafts).length||pending.current){setError('編集中の内容の保存が完了してから、スライドを貼り付けてください。');return;}
        const next=structuredClone(workRef.current.deck);
        if(next.slides.length>=50){setError('スライドは50枚までです。');return;}
        const groups=new Map<string,string>();
        copied.id=crypto.randomUUID();
        copied.objects=copied.objects?.map(o=>{if(o.groupId&&!groups.has(o.groupId))groups.set(o.groupId,crypto.randomUUID());return {...o,id:crypto.randomUUID(),groupId:o.groupId?groups.get(o.groupId):undefined};});
        copied.strokes=copied.strokes.map(stroke=>({...stroke,id:crypto.randomUUID()}));
        const index=Math.min(selectedRef.current+1,next.slides.length);
        next.slides.splice(index,0,copied);
        void commit(next,'スライドをコピーして貼り付け').then(()=>{setSelected(index);selectCanvas(emptySelection());requestAnimationFrame(()=>document.querySelector<HTMLElement>(gridOpen?`.slide-grid-card[data-slide-id="${copied.id}"]`:`.thumb-row[data-slide-id="${copied.id}"]`)?.focus());}).catch(()=>{});
        return;
      }
      if(!Array.isArray(data.agentSlidesObjects)||!data.agentSlidesObjects.length)return;
      const items=data.agentSlidesObjects.map((o:unknown)=>objectSchema.parse(o)) as SlideObject[];
      if((draft.objects?.length||0)+items.length>100)return;
      const groups=new Map<string,string>();
      const copies=items.map(o=>{if(o.groupId&&!groups.has(o.groupId))groups.set(o.groupId,crypto.randomUUID());return {...o,id:crypto.randomUUID(),x:Math.min(3200,o.x+24),y:Math.min(1800,o.y+24),locked:false,groupId:o.groupId?groups.get(o.groupId):undefined};});
      e.preventDefault();changeDraft('objects',[...(draft.objects||[]),...copies]);setObjectSelection(copies.map(o=>o.id));setTab('edit');setLayoutEditing(false);return;
    }catch{}
    const file=Array.from(e.clipboardData.files).find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();void insertImage(file);}
  }
  function addMotion(kind:string,point?:{x:number;y:number}) {
    if(locked || (draft.objects?.length||0)>=100)return;
    if(!motionPresets.some(([id])=>id===kind&&id!=='none'))return;
    const offset=((draft.objects?.length||0)%6)*24;
    const obj=objectSchema.parse({...makeObject('motion'),name:motionPresets.find(([id])=>id===kind)?.[1]||'アニメーション',motion:kind,w:480,h:300,x:point?Math.max(0,Math.min(1120,point.x-240)):560+offset,y:point?Math.max(0,Math.min(600,point.y-150)):300+offset,fill:'#2454ef',duration:16});
    changeDraft('objects',[...(draft.objects||[]),obj]);setObjectSelection([obj.id]);setTab('edit');setLayoutEditing(false);
  }
  function addArtwork() {
    recordDraft("artwork-add", true);
    setDraftError("");
    setDrafts((d) => {
      if (!d[slide.id]) draftBases.current[slide.id] = structuredClone(slide);
      return {
        ...d,
        [slide.id]: {
          ...(d[slide.id] || slide),
          artworkKind: "orbit",
          animation: "orbit",
        },
      };
    });
    setSelectedElement("artwork");
    setLayoutEditing(true);
  }
  function alignSelected(mode:Alignment){
    if(locked||present||marker)return;
    const root=document.querySelector<HTMLElement>('.center .slide');if(!root)return;
    const patch=alignSelection(root,draft,{cards:cardSelection,objects:objectSelection,elements:baseSelection},mode);if(!patch)return;
    recordDraft('align-selection',true);setDraftError('');
    setDrafts(d=>{if(!d[slide.id])draftBases.current[slide.id]=structuredClone(slide);return {...d,[slide.id]:{...(d[slide.id]??slide),...patch}};});
  }
  function deleteSelection(e:React.KeyboardEvent){
    if(present||locked||marker||gridOpen||e.isDefaultPrevented()||e.nativeEvent.isComposing||e.metaKey||e.ctrlKey||e.altKey||!['Delete','Backspace'].includes(e.key))return;
    const target=e.target as HTMLElement;
    if(target.closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"],[aria-modal="true"]'))return;
    if(!target.closest('.center,.layer-list,.object-button-row,.element-box'))return;
    const patch:Partial<Slide>={};
    if(objectSelection.some(id=>draft.objects?.some(o=>o.id===id&&!o.locked)))patch.objects=(draft.objects||[]).filter(o=>!objectSelection.includes(o.id)||o.locked);
    if(cardSelection.length)patch.items=draft.items.filter((_,i)=>!cardSelection.includes(i));
    const elements=layoutEditing?[selectedElement]:baseSelection;
    for(const key of elements){if(key==='artwork')patch.artworkKind='none';else if(key==='items')patch.items=[];else if(key==='title'||key==='body'||key==='eyebrow')patch[key]='';}
    if(!Object.keys(patch).length)return;
    e.preventDefault();e.stopPropagation();recordDraft('delete-selection',true);setDraftError('');
    setDrafts(d=>{if(!d[slide.id])draftBases.current[slide.id]=structuredClone(slide);return {...d,[slide.id]:{...(d[slide.id]??slide),...patch}};});
    selectCanvas(emptySelection());setLayoutEditing(false);
  }
  function discardDraft() {
    setRecoveryNotice("");
    undoDrafts.current = [];
    redoDrafts.current = [];
    setHistoryTick((t) => t + 1);
    setDrafts((d) => {
      const next = { ...d };
      delete next[slide.id];
      return next;
    });
    delete draftBases.current[slide.id];
    setDraftError("");
    setReason("");
  }
  function applyDraft(targetId = slide.id) {
    const targetDraft=drafts[targetId];
    if(!targetDraft || locked)return;
    const next = structuredClone(workRef.current.deck);
    const current = next.slides.find((s) => s.id === targetId);
    if (!current) return;
    const base = draftBases.current[targetId] ?? current;
    for (const key of Object.keys(targetDraft) as (keyof Slide)[]) {
      if (JSON.stringify(base[key]) === JSON.stringify(targetDraft[key])) continue;
      if (
        JSON.stringify(base[key]) !== JSON.stringify(current[key]) &&
        JSON.stringify(targetDraft[key]) !== JSON.stringify(current[key])
      ) {
        setDraftError(
          "同じ箇所が別の操作で更新されています。編集内容を退避し、取り消してから最新版を編集してください。",
        );
        return;
      }
      Object.assign(current, { [key]: targetDraft[key] });
    }
    savingDraftId.current = targetId;
    void commit(next, reasons[targetId]?.trim() || "ブラウザ上でスライドを自動保存")
      .then(() => {
        setDrafts(d=>{const rest={...d};delete rest[targetId];return rest;});
        delete draftBases.current[targetId];
        setDraftError("");setAutosaveError("");
        savingDraftId.current = null;
      })
      .catch(e => {setAutosaveError((e as Error).message);setPresentAfterSave(false);});
  }
  const editingGesture=useRef(false);
  const composingText=useRef(false);
  useEffect(()=>{
    const begin=()=>{editingGesture.current=true;};const end=()=>{editingGesture.current=false;};
    const compositionStart=()=>{composingText.current=true;};const compositionEnd=()=>{composingText.current=false;};
    document.addEventListener('compositionstart',compositionStart);document.addEventListener('compositionend',compositionEnd);
    window.addEventListener('blur',compositionEnd);
    // 子要素が伝播を止めるドラッグも先に検知し、自動保存による操作解除を防ぐ。
    window.addEventListener('pointerdown',begin,true);window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);window.addEventListener('blur',end);
    return()=>{document.removeEventListener('compositionstart',compositionStart);document.removeEventListener('compositionend',compositionEnd);window.removeEventListener('blur',compositionEnd);window.removeEventListener('pointerdown',begin,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);window.removeEventListener('blur',end);};
  },[]);
  useEffect(()=>{
    if(locked||autosaveError||draftError.startsWith("同じ箇所")||present||!Object.keys(drafts).length)return;
    const timer=setInterval(()=>{
      // 入力中の保存ロックで、カーソルやIMEの変換状態を失わないようにする。
      const active=document.activeElement as HTMLElement|null;
      const typing=active?.isContentEditable||active?.matches('textarea,input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])');
      if(!editingGesture.current&&!composingText.current&&!typing)applyDraft(Object.keys(drafts)[0]);
    },1000);
    return()=>clearInterval(timer);
  },[drafts,locked,draftError,autosaveError,present]);
  function deleteSelectedSlide() {
    if (locked || work.deck.slides.length <= 1) return;
    const next = structuredClone(work.deck);
    const removed = next.slides.splice(selected, 1)[0];
    void commit(next, "不要なスライドを削除")
      .then(() => {
        setDrafts((d) => {
          const copy = { ...d };
          delete copy[removed.id];
          return copy;
        });
        delete draftBases.current[removed.id];
      })
      .catch(() => {});
  }
  const [pdfBusy, setPdfBusy] = useState(false);
  async function downloadPdf() {
    if (pdfBusy) return;
    if (Object.keys(drafts).length || pending.current) {
      setDraftError("PDFを作る前に変更を保存してください。");
      return;
    }
    setPdfBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/pdf?deckId=${encodeURIComponent(deckId)}`,
      );
      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw Error(data.error);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = work.deck.title + ".pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPdfBusy(false);
    }
  }
  function addSlide() {
    const id = crypto.randomUUID();
    const next = structuredClone(work.deck);
    next.slides.push({
      id,
      title: "新しいアイデア",
      artworkKind: "none",
      backgroundTemplate: defaultBackground(backgrounds),
      body: "伝えたいことを、ここから。",
      eyebrow: "YOUR NEXT IDEA",
      layout: "statement",
      theme: "white",
      animation: "reveal",
      notes: "",
      items: [],
      strokes: [],
    });
    void commit(next, "新しい内容を追加するため")
      .then(() => {
        setSelected(next.slides.length - 1);
        setTab("edit");
      })
      .catch(() => {});
  }
  function duplicate() {
    const next = structuredClone(work.deck);
    next.slides.splice(selected + 1, 0, {
      ...structuredClone(slide),
      id: crypto.randomUUID(),
      title: slide.title + "（コピー）",
    });
    void commit(next, "選択中のスライドを元に別案を作成")
      .then(() => setSelected(selected + 1))
      .catch(() => {});
  }
  function reorderSlide(id:string,slot:number){
    if(locked)return;
    const next=structuredClone(workRef.current.deck),from=next.slides.findIndex(s=>s.id===id);
    if(from<0)return;
    const dest=Math.max(0,Math.min(next.slides.length-1,slot>from?slot-1:slot));
    if(from===dest)return;
    const [moved]=next.slides.splice(from,1);next.slides.splice(dest,0,moved);
    void commit(next,`スライドを${from+1}枚目から${dest+1}枚目へ移動`).catch(()=>{});
    setSelected(dest);
    requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-slide-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true}));
  }
  function move(delta: number) {
    const next = structuredClone(work.deck);
    const dest = selected + delta;
    if (dest < 0 || dest >= next.slides.length) return;
    [next.slides[selected], next.slides[dest]] = [
      next.slides[dest],
      next.slides[selected],
    ];
    void commit(next, "説明の順序を調整")
      .then(() => setSelected(dest))
      .catch(() => {});
  }
  function draw(stroke: Stroke) {
    const id = workRef.current.deck.slides[selectedRef.current].id;
    if(present)presentationRecords.update(id,{ink:[...(presentationRecords.records[id]?.ink||[]),stroke].slice(-100)});
    else setSessionInk(ink => ({...ink, [id]: [...(ink[id] || []), stroke].slice(-100)}));
  }
  function undoInk() {
    if(present)presentationRecords.update(slide.id,{ink:(presentationRecords.records[slide.id]?.ink||[]).slice(0,-1)});
    else setSessionInk(ink => ({...ink, [slide.id]: (ink[slide.id] || []).slice(0,-1)}));
  }
  function stage(input: unknown, scope:Scope={mode:aiScope,slideId:slide.id,objectIds:objectSelection}) {
    const raw = proposalSchema.parse(input);
    const scoped=constrainDeck(workRef.current.deck,applyProposal(workRef.current.deck,raw),scope);
    const p = proposalSchema.parse({reason:raw.reason,patches:[],deck:scoped});
    applyProposal(workRef.current.deck, p);
    setProposal(p);
    setProposalVersion(workRef.current.version);
    setTab("agent");
    setAgentError("");
    return {
      status: "staged",
      changes: diffDeck(
        workRef.current.deck,
        applyProposal(workRef.current.deck, p),
      ),
    };
  }
  function propose(value = prompt) {
    if (agentMode === "ai") {
      void askAI();
      return;
    }
    try {
      if (agentMode === "json") {
        stage(JSON.parse(value));
        return;
      }
      const changes: Partial<Slide> = {};
      const title = value.match(/タイトル(?:を)?[「『"]([\s\S]+?)[」』"]/);
      const body = value.match(/本文(?:を)?[「『"]([\s\S]+?)[」』"]/);
      if (title) changes.title = title[1];
      if (body) changes.body = body[1];
      if (/白|ホワイト/.test(value)) changes.theme = "white";
      else if (/青|ブルー/.test(value)) changes.theme = "blue";
      else if (/ダーク|暗い/.test(value)) changes.theme = "dark";
      if (/動き.*止|アニメーション.*なし/.test(value))
        changes.animation = "none";
      else if (/順番|フェード/.test(value)) changes.animation = "reveal";
      else if (/オービット|回転/.test(value)) changes.animation = "orbit";
      if (!Object.keys(changes).length)
        throw new Error(
          "クイック操作はタイトル・本文の引用指定、背景色、アニメーションに対応しています。自由な構成変更には「エージェント連携」のJSON提案を使えます。",
        );
      stage({ reason: value, patches: [{ slideId: slide.id, changes }] });
    } catch (e) {
      setAgentError(
        e instanceof Error ? e.message : "提案の形式を確認してください。",
      );
    }
  }
  async function applyStaged(reviewed?:Deck) {
    if (!proposal) return;
    if (proposalVersion !== work.version) {
      setAgentError(
        "提案後にスライドが更新されました。もう一度提案を作成してください。",
      );
      return;
    }
    try {
      await commit(
        reviewed || applyProposal(work.deck, proposal),
        proposal.reason,
        agentMode === "quick" ? "クイック操作" : "エージェント",
      );
      setProposal(null);
      setPrompt("");
    } catch {}
  }
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: "read_slides",
        title: "スライドと意思決定ログを読む",
        description:
          "現在のデッキ、安定したスライドID、版番号、保存済み変更理由を読み取ります。",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: async () => ({ ...structuredClone(workRef.current), deckId }),
      },
      {
        name: "stage_slide_changes",
        title: "変更を提案",
        description:
          "スライドIDと変更理由を指定して変更案を画面に表示します。保存はしません。",
        inputSchema: {
          type: "object",
          properties: {
            reason: { type: "string" },
            deck: { type: "object", description: "全体生成・再構成時の完全なデッキ。patchesは空配列にします。" },
            patches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  slideId: { type: "string" },
                  changes: { type: "object" },
                },
                required: ["slideId", "changes"],
                additionalProperties: false,
              },
            },
          },
          required: ["reason", "patches"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async (input: unknown) => {
          setAgentMode("json");
          return stage(input);
        },
      },
      {
        name: "apply_slide_changes",
        title: "スライドの変更を保存",
        description:
          "版番号を検証して変更を適用・永続保存します。変更箇所、前後の内容、理由を意思決定ログに記録します。",
        inputSchema: {
          type: "object",
          properties: {
            version: { type: "integer" },
            proposal: { type: "object" },
          },
          required: ["version", "proposal"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async (input: unknown) => {
          const p = input as { version: number; proposal: Proposal };
          if (p.version !== workRef.current.version)
            throw new Error("版が古いため適用できません");
          const valid = proposalSchema.parse(p.proposal);
          const next = await commit(
            constrainDeck(workRef.current.deck,applyProposal(workRef.current.deck,valid),{mode:aiScope,slideId:slide.id,objectIds:objectSelection}),
            valid.reason,
            "エージェント",
          );
          setProposal(null);
          return { version: next.version, log: next.logs[0] };
        },
      },
    ];
    (window as unknown as { frameAgent: unknown }).frameAgent =
      Object.fromEntries(tools.map((t) => [t.name, t.execute]));
    if (context) {
      for (const tool of tools) {
        try {
          void Promise.resolve(
            context.registerTool(tool, { signal: lifecycle.signal }),
          ).catch(() => {});
        } catch {}
      }
    }
    return () => {
      lifecycle.abort();
      delete (window as unknown as { frameAgent?: unknown }).frameAgent;
    };
  }, [commit, deckId, aiScope, slide.id, objectSelection]);
  function advancePresentation(){const n=nextStep(slide,revealStep);if(n!==undefined)setRevealStep(n);else setSelected(i=>Math.min(i+1,work.deck.slides.length-1));}
  function backPresentation(){if(revealStep>0)setRevealStep(previousStep(slide,revealStep));else setSelected(i=>Math.max(0,i-1));}
  function openPresenter(){presenterWindow.current=window.open('/presenter?session='+presenterToken.current,'presenter-'+presenterToken.current,'popup,width=1280,height=900');if(!presenterWindow.current)setError('発表者画面を開けませんでした。ポップアップを許可してください。');}
  useEffect(()=>{const state={deck:work.deck,selected,step:revealStep,playing,present,started,records:presentationRecords.records,memoStatus:presentationRecords.status};presenterState.current=state;presenterChannel.current?.postMessage({type:'state',state});},[work.deck,selected,revealStep,playing,present,started,presentationRecords.records,presentationRecords.status]);
  presenterActions.current=(type,slideId,memo)=>{if(type==='memo'&&typeof memo==='string'&&slideId&&work.deck.slides.some(s=>s.id===slideId)){presentationRecords.update(slideId,{memo:memo.slice(0,10000)});return;}if(type==='resetTimer'){setStarted(Date.now());return;}if(!present)return;if(type==='next')advancePresentation();if(type==='previous')backPresentation();if(type==='pause')setPlaying(p=>!p);if(type==='end')exitPresent();};
  useEffect(()=>{
    if(presentAfterSave&&!Object.keys(drafts).length&&!locked&&!autosaveError)void startPresent();
  },[presentAfterSave,drafts,locked,autosaveError]);
  async function startPresent() {
    if (Object.keys(drafts).length || saving || pending.current) {
      if(!autosaveError && !draftError.startsWith("同じ箇所")){setDraftError("");setPresentAfterSave(true);}
      return;
    }
    setPresentAfterSave(false);
    setSessionInk({});
    setMemoOpen(false);
    setControlsVisible(true);
    setStarted(Date.now());setRevealStep(0);setPresent(true);
    setMarker(false);
    setPlaying(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
  }
  function exitPresent() {
    setPresent(false);
    setMarker(false);
    if (document.fullscreenElement) void document.exitFullscreen();
  }
  const visibleSlide = { ...(!present ? draft : slide), strokes: (present ? presentationRecords.records[slide.id]?.ink : sessionInk[slide.id]) || [] };
  const logs = work.logs.filter(
    (l) => !filterLog || l.changes.some((c) => c.slideId === slide.id),
  );
  const changes = proposal
    ? diffDeck(work.deck, applyProposal(work.deck, proposal))
    : [];
  const [exportBusy,setExportBusy]=useState('');
  async function downloadPackage(kind:'pptx'|'backup'){
    if(Object.keys(drafts).length||pending.current){setDraftError('先に編集中の内容を保存してください');return;}
    setExportBusy(kind);setError('');try{const r=await fetch(`/api/${kind}?deckId=${encodeURIComponent(deckId)}`);if(!r.ok){const j=await r.json() as {error?:string};throw Error(j.error||'出力に失敗しました');}const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${work.deck.title}.${kind==='pptx'?'pptx':'backup.json'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError((e as Error).message);}finally{setExportBusy('');}
  }
  const exportAll = () =>
    download("frame-slides.json", {
      format: "frame-v1",
      ...work,
      unsavedDrafts: drafts,
    });
  if(!loaded||!recoveryReady)return <div className="studio studio-loading" aria-busy={!error}>
    <header className="topbar"><BrandLogo/></header>
    <main className="deck-loading-state">
      {error?<div role="alert"><p>{error}</p><button onClick={()=>void reload()}>再読み込み</button><a href="/">マイスライドへ戻る</a></div>:<p role="status">スライドを読み込んでいます…</p>}
    </main>
  </div>;
  return (
    <div className="studio" onKeyDownCapture={deleteSelection} onKeyDown={clipboardShortcut} onCopy={copySelection} onPaste={pasteSelection}>
      {gridOpen&&<SlideGrid slides={work.deck.slides.map(s=>drafts[s.id]??s)} selected={selected} onClose={()=>setGridOpen(false)} onSelect={i=>{setSelected(i);setReplay(r=>r+1);}} thumbnail={(s,i)=><SlideThumbnail slide={s} index={i} total={work.deck.slides.length}/>}/>}
      {objectBusy&&<div role="status" className="upload-status">画像を読み込んでいます…</div>}
      <header className="topbar">
        <div className="brand">
          <BrandLogo/>
          <span className="brand-divider" />
          <span className="workspace-label">Personal workspace</span>
        </div>
        <div className="header-actions"><button onClick={openPresenter}>発表者画面</button><DeckTools deck={work.deck} disabled={locked||Object.keys(drafts).length>0} onApply={async(d,reason)=>{await commit(d,reason,"手動編集");}}/><button aria-label="PPTXをダウンロード" disabled={locked||!!exportBusy||pdfBusy} onClick={()=>void downloadPackage('pptx')}>{exportBusy==='pptx'?'PPTX生成中…':'PPTX'}</button><button aria-label="履歴込みバックアップ" disabled={locked||!!exportBusy||pdfBusy} onClick={()=>void downloadPackage('backup')}>{exportBusy==='backup'?'保存中…':'バックアップ'}</button>
          <button
            aria-label="PDFをダウンロード"
            disabled={locked || pdfBusy || !!exportBusy}
            onClick={() => void downloadPdf()}
          >
            {pdfBusy ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Download size={15} />
            )}{" "}
            {pdfBusy ? "PDF生成中…" : "PDF"}
          </button>
          <button
            onClick={exportAll}
            title="スライドとログをJSONで保存"
            aria-label="JSONを書き出す"
          >
            <Download size={15} />
            <span>書き出し</span>
          </button>
          <button
            disabled={locked}
            onClick={() => importInput.current?.click()}
            title="FRAME形式のデッキを読み込む"
            aria-label="JSONを読み込む"
          >
            <Upload size={15} />
          </button>
          <input
            hidden
            ref={importInput}
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                if (file.size > 2500000)
                  throw new Error("2.5MB以下のJSONを指定してください");
                const data = JSON.parse(await file.text());
                const deck = deckSchema.parse(data.deck ?? data);
                await commit(
                  deck,
                  "JSONファイルからデッキを読み込み",
                  "JSON取込",
                );
                setSelected(0);
                setDrafts({});
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          />
          <span className="header-separator" />
          <div className="private">
            <Lock size={12} /> 自分のみ
          </div>
          <span className="avatar">K</span>
        </div>
      </header>
      <div className="projectbar">
        <div>
          <a className="crumb" href="/">
            マイスライド /
          </a>
          {renaming ? (
            <form
              className="rename-form"
              onSubmit={(e) => {
                e.preventDefault();
                fire({ ...work.deck, title: deckName }, "デッキ名を変更");
                setRenaming(false);
              }}
            >
              <input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                maxLength={100}
                aria-label="デッキ名"
                autoFocus
                required
              />
              <button aria-label="名前を保存">
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={() => setRenaming(false)}
                aria-label="名前の変更を中止"
              >
                <X size={15} />
              </button>
            </form>
          ) : (
            <button
              className="deck-title"
              disabled={locked}
              onClick={() => {
                setDeckName(work.deck.title);
                setRenaming(true);
              }}
            >
              <h1>{work.deck.title}</h1>
              <Pencil size={12} />
            </button>
          )}
          <span
            className={`saved ${error ? "save-error" : ""}`}
            aria-live="polite"
          >
            {saving ? (
              <>
                <Loader2 size={12} className="spin" /> 保存中
              </>
            ) : error ? (
              "未保存"
            ) : loaded ? (
              <>
                <Check size={12} />{" "}
                {Object.keys(drafts).length ? "下書き編集中" : "保存済み"}
              </>
            ) : (
              "読み込み中"
            )}
          </span>
        </div>
        <button className="primary" onClick={() => void startPresent()}>
          <Play size={14} /> プレゼンテーション
        </button>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          {pending.current ? (
            <>
              <button disabled={saving} onClick={() => void retry()}>
                再試行
              </button>
              <button onClick={exportAll}>JSONに退避</button>
            </>
          ) : (
            <button onClick={() => void reload()}>再読み込み</button>
          )}
        </div>
      )}
      <div
        className={`workspace ${slidesCollapsed ? "slides-collapsed" : ""} ${rightCollapsed ? "right-collapsed" : ""}`}
        style={
          {
            "--left-panel-width": `${panelWidths.left}px`,
            "--right-panel-width": `${panelWidths.right}px`,
          } as CSSProperties
        }
      >
        <aside
          className="slides-sidebar"
          id="slides-sidebar"
          hidden={slidesCollapsed}
          onKeyDown={(e) => {
            if ((e.key === "ArrowUp" || e.key === "ArrowDown") && (e.target as HTMLElement).closest(".thumb-row")) {
              e.preventDefault(); e.stopPropagation();
              const next = Math.max(0, Math.min(work.deck.slides.length - 1, selected + (e.key === "ArrowDown" ? 1 : -1)));
              setSelected(next);
              e.currentTarget.querySelectorAll<HTMLButtonElement>(".thumb-row")[next]?.focus();
            }
            if (
              (e.key === "Delete" || e.key === "Backspace") &&
              (e.target as HTMLElement).closest(".thumb-row")
            ) {
              e.preventDefault();
              e.stopPropagation();
              deleteSelectedSlide();
            }
          }}
        >
          <div className="sidebar-heading">
            <button className="sidebar-toggle" aria-label="スライド一覧を閉じる" title="スライド一覧を閉じる" aria-expanded={!slidesCollapsed} aria-controls="slides-sidebar" onClick={()=>setSlidesCollapsed(true)}><PanelLeft size={15}/></button> スライド{" "}
            <span>{work.deck.slides.length}</span>
            <button
              disabled={locked || work.deck.slides.length >= 50}
              onClick={addSlide}
              aria-label="スライドを追加"
            >
              <Plus size={16} />
            </button>
          </div>
          <SortableSlides ids={work.deck.slides.map(s=>s.id)} disabled={locked} onReorder={reorderSlide}>
            {work.deck.slides.map((s, i) => (
              <button
                key={s.id}
                data-slide-id={s.id}
                title="ドラッグで並べ替え・Alt＋上下キーで移動"
                className={`thumb-row ${selected === i ? "selected" : ""}`}
                onClick={() => {
                  setSelected(i);
                  setReplay((r) => r + 1);
                }}
                aria-label={`スライド ${i + 1}: ${s.title.replaceAll("\n", "")}`}
                aria-current={selected === i ? "true" : undefined}
              >
                <span className="thumb-num">{pad(i + 1)}</span>
                <SlideThumbnail slide={selected===i?visibleSlide:s} index={i} total={work.deck.slides.length}/>

              </button>
            ))}
          </SortableSlides>
          <button
            className="add-slide"
            disabled={locked || work.deck.slides.length >= 50}
            onClick={addSlide}
          >
            <Plus size={15} /> スライドを追加
          </button>
          <div className="sidebar-bottom">
            <Lock size={12} /> あなただけのワークスペース
          </div>
          <PanelResize
            side="left"
            width={panelWidths.left}
            onResize={(w) => resizePanel("left", w)}
          />
        </aside>
        <main className={`center ${showEditGuides ? "" : "edit-guides-hidden"}`} onDragOver={e=>{if(e.dataTransfer.types.includes('Files')||e.dataTransfer.types.includes('application/x-agent-slides-motion')){e.preventDefault();e.dataTransfer.dropEffect='copy';}}} onDrop={e=>{const kind=e.dataTransfer.getData('application/x-agent-slides-motion');if(kind){e.preventDefault();const box=e.currentTarget.querySelector('.slide')?.getBoundingClientRect();if(box&&e.clientX>=box.left&&e.clientX<=box.right&&e.clientY>=box.top&&e.clientY<=box.bottom)addMotion(kind,{x:(e.clientX-box.left)/box.width*1600,y:(e.clientY-box.top)/box.height*900});return;}const file=Array.from(e.dataTransfer.files).find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();void insertImage(file);}}}>
          <div className="canvas-toolbar">
            <div>
              {slidesCollapsed&&<button aria-label="スライド一覧を開く" title="スライド一覧を開く" aria-expanded={false} aria-controls="slides-sidebar" onClick={()=>setSlidesCollapsed(false)}><PanelLeft size={17}/></button>}
              <button
                aria-label="選択ツール"
                title="選択ツール"
                className={!marker&&selectionTool ? "active" : ""}
                onClick={() => {setMarker(false);setSelectionTool(true);}}
              >
                <MousePointer2 size={17} />
              </button>
              <button
                aria-label="テキストを編集"
                title="テキストを編集"
                className={!marker&&!selectionTool ? "active" : ""}
                onClick={() => {
                  setTab("edit");
                  setMarker(false);
                  setSelectionTool(false);
                }}
              >
                <Type size={17} />
              </button>
              <button
                aria-label="マーカー"
                title="マーカー M"
                className={marker ? "active" : ""}
                onClick={() => {
                  setMarker((m) => !m);
                  if (tab === "edit") setTab("agent");
                }}
              >
                <Highlighter size={17} />
              </button>
              {marker && (
                <div className="ink-colors">
                  {(["yellow", "pink", "blue", "red", "green"] as const).map((c) => (
                    <button
                      key={c}
                      className={`color-${c} ${color === c ? "chosen" : ""}`}
                      onClick={() => setColor(c)}
                      aria-label={`${c} マーカー`}
                      aria-pressed={color === c}
                    />
                  ))}
                </div>
              )}
              {marker && <label className="pen-width">太さ <select aria-label="ペンの太さ" value={penWidth} onChange={e=>setPenWidth(Number(e.target.value))}><option value={6}>細い</option><option value={18}>標準</option><option value={32}>太い</option></select></label>}
              <span className="toolbar-rule" />
              <button
                disabled={locked || !(sessionInk[slide.id]?.length)}
                aria-label="直前のマーカーを取り消す"
                title="直前のマーカーを取り消す"
                onClick={undoInk}
              >
                <Undo2 size={17} />
              </button>
            </div>
            <span>
              16:9{" "}
              <button
                title="アニメーションを最初から再生"
                aria-label="アニメーションを再生"
                onClick={() => {
                  setPlaying(true);
                  setReplay((r) => r + 1);
                }}
              >
                <RotateCcw size={13} />
              </button>
            </span>
          </div>
          <div className="history-toolbar" data-history={historyTick}>
            <button
              disabled={
                locked ||
                (!undoDrafts.current.length && !undoDecks.current.length)
              }
              onClick={() => void undoRedo()}
            >
              ↶ 元に戻す
            </button>
            <button
              disabled={
                locked ||
                (!redoDrafts.current.length && !redoDecks.current.length)
              }
              onClick={() => void undoRedo(true)}
            >
              ↷ やり直す
            </button>
            <button
              aria-pressed={layoutEditing}
              onClick={() => {
                setLayoutEditing((v) => !v);
                setMarker(false);
                setTab("edit");
              }}
            >
              要素の配置・サイズ
            </button>
            <button type="button" aria-label="編集枠の表示切替" aria-pressed={showEditGuides} onClick={()=>setShowEditGuides(value=>{localStorage.setItem("agent-slides-edit-guides",value?"hidden":"visible");return !value;})}>{showEditGuides?"編集枠を非表示":"編集枠を表示"}</button>
            {!!(cardSelection.length+objectSelection.length+baseSelection.length)&&!marker&&!layoutEditing&&showEditGuides&&<div className="card-selection-tools" role="group" aria-label="カードの選択操作">
              <span aria-live="polite">{cardSelection.length+objectSelection.length+baseSelection.length}件選択中</span>
              <button type="button" disabled={locked} onClick={()=>setCardSelection(draft.items.map((_,i)=>i))}>カードをすべて選択</button>
              <select aria-label="選択した要素を整列" value="" disabled={locked||cardSelection.length+objectSelection.length+baseSelection.length<2} onChange={e=>{alignSelected(e.target.value as Alignment);e.currentTarget.blur();}}>
                <option value="" disabled>整列・等間隔</option>
                <option value="left">左揃え</option><option value="center">左右中央揃え</option><option value="right">右揃え</option>
                <option value="top">上揃え</option><option value="middle">上下中央揃え</option><option value="bottom">下揃え</option>
                <option value="horizontal" disabled={cardSelection.length+objectSelection.length+baseSelection.length<3}>横に等間隔</option><option value="vertical" disabled={cardSelection.length+objectSelection.length+baseSelection.length<3}>縦に等間隔</option>
              </select>
              <button type="button" onClick={()=>selectCanvas(emptySelection())}>解除</button>
              <button type="button" className="card-selection-help" aria-label="カードの選択・移動の操作方法" title="余白からドラッグして範囲選択。Shiftで追加選択。選択した要素をドラッグ、または矢印キーで移動。Escで解除。">?</button>
            </div>}
            <span>
              {Object.keys(drafts).length
                ? "下書きはこのブラウザに自動保存"
                : ""}
            </span>
          </div>
          {recoveryNotice && (
            <div className="recovery-notice" role="status">
              {recoveryNotice}
              <button onClick={() => setRecoveryNotice("")}>閉じる</button>
            </div>
          )}
          <div className="frame-sizing">
            <label>
              表示サイズ{" "}
              <input
                aria-label="フレームの表示サイズ"
                type="range"
                min="50"
                max="100"
                step="5"
                value={frameSize}
                onChange={(e) => setFrameSize(Number(e.target.value))}
              />
              <span>{frameSize}%</span>
            </label>
            <button
              onClick={() => {
                setFrameSize(100);
                resizePanel("left", 226);
                resizePanel("right", 302);
              }}
            >
              画面に合わせる・幅をリセット
            </button>
          </div>
          <div className="canvas-area">
            <div className="canvas-caption">
              <span>
                {pad(selected + 1)} — {slide.layout.toUpperCase()}
              </span>
              <button
                className="live-tag"
                onClick={() => setPlaying((p) => !p)}
                aria-label={
                  playing ? "アニメーションを一時停止" : "アニメーションを再開"
                }
              >
                {playing ? <i /> : <Pause size={10} />}{" "}
                {animations[visibleSlide.animation]}
              </button>
            </div>
            <div className="slide-viewport">
              <div
                className="fitted-frame"
                style={{ "--frame-size": frameSize / 100 } as CSSProperties}
              >
                <SlideView
                  key={slide.id + replay}
                  slide={visibleSlide}
                  cardSelection={cardSelection} onCardSelection={setCardSelection}
                  baseSelection={baseSelection} rangeEnabled={selectionTool&&!locked&&!marker&&!layoutEditing}
                  onCanvasSelection={selectCanvas}
                  onSelectionEdit={patch=>{recordDraft('canvas-selection',true);setDraftError('');setDrafts(d=>{if(!d[slide.id])draftBases.current[slide.id]=structuredClone(slide);return {...d,[slide.id]:{...(d[slide.id]??slide),...patch}};});}}
                  objectSelection={objectSelection} onObjectSelection={ids=>{setObjectSelection(ids);setLayoutEditing(false);setTab("edit");}} onObjects={objects=>changeDraft("objects",objects)}
                  index={selected}
                  total={work.deck.slides.length}
                  animate={playing}
                  marker={marker && !locked && tab !== "edit"}
                  color={color}
                penWidth={penWidth}
                  onDraw={draw}
                  editable={!locked && !marker && !layoutEditing}
                  editing={tab === "edit" || layoutEditing}
                  layoutEditing={layoutEditing && !locked && !marker}
                  selectedElement={selectedElement}
                  onSelectElement={key=>{setSelectedElement(key);setTab("edit");}}
                  onGesture={() => {
                    lastDraftEdit.current = { key: "", at: 0 };
                  }}
                  onPlacement={(key, value) =>
                    changeDraft("placements", {
                      ...draft.placements,
                      [key]: value,
                    })
                  }
                  onActivate={() => setTab("edit")}
                  onEdit={(field, value) => {
                    if (field === "items")
                      changeDraft("items", value as Slide["items"]);
                    else changeDraft(field, value as string);
                  }}
                />
              </div>
            </div>
            <div className="under-canvas">
              <span>
                {marker ? (
                  <>
                    <Highlighter size={13} />{" "}
                    なぞって強調。マーカーも履歴に保存。
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />{" "}
                    {drafts[slide.id]
                      ? "編集中 · 自動保存します"
                      : "文字はクリック、カードは四隅でサイズ変更・つまみで移動できます。"}
                  </>
                )}
              </span>
              <div className="slide-pagination">
                <button
                  aria-label="前のスライド"
                  disabled={selected === 0}
                  onClick={() => setSelected((i) => i - 1)}
                >
                  <ChevronLeft size={12} />
                </button>
                <span>
                  {selected + 1} / {work.deck.slides.length}
                </span>
                <button
                  aria-label="次のスライド"
                  disabled={selected === work.deck.slides.length - 1}
                  onClick={() => setSelected((i) => i + 1)}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
          {drafts[slide.id] && <div className="autosave-notice" role="status">{autosaveError ? "自動保存できませんでした。変更内容はこのブラウザに保持されています。" : presentAfterSave ? "保存完了後にプレゼンを開始します…" : saving ? "保存中…" : "自動保存待ち…"}{autosaveError && <><p role="alert">{autosaveError}</p><button onClick={()=>{setAutosaveError("");if(pending.current)void retry();}}>保存を再試行</button></>}{draftError && <p role="alert">{draftError}</p>}</div>}
          <section className={`notes ${notesOpen ? "" : "notes-collapsed"}`}>
            <div>
              <button
                aria-expanded={notesOpen}
                aria-controls="speaker-note-content"
                onClick={() =>
                  setNotesOpen((open) => {
                    localStorage.setItem("frame-notes-open", String(!open));
                    return !open;
                  })
                }
              >
                {notesOpen ? "▾" : "▸"} スピーカーノート{" "}
                <span>{notesOpen ? "閉じる" : "開く"}</span>
              </button>
              {notesOpen && (
                <button
                  onClick={() => setTab("edit")}
                  aria-label="ノートを編集"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
            <p id="speaker-note-content" hidden={!notesOpen}>
              {draft.notes || "プレゼンテーションで伝えたいことをメモ…"}
            </p>
          </section>
          <details className="presentation-memo-editor">
            <summary>プレゼン中のメモ{presentationRecords.records[slide.id]?.memo?' · メモあり':''}</summary>
            <label>スライド {selected+1} のメモ<textarea aria-label="保存したプレゼンメモ" maxLength={10000} value={presentationRecords.records[slide.id]?.memo||''} onChange={e=>presentationRecords.update(slide.id,{memo:e.target.value})}/></label>
            <small role="status">{presentationRecords.status} · スピーカーノートとは別に保存</small>
          </details>
          <footer className="statusbar">
            <span>
              <i /> {work.deck.slides.length} slides{" "}
              <span className="status-version">· v{work.version}</span>
            </span>
            <span>
              <button type="button" className="grid-view-toggle" aria-label="グリッドビュー" title="グリッドビュー" onClick={()=>setGridOpen(true)}><LayoutGrid size={17}/><span>一覧表示</span></button>
              ← → スライド移動{" "}
              <span className="status-version">· M マーカー</span>
            </span>
          </footer>
        </main>
        {rightCollapsed&&<div className="right-panel-rail"><button ref={rightOpenButton} type="button" aria-label="右メニューを開く" title="右メニューを開く" aria-expanded={false} aria-controls="right-panel" onClick={()=>toggleRightPanel(false)}><PanelRight size={17}/></button></div>}
        <aside className="right-panel" id="right-panel" hidden={rightCollapsed}>
          <PanelResize
            side="right"
            width={panelWidths.right}
            onResize={(w) => resizePanel("right", w)}
          />
          <div className="panel-tabs">
            <button ref={rightCloseButton} type="button" className="right-panel-toggle" aria-label="右メニューを閉じる" title="右メニューを閉じる" aria-expanded={!rightCollapsed} aria-controls="right-panel" onClick={()=>toggleRightPanel(true)}><PanelRight size={16}/></button>
            <button
              className={tab === "agent" ? "selected" : ""}
              onClick={() => setTab("agent")}
            >
              <Sparkles size={14} /> エージェント
            </button>
            <button
              className={tab === "edit" ? "selected" : ""}
              onClick={() => setTab("edit")}
            >
              <Pencil size={13} /> 編集
            </button>
            <button
              className={tab === "log" ? "selected" : ""}
              onClick={() => setTab("log")}
            >
              <History size={14} /> ログ
              {work.logs.length > 0 && (
                <span className="log-badge">{work.logs.length}</span>
              )}
            </button>
          </div>
          {tab === "agent" ? (
            <>
              <div className="agent-content">
                <div className="context-chip">
                  <span /> スライド {pad(selected + 1)} を編集中
                </div>
                <div className="codex-connection" role="status"><span>{connection.message}</span><button disabled={connection.state==='checking'||aiBusy} onClick={()=>void checkConnection()}>再確認</button><small>{aiAvailable?"Web検索は下のチェックで有効にできます。社内資料は必要な範囲だけ共有してください。":"AI対話とWeb検索にはCodexへの接続が必要です。"}</small></div>
                <div className="agent-mode">
                  {aiAvailable && (
                    <button
                      className={agentMode === "ai" ? "chosen" : ""}
                      onClick={() => {
                        setAgentMode("ai");
                        setProposal(null);
                        setAgentError("");
                      }}
                    >
                      AI対話
                    </button>
                  )}
                  <button
                    className={agentMode === "quick" ? "chosen" : ""}
                    onClick={() => {
                      setAgentMode("quick");
                      setProposal(null);
                      setPrompt("");
                      setAgentError("");
                    }}
                  >
                    クイック操作
                  </button>
                  <button
                    className={agentMode === "json" ? "chosen" : ""}
                    onClick={() => {
                      setAgentMode("json");
                      setProposal(null);
                      setPrompt("");
                      setAgentError("");
                    }}
                  >
                    <Code2 size={12} /> エージェント連携
                  </button>
                </div>
                {agentMode === "ai" ? (
                  <div className="ai-chat">
                    <p className="mode-help">
                      MacのCodexに接続。現在のデッキを読み取り、変更案を作ります。
                    </p>
                    {messages.map((m, i) => (
                      <div key={i} className={`ai-message ai-${m.role}`}>
                        <small>{m.role === "user" ? "あなた" : "Codex"}</small>
                        <p>{m.text}</p>
                      </div>
                    ))}
                    {aiBusy && <div className="ai-generating" role="status" aria-live="polite"><span className="ai-generating-dot" aria-hidden="true"/><div><strong>Codexが考えています…</strong><small>{webSearch?"Web検索を許可して変更案を作成中です":"変更案を作成中です"}</small></div></div>}
                  </div>
                ) : agentMode === "quick" ? (
                  <>
                    <h3>ここから試す</h3>
                    {[
                      "タイトルを「未来を、一緒につくる。」に変更",
                      "順番に現れるアニメーションを追加",
                      "背景を白に変更",
                    ].map((x) => (
                      <button
                        className="suggestion"
                        key={x}
                        disabled={locked}
                        onClick={() => {
                          setPrompt(x);
                          propose(x);
                        }}
                      >
                        {x}
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                    <p className="mode-help">
                      定型の指示を変更案に変換します。
                      <br />
                      {aiAvailable
                        ? "自由文の指示は「AI対話」で送れます。"
                        : "AI接続を設定すると、自由文で指示できます。"}
                    </p>
                  </>
                ) : (
                  <div className="connection-info">
                    <p>
                      Codexなどのエージェントから、スライドを読み取り・変更できます。APIキーは不要です。
                    </p>
                    <button
                      className="suggestion"
                      onClick={() => {
                        download("frame-agent-context.json", {
                          workspace: work,
                          schema: {
                            reason: "変更する理由",
                            patches: [
                              {
                                slideId: slide.id,
                                changes: { title: "新しいタイトル" },
                              },
                            ],
                          },
                        });
                      }}
                    >
                      <Download size={13} /> 現在の内容を渡す
                    </button>
                    <button
                      className="suggestion"
                      onClick={() =>
                        setPrompt(
                          JSON.stringify(
                            {
                              reason: "伝えたいメッセージを明確にする",
                              patches: [
                                {
                                  slideId: slide.id,
                                  changes: {
                                    title: "未来を、\n一緒につくる。",
                                  },
                                },
                              ],
                            },
                            null,
                            2,
                          ),
                        )
                      }
                    >
                      JSONの例を挿入 <Code2 size={13} />
                    </button>
                    <p>
                      対応ブラウザではWebMCPを利用できます。JSON提案を下に貼り付けることもできます。
                    </p>
                  </div>
                )}
                {proposal && (
                  <div className="proposal-card">
                    <div className="proposal-heading">
                      <Sparkles size={14} />
                      <strong>変更案</strong>
                      <span>{changes.length} 箇所</span>
                    </div>
                    <label className="reason-label">
                      変更メモ（任意）
                      <textarea
                        aria-label="提案の変更理由"
                        value={proposal.reason}
                        onChange={(e) =>
                          setProposal({ ...proposal, reason: e.target.value })
                        }
                      />
                    </label>
                    <ReviewPanel key={`${proposalVersion}:${JSON.stringify(proposal.deck||proposal.patches)}`} base={work.deck} next={applyProposal(work.deck,proposal)} disabled={locked||Object.keys(drafts).length>0||!proposal.reason.trim()} onApply={d=>void applyStaged(d)}/>
                    <div className="proposal-actions">
                      <button onClick={() => setProposal(null)}>見送る</button>
                    </div>
                  </div>
                )}
                {agentError && (
                  <p className="inline-error" role="alert">
                    {agentError}
                  </p>
                )}
                <div className="agent-note">
                  <History size={16} />
                  <p>
                    変更とその理由が
                    <br />
                    意思決定ログに残ります。
                  </p>
                </div>
              </div>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  propose();
                }}
              >
                <label className="scope-control">AIが変更できる範囲<select aria-label="AI変更範囲" value={aiScope} disabled={aiBusy} onChange={e=>setAiScope(e.target.value as Scope['mode'])}><option value="deck">デッキ全体</option><option value="slide">現在のスライドに固定</option><option value="objects" disabled={!objectSelection.length}>選択した要素に固定 ({objectSelection.length})</option></select></label>
                {agentMode==="ai"&&<label className="web-search-control"><input type="checkbox" checked={webSearch} disabled={aiBusy} onChange={e=>setWebSearch(e.target.checked)}/>Codex標準のWeb検索を使う<small>必要に応じてWebを調べ、出典を回答に残します。</small></label>}
                {aiScope!=="deck"&&<p className="scope-hint">複数枚の作成・構成変更は「デッキ全体」を選んでください。</p>}
                {aiBusy&&<button type="button" className="stop-generation" onClick={()=>aiAbort.current?.abort()}>生成を停止</button>}
                <textarea
                  aria-label="エージェントへの指示"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    agentMode === "ai"
                      ? "構成や表現を相談する…"
                      : agentMode === "quick"
                        ? "このスライドをどう変えますか？"
                        : "エージェントのJSON提案を貼り付け"
                  }
                  rows={agentMode === "json" ? 6 : 3}
                />
                <div>
                  <span>
                    {agentMode === "ai"
                      ? <span className="ai-model-controls"><select aria-label="AIモデル" value={aiModel} disabled={aiBusy || !modelCatalog.length} onChange={e=>{setAiModel(e.target.value);setAiEffort(modelCatalog.find(m=>m.model===e.target.value)?.defaultReasoningEffort || "");}}>{!modelCatalog.length && <option value="">{modelError || "モデル読込中…"}</option>}{modelCatalog.map(m=><option key={m.model} value={m.model}>{m.displayName || m.model}</option>)}</select><select aria-label="Reasoning effort" value={aiEffort} disabled={aiBusy || !aiModel} onChange={e=>setAiEffort(e.target.value)}>{modelCatalog.find(m=>m.model===aiModel)?.supportedReasoningEfforts.map(e=><option key={e.reasoningEffort} value={e.reasoningEffort}>{e.reasoningEffort}</option>)}</select></span>
                      : agentMode === "quick"
                        ? "選択中のスライド"
                        : "構造化された変更提案"}
                  </span>
                  <button
                    disabled={locked || aiBusy || !prompt.trim()}
                    aria-label="変更案を作成"
                  >
                    <ArrowUp size={16} />
                  </button>
                </div>
              </form>
            </>
          ) : tab === "edit" ? (
            <fieldset className="edit-content" disabled={locked}>
              <div className="edit-topline">
                <span>スライド {pad(selected + 1)}</span>
                <div>
                  <button
                    aria-label="前へ移動"
                    title="前へ移動"
                    disabled={locked || selected === 0}
                    onClick={() => move(-1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    aria-label="後へ移動"
                    title="後へ移動"
                    disabled={
                      locked || selected === work.deck.slides.length - 1
                    }
                    onClick={() => move(1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    aria-label="スライドを複製"
                    title="複製"
                    disabled={locked || work.deck.slides.length >= 50}
                    onClick={duplicate}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    aria-label="スライドを削除"
                    title="削除（ログから復元可能）"
                    disabled={locked || work.deck.slides.length <= 1}
                    onClick={deleteSelectedSlide}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <details className="base-text-style"><summary>クリックで順に表示</summary><p>0は最初から表示。同じ番号の要素は同時に表示します。</p>{(['title','body','eyebrow','items','artwork'] as const).map((key,i)=><label key={key}>{['タイトル','本文','ラベル','項目','装飾'][i]}<input aria-label={`クリック順番 ${key}`} type="number" min="0" max="100" value={draft.revealSteps?.[key]||0} onChange={e=>changeDraft('revealSteps',{...draft.revealSteps,[key]:Math.min(100,Math.max(0,Math.round(Number(e.target.value))))})}/></label>)}</details>
              {(draft.layout!=='image-right'&&(draft.artworkKind??(draft.layout==='hero'?'orbit':draft.layout==='statement'?'arrow':'none'))!=='none')&&<div className="existing-artwork-control"><span>スライドの装飾</span><button type="button" onClick={()=>changeDraft('artworkKind','none')}>このスライドの装飾を削除</button></div>}
              <ObjectPanel objects={draft.objects||[]} selected={objectSelection} onSelect={ids=>{setObjectSelection(ids);setLayoutEditing(false);}} onChange={objects=>changeDraft("objects",objects)} onError={setDraftError} onImage={insertImage}/>
              <details className="base-text-style"><summary>既存の文字の書式</summary><label>対象<select aria-label="書式を変更する文字" value={styleTarget} onChange={e=>setStyleTarget(e.target.value as typeof styleTarget)}><option value="title">タイトル</option><option value="body">本文</option><option value="eyebrow">ラベル</option><option value="items">項目</option></select></label><TextStyleControls style={draft.textStyles?.[styleTarget]||{}} onChange={style=>changeDraft("textStyles",{...draft.textStyles,[styleTarget]:style})}/><button type="button" onClick={()=>{if(styleTarget==='items')changeDraft('items',draft.items.map(item=>({...item,body:item.body.split('\n').map(t=>t.startsWith('• ')?t.slice(2):`• ${t}`).join('\n')})));else changeDraft(styleTarget,draft[styleTarget].split('\n').map(t=>t.startsWith('• ')?t.slice(2):`• ${t}`).join('\n'));}}>箇条書きを切替</button><p>赤い下線は文字のはみ出しを示します。サイズ・位置・改行を調整してください。</p></details>
              {draft.layout==='image-right'&&<SideImageControl key={draft.id} value={draft.sideImage} onChange={value=>changeDraft('sideImage',value)} onError={setDraftError}/>}
              <section className="layout-library">
                <h3>スライドパターン</h3>
                <p>内容を保ったまま配置を切り替えます。</p>
                <div className="layout-pattern-grid">
                  {layoutPatterns.map(([id,name,description])=><button type="button" key={id} aria-label={`パターン：${name}`} aria-pressed={draft.layout===id} title={description} onClick={()=>chooseLayout(id)}>
                    <div className={`layout-icon icon-${id}`} aria-hidden="true"><b/><i/><i/><i/><i/></div><span>{name}</span>
                  </button>)}
                </div>
              </section>
              <section className="artwork-actions" id="motion-library">
                <h3>モーションライブラリ</h3>
                <p className="motion-help">クリックで追加、またはスライドへドラッグ。色・サイズは各要素で変更できます。</p>
                {draft.artworkKind==='arrow'&&<label>既存の装飾矢印の太さ<input type="range" aria-label="既存の装飾矢印の太さ" min="1" max="24" value={draft.arrowWidth??6} onChange={e=>changeDraft('arrowWidth',Number(e.target.value))}/></label>}
                <div className="motion-preset-grid">
                  {motionPresets.map(([kind,name,description]) => <button type="button" key={kind} title={description} aria-label={name} disabled={locked || (draft.objects?.length||0)>=100} draggable={kind!=="none"&&!locked} onDragStart={e=>{e.dataTransfer.setData("application/x-agent-slides-motion",kind);e.dataTransfer.effectAllowed="copy";}} onClick={()=>{if(kind==="none")changeDraft("artworkKind","none");else addMotion(kind);}}>
                    <div className="motion-mini">{kind === "orbit" ? <span>◎</span> : kind === "arrow" ? <span>→</span> : kind === "none" ? <span>—</span> : <MotionArt kind={kind}/>}</div>
                    <strong>{name}</strong>
                  </button>)}
                </div>
                <div className="motion-playback"><button type="button" onClick={()=>setPlaying(p=>!p)}>{playing ? "動きを一時停止" : "動きを再生"}</button><label>選択要素の周期 <input aria-label="モーションの周期" type="range" min="2" max="60" disabled={!draft.objects?.some(o=>o.id===objectSelection[0]&&o.kind==="motion")} value={draft.objects?.find(o=>o.id===objectSelection[0])?.duration || 16} onChange={e=>changeDraft("objects",(draft.objects||[]).map(o=>o.id===objectSelection[0]&&!o.locked?{...o,duration:Number(e.target.value)}:o))}/><output>{draft.objects?.find(o=>o.id===objectSelection[0])?.duration || 16}秒</output></label></div>
                {draft.objects?.find(o=>o.id===objectSelection[0]&&o.kind==='motion') ? <label className="motion-color">選択したモーションの色<input type="color" aria-label="選択したモーションの色" value={draft.objects.find(o=>o.id===objectSelection[0])!.fill} onChange={e=>changeDraft('objects',draft.objects!.map(o=>o.id===objectSelection[0]&&!o.locked?{...o,fill:e.target.value}:o))}/></label> : <p>色を変えるには、配置したモーションをクリックして選択してください。</p>}
                <div>
                  <button type="button" onClick={addArtwork}>
                    円形アニメーションを追加
                  </button>
                  <button
                    type="button"
                    disabled={
                      (draft.artworkKind ??
                        (draft.layout === "hero"
                          ? "orbit"
                          : draft.layout === "statement"
                            ? "arrow"
                            : "none")) === "none"
                    }
                    onClick={() => {
                      changeDraft("artworkKind", "none");
                      setLayoutEditing(false);
                    }}
                  >
                    装飾を削除
                  </button>
                </div>
                <p>
                  「要素の配置・サイズ」で装飾をドラッグ。四隅でサイズを変更できます。
                </p>
              </section>
              <label>
                ラベル
                <input
                  value={draft.eyebrow}
                  maxLength={80}
                  onChange={(e) => changeDraft("eyebrow", e.target.value)}
                />
              </label>
              <label>
                タイトル <small>{draft.title.length}/90</small>
                <textarea
                  value={draft.title}
                  maxLength={90}
                  rows={3}
                  onChange={(e) => changeDraft("title", e.target.value)}
                />
              </label>
              <label>
                本文
                <textarea
                  value={draft.body}
                  maxLength={600}
                  rows={4}
                  onChange={(e) => changeDraft("body", e.target.value)}
                />
              </label>
              <div className="field-pair">
                <label>
                  レイアウト
                  <select
                    value={draft.layout}
                    aria-label="スライドパターン"
                    onChange={e=>chooseLayout(e.target.value as Slide["layout"])}
                  >
                    {layoutPatterns.map(([id,name])=><option key={id} value={id}>{name}</option>)}
                  </select>
                </label>
                <label>
                  背景
                  <select
                    value={draft.theme}
                    onChange={(e) =>
                      changeDraft("theme", e.target.value as Slide["theme"])
                    }
                  >
                    {Object.entries(themes).map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <section className="background-templates">
                <h3>背景テンプレート</h3>
                <p>選ぶと現在のスライドに反映され、自動保存されます。</p>
                {!backgrounds.length&&<p>同梱の背景画像はありません。背景色や画像要素を利用できます。</p>}
                <div className="background-grid">
                  {backgrounds.map((id) => (
                    <button type="button" key={id} aria-label={`背景テンプレート ${backgroundLabels[id] || `背景 ${id.replace("bg_", "")}`}`} aria-pressed={draft.backgroundTemplate === id} onClick={() => changeDraft("backgroundTemplate", id)}>
                      <img src={`/backgrounds/${id}.png`} alt="" loading="lazy" />
                      <span>{backgroundLabels[id] || `背景 ${id.replace("bg_", "")}`}{draft.backgroundTemplate === id ? " · 選択中" : ""}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="background-reset" disabled={!draft.backgroundTemplate || draft.backgroundTemplate === "none"} onClick={() => changeDraft("backgroundTemplate", "none")}>テンプレートを解除</button>
              </section>
              <section className="placement-fields">
                <h3>要素の配置・サイズ</h3>
                <label>
                  対象
                  <select
                    aria-label="配置する要素"
                    value={selectedElement}
                    onChange={(e) => {
                      setSelectedElement(e.target.value as ElementKey);
                      setLayoutEditing(true);
                    }}
                  >
                    {Object.entries(elementLabels)
                      .filter(([k]) => k !== "items" || draft.items.length)
                      .map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                  </select>
                </label>
                {(
                  [
                    ["x", "左右の移動 (%)", -100, 100, 1],
                    ["y", "上下の移動 (%)", -100, 100, 1],
                    ["scale", "サイズ (%)", 20, 200, 5],
                    ["rotation", "回転 (°)", 0, 360, 1],
                    ["opacity", "不透明度 (%)", 0, 100, 5],
                  ] as const
                ).map(([key, label, min, max, step]) => {
                  const p =
                    draft.placements?.[selectedElement] || defaultPlacement;
                  const multiplier =
                    key === "scale" || key === "opacity" ? 100 : 1;
                  return (
                    <label key={key}>
                      {label}
                      <input
                        aria-label={label}
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={(p[key] || 0) * multiplier}
                        onChange={(e) =>
                          changeDraft("placements", {
                            ...draft.placements,
                            [selectedElement]: {
                              ...p,
                              [key]: Number(e.target.value) / multiplier,
                            },
                          })
                        }
                      />
                      <output>{Math.round((p[key] || 0) * multiplier)}</output>
                    </label>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    changeDraft("placements", {
                      ...draft.placements,
                      [selectedElement]: defaultPlacement,
                    })
                  }
                >
                  この要素を元の配置に戻す
                </button>
              </section>
              <label>
                アニメーション
                <select
                  value={draft.animation}
                  onChange={(e) =>
                    changeDraft(
                      "animation",
                      e.target.value as Slide["animation"],
                    )
                  }
                >
                  {Object.entries(animations).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {(draft.animation === "orbit" || (draft.artworkKind && draft.artworkKind !== "none")) && (
                <label>
                  回転の周期（秒）
                  <input
                    aria-label="回転の周期（秒）"
                    type="number"
                    min="2"
                    max="120"
                    value={draft.animationDuration || 38}
                    onChange={(e) =>
                      changeDraft(
                        "animationDuration",
                        Math.max(2, Math.min(120, Number(e.target.value))),
                      )
                    }
                  />
                </label>
              )}
              {hasLayoutItems(draft.layout) &&
                draft.items.map((item, i) => (
                  <div className="item-fields" key={i}>
                    <label>
                      項目 {i + 1}
                      <input
                        value={item.title}
                        maxLength={60}
                        onChange={(e) =>
                          changeDraft(
                            "items",
                            draft.items.map((x, j) =>
                              i === j ? { ...x, title: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <textarea
                      aria-label={`項目 ${i + 1} の本文`}
                      value={item.body}
                      maxLength={180}
                      onChange={(e) =>
                        changeDraft(
                          "items",
                          draft.items.map((x, j) =>
                            i === j ? { ...x, body: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              <label>
                スピーカーノート
                <textarea
                  value={draft.notes}
                  maxLength={20000}
                  rows={3}
                  onChange={(e) => changeDraft("notes", e.target.value)}
                />
              </label>
              <label>
                変更メモ（任意）
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="例：冒頭のメッセージを明確にする"
                  maxLength={1000}
                />
              </label>
              <div className="edit-actions">
                <button disabled={!drafts[slide.id]} onClick={discardDraft}>
                  取り消す
                </button>
                <button
                  className="primary"
                  disabled={locked || !drafts[slide.id]}
                  onClick={()=>applyDraft()}
                >
                  {saving ? (
                    <Loader2 size={13} className="spin" />
                  ) : (
                    <Check size={13} />
                  )}{" "}
                  変更を保存
                </button>
              </div>
            </fieldset>
          ) : (
            <div className="log-content">
              <div className="log-intro">
                <h2>意思決定ログ</h2>
                <p>何を、なぜ変えたのか。</p>
                <select
                  aria-label="ログの絞り込み"
                  value={filterLog ? "slide" : "all"}
                  onChange={(e) => setFilterLog(e.target.value === "slide")}
                >
                  <option value="all">すべてのスライド</option>
                  <option value="slide">選択中のスライド</option>
                </select>
              </div>
              {!logs.length ? (
                <div className="log-empty">
                  <History size={26} />
                  <h3>ここから、思考の記録を。</h3>
                  <p>
                    変更を保存すると、対象・変更前後・理由がここに残ります。
                  </p>
                </div>
              ) : (
                logs.map((log) => (
                  <article className="log-entry" key={log.id}>
                    <div className="log-meta">
                      <strong>v{log.version}</strong>
                      <span>{log.actor}</span>
                      <time>
                        {new Date(log.at).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <h3>{log.reason}</h3>
                    {log.changes.map((c, i) => (
                      <details key={i} className="log-diff">
                        <summary>
                          {c.slideTitle.replaceAll("\n", "")}
                          <span>{c.field}</span>
                        </summary>
                        <div className="diff">
                          <del>{c.before || "（空欄）"}</del>
                          <ins>{c.after || "（空欄）"}</ins>
                        </div>
                      </details>
                    ))}
                    <button
                      className="restore-button"
                      disabled={locked || log.version === work.version}
                      onClick={async () => {
                        try {
                          busy.current = true;
                          setSaving(true);
                          const payload = {
                            version: work.version,
                            requestId: crypto.randomUUID(),
                            restoreVersion: log.version,
                            reason: `版 v${log.version} の判断に戻す`,
                            actor: "履歴の復元",
                          };
                          pending.current = payload;
                          const next = await request(deckUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });
                          pending.current = null;
                          setWorkspace(next);
                          setDrafts({});
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          busy.current = false;
                          setSaving(false);
                        }
                      }}
                    >
                      <RotateCcw size={11} />
                      {log.version === work.version
                        ? "現在の版"
                        : "この版に復元"}
                    </button>
                  </article>
                ))
              )}
              <div className="initial-version">
                <span>v0 · 操作サンプル</span>
                <button
                  disabled={locked || work.version === 0}
                  onClick={() => {
                    void commit(
                      initialDeck,
                      "初期サンプルの状態に戻す",
                      "履歴の復元",
                      0,
                    )
                      .then(() => setDrafts({}))
                      .catch(() => {});
                  }}
                >
                  <RotateCcw size={11} /> 復元
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
      {present && (
        <div
          className={`presentation ${controlsVisible ? "" : "presentation-clean"}`}
          role="dialog"
          aria-modal="true"
          aria-label="プレゼンテーション"
        >
          <div className="presentation-header" hidden={!controlsVisible}>
            <span>
              <BrandLogo/> <small>{work.deck.title}</small>
            </span>
            <button onClick={openPresenter}>発表者画面</button>
            <button onClick={exitPresent} autoFocus>
              <X size={16} /> 終了 <kbd>Esc</kbd>
            </button>
          </div>
          <div
            className="presentation-viewport"
            ref={presentationViewport}
            onClick={()=>{if(!marker && presentationZoom.zoom===1)advancePresentation();}}
            onDoubleClick={() => {
              if (!marker) presentationZoom.reset();
            }}
          >
            <div
              className="presentation-canvas"
              style={{
                transform: `translate(${presentationZoom.x}px,${presentationZoom.y}px) scale(${presentationZoom.zoom})`,
              }}
            >
              <SlideView
                revealStep={revealStep}
                key={"present" + slide.id + replay}
                slide={visibleSlide}
                index={selected}
                total={work.deck.slides.length}
                animate={playing}
                marker={marker && !locked}
                color={color}
                penWidth={penWidth}
                onDraw={draw}
              />
            </div>
          </div>
          {!controlsVisible && (
            <button
              className="show-presentation-controls"
              aria-label="操作バーを表示（H）"
              onClick={() => setControlsVisible(true)}
            >
              操作を表示 <kbd>H</kbd>
            </button>
          )}
          {presentationRecords.status.startsWith('保存できません')&&<div className="presentation-save" role="alert">{presentationRecords.status}</div>}
          {memoOpen&&<section className="presentation-memo-panel" aria-label="プレゼンメモ">
            <header><strong>スライド {selected+1} のメモ</strong><button aria-label="メモを閉じる" onClick={()=>setMemoOpen(false)}>×</button></header>
            <p>このパネルは投影画面にも表示されます。非公開の入力は発表者画面で。</p>
            <textarea autoFocus aria-label="プレゼン中のメモ" maxLength={10000} value={presentationRecords.records[slide.id]?.memo||''} onChange={e=>presentationRecords.update(slide.id,{memo:e.target.value})} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();setMemoOpen(false);}}}/>
            <small role="status">{presentationRecords.status}</small>
          </section>}
          <div className="presentation-controls" hidden={!controlsVisible}>
            <button aria-label="プレゼンメモを開く" aria-expanded={memoOpen} onClick={()=>setMemoOpen(v=>!v)}>メモ</button>
            <button
              disabled={selected === 0 && revealStep===0}
              aria-label="前のスライド（プレゼン）"
              onClick={backPresentation}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {pad(selected + 1)} / {pad(work.deck.slides.length)}
            </span>
            <button
              disabled={selected === work.deck.slides.length - 1 && nextStep(slide,revealStep)===undefined}
              aria-label="次のスライド（プレゼン）"
              onClick={advancePresentation}
            >
              <ChevronRight size={18} />
            </button>
            <i />
            <button
              className={!marker ? "chosen" : ""}
              aria-label="選択（プレゼン）"
              onClick={() => setMarker(false)}
            >
              <MousePointer2 size={16} />
            </button>
            <button
              className={marker ? "chosen" : ""}
              aria-label="マーカー（プレゼン）"
              onClick={() => setMarker((m) => !m)}
            >
              <Highlighter size={16} />
            </button>
            <div className="ink-colors">
              {(["yellow", "pink", "blue", "red", "green"] as const).map((c) => (
                <button
                  key={c}
                  className={`color-${c} ${color === c ? "chosen" : ""}`}
                  onClick={() => {
                    setColor(c);
                    setMarker(true);
                  }}
                  aria-label={`${c} マーカー（プレゼン）`}
                />
              ))}
            </div>
            <label className="pen-width">太さ <select aria-label="ペンの太さ（プレゼン）" value={penWidth} onChange={e=>setPenWidth(Number(e.target.value))}>
              <option value={6}>細い</option><option value={18}>標準</option><option value={32}>太い</option>
            </select></label>
            <button
              disabled={locked || !(presentationRecords.records[slide.id]?.ink.length)}
              aria-label="マーカーを取り消す（プレゼン）"
              onClick={undoInk}
            >
              <Undo2 size={16} />
            </button>
            <button aria-label="このスライドのマーカーを消去" disabled={!presentationRecords.records[slide.id]?.ink.length} onClick={()=>presentationRecords.update(slide.id,{ink:[]})}>消去</button>
            <i />
            <button
              aria-label="アニメーション再生切替"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              aria-label="再生し直す"
              onClick={() => {
                setPlaying(true);
                setReplay((r) => r + 1);
              }}
            >
              <RotateCcw size={15} />
            </button>
            <button
              aria-label="ズームをリセット"
              title="ピンチで拡大縮小・2本指スクロールで移動"
              onClick={presentationZoom.reset}
            >
              {Math.round(presentationZoom.zoom * 100)}%
            </button>
            <button
              aria-label="操作バーを非表示（H）"
              title="Hキーで表示・非表示"
              onClick={() => setControlsVisible(false)}
            >
              隠す <kbd>H</kbd>
            </button>
          </div>
          {(saving || error) && (
            <div className="presentation-save" role="status">
              {saving ? "マーカーを保存中…" : error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SideImageControl({value,onChange,onError}:{value:Slide['sideImage'];onChange:(value:Slide['sideImage'])=>void;onError:(message:string)=>void}) {
 const [busy,setBusy]=useState(false);
 return <section className="side-image-control"><h3>右側の画像</h3><p>画像を右3割いっぱいに表示します。</p><label>{busy?'読み込み中…':'画像を選ぶ・差し替える'}<input type="file" aria-label="右側の画像を選ぶ" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);try{onChange({src:await uploadImage(file),position:50});}catch(error){onError((error as Error).message);}finally{setBusy(false);}}}/></label>{value&&<><label>切り抜き位置<input aria-label="右画像の切り抜き位置" type="range" min="0" max="100" value={value.position} onChange={e=>onChange({...value,position:Number(e.target.value)})}/></label><button type="button" onClick={()=>onChange(null)}>画像を外す</button></>}</section>;
}
