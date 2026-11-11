// The studio's state and actions, shared with every screen.
// Changes show on screen straight away and save in the background.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { shrinkImage } from "./image";
import {
  makeDrop,
  makeNote,
  makeProduct,
  ideaTextFromFile,
  pieceForFile,
  productFromNote,
  type BrandSection,
  type Drop,
  type Note,
  type Product,
  type Side,
  type StudioData,
} from "./model";
import type { Store } from "./store";

type Studio = {
  data: StudioData;
  kind: Store["kind"];
  saving: number;
  error: string | null;
  clearError(): void;
  urls: Record<string, string>;
  loadUrls(paths: string[]): void;
  uploadImages(files: File[], onProgress?: (done: number) => void): Promise<string[]>;
  addNote(text: string, images: string[], side: Side | null): Note;
  importImages(files: File[], onProgress?: (done: number) => void): Promise<{ attached: number; ideas: number }>;
  deleteNote(id: string): void;
  noteToProduct(note: Note, dropId: string | null): Product;
  addDrop(fields?: Partial<Drop>): Drop;
  updateDrop(drop: Drop): void;
  deleteDrop(id: string): void;
  addProduct(fields?: Partial<Product>): Product;
  updateProduct(product: Product): void;
  deleteProduct(id: string): void;
  updateBrand(brand: BrandSection[]): void;
};

const StudioContext = createContext<Studio | null>(null);

export function useStudio() {
  const studio = useContext(StudioContext);
  if (!studio) throw new Error("useStudio must be used inside StudioProvider");
  return studio;
}

