"use client";
import { createElement, useLayoutEffect, useRef, useState } from "react";

type CanvasTextProps = {
  as: "div" | "h2" | "h3" | "p";
  value: string;
  label: string;
  limit: number;
  editable: boolean;
  className?: string;
  style?: React.CSSProperties;
  elementKey?: string;
  onChange: (value: string) => void;
  onActivate?: () => void;
};

export function CanvasText({
  as,
  value,
  label,
  limit,
  editable,
  className = "",
  style,
  elementKey,
  onChange,
  onActivate,
}: CanvasTextProps) {
  const [overflow,setOverflow] = useState(false);
  const element = useRef<HTMLElement | null>(null);
  const initialValue = useRef(value);
  const composing = useRef(false);
  const latestValue = useRef(value);
  latestValue.current = value;

  // 入力中のDOMはブラウザに任せ、フォームからの変更だけを同期する。
  useLayoutEffect(() => {
    if (
      element.current &&
      document.activeElement !== element.current &&
      element.current.textContent !== value
    ) {
      element.current.textContent = value;
    }
  }, [value, editable]);

  useLayoutEffect(()=>{const el=element.current;if(!el)return;const check=()=>{const box=el.getBoundingClientRect(),slide=el.closest('[data-testid="slide-canvas"]')?.getBoundingClientRect();setOverflow(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2||!!(slide&&(box.right>slide.right+2||box.bottom>slide.bottom+2||box.left<slide.left-2||box.top<slide.top-2)));};check();const ro=new ResizeObserver(check);ro.observe(el);return()=>ro.disconnect();},[value,style]);
  function publish(target: HTMLElement) {
    const text = target.innerText.replace(/\r\n?/g, "\n");
    const limited = text.slice(0, limit).replace(/[\uD800-\uDBFF]$/, "");
    if (limited !== text) {
      target.textContent = limited;
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    if (limited !== latestValue.current) onChange(limited);
  }

  return createElement(
    as,
    {
      ref: element,
      style,
      "data-text-overflow": overflow ? "true" : undefined,
      title: editable&&overflow?"文字がスライドの範囲を超えています":undefined,
      "data-edit-element": elementKey,
      className: `${className} ${editable ? "canvas-text-editable" : ""}`,
      contentEditable: editable ? "plaintext-only" : false,
      suppressContentEditableWarning: true,
      spellCheck: false,
      role: editable ? "textbox" : undefined,
      "aria-label": editable ? `${label}（直接編集）` : undefined,
      "aria-multiline": editable ? true : undefined,
      "data-placeholder": label,
      tabIndex: editable ? 0 : undefined,
      onFocus: () => {
        if (editable) onActivate?.();
      },
      onInput: (event: React.FormEvent<HTMLElement>) => {
        if (!composing.current) publish(event.currentTarget);
      },
      onCompositionStart: () => {
        composing.current = true;
      },
      onCompositionEnd: (event: React.CompositionEvent<HTMLElement>) => {
        composing.current = false;
        publish(event.currentTarget);
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        if (editable) {
          composing.current = false;
          publish(event.currentTarget);
        }
      },
    },
    initialValue.current,
  );
}
