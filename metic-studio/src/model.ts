// What Metic Studio stores, and the small rules around it. No UI or storage code here, so it's easy to test.

export const STAGES = ["idea", "sketch", "mockup", "sample", "ready", "launched"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_NAMES: Record<Stage, string> = {
  idea: "Idea",
  sketch: "Sketch",
  mockup: "Mockup",
  sample: "Sample",
  ready: "Ready",
  launched: "Launched",
};

export type Side = "quiet" | "loud" | "both";
export const SIDE_NAMES: Record<Side, string> = { quiet: "Quiet", loud: "Loud", both: "Both" };
export const SIDE_HINTS: Record<Side, string> = {
  quiet: "Club 1984 recipe: premium, restrained",
  loud: "Spicy Thoughts recipe: oversized, statement-first",
  both: "Mixes both recipes",
};

export const PRODUCT_TYPES = [
  "Tee", "Baby tee", "Tank top", "Jersey", "Hoodie", "Knit", "Jacket", "Coat", "Overshirt", "Sweatpants", "Set",
  "Cap", "Socks", "Tote", "Patch", "Other",
];

export type DropStatus = "planning" | "in progress" | "launched";

export type Drop = {
  id: string;
  name: string;
  theme: string;
  status: DropStatus;
  cover: string | null; // image path
  sort: number;
  created_at: string;
};

export type Product = {
  id: string;
  drop_id: string | null;
  name: string;
  type: string;
  side: Side;
  stage: Stage;
  colourways: string[];
  price: number | null;
  supplier: string;
  notes: string;
  images: string[]; // image paths; the first is the cover
  created_at: string;
  updated_at: string;
};

/** A quick idea in the Inbox, waiting to become a product or be thrown away. */
export type Note = {
  id: string;
  text: string;
  images: string[];
  side: Side | null;
  created_at: string;
};

export type BrandSection = { title: string; body: string };

export type StudioData = {
  drops: Drop[];
  products: Product[];
  notes: Note[];
  brand: BrandSection[];
};

export function newId() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const nowIso = () => new Date().toISOString();

export function makeProduct(fields: Partial<Product> = {}): Product {
  const time = nowIso();
  return {
    id: newId(),
    drop_id: null,
    name: "Untitled piece",
    type: "Tee",
    side: "quiet",
    stage: "idea",
    colourways: [],
    price: null,
    supplier: "",
    notes: "",
    images: [],
    created_at: time,
    updated_at: time,
    ...fields,
  };
}

export function makeDrop(fields: Partial<Drop> = {}): Drop {
  return {
    id: newId(),
    name: "New drop",
    theme: "",
    status: "planning",
    cover: null,
    sort: 0,
    created_at: nowIso(),
    ...fields,
  };
}

export function makeNote(text: string, images: string[] = [], side: Side | null = null): Note {
  return { id: newId(), text: text.trim(), images, side, created_at: nowIso() };
}

/**
 * Turns an Inbox idea into a product. The first line becomes the name, and the full text goes in the notes.
 */
export function productFromNote(note: Note, dropId: string | null): Product {
  const firstLine = note.text.split("\n")[0].trim();
  const name = firstLine.length > 48 ? `${firstLine.slice(0, 45).trimEnd()}…` : firstLine;
  return makeProduct({
    name: name || "Untitled piece",
    drop_id: dropId,
    side: note.side ?? "quiet",
    notes: note.text,
    images: note.images,
  });
}

export function nextStage(stage: Stage): Stage {
  const i = STAGES.indexOf(stage);
  return STAGES[Math.min(i + 1, STAGES.length - 1)];
}

export function productsByStage(products: Product[]) {
  return STAGES.map((stage) => ({ stage, products: products.filter((p) => p.stage === stage) }));
}

/** How far along a drop is: the share of its pieces at Ready or Launched. */
export function dropProgress(products: Product[]) {
  if (products.length === 0) return 0;
  const done = products.filter((p) => p.stage === "ready" || p.stage === "launched").length;
  return done / products.length;
}

/** The image to show for a drop: its own cover, or the first product image. */
export function dropCover(drop: Drop, products: Product[]) {
  return drop.cover ?? products.find((p) => p.drop_id === drop.id && p.images.length)?.images[0] ?? null;
}

/** Metic prices are whole or clean numbers, like £30 or £34.50, never £29.99. */
export function formatPrice(price: number | null) {
  if (price === null || !Number.isFinite(price)) return "";
  return `£${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

export function parseColourways(text: string) {
  return text
    .split(",")
    .map((c) => c.replace(/\s+/g, " ").trim())
    .filter((c, i, all) => c && all.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i);
}

/** Products that haven't been touched in a while and aren't finished, oldest first. */
export function stalledProducts(products: Product[], now = new Date(), days = 21) {
  const cutoff = now.getTime() - days * 86_400_000;
  return products
    .filter((p) => p.stage !== "launched" && p.stage !== "ready" && Date.parse(p.updated_at) < cutoff)
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
}

// ---------- Matching uploaded files to pieces ----------

/** "Wool Overcoat 001 (2).jpg" → "wool overcoat 001". Copies, numbering and the file type don't count. */
export function nameFromFile(fileName: string) {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\s*\(\d+\)$/, "") // "(2)" copies
    .replace(/\s+-\s+(front|back|detail|side|model|alt|v?\d+)$/i, "") // "- back", "- 2"
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ") // punctuation doesn't count, since "/" can't go in a file name
    .trim();
}

const tidyName = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** The piece an uploaded file belongs to, when it's named after one. */
export function pieceForFile(fileName: string, products: Product[]) {
  const name = nameFromFile(fileName);
  return name ? products.find((p) => tidyName(p.name) === name) ?? null : null;
}

/** A readable idea title from a file name, or "" for camera and ChatGPT names that say nothing. */
export function ideaTextFromFile(fileName: string) {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").trim();
  if (/^(img|image|dsc|pxl|photo|screenshot|chatgpt image|whatsapp image)[\s_-]/i.test(base) || /^[a-z]{0,4}\d+$/i.test(base)) {
    return "";
  }
  return base.replace(/[_]+/g, " ").replace(/\s+/g, " ");
}