export function StudioProvider({ store, initial, children }: { store: Store; initial: StudioData; children: ReactNode }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());

  // Every save goes through here: count it, and report failures without losing the on-screen change
  const save = useCallback((work: () => Promise<void>) => {
    setSaving((n) => n + 1);
    work()
      .catch((e) => {
        console.error(e);
        setError("Couldn't save that change. Check your connection and try again.");
      })
      .finally(() => setSaving((n) => n - 1));
  }, []);

  // Debounced saves for fields people type into, so every keystroke isn't a save
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saveLater = useCallback(
    (key: string, work: () => Promise<void>) => {
      clearTimeout(timers.current.get(key));
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          save(work);
        }, 500),
      );
    },
    [save],
  );

  const loadUrls = useCallback(
    (paths: string[]) => {
      const missing = paths.filter((p) => p && !requested.current.has(p));
      if (!missing.length) return;
      missing.forEach((p) => requested.current.add(p));
      store
        .imageUrls(missing)
        .then((found) => setUrls((u) => ({ ...u, ...found })))
        .catch((e) => {
          console.error(e);
          missing.forEach((p) => requested.current.delete(p));
        });
    },
    [store],
  );

  // Signed image links expire after an hour, so refresh them every 50 minutes
  useEffect(() => {
    if (store.kind !== "cloud") return;
    const timer = setInterval(() => {
      const paths = [...requested.current];
      store.imageUrls(paths).then((found) => setUrls((u) => ({ ...u, ...found }))).catch(() => {});
    }, 50 * 60_000);
    return () => clearInterval(timer);
  }, [store]);

  const uploadImages = useCallback(
    async (files: File[], onProgress?: (done: number) => void) => {
      const paths: string[] = [];
      setSaving((n) => n + 1);
      try {
        for (const file of files) {
          const small = await shrinkImage(file);
          const path = await store.uploadImage(small);
          paths.push(path);
          requested.current.add(path);
          setUrls((u) => ({ ...u, [path]: URL.createObjectURL(small) }));
          onProgress?.(paths.length);
        }
      } catch (e) {
        console.error(e);
        setError(`Only ${paths.length} of ${files.length} images uploaded. Check your connection and try again.`);
      } finally {
        setSaving((n) => n - 1);
      }
      return paths;
    },
    [store],
  );

  const studio: Studio = {
    data,
    kind: store.kind,
    saving,
    error,
    clearError: () => setError(null),
    urls,
    loadUrls,
    uploadImages,

    addNote(text, images, side) {
      const note = makeNote(text, images, side);
      setData((d) => ({ ...d, notes: [note, ...d.notes] }));
      save(() => store.saveNote(note));
      return note;
    },
    // Images named after a piece ("Wool Overcoat 001.jpg") go onto that piece; the rest become Inbox ideas
    async importImages(files, onProgress) {
      const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      const paths = await uploadImages(sorted, onProgress);
      const additions = new Map<string, string[]>();
      const notes: Note[] = [];
      paths.forEach((path, i) => {
        const piece = pieceForFile(sorted[i].name, data.products);
        if (piece) additions.set(piece.id, [...(additions.get(piece.id) ?? []), path]);
        else notes.push(makeNote(ideaTextFromFile(sorted[i].name), [path]));
      });

      const time = new Date().toISOString();
      const changed = data.products
        .filter((p) => additions.has(p.id))
        .map((p) => ({ ...p, images: [...p.images, ...additions.get(p.id)!], updated_at: time }));
      setData((d) => ({
        ...d,
        notes: [...notes, ...d.notes],
        products: d.products.map((p) => {
          const extra = additions.get(p.id);
          return extra ? { ...p, images: [...p.images, ...extra], updated_at: time } : p;
        }),
      }));
      for (const product of changed) save(() => store.saveProduct(product));
      for (const note of notes) save(() => store.saveNote(note));
      return { attached: paths.length - notes.length, ideas: notes.length };
    },
    deleteNote(id) {
      const note = data.notes.find((n) => n.id === id);
      setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
      save(async () => {
        await store.deleteNote(id);
        if (note?.images.length) await store.deleteImages(note.images);
      });
    },
    noteToProduct(note, dropId) {
      const product = productFromNote(note, dropId);
      setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== note.id), products: [...d.products, product] }));
      // Save the product first, so the images are never left without an owner
      save(async () => {
        await store.saveProduct(product);
        await store.deleteNote(note.id);
      });
      return product;
    },

    addDrop(fields) {
      const drop = makeDrop({ sort: Math.max(0, ...data.drops.map((d) => d.sort)) + 1, ...fields });
      setData((d) => ({ ...d, drops: [...d.drops, drop] }));
      save(() => store.saveDrop(drop));
      return drop;
    },
    updateDrop(drop) {
      setData((d) => ({ ...d, drops: d.drops.map((x) => (x.id === drop.id ? drop : x)) }));
      saveLater(`drop:${drop.id}`, () => store.saveDrop(drop));
    },
    deleteDrop(id) {
      setData((d) => ({
        ...d,
        drops: d.drops.filter((x) => x.id !== id),
        products: d.products.map((p) => (p.drop_id === id ? { ...p, drop_id: null } : p)),
      }));
      save(() => store.deleteDrop(id));
    },

    addProduct(fields) {
      const product = makeProduct(fields);
      setData((d) => ({ ...d, products: [...d.products, product] }));
      save(() => store.saveProduct(product));
      return product;
    },
    updateProduct(product) {
      const updated = { ...product, updated_at: new Date().toISOString() };
      setData((d) => ({ ...d, products: d.products.map((x) => (x.id === updated.id ? updated : x)) }));
      saveLater(`product:${updated.id}`, () => store.saveProduct(updated));
    },
    deleteProduct(id) {
      const product = data.products.find((p) => p.id === id);
      const usedAsCover = new Set(data.drops.map((d) => d.cover));
      setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }));
      save(async () => {
        await store.deleteProduct(id);
        const orphans = product?.images.filter((path) => !usedAsCover.has(path)) ?? [];
        if (orphans.length) await store.deleteImages(orphans);
      });
    },

    updateBrand(brand) {
      setData((d) => ({ ...d, brand }));
      saveLater("brand", () => store.saveBrand(brand));
    },
  };

  return <StudioContext.Provider value={studio}>{children}</StudioContext.Provider>;
}

/** An image from the studio. Asks for its link the first time it's shown. */
export function StudioImage({ path, alt, className }: { path: string | null | undefined; alt: string; className?: string }) {
  const { urls, loadUrls } = useStudio();
  useEffect(() => {
    if (path) loadUrls([path]);
  }, [path, loadUrls]);
  const src = path ? urls[path] : undefined;
  if (!src) return <div className={`img-placeholder ${className ?? ""}`} aria-label={alt} role="img" />;
  return <img className={className} src={src} alt={alt} loading="lazy" decoding="async" />;
}
