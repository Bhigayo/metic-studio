import { useRef, useState } from "react";
import { SIDE_NAMES, type Note, type Side } from "./model";
import { StudioImage, useStudio } from "./studio";
import { go, SideTag } from "./ui";

export default function Inbox() {
  const studio = useStudio();
  const { notes, drops } = studio.data;
  const [text, setText] = useState("");
  const [side, setSide] = useState<Side | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const bulkInput = useRef<HTMLInputElement>(null);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setUploading({ done: 0, total: list.length });
    const paths = await studio.uploadImages(list, (done) => setUploading({ done, total: list.length }));
    setImages((i) => [...i, ...paths]);
    setUploading(null);
  }

  async function addMany(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setUploading({ done: 0, total: list.length });
    const result = await studio.importImages(list, (done) => setUploading({ done, total: list.length }));
    setUploading(null);
    const parts = [
      result.attached && `${result.attached} added to matching pieces`,
      result.ideas && `${result.ideas} added here as ideas`,
    ].filter(Boolean);
    setImported(parts.length ? `${parts.join(", ")}.` : null);
  }

  function capture(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() && !images.length) return;
    studio.addNote(text, images, side);
    setText("");
    setImages([]);
    setSide(null);
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Capture now, shape later</p>
          <h1>Inbox</h1>
        </div>
        <button
          className="button ghost"
          onClick={() => bulkInput.current?.click()}
          disabled={!!uploading}
          title="Images named after a piece, like 'Wool Overcoat 001.jpg', go straight onto that piece"
        >
          Add many mockups
        </button>
        <input ref={bulkInput} type="file" accept="image/*" multiple hidden onChange={(e) => addMany(e.target.files).then(() => (e.target.value = ""))} />
      </header>

      {imported && (
        <p className="imported" role="status">
          {imported}{" "}
          <button className="text-button" onClick={() => setImported(null)}>
            OK
          </button>
        </p>
      )}

      <form className="capture" onSubmit={capture} id="capture">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's the idea? A name, a line, a colourway…"
          rows={3}
          aria-label="Your idea"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) capture(e);
          }}
        />
        {images.length > 0 && (
          <div className="capture-images">
            {images.map((path) => (
              <div key={path} className="thumb">
                <StudioImage path={path} alt="Attached image" />
                <button type="button" aria-label="Remove image" onClick={() => setImages((i) => i.filter((p) => p !== path))}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="capture-row">
          <button type="button" className="button ghost small" onClick={() => photoInput.current?.click()} disabled={!!uploading}>
            + Photo
          </button>
          <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files).then(() => (e.target.value = ""))} />
          <div className="chips" role="radiogroup" aria-label="Side of the brand">
            {(["quiet", "loud"] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={side === s}
                className={`chip-toggle ${side === s ? `on ${s}` : ""}`}
                onClick={() => setSide(side === s ? null : s)}
              >
                {SIDE_NAMES[s]}
              </button>
            ))}
          </div>
          <button className="button" disabled={(!text.trim() && !images.length) || !!uploading}>
            Save idea
          </button>
        </div>
        {uploading && (
          <p className="uploading">
            Uploading {uploading.done} of {uploading.total}…
          </p>
        )}
      </form>

      {notes.length === 0 ? (
        <p className="empty">Your inbox is clear. Ideas you capture land here until you sort them into a drop.</p>
      ) : (
        <div className="note-grid">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} drops={drops.map((d) => ({ id: d.id, name: d.name }))} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, drops }: { note: Note; drops: { id: string; name: string }[] }) {
  const studio = useStudio();
  const [moving, setMoving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <article className="note">
      {note.images.length > 0 && (
        <div className={`note-images n${Math.min(note.images.length, 3)}`}>
          {note.images.slice(0, 3).map((path) => (
            <StudioImage key={path} path={path} alt="Idea image" />
          ))}
        </div>
      )}
      <div className="note-body">
        {note.text && <p className="note-text">{note.text}</p>}
        <div className="note-meta">
          {note.side && <SideTag side={note.side} />}
          <span>{new Date(note.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
        </div>

        {moving ? (
          <div className="note-move">
            <label>
              Add to
              <select
                defaultValue=""
                onChange={(e) => {
                  const product = studio.noteToProduct(note, e.target.value === "none" ? null : e.target.value);
                  go(`/product/${product.id}`);
                }}
              >
                <option value="" disabled>
                  Choose a drop…
                </option>
                {drops.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
                <option value="none">Not in a drop yet</option>
              </select>
            </label>
            <button className="text-button" onClick={() => setMoving(false)}>
              Cancel
            </button>
          </div>
        ) : confirming ? (
          <div className="note-actions">
            <button className="button danger small" onClick={() => studio.deleteNote(note.id)}>
              Delete idea
            </button>
            <button className="text-button" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        ) : (
          <div className="note-actions">
            <button className="button small" onClick={() => setMoving(true)}>
              Make it a piece
            </button>
            <button className="text-button muted" onClick={() => setConfirming(true)}>
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
