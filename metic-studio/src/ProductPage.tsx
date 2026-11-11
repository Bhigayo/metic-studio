import { useRef, useState } from "react";
import {
  formatPrice,
  nextStage,
  parseColourways,
  PRODUCT_TYPES,
  SIDE_HINTS,
  SIDE_NAMES,
  STAGE_NAMES,
  STAGES,
  type Product,
  type Side,
} from "./model";
import { StudioImage, useStudio } from "./studio";
import { go } from "./ui";

export default function ProductPage({ id }: { id: string }) {
  const studio = useStudio();
  const product = studio.data.products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="page">
        <p className="empty">This piece doesn't exist any more.</p>
        <a className="button" href="#/drops">
          Back to drops
        </a>
      </div>
    );
  }
  // Keyed so the form resets if you move to another piece
  return <ProductForm key={product.id} product={product} />;
}

function ProductForm({ product }: { product: Product }) {
  const studio = useStudio();
  const drop = studio.data.drops.find((d) => d.id === product.drop_id);
  const [selected, setSelected] = useState(0);
  const [colours, setColours] = useState(product.colourways.join(", "));
  const [price, setPrice] = useState(product.price === null ? "" : String(product.price));
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // The latest version of the piece, so a slow upload doesn't undo edits made while it ran
  const latest = useRef(product);
  latest.current = product;
  const update = (change: Partial<Product>) => studio.updateProduct({ ...latest.current, ...change });
  const main = product.images[Math.min(selected, product.images.length - 1)];
  const isCover = !!drop && !!main && drop.cover === main;

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setUploading({ done: 0, total: list.length });
    const paths = await studio.uploadImages(list, (done) => setUploading({ done, total: list.length }));
    setUploading(null);
    if (paths.length) update({ images: [...product.images, ...paths] });
  }

  return (
    <div className="page">
      <a className="back" href={drop ? `#/drop/${drop.id}` : "#/drops"}>
        ← {drop ? drop.name : "Drops"}
      </a>

      <div className="product">
        <section className="gallery">
          <div className="gallery-main">
            {main ? (
              <StudioImage path={main} alt={`${product.name} mockup`} />
            ) : (
              <button className="gallery-empty" onClick={() => fileInput.current?.click()}>
                <span>+</span>
                Add mockups or sketches
              </button>
            )}
          </div>
          <div className="gallery-thumbs" hidden={product.images.length === 0}>
            {product.images.map((path, i) => (
              <button
                key={path}
                className={`thumb ${path === main ? "on" : ""}`}
                onClick={() => setSelected(i)}
                aria-label={`Show image ${i + 1}`}
              >
                <StudioImage path={path} alt="" />
              </button>
            ))}
            <button className="thumb add" onClick={() => fileInput.current?.click()} disabled={!!uploading} aria-label="Add images">
              +
            </button>
            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => addImages(e.target.files).then(() => (e.target.value = ""))} />
          </div>
          {uploading && (
            <p className="uploading">
              Uploading {uploading.done} of {uploading.total}…
            </p>
          )}
          {main && (
            <div className="gallery-actions">
              {product.images.indexOf(main) > 0 && (
                <button
                  className="text-button"
                  onClick={() => {
                    update({ images: [main, ...product.images.filter((p) => p !== main)] });
                    setSelected(0);
                  }}
                >
                  Make main image
                </button>
              )}
              {drop && (
                <button className="text-button" disabled={isCover} onClick={() => studio.updateDrop({ ...drop, cover: main })}>
                  {isCover ? "Drop cover ✓" : "Use as drop cover"}
                </button>
              )}
              <button
                className="text-button muted"
                onClick={() => {
                  update({ images: product.images.filter((p) => p !== main) });
                  setSelected(0);
                }}
              >
                Remove image
              </button>
            </div>
          )}
        </section>

        <section className="details">
          <input
            className="title-input"
            value={product.name}
            onChange={(e) => update({ name: e.target.value })}
            aria-label="Piece name"
          />

          <div className="field">
            <span>Stage</span>
            <div className="stages" role="radiogroup" aria-label="Stage">
              {STAGES.map((stage) => (
                <button
                  key={stage}
                  role="radio"
                  aria-checked={product.stage === stage}
                  className={`stage ${product.stage === stage ? "on" : ""} ${STAGES.indexOf(stage) < STAGES.indexOf(product.stage) ? "done" : ""}`}
                  onClick={() => update({ stage })}
                >
                  {STAGE_NAMES[stage]}
                </button>
              ))}
            </div>
            {product.stage !== "launched" && (
              <button className="text-button" onClick={() => update({ stage: nextStage(product.stage) })}>
                Move to {STAGE_NAMES[nextStage(product.stage)]} →
              </button>
            )}
          </div>

          <div className="field">
            <span>Side of the brand</span>
            <div className="segmented" role="radiogroup" aria-label="Side of the brand">
              {(["quiet", "loud", "both"] as Side[]).map((side) => (
                <button
                  key={side}
                  role="radio"
                  aria-checked={product.side === side}
                  className={product.side === side ? `on ${side}` : ""}
                  onClick={() => update({ side })}
                >
                  {SIDE_NAMES[side]}
                </button>
              ))}
            </div>
            <small>{SIDE_HINTS[product.side]}</small>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Drop</span>
              <select value={product.drop_id ?? ""} onChange={(e) => update({ drop_id: e.target.value || null })}>
                <option value="">Not in a drop yet</option>
                {studio.data.drops.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Type</span>
              <select value={product.type} onChange={(e) => update({ type: e.target.value })}>
                {[...new Set([...PRODUCT_TYPES, product.type])].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Colourways</span>
              <input
                value={colours}
                placeholder="e.g. Dusty pink, Black"
                onChange={(e) => {
                  setColours(e.target.value);
                  update({ colourways: parseColourways(e.target.value) });
                }}
              />
            </label>
            <label className="field">
              <span>Price</span>
              <input
                value={price}
                inputMode="decimal"
                placeholder="£30 to £38"
                onChange={(e) => {
                  const text = e.target.value.replace(/[^\d.]/g, "");
                  setPrice(text);
                  const value = Number.parseFloat(text);
                  update({ price: Number.isFinite(value) ? Math.round(value * 100) / 100 : null });
                }}
              />
              {product.price !== null && !Number.isInteger(product.price * 2) && (
                <small className="warn">Metic prices are clean numbers, like £34 or £34.50.</small>
              )}
            </label>
          </div>

          <label className="field">
            <span>Supplier</span>
            <input value={product.supplier} onChange={(e) => update({ supplier: e.target.value })} placeholder="Blanks, printing, embroidery…" />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea
              value={product.notes}
              rows={6}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Fit, print placement, references, copy ideas…"
            />
          </label>

          <p className="meta-line">
            {formatPrice(product.price) && `${formatPrice(product.price)} · `}Last changed{" "}
            {new Date(product.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>

          <footer className="danger-zone">
            {confirming ? (
              <>
                <span>Delete this piece and its images?</span>
                <button
                  className="button danger small"
                  onClick={() => {
                    studio.deleteProduct(product.id);
                    go(drop ? `/drop/${drop.id}` : "/drops");
                  }}
                >
                  Delete piece
                </button>
                <button className="text-button" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="text-button muted" onClick={() => setConfirming(true)}>
                Delete this piece
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}
