"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
export type ElementKey = "title" | "body" | "eyebrow" | "artwork" | "items";
export type ElementPlacement = {
  x: number;
  y: number;
  scale: number;
  rotation?: number;
  width?: number;
  height?: number;
  opacity: number;
};
export const defaultPlacement: ElementPlacement = {
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
};
export const elementLabels: Record<ElementKey, string> = {
  title: "タイトル",
  body: "本文",
  eyebrow: "ラベル",
  artwork: "アニメーション・装飾",
  items: "カード・図解",
};
export function ElementControls({
  host,
  onlyKey,
  onDelete,
  selected,
  onSelect,
  placements,
  onChange,
  onBegin,
}: {
  host: RefObject<HTMLDivElement | null>;
  onlyKey?: ElementKey | "direct";
  onDelete?: (key: ElementKey) => void;
  selected: ElementKey;
  onSelect: (key: ElementKey) => void;
  placements: Partial<Record<ElementKey, ElementPlacement>>;
  onChange: (key: ElementKey, value: ElementPlacement) => void;
  onBegin: () => void;
}) {
  const [boxes, setBoxes] = useState<
    { key: ElementKey; x: number; y: number; w: number; h: number }[]
  >([]);
  const drag = useRef<{
    x: number;
    y: number;
    start: ElementPlacement;
    key: ElementKey;
    resize: boolean;
    width: number;
    height: number;
    diagonal: number;
    boxWidth: number;
    boxHeight: number;
    sx: number;
    sy: number;
  } | null>(null);
  useEffect(() => {
    const root = host.current;
    if (!root) return;
    const measure = () => {
      const r = root.getBoundingClientRect();
      setBoxes(
        Array.from(
          root.querySelectorAll<HTMLElement>("[data-edit-element]"),
        ).filter(el => !onlyKey || (onlyKey === "direct" ? el.dataset.editElement !== "items" : el.dataset.editElement === onlyKey)).map((el) => {
          const b = el.getBoundingClientRect();
          return {
            key: el.dataset.editElement as ElementKey,
            x: Math.max(0, ((b.x - r.x) / r.width) * 100),
            y: Math.max(0, ((b.y - r.y) / r.height) * 100),
            w: Math.max(
              1,
              ((Math.min(b.right, r.right) - Math.max(b.left, r.left)) /
                r.width) *
                100,
            ),
            h: Math.max(
              1,
              ((Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top)) /
                r.height) *
                100,
            ),
          };
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [host, placements, selected, onlyKey]);
  return (
    <div className="element-overlay">
      {boxes.map((box) => (
        <div
          key={box.key}
          data-element-key={box.key}
          data-direct-text={onlyKey === "direct" && box.key !== "artwork" ? "true" : undefined}
          className={`element-box ${selected === box.key ? "selected" : ""}`}
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.w}%`,
            height: `${box.h}%`,
          }}
          role="button"
          tabIndex={0}
          aria-label={`${elementLabels[box.key]}を移動`}
          onFocus={() => onSelect(box.key)}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.focus();
            onSelect(box.key);
            onBegin();
            const root = host.current!.getBoundingClientRect();
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              start: placements[box.key] || defaultPlacement,
              key: box.key,
              resize: (e.target as HTMLElement).dataset.resize === "true",
              sx: Number((e.target as HTMLElement).dataset.sx || 1),
              sy: Number((e.target as HTMLElement).dataset.sy || 1),
              boxWidth: box.w,
              boxHeight: box.h,
              width: root.width,
              height: root.height,
              diagonal: Math.max(
                30,
                Math.hypot(
                  (box.w * root.width) / 100,
                  (box.h * root.height) / 100,
                ),
              ),
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x,
              dy = e.clientY - d.y;
            if(d.resize && ['title','body','eyebrow'].includes(d.key)) {
              const angle=(d.start.rotation||0)*Math.PI/180;
              const localX=dx*Math.cos(angle)+dy*Math.sin(angle),localY=-dx*Math.sin(angle)+dy*Math.cos(angle);
              const scale=d.start.scale||1;
              const width=Math.max(2,Math.min(200,(d.start.width ?? d.boxWidth/scale)+localX*d.sx/d.width*100/scale));
              const height=Math.max(1,Math.min(200,(d.start.height ?? d.boxHeight/scale)+localY*d.sy/d.height*100/scale));
              onChange(d.key,{...d.start,width,height,x:Math.max(-100,Math.min(100,d.start.x+(d.sx<0?dx/d.width*100:0))),y:Math.max(-100,Math.min(100,d.start.y+(d.sy<0?dy/d.height*100:0)))});return;
            }
            onChange(
              d.key,
              d.resize
                ? {
                    ...d.start,
                    scale: Math.max(
                      0.2,
                      Math.min(
                        2,
                        d.start.scale *
                          (1 + (dx * d.sx + dy * d.sy) / d.diagonal),
                      ),
                    ),
                  }
                : {
                    ...d.start,
                    x: Math.max(
                      -100,
                      Math.min(100, d.start.x + (dx / d.width) * 100),
                    ),
                    y: Math.max(
                      -100,
                      Math.min(100, d.start.y + (dy / d.height) * 100),
                    ),
                  },
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
            if (onDelete && box.key === "artwork" && ["Delete", "Backspace"].includes(e.key)) {
              e.preventDefault(); e.stopPropagation(); onBegin(); onDelete(box.key); return;
            }
            if (
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              e.stopPropagation();
              onBegin();
              const p = placements[box.key] || defaultPlacement;
              onChange(box.key, {
                ...p,
                x: Math.max(
                  -100,
                  Math.min(
                    100,
                    p.x +
                      (e.key === "ArrowRight"
                        ? 1
                        : e.key === "ArrowLeft"
                          ? -1
                          : 0),
                  ),
                ),
                y: Math.max(
                  -100,
                  Math.min(
                    100,
                    p.y +
                      (e.key === "ArrowDown"
                        ? 1
                        : e.key === "ArrowUp"
                          ? -1
                          : 0),
                  ),
                ),
              });
            }
          }}
        >
          <span className="element-box-label">{elementLabels[box.key]}{box.key !== "artwork" ? " · 移動" : ""}</span>
          {(selected === box.key || (onlyKey === "direct" && box.key !== "artwork")) && (
            <>
              {[
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
              ].map(([sx, sy]) => (
                <span
                  key={`${sx}:${sy}`}
                  className="element-resize"
                  data-resize="true"
                  data-sx={sx}
                  data-sy={sy}
                  style={{
                    left: sx === -1 ? 0 : "auto",
                    right: sx === 1 ? 0 : "auto",
                    top: sy === -1 ? 0 : "auto",
                    bottom: sy === 1 ? 0 : "auto",
                  }}
                  aria-label="サイズ変更"
                />
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
