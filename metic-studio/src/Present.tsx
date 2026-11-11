import { useEffect, useRef, useState } from "react";
import { formatPrice, STAGES } from "./model";
import { StudioImage, useStudio } from "./studio";
import { go, Wordmark } from "./ui";

/** A full-screen lookbook of one drop, for showing someone on the iPad. Swipe or use the arrow keys. */
export default function Present({ id }: { id: string }) {
  const studio = useStudio();
  const drop = studio.data.drops.find((d) => d.id === id);
  // Most finished pieces first
  const pieces = studio.data.products
    .filter((p) => p.drop_id === id)
    .sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage));
  const [index, setIndex] = useState(0); // 0 is the title page
  const total = pieces.length + 1;
  const exit = () => go(drop ? `/drop/${drop.id}` : "/drops");
  const touchX = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    studio.loadUrls(pieces.flatMap((p) => p.images.slice(0, 1)));
    // Only when the number of pieces changes
  }, [pieces.length]);

  if (!drop) return null;

  const piece = index > 0 ? pieces[index - 1] : null;

  return (
    <div
      className="present"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -50) setIndex((i) => Math.min(i + 1, total - 1));
        if (dx > 50) setIndex((i) => Math.max(i - 1, 0));
      }}
    >
      <header className="present-bar">
        <Wordmark />
        <button className="present-exit" onClick={exit} aria-label="Exit lookbook">
          ×
        </button>
      </header>

      {piece ? (
        <main className="present-piece" key={piece.id}>
          <div className="present-image">
            {piece.images[0] ? <StudioImage path={piece.images[0]} alt={piece.name} /> : <span>{piece.type}</span>}
          </div>
          <div className="present-text">
            <p className="eyebrow">
              {drop.name} · {index} of {pieces.length}
            </p>
            <h1>{piece.name}</h1>
            <p className="present-meta">
              {[piece.type, piece.colourways.join(" / "), formatPrice(piece.price)].filter(Boolean).join(" · ")}
            </p>
          </div>
        </main>
      ) : (
        <main className="present-title">
          <p className="eyebrow">Quiet Souls. Loud Visions.</p>
          <h1>{drop.name}</h1>
          {drop.theme && <p className="present-theme">{drop.theme}</p>}
        </main>
      )}

      <nav className="present-nav">
        <button onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0} aria-label="Previous">
          ←
        </button>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i === index ? "on" : ""} />
          ))}
        </div>
        <button onClick={() => setIndex((i) => Math.min(i + 1, total - 1))} disabled={index === total - 1} aria-label="Next">
          →
        </button>
      </nav>
    </div>
  );
}
