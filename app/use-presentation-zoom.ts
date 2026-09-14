"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
export function usePresentationZoom(
  target: RefObject<HTMLDivElement | null>,
  active: boolean,
  slideId: string,
) {
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const current = useRef(view);
  current.current = view;
  const reset = () => setView({ zoom: 1, x: 0, y: 0 });
  useEffect(() => {
    reset();
  }, [slideId, active]);
  useEffect(() => {
    const node = target.current;
    if (!active || !node) return;
    let initial = 1;
    const clamp = (z: number) => Math.max(0.5, Math.min(3, z));
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setView((v) => ({
          zoom: clamp(v.zoom * Math.exp(-e.deltaY * 0.008)),
          x: 0,
          y: 0,
        }));
      } else if (current.current.zoom > 1) {
        e.preventDefault();
        setView((v) => {
          const bounds = node.getBoundingClientRect();
          const mx = (bounds.width * (v.zoom - 1)) / 2,
            my = (bounds.height * (v.zoom - 1)) / 2;
          return {
            ...v,
            x: Math.max(-mx, Math.min(mx, v.x - e.deltaX)),
            y: Math.max(-my, Math.min(my, v.y - e.deltaY)),
          };
        });
      }
    };
    const start = (event: Event) => {
      event.preventDefault();
      initial = current.current.zoom;
    };
    const change = (event: Event) => {
      event.preventDefault();
      const scale = (event as Event & { scale: number }).scale;
      if (Number.isFinite(scale))
        setView({ zoom: clamp(initial * scale), x: 0, y: 0 });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    node.addEventListener("gesturestart", start, { passive: false });
    node.addEventListener("gesturechange", change, { passive: false });
    return () => {
      node.removeEventListener("wheel", wheel);
      node.removeEventListener("gesturestart", start);
      node.removeEventListener("gesturechange", change);
    };
  }, [target, active]);
  return { ...view, reset };
}
