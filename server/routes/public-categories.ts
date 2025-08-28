import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";

function slugify(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export const getPublicCategories: RequestHandler = async (_req, res) => {
  try {
    const db = getDatabase();

    const categories = await db
      .collection("categories")
      .find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    const response = await Promise.all(
      categories.map(async (cat: any) => {
        const subs = await db
          .collection("subcategories")
          .find({ categoryId: (cat._id || "").toString(), isActive: true })
          .sort({ sortOrder: 1, createdAt: 1 })
          .toArray();

        const normalizedSubs = subs.map((s: any) => ({
          name: s.name,
          slug: s.slug || slugify(s.name),
          icon: s.icon || s.iconUrl || "🏷️",
          order: typeof s.sortOrder === "number" ? s.sortOrder : 999,
        }));

        return {
          name: cat.name,
          slug: cat.slug || slugify(cat.name),
          icon: cat.icon || cat.iconUrl || "🏷️",
          description: cat.description || "",
          order: typeof cat.sortOrder === "number" ? cat.sortOrder : 999,
          subcategories: normalizedSubs,
        };
      })
    );

    // Per-spec CORS + no-store for testing
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-store");

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch public categories" });
  }
};
