import { z } from "zod";
import {objectSchema,textStyleSchema} from "./objects";
export const strokeSchema = z.object({
  width: z.number().min(2).max(40).optional(),
  id: z.string().max(80),
  color: z.enum(["yellow", "pink", "blue", "red", "green"]),
  points: z
    .array(z.tuple([z.number().min(0).max(1600), z.number().min(0).max(900)]))
    .max(2500),
});
export const slideSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().max(90),
  body: z.string().max(600),
  eyebrow: z.string().max(80),
  layout: z.enum(["hero", "statement", "cards", "flow", "comparison", "metrics", "timeline", "agenda", "quote", "section"]),
  theme: z.enum(["blue", "white", "dark"]),
  imported: z.boolean().optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  backgroundTemplate: z.enum(["none", "bg_1", "bg_2", "bg_3", "bg_4", "bg_5", "bg_6"]).optional(),
  animation: z.enum(["orbit", "reveal", "none"]),
  artworkKind: z.enum(["holo-cards",'holo-database','holo-server','holo-target','holo-funnel','holo-pyramid','holo-solar','holo-gears','holo-platform','holo-honeycomb','holo-equalizer','holo-prism','holo-chart','holo-network','holo-flow','holo-grid','holo-document','holo-shield','holo-cloud','holo-compare','holo-timeline', "orbit", "arrow", "none", "cube", "globe", "rings", "helix", "crystal", "wave", "particles", "pulse", "bars"]).optional(),
  revealSteps:z.object({title:z.number().int().min(0).max(100).optional(),body:z.number().int().min(0).max(100).optional(),eyebrow:z.number().int().min(0).max(100).optional(),items:z.number().int().min(0).max(100).optional(),artwork:z.number().int().min(0).max(100).optional()}).optional(),
  notes: z.string().max(4000),
  objects: z.array(objectSchema).max(100).optional(),
  textStyles: z.object({title:textStyleSchema.optional(),body:textStyleSchema.optional(),eyebrow:textStyleSchema.optional(),items:textStyleSchema.optional()}).optional(),
  placements: z
    .object(
      Object.fromEntries(
        ["title", "body", "eyebrow", "artwork", "items"].map((key) => [
          key,
          z
            .object({
              x: z.number().min(-100).max(100),
              y: z.number().min(-100).max(100),
              scale: z.number().min(0.2).max(2),
              rotation: z.number().min(0).max(360).optional(),
              width: z.number().min(2).max(200).optional(),
              height: z.number().min(1).max(200).optional(),
              opacity: z.number().min(0).max(1),
            })
            .optional(),
        ]),
      ),
    )
    .optional(),
  arrowWidth:z.number().min(1).max(24).optional(),
  artworkColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  animationDuration: z.number().min(2).max(120).optional(),
  items: z
    .array(z.object({ title: z.string().max(60), body: z.string().max(180), box:z.object({x:z.number().min(-100).max(200),y:z.number().min(-200).max(300),w:z.number().min(5).max(300),h:z.number().min(10).max(400)}).optional() }))
    .max(4),
  strokes: z.array(strokeSchema).max(100),
});
export const deckSchema = z
  .object({
    title: z.string().min(1).max(100),
    slides: z.array(slideSchema).min(1).max(50),
  })
  .superRefine((d, c) => {
    for(const slide of d.slides){if(new Set((slide.objects||[]).map(o=>o.id)).size!==(slide.objects||[]).length)c.addIssue({code:"custom",message:"要素IDが重複しています"});}
    if (new Set(d.slides.map((s) => s.id)).size !== d.slides.length)
      c.addIssue({ code: "custom", message: "スライドIDが重複しています" });
  });
