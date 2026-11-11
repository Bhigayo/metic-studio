// Where the studio's data and images live.
// Cloud: Supabase, so everything syncs between iPhone, iPad and laptop. Only your login can read it.
// Device: this browser only (IndexedDB). Used until Supabase is set up, and for testing.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { newId, type BrandSection, type Drop, type Note, type Product, type StudioData } from "./model";
import { seedData } from "./seed";

export interface Store {
  kind: "cloud" | "device";
  load(): Promise<StudioData>;
  saveDrop(drop: Drop): Promise<void>;
  deleteDrop(id: string): Promise<void>;
  saveProduct(product: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  saveNote(note: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;
  saveBrand(brand: BrandSection[]): Promise<void>;
  uploadImage(image: Blob): Promise<string>;
  imageUrls(paths: string[]): Promise<Record<string, string>>;
  deleteImages(paths: string[]): Promise<void>;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

// ---------- Device store ----------

const DB_NAME = "metic-studio";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("data");
      request.result.createObjectStore("images");
    };
    request.onsuccess = () => {
      // Let other tabs upgrade or clear the database instead of waiting forever
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

function run<T>(db: IDBDatabase, storeName: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const request = action(db.transaction(storeName, mode).objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function deviceStore(): Store {
  const dbPromise = openDb();
  const objectUrls = new Map<string, string>();
  let data: StudioData | null = null;
  let loading: Promise<StudioData> | null = null; // load once, even if asked twice

  async function persist() {
    const db = await dbPromise;
    await run(db, "data", "readwrite", (s) => s.put(data, "studio"));
  }

  function upsert<T extends { id: string }>(list: T[], item: T) {
    const i = list.findIndex((x) => x.id === item.id);
    if (i === -1) list.push(item);
    else list[i] = item;
  }

  return {
    kind: "device",
    load() {
      loading ??= (async () => {
        const db = await dbPromise;
        data = ((await run(db, "data", "readonly", (s) => s.get("studio"))) as StudioData | undefined) ?? null;
        if (!data) {
          data = seedData();
          await persist();
        }
        return data;
      })();
      return loading.then((d) => structuredClone(d));
    },
    async saveDrop(drop) {
      upsert(data!.drops, drop);
      await persist();
    },
    async deleteDrop(id) {
      data!.drops = data!.drops.filter((d) => d.id !== id);
      data!.products = data!.products.map((p) => (p.drop_id === id ? { ...p, drop_id: null } : p));
      await persist();
    },
    async saveProduct(product) {
      upsert(data!.products, product);
      await persist();
    },
    async deleteProduct(id) {
      data!.products = data!.products.filter((p) => p.id !== id);
      await persist();
    },
    async saveNote(note) {
      upsert(data!.notes, note);
      await persist();
    },
    async deleteNote(id) {
      data!.notes = data!.notes.filter((n) => n.id !== id);
      await persist();
    },
    async saveBrand(brand) {
      data!.brand = brand;
      await persist();
    },
    async uploadImage(image) {
      const db = await dbPromise;
      const path = `device/${newId()}`;
      await run(db, "images", "readwrite", (s) => s.put(image, path));
      return path;
    },
    async imageUrls(paths) {
      const db = await dbPromise;
      const result: Record<string, string> = {};
      for (const path of paths) {
        if (!objectUrls.has(path)) {
          const blob = (await run(db, "images", "readonly", (s) => s.get(path))) as Blob | undefined;
          if (blob) objectUrls.set(path, URL.createObjectURL(blob));
        }
        const found = objectUrls.get(path);
        if (found) result[path] = found;
      }
      return result;
    },
    async deleteImages(paths) {
      const db = await dbPromise;
      for (const path of paths) {
        await run(db, "images", "readwrite", (s) => s.delete(path));
        const objectUrl = objectUrls.get(path);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrls.delete(path);
      }
    },
  };
}

// ---------- Cloud store ----------

const BUCKET = "studio";

export function cloudStore(client: SupabaseClient, userId: string): Store {
  const signed = new Map<string, { url: string; expires: number }>();
  let loading: Promise<StudioData> | null = null; // load once, so the starting content is never added twice

  async function check<T>(promise: PromiseLike<{ data: T; error: unknown }>) {
    const { data, error } = await promise;
    if (error) throw error;
    return data;
  }


  async function loadCloud(): Promise<StudioData> {
    const [drops, products, notes, brandRows] = await Promise.all([
      check(client.from("drops").select("*").order("sort")),
      check(client.from("products").select("*").order("created_at")),
      check(client.from("notes").select("*").order("created_at", { ascending: false })),
      check(client.from("brand").select("sections")),
    ]);
    const loaded: StudioData = {
      drops: (drops ?? []) as Drop[],
      products: ((products ?? []) as Product[]).map((p) => ({ ...p, price: p.price === null ? null : Number(p.price) })),
      notes: (notes ?? []) as Note[],
      brand: ((brandRows as { sections: BrandSection[] }[] | null)?.[0]?.sections ?? []) as BrandSection[],
    };

    // First sign-in: start with Metic's existing ideas
    const empty = !loaded.drops.length && !loaded.products.length && !loaded.notes.length && !loaded.brand.length;
    if (!empty) return loaded;
    const seed = seedData();
    await check(client.from("drops").insert(seed.drops));
    await check(client.from("products").insert(seed.products));
    await check(client.from("notes").insert(seed.notes));
    await check(client.from("brand").upsert({ user_id: userId, sections: seed.brand }));
    return seed;
  }

  return {
    kind: "cloud",
    load() {
      loading ??= loadCloud();
      loading.catch(() => (loading = null));
      return loading;
    },
    async saveDrop(drop) {
      await check(client.from("drops").upsert(drop));
    },
    async deleteDrop(id) {
      await check(client.from("drops").delete().eq("id", id));
    },
    async saveProduct(product) {
      await check(client.from("products").upsert(product));
    },
    async deleteProduct(id) {
      await check(client.from("products").delete().eq("id", id));
    },
    async saveNote(note) {
      await check(client.from("notes").upsert(note));
    },
    async deleteNote(id) {
      await check(client.from("notes").delete().eq("id", id));
    },
    async saveBrand(brand) {
      await check(client.from("brand").upsert({ user_id: userId, sections: brand }));
    },
    async uploadImage(image) {
      const extension = image.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${newId()}.${extension}`;
      await check(client.storage.from(BUCKET).upload(path, image, { contentType: image.type, upsert: false }));
      return path;
    },
    async imageUrls(paths) {
      const now = Date.now();
      const needed = [...new Set(paths)].filter((p) => (signed.get(p)?.expires ?? 0) < now + 60_000);
      if (needed.length) {
        const rows = await check(client.storage.from(BUCKET).createSignedUrls(needed, 3600));
        for (const row of rows ?? []) {
          if (row.path && row.signedUrl) signed.set(row.path, { url: row.signedUrl, expires: now + 3_600_000 });
        }
      }
      return Object.fromEntries(paths.filter((p) => signed.has(p)).map((p) => [p, signed.get(p)!.url]));
    },
    async deleteImages(paths) {
      if (paths.length) await check(client.storage.from(BUCKET).remove(paths));
      paths.forEach((p) => signed.delete(p));
    },
  };
}
