import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { makeProduct } from "./model";
import { deviceStore } from "./store";

describe("device store", () => {
  it("starts with the seed content, and keeps changes between visits", async () => {
    const first = deviceStore();
    const data = await first.load();
    expect(data.drops.length).toBeGreaterThan(0);

    const piece = makeProduct({ name: "Star Tag tee" });
    await first.saveProduct(piece);
    await first.deleteDrop(data.drops[0].id);

    const again = await deviceStore().load();
    expect(again.products.some((p) => p.name === "Star Tag tee")).toBe(true);
    expect(again.drops.some((d) => d.id === data.drops[0].id)).toBe(false);
    // Pieces from a deleted drop stay, without a drop
    expect(again.products.filter((p) => p.drop_id === data.drops[0].id)).toHaveLength(0);
  });

  it("loads once even when asked twice at the same time", async () => {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("metic-studio");
      request.onsuccess = request.onerror = request.onblocked = resolve;
    });
    const store = deviceStore();
    const [a, b] = await Promise.all([store.load(), store.load()]);
    expect(a.drops.map((d) => d.id)).toEqual(b.drops.map((d) => d.id));
  });

  it("stores and removes images", async () => {
    const store = deviceStore();
    await store.load();
    const path = await store.uploadImage(new Blob(["x"], { type: "image/jpeg" }));
    expect(path.startsWith("device/")).toBe(true);
    await store.deleteImages([path]);
  });
});