export type Slide = z.infer<typeof slideSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type Stroke = z.infer<typeof strokeSchema>;
export type Change = {
  slideId: string;
  slideTitle: string;
  field: string;
  before: string;
  after: string;
};
export type Log = {
  version: number;
  id: string;
  at: string;
  actor: string;
  reason: string;
  changes: Change[];
};
export type Workspace = { deck: Deck; version: number; logs: Log[] };
export const fieldNames: Record<string, string> = {
  title: "タイトル",
  body: "本文",
  eyebrow: "ラベル",
  layout: "レイアウト",
  theme: "背景",
  backgroundTemplate: "背景テンプレート",
  animation: "アニメーション",
  artworkKind: "装飾の追加・削除",
  arrowWidth: "矢印の太さ",
  artworkColor: "アニメーションの色",
  notes: "ノート",
  revealSteps:"クリック表示の順番",
  objects: "自由配置の要素・レイヤー",
  textStyles: "文字の書式",
  placements: "要素の位置・サイズ・透明度",
  animationDuration: "アニメーションの周期",
  items: "カード・図解",
  strokes: "マーカー",
  order: "並び順",
};
export const initialDeck: Deck = {
  title: "アイデアを、動かそう。",
  slides: [
    {
      id: "opening",
      title: "アイデアを、\n動かそう。",
      body: "考える。つくる。伝える。\nエージェントと広げる、プレゼンテーション。",
      eyebrow: "FRAME / AGENT SLIDES",
      layout: "hero",
      theme: "blue",
      animation: "orbit",
      notes:
        "このデッキは操作を試すためのサンプルです。自分のテーマに書き換えて使ってください。",
      items: [],
      strokes: [],
    },
    {
      id: "possibility",
      title: "伝えるから、\n一緒に考えるへ。",
      body: "スライドは、完成した答えを並べるだけではない。\n対話の中で生まれる気づきを、その場で描き足そう。",
      eyebrow: "A NEW WAY TO PRESENT",
      layout: "statement",
      theme: "white",
      animation: "reveal",
      notes:
        "プレゼン中に M キーでマーカーを選び、伝えたい言葉に線を引いてみましょう。",
      items: [],
      strokes: [],
    },
    {
      id: "features",
      title: "思考を止めない、\n３つの機能。",
      body: "つくる時間から、伝える瞬間まで。",
      eyebrow: "MADE FOR YOUR WORKFLOW",
      layout: "cards",
      theme: "white",
      animation: "reveal",
      notes: "各カードが順番に表示されます。動きを止めることもできます。",
      items: [
        {
          title: "動きで伝える",
          body: "アニメーションで、話の流れと視線をつくる。",
        },
        {
          title: "その場で描く",
          body: "マーカーを引きながら、伝えたいポイントを強調。",
        },
        { title: "理由を残す", body: "変更前後と判断の背景を、一つのログに。" },
      ],
      strokes: [],
    },
    {
      id: "decisions",
      title: "判断の理由まで、\n資産にする。",
      body: "何を変えたか。その理由は何か。\n次の判断につながる、意思決定ログ。",
      eyebrow: "DECISIONS, WITH CONTEXT",
      layout: "flow",
      theme: "dark",
      animation: "reveal",
      notes:
        "変更履歴では変更前・変更後・理由・実行者を確認できます。過去の版も復元できます。",
      items: [
        { title: "提案", body: "対象と変更内容を確認" },
        { title: "判断", body: "採用する理由を記録" },
        { title: "更新", body: "変更前後を保存" },
      ],
      strokes: [],
    },
    {
      id: "closing",
      title: "次の一枚を、\nここから。",
      body: "あなたのアイデアを、あなたの言葉で。",
      eyebrow: "YOUR NEXT CHAPTER",
      layout: "hero",
      theme: "blue",
      animation: "orbit",
      notes: "左下の「スライドを追加」から新しい一枚を作れます。",
      items: [],
      strokes: [],
    },
  ],
};
function display(v: unknown, key: string) {
  if (key === "strokes") return `${Array.isArray(v) ? v.length : 0} 本`;
  if (typeof v === "string") return v;
  return JSON.stringify(v ?? null);
}
export function diffDeck(before: Deck, after: Deck): Change[] {
  const changes: Change[] = [];
  if (before.title !== after.title)
    changes.push({
      slideId: "deck",
      slideTitle: "デッキ全体",
      field: "デッキ名",
      before: before.title,
      after: after.title,
    });
  for (const s of before.slides) {
    if (!after.slides.some((n) => n.id === s.id))
      changes.push({
        slideId: s.id,
        slideTitle: s.title,
        field: "スライド削除",
        before: s.title,
        after: "削除",
      });
  }
  for (const s of after.slides) {
    const old = before.slides.find((n) => n.id === s.id);
    if (!old) {
      changes.push({
        slideId: s.id,
        slideTitle: s.title,
        field: "スライド追加",
        before: "なし",
        after: s.title,
      });
      continue;
    }
    for (const key of Object.keys(fieldNames).filter((k) => k !== "order")) {
      if (key === "placements") {
        const labels: Record<string, string> = {
          title: "タイトル",
          body: "本文",
          eyebrow: "ラベル",
          artwork: "アニメーション・装飾",
          items: "カード・図解",
        };
        const props = {
          x: "左右位置",
          y: "上下位置",
          scale: "サイズ",
          rotation: "回転角度",
          width: "枠の幅",
          height: "枠の高さ",
          opacity: "不透明度",
        };
        for (const [element, label] of Object.entries(labels))
          for (const [prop, propertyLabel] of Object.entries(props)) {
            const defaults: Record<string, number> = {
              x: 0,
              y: 0,
              scale: 1,
              rotation: 0,
              width: 0,
              height: 0,
              opacity: 1,
            };
            const a =
              (
                old.placements?.[element] as Record<string, number> | undefined
              )?.[prop] ?? defaults[prop];
            const b =
              (s.placements?.[element] as Record<string, number> | undefined)?.[
                prop
              ] ?? defaults[prop];
            if (a !== b)
              changes.push({
                slideId: s.id,
                slideTitle: s.title,
                field: `${label}：${propertyLabel}`,
                before: `${Math.round(a * (prop === "scale" || prop === "opacity" ? 100 : 1) * 100) / 100}${prop === "rotation" ? "°" : "%"}`,
                after: `${Math.round(b * (prop === "scale" || prop === "opacity" ? 100 : 1) * 100) / 100}${prop === "rotation" ? "°" : "%"}`,
              });
          }
        continue;
      }
      const k = key as keyof Slide;
      if (JSON.stringify(old[k]) !== JSON.stringify(s[k]))
        changes.push({
          slideId: s.id,
          slideTitle: s.title,
          field: fieldNames[key],
          before: display(old[k], key),
          after: display(s[k], key),
        });
    }
  }
  if (
    before.slides
      .filter((s) => after.slides.some((n) => n.id === s.id))
      .map((s) => s.id)
      .join(",") !==
    after.slides
      .filter((s) => before.slides.some((n) => n.id === s.id))
      .map((s) => s.id)
      .join(",")
  )
    changes.push({
      slideId: "deck",
      slideTitle: "デッキ全体",
      field: "並び順",
      before: before.slides
        .map((s) => s.title.replaceAll("\n", ""))
        .join(" → "),
      after: after.slides.map((s) => s.title.replaceAll("\n", "")).join(" → "),
    });
  return changes;
}
export const patchSchema = z.object({
  slideId: z.string(),
  changes: slideSchema.omit({ id: true, strokes: true }).partial(),
});
export const proposalSchema = z
  .object({
    reason: z.string().min(1).max(1000),
    patches: z.array(patchSchema).max(50).default([]),
    deck: deckSchema.optional(),
  })
  .refine(
    (p) => (p.deck ? p.patches.length === 0 : p.patches.length > 0),
    "全体のデッキか部分変更のどちらかを指定してください。",
  );
export type Proposal = z.infer<typeof proposalSchema>;
export function applyProposal(deck: Deck, input: unknown) {
  const proposal = proposalSchema.parse(input);
  const result = structuredClone(proposal.deck ?? deck);
  for (const patch of proposal.patches) {
    const s = result.slides.find((x) => x.id === patch.slideId);
    if (!s) throw new Error(`対象スライドが見つかりません: ${patch.slideId}`);
    Object.assign(s, patch.changes);
  }
  return deckSchema.parse(result);
}
