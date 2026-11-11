import { useState } from "react";
import { dropCover, dropProgress, productsByStage, stalledProducts, STAGE_NAMES, type DropStatus, type Product } from "./model";
import { StudioImage, useStudio } from "./studio";
import { go, SideTag, StageTag } from "./ui";

const STATUS_NAMES: Record<DropStatus, string> = { planning: "Planning", "in progress": "In progress", launched: "Launched" };

export function Drops() {
  const studio = useStudio();
  const { drops, products } = studio.data;
  const loose = products.filter((p) => !p.drop_id || !drops.some((d) => d.id === p.drop_id));
  const stalled = stalledProducts(products).slice(0, 4);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">The World Series and beyond</p>
          <h1>Drops</h1>
        </div>
        <button className="button" onClick={() => go(`/drop/${studio.addDrop().id}`)}>
          + New drop
        </button>
      </header>

      {stalled.length > 0 && (
        <section className="stalled">
          <h2>Pick up where you left off</h2>
          <div className="piece-row">
            {stalled.map((p) => (
              <PieceCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <div className="drop-grid">
        {[...drops]
          .sort((a, b) => a.sort - b.sort)
          .map((drop) => {
            const pieces = products.filter((p) => p.drop_id === drop.id);
            const progress = dropProgress(pieces);
            return (
              <a key={drop.id} className="drop-card" href={`#/drop/${drop.id}`}>
                <div className="drop-cover">
                  {dropCover(drop, products) ? (
                    <StudioImage path={dropCover(drop, products)} alt="" />
                  ) : (
                    <span className="drop-cover-name">{drop.name}</span>
                  )}
                </div>
                <div className="drop-card-body">
                  <div className="drop-card-top">
                    <h3>{drop.name}</h3>
                    <span className={`status ${drop.status.replace(" ", "-")}`}>{STATUS_NAMES[drop.status]}</span>
                  </div>
                  <p>
                    {pieces.length} piece{pieces.length === 1 ? "" : "s"}
                    {pieces.length > 0 && ` · ${Math.round(progress * 100)}% ready`}
                  </p>
                  <div className="progress" aria-hidden="true">
                    <span style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              </a>
            );
          })}
      </div>

      {loose.length > 0 && (
        <section className="loose">
          <h2>Not in a drop yet</h2>
          <div className="piece-grid">
            {loose.map((p) => (
              <PieceCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function PieceCard({ product }: { product: Product }) {
  return (
    <a className="piece-card" href={`#/product/${product.id}`}>
      <div className="piece-image">
        {product.images[0] ? <StudioImage path={product.images[0]} alt="" /> : <span className="piece-type">{product.type}</span>}
      </div>
      <div className="piece-body">
        <h3>{product.name}</h3>
        <div className="piece-tags">
          <StageTag stage={product.stage} />
          <SideTag side={product.side} />
        </div>
      </div>
    </a>
  );
}

export function DropPage({ id }: { id: string }) {
  const studio = useStudio();
  const drop = studio.data.drops.find((d) => d.id === id);
  const [view, setView] = useState<"board" | "grid">("board");
  const [confirming, setConfirming] = useState(false);

  if (!drop) {
    return (
      <div className="page">
        <p className="empty">This drop doesn't exist any more.</p>
        <a className="button" href="#/drops">
          Back to drops
        </a>
      </div>
    );
  }

  const pieces = studio.data.products.filter((p) => p.drop_id === drop.id);
  const columns = productsByStage(pieces);

  return (
    <div className="page">
      <a className="back" href="#/drops">
        ← Drops
      </a>
      <header className="drop-head">
        <input
          className="title-input"
          value={drop.name}
          onChange={(e) => studio.updateDrop({ ...drop, name: e.target.value })}
          aria-label="Drop name"
        />
        <div className="drop-head-actions">
          <select
            value={drop.status}
            onChange={(e) => studio.updateDrop({ ...drop, status: e.target.value as DropStatus })}
            aria-label="Drop status"
          >
            {Object.entries(STATUS_NAMES).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
          <a className={`button ghost ${pieces.length ? "" : "disabled"}`} href={pieces.length ? `#/present/${drop.id}` : undefined}>
            Present
          </a>
          <button className="button" onClick={() => go(`/product/${studio.addProduct({ drop_id: drop.id, name: "New piece" }).id}`)}>
            + New piece
          </button>
        </div>
      </header>
      <textarea
        className="theme-input"
        value={drop.theme}
        onChange={(e) => studio.updateDrop({ ...drop, theme: e.target.value })}
        placeholder="The story behind this drop: theme, colours, references…"
        rows={3}
        aria-label="Drop theme"
      />

      <div className="view-toggle" role="radiogroup" aria-label="View">
        {(["board", "grid"] as const).map((v) => (
          <button key={v} role="radio" aria-checked={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
            {v === "board" ? "By stage" : "Grid"}
          </button>
        ))}
      </div>

      {pieces.length === 0 ? (
        <p className="empty">No pieces yet. Add one, or send an idea here from the Inbox.</p>
      ) : view === "grid" ? (
        <div className="piece-grid">
          {pieces.map((p) => (
            <PieceCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="board">
          {columns.map(({ stage, products }) => (
            <section key={stage} className="column">
              <h3>
                {STAGE_NAMES[stage]} <span>{products.length}</span>
              </h3>
              {products.map((p) => (
                <PieceCard key={p.id} product={p} />
              ))}
            </section>
          ))}
        </div>
      )}

      <footer className="danger-zone">
        {confirming ? (
          <>
            <span>Delete this drop? Its pieces stay, under "Not in a drop yet".</span>
            <button
              className="button danger small"
              onClick={() => {
                studio.deleteDrop(drop.id);
                go("/drops");
              }}
            >
              Delete drop
            </button>
            <button className="text-button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="text-button muted" onClick={() => setConfirming(true)}>
            Delete this drop
          </button>
        )}
      </footer>
    </div>
  );
}
