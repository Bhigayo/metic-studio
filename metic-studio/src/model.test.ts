import { describe, expect, it } from "vitest";
import {
  dropCover,
  dropProgress,
  formatPrice,
  makeDrop,
  makeNote,
  makeProduct,
  nextStage,
  parseColourways,
  productFromNote,
  productsByStage,
  stalledProducts,
  STAGES,
} from "./model";
import { seedData } from "./seed";
import { fitWithin } from "./image";

describe("turning an idea into a piece", () => {
  it("uses the first line as the name and keeps everything else", () => {
    const note = makeNote("Trophy Room tee\nBack print, cream colourway", ["img/1.jpg"], "loud");
    const product = productFromNote(note, "drop-1");
    expect(product).toMatchObject({
      name: "Trophy Room tee",
      drop_id: "drop-1",
      side: "loud",
      stage: "idea",
      images: ["img/1.jpg"],
      notes: "Trophy Room tee\nBack print, cream colourway",
    });
  });

  it("shortens long first lines and names photo-only ideas", () => {
    const long = productFromNote(makeNote("a".repeat(80)), null);
    expect(long.name.length).toBeLessThanOrEqual(46);
    expect(long.name.endsWith("…")).toBe(true);
    expect(productFromNote(makeNote("", ["x.jpg"]), null).name).toBe("Untitled piece");
  });
});

describe("stages", () => {
  it("moves forward one stage and stops at Launched", () => {
    expect(nextStage("idea")).toBe("sketch");
    expect(nextStage("ready")).toBe("launched");
    expect(nextStage("launched")).toBe("launched");
  });

  it("groups pieces into every stage column, in order", () => {
    const columns = productsByStage([makeProduct({ stage: "mockup" }), makeProduct({ stage: "mockup" })]);
    expect(columns.map((c) => c.stage)).toEqual([...STAGES]);
    expect(columns.find((c) => c.stage === "mockup")!.products).toHaveLength(2);
  });

  it("measures a drop by how many pieces are ready or launched", () => {
    expect(dropProgress([])).toBe(0);
    expect(dropProgress([makeProduct({ stage: "ready" }), makeProduct({ stage: "idea" })])).toBe(0.5);
  });

  it("finds unfinished pieces that haven't been touched in three weeks", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    const old = "2026-10-01T12:00:00Z";
    const stalled = stalledProducts(
      [
        makeProduct({ name: "Old idea", updated_at: old }),
        makeProduct({ name: "Old but launched", stage: "launched", updated_at: old }),
        makeProduct({ name: "Fresh", updated_at: "2026-11-10T12:00:00Z" }),
      ],
      now,
    );
    expect(stalled.map((p) => p.name)).toEqual(["Old idea"]);
  });
});

describe("drop covers", () => {
  it("uses the drop's own cover, then the first product image", () => {
    const drop = makeDrop();
    const products = [makeProduct({ drop_id: drop.id }), makeProduct({ drop_id: drop.id, images: ["a.jpg", "b.jpg"] })];
    expect(dropCover(drop, products)).toBe("a.jpg");
    expect(dropCover({ ...drop, cover: "c.jpg" }, products)).toBe("c.jpg");
    expect(dropCover(makeDrop(), products)).toBeNull();
  });
});

describe("formatting", () => {
  it("shows clean prices", () => {
    expect(formatPrice(34)).toBe("£34");
    expect(formatPrice(34.5)).toBe("£34.50");
    expect(formatPrice(null)).toBe("");
  });

  it("splits colourways and drops blanks and repeats", () => {
    expect(parseColourways(" Dusty pink, black ,, Black,  electric   blue ")).toEqual(["Dusty pink", "black", "electric blue"]);
  });

  it("shrinks images to fit, keeping their shape", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1800, height: 1350 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1350, height: 1800 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("starting content", () => {
  const seed = seedData();

  it("puts every piece in a real drop or none", () => {
    const ids = new Set(seed.drops.map((d) => d.id));
    for (const p of seed.products) expect(p.drop_id === null || ids.has(p.drop_id)).toBe(true);
  });

  it("includes the existing drops and the brand rules", () => {
    expect(seed.drops.map((d) => d.name)).toContain("World Series 02");
    expect(seed.products.map((p) => p.name)).toContain("My Home Girl Is Cooler Than Yours");
    expect(seed.brand.find((s) => s.title === "Tagline")!.body).toBe("Quiet Souls. Loud Visions.");
  });

  it("only uses clean Metic prices", () => {
    for (const p of seed.products) if (p.price !== null) expect(Number.isInteger(p.price * 2)).toBe(true);
  });
});

describe("matching uploads to pieces", () => {
  const pieces = [makeProduct({ name: "Wool Overcoat 001" }), makeProduct({ name: "Sherpa / Borg Jacket 001" })];

  it("matches file names to piece names, ignoring copies and labels", async () => {
    const { pieceForFile } = await import("./model");
    expect(pieceForFile("Wool Overcoat 001.jpg", pieces)?.name).toBe("Wool Overcoat 001");
    expect(pieceForFile("wool overcoat 001 (2).png", pieces)?.name).toBe("Wool Overcoat 001");
    expect(pieceForFile("Wool Overcoat 001 - back.jpg", pieces)?.name).toBe("Wool Overcoat 001");
    expect(pieceForFile("Wool_Overcoat_001.jpg", pieces)?.name).toBe("Wool Overcoat 001");
    expect(pieceForFile("Sherpa Borg Jacket 001.jpg", pieces)?.name).toBe("Sherpa / Borg Jacket 001");
    expect(pieceForFile("Something else.jpg", pieces)).toBeNull();
  });

  it("names ideas from file names, but not from camera or ChatGPT names", async () => {
    const { ideaTextFromFile } = await import("./model");
    expect(ideaTextFromFile("Trophy_Room_tee.png")).toBe("Trophy Room tee");
    expect(ideaTextFromFile("IMG_4821.HEIC")).toBe("");
    expect(ideaTextFromFile("ChatGPT Image 22 Sept 2026, 14_09_00.png")).toBe("");
    expect(ideaTextFromFile("MP10.png")).toBe("");
  });
});
