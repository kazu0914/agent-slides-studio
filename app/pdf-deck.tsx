"use client";
import { useEffect, useState } from "react";
import { SlideView } from "./studio-client";
import { type Workspace } from "@/lib/model";
export default function PdfDeck({ deckId }: { deckId: string }) {
  const [work, setWork] = useState<Workspace | null>(null);
  useEffect(() => {
    fetch(`/api/deck?deckId=${encodeURIComponent(deckId)}`)
      .then((r) => {
        if (!r.ok) throw Error("デッキを取得できません");
        return r.json();
      })
      .then((w) => setWork(w as Workspace))
      .catch(() => {});
  }, [deckId]);
  return (
    <main className="pdf-render" data-ready={!!work}>
      {work?.deck.slides.map((slide, i) => (
        <div className="export-slide" key={slide.id}>
          <SlideView
            slide={{...slide, strokes: []}}
            index={i}
            total={work.deck.slides.length}
            animate={false}
          />
        </div>
      ))}
    </main>
  );
}
